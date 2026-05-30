import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { getClinicOverview } from "@/server/dashboard/queries";
import { isKnownModule, type ModuleKey } from "@/server/actions/module-catalogue";
import { CrmSidebar } from "@/components/crm/sidebar";
import { CrmTopbar } from "@/components/crm/topbar";
import { getTheme } from "@/lib/theme";

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
  // Filter the raw activeModules array against the catalogue so a stale
  // string key from a deleted module doesn't get passed to the client.
  const activeModules: ModuleKey[] = (overview?.clinic.activeModules ?? []).filter(isKnownModule);
  const theme = await getTheme();

  return (
    <div className="relative flex min-h-screen flex-1 bg-[color:var(--color-surface-2)] dark:bg-[color:var(--color-background)]">
      {/* Light-mode aurora — pastel yellow/lavender/sky glows. Hidden in
          dark mode (it would muddy the deep purple); a violet aurora is
          rendered below instead. */}
      <span
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 dark:hidden"
        style={{
          background:
            "radial-gradient(55% 35% at 100% 0%, rgba(255,226,131,0.30) 0%, transparent 60%), radial-gradient(50% 35% at 0% 100%, rgba(214,205,255,0.30) 0%, transparent 60%), radial-gradient(40% 30% at 50% 50%, rgba(217,236,255,0.25) 0%, transparent 60%)",
        }}
      />
      {/* Dark-mode aurora — soft violet + cyan glows that read on deep
          eggplant purple without washing it out. */}
      <span
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 hidden dark:block"
        style={{
          background:
            "radial-gradient(55% 40% at 100% 0%, rgba(139,92,246,0.25) 0%, transparent 60%), radial-gradient(50% 35% at 0% 100%, rgba(56,189,248,0.18) 0%, transparent 60%), radial-gradient(40% 30% at 50% 50%, rgba(167,139,250,0.15) 0%, transparent 60%)",
        }}
      />
      <CrmSidebar
        needsAttentionCount={needsAttentionCount}
        clinicName={clinicName}
        treatmentCount={overview?.treatmentCount ?? 0}
        userCount={overview?.userCount ?? 0}
        technicianCount={overview?.technicianCount ?? 0}
        activeModules={clinicId ? activeModules : undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <CrmTopbar
          clinicName={clinicName}
          userRole={userRole}
          userLabel={userLabel}
          theme={theme}
        />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
