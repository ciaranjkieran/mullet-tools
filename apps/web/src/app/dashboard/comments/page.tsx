"use client";

import DashboardPage from "../DashboardPage";
import { SetDashboardView } from "../_setView";

export default function CommentsPage() {
  SetDashboardView("comments");
  return <DashboardPage />;
}
