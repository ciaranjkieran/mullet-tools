"use client";

import React from "react";
import { Check } from "lucide-react";
import { useMe } from "@shared/api/hooks/auth/useMe";
import { useSubscription } from "@shared/api/hooks/auth/useSubscription";
import { useCreateCheckoutSession } from "@shared/api/hooks/billing/useCreateCheckoutSession";
import { useRouter } from "next/navigation";

const FEATURES = [
  "Tasks",
  "Modes",
  "Milestones",
  "Projects",
  "Goals",
  "Notes",
  "Comments",
  "Boards",
  "Templates",
  "Timer & Stats",
  "AI Builder",
  "Collaboration",
];

export default function PricingClient() {
  const me = useMe();
  const { isActive, isTrialing, subscription } = useSubscription();
  const checkout = useCreateCheckoutSession();
  const router = useRouter();

  const isAuthed = !!me.data;

  function handleCTA() {
    if (!isAuthed) {
      router.push("/login");
      return;
    }
    checkout.mutate();
  }

  let ctaText = "Start free trial";
  if (isAuthed && isTrialing) ctaText = "Subscribe now";
  else if (isAuthed && isActive && subscription?.status === "active")
    ctaText = "You're subscribed";
  else if (isAuthed) ctaText = "Subscribe now";

  const isSubscribed =
    isAuthed && isActive && subscription?.status === "active";

  return (
    <main className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_50%_-10%,rgba(0,0,0,0.06),transparent_60%)]"
      />

      <section className="mx-auto max-w-3xl px-6 py-20">
        <header className="mx-auto max-w-2xl text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
            Simple pricing for focused work
          </h1>
          <p className="mt-6 text-lg text-gray-700">
            30-day free trial. No credit card required.
          </p>
        </header>

        <div className="mt-14 mx-auto max-w-md">
          <div className="relative flex flex-col overflow-hidden rounded-2xl border border-blue-200 bg-white p-8 shadow-md">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(59,130,246,0.12),transparent_70%)]"
            />
            <div className="relative">
              <h3 className="text-xl font-bold text-blue-700">Mullet</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-gray-900">
                  &euro;7
                </span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-700">
                Everything you need to compartmentalize your life with modes.
              </p>

              <div className="my-6 h-px bg-gray-200/70" />

              <ul className="space-y-2 text-sm text-gray-700">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="rounded-md border border-blue-200 bg-blue-50 p-1 text-blue-700">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-gray-900">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={handleCTA}
                disabled={checkout.isPending || isSubscribed}
                className="mt-8 w-full rounded-lg bg-blue-700 px-6 py-3 text-base font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50"
              >
                {checkout.isPending ? "Loading..." : ctaText}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
