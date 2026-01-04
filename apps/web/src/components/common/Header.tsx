"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useMe } from "@shared/api/hooks/auth/useMe";
import { useLogout } from "@shared/api/hooks/auth/useLogout";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const me = useMe();
  const logout = useLogout();

  const isAuthed = !!me.data; // ✅ simple + reliable

  async function handleLogout() {
    try {
      await logout.mutateAsync();
      setIsOpen(false);

      router.replace("/login");
      router.refresh(); // ✅ makes nav/layout reflect new auth state immediately
    } catch {
      // optional toast
    }
  }

  return (
    <header className="navbar bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center space-x-2 text-2xl font-bold tracking-tight text-gray-900"
          onClick={() => setIsOpen(false)}
        >
          <span className="leading-none">Mullet</span>
        </Link>

        <nav className="hidden md:flex space-x-6 text-sm font-medium text-gray-700">
          {isAuthed ? (
            <>
              <Link
                href="/dashboard"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/features"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                How it works
              </Link>
              <Link
                href="/pricing"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>

              <button
                onClick={handleLogout}
                className="hover:text-black transition"
                disabled={logout.isPending}
              >
                {logout.isPending ? "Logging out…" : "Log out"}
              </button>
            </>
          ) : (
            <>
              <Link href="/features" className="hover:text-black transition">
                How it works
              </Link>
              <Link href="/pricing" className="hover:text-black transition">
                Pricing
              </Link>
              <Link href="/about" className="hover:text-black transition">
                About
              </Link>
              <Link href="/contact" className="hover:text-black transition">
                Contact
              </Link>

              <Link href="/login" className="hover:text-blue transition">
                Log in / Sign up
              </Link>
            </>
          )}
        </nav>

        <button
          className="md:hidden focus:outline-none"
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6 text-gray-800"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden px-4 pb-4 space-y-2 text-sm font-medium text-gray-700">
          {isAuthed ? (
            <>
              <Link
                href="/dashboard"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/features"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                How it works
              </Link>
              <Link
                href="/pricing"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>

              <button
                onClick={handleLogout}
                className="block text-left w-full"
                disabled={logout.isPending}
              >
                {logout.isPending ? "Logging out…" : "Log out"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/features"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                How it works
              </Link>
              <Link
                href="/pricing"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </Link>
              <Link
                href="/login"
                className="block"
                onClick={() => setIsOpen(false)}
              >
                Log in / Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
