// app/about/page.tsx
import React from "react";
import Link from "next/link";

const HERO_VIDEO_SRC = "/videos/About 1 Edit 1.mp4";
const CONTACT_HREF = "/contact";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <section aria-label="Mullet in action" className="mb-10 sm:mb-14">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm">
            <video
              className="block w-full"
              src={HERO_VIDEO_SRC}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/images/about-hero-poster.jpg"
            />
          </div>
        </section>

        {/* Content column */}
        <article className="mx-auto max-w-2xl">
          {/* Intro */}
          <section className="space-y-6 text-base leading-relaxed text-neutral-800">
            <p>Mullet started with a simple frustration.</p>

            <p>I couldn’t find a system that fit my life very well.</p>

            <p>
              Everything felt either too rigid or too loose.
              <br />
              Powerful, but exhausting.
              <br />
              Simple, but shallow.
            </p>

            <p>So I started building the one I wanted for myself.</p>
          </section>

          <Divider />

          {/* Built from use */}
          <section className="space-y-6 text-base leading-relaxed text-neutral-800">
            <p>
              Mullet wasn’t designed on a whiteboard. It grew out of daily use —
              planning work, tracking time, thinking things through, changing
              priorities, and trying to stay clear-headed along the way.
            </p>

            <p>
              Over time, a pattern emerged:
              <br />
              <span className="font-semibold text-neutral-900">
                When structure fits how you think, productivity becomes smoother
                — and organising stops feeling like effort.
              </span>
            </p>

            <p>That’s the idea Mullet is built around.</p>
          </section>

          <Divider />

          {/* Stays out of the way */}
          <section className="space-y-6 text-base leading-relaxed text-neutral-800">
            <p>I don’t believe productivity tools should demand attention.</p>
            <p>They should create space for it.</p>

            <p>
              Mullet aims to be calm, adaptable, and quietly supportive —
              something you can trust to hold things together while you focus on
              what actually matters.
            </p>
          </section>

          <Divider />

          {/* Still evolving */}
          <section className="space-y-6 text-base leading-relaxed text-neutral-800">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Still evolving
            </h2>

            <p>
              Its a work in progress, shaped by iteration, reflection, and
              repetition.
            </p>

            <p>
              If you have thoughts, ideas, or feedback while using the app, I’d
              love to hear them.
              <br />
              You can get in touch{" "}
              <a
                href={CONTACT_HREF}
                className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-600"
              >
                here
              </a>
              .
            </p>
          </section>

          <Divider />

          {/* Why Mullet */}
          <section className="space-y-6 text-base leading-relaxed text-neutral-800">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Why “Mullet”?
            </h2>

            <p>
              I remember hearing the mullet haircut has a reputation for
              versatility — business up front, freedom in the back.{" "}
              <span aria-hidden>😄</span>
            </p>

            <p>That idea stuck.</p>

            <p>
              Sometimes you need structure and focus.
              <br />
              Sometimes you need room to explore, experiment, and let things
              unfold.
            </p>

            <p>
              If that way of working resonates, this app might suit you well.
            </p>

            <p>
              Try Mullet and see your productivity let it's hair down a little —
              while still keeping it tight.
            </p>

            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-purple-600 px-6 py-3 text-base font-semibold text-white hover:bg-purple-700 transition"
              >
                Log in / Sign up
              </Link>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}

function Divider() {
  return <div className="my-10 h-px w-full bg-neutral-200" />;
}
