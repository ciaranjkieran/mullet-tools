import { useState } from "react";

/** null means "All" */
export function useModeFilter(initial: number | null) {
  return useState<number | null>(initial);
}
