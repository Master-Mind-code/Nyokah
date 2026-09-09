import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { NotificationChannelEnum, NotificationStatusEnum, NotificationTypeEnum } from '../../lib/enums.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { serializeNotification } from '../../lib/serializers.js';
import { getMockNotificationProvider } from '../../providers/notifications/index.js';
import { notify, retryNotification } from '../../services/notification.service.js';

const TAG = 'Notifications';

const listSchema = paginationSchema.extend({
  channel: NotificationChannelEnum.schema.optional(),
  type: NotificationTypeEnum.schema.optional(),
  status: NotificationStatusEnum.schema.optional(),
  bookingId: z.string().optional(),
  unreadOnly: z.coerce.boolean().optional()
});

export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    {
      schema: doc({
        summary: 'Lister ses notifications',
        description: 'L’administrateur voit l’ensemble du journal ; les autres comptes, uniquement les leurs.',
        tags: [TAG],
        querystring: listSchema
      })
    },
    async (request) => {
      const query = parse(listSchema, request.query);
      const { skip, take } = toSkipTake(query);
      const user = request.user!;

      const scope: Prisma.NotificationWhereInput =
        user.role === 'ADMIN' ? {} : { recipientUserId: user.id };

      const where: Prisma.NotificationWhereInput = {
        ...scope,
        ...(query.channel ? { channel: query.channel } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.bookingId ? { bookingId: query.bookingId } : {}),
        ...(query.unreadOnly ? { isRead: false } : {})
      };

      const [rows, total, unread] = await Promise.all([
        prisma.notification.findMany({
          where,
          include: { booking: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { ...scope, isRead: false } })
      ]);

      return { ...paginated(rows.map(serializeNotification), total, query), unreadCount: unread };
    }
  );

  app.get(
    '/unread-count',
    { schema: doc({ summary: 'Nombre de notifications non lues', tags: [TAG] }) },
    async (request) => {
      const user = request.user!;
      const count = await prisma.notification.count({
        where: { isRead: false, ...(user.role === 'ADMIN' ? {} : { recipientUserId: user.id }) }
      });
      return { unreadCount: count };
    }
  );

  app.post(
    '/:id/read',
    {
      schema: doc({ summary: 'Marquer une notification comme lue', tags: [TAG], params: idParamSchema })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const user = request.user!;

      const notification = await prisma.notification.findUnique({ where: { id } });
      if (!notification) throw new NotFoundError('Notification');

      if (user.role !== 'ADMIN' && notification.recipientUserId !== user.id) {
        throw new ForbiddenError('Cette notification ne vous est pas destinée.');
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true, readAt: new Date(), status: 'LU' },
        include: { booking: true }
      });

      return { notification: serializeNotification(updated) };
    }
  );

  app.post(
    '/read-all',
    { schema: doc({ summary: 'Tout marquer comme lu', tags: [TAG] }) },
    async (request) => {
      const user = request.user!;

      const result = await prisma.notification.updateMany({
        where: { isRead: false, ...(user.role === 'ADMIN' ? {} : { recipientUserId: user.id }) },
        data: { isRead: true, readAt: new Date(), status: 'LU' }
      });

      return { success: true, updated: result.count };
    }
  );

  app.post(
    '/:id/retry',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Rejouer une notification en échec',
        tags: [TAG],
        params: idParamSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const notification = await retryNotification(id);
      return { notification: serializeNotification(notification) };
    }
  );

  app.post(
    '/send',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Envoyer un message manuel',
        description: 'Message libre de la conciergerie vers un client (WhatsApp, e-mail ou SMS).',
        tags: [TAG],
        body: z.object({
          channel: NotificationChannelEnum.schema.default('WHATSAPP'),
          bookingId: z.string().nullish(),
          recipientUserId: z.string().nullish(),
          recipientName: z.string().min(1).max(120),
          recipientPhone: z.string().max(24).nullish(),
          recipientEmail: z.string().email().nullish(),
          title: z.string().min(1).max(160),
          body: z.string().min(1).max(4000)
        })
      })
    },
    async (request, reply) => {
      const schema = z.object({
        channel: NotificationChannelEnum.schema.default('WHATSAPP'),
        bookingId: z.string().nullish(),
        recipientUserId: z.string().nullish(),
        recipientName: z.string().min(1).max(120),
        recipientPhone: z.string().max(24).nullish(),
        recipientEmail: z.string().email().nullish(),
        title: z.string().min(1).max(160),
        body: z.string().min(1).max(4000)
      });
      const input = parse(schema, request.body);

      const notification = await notify({ ...input, type: 'BOOKING_RECEIVED' });

      return reply.status(201).send({ notification: serializeNotification(notification) });
    }
  );

  app.get(
    '/outbox',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Inspecter la file du simulateur',
        description:
          'Disponible avec NOTIFICATION_PROVIDER=mock : liste les derniers messages qui auraient été expédiés.',
        tags: [TAG],
        querystring: z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) })
      })
    },
    async (request) => {
      if (env.NOTIFICATION_PROVIDER !== 'mock') {
        return { provider: env.NOTIFICATION_PROVIDER, data: [], message: 'Un fournisseur réel est actif.' };
      }

      const query = parse(
        z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }),
        request.query
      );

      return { provider: 'mock', data: getMockNotificationProvider().getOutbox(query.limit) };
    }
  );
}
