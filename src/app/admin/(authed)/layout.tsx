import { requirePlatformAdmin } from "@/server/admin/auth";
import { AdminSidebar } from "@/components/admin/sidebar";

/**
 * Gated shell for every authenticated platform-admin route.
 *
 * Route-group layout: `(authed)` is a Next.js route group — it shows up
 * in the file tree to give us a layout boundary, but the parens are
 * stripped from the URL. So `/admin/(authed)/page.tsx` serves `/admin`,
 * `/admin/(authed)/patients/page.tsx` serves `/admin/patients`, etc.
 *
 * The sibling `/admin/signin/page.tsx` lives OUTSIDE this group on
 * purpose, so it isn't covered by `requirePlatformAdmin()` and can be
 * the redirect target without creating a loop.
 */
export default async function AdminAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePlatformAdmin();
  return (
    <div className="flex min-h-screen bg-[color:var(--color-background)] text-white">
      <AdminSidebar adminEmail={admin.email} adminName={admin.name} />
      <main className="flex-1 overflow-x-hidden px-6 py-8 md:px-10">
        {children}
      </main>
    </div>
  );
}
