"use client";

import DashboardPage from "../DashboardPage";
import { SetDashboardView } from "../_setView";

export default function DashboardHomePage() {
  SetDashboardView("dashboard");
  return <DashboardPage />;
}
