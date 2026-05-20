import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type TreatmentSeed = {
  slug: string;
  name: string;
  categorySlug: "facial" | "cejas" | "corporal" | "valoracion";
  durationMinutes: number;
  bufferMinutes?: number;
  price: string | null;
  showPrice: boolean;
  priceType: "FIXED" | "FROM" | "RANGE" | "ON_REQUEST";
  requiresValuation?: boolean;
  complexity?: "LIGHT" | "STANDARD" | "ADVANCED";
  description?: string;
  botMessage?: string;
  keywords: string[];
};

const TREATMENTS: TreatmentSeed[] = [
  {
    slug: "valoracion",
    name: "Valoración inicial",
    categorySlug: "valoracion",
    durationMinutes: 30,
    price: "0.00",
    showPrice: true,
    priceType: "FIXED",
    complexity: "LIGHT",
    description:
      "Consulta inicial con valoración del tratamiento más adecuado para ti.",
    botMessage: "Valoración gratuita para diseñar tu plan personalizado.",
    keywords: ["valoracion", "consulta", "primera visita", "asesoramiento"],
  },
  {
    slug: "limpieza-facial",
    name: "Limpieza facial",
    categorySlug: "facial",
    durationMinutes: 60,
    price: "55.00",
    showPrice: true,
    priceType: "FIXED",
    complexity: "LIGHT",
    description:
      "Limpieza profunda con extracción de impurezas, exfoliación e hidratación.",
    keywords: ["limpieza", "facial", "hidratacion", "puntos negros", "extracciones"],
  },
  {
    slug: "microblading",
    name: "Microblading",
    categorySlug: "cejas",
    durationMinutes: 120,
    price: "290.00",
    showPrice: true,
    priceType: "FROM",
    requiresValuation: true,
    complexity: "ADVANCED",
    description:
      "Técnica semipermanente que dibuja pelo a pelo para un resultado natural.",
    keywords: ["microblading", "cejas", "pigmentacion", "semipermanente"],
  },
  {
    slug: "diseno-cejas",
    name: "Diseño de cejas",
    categorySlug: "cejas",
    durationMinutes: 45,
    price: "25.00",
    showPrice: true,
    priceType: "FIXED",
    complexity: "STANDARD",
    description: "Diseño personalizado, depilación y tintado.",
    keywords: ["cejas", "diseno", "henna", "tinte"],
  },
  {
    slug: "depilacion-hilo",
    name: "Depilación facial con hilo",
    categorySlug: "cejas",
    durationMinutes: 30,
    price: "15.00",
    showPrice: true,
    priceType: "FIXED",
    complexity: "LIGHT",
    description: "Depilación precisa con hilo en cejas, bigote o rostro.",
    keywords: ["hilo", "depilacion", "bigote", "cejas"],
  },
  {
    slug: "dermapen",
    name: "Dermapen",
    categorySlug: "facial",
    durationMinutes: 60,
    price: "120.00",
    showPrice: true,
    priceType: "FIXED",
    requiresValuation: true,
    complexity: "ADVANCED",
    description: "Microneedling para regenerar piel y mejorar cicatrices.",
    keywords: ["dermapen", "microneedling", "rejuvenecimiento", "cicatrices"],
  },
  {
    slug: "radiofrecuencia",
    name: "Radiofrecuencia facial",
    categorySlug: "facial",
    durationMinutes: 45,
    price: "80.00",
    showPrice: true,
    priceType: "FIXED",
    complexity: "STANDARD",
    description: "Reafirmante facial mediante calor controlado.",
    keywords: ["radiofrecuencia", "rf", "firmeza", "lifting"],
  },
  {
    slug: "laser",
    name: "Depilación láser",
    categorySlug: "corporal",
    durationMinutes: 30,
    price: "60.00",
    showPrice: true,
    priceType: "FROM",
    complexity: "STANDARD",
    description: "Depilación láser por zonas. Sesiones progresivas.",
    keywords: ["laser", "depilacion", "diodo"],
  },
];

