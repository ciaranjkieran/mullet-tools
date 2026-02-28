"use client";

import TrialBanner from "./TrialBanner";
import Paywall from "./Paywall";

export default function RequireSubscription({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TrialBanner />
      <Paywall />
      {children}
    </>
  );
}
