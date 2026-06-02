import { redirect } from "next/navigation";

// First step of the 6-step flow — "Elige tu modo".
export default function OnboardingIndex() {
  redirect("/onboarding/modo");
}
