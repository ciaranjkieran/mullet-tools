"use client";

import React from "react";
import { Check } from "lucide-react";

type TierKey = "TrimCut" | "FullBodied" | "LionsMane";

const TIERS: Record<
  TierKey,
  {
    name: string;
    price: string;
    blurb: string;
    features: string[];
    tone: "neutral" | "purple" | "orange";
    emphasized?: boolean; // for Lion's Mane "bold"
  }
> = {
  TrimCut: {
    name: "Trim Cut",
    price: "Free",
    blurb: "Start with Modes and Tasks—the foundation of calm execution.",
    features: ["Tasks", "Modes"],
    tone: "neutral",
  },
  FullBodied: {
    name: "Full Bodied",
    price: "€5/mo",
    blurb:
      "Structure real work: milestones, projects, goals—and rich context tools.",
    features: [
      "Tasks",
      "Modes",
      "Milestones",
      "Projects",
      "Goals",
      "Notes",
      "Comments",
      "Boards",
      "Templates",
    ],
    tone: "purple",
  },
  LionsMane: {
    name: "Lion’s Mane",
    price: "€7/mo",
    blurb:
      "Everything in Full Bodied plus Timer & Stats for honest, mode-aware insight.",
    features: [
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
    ],
    tone: "orange",
    emphasized: true,
  },
};

export default function PricingClient() {
  return (
    <main className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_50%_-10%,rgba(0,0,0,0.06),transparent_60%)]"
      />

      <section className="mx-auto max-w-6xl px-6 py-20">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Simple pricing for focused work
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-700">
            Start free. Upgrade when you’re ready.
          </p>
        </header>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {Object.values(TIERS).map((tier) => (
            <PricingCard key={tier.name} {...tier} />
          ))}
        </div>
      </section>
    </main>
  );
}

/* UI bits */

function PricingCard({
  name,
  price,
  blurb,
  features,
  tone,
  emphasized,
}: {
  name: string;
  price: string;
  blurb: string;
  features: string[];
  tone: "neutral" | "purple" | "orange";
  emphasized?: boolean;
}) {
  const toneClasses =
    tone === "purple"
      ? {
          ring: "border-purple-200",
          header: "text-purple-700",
          price: "text-gray-900",
          chip: "bg-purple-50 text-purple-800 border-purple-200",
          checkWrap: "border-purple-200 bg-purple-50 text-purple-700",
          glow: "bg-[radial-gradient(60%_60%_at_50%_0%,rgba(168,85,247,0.16),transparent_70%)]",
        }
      : tone === "orange"
      ? {
          ring: "border-orange-200",
          header: "text-orange-700",
          price: "text-gray-900",
          chip: "bg-orange-50 text-orange-800 border-orange-200",
          checkWrap: "border-orange-200 bg-orange-50 text-orange-700",
          glow: "bg-[radial-gradient(60%_60%_at_50%_0%,rgba(249,115,22,0.18),transparent_70%)]",
        }
      : {
          ring: "border-gray-200",
          header: "text-gray-900",
          price: "text-gray-900",
          chip: "bg-gray-50 text-gray-800 border-gray-200",
          checkWrap: "border-gray-200 bg-white text-gray-800",
          glow: "bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,0,0,0.05),transparent_70%)]",
        };

  return (
    <div
      className={[
        "relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 shadow-sm",
        toneClasses.ring,
        emphasized ? "shadow-md" : "",
      ].join(" ")}
    >
      {/* subtle top glow */}
      <div
        aria-hidden
        className={[
          "pointer-events-none absolute inset-0",
          toneClasses.glow,
        ].join(" ")}
      />

      <div className="relative">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            className={[
              "text-xl tracking-tight",
              emphasized ? "font-extrabold" : "font-semibold",
              toneClasses.header,
            ].join(" ")}
          >
            {name}
          </h3>
        </div>

        <div
          className={[
            "mt-2 text-3xl font-extrabold tracking-tight",
            toneClasses.price,
          ].join(" ")}
        >
          {price}
        </div>

        <p className="mt-2 text-sm text-gray-700">{blurb}</p>

        <div className="my-6 h-px bg-gray-200/70" />

        <ul className="space-y-2 text-sm text-gray-700">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span
                className={[
                  "rounded-md border p-1",
                  toneClasses.checkWrap,
                ].join(" ")}
              >
                <Check className="h-4 w-4" />
              </span>
              <span className={emphasized ? "font-semibold text-gray-900" : ""}>
                {f}
              </span>
            </li>
          ))}
        </ul>

        {/* removed buttons */}
      </div>
    </div>
  );
}
