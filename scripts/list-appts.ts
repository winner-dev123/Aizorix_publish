import { prisma } from "../src/server/db";

async function main() {
  const date = process.argv[2] ?? "2026-05-26";
  const from = new Date(`${date}T00:00:00Z`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

  const appts = await prisma.appointment.findMany({
    where: { startsAt: { gte: from, lt: to } },
    select: {
      id: true,
      technicianId: true,
      treatmentId: true,
      patientId: true,
      startsAt: true,
      endsAt: true,
      status: true,
    },
    orderBy: { startsAt: "asc" },
  });
  console.log(`Appointments on ${date}: ${appts.length}`);
  console.log(JSON.stringify(appts, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
