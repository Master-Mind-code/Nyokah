import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { NotFoundError } from '../../lib/errors.js';
import { doc, idParamSchema, paginated, paginationSchema, parse, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { slugify } from '../../lib/references.js';
import { serializePack } from '../../lib/serializers.js';
import { recordAudit } from '../../services/audit.service.js';

const TAG = 'Packs & offres';

const bodySchema = z.object({
  name: z.string().min(2).max(200),
  targetAudience: z.string().min(2).max(200),
  description: z.string().min(2).max(2000),
  includedVehicles: z.string().min(2).max(500),
  duration: z.string().min(1).max(120),
  formula: z.string().min(1).max(200),
  fixedPrice: z.number().int().min(0),
  highlightDiscount: z.string().max(120).default(''),
  popular: z.boolean().default(false),
  active: z.boolean().default(true),
  features: z.array(z.string().max(300)).max(20).default([]),
  associatedCompanyIds: z.array(z.string()).max(100).default([])
});

const listSchema = paginationSchema.extend({
  active: z.coerce.boolean().optional(),
  popular: z.coerce.boolean().optional(),
  companyId: z.string().optional(),
  search: z.string().max(120).optional()
});

export async function packsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/',
    {
      schema: doc({
        summary: 'Lister les packs',
        description:
          'Endpoint public. Le filtre companyId ne renvoie que les packs négociés pour l’entreprise indiquée.',
        tags: [TAG],
        querystring: listSchema,
        security: false
      })
    },
    async (request) => {
      const query = parse(listSchema, request.query);
      const { skip, take } = toSkipTake(query);

      const where: Prisma.AutoPackWhereInput = {
        ...(query.active !== undefined ? { active: query.active } : {}),
        ...(query.popular !== undefined ? { popular: query.popular } : {}),
        ...(query.companyId ? { companies: { some: { companyId: query.companyId } } } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
                { targetAudience: { contains: query.search, mode: 'insensitive' } }
              ]
            }
          : {})
      };

      const [rows, total] = await Promise.all([
        prisma.autoPack.findMany({
          where,
          include: { companies: true },
          orderBy: [{ popular: 'desc' }, { fixedPrice: 'asc' }],
          skip,
          take
        }),
        prisma.autoPack.count({ where })
      ]);

      return paginated(rows.map(serializePack), total, query);
    }
  );

  app.get(
    '/:id',
    {
      schema: doc({
        summary: 'Détail d’un pack (id ou slug)',
        tags: [TAG],
        params: idParamSchema,
        security: false
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);

      const pack = await prisma.autoPack.findFirst({
        where: { OR: [{ id }, { slug: id }] },
        include: { companies: { include: { company: true } } }
      });
      if (!pack) throw new NotFoundError('Pack');

      return {
        pack: serializePack(pack),
        associatedCompanies: pack.companies.map((c) => ({
          id: c.company.id,
          name: c.company.name
        }))
      };
    }
  );

  app.post(
    '/',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({ summary: 'Créer un pack', tags: [TAG], body: bodySchema })
    },
    async (request, reply) => {
      const body = parse(bodySchema, request.body);
      const { associatedCompanyIds, ...rest } = body;

      const pack = await prisma.autoPack.create({
        data: {
          ...rest,
          slug: await uniqueSlug(rest.name),
          companies: { create: associatedCompanyIds.map((companyId) => ({ companyId })) }
        },
        include: { companies: true }
      });

      await recordAudit({
        request,
        action: 'pack.create',
        entity: 'AutoPack',
        entityId: pack.id,
        after: { name: pack.name }
      });

      return reply.status(201).send({ pack: serializePack(pack) });
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Modifier un pack',
        tags: [TAG],
        params: idParamSchema,
        body: bodySchema.partial()
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const body = parse(bodySchema.partial(), request.body);
      const { associatedCompanyIds, ...rest } = body;

      const existing = await prisma.autoPack.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError('Pack');

      const pack = await prisma.$transaction(async (tx) => {
        if (associatedCompanyIds) {
          await tx.packCompany.deleteMany({ where: { packId: id } });
          await tx.packCompany.createMany({
            data: associatedCompanyIds.map((companyId) => ({ packId: id, companyId })),
            skipDuplicates: true
          });
        }

        return tx.autoPack.update({
          where: { id },
          data: rest,
          include: { companies: true }
        });
      });

      await recordAudit({ request, action: 'pack.update', entity: 'AutoPack', entityId: id });

      return { pack: serializePack(pack) };
    }
  );

  app.delete(
    '/:id',
    {
      preHandler: app.requireRole('ADMIN'),
      schema: doc({
        summary: 'Désactiver un pack',
        description: 'Le pack est désactivé plutôt que supprimé, pour préserver l’historique des réservations.',
        tags: [TAG],
        params: idParamSchema
      })
    },
    async (request) => {
      const { id } = parse(idParamSchema, request.params);
      await prisma.autoPack.update({ where: { id }, data: { active: false } });
      await recordAudit({ request, action: 'pack.deactivate', entity: 'AutoPack', entityId: id });
      return { success: true, message: 'Pack désactivé.' };
    }
  );
}

/** Ajoute un suffixe numerique tant que le slug est deja pris. */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || 'pack';
  let candidate = base;
  let suffix = 2;

  while (await prisma.autoPack.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix++}`;
  }

  return candidate;
}
