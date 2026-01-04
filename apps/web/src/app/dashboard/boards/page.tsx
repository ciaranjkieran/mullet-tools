"use client";

import DashboardPage from "../DashboardPage";
import { SetDashboardView } from "../_setView";

export default function BoardsPage() {
  SetDashboardView("boards");
  return <DashboardPage />;
}
