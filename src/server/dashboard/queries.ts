import { startOfDay, addDays } from "date-fns";
import { prisma } from "@/server/db";

/**
 * Shared server-only Prisma queries for the dashboard pages. All queries
 * are scoped by clinicId — that comes from `session.user.clinicId` so a
 * clinic user can't accidentally read another clinic's data.
 */

export async function getAgendaWeek(clinicId: string, anchor: Date = new Date()) {
  const start = startOfDay(anchor);
  const end = addDays(start, 7);

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      startsAt: { gte: start, lt: end },
      status: { not: "CANCELLED" },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      treatment: { select: { name: true, durationMinutes: true } },
      technician: { select: { id: true, name: true, color: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  return { start, end, appointments };
}

export async function getNeedsAttentionConversations(clinicId: string) {
  return prisma.conversation.findMany({
    // Demo runs from /app/ai create WEB-channel rows; filter them out of
    // the staff inbox so they don't show up as real patient threads.
    where: { clinicId, requiresHuman: true, channel: "WHATSAPP" },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      handoffs: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { openedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });
}

export async function getRecentConversations(clinicId: string) {
  return prisma.conversation.findMany({
    where: { clinicId, channel: "WHATSAPP" },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });
}

export async function getConversationTranscript(clinicId: string, conversationId: string) {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, clinicId },
    include: {
      patient: true,
      messages: { orderBy: { createdAt: "asc" } },
      handoffs: {
        orderBy: { openedAt: "desc" },
        include: {
          // Surface the assignee so the UI can render "Resuelto por X" instead
          // of an opaque user id.
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  return conv;
}

/**
 * Snapshot for the dashboard home (`/app`). Returns the four stat-card
 * numbers, the next 5 upcoming appointments with relations for the
 * "Próximas citas" list, the 5 most-recent conversations with their last
 * message preview, and the AI performance numbers for the last 30 days.
 */
export async function getHomeDashboard(clinicId: string) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [
    leadsLast7d,
    unreadConvs,
    upcomingAppts,
    upcomingToday,
    nextAppointments,
    recentConversations,
    aiConvs30d,
    aiAppts30d,
    aiCompleted30d,
    aiRevenueRaw,
  ] = await Promise.all([
    prisma.patient.count({
      where: { clinicId, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.conversation.count({
      where: { clinicId, requiresHuman: true, channel: "WHATSAPP" },
    }),
    prisma.appointment.count({
      where: {
        clinicId,
        startsAt: { gte: now },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
    prisma.appointment.count({
      where: {
        clinicId,
        startsAt: { gte: todayStart, lt: tomorrowStart },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
    prisma.appointment.findMany({
      where: {
        clinicId,
        startsAt: { gte: now },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        treatment: { select: { name: true } },
        technician: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.conversation.findMany({
      where: { clinicId, channel: "WHATSAPP" },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 5,
    }),
    prisma.conversation.count({
      where: { clinicId, channel: "WHATSAPP", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.appointment.count({
      where: {
        clinicId,
        createdAt: { gte: thirtyDaysAgo },
        createdBy: "BOT",
      },
    }),
    prisma.appointment.count({
      where: {
        clinicId,
        createdAt: { gte: thirtyDaysAgo },
        createdBy: "BOT",
        status: "COMPLETED",
      },
    }),
    prisma.$queryRaw<{ total: string | null }[]>`
      SELECT COALESCE(SUM(t."price"), 0)::text AS total
      FROM "Appointment" a
      JOIN "Treatment" t ON t."id" = a."treatmentId"
      WHERE a."clinicId" = ${clinicId}
        AND a."status" = 'COMPLETED'
        AND a."createdBy" = 'BOT'
        AND a."startsAt" >= ${thirtyDaysAgo}
    `,
  ]);

  return {
    stats: {
      leadsLast7d,
      unreadConvs,
      upcomingAppts,
      upcomingToday,
      revenueLast30d: Number(aiRevenueRaw[0]?.total ?? 0),
    },
    nextAppointments,
    recentConversations,
    aiKpis: {
      conversations: aiConvs30d,
      appointmentsCreated: aiAppts30d,
      closeRate: aiAppts30d > 0 ? aiCompleted30d / aiAppts30d : 0,
      revenue: Number(aiRevenueRaw[0]?.total ?? 0),
    },
  };
}

/**
 * Aggregated KPIs / funnel / top-staff / highlights for the metrics page.
 * Computes month-over-month deltas where useful. Uses raw SQL for groupings
 * that the typed Prisma client can't express (HAVING, date_part, etc).
 */
export async function getMetricsOverview(clinicId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = monthStart;
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // --- KPIs (current month) and matched prior-month for deltas ---
  const [
    leadsThis,
    leadsLast,
    leadsThisConverted,
    leadsLastConverted,
    apptsThis,
    apptsLast,
    completedThis,
    completedLast,
    revenueThisRaw,
    revenueLastRaw,
    ticketAvgThisRaw,
    ticketAvgLastRaw,
    inactiveRecoveredThis,
    inactiveRecoveredLast,
  ] = await Promise.all([
    prisma.patient.count({
      where: { clinicId, createdAt: { gte: monthStart } },
    }),
    prisma.patient.count({
      where: { clinicId, createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
    }),
    prisma.patient.count({
      where: {
        clinicId,
        createdAt: { gte: monthStart },
        appointments: { some: {} },
      },
    }),
    prisma.patient.count({
      where: {
        clinicId,
        createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
        appointments: { some: {} },
      },
    }),
    prisma.appointment.count({
      where: { clinicId, startsAt: { gte: monthStart } },
    }),
    prisma.appointment.count({
      where: { clinicId, startsAt: { gte: lastMonthStart, lt: lastMonthEnd } },
    }),
    prisma.appointment.count({
      where: { clinicId, startsAt: { gte: monthStart }, status: "COMPLETED" },
    }),
    prisma.appointment.count({
      where: {
        clinicId,
        startsAt: { gte: lastMonthStart, lt: lastMonthEnd },
        status: "COMPLETED",
      },
    }),
    prisma.$queryRaw<{ total: string | null }[]>`
      SELECT COALESCE(SUM(t."price"), 0)::text AS total
      FROM "Appointment" a
      JOIN "Treatment" t ON t."id" = a."treatmentId"
      WHERE a."clinicId" = ${clinicId}
        AND a."status" = 'COMPLETED'
        AND a."createdBy" = 'BOT'
        AND a."startsAt" >= ${monthStart}
    `,
    prisma.$queryRaw<{ total: string | null }[]>`
      SELECT COALESCE(SUM(t."price"), 0)::text AS total
      FROM "Appointment" a
      JOIN "Treatment" t ON t."id" = a."treatmentId"
      WHERE a."clinicId" = ${clinicId}
        AND a."status" = 'COMPLETED'
        AND a."createdBy" = 'BOT'
        AND a."startsAt" >= ${lastMonthStart}
        AND a."startsAt" < ${lastMonthEnd}
    `,
    prisma.$queryRaw<{ avg: string | null }[]>`
      SELECT COALESCE(AVG(t."price"), 0)::text AS avg
      FROM "Appointment" a
      JOIN "Treatment" t ON t."id" = a."treatmentId"
      WHERE a."clinicId" = ${clinicId}
        AND a."status" = 'COMPLETED'
        AND a."startsAt" >= ${monthStart}
    `,
    prisma.$queryRaw<{ avg: string | null }[]>`
      SELECT COALESCE(AVG(t."price"), 0)::text AS avg
      FROM "Appointment" a
      JOIN "Treatment" t ON t."id" = a."treatmentId"
      WHERE a."clinicId" = ${clinicId}
        AND a."status" = 'COMPLETED'
        AND a."startsAt" >= ${lastMonthStart}
        AND a."startsAt" < ${lastMonthEnd}
    `,
    prisma.patient.count({
      where: {
        clinicId,
        status: "INACTIVE",
        appointments: { some: { startsAt: { gte: monthStart } } },
      },
    }),
    prisma.patient.count({
      where: {
        clinicId,
        status: "INACTIVE",
        appointments: {
          some: { startsAt: { gte: lastMonthStart, lt: lastMonthEnd } },
        },
      },
    }),
  ]);

  const revenueThis = Number(revenueThisRaw[0]?.total ?? 0);
  const revenueLast = Number(revenueLastRaw[0]?.total ?? 0);
  const ticketAvgThis = Number(ticketAvgThisRaw[0]?.avg ?? 0);
  const ticketAvgLast = Number(ticketAvgLastRaw[0]?.avg ?? 0);

  // --- Funnel (last 30 days) ---
  const [funnelLeads, funnelConvs, funnelAppts, funnelSales] = await Promise.all([
    prisma.patient.count({
      where: { clinicId, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.conversation.count({
      where: { clinicId, channel: "WHATSAPP", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.appointment.count({
      where: {
        clinicId,
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
      },
    }),
    prisma.appointment.count({
      where: {
        clinicId,
        startsAt: { gte: thirtyDaysAgo },
        status: "COMPLETED",
      },
    }),
  ]);

  // --- Top 4 technicians by revenue this month ---
  const topStaff = await prisma.$queryRaw<
    { technicianId: string; name: string; appointments: bigint; revenue: string | null }[]
  >`
    SELECT a."technicianId",
           tech."name" AS name,
           COUNT(*)::bigint AS appointments,
           COALESCE(SUM(t."price"), 0)::text AS revenue
    FROM "Appointment" a
    JOIN "Treatment" t ON t."id" = a."treatmentId"
    JOIN "Technician" tech ON tech."id" = a."technicianId"
    WHERE a."clinicId" = ${clinicId}
      AND a."status" = 'COMPLETED'
      AND a."startsAt" >= ${monthStart}
    GROUP BY a."technicianId", tech."name"
    ORDER BY SUM(t."price") DESC NULLS LAST
    LIMIT 4
  `;

  // --- Highlights ---
  const peakDayRow = await prisma.$queryRaw<{ dow: number; count: bigint }[]>`
    SELECT EXTRACT(ISODOW FROM "startsAt")::int AS dow, COUNT(*)::bigint AS count
    FROM "Appointment"
    WHERE "clinicId" = ${clinicId}
      AND "status" = 'COMPLETED'
      AND "startsAt" >= ${monthStart}
    GROUP BY EXTRACT(ISODOW FROM "startsAt")
    ORDER BY count DESC
    LIMIT 1
  `;

  const starTreatmentRow = await prisma.$queryRaw<
    { treatmentId: string; name: string; revenue: string | null }[]
  >`
    SELECT t."id" AS "treatmentId", t."name", COALESCE(SUM(t."price"), 0)::text AS revenue
    FROM "Appointment" a
    JOIN "Treatment" t ON t."id" = a."treatmentId"
    WHERE a."clinicId" = ${clinicId}
      AND a."status" = 'COMPLETED'
      AND a."startsAt" >= ${monthStart}
    GROUP BY t."id", t."name"
    ORDER BY SUM(t."price") DESC NULLS LAST
    LIMIT 1
  `;

  return {
    kpis: {
      leadsThis,
      leadsLast,
      conversionThis: leadsThis ? leadsThisConverted / leadsThis : 0,
      conversionLast: leadsLast ? leadsLastConverted / leadsLast : 0,
      salesRateThis: apptsThis ? completedThis / apptsThis : 0,
      salesRateLast: apptsLast ? completedLast / apptsLast : 0,
      revenueThis,
      revenueLast,
      ticketAvgThis,
      ticketAvgLast,
      inactiveRecoveredThis,
      inactiveRecoveredLast,
    },
    funnel: {
      leads: funnelLeads,
      conversations: funnelConvs,
      appointments: funnelAppts,
      sales: funnelSales,
    },
    topStaff: topStaff.map((s) => ({
      technicianId: s.technicianId,
      name: s.name,
      appointments: Number(s.appointments),
      revenue: Number(s.revenue ?? 0),
    })),
    highlights: {
      peakDow: peakDayRow[0]?.dow ?? null,
      peakDayCount: peakDayRow[0] ? Number(peakDayRow[0].count) : 0,
      starTreatmentName: starTreatmentRow[0]?.name ?? null,
      starTreatmentRevenue: Number(starTreatmentRow[0]?.revenue ?? 0),
      totalRevenueThisMonth: revenueThis,
    },
  };
}

export type MetricsOverview = Awaited<ReturnType<typeof getMetricsOverview>>;

export type CampaignTemplateId =
  | "recovery-6m"
  | "vip-launch"
  | "post-treatment"
  | "lips-promo"
  | "birthdays"
  | "no-reservation";

/**
 * Audience counts per campaign template + a segment breakdown for the
 * campaigns page. Each template's filter is expressed as a Prisma where
 * clause; the client builds the cost / conversion projections from
 * `audience.templates[id]`.
 */
export async function getCampaignAudienceCounts(clinicId: string) {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const currentMonth = now.getMonth() + 1; // SQL months are 1-indexed.

  const [
    totalPatients,
    recovery6m,
    vipLaunch,
    postTreatment,
    lipsPromo,
    birthdays,
    noReservation,
    recurrentes,
    inactivos6m,
    vipCount,
    nuevos,
  ] = await Promise.all([
    prisma.patient.count({ where: { clinicId } }),

    // recovery-6m: inactive, or active but no appointment in 6 months
    prisma.patient.count({
      where: {
        clinicId,
        OR: [
          { status: "INACTIVE" },
          {
            status: "ACTIVE",
            appointments: { none: { startsAt: { gte: sixMonthsAgo } } },
          },
        ],
      },
    }),

    // vip-launch: 5+ completed appointments. Prisma can't HAVING on a
    // relation count, so we go raw.
    prisma.$queryRaw<{ patientId: string }[]>`
      SELECT "patientId"
      FROM "Appointment"
      WHERE "clinicId" = ${clinicId} AND "status" = 'COMPLETED'
      GROUP BY "patientId"
      HAVING COUNT(*) >= 5
    `.then((rows) => rows.length),

    // post-treatment: had a COMPLETED appointment in the last 7 days
    prisma.patient.count({
      where: {
        clinicId,
        appointments: {
          some: { status: "COMPLETED", startsAt: { gte: sevenDaysAgo } },
        },
      },
    }),

    // lips-promo: patient.notes or source mentions "labios"
    prisma.patient.count({
      where: {
        clinicId,
        OR: [
          { notes: { contains: "labios", mode: "insensitive" } },
          { source: { contains: "labios", mode: "insensitive" } },
        ],
      },
    }),

    // birthdays: dob month matches current month
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Patient"
      WHERE "clinicId" = ${clinicId}
        AND "dob" IS NOT NULL
        AND EXTRACT(MONTH FROM "dob") = ${currentMonth}
    `.then((rows) => Number(rows[0]?.count ?? 0)),

    // no-reservation: LEAD with conversations but no appointments
    prisma.patient.count({
      where: {
        clinicId,
        status: "LEAD",
        conversations: { some: {} },
        appointments: { none: {} },
      },
    }),

    // segment: 3+ completed appointments
    prisma.$queryRaw<{ patientId: string }[]>`
      SELECT "patientId"
      FROM "Appointment"
      WHERE "clinicId" = ${clinicId} AND "status" = 'COMPLETED'
      GROUP BY "patientId"
      HAVING COUNT(*) >= 3
    `.then((rows) => rows.length),

    // segment: same as recovery-6m for the bar chart
    prisma.patient.count({
      where: {
        clinicId,
        OR: [
          { status: "INACTIVE" },
          {
            status: "ACTIVE",
            appointments: { none: { startsAt: { gte: sixMonthsAgo } } },
          },
        ],
      },
    }),

    // segment: VIP — same as vip-launch
    prisma.$queryRaw<{ patientId: string }[]>`
      SELECT "patientId"
      FROM "Appointment"
      WHERE "clinicId" = ${clinicId} AND "status" = 'COMPLETED'
      GROUP BY "patientId"
      HAVING COUNT(*) >= 5
    `.then((rows) => rows.length),

    // segment: nuevos — created in last 30 days
    prisma.patient.count({
      where: { clinicId, createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  return {
    totalPatients,
    templates: {
      "recovery-6m": recovery6m,
      "vip-launch": vipLaunch,
      "post-treatment": postTreatment,
      "lips-promo": lipsPromo,
      birthdays,
      "no-reservation": noReservation,
    } satisfies Record<CampaignTemplateId, number>,
    segments: { recurrentes, inactivos6m, vip: vipCount, nuevos },
  };
}

export type CampaignAudience = Awaited<ReturnType<typeof getCampaignAudienceCounts>>;

/**
 * Patients for the pipeline kanban. Includes the last conversation and the
 * next upcoming appointment so the page can bucket each patient into a
 * funnel stage without extra round-trips. Bucketization happens on the
 * caller — see /app/pipeline/page.tsx.
 */
export async function getPipelinePatients(clinicId: string) {
  return prisma.patient.findMany({
    where: { clinicId },
    include: {
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 1,
      },
      appointments: {
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
        orderBy: { startsAt: "asc" },
        take: 1,
        include: { treatment: { select: { name: true } } },
      },
      _count: { select: { conversations: true, appointments: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });
}

/**
 * Clinic overview for the settings page — name, timezone, WhatsApp number,
 * plus counts of staff/treatments/technicians/business-hour windows so the
 * staff can see the basic shape of their tenant at a glance.
 */
export async function getClinicOverview(clinicId: string) {
  const [clinic, userCount, treatmentCount, technicianCount, businessHoursCount] =
    await Promise.all([
      prisma.clinic.findUnique({ where: { id: clinicId } }),
      prisma.user.count({ where: { clinicId, active: true } }),
      prisma.treatment.count({ where: { clinicId } }),
      prisma.technician.count({ where: { clinicId } }),
      prisma.clinicBusinessHours.count({ where: { clinicId } }),
    ]);
  if (!clinic) return null;
  return { clinic, userCount, treatmentCount, technicianCount, businessHoursCount };
}

/**
 * Full patient detail for the client profile page: profile + their
 * appointments (with treatment + technician) + their conversations with a
 * one-line preview. Scoped by clinic so an admin from clinic A can't read
 * patient records from clinic B.
 */
export async function getPatientDetail(clinicId: string, patientId: string) {
  return prisma.patient.findFirst({
    where: { id: patientId, clinicId },
    include: {
      appointments: {
        include: {
          treatment: { select: { name: true, price: true, durationMinutes: true } },
          technician: { select: { name: true, color: true } },
        },
        orderBy: { startsAt: "desc" },
      },
      conversations: {
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { lastMessageAt: "desc" },
      },
      // The bot's accumulated memory about this patient — surfaced in the
      // client detail page so staff can see what the AI has learned (e.g.
      // preferred_technician=Diana, allergy=lidocaine).
      memories: {
        select: { key: true, value: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
}

/**
 * Staff list for /app/settings/staff. Returns all users belonging to the
 * given clinic (active + inactive), ordered with active first then by
 * creation date. Includes the basic fields the page renders.
 */
export async function getStaffList(clinicId: string) {
  return prisma.user.findMany({
    where: { clinicId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
  });
}

export async function getPatients(clinicId: string, search?: string) {
  const trimmed = search?.trim();
  return prisma.patient.findMany({
    where: {
      clinicId,
      ...(trimmed
        ? {
            OR: [
              { firstName: { contains: trimmed, mode: "insensitive" } },
              { lastName: { contains: trimmed, mode: "insensitive" } },
              { phone: { contains: trimmed } },
              { email: { contains: trimmed, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { appointments: true, conversations: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
  });
}
