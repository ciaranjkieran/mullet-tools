// lib/navigation/goToHomeAndReveal.ts
import { useHomeFocusStore } from "@/lib/store/useNavFocusStore";

// Use inside a component, not at module top-level.
export function useGoToHomeAndReveal() {
  const setActiveView = useHomeFocusStore((s) => s.setActiveView);
  const setActiveModeId = useHomeFocusStore((s) => s.setActiveModeId);
  const setTarget = useHomeFocusStore((s) => s.setTarget);

  return function goToHomeAndReveal(opts: {
    modeId: number;
    kind: "task" | "milestone" | "project" | "goal";
    id: number;
  }) {
    // 1) switch to Home (your store uses 'dashboard' as Home)
    setActiveView("dashboard");

    // 2) select the correct mode tab
    setActiveModeId(opts.modeId);

    // 3) ask Home to reveal this entity (include modeId)
    setTarget({
      modeId: opts.modeId,
      kind: opts.kind,
      id: opts.id,
    });
  };
}
