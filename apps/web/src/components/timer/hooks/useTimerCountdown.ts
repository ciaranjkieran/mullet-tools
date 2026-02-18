// hooks/useTimerCountdown.ts
import { useState } from "react";

/**
 * Manages the user-configured countdown duration (minutes + seconds).
 * Ephemeral — resets to 25:00 on page load, which is the intended default.
 */
export function useTimerCountdown() {
  const [cdMin, setCdMin] = useState(25);
  const [cdSec, setCdSec] = useState(0);
  const durationSec = cdMin * 60 + cdSec;
  return { cdMin, setCdMin, cdSec, setCdSec, durationSec };
}
