import { redirect } from "next/navigation";
import { prisma } from "../db";
import { isKnownModule, type ModuleKey } from "../actions/module-catalogue";

/**
 * Page-level gate for a feature module. Call at the top of any
 * `/app/<module-route>/page.tsx` after the session check. If the calling
 * clinic doesn't have the module enabled, redirects them to
 * `/app/settings/modulos` so they can see the toggle that controls it.
 *
 * Costs one Prisma query per render — acceptable; the pages that use
 * this already make several queries anyway. If the layout could pass
 * activeModules down to children we'd skip it, but App Router renders
 * layouts and pages independently.
 */
export async function assertModuleActive(clinicId: string, key: ModuleKey): Promise<void> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { activeModules: true },
  });
  if (!clinic) {
    redirect("/signin");
    return; // unreachable in prod (Next.js redirect throws) but keeps TS happy + tests sane
  }
  const active = clinic.activeModules.filter(isKnownModule);
  if (!active.includes(key)) {
    // Pass the disabled key so the settings page can explain WHY the user
    // landed there (banner above the form).
    redirect(`/app/settings/modulos?disabled=${encodeURIComponent(key)}`);
  }
}
