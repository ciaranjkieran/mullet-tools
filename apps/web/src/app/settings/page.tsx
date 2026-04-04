export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Settings" };

import SettingsPage from "./SettingsPage";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireSubscription from "@/components/billing/RequireSubscription";

export default function Settings() {
  return (
    <RequireAuth>
      <RequireSubscription>
        <SettingsPage />
      </RequireSubscription>
    </RequireAuth>
  );
}
