"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@shared/api/hooks/auth/useMe";
import { useCompleteOnboarding } from "@shared/api/hooks/auth/useCompleteOnboarding";
import { useCreateMode } from "@shared/api/hooks/modes/useCreateMode";
import { useCreateGoal } from "@shared/api/hooks/goals/useCreateGoal";
import { useCreateProject } from "@shared/api/hooks/projects/useCreateProject";
import { useCreateMilestone } from "@shared/api/hooks/milestones/useCreateMilestone";
import { useCreateTask } from "@shared/api/hooks/tasks/useCreateTask";
import ProgressDots from "./ProgressDots";
import WelcomeScreen from "./screens/WelcomeScreen";
import ModesScreen from "./screens/ModesScreen";
import HierarchyScreen from "./screens/HierarchyScreen";
import FeaturesScreen from "./screens/FeaturesScreen";
import GuidedActionScreen from "./screens/GuidedActionScreen";
import type { SelectedMode } from "./types";

const TOTAL_STEPS = 5;

export default function OnboardingFlow() {
  const router = useRouter();
  const { data: me } = useMe();
  const completeOnboarding = useCompleteOnboarding();
  const createMode = useCreateMode();
  const createGoal = useCreateGoal();
  const createProject = useCreateProject();
  const createMilestone = useCreateMilestone();
  const createTask = useCreateTask();

  const [step, setStep] = useState(1);
  const [selectedModes, setSelectedModes] = useState<SelectedMode[]>([
    { label: "Work", emoji: "💼", color: "#3B82F6", selected: true },
    { label: "Personal", emoji: "🏠", color: "#8B5CF6", selected: true },
    { label: "Side Project", emoji: "🚀", color: "#10B981", selected: true },
    { label: "Finance", emoji: "💰", color: "#F59E0B", selected: false },
    { label: "Health", emoji: "💪", color: "#EF4444", selected: false },
    { label: "Travel", emoji: "✈️", color: "#06B6D4", selected: false },
    { label: "Learning", emoji: "📚", color: "#8B5CF6", selected: false },
    { label: "Family", emoji: "👨‍👩‍👧‍👦", color: "#EC4899", selected: false },
    { label: "Creative", emoji: "🎨", color: "#F97316", selected: false },
    { label: "Business", emoji: "📊", color: "#64748B", selected: false },
  ]);
  const [createdModeIds, setCreatedModeIds] = useState<
    { label: string; id: number }[]
  >([]);
  const [finishing, setFinishing] = useState(false);

  // If already onboarded, redirect to dashboard
  useEffect(() => {
    if (me?.profile?.hasCompletedOnboarding) {
      router.replace("/dashboard");
    }
  }, [me, router]);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const createSelectedModes = useCallback(async () => {
    const chosen = selectedModes.filter((m) => m.selected);
    const results: { label: string; id: number }[] = [];

    for (let i = 0; i < chosen.length; i++) {
      const m = chosen[i];
      const created = await createMode.mutateAsync({
        title: m.label,
        color: m.color,
        position: i,
      });
      results.push({ label: m.label, id: created.id });
    }

    setCreatedModeIds(results);
    return results;
  }, [selectedModes, createMode]);

  const finishOnboarding = useCallback(async () => {
    setFinishing(true);
    try {
      await completeOnboarding.mutateAsync();
      router.push("/dashboard");
    } catch {
      setFinishing(false);
    }
  }, [completeOnboarding, router]);

  const skipToEnd = useCallback(async () => {
    setFinishing(true);
    try {
      // Create modes if not yet created (skipping from screen 3/4)
      let modes = createdModeIds;
      if (modes.length === 0) {
        modes = await createSelectedModes();
      }
      await completeOnboarding.mutateAsync();
      router.push("/dashboard");
    } catch {
      setFinishing(false);
    }
  }, [createdModeIds, createSelectedModes, completeOnboarding, router]);

  const handleModesNext = useCallback(async () => {
    const modes = await createSelectedModes();
    setCreatedModeIds(modes);
    next();
  }, [createSelectedModes, next]);

  const handleCreateTask = useCallback(
    async (title: string) => {
      const modeId = createdModeIds[0]?.id;
      if (!modeId) return;
      await createTask.mutateAsync({ title, modeId });
    },
    [createdModeIds, createTask]
  );

  const handleCreateGoal = useCallback(
    async (goalTitle: string, milestoneTitle?: string, taskTitle?: string) => {
      const modeId = createdModeIds[0]?.id;
      if (!modeId) return;
      const goal = await createGoal.mutateAsync({ title: goalTitle, modeId });
      if (milestoneTitle) {
        const milestone = await createMilestone.mutateAsync({
          title: milestoneTitle,
          modeId,
          goalId: goal.id,
        });
        if (taskTitle) {
          await createTask.mutateAsync({
            title: taskTitle,
            modeId,
            milestoneId: milestone.id,
            goalId: goal.id,
          });
        }
      }
    },
    [createdModeIds, createGoal, createMilestone, createTask]
  );

  const handleCreateProject = useCallback(
    async (
      projectTitle: string,
      milestoneTitle?: string,
      taskTitle?: string
    ) => {
      const modeId = createdModeIds[0]?.id;
      if (!modeId) return;
      const project = await createProject.mutateAsync({
        title: projectTitle,
        modeId,
      });
      if (milestoneTitle) {
        const milestone = await createMilestone.mutateAsync({
          title: milestoneTitle,
          modeId,
          projectId: project.id,
        });
        if (taskTitle) {
          await createTask.mutateAsync({
            title: taskTitle,
            modeId,
            milestoneId: milestone.id,
            projectId: project.id,
          });
        }
      }
    },
    [createdModeIds, createProject, createMilestone, createTask]
  );

  if (finishing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500 text-lg">Setting up your workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with progress dots, back & skip */}
      <div className="w-full max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <div className="w-16">
          {step > 1 && (
            <button
              onClick={back}
              className="text-sm text-gray-500 hover:text-gray-800 transition font-medium"
            >
              &larr; Back
            </button>
          )}
        </div>
        <ProgressDots current={step} total={TOTAL_STEPS} />
        <div className="w-16 text-right">
          {step > 2 && (
            <button
              onClick={skipToEnd}
              className="text-sm text-gray-500 hover:text-gray-800 transition font-medium"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Screen content */}
      <div className="flex-1 flex items-start justify-center px-6 pt-8 pb-16">
        <div className="w-full max-w-2xl">
          {step === 1 && <WelcomeScreen onNext={next} />}
          {step === 2 && (
            <ModesScreen
              modes={selectedModes}
              onModesChange={setSelectedModes}
              onNext={handleModesNext}
              busy={createMode.isPending}
            />
          )}
          {step === 3 && <HierarchyScreen onNext={next} />}
          {step === 4 && <FeaturesScreen onNext={next} />}
          {step === 5 && (
            <GuidedActionScreen
              onCreateTask={handleCreateTask}
              onCreateGoal={handleCreateGoal}
              onCreateProject={handleCreateProject}
              onFinish={finishOnboarding}
              busy={
                createTask.isPending ||
                createGoal.isPending ||
                createProject.isPending ||
                createMilestone.isPending
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
