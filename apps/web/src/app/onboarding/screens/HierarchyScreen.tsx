"use client";

import Image from "next/image";

const BUILDING_BLOCKS = [
  { emoji: "🎯", name: "Goal", description: "the big picture outcome" },
  { emoji: "📁", name: "Project", description: "a defined piece of work" },
  {
    emoji: "🏁",
    name: "Milestone",
    description: "a significant checkpoint",
  },
  { emoji: "✅", name: "Task", description: "the actual work" },
];

export default function HierarchyScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
        Organise as deeply as you need to
      </h1>

      <p className="mt-3 text-lg text-gray-600">
        Inside each Mode you have four flexible building blocks.
      </p>

      <Image
        src="/Images/Hierarchy Image2.png"
        alt="Hierarchy diagram showing Goal, Project, Milestone, and Task"
        width={800}
        height={500}
        className="mt-8 w-full max-w-2xl rounded-xl object-contain"
      />

      {/* Building blocks */}
      <div className="mt-8 w-full max-w-md space-y-3">
        {BUILDING_BLOCKS.map((block) => (
          <div
            key={block.name}
            className="flex items-center gap-4 rounded-xl border border-gray-200 px-5 py-4 text-left"
          >
            <span className="text-2xl">{block.emoji}</span>
            <div>
              <span className="font-semibold text-gray-900">{block.name}</span>
              <span className="text-gray-500"> &mdash; {block.description}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-gray-400 max-w-md">
        You don&apos;t have to use all of these. Most people start with Tasks
        and build from there.
      </p>

      <a
        href="/features#hierarchy"
        className="mt-3 text-sm font-medium text-gray-500 hover:text-gray-800 transition"
      >
        Learn more about the hierarchy &rarr;
      </a>

      <button
        onClick={onNext}
        className="mt-8 rounded-lg bg-gray-900 px-8 py-3 text-base font-semibold text-white hover:bg-gray-800 transition"
      >
        Got it
      </button>
    </div>
  );
}
