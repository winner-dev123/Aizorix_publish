"use client";

import { useOnboarding } from "@/lib/store/onboarding-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepNav } from "@/components/onboarding/step-nav";

export function StepBusiness() {
  const business = useOnboarding((s) => s.business);
  const setBusiness = useOnboarding((s) => s.setBusiness);

  const canContinue = !!business.name && !!business.email && !!business.phone;

  return (
    <div className="flex flex-col gap-7">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nombre comercial *">
          <Input
            placeholder="Ej. Vanity Center"
            value={business.name}
            onChange={(e) => setBusiness({ name: e.target.value })}
          />
        </Field>
        <Field label="Email de contacto *">
          <Input
            type="email"
            placeholder="hola@vanitycenter.com"
            value={business.email}
            onChange={(e) => setBusiness({ email: e.target.value })}
          />
        </Field>
        <Field label="Teléfono / WhatsApp *">
          <Input
            placeholder="+34 600 000 000"
            value={business.phone}
            onChange={(e) => setBusiness({ phone: e.target.value })}
          />
        </Field>
        <Field label="Web">
          <Input
            placeholder="https://vanitycenter.com"
            value={business.website}
            onChange={(e) => setBusiness({ website: e.target.value })}
          />
        </Field>
        <Field label="Dirección principal" className="md:col-span-2">
          <Input
            placeholder="Calle, número, ciudad, código postal"
            value={business.address}
            onChange={(e) => setBusiness({ address: e.target.value })}
          />
        </Field>
        <Field label="Instagram">
          <Input
            placeholder="@vanitycenter"
            value={business.instagram}
            onChange={(e) => setBusiness({ instagram: e.target.value })}
          />
        </Field>
        <Field label="Facebook">
          <Input
            placeholder="Página de Facebook"
            value={business.facebook}
            onChange={(e) => setBusiness({ facebook: e.target.value })}
          />
        </Field>
      </div>

      <StepNav current={2} canContinue={canContinue} />
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
