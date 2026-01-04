"use client";

import Link from "next/link";
import Image from "next/image";

export default function LandingHero() {
  return (
    <section className="bg-white">
      <div className="max-w-5xl mx-auto px-6 pt-3 pb-3 text-center">
        {/* Large central logo */}
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Mullet logo"
            width={200}
            height={200}
            className="object-contain"
            priority
          />
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900">
          Mullet
        </h1>

        <p className="mt-2 text-xl text-gray-600">
          Your productivity, with a fresh cut.
        </p>

        <p className="mt-10 text-lg md:text-2xl text-gray-800 max-w-2xl mx-auto">
          A versatile system for organizing life stuff — one that suits you.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white hover:bg-blue-800 transition"
          >
            Log in / Sign up
          </Link>
        </div>

        <div className="mt-6">
          <Link
            href="/features"
            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition"
          >
            How it works
          </Link>
        </div>
      </div>
    </section>
  );
}
