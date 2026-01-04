"use client";

import DashboardPage from "../DashboardPage";
import { SetDashboardView } from "../_setView";

export default function TimerPage() {
  SetDashboardView("timer");
  return <DashboardPage />;
}
