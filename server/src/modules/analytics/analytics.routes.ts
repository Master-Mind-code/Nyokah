import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { addMonths, countRentalDays, startOfMonth, toDateString, toUtcDay } from '../../lib/dates.js';
import {
  BookingStatusEnum,
  RentalFormulaEnum,
  VehicleCategoryEnum,
  VehicleStatusEnum
} from '../../lib/enums.js';
import { doc, parse } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';

const TAG = 'Pilotage & statistiques';

const periodSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional()
});

/**
 * Fenetre par defaut : 12 mois glissants ecoules + 12 mois a venir.
 * Les statistiques sont indexees sur la date de debut de location, c'est-a-dire
 * sur la prestation reelle. Une location a venir compte donc dans le carnet de
 * commandes et doit rester visible : une fenetre uniquement retrospective
 * masquerait toutes les reservations futures, qui sont l'essentiel de
 * l'activite d'un loueur.
 */
function resolvePeriod(query: z.infer<typeof periodSchema>) {
  const today = toUtcDay(new Date());
  const from = query.from ? toUtcDay(query.from) : addMonths(startOfMonth(today), -11);
  const to = query.to ? toUtcDay(query.to) : addMonths(startOfMonth(today), 12);
  return { from, to, today };
}

const REVENUE_STATUSES = ['CONFIRMEE', 'EN_COURS', 'TERMINEE'] as const;

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireRole('ADMIN'));

  app.get(
    '/dashboard',
    {
      schema: doc({
        summary: 'Indicateurs clés du tableau de bord',
        description:
          'Chiffre d’affaires, réservations par statut, taux d’occupation de la flotte, missions du jour et alertes d’exploitation.',
        tags: [TAG],
        querystring: periodSchema
      })
    },
    async (request) => {
      const query = parse(periodSchema, request.query);
      const { from, to, today } = resolvePeriod(query);
      const monthStart = startOfMonth(today);
      const previousMonthStart = addMonths(monthStart, -1);

      const [
        revenuePeriod,
        revenueRealized,
        revenueUpcoming,
        revenueThisMonth,
        revenuePreviousMonth,
        bookingsByStatus,
        vehiclesByStatus,
        totalVehicles,
        activeDrivers,
        ridesToday,
        pendingBookings,
        bookingsThisMonth,
        newClientsThisMonth,
        outstanding
      ] = await Promise.all([
        prisma.booking.aggregate({
          where: { status: { in: [...REVENUE_STATUSES] }, startDate: { gte: from, lte: to } },
          _sum: { totalAmount: true, subtotal: true },
          _count: { _all: true }
        }),
        // Prestations deja commencees : chiffre d'affaires acquis.
        prisma.booking.aggregate({
          where: { status: { in: [...REVENUE_STATUSES] }, startDate: { gte: from, lte: today } },
          _sum: { totalAmount: true }
        }),
        // Carnet de commandes : locations a venir deja engagees.
        prisma.booking.aggregate({
          where: { status: { in: [...REVENUE_STATUSES] }, startDate: { gt: today, lte: to } },
          _sum: { totalAmount: true },
          _count: { _all: true }
        }),
        prisma.booking.aggregate({
          where: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: monthStart } },
          _sum: { totalAmount: true }
        }),
        prisma.booking.aggregate({
          where: {
            status: { in: [...REVENUE_STATUSES] },
            createdAt: { gte: previousMonthStart, lt: monthStart }
          },
          _sum: { totalAmount: true }
        }),
        prisma.booking.groupBy({
          by: ['status'],
          where: { createdAt: { gte: from } },
          _count: { _all: true },
          _sum: { totalAmount: true }
        }),
        prisma.vehicle.groupBy({
          by: ['status'],
          where: { deletedAt: null },
          _count: { _all: true }
        }),
        prisma.vehicle.count({ where: { deletedAt: null } }),
        prisma.driver.count({ where: { deletedAt: null, status: { not: 'CONGE' } } }),
        prisma.ride.count({ where: { scheduledDate: today } }),
        prisma.booking.count({ where: { status: 'EN_ATTENTE' } }),
        // Réservations enregistrées depuis le début du mois courant.
        prisma.booking.count({
          where: { status: { not: 'ANNULEE' }, createdAt: { gte: monthStart } }
        }),
        prisma.user.count({ where: { createdAt: { gte: monthStart }, deletedAt: null } }),
        prisma.invoice.aggregate({
          where: { status: { in: ['EMISE', 'PARTIELLEMENT_PAYEE', 'EN_RETARD'] } },
          _sum: { totalAmount: true, amountPaid: true }
        })
      ]);

      const thisMonth = revenueThisMonth._sum.totalAmount ?? 0;
      const lastMonth = revenuePreviousMonth._sum.totalAmount ?? 0;
      const rented = vehiclesByStatus.find((v) => v.status === 'LOUE')?._count._all ?? 0;

      return {
        period: { from: toDateString(from), to: toDateString(to) },
        revenue: {
          period: revenuePeriod._sum.totalAmount ?? 0,
          periodExcludingTax: revenuePeriod._sum.subtotal ?? 0,
          /** Prestations dont la location a déjà commencé. */
          realized: revenueRealized._sum.totalAmount ?? 0,
          /** Carnet de commandes : locations engagées mais pas encore démarrées. */
          upcoming: revenueUpcoming._sum.totalAmount ?? 0,
          upcomingBookings: revenueUpcoming._count._all,
          thisMonth,
          previousMonth: lastMonth,
          // Croissance mensuelle : null quand il n'y a pas de base de comparaison.
          growthRate: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null
        },
        bookings: {
          total: revenuePeriod._count._all,
          thisMonth: bookingsThisMonth,
          pending: pendingBookings,
          byStatus: bookingsByStatus.map((b) => ({
            status: BookingStatusEnum.toLabel(b.status),
            count: b._count._all,
            revenue: b._sum.totalAmount ?? 0
          }))
        },
        fleet: {
          total: totalVehicles,
          rented,
          utilizationRate: totalVehicles > 0 ? Math.round((rented / totalVehicles) * 100) : 0,
          byStatus: vehiclesByStatus.map((v) => ({
            status: VehicleStatusEnum.toLabel(v.status),
            count: v._count._all
          }))
        },
        operations: { activeDrivers, ridesToday },
        clients: { newThisMonth: newClientsThisMonth },
        finance: {
          outstandingReceivables:
            (outstanding._sum.totalAmount ?? 0) - (outstanding._sum.amountPaid ?? 0)
        }
      };
    }
  );

  app.get(
    '/revenue',
    {
      schema: doc({
        summary: 'Évolution du chiffre d’affaires',
        description: 'Série temporelle mensuelle ou journalière, prête à alimenter les graphiques.',
        tags: [TAG],
        querystring: periodSchema.extend({ groupBy: z.enum(['month', 'day']).default('month') })
      })
    },
    async (request) => {
      const query = parse(
        periodSchema.extend({ groupBy: z.enum(['month', 'day']).default('month') }),
        request.query
      );
      const { from, to } = resolvePeriod(query);

      const bookings = await prisma.booking.findMany({
        where: { status: { in: [...REVENUE_STATUSES] }, startDate: { gte: from, lte: to } },
        select: {
          startDate: true,
          totalAmount: true,
          subtotal: true,
          taxAmount: true,
          discountAmount: true,
          companyId: true,
          status: true,
          formula: true
        },
        orderBy: { startDate: 'asc' }
      });

      interface Bucket {
        revenue: number;
        net: number;
        tax: number;
        discounts: number;
        bookings: number;
        revenueB2B: number;
        revenueB2C: number;
        corporateBookings: number;
        privateBookings: number;
        completedBookings: number;
      }

      const emptyBucket = (): Bucket => ({
        revenue: 0,
        net: 0,
        tax: 0,
        discounts: 0,
        bookings: 0,
        revenueB2B: 0,
        revenueB2C: 0,
        corporateBookings: 0,
        privateBookings: 0,
        completedBookings: 0
      });

      // Agregation en memoire : le volume mensuel reste modeste et cela evite
      // une requete SQL brute specifique a PostgreSQL.
      const buckets = new Map<string, Bucket>();
      const formulaTotals = new Map<string, { bookings: number; revenue: number }>();

      for (const b of bookings) {
        const key =
          query.groupBy === 'day'
            ? toDateString(b.startDate)
            : toDateString(b.startDate).slice(0, 7);

        const bucket = buckets.get(key) ?? emptyBucket();
        bucket.revenue += b.totalAmount;
        bucket.net += b.subtotal;
        bucket.tax += b.taxAmount;
        bucket.discounts += b.discountAmount;
        bucket.bookings += 1;

        // Un compte entreprise rattaché distingue le chiffre d'affaires B2B du B2C.
        if (b.companyId) {
          bucket.revenueB2B += b.totalAmount;
          bucket.corporateBookings += 1;
        } else {
          bucket.revenueB2C += b.totalAmount;
          bucket.privateBookings += 1;
        }

        if (b.status === 'TERMINEE') bucket.completedBookings += 1;
        buckets.set(key, bucket);

        const formulaLabel = RentalFormulaEnum.toLabel(b.formula);
        const formulaEntry = formulaTotals.get(formulaLabel) ?? { bookings: 0, revenue: 0 };
        formulaEntry.bookings += 1;
        formulaEntry.revenue += b.totalAmount;
        formulaTotals.set(formulaLabel, formulaEntry);
      }

      const series = [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, values]) => ({
          period,
          ...values,
          avgBasket: values.bookings > 0 ? Math.round(values.revenue / values.bookings) : 0
        }));

      const totals = series.reduce(
        (acc, s) => ({
          revenue: acc.revenue + s.revenue,
          net: acc.net + s.net,
          tax: acc.tax + s.tax,
          discounts: acc.discounts + s.discounts,
          bookings: acc.bookings + s.bookings,
          revenueB2B: acc.revenueB2B + s.revenueB2B,
          revenueB2C: acc.revenueB2C + s.revenueB2C,
          completedBookings: acc.completedBookings + s.completedBookings
        }),
        {
          revenue: 0,
          net: 0,
          tax: 0,
          discounts: 0,
          bookings: 0,
          revenueB2B: 0,
          revenueB2C: 0,
          completedBookings: 0
        }
      );

      return {
        groupBy: query.groupBy,
        from: toDateString(from),
        to: toDateString(to),
        series,
        totals,
        /** Répartition réelle par formule de location, pour le graphique en anneau. */
        byFormula: [...formulaTotals.entries()]
          .map(([formula, values]) => ({
            formula,
            bookings: values.bookings,
            revenue: values.revenue,
            share: totals.bookings > 0 ? Math.round((values.bookings / totals.bookings) * 100) : 0
          }))
          .sort((a, b) => b.revenue - a.revenue)
      };
    }
  );

  app.get(
    '/fleet',
    {
      schema: doc({
        summary: 'Performance de la flotte',
        description:
          'Chiffre d’affaires, nombre de locations et taux d’occupation par véhicule et par catégorie sur la période.',
        tags: [TAG],
        querystring: periodSchema
      })
    },
    async (request) => {
      const query = parse(periodSchema, request.query);
      const { from, to } = resolvePeriod(query);
      const periodDays = countRentalDays(from, to);

      const [vehicles, bookings] = await Promise.all([
        prisma.vehicle.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            brand: true,
            model: true,
            plateNumber: true,
            category: true,
            dailyRate: true
          }
        }),
        prisma.booking.findMany({
          where: { status: { in: [...REVENUE_STATUSES] }, startDate: { gte: from, lte: to } },
          select: { vehicleId: true, totalAmount: true, durationDays: true }
        })
      ]);

      const byVehicle = new Map<string, { revenue: number; rentals: number; daysRented: number }>();
      for (const b of bookings) {
        const entry = byVehicle.get(b.vehicleId) ?? { revenue: 0, rentals: 0, daysRented: 0 };
        entry.revenue += b.totalAmount;
        entry.rentals += 1;
        entry.daysRented += b.durationDays;
        byVehicle.set(b.vehicleId, entry);
      }

      const rows = vehicles
        .map((v) => {
          const stats = byVehicle.get(v.id) ?? { revenue: 0, rentals: 0, daysRented: 0 };
          return {
            vehicleId: v.id,
            name: `${v.brand} ${v.model}`,
            plateNumber: v.plateNumber,
            category: VehicleCategoryEnum.toLabel(v.category),
            dailyRate: v.dailyRate,
            revenue: stats.revenue,
            rentals: stats.rentals,
            daysRented: stats.daysRented,
            utilizationRate: Math.min(100, Math.round((stats.daysRented / periodDays) * 100))
          };
        })
        .sort((a, b) => b.revenue - a.revenue);

      const byCategory = new Map<string, { revenue: number; rentals: number; vehicles: number }>();
      for (const row of rows) {
        const entry = byCategory.get(row.category) ?? { revenue: 0, rentals: 0, vehicles: 0 };
        entry.revenue += row.revenue;
        entry.rentals += row.rentals;
        entry.vehicles += 1;
        byCategory.set(row.category, entry);
      }

      return {
        period: { from: toDateString(from), to: toDateString(to), days: periodDays },
        vehicles: rows,
        byCategory: [...byCategory.entries()]
          .map(([category, values]) => ({ category, ...values }))
          .sort((a, b) => b.revenue - a.revenue)
      };
    }
  );

  app.get(
    '/drivers',
    {
      schema: doc({
        summary: 'Performance des chauffeurs',
        tags: [TAG],
        querystring: periodSchema
      })
    },
    async (request) => {
      const query = parse(periodSchema, request.query);
      const { from, to } = resolvePeriod(query);

      const [drivers, ridesByDriver, revenueByDriver] = await Promise.all([
        prisma.driver.findMany({
          where: { deletedAt: null },
          select: { id: true, name: true, rating: true, completedRides: true, status: true }
        }),
        prisma.ride.groupBy({
          by: ['driverId', 'status'],
          where: { scheduledDate: { gte: from, lte: to } },
          _count: { _all: true }
        }),
        prisma.booking.groupBy({
          by: ['assignedDriverId'],
          where: {
            assignedDriverId: { not: null },
            status: { in: [...REVENUE_STATUSES] },
            startDate: { gte: from, lte: to }
          },
          _sum: { totalAmount: true }
        })
      ]);

      const revenueMap = new Map(
        revenueByDriver.map((r) => [r.assignedDriverId, r._sum.totalAmount ?? 0])
      );

      return {
        period: { from: toDateString(from), to: toDateString(to) },
        data: drivers
          .map((d) => {
            const rides = ridesByDriver.filter((r) => r.driverId === d.id);
            return {
              driverId: d.id,
              name: d.name,
              status: d.status,
              rating: d.rating,
              lifetimeRides: d.completedRides,
              periodRides: rides.reduce((sum, r) => sum + r._count._all, 0),
              completedRides: rides
                .filter((r) => r.status === 'TERMINEE')
                .reduce((sum, r) => sum + r._count._all, 0),
              cancelledRides: rides
                .filter((r) => r.status === 'ANNULEE')
                .reduce((sum, r) => sum + r._count._all, 0),
              revenueGenerated: revenueMap.get(d.id) ?? 0
            };
          })
          .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
      };
    }
  );

  app.get(
    '/companies',
    {
      schema: doc({
        summary: 'Classement des comptes entreprise',
        tags: [TAG],
        querystring: periodSchema.extend({
          limit: z.coerce.number().int().min(1).max(100).default(20)
        })
      })
    },
    async (request) => {
      const query = parse(
        periodSchema.extend({ limit: z.coerce.number().int().min(1).max(100).default(20) }),
        request.query
      );
      const { from, to } = resolvePeriod(query);

      const [companies, grouped] = await Promise.all([
        prisma.company.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            status: true,
            negotiatedDiscountRate: true,
            monthlyVolumeTarget: true
          }
        }),
        prisma.booking.groupBy({
          by: ['companyId'],
          where: {
            companyId: { not: null },
            status: { in: [...REVENUE_STATUSES] },
            startDate: { gte: from, lte: to }
          },
          _sum: { totalAmount: true, discountAmount: true },
          _count: { _all: true }
        })
      ]);

      const statsMap = new Map(grouped.map((g) => [g.companyId, g]));

      return {
        period: { from: toDateString(from), to: toDateString(to) },
        data: companies
          .map((c) => {
            const stats = statsMap.get(c.id);
            return {
              companyId: c.id,
              name: c.name,
              status: c.status,
              negotiatedDiscountRate: c.negotiatedDiscountRate,
              monthlyVolumeTarget: c.monthlyVolumeTarget,
              bookings: stats?._count._all ?? 0,
              revenue: stats?._sum.totalAmount ?? 0,
              discountsGranted: stats?._sum.discountAmount ?? 0
            };
          })
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, query.limit)
      };
    }
  );

  app.get(
    '/top-vehicles',
    {
      schema: doc({
        summary: 'Véhicules les plus demandés',
        tags: [TAG],
        querystring: periodSchema.extend({
          limit: z.coerce.number().int().min(1).max(50).default(10)
        })
      })
    },
    async (request) => {
      const query = parse(
        periodSchema.extend({ limit: z.coerce.number().int().min(1).max(50).default(10) }),
        request.query
      );
      const { from, to } = resolvePeriod(query);

      const grouped = await prisma.booking.groupBy({
        by: ['vehicleId'],
        where: { status: { in: [...REVENUE_STATUSES] }, startDate: { gte: from, lte: to } },
        _count: { _all: true },
        _sum: { totalAmount: true },
        orderBy: { _count: { vehicleId: 'desc' } },
        take: query.limit
      });

      const vehicles = await prisma.vehicle.findMany({
        where: { id: { in: grouped.map((g) => g.vehicleId) } },
        select: { id: true, brand: true, model: true, imageUrl: true, category: true }
      });

      const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

      return {
        data: grouped.map((g) => {
          const vehicle = vehicleMap.get(g.vehicleId);
          return {
            vehicleId: g.vehicleId,
            name: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule retiré',
            category: vehicle ? VehicleCategoryEnum.toLabel(vehicle.category) : null,
            imageUrl: vehicle?.imageUrl ?? null,
            bookings: g._count._all,
            revenue: g._sum.totalAmount ?? 0
          };
        })
      };
    }
  );

  app.get(
    '/audit-log',
    {
      schema: doc({
        summary: 'Journal d’audit',
        tags: [TAG],
        querystring: z.object({
          entity: z.string().max(60).optional(),
          entityId: z.string().optional(),
          actorId: z.string().optional(),
          action: z.string().max(80).optional(),
          limit: z.coerce.number().int().min(1).max(200).default(50)
        })
      })
    },
    async (request) => {
      const query = parse(
        z.object({
          entity: z.string().max(60).optional(),
          entityId: z.string().optional(),
          actorId: z.string().optional(),
          action: z.string().max(80).optional(),
          limit: z.coerce.number().int().min(1).max(200).default(50)
        }),
        request.query
      );

      const rows = await prisma.auditLog.findMany({
        where: {
          ...(query.entity ? { entity: query.entity } : {}),
          ...(query.entityId ? { entityId: query.entityId } : {}),
          ...(query.actorId ? { actorId: query.actorId } : {}),
          ...(query.action ? { action: { contains: query.action } } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit
      });

      return { data: rows };
    }
  );
}
