"use client";

import { useEffect } from "react";
import { useModeStore } from "@shared/store/useModeStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const setSelectedMode = useModeStore((s) => s.setSelectedMode);

  // ✅ On hard load / refresh, always reset to All
  useEffect(() => {
    setSelectedMode("All");
  }, [setSelectedMode]);

  return <>{children}</>;
}
