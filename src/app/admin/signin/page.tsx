import { redirect } from "next/navigation";
import { AdminSignInForm } from "@/components/admin/signin-form";
import { getPlatformAdmin } from "@/server/admin/auth";

export const revalidate = 0;

/**
 * Public sign-in page for platform admins. NOT covered by the
 * /admin layout's auth gate (the gate is what redirects HERE), and
 * it bypasses the clinic-user auth flow entirely.
 *
 * Already-signed-in admins get bounced straight to /admin.
 */
export default async function AdminSignInPage() {
  const existing = await getPlatformAdmin();
  if (existing) redirect("/admin");

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[color:var(--color-background)] px-4 py-10">
      {/* violet aurora */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 40% at 15% 10%, rgba(139,92,246,0.30) 0%, transparent 60%), radial-gradient(45% 35% at 90% 90%, rgba(56,189,248,0.18) 0%, transparent 60%)",
        }}
      />
      <div className="w-full max-w-md">
        <AdminSignInForm />
      </div>
    </div>
  );
}
