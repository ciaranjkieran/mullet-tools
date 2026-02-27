export const dynamic = "force-dynamic";
export const revalidate = 0;

import InvitationsPage from "./InvitationsPage";
import RequireAuth from "@/components/auth/RequireAuth";

export default function Invitations() {
  return (
    <RequireAuth>
      <InvitationsPage />
    </RequireAuth>
  );
}
