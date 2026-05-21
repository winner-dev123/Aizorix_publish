import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiConfigForm } from "@/components/dashboard/ai-config-form";

export const revalidate = 30;

export default async function AiSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    redirect("/app/settings");
  }

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { aiTone: true, aiGuidance: true },
  });
  if (!clinic) redirect("/signin");

  return (
    <div className="space-y-6">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)]"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a configuración
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[color:var(--color-brand-500)]" />
            IA Recepcionista
          </CardTitle>
          <p className="text-sm text-[color:var(--color-ink-500)]">
            Controla cómo se comporta el bot al hablar con tus pacientes. Los cambios afectan
            inmediatamente a los nuevos mensajes — las conversaciones ya en curso seguirán con el
            tono anterior hasta el siguiente turno.
          </p>
        </CardHeader>
        <CardContent>
          <AiConfigForm defaults={{ aiTone: clinic.aiTone, aiGuidance: clinic.aiGuidance }} />
        </CardContent>
      </Card>
    </div>
  );
}
