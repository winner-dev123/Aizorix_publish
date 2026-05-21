import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCampaignAudienceCounts } from "@/server/dashboard/queries";
import { CampaignsView } from "@/components/dashboard/campaigns-view";
import { assertModuleActive } from "@/server/modules/guard";

export const revalidate = 30;

export default async function CampaignsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  await assertModuleActive(session.user.clinicId, "campaigns");

  const audience = await getCampaignAudienceCounts(session.user.clinicId);
  return <CampaignsView audience={audience} />;
}
