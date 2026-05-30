import { redirect } from "next/navigation";

// First step of the 5-step flow — "Tu negocio".
export default function OnboardingIndex() {
  redirect("/onboarding/negocio");
}
