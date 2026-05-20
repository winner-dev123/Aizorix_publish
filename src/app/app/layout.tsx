import { CrmSidebar } from "@/components/crm/sidebar";
import { CrmTopbar } from "@/components/crm/topbar";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <CrmSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <CrmTopbar />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
