export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Dashboard" };

import DashboardPage from "./DashboardPage";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireSubscription from "@/components/billing/RequireSubscription";

export default function Dashboard() {
  return (
    <RequireAuth>
      <RequireSubscription>
        <DashboardPage />
      </RequireSubscription>
    </RequireAuth>
  );
}
