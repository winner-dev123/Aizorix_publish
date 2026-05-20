import { prisma } from "../src/server/db";

async function main() {
  const phone = process.argv[2];
  if (!phone) throw new Error("Usage: tsx scripts/reset-phone.ts <phoneE164>");

  const patient = await prisma.patient.findFirst({ where: { phone } });
  if (patient) {
    await prisma.appointment.deleteMany({ where: { patientId: patient.id } });
    await prisma.aiMemory.deleteMany({ where: { patientId: patient.id } });
  }
  await prisma.message.deleteMany({
    where: { conversation: { externalChatId: phone } },
  });
  await prisma.conversation.deleteMany({ where: { externalChatId: phone } });
  if (patient) await prisma.patient.delete({ where: { id: patient.id } });
  console.log(`Reset state for ${phone}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
