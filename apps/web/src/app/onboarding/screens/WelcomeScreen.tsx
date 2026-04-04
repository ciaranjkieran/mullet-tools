"use client";

import Image from "next/image";

export default function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src="/logo.png"
        alt="Mullet logo"
        width={120}
        height={120}
        className="object-contain"
        priority
      />

      <h1 className="mt-6 text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
        Welcome to Mullet
      </h1>

      <p className="mt-4 text-xl text-gray-600">
        Everything in your life deserves its own space.
      </p>

      <p className="mt-2 text-base text-gray-500">
        Let&apos;s get you set up in a few quick steps.
      </p>

      <button
        onClick={onNext}
        className="mt-10 rounded-lg bg-gray-900 px-8 py-3 text-base font-semibold text-white hover:bg-gray-800 transition"
      >
        Get Started
      </button>
    </div>
  );
}
