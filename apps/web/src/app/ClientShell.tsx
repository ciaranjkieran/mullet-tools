// src/app/ClientShell.tsx
"use client";

import { useGlobalOutsideDeselect } from "../lib/hooks/useGlobalOutsideDeselect";

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  useGlobalOutsideDeselect({ enableEsc: true });
  return <>{children}</>;
}
