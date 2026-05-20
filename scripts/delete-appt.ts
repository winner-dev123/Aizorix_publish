import { prisma } from "../src/server/db";

async function main() {
  const isoOrId = process.argv[2];
  if (!isoOrId) throw new Error("Usage: tsx scripts/delete-appt.ts <ISO-UTC | appointmentId>");

  const where = isoOrId.includes("T")
    ? { startsAt: new Date(isoOrId) }
    : { id: isoOrId };

  const res = await prisma.appointment.deleteMany({ where });
  console.log(`Deleted ${res.count} appointment(s)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
