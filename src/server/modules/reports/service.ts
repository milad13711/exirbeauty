import { prisma } from "../../db";
import { addDays, tehranNow } from "../calendar/availability";
import { dayLoad } from "../calendar/service";
import { summary } from "../cashier/service";

// Read-only roll-ups over the other modules' data; every query is scoped by tenantId.

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

/** Everything the home screen shows, in one round trip. */
export async function dashboard(tenantId: string) {
  const now = tehranNow(), today = now.date;
  const [t, lastWeek, load, m30, appts] = await Promise.all([
    summary(tenantId, today, today),
    summary(tenantId, addDays(today, -7), addDays(today, -7)),
    dayLoad(tenantId, today),
    summary(tenantId, addDays(today, -29), today),
    prisma.appointment.findMany({ where: { tenantId, date: day(today) }, select: { status: true, customerId: true } }),
  ]);

  // 7-day revenue series (oldest first)
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const sales7 = await prisma.sale.groupBy({ by: ["date"], where: { tenantId, status: { not: "VOID" }, date: { gte: day(days[0]), lte: day(today) } }, _sum: { total: true } });
  const week = days.map((d) => ({ date: d, revenue: sales7.find((x) => x.date.toISOString().slice(0, 10) === d)?._sum.total ?? 0 }));

  // customers invoiced today: new = their first-ever invoice is today
  const todaySales = await prisma.sale.findMany({ where: { tenantId, date: day(today), status: { not: "VOID" }, customerId: { not: null } }, select: { customerId: true } });
  const ids = [...new Set(todaySales.map((s) => s.customerId!))];
  const earlier = ids.length ? await prisma.sale.findMany({ where: { tenantId, customerId: { in: ids }, date: { lt: day(today) }, status: { not: "VOID" } }, select: { customerId: true }, distinct: ["customerId"] }) : [];
  const returning = earlier.length, fresh = ids.length - returning;

  // service profitability over 30 days: share of service revenue and margin after materials + commission
  const lines = await prisma.saleLine.findMany({ where: { sale: { tenantId, status: { not: "VOID" }, date: { gte: day(addDays(today, -29)), lte: day(today) } }, kind: "SERVICE", refId: { not: null } }, select: { refId: true, qty: true, price: true, commissionPct: true, sale: { select: { discountPct: true } } } });
  const rev = new Map<string, number>();
  for (const l of lines) rev.set(l.refId!, (rev.get(l.refId!) ?? 0) + Math.round(l.price * l.qty * (1 - l.sale.discountPct / 100)));
  const total = [...rev.values()].reduce((a, b) => a + b, 0) || 1;
  const svcRows = rev.size ? await prisma.service.findMany({ where: { tenantId, id: { in: [...rev.keys()] } }, select: { id: true, name: true, price: true, materialCost: true, commissionPct: true } }) : [];
  const services = svcRows
    .map((s) => ({ name: s.name, share: Math.round(((rev.get(s.id) ?? 0) / total) * 100), margin: s.price > 0 ? Math.round(((s.price - s.materialCost - (s.price * s.commissionPct) / 100) / s.price) * 100) : 0 }))
    .sort((a, b) => b.share - a.share).slice(0, 4);

  // opportunities
  const cutoff = new Date(Date.now() - 45 * 86_400_000);
  const [inactive, debts] = await Promise.all([
    prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM (SELECT "customerId", MAX("at") AS last FROM "CustomerVisit" WHERE "tenantId" = ${tenantId} GROUP BY "customerId") v JOIN "Customer" c ON c."id" = v."customerId" WHERE c."archivedAt" IS NULL AND v.last < ${cutoff}`,
    prisma.sale.aggregate({ where: { tenantId, status: "DEBT" }, _sum: { debt: true } }),
  ]);

  const delta = lastWeek.revenue ? Math.round(((t.revenue - lastWeek.revenue) / lastWeek.revenue) * 100) : null;
  return {
    date: today,
    revenue: t.revenue, invoices: t.count, products: t.products, commission: t.byStaff.reduce((a, s) => a + s.commission, 0), deltaVsLastWeek: delta,
    appointments: { total: appts.length, done: appts.filter((a) => a.status === "DONE").length, pending: appts.filter((a) => a.status === "PENDING").length },
    load: { ...load, freeHours: Math.max(0, Math.round((load.capacity - load.booked) / 60)) },
    customers: { new: fresh, returning },
    week, services, topStaff: m30.byStaff.slice(0, 4),
    month: { revenue: m30.revenue, net: m30.net },
    opportunities: { inactiveCustomers: Number(inactive[0]?.n ?? 0), pendingAppointments: appts.filter((a) => a.status === "PENDING").length, debt: debts._sum.debt ?? 0 },
  };
}
