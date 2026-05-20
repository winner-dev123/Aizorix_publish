import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";

/**
 * Integration tests for the booking service. Skipped unless a real Postgres
 * is reachable via DATABASE_URL — runs against the Bellem seed.
 *
 * To run locally:
 *   docker compose up -d postgres
 *   npm run db:migrate
 *   npm run db:seed
 *   npm test
 */

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

describeMaybe("booking service (integration)", () => {
  let prisma: PrismaClient;
  let bookAppointment: typeof import("../booking/book").bookAppointment;
  let clinicId: string;
  let patientId: string;
  let limpiezaId: string;
  let microbladingId: string;
  let dianaId: string;
  let leoId: string;
  let isisId: string;

  beforeAll(async () => {
    const dbModule = await import("../db");
    prisma = dbModule.prisma;
    bookAppointment = (await import("../booking/book")).bookAppointment;

    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { slug: "bellem" } });
    clinicId = clinic.id;

    const limpieza = await prisma.treatment.findUniqueOrThrow({
      where: { clinicId_slug: { clinicId, slug: "limpieza-facial" } },
    });
    limpiezaId = limpieza.id;

    const microblading = await prisma.treatment.findUniqueOrThrow({
      where: { clinicId_slug: { clinicId, slug: "microblading" } },
    });
    microbladingId = microblading.id;

    dianaId = (await prisma.technician.findFirstOrThrow({ where: { clinicId, name: "Diana" } })).id;
    leoId = (await prisma.technician.findFirstOrThrow({ where: { clinicId, name: "Leo" } })).id;
    isisId = (await prisma.technician.findFirstOrThrow({ where: { clinicId, name: "Isis" } })).id;

    const patient = await prisma.patient.upsert({
      where: { clinicId_phone: { clinicId, phone: "+34611000001" } },
      update: {},
      create: {
        clinicId,
        firstName: "Test",
        lastName: "Patient",
        phone: "+34611000001",
        status: "ACTIVE",
      },
    });
    patientId = patient.id;

    await prisma.appointment.deleteMany({
      where: { clinicId, patientId },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.appointment.deleteMany({ where: { clinicId, patientId } });
      await prisma.$disconnect();
    }
  });

  // Next Monday 10:00 Madrid = Monday 08:00 UTC (CEST) — well inside business hours.
  function nextMondayAt(hour: number, minute = 0) {
    const now = new Date();
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour - 2, minute));
    while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
    // Push at least 7 days into the future to avoid clashing with anything
    d.setUTCDate(d.getUTCDate() + 7);
    return d;
  }

  it("books an appointment in business hours", async () => {
    const startsAt = nextMondayAt(10, 0);
    const appt = await bookAppointment({
      clinicId,
      patientId,
      treatmentId: limpiezaId,
      technicianId: dianaId,
      startsAt,
      createdBy: "BOT",
    });
    expect(appt.status).toBe("CONFIRMED");
    expect(appt.endsAt.getTime() - appt.startsAt.getTime()).toBe(60 * 60 * 1000);

    await prisma.appointment.delete({ where: { id: appt.id } });
  });

  it("rejects overlapping bookings for the same technician", async () => {
    const startsAt = nextMondayAt(11, 0);
    const first = await bookAppointment({
      clinicId,
      patientId,
      treatmentId: limpiezaId,
      technicianId: dianaId,
      startsAt,
    });

    await expect(
      bookAppointment({
        clinicId,
        patientId,
        treatmentId: limpiezaId,
        technicianId: dianaId,
        startsAt: new Date(startsAt.getTime() + 15 * 60 * 1000),
      }),
    ).rejects.toMatchObject({ code: "OVERLAP" });

    await prisma.appointment.delete({ where: { id: first.id } });
  });

  it("rejects appointments outside business hours (Sunday)", async () => {
    // Next Sunday at 11:00 Madrid
    const now = new Date();
    const sunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9));
    while (sunday.getUTCDay() !== 0) sunday.setUTCDate(sunday.getUTCDate() + 1);
    sunday.setUTCDate(sunday.getUTCDate() + 7);

    await expect(
      bookAppointment({
        clinicId,
        patientId,
        treatmentId: limpiezaId,
        technicianId: dianaId,
        startsAt: sunday,
      }),
    ).rejects.toMatchObject({ code: "OUTSIDE_BUSINESS_HOURS" });
  });

  it("rejects an ineligible technician (Leo on depilación con hilo)", async () => {
    const depilacion = await prisma.treatment.findUniqueOrThrow({
      where: { clinicId_slug: { clinicId, slug: "depilacion-hilo" } },
    });
    await expect(
      bookAppointment({
        clinicId,
        patientId,
        treatmentId: depilacion.id,
        technicianId: leoId,
        startsAt: nextMondayAt(12, 0),
      }),
    ).rejects.toMatchObject({ code: "TECHNICIAN_NOT_ELIGIBLE" });
  });

  it("rejects a non-exclusive tech on microblading (Leo-only)", async () => {
    await expect(
      bookAppointment({
        clinicId,
        patientId,
        treatmentId: microbladingId,
        technicianId: isisId,
        startsAt: nextMondayAt(10, 0),
      }),
    ).rejects.toMatchObject(
      // Either NOT_ELIGIBLE (no row exists) or NOT_EXCLUSIVE (row exists but excluded)
      expect.objectContaining({
        code: expect.stringMatching(/TECHNICIAN_(NOT_ELIGIBLE|NOT_EXCLUSIVE)/),
      }) as object,
    );
  });

  it("rejects bookings with too-short lead time", async () => {
    const startsAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
    await expect(
      bookAppointment({
        clinicId,
        patientId,
        treatmentId: limpiezaId,
        technicianId: dianaId,
        startsAt,
      }),
    ).rejects.toMatchObject({ code: expect.stringMatching(/LEAD_TIME_TOO_SHORT|OUTSIDE_BUSINESS_HOURS/) as unknown as string });
  });
});
