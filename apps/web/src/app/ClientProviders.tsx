// app/ClientProviders.tsx
"use client";

import "../lib/api/initApi"; // configures shared axios for web — must run before any API calls

import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useGlobalOutsideDeselect } from "../lib/hooks/useGlobalOutsideDeselect";
import { setupCacheSync } from "@shared/api/hooks/syncStoresToCache";

// Tell React Query to batch state updates through React's scheduler
// This prevents #300 errors when query updates trigger store syncs
notifyManager.setScheduler(requestAnimationFrame);

// Error boundary prevents blank screen on React errors (#300, #310)
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[AppErrorBoundary]", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 }}>
          <p style={{ fontSize: 16, color: "#6b7280" }}>Something went wrong.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false, // don't refetch every tab switch
          },
        },
      })
  );

  // Sync RQ cache → Zustand stores outside React's render cycle
  const syncSetup = useRef(false);
  if (!syncSetup.current) {
    setupCacheSync(client);
    syncSetup.current = true;
  }

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

  // Toggle data-shift-held on <html> so CSS can show pointer cursor (selection mode)
  useEffect(() => {
    const html = document.documentElement;
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") html.setAttribute("data-shift-held", "");
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") html.removeAttribute("data-shift-held");
    };
    const onBlur = () => html.removeAttribute("data-shift-held");

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      html.removeAttribute("data-shift-held");
    };
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </AppErrorBoundary>
  );
}
