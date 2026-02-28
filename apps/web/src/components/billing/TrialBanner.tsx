"use client";

import { useSubscription } from "@shared/api/hooks/auth/useSubscription";
import { useCreateCheckoutSession } from "@shared/api/hooks/billing/useCreateCheckoutSession";

export default function TrialBanner() {
  const { isTrialing, trialDaysRemaining, isActive } = useSubscription();
  const checkout = useCreateCheckoutSession();

  if (!isTrialing || !isActive) return null;

  const urgency = trialDaysRemaining <= 3;

  return (
    <div
      className={[
        "w-full px-4 py-2 text-center text-sm font-medium",
        urgency
          ? "bg-orange-50 text-orange-800 border-b border-orange-200"
          : "bg-blue-50 text-blue-800 border-b border-blue-200",
      ].join(" ")}
    >
      <span>
        {trialDaysRemaining === 0
          ? "Your free trial ends today."
          : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left in your free trial.`}
      </span>
      <button
        onClick={() => checkout.mutate()}
        disabled={checkout.isPending}
        className={[
          "ml-3 inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold text-white transition",
          urgency
            ? "bg-orange-600 hover:bg-orange-700"
            : "bg-blue-600 hover:bg-blue-700",
          "disabled:opacity-50",
        ].join(" ")}
      >
        {checkout.isPending ? "Loading..." : "Subscribe now"}
      </button>
    </div>
  );
}
