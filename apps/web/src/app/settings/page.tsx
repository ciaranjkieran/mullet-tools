export const dynamic = "force-dynamic";
export const revalidate = 0;

import SettingsPage from "./SettingsPage";
import RequireAuth from "@/components/auth/RequireAuth";

export default function Settings() {
  return (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  );
}
