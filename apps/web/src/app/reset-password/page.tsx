"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useResetPassword } from "@shared/api/hooks/auth/useResetPassword";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const reset = useResetPassword();

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 8;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || password !== confirm || tooShort) return;
    try {
      await reset.mutateAsync({ uid, token, password });
      setDone(true);
    } catch {
      // error shown via reset.isError
    }
  }

  const invalid = !uid || !token;

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
            {invalid ? (
              <>
                <h2 className="text-xl font-bold text-gray-900">
                  Invalid reset link
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  This password reset link is invalid or has expired. Please
                  request a new one.
                </p>
                <Link
                  href="/forgot-password"
                  className="mt-4 inline-block text-sm font-medium text-blue-700 hover:text-blue-800 transition"
                >
                  Request new link
                </Link>
              </>
            ) : done ? (
              <>
                <h2 className="text-xl font-bold text-gray-900">
                  Password reset
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Your password has been updated. You can now log in with your
                  new password.
                </p>
                <Link
                  href="/login"
                  className="mt-4 inline-block rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-800"
                >
                  Log in
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900">
                  Set new password
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Enter your new password below.
                </p>

                <form onSubmit={onSubmit} className="mt-5 space-y-3">
                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="New password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={reset.isPending}
                  />

                  <input
                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Confirm password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    disabled={reset.isPending}
                  />

                  {tooShort && (
                    <p className="text-sm text-amber-600">
                      Password must be at least 8 characters.
                    </p>
                  )}

                  {mismatch && (
                    <p className="text-sm text-red-600">
                      Passwords don't match.
                    </p>
                  )}

                  {reset.isError && (
                    <p className="text-sm text-red-600">
                      {(reset.error as any)?.response?.data?.detail ??
                        "Invalid or expired reset link."}
                    </p>
                  )}

                  <button
                    className="w-full rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                    disabled={
                      reset.isPending ||
                      !password ||
                      password !== confirm ||
                      tooShort
                    }
                  >
                    {reset.isPending ? "Resetting..." : "Reset password"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
