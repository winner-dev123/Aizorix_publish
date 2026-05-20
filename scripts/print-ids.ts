import { prisma } from "../src/server/db";

async function main() {
  const clinic = await prisma.clinic.findUnique({
    where: { slug: process.env.CLINIC_SLUG ?? "bellem" },
  });
  if (!clinic) throw new Error("Clinic not found — did you run `npm run db:seed`?");

  const [treatments, technicians, patient] = await Promise.all([
    prisma.treatment.findMany({
      where: { clinicId: clinic.id },
      select: { slug: true, id: true, name: true, durationMinutes: true },
      orderBy: { name: "asc" },
    }),
    prisma.technician.findMany({
      where: { clinicId: clinic.id },
      select: { id: true, name: true, prioritySensitive: true },
      orderBy: { name: "asc" },
    }),
    prisma.patient.findFirst({ where: { clinicId: clinic.id } }),
  ]);

  console.log(JSON.stringify({ clinicId: clinic.id, treatments, technicians, patientId: patient?.id }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
