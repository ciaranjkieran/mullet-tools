"use client";

import { useState } from "react";
import { Mail, User, MessageSquare, Send, Phone } from "lucide-react";

export default function ContactClient() {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    message?: string;
  }>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    setErrors({});

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      topic: String(form.get("topic") || "General"),
      message: String(form.get("message") || "").trim(),
    };

    // minimal validation
    const nextErrors: typeof errors = {};
    if (!payload.name) nextErrors.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(payload.email))
      nextErrors.email = "Enter a valid email.";
    if (!payload.message) nextErrors.message = "Say hello with a message.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      setStatus("submitting");
      // TODO: wire this to your API route (e.g., /api/contact) or email service
      // const res = await fetch("/api/contact", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
      // if (!res.ok) throw new Error("Failed");
      await new Promise((r) => setTimeout(r, 600)); // demo latency
      setStatus("success");
      (e.currentTarget as HTMLFormElement).reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="relative">
      {/* subtle backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_50%_-10%,rgba(0,0,0,0.05),transparent_60%)]"
      />
      <section className="mx-auto max-w-4xl px-6 py-20">
        {/* Hero */}
        <header className="mx-auto max-w-2xl text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
            Get in touch
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-700">
            Questions, feedback, or just curious about Mullet? We’d love to hear
            from you.
          </p>
        </header>

        {/* Card */}
        <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800">
                Name
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 focus-within:border-gray-400">
                <User className="h-4 w-4 text-gray-500" />
                <input
                  name="name"
                  type="text"
                  placeholder="Your name"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800">
                Email
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 focus-within:border-gray-400">
                <Mail className="h-4 w-4 text-gray-500" />
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Topic */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800">
                Topic
              </label>
              <select
                name="topic"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
                defaultValue="General"
              >
                <option>General</option>
                <option>Pricing</option>
                <option>Feature request</option>
                <option>Bug report</option>
                <option>Partnership</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-800">
                Message
              </label>
              <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 focus-within:border-gray-400">
                <MessageSquare className="mt-2 h-4 w-4 text-gray-500" />
                <textarea
                  name="message"
                  rows={5}
                  placeholder="How can we help?"
                  className="w-full resize-y bg-transparent text-sm outline-none"
                />
              </div>
              {errors.message && (
                <p className="mt-1 text-xs text-red-600">{errors.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <a
                  href="mailto:support@mullet.app"
                  className="inline-flex items-center gap-2 hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  support@mullet.tools
                </a>
                <span className="hidden sm:inline text-gray-300">|</span>
                <a
                  href="tel:+3530000000"
                  className="hidden sm:inline-flex items-center gap-2 hover:underline"
                ></a>
              </div>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-70"
              >
                <Send className="h-4 w-4" />
                {status === "submitting" ? "Sending…" : "Send message"}
              </button>
            </div>

            {/* Status */}
            {status === "success" && (
              <p className="text-sm text-emerald-700">
                Thanks! We’ll get back to you shortly.
              </p>
            )}
            {status === "error" && (
              <p className="text-sm text-red-600">
                Something went wrong. Please try again.
              </p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
