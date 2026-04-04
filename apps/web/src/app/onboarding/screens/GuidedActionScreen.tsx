"use client";

import { useState } from "react";

type Path = null | "task" | "bigger";
type BiggerChoice = null | "goal" | "project";
type FlowStep = "choose" | "input-task" | "choose-bigger" | "goal" | "project";

export default function GuidedActionScreen({
  onCreateTask,
  onCreateGoal,
  onCreateProject,
  onFinish,
  busy,
}: {
  onCreateTask: (title: string) => Promise<void>;
  onCreateGoal: (
    goal: string,
    milestone?: string,
    task?: string
  ) => Promise<void>;
  onCreateProject: (
    project: string,
    milestone?: string,
    task?: string
  ) => Promise<void>;
  onFinish: () => Promise<void>;
  busy: boolean;
}) {
  const [flowStep, setFlowStep] = useState<FlowStep>("choose");

  // Task path
  const [taskTitle, setTaskTitle] = useState("");

  // Goal path
  const [goalTitle, setGoalTitle] = useState("");
  const [goalMilestone, setGoalMilestone] = useState("");
  const [goalTask, setGoalTask] = useState("");
  const [goalStep, setGoalStep] = useState(0); // 0=goal, 1=milestone, 2=task

  // Project path
  const [projectTitle, setProjectTitle] = useState("");
  const [projectMilestone, setProjectMilestone] = useState("");
  const [projectTask, setProjectTask] = useState("");
  const [projectStep, setProjectStep] = useState(0);

  async function handleTaskSubmit() {
    if (!taskTitle.trim()) return;
    await onCreateTask(taskTitle.trim());
    await onFinish();
  }

  async function handleGoalSubmit() {
    await onCreateGoal(
      goalTitle.trim(),
      goalMilestone.trim() || undefined,
      goalTask.trim() || undefined
    );
    await onFinish();
  }

  async function handleProjectSubmit() {
    await onCreateProject(
      projectTitle.trim(),
      projectMilestone.trim() || undefined,
      projectTask.trim() || undefined
    );
    await onFinish();
  }

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
        What&apos;s on your mind right now?
      </h1>

      {/* Path A / Path B choice */}
      {flowStep === "choose" && (
        <div className="mt-10 w-full max-w-md space-y-4">
          <button
            onClick={() => setFlowStep("input-task")}
            className="w-full rounded-xl border-2 border-gray-200 hover:border-gray-900 transition p-6 text-left"
          >
            <p className="text-lg font-semibold text-gray-900">
              It&apos;s something I just need to do
            </p>
            <p className="mt-1 text-sm text-gray-500">
              I&apos;ll add a quick task
            </p>
          </button>

          <button
            onClick={() => setFlowStep("choose-bigger")}
            className="w-full rounded-xl border-2 border-gray-200 hover:border-gray-900 transition p-6 text-left"
          >
            <p className="text-lg font-semibold text-gray-900">
              It&apos;s something bigger
            </p>
            <p className="mt-1 text-sm text-gray-500">
              I want to structure this out
            </p>
          </button>

          <button
            onClick={onFinish}
            disabled={busy}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition font-medium"
          >
            Skip for now
          </button>
        </div>
      )}

      {/* Quick task input */}
      {flowStep === "input-task" && (
        <div className="mt-10 w-full max-w-md space-y-4">
          <label className="block text-left text-sm font-medium text-gray-700">
            What do you need to do?
          </label>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="e.g. Reply to Sarah's email"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && taskTitle.trim()) handleTaskSubmit();
            }}
          />
          <button
            onClick={handleTaskSubmit}
            disabled={!taskTitle.trim() || busy}
            className="w-full rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 transition disabled:opacity-50"
          >
            {busy ? "Creating..." : "Create Task"}
          </button>
          <button
            onClick={onFinish}
            disabled={busy}
            className="text-sm text-gray-400 hover:text-gray-600 transition font-medium"
          >
            Skip for now
          </button>
        </div>
      )}

      {/* Choose bigger: goal or project */}
      {flowStep === "choose-bigger" && (
        <div className="mt-10 w-full max-w-md space-y-4">
          <button
            onClick={() => setFlowStep("goal")}
            className="w-full rounded-xl border-2 border-gray-200 hover:border-gray-900 transition p-6 text-left"
          >
            <p className="text-lg font-semibold text-gray-900">
              It&apos;s a long term goal
            </p>
          </button>

          <button
            onClick={() => setFlowStep("project")}
            className="w-full rounded-xl border-2 border-gray-200 hover:border-gray-900 transition p-6 text-left"
          >
            <p className="text-lg font-semibold text-gray-900">
              I&apos;m actively working on it
            </p>
          </button>

          <button
            onClick={onFinish}
            disabled={busy}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition font-medium"
          >
            Skip for now
          </button>
        </div>
      )}

      {/* Goal flow */}
      {flowStep === "goal" && (
        <div className="mt-10 w-full max-w-md space-y-4">
          {goalStep === 0 && (
            <>
              <label className="block text-left text-sm font-medium text-gray-700">
                What do you want to achieve?
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Learn Spanish to conversational level"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && goalTitle.trim()) setGoalStep(1);
                }}
              />
              <button
                onClick={() => setGoalStep(1)}
                disabled={!goalTitle.trim()}
                className="w-full rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 transition disabled:opacity-50"
              >
                Next
              </button>
            </>
          )}

          {goalStep === 1 && (
            <>
              <label className="block text-left text-sm font-medium text-gray-700">
                What&apos;s the first major step you need to hit?
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Complete beginner course"
                value={goalMilestone}
                onChange={(e) => setGoalMilestone(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") setGoalStep(2);
                }}
              />
              <button
                onClick={() => setGoalStep(2)}
                className="w-full rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 transition"
              >
                Next
              </button>
              <button
                onClick={() => setGoalStep(2)}
                className="text-sm text-gray-400 hover:text-gray-600 transition font-medium"
              >
                Skip for now
              </button>
            </>
          )}

          {goalStep === 2 && (
            <>
              <label className="block text-left text-sm font-medium text-gray-700">
                What&apos;s the first thing you need to do?
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Download Duolingo"
                value={goalTask}
                onChange={(e) => setGoalTask(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGoalSubmit();
                }}
              />
              <button
                onClick={handleGoalSubmit}
                disabled={busy}
                className="w-full rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 transition disabled:opacity-50"
              >
                {busy ? "Creating..." : "Create & Go to Dashboard"}
              </button>
              <button
                onClick={handleGoalSubmit}
                disabled={busy}
                className="text-sm text-gray-400 hover:text-gray-600 transition font-medium"
              >
                Skip for now
              </button>
            </>
          )}
        </div>
      )}

      {/* Project flow */}
      {flowStep === "project" && (
        <div className="mt-10 w-full max-w-md space-y-4">
          {projectStep === 0 && (
            <>
              <label className="block text-left text-sm font-medium text-gray-700">
                What are you working on?
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Redesign portfolio website"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && projectTitle.trim())
                    setProjectStep(1);
                }}
              />
              <button
                onClick={() => setProjectStep(1)}
                disabled={!projectTitle.trim()}
                className="w-full rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 transition disabled:opacity-50"
              >
                Next
              </button>
            </>
          )}

          {projectStep === 1 && (
            <>
              <label className="block text-left text-sm font-medium text-gray-700">
                What&apos;s the first major step you need to hit?
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Finalise wireframes"
                value={projectMilestone}
                onChange={(e) => setProjectMilestone(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") setProjectStep(2);
                }}
              />
              <button
                onClick={() => setProjectStep(2)}
                className="w-full rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 transition"
              >
                Next
              </button>
              <button
                onClick={() => setProjectStep(2)}
                className="text-sm text-gray-400 hover:text-gray-600 transition font-medium"
              >
                Skip for now
              </button>
            </>
          )}

          {projectStep === 2 && (
            <>
              <label className="block text-left text-sm font-medium text-gray-700">
                What&apos;s the first thing you need to do?
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Sketch layout ideas"
                value={projectTask}
                onChange={(e) => setProjectTask(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleProjectSubmit();
                }}
              />
              <button
                onClick={handleProjectSubmit}
                disabled={busy}
                className="w-full rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white hover:bg-gray-800 transition disabled:opacity-50"
              >
                {busy ? "Creating..." : "Create & Go to Dashboard"}
              </button>
              <button
                onClick={handleProjectSubmit}
                disabled={busy}
                className="text-sm text-gray-400 hover:text-gray-600 transition font-medium"
              >
                Skip for now
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