const BUSINESS_HOURS: { dayOfWeek: number; opensAt: string; closesAt: string }[] = [
  // Monday — full day
  { dayOfWeek: 1, opensAt: "09:30", closesAt: "20:00" },
  // Tue/Wed/Thu — split shifts
  { dayOfWeek: 2, opensAt: "09:30", closesAt: "14:00" },
  { dayOfWeek: 2, opensAt: "16:30", closesAt: "20:00" },
  { dayOfWeek: 3, opensAt: "09:30", closesAt: "14:00" },
  { dayOfWeek: 3, opensAt: "16:30", closesAt: "20:00" },
  { dayOfWeek: 4, opensAt: "09:30", closesAt: "14:00" },
  { dayOfWeek: 4, opensAt: "16:30", closesAt: "20:00" },
  // Friday — full day
  { dayOfWeek: 5, opensAt: "09:30", closesAt: "20:00" },
  // Saturday — morning
  { dayOfWeek: 6, opensAt: "09:30", closesAt: "13:30" },
  // Sunday closed (no row)
];

async function main() {
  console.log("→ Seeding clinic, hours, treatments and technicians…");

  const clinic = await prisma.clinic.upsert({
    where: { slug: "bellem" },
    update: {
      timezone: "Europe/Madrid",
      locale: "es-ES",
      whatsappNumber: "+34911000000",
      minLeadMinutes: 120,
      slotGranularityMin: 30,
    },
    create: {
      name: "Clínica Estética Bellem",
      slug: "bellem",
      timezone: "Europe/Madrid",
      locale: "es-ES",
      whatsappNumber: "+34911000000",
      minLeadMinutes: 120,
      slotGranularityMin: 30,
    },
  });

  await prisma.user.upsert({
    where: { clinicId_email: { clinicId: clinic.id, email: "admin@bellem.demo" } },
    update: {},
    create: {
      clinicId: clinic.id,
      email: "admin@bellem.demo",
      name: "Admin Bellem",
      role: "OWNER",
    },
  });

  await prisma.clinicBusinessHours.deleteMany({ where: { clinicId: clinic.id } });
  for (const h of BUSINESS_HOURS) {
    await prisma.clinicBusinessHours.create({
      data: { clinicId: clinic.id, ...h },
    });
  }

  const categories = {
    valoracion: await prisma.treatmentCategory.upsert({
      where: { clinicId_slug: { clinicId: clinic.id, slug: "valoracion" } },
      update: {},
      create: { clinicId: clinic.id, name: "Valoración", slug: "valoracion", sortOrder: 0 },
    }),
    facial: await prisma.treatmentCategory.upsert({
      where: { clinicId_slug: { clinicId: clinic.id, slug: "facial" } },
      update: {},
      create: { clinicId: clinic.id, name: "Facial", slug: "facial", sortOrder: 1 },
    }),
    cejas: await prisma.treatmentCategory.upsert({
      where: { clinicId_slug: { clinicId: clinic.id, slug: "cejas" } },
      update: {},
      create: { clinicId: clinic.id, name: "Cejas y mirada", slug: "cejas", sortOrder: 2 },
    }),
    corporal: await prisma.treatmentCategory.upsert({
      where: { clinicId_slug: { clinicId: clinic.id, slug: "corporal" } },
      update: {},
      create: { clinicId: clinic.id, name: "Corporal", slug: "corporal", sortOrder: 3 },
    }),
  };

  const treatments: Record<string, { id: string }> = {};
  for (const t of TREATMENTS) {
    const created = await prisma.treatment.upsert({
      where: { clinicId_slug: { clinicId: clinic.id, slug: t.slug } },
      update: {
        name: t.name,
        description: t.description,
        durationMinutes: t.durationMinutes,
        bufferMinutes: t.bufferMinutes ?? 0,
        price: t.price ? new Prisma.Decimal(t.price) : null,
        showPrice: t.showPrice,
        priceType: t.priceType,
        requiresValuation: t.requiresValuation ?? false,
        complexity: t.complexity ?? "STANDARD",
        botMessage: t.botMessage,
        keywords: t.keywords,
        active: true,
      },
      create: {
        clinicId: clinic.id,
        categoryId: categories[t.categorySlug].id,
        slug: t.slug,
        name: t.name,
        description: t.description,
        durationMinutes: t.durationMinutes,
        bufferMinutes: t.bufferMinutes ?? 0,
        price: t.price ? new Prisma.Decimal(t.price) : null,
        showPrice: t.showPrice,
        priceType: t.priceType,
        requiresValuation: t.requiresValuation ?? false,
        complexity: t.complexity ?? "STANDARD",
        botMessage: t.botMessage,
        keywords: t.keywords,
      },
    });
    treatments[t.slug] = created;
  }

  const technicianSeeds = [
    { id: "tech-leo-bellem", name: "Leo", color: "#d97706", prioritySensitive: true },
    { id: "tech-diana-bellem", name: "Diana", color: "#0d9488", prioritySensitive: false },
    { id: "tech-isis-bellem", name: "Isis", color: "#7c3aed", prioritySensitive: false },
  ];

  const technicians: Record<string, { id: string }> = {};
  for (const t of technicianSeeds) {
    technicians[t.name] = await prisma.technician.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        color: t.color,
        prioritySensitive: t.prioritySensitive,
        active: true,
      },
      create: {
        id: t.id,
        clinicId: clinic.id,
        name: t.name,
        color: t.color,
        prioritySensitive: t.prioritySensitive,
      },
    });
  }

  type Mapping = {
    tech: string;
    treat: string;
    isPrimary?: boolean;
    isPreferred?: boolean;
    isExclusive?: boolean;
    isExcluded?: boolean;
    isFallbackOnly?: boolean;
  };

  const mappings: Mapping[] = [
    // Microblading — only Leo
    { tech: "Leo", treat: "microblading", isPrimary: true, isExclusive: true },
    // Dermapen
    { tech: "Leo", treat: "dermapen", isPrimary: true },
    { tech: "Diana", treat: "dermapen" },
    // Limpieza facial — Diana preferred, Isis ok, Leo only as last resort
    { tech: "Diana", treat: "limpieza-facial", isPrimary: true, isPreferred: true },
    { tech: "Isis", treat: "limpieza-facial" },
    { tech: "Leo", treat: "limpieza-facial", isFallbackOnly: true },
    // Diseño de cejas
    { tech: "Diana", treat: "diseno-cejas", isPrimary: true },
    { tech: "Isis", treat: "diseno-cejas" },
    { tech: "Leo", treat: "diseno-cejas", isFallbackOnly: true },
    // Depilación con hilo — Leo explicitly excluded
    { tech: "Isis", treat: "depilacion-hilo", isPrimary: true },
    { tech: "Diana", treat: "depilacion-hilo" },
    { tech: "Leo", treat: "depilacion-hilo", isExcluded: true },
    // Radiofrecuencia
    { tech: "Isis", treat: "radiofrecuencia", isPrimary: true },
    { tech: "Diana", treat: "radiofrecuencia" },
    // Láser
    { tech: "Isis", treat: "laser", isPrimary: true },
    // Valoración inicial — anyone, Diana primary
    { tech: "Diana", treat: "valoracion", isPrimary: true },
    { tech: "Isis", treat: "valoracion" },
    { tech: "Leo", treat: "valoracion", isFallbackOnly: true },
  ];

  for (const m of mappings) {
    const technicianId = technicians[m.tech]?.id;
    const treatmentId = treatments[m.treat]?.id;
    if (!technicianId || !treatmentId) continue;
    await prisma.technicianTreatment.upsert({
      where: { technicianId_treatmentId: { technicianId, treatmentId } },
      update: {
        isPrimary: m.isPrimary ?? false,
        isPreferred: m.isPreferred ?? false,
        isExclusive: m.isExclusive ?? false,
        isExcluded: m.isExcluded ?? false,
        isFallbackOnly: m.isFallbackOnly ?? false,
      },
      create: {
        clinicId: clinic.id,
        technicianId,
        treatmentId,
        isPrimary: m.isPrimary ?? false,
        isPreferred: m.isPreferred ?? false,
        isExclusive: m.isExclusive ?? false,
        isExcluded: m.isExcluded ?? false,
        isFallbackOnly: m.isFallbackOnly ?? false,
      },
    });
  }

  // A couple of demo patients so the dashboard isn't empty in dev
  await prisma.patient.upsert({
    where: { clinicId_phone: { clinicId: clinic.id, phone: "+34622484214" } },
    update: {},
    create: {
      clinicId: clinic.id,
      firstName: "Cliente",
      lastName: "Demo",
      phone: "+34622484214",
      status: "ACTIVE",
      source: "WhatsApp",
    },
  });

  console.log(`✓ Seed complete for clinic: ${clinic.name} (${clinic.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
