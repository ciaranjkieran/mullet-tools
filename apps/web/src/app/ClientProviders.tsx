// app/ClientProviders.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useGlobalOutsideDeselect } from "../lib/hooks/useGlobalOutsideDeselect";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());

  // Mount the outside‑click + ESC deselect globally
  useGlobalOutsideDeselect({
    enableEsc: true,
    // If your batch UI / dialogs render in portals, add their roots here:
    // safeSelectors: ["#portal-root", "[data-dialog-root='true']"],
  });

  // Re-fetch /me when subscription expires so Paywall component renders
  useEffect(() => {
    function handleExpired() {
      client.invalidateQueries({ queryKey: ["me"] });
    }
    window.addEventListener("subscription:expired", handleExpired);
    return () => window.removeEventListener("subscription:expired", handleExpired);
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
