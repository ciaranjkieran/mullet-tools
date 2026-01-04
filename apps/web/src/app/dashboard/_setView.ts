"use client";

import { useViewStore } from "@shared/store/useViewStore";

export function SetDashboardView(view: string) {
  // run immediately (no useEffect) to avoid “one-frame lag”
  useViewStore.getState().setViewType(view as any);
  return null;
}
