import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { auth } from "@/auth";
import { getStaffList } from "@/server/dashboard/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffList, type StaffRow } from "@/components/dashboard/staff-list";

export const revalidate = 30;

export default async function StaffSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    redirect("/app/settings");
  }

  const rows: StaffRow[] = await getStaffList(session.user.clinicId);

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
            <Users className="h-4 w-4 text-[color:var(--color-brand-500)]" />
            Empleados y permisos
          </CardTitle>
          <p className="text-sm text-[color:var(--color-ink-500)]">
            Invita personal nuevo y gestiona sus permisos. Las cuentas se crean activas y reciben
            un enlace de acceso por email. Desactivar a alguien le impide volver a iniciar sesión
            (su sesión actual sigue válida hasta que expire el token JWT).
          </p>
        </CardHeader>
        <CardContent>
          <StaffList
            initialRows={rows}
            currentUserId={session.user.id}
            currentUserRole={session.user.role}
          />
        </CardContent>
      </Card>
    </div>
  );
}
