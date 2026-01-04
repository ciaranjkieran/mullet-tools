"use client";

import DashboardPage from "../DashboardPage";
import { SetDashboardView } from "../_setView";

export default function CalendarPage() {
  SetDashboardView("calendar");
  return <DashboardPage />;
}
