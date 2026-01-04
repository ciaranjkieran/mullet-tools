"use client";

import DashboardPage from "../DashboardPage";
import { SetDashboardView } from "../_setView";

export default function StatsPage() {
  SetDashboardView("stats");
  return <DashboardPage />;
}
