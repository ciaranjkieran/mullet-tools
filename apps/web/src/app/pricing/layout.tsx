import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple pricing for Mullet. 30-day free trial, no credit card required. One plan at \u20ac7/month.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
