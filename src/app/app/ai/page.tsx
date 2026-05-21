import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { AiDemo, type DemoTreatment } from "@/components/dashboard/ai-demo";
import { assertModuleActive } from "@/server/modules/guard";

export const revalidate = 60;

export default async function AIReceptionistPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const clinicId = session.user.clinicId;
  await assertModuleActive(clinicId, "ai-demo");

  const [clinic, treatments] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    prisma.treatment.findMany({
      where: { clinicId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        durationMinutes: true,
        price: true,
        botMessage: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!clinic) redirect("/signin");

  const demoTreatments: DemoTreatment[] = treatments.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    durationMinutes: t.durationMinutes,
    price: t.price ? Number(t.price) : null,
    botMessage: t.botMessage,
  }));

  return <AiDemo clinicName={clinic.name} treatments={demoTreatments} />;
}
