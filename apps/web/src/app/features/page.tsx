// app/features/page.tsx
import React from "react";

const VIDEOS = {
  modes: "/videos/Modes Video Real.mp4",
  comments: "/videos/Comments Real.mp4",
  notes: "/videos/Notes Video Real.mp4",
  boards: "/videos/Boards Real.mp4",
  timer: "/videos/Timer & Stats Real.mp4",
  aiBuilder: "/videos/AI Builder video Real.mp4",
  coherentSystem: "/videos/Putting it all together video Real.mp4",
};

const IMAGES = {
  hierarchy: "/Images/Hierarchy Image.png",
  collaboration: "/Images/Collaboration.png",
};

const ICONS: { src: string; label: string }[] = [
  { src: "/Images/Goal.png", label: "Goal" },
  { src: "/Images/Project.png", label: "Project" },
  { src: "/Images/Milestone.png", label: "Milestone" },
  { src: "/Images/Add Task.png", label: "Add Task" },
  { src: "/Images/Home Img.png", label: "Home" },
  { src: "/Images/Focus Img.png", label: "Focus" },
  { src: "/Images/Calendar Img.png", label: "Calendar" },
  { src: "/Images/Notes Img.png", label: "Notes" },
  { src: "/Images/Comments Img.png", label: "Comments" },
  { src: "/Images/Boards Img.png", label: "Boards" },
  { src: "/Images/Stats Img.png", label: "Stats" },
  { src: "/Images/Timer Img.png", label: "Timer" },
  { src: "/Images/Stopwatch Img.png", label: "Stopwatch" },
  { src: "/Images/Ai Builder Img.png", label: "AI Builder" },
  { src: "/Images/Collaboration Img.png", label: "Collaboration" },
  { src: "/Images/Templates Img.png", label: "Templates" },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <article className="mx-auto max-w-4xl space-y-24">
          {/* INTRO */}
          <Section>
            <div className="mx-auto max-w-2xl space-y-6 text-lg leading-relaxed text-neutral-800">
              <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                How Mullet Works
              </h1>
              <p>
                Mullet is built around one idea: everything in your life
                deserves its own space.
              </p>
              <p>
                Most productivity apps give you one big list. Work tasks sit
                next to grocery reminders. Client deadlines compete with
                personal goals. Everything bleeds into everything else, and
                instead of feeling organised you just feel overwhelmed.
              </p>
              <p>
                Mullet works differently. It gives every area of your life its
                own compartment — and keeps them completely separate, so you can
                focus on one thing at a time without the rest of the noise
                getting in the way.
              </p>
            </div>
          </Section>

          {/* MODES */}
          <Section id="modes">
            <TextBlock title="Modes">
              <p>
                A Mode is a compartment. It&apos;s a dedicated space for one
                area of your life — and everything inside it stays there.
              </p>
              <p>
                You might have a Mode for Work, one for Personal, one for a
                Side Project, one for Fitness. Or something completely different
                — Mullet doesn&apos;t tell you how to organise your life, it
                just gives you the structure to do it your way.
              </p>
              <p>
                When you&apos;re in Work mode, you see Work. When you switch to
                Personal, you see Personal. Nothing crosses over unless you want
                it to.
              </p>
              <p>
                Modes are the foundation of everything in Mullet. Every goal,
                every project, every task lives inside one.
              </p>
              <p className="text-base text-neutral-500">
                Examples of Modes people use: Work · Personal · Side Project ·
                Finance · Health · Travel · Learning · Family · Creative ·
                Business
              </p>
            </TextBlock>

            <VideoCard src={VIDEOS.modes} />
          </Section>

          {/* GOALS, PROJECTS, MILESTONES AND TASKS */}
          <Section id="hierarchy">
            <TextBlock title="Goals, Projects, Milestones and Tasks">
              <p>
                Inside each Mode, Mullet gives you four building blocks for
                organising your work. What makes Mullet different is how
                flexible these building blocks are — you can keep things simple
                with a flat list of tasks, or build out as much structure as
                your work demands. There&apos;s no single right way to use them.
              </p>

              <h3 className="text-xl font-semibold text-neutral-900 !mt-8">
                Goals
              </h3>
              <p>
                A Goal is the big picture. It&apos;s an outcome you&apos;re
                working toward — something meaningful enough that it will take
                real time and effort to achieve. Launch a business. Get fit.
                Ship a product. Learn a language.
              </p>
              <p>
                Goals give your work direction. Everything you put inside a Goal
                is connected to that bigger outcome.
              </p>

              <h3 className="text-xl font-semibold text-neutral-900 !mt-8">
                Projects
              </h3>
              <p>
                A Project is a defined piece of work. It might live inside a
                Goal, or it can stand on its own inside a Mode — whatever makes
                sense for how you work.
              </p>
              <p>
                Projects are flexible. A Project can contain other Projects
                inside it, which is useful when a piece of work is big enough to
                have distinct parts that each deserve their own space. A Project
                can also contain Milestones and Tasks directly.
              </p>
              <p>
                For example — if your Goal is to launch a business, you might
                have a Project called Build the website. Inside that, you might
                have smaller Projects for Design, Content, and Development, each
                with their own tasks and checkpoints.
              </p>

              <h3 className="text-xl font-semibold text-neutral-900 !mt-8">
                Milestones
              </h3>
              <p>
                A Milestone is a significant checkpoint — a moment where you can
                say one phase is done and the next begins. Milestones give your
                work shape and make progress feel real and visible.
              </p>
              <p>
                Like Projects, Milestones are flexible. They can live inside a
                Project, inside a Goal, or stand-alone inside a Mode. A
                Milestone can contain other Milestones inside it, breaking a big
                checkpoint down into smaller ones. Tasks can live directly
                inside a Milestone too.
              </p>

              <h3 className="text-xl font-semibold text-neutral-900 !mt-8">
                Tasks
              </h3>
              <p>
                A Task is the actual work — the specific, actionable thing you
                sit down and do. Tasks are the most flexible element in Mullet.
                They can live anywhere: inside a Milestone, inside a Project,
                inside a Goal, or just loose inside a Mode on their own.
              </p>
              <p>
                If you just need a quick to-do without any structure around it,
                add a Task directly to your Mode. If it&apos;s part of something
                bigger, place it wherever it belongs in Mullet.
              </p>

              <h3 className="text-xl font-semibold text-neutral-900 !mt-8">
                You don&apos;t have to use all of this
              </h3>
              <p>
                Most people start simple — a Mode and a handful of Tasks. The
                structure is there when your work grows complex enough to need
                it, and out of the way when it doesn&apos;t. Mullet adapts to
                how you think, not the other way around.
              </p>
            </TextBlock>

            <ImageCard src={IMAGES.hierarchy} alt="Hierarchy of Goals, Projects, Milestones and Tasks" />
          </Section>

          {/* FEATURES */}
          <Section id="features">
            <TextBlock title="Features">
              <p>
                Beyond the core structure, Mullet comes with a set of tools that
                live inside any element of Mullet — giving you everything you
                need to work the way you actually work.
              </p>
            </TextBlock>

            <FeatureCard title="Notes" video={VIDEOS.notes}>
              A clean, distraction-free space for writing inside any element of
              Mullet. Use it for thinking out loud, capturing ideas, drafting
              plans, or keeping reference material close to the work it relates
              to. Notes stay inside the element they belong to, so your Work
              notes never get mixed up with your Personal ones.
            </FeatureCard>

            <FeatureCard title="Comments" video={VIDEOS.comments}>
              Every Goal, Project, Milestone, and Task in Mullet can have its
              own comment thread. Leave yourself a note, track a decision,
              record why something changed. Comments keep the context attached
              to the work — so you never have to remember why you did something,
              because it&apos;s already written down.
            </FeatureCard>

            <FeatureCard title="Boards" video={VIDEOS.boards}>
              Boards give you a visual space inside any element of Mullet for
              images, files, links, and references. If you&apos;re working on a
              creative project and need a mood board, or a business project and
              need to keep key documents close, Boards is where that lives.
              Everything is visible at a glance, attached to whatever it belongs
              to.
            </FeatureCard>

            <FeatureCard title="Timer" video={VIDEOS.timer}>
              A focused work timer built directly into Mullet. When you&apos;re
              ready to work, start the timer and go. No context switching to a
              separate app, no losing track of what you were doing. The Timer
              keeps your focused work connected to whatever you&apos;re working
              on.
            </FeatureCard>
          </Section>

          {/* COLLABORATION */}
          <Section id="collaboration">
            <TextBlock title="Collaboration">
              <p>
                Mullet is great for solo workers — but often work involves other
                people. Collaboration in Mullet is built around Modes, which
                means you share exactly what&apos;s relevant and nothing else.
              </p>
              <p>
                Every Mode in Mullet can be shared with other people. As the
                owner of a Mode, if your collaborator is a Mullet subscriber,
                you can invite them in the app and choose what level of access
                they have — an Editor can contribute and make changes, while a
                Viewer can see everything but can&apos;t edit. You stay in
                control at all times.
              </p>
              <p>
                Pending invitations are tracked inside the Mode until accepted,
                and collaborators can be removed at any point. Everything
                outside the shared Mode stays completely private — your other
                Modes, your other work, none of it is visible to anyone you
                haven&apos;t explicitly invited.
              </p>
              <p>
                Collaboration in Mullet is intentional, not accidental. You
                decide what gets shared, with whom, and when.
              </p>
            </TextBlock>

            <ImageCard src={IMAGES.collaboration} alt="Collaboration in Mullet" />
          </Section>

          {/* AI BUILDER */}
          <Section id="ai">
            <TextBlock title="AI Builder">
              <p>
                The AI Builder is one of the most powerful tools in Mullet. It
                lets you describe what you want to build in plain language — and
                generates a complete, structured plan inside your current Mode.
              </p>
              <p>
                Tell it something like &ldquo;plan a product launch for next
                month&rdquo; or &ldquo;break down my website project into
                tasks&rdquo; and the AI Builder produces the appropriate tree of
                elements that maps directly onto Mullet&apos;s structure. You
                can review everything it generates before anything is saved —
                toggling items in or out, renaming them, adjusting dates, or
                removing anything that doesn&apos;t fit.
              </p>
              <p>
                Nothing is committed to your Mode until you&apos;re ready. Once
                you&apos;re happy with the plan, you apply it in one step and
                everything appears exactly where it belongs.
              </p>
              <p>
                The AI Builder also works iteratively. You can prompt it
                multiple times — refining, expanding, or restructuring — and it
                understands the existing content of your Mode so it can suggest
                changes and additions that make sense in context, not just in
                isolation.
              </p>
              <p>
                It&apos;s the fastest way to go from a blank Mode to a
                structured, actionable plan.
              </p>
            </TextBlock>

            <VideoCard src={VIDEOS.aiBuilder} />
          </Section>

          {/* PUTTING IT ALL TOGETHER */}
          <Section>
            <TextBlock title="Putting It All Together">
              <p>
                Here&apos;s what Mullet looks like in practice for a freelancer
                juggling multiple things at once:
              </p>
              <p>
                You have three Modes — Work, Personal, and Side Project.
              </p>
              <p>
                Inside Work, you have a Goal: Land three new clients this
                quarter. Inside that Goal, a Project: Outreach campaign, which
                contains two smaller Projects — Email outreach and LinkedIn
                outreach — each with their own Tasks. You also have a handful of
                loose Tasks sitting directly in your Work Mode for quick things
                that don&apos;t belong anywhere specific.
              </p>
              <p>
                Meanwhile inside Side Project, everything related to that is
                completely separate. Different Goals, different Projects,
                different Tasks. No crossover, no noise.
              </p>
              <p>
                When you sit down to work on client outreach, you open Work mode
                and that&apos;s all you see. When you switch to your side
                project in the evening, Work disappears and Side Project is all
                that&apos;s there.
              </p>
              <p>
                Compartmentalisation, versatility, and focus. These are the
                pillars Mullet is built on.
              </p>
            </TextBlock>

            <VideoCard src={VIDEOS.coherentSystem} />
          </Section>

          {/* ICON GLOSSARY */}
          <Section id="icon-glossary">
            <TextBlock title="Icon Glossary">
              <p>
                A quick reference for the icons you&apos;ll see throughout
                Mullet.
              </p>
            </TextBlock>

            <div className="mx-auto max-w-2xl">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
                {ICONS.map((icon) => (
                  <div
                    key={icon.label}
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    <img
                      src={icon.src}
                      alt={icon.label}
                      className="h-12 w-12 object-contain"
                    />
                    <span className="text-sm font-medium text-neutral-700">
                      {icon.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

        </article>
      </div>
    </main>
  );
}

/* ---------- components ---------- */

function Section({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-10">
      {children}
    </section>
  );
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

function ImageCard({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50 shadow-md">
      <img className="block w-full" src={src} alt={alt} />
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

function FeatureCard({
  title,
  video,
  children,
}: {
  title: string;
  video: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h3 className="text-xl font-semibold text-neutral-900">{title}</h3>
      <p className="text-lg leading-relaxed text-neutral-800">{children}</p>
      <VideoCard src={video} />
    </div>
  );
}
