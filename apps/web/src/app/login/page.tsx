"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLogin } from "@shared/api/hooks/auth/useLogin";
import { useRegister } from "@shared/api/hooks/auth/useRegister";

type Mode = "login" | "signup";

type ApiError = {
  response?: {
    data?: {
      detail?: string;
      non_field_errors?: string[];
    };
  };
};

function getErrorDetail(err: unknown): string {
  const e = err as ApiError;

  return (
    e?.response?.data?.detail ??
    e?.response?.data?.non_field_errors?.[0] ??
    "Something went wrong"
  );
}

export default function LoginSignupPage() {
  const router = useRouter();
  const login = useLogin();
  const register = useRegister();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const busy = login.isPending || register.isPending;

  const error = useMemo(() => {
    if (login.isError) return getErrorDetail(login.error);
    if (register.isError) return getErrorDetail(register.error);
    return null;
  }, [login.isError, login.error, register.isError, register.error]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (mode === "login") {
        await login.mutateAsync({ email, password });
      } else {
        await register.mutateAsync({ email, password });
      }
      router.push("/dashboard");
    } catch {
      // errors shown via `error`
    }
  }

  return (
    <section className="bg-white min-h-screen">
      <div className="max-w-5xl mx-auto px-6 pt-3 pb-3 text-center">
        {/* Logo */}
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

        <p className="mt-2 text-xl text-gray-600">
          Your productivity, with a fresh cut.
        </p>

        {/* Auth card */}
        <div className="mt-10 flex justify-center">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-sm p-6 text-left">
            {/* Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={[
                  "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition",
                  mode === "login"
                    ? "bg-white shadow text-gray-900"
                    : "text-gray-600 hover:text-gray-900",
                ].join(" ")}
                disabled={busy}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={[
                  "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition",
                  mode === "signup"
                    ? "bg-white shadow text-gray-900"
                    : "text-gray-600 hover:text-gray-900",
                ].join(" ")}
                disabled={busy}
              >
                Sign up
              </button>
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-900">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              {mode === "login" ? "Log in to continue." : "Sign up to start."}
            </p>

            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              <input
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                disabled={busy}
              />

              <input
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                disabled={busy}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                className={[
                  "w-full rounded-md px-6 py-3 text-base font-semibold text-white transition disabled:opacity-60",
                  mode === "login"
                    ? "bg-blue-700 hover:bg-blue-800"
                    : "bg-purple-600 hover:bg-purple-700",
                ].join(" ")}
                disabled={busy}
              >
                {busy
                  ? mode === "login"
                    ? "Logging in..."
                    : "Creating account..."
                  : mode === "login"
                  ? "Log in"
                  : "Sign up"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between">
              <Link
                href="/"
                className="text-sm font-medium text-gray-500 hover:text-gray-800 transition"
              >
                ← Back to home
              </Link>

              <Link
                href="/features"
                className="text-sm font-medium text-gray-500 hover:text-gray-800 transition"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
