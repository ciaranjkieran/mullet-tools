export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Get Started" };

import RequireAuth from "@/components/auth/RequireAuth";
import OnboardingFlow from "./OnboardingFlow";

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <OnboardingFlow />
    </RequireAuth>
  );
}
