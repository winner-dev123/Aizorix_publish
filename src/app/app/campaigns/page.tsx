import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCampaignAudienceCounts } from "@/server/dashboard/queries";
import { CampaignsView } from "@/components/dashboard/campaigns-view";

export const revalidate = 30;

export default async function CampaignsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const audience = await getCampaignAudienceCounts(session.user.clinicId);
  return <CampaignsView audience={audience} />;
}
