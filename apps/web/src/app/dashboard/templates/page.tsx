"use client";

import DashboardPage from "../DashboardPage";
import { SetDashboardView } from "../_setView";

export default function TemplatesPage() {
  SetDashboardView("templates");
  return <DashboardPage />;
}
