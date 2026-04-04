"use client";

import Image from "next/image";

const FEATURES = [
  {
    emoji: "📝",
    name: "Notes",
    description: "A distraction-free space for writing inside any element",
  },
  {
    emoji: "💬",
    name: "Comments",
    description: "Keep context attached to your work",
  },
  {
    emoji: "🗂️",
    name: "Boards",
    description: "A visual space for images, files, and references",
  },
  {
    emoji: "⏱️",
    name: "Timer",
    description: "A focused work timer built into your workflow",
  },
];

export default function FeaturesScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
        Everything you need, built in
      </h1>

      <p className="mt-3 text-lg text-gray-600">
        Mullet comes with a set of tools that live inside any element.
      </p>

      {/* Feature icons */}
      <div className="mt-8 grid grid-cols-4 gap-6 w-full max-w-sm">
        <div className="flex flex-col items-center gap-1.5">
          <Image src="/Images/Notes Img.png" alt="Notes" width={56} height={56} className="object-contain" />
          <span className="text-xs text-gray-500 font-medium">Notes</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Image src="/Images/Comments Img.png" alt="Comments" width={56} height={56} className="object-contain" />
          <span className="text-xs text-gray-500 font-medium">Comments</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Image src="/Images/Boards Img.png" alt="Boards" width={56} height={56} className="object-contain" />
          <span className="text-xs text-gray-500 font-medium">Boards</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Image src="/Images/Timer Img.png" alt="Timer" width={56} height={56} className="object-contain" />
          <span className="text-xs text-gray-500 font-medium">Timer</span>
        </div>
      </div>

      {/* Feature grid */}
      <div className="mt-8 w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map((feature) => (
          <div
            key={feature.name}
            className="flex items-start gap-3 rounded-xl border border-gray-200 px-5 py-4 text-left"
          >
            <span className="text-2xl shrink-0">{feature.emoji}</span>
            <div>
              <p className="font-semibold text-gray-900">{feature.name}</p>
              <p className="mt-0.5 text-sm text-gray-500">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <a
        href="/features#features"
        className="mt-6 text-sm font-medium text-gray-500 hover:text-gray-800 transition"
      >
        Learn more about features &rarr;
      </a>

      <button
        onClick={onNext}
        className="mt-8 rounded-lg bg-gray-900 px-8 py-3 text-base font-semibold text-white hover:bg-gray-800 transition"
      >
        Next
      </button>
    </div>
  );
}
