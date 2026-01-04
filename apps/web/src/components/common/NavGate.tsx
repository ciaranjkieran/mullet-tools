// components/common/NavGate.tsx
"use client";

import Header from "@/components/common/Header";
import { useDialogStore } from "../../lib/dialogs/useDialogStore";
import { usePinDialogStore } from "@/lib/dialogs/usePinDialogStore";

export default function NavGate() {
  // read all entity-window flags from your existing dialog store
  const anyEntityDialogOpen = useDialogStore(
    (s) =>
      s.isTaskDialogOpen ||
      s.isMilestoneDialogOpen ||
      s.isProjectDialogOpen ||
      s.isGoalDialogOpen ||
      s.isEditModesOpen
  );

  // add the Pin dialog (separate store)
  const isPinOpen = usePinDialogStore((s) => s.isOpen);

  const hideNav = anyEntityDialogOpen || isPinOpen;

  return hideNav ? null : <Header />;
}
