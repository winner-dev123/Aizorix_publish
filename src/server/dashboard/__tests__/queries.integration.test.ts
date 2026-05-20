/**
 * Integration tests for the Phase 5 dashboard queries. These don't try to
 * pin exact numbers (they vary with seed + manual test runs) — they assert
 * shape, scoping, and that the raw-SQL paths don't throw on schema drift.
 *
 *   - getClinicOverview          — exists + counts ≥ 0
 *   - getPatientDetail           — clinic-scoped (cross-tenant returns null)
 *   - getPipelinePatients        — exists, returns an array
 *   - getCampaignAudienceCounts  — typed object with 6 templates + 4 segments
 *   - getMetricsOverview         — typed object with kpis/funnel/topStaff/highlights
 *   - getHomeDashboard           — stats + lists shape
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import {
  getCampaignAudienceCounts,
  getClinicOverview,
  getHomeDashboard,
  getMetricsOverview,
  getPatientDetail,
  getPipelinePatients,
} from "../queries";

const hasDatabase = !!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== "0";
const describeMaybe = hasDatabase ? describe : describe.skip;

describeMaybe("dashboard queries (DB)", () => {
  let clinicId: string;

  beforeAll(async () => {
    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { slug: "bellem" } });
    clinicId = clinic.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("getClinicOverview returns the clinic + non-negative counts", async () => {
    const overview = await getClinicOverview(clinicId);
    expect(overview).not.toBeNull();
    expect(overview!.clinic.slug).toBe("bellem");
    expect(overview!.userCount).toBeGreaterThanOrEqual(0);
    expect(overview!.treatmentCount).toBeGreaterThanOrEqual(8); // seeded
    expect(overview!.technicianCount).toBeGreaterThanOrEqual(3); // seeded
    expect(overview!.businessHoursCount).toBeGreaterThanOrEqual(0);
  });

  it("getClinicOverview returns null for an unknown clinic", async () => {
    const overview = await getClinicOverview("clinic-that-does-not-exist");
    expect(overview).toBeNull();
  });

  it("getPatientDetail scopes by clinicId", async () => {
    // Pick any patient and verify it's invisible to a different clinicId.
    const anyPatient = await prisma.patient.findFirst({ where: { clinicId } });
    if (!anyPatient) return; // nothing to assert — no patients seeded yet

    const found = await getPatientDetail(clinicId, anyPatient.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(anyPatient.id);

    const crossTenant = await getPatientDetail("clinic-other", anyPatient.id);
    expect(crossTenant).toBeNull();
  });

  it("getPipelinePatients returns an array with relations populated", async () => {
    const rows = await getPipelinePatients(clinicId);
    expect(Array.isArray(rows)).toBe(true);
    for (const p of rows) {
      // Every row should carry the relation arrays the page needs.
      expect(Array.isArray(p.conversations)).toBe(true);
      expect(Array.isArray(p.appointments)).toBe(true);
      expect(p._count.conversations).toBeGreaterThanOrEqual(0);
    }
  });

  it("getCampaignAudienceCounts returns 6 template counts + 4 segments", async () => {
    const audience = await getCampaignAudienceCounts(clinicId);
    expect(audience.totalPatients).toBeGreaterThanOrEqual(0);
    expect(Object.keys(audience.templates).sort()).toEqual(
      ["birthdays", "lips-promo", "no-reservation", "post-treatment", "recovery-6m", "vip-launch"],
    );
    expect(Object.keys(audience.segments).sort()).toEqual(
      ["inactivos6m", "nuevos", "recurrentes", "vip"],
    );
    for (const value of Object.values(audience.templates)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
    for (const value of Object.values(audience.segments)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("getMetricsOverview returns kpis / funnel / topStaff / highlights", async () => {
    const data = await getMetricsOverview(clinicId);

    expect(data.kpis.leadsThis).toBeGreaterThanOrEqual(0);
    expect(data.kpis.leadsLast).toBeGreaterThanOrEqual(0);
    expect(data.kpis.conversionThis).toBeGreaterThanOrEqual(0);
    expect(data.kpis.conversionThis).toBeLessThanOrEqual(1);
    expect(data.kpis.revenueThis).toBeGreaterThanOrEqual(0);
    expect(data.kpis.ticketAvgThis).toBeGreaterThanOrEqual(0);

    expect(data.funnel.leads).toBeGreaterThanOrEqual(0);
    expect(data.funnel.conversations).toBeGreaterThanOrEqual(0);
    expect(data.funnel.appointments).toBeGreaterThanOrEqual(0);
    expect(data.funnel.sales).toBeGreaterThanOrEqual(0);

    expect(Array.isArray(data.topStaff)).toBe(true);
    expect(data.topStaff.length).toBeLessThanOrEqual(4);
    for (const s of data.topStaff) {
      expect(typeof s.name).toBe("string");
      expect(s.appointments).toBeGreaterThanOrEqual(0);
      expect(s.revenue).toBeGreaterThanOrEqual(0);
    }

    if (data.highlights.peakDow !== null) {
      expect(data.highlights.peakDow).toBeGreaterThanOrEqual(1);
      expect(data.highlights.peakDow).toBeLessThanOrEqual(7);
    }
  });

  it("getHomeDashboard returns stats + nextAppointments + recentConversations", async () => {
    const home = await getHomeDashboard(clinicId);

    expect(home.stats.leadsLast7d).toBeGreaterThanOrEqual(0);
    expect(home.stats.upcomingAppts).toBeGreaterThanOrEqual(0);
    expect(home.stats.revenueLast30d).toBeGreaterThanOrEqual(0);

    expect(Array.isArray(home.nextAppointments)).toBe(true);
    expect(home.nextAppointments.length).toBeLessThanOrEqual(5);
    for (const a of home.nextAppointments) {
      expect(a.treatment.name).toBeTruthy();
      expect(a.technician.name).toBeTruthy();
      expect(a.patient.firstName).toBeTruthy();
    }

    expect(Array.isArray(home.recentConversations)).toBe(true);
    expect(home.recentConversations.length).toBeLessThanOrEqual(5);

    expect(home.aiKpis.conversations).toBeGreaterThanOrEqual(0);
    expect(home.aiKpis.appointmentsCreated).toBeGreaterThanOrEqual(0);
    expect(home.aiKpis.closeRate).toBeGreaterThanOrEqual(0);
    expect(home.aiKpis.closeRate).toBeLessThanOrEqual(1);
  });
});
