export const dynamic = "force-dynamic";
export const revalidate = 0;

import InvitationsPage from "./InvitationsPage";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireSubscription from "@/components/billing/RequireSubscription";

export default function Invitations() {
  return (
    <RequireAuth>
      <RequireSubscription>
        <InvitationsPage />
      </RequireSubscription>
    </RequireAuth>
  );
}
