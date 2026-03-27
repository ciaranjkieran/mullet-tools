"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForgotPassword } from "@shared/api/hooks/auth/useForgotPassword";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const forgot = useForgotPassword();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await forgot.mutateAsync(email.trim());
    setSent(true);
  }

  return (
    <section className="bg-white min-h-screen">
      <div className="max-w-5xl mx-auto px-6 pt-3 pb-3 text-center">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Mullet logo"
            width={140}
            height={140}
            className="object-contain"
            priority
          />
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900">
          Mullet
        </h1>

        <div className="mt-10 flex justify-center">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-sm p-6 text-left">
            {sent ? (
              <>
                <h2 className="text-xl font-bold text-gray-900">
                  Check your email
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  If an account with that email exists, we've sent a link to
                  reset your password. It may take a minute to arrive.
                </p>
                <Link
                  href="/login"
                  className="mt-6 inline-block text-sm font-medium text-blue-700 hover:text-blue-800 transition"
                >
                  Back to login
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900">
                  Reset your password
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Enter your email and we'll send you a link to reset your
                  password.
                </p>

                <form onSubmit={onSubmit} className="mt-5 space-y-3">
                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    disabled={forgot.isPending}
                  />

                  {forgot.isError && (
                    <p className="text-sm text-red-600">
                      Something went wrong. Please try again.
                    </p>
                  )}

                  <button
                    className="w-full rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                    disabled={forgot.isPending || !email.trim()}
                  >
                    {forgot.isPending ? "Sending..." : "Send reset link"}
                  </button>
                </form>

                <div className="mt-4">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-gray-500 hover:text-gray-800 transition"
                  >
                    &larr; Back to login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
