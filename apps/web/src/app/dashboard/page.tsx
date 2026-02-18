export const dynamic = "force-dynamic";
export const revalidate = 0;

import DashboardPage from "./DashboardPage";
import RequireAuth from "@/components/auth/RequireAuth";

export default function Dashboard() {
  return (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  );
}
