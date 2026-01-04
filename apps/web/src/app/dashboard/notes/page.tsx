"use client";

import DashboardPage from "../DashboardPage";
import { SetDashboardView } from "../_setView";

export default function NotesPage() {
  SetDashboardView("notes");
  return <DashboardPage />;
}
