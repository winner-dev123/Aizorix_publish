"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInPlatformAdminAction } from "@/server/actions/admin";

export function AdminSignInForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signInPlatformAdminAction({ email, password });
    setPending(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    // The server action set the cookie; refresh to pick it up,
    // then push to the dashboard.
    router.refresh();
    router.push("/admin");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-3xl border border-white/10 bg-[color:var(--color-surface-1)] p-7 shadow-[var(--shadow-lg)]"
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-brand-300)]">
        <ShieldCheck className="h-3.5 w-3.5" />
        Platform admin
      </div>
      <h1 className="text-2xl font-black tracking-tight text-white">
        Inicia sesión
      </h1>
      <p className="text-sm text-white/65">
        Acceso restringido a operadores de Aizorix.
      </p>

      <div className="space-y-3 pt-2">
        <div>
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@aizorix.ai"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="admin-password">Contraseña</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
        Acceder
      </Button>
    </form>
  );
}
