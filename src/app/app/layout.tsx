import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { getClinicOverview } from "@/server/dashboard/queries";
import { CrmSidebar } from "@/components/crm/sidebar";
import { CrmTopbar } from "@/components/crm/topbar";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const clinicId = session?.user?.clinicId;

  // Proxy gates /app/*; if the proxy ever skips, page components also
  // redirect. We bail to neutral defaults when there's no clinic to scope.
  const overview = clinicId ? await getClinicOverview(clinicId) : null;
  const needsAttentionCount = clinicId
    ? await prisma.conversation.count({
        where: { clinicId, requiresHuman: true, channel: "WHATSAPP" },
      })
    : 0;

  const clinicName = overview?.clinic.name ?? "Aizorix";
  const userRole = session?.user?.role ?? "STAFF";
  const userLabel = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <div className="relative flex min-h-screen flex-1 bg-[color:var(--color-surface-2)]">
      <span
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 35% at 100% 0%, rgba(255,226,131,0.30) 0%, transparent 60%), radial-gradient(50% 35% at 0% 100%, rgba(214,205,255,0.30) 0%, transparent 60%), radial-gradient(40% 30% at 50% 50%, rgba(217,236,255,0.25) 0%, transparent 60%)",
        }}
      />
      <CrmSidebar
        needsAttentionCount={needsAttentionCount}
        clinicName={clinicName}
        treatmentCount={overview?.treatmentCount ?? 0}
        userCount={overview?.userCount ?? 0}
        technicianCount={overview?.technicianCount ?? 0}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <CrmTopbar clinicName={clinicName} userRole={userRole} userLabel={userLabel} />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
