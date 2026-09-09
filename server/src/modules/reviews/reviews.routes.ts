import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma, type Tx } from '../../lib/prisma.js';
import { serializeReview } from '../../lib/serializers.js';
import { recordAudit } from '../../services/audit.service.js';

const TAG = 'Avis clients';

const createSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).nullish()
});

const listSchema = paginationSchema.extend({
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  publishedOnly: z.coerce.boolean().default(true)
});

/** Recalcule la note moyenne d'un chauffeur a partir de ses avis publies. */
async function refreshDriverRating(tx: Tx, driverId: string): Promise<void> {
  const aggregate = await tx.review.aggregate({
    where: { driverId, published: true },
    _avg: { rating: true }
  });

  await tx.driver.update({
    where: { id: driverId },
    data: { rating: aggregate._avg.rating ?? 5 }
  });
}

export async function reviewsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/',
    {
      schema: doc({
        summary: 'Lister les avis',
        tags: [TAG],
        querystring: listSchema,
        security: false
      })
    },
    async (request) => {
      const query = parse(listSchema, request.query);
      const { skip, take } = toSkipTake(query);

      const where: Prisma.ReviewWhereInput = {
        ...(query.publishedOnly ? { published: true } : {}),
        ...(query.driverId ? { driverId: query.driverId } : {}),
        ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
        ...(query.minRating ? { rating: { gte: query.minRating } } : {})
      };

      const [rows, total, aggregate] = await Promise.all([
        prisma.review.findMany({
          where,
          include: { user: true, driver: true, vehicle: true, booking: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.review.count({ where }),
        prisma.review.aggregate({ where, _avg: { rating: true } })
      ]);

      return {
        ...paginated(rows.map(serializeReview), total, query),
        averageRating: aggregate._avg.rating ?? null
      };
    }
  );

  app.post(
    '/',
    {
      preHandler: app.authenticate,
      schema: doc({
        summary: 'Déposer un avis',
        description:
          'Réservé au client de la réservation, une fois la mission terminée. Un avis par réservation. La note du chauffeur est recalculée automatiquement.',
        tags: [TAG],
        body: createSchema
      })
    },
    async (request, reply) => {
      const body = parse(createSchema, request.body);
      const user = request.user!;

      const booking = await prisma.booking.findFirst({
        where: { OR: [{ id: body.bookingId }, { reference: body.bookingId }] }
      });
      if (!booking) throw new NotFoundError('Réservation');

      const isOwner =
        booking.clientId === user.id ||
        (booking.companyId !== null && booking.companyId === user.companyId);

      if (!isOwner && user.role !== 'ADMIN') {
        throw new ForbiddenError('Seul le client de cette réservation peut déposer un avis.');
      }

      if (booking.status !== 'TERMINEE') {
        throw new ConflictError('Vous pourrez noter cette prestation une fois la mission terminée.');
      }

      const existing = await prisma.review.findUnique({ where: { bookingId: booking.id } });
      if (existing) throw new ConflictError('Un avis a déjà été déposé pour cette réservation.');

      const review = await prisma.$transaction(async (tx) => {
        const created = await tx.review.create({
          data: {
            bookingId: booking.id,
            userId: booking.clientId,
            vehicleId: booking.vehicleId,
            driverId: booking.assignedDriverId,
            rating: body.rating,
            comment: body.comment ?? null
          },
          include: { user: true, driver: true, vehicle: true, booking: true }
        });

        if (booking.assignedDriverId) {
          await refreshDriverRating(tx as Tx, booking.assignedDriverId);
        }

        return created;
      });

      await recordAudit({
        request,
        action: 'review.create',
        entity: 'Review',
        entityId: review.id,
        after: { rating: review.rating, bookingId: booking.id }
      });

      return reply.status(201).send({ review: serializeReview(review) });
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Modérer un avis',
        tags: [TAG],
        params: idParamSchema,
        body: z.object({ published: z.boolean() })
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(z.object({ published: z.boolean() }), request.body);

      const review = await prisma.$transaction(async (tx) => {
        const updated = await tx.review.update({
          where: { id },
          data: { published: body.published },
          include: { user: true, driver: true, vehicle: true, booking: true }
        });

        if (updated.driverId) await refreshDriverRating(tx as Tx, updated.driverId);
        return updated;
      });

      await recordAudit({
        request,
        action: 'review.moderate',
        entity: 'Review',
        entityId: id,
        after: { published: body.published }
      });

      return { review: serializeReview(review) };
    }
  );

  app.delete(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Supprimer un avis', tags: [TAG], params: idParamSchema })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const review = await prisma.review.findUnique({ where: { id } });
      if (!review) throw new NotFoundError('Avis');

      await prisma.$transaction(async (tx) => {
        await tx.review.delete({ where: { id } });
        if (review.driverId) await refreshDriverRating(tx as Tx, review.driverId);
      });

      await recordAudit({ request, action: 'review.delete', entity: 'Review', entityId: id });

      return { success: true };
    }
  );
}
