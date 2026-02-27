"use client";

import { useMyInvitations } from "@shared/api/hooks/collaboration/useMyInvitations";
import { useRespondToInvitation } from "@shared/api/hooks/collaboration/useRespondToInvitation";
import { Mail, Check, X } from "lucide-react";

export default function InvitationsPage() {
  const { data: invitations, isLoading } = useMyInvitations();
  const respond = useRespondToInvitation();

  async function handleRespond(invitationId: number, action: "accept" | "decline") {
    await respond.mutateAsync({ invitationId, action });
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  const pending = invitations ?? [];

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight mb-8">
          Invitations
        </h1>

        {pending.length === 0 ? (
          <div className="text-center py-16">
            <Mail className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">No pending invitations.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: inv.modeColor }}
                  >
                    {inv.modeTitle[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {inv.modeTitle}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Invited by{" "}
                      {inv.invitedBy.profile?.displayName ||
                        inv.invitedBy.username}{" "}
                      &middot; {inv.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRespond(inv.id, "accept")}
                    disabled={respond.isPending}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition"
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(inv.id, "decline")}
                    disabled={respond.isPending}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 transition"
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
