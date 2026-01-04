// app/how-it-works/page.tsx
import React from "react";

const VIDEOS = {
  modes: "/videos/Modes Video 2.mp4",
  hierarchy: "/videos/Hierarchy Video 4.mp4",
  comments: "/videos/Comments Video.mp4",
  notes: "/videos/Notes Video.mp4",
  boards: "/videos/Boards Video.mp4",
  stats: "/videos/Stats Video.mp4",
  coherentSystem: "/videos/Coherent System.mp4",
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <article className="mx-auto max-w-4xl space-y-24">
          {/* MODES */}
          <Section>
            <TextBlock title="One app. Many contexts.">
              <p>
                Life pulls you in different directions.
                <br />
                Work. Fitness. Side projects. Hobbies. Rest.
              </p>

              <p>
                Mullet starts with{" "}
                <strong className="font-semibold text-neutral-900">
                  Modes
                </strong>{" "}
                —
                <br />
                distinct contexts that help you focus on what matters in the
                moment, without losing flexibility.
              </p>
            </TextBlock>

            <VideoCard src={VIDEOS.modes} />
          </Section>

          {/* HIERARCHY */}
          <Section>
            <TextBlock title="Structure that adapts.">
              <p>
                Life isn’t flat — and your work rarely is either.
                <br />
                <br />
                Goals give direction.
                <br />
                Projects break things down.
                <br />
                Milestones mark progress.
                <br />
                Tasks handle the details.
              </p>

              <p>
                Mullet lets you organize your work in a clear hierarchy —
                <br />
                so structure supports your thinking, instead of getting in the
                way.
              </p>

              <p>
                And when you find a structure that works, you can reuse it
                through templates.
              </p>

              <p>
                With structure in place, you have space to think — not just move
                forward.
              </p>
            </TextBlock>

            <VideoCard src={VIDEOS.hierarchy} />
          </Section>

          {/* COMMENTS */}
          <Section>
            <TextBlock title="Space to think.">
              <p>
                Some thoughts are quick.
                <br />
                Others need time and room to unfold.
              </p>

              <p>
                Use{" "}
                <strong className="font-semibold text-neutral-900">
                  Comments
                </strong>{" "}
                to capture ideas as they happen —
                <br />
                loose thoughts, questions, decisions in motion.
              </p>
            </TextBlock>

            <VideoCard src={VIDEOS.comments} />
          </Section>

          {/* NOTES */}
          <Section>
            <TextBlock title="Use Notes when you need more space.">
              <p>
                Use{" "}
                <strong className="font-semibold text-neutral-900">
                  Notes
                </strong>{" "}
                when you need more space —
                <br />
                to reflect, explore ideas, or think things through properly.
              </p>

              <p>
                Mullet gives your thinking a place to live,
                <br />
                so nothing important gets lost in the rush to move on.
              </p>
            </TextBlock>

            <VideoCard src={VIDEOS.notes} />
          </Section>

          {/* BOARDS */}
          <Section>
            <TextBlock title="Stay inspired.">
              <p>
                Boards give you a place to keep what inspires you —
                <br />
                links, images, references, ideas — right alongside your work.
              </p>

              <p>
                Pin things as they catch your eye.
                <br />
                Revisit them when you need perspective, motivation, or
                direction.
              </p>

              <p>
                Then, when inspiration turns into intention, it’s time to focus.
              </p>
            </TextBlock>

            <VideoCard src={VIDEOS.boards} />
          </Section>

          {/* STATS */}
          <Section>
            <TextBlock title="Focus and keep track.">
              <p>
                Start a timer and know exactly what you’re focusing on —
                <br />a task, a project, or simply time well spent.
              </p>

              <p>
                As you work, Mullet keeps track quietly in the background,
                <br />
                turning focused sessions into clear, meaningful data.
              </p>

              <p>
                Over time, that data becomes insight —
                <br />
                helping you see where your time goes, and how you actually work.
              </p>
            </TextBlock>

            <VideoCard src={VIDEOS.stats} />
          </Section>

          {/* COHERENT SYSTEM */}
          <Section>
            <TextBlock title="A system that fits together.">
              <p>
                Mullet isn’t a collection of features.
                <br />
                It’s a coherent system — designed to adapt to how you think,
                plan, and work.
              </p>

              <p>
                Each part supports the others,
                <br />
                so you can move from ideas to action without friction.
              </p>

              <p>Try Mullet and see how it feels to work with more clarity.</p>
            </TextBlock>

            <VideoCard src={VIDEOS.coherentSystem} />
          </Section>
        </article>
      </div>
    </main>
  );
}

/* ---------- components ---------- */

function Section({ children }: { children: React.ReactNode }) {
  return <section className="space-y-10">{children}</section>;
}

function TextBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-lg leading-relaxed text-neutral-800">
      <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
        {title}
      </h2>
      {children}
    </div>
  );
}
function VideoCard({ src }: { src: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50 shadow-md">
      <video
        className="block w-full"
        src={src}
        autoPlay
        muted
        playsInline
        loop
        preload="metadata"
        controls={false}
      />
    </div>
  );
}
