import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ email?: string; error?: string; sent?: string }>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (session?.user) redirect("/app");

  const { error, sent } = await searchParams;

  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) return;
    await signIn("nodemailer", { email, redirectTo: "/app" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-surface-2)] p-6">
      <div className="w-full max-w-sm rounded-3xl border border-[color:var(--color-ink-100)] bg-white p-8 shadow-[var(--shadow-md)]">
        <h1 className="text-2xl font-black text-[color:var(--color-ink-900)]">Aizorix</h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-500)]">
          Accede con tu correo. Te enviaremos un enlace de un solo uso.
        </p>

        {sent && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Si tu correo está registrado, recibirás un enlace en breve. Revisa también la consola
            del servidor en desarrollo.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            No hemos podido enviar el enlace. Comprueba que tu correo esté registrado por la
            clínica.
          </p>
        )}

        <form action={action} className="mt-6 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-ink-500)]">
            Correo
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="tu@clinica.com"
              className="mt-1 block w-full rounded-xl border border-[color:var(--color-ink-200)] bg-white px-3 py-2 text-sm font-medium text-[color:var(--color-ink-900)] outline-none focus:border-[color:var(--color-brand-500)]"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-[color:var(--color-brand-500)] px-3 py-2 text-sm font-bold text-white shadow-[var(--shadow-sm)] transition hover:opacity-90"
          >
            Enviar enlace
          </button>
        </form>
      </div>
    </div>
  );
}
