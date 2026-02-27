"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useEffect } from "react";
import { X, UserPlus, Users, Trash2, Mail, Crown } from "lucide-react";

import { useModeCollaborators } from "@shared/api/hooks/collaboration/useModeCollaborators";
import { useInviteToMode } from "@shared/api/hooks/collaboration/useInviteToMode";
import { useRemoveCollaborator } from "@shared/api/hooks/collaboration/useRemoveCollaborator";
import { useCancelInvitation } from "@shared/api/hooks/collaboration/useCancelInvitation";
import { useModeStore } from "@shared/store/useModeStore";
import { useMe } from "@shared/api/hooks/auth/useMe";

import type { ModeCollaborator } from "@shared/types/Collaboration";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  modeId: number | null;
}

export default function ModeCollaborationModal({
  isOpen,
  onClose,
  modeId,
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [error, setError] = useState<string | null>(null);

  const modes = useModeStore((s) => s.modes);
  const mode = modes.find((m) => m.id === modeId) ?? null;

  const me = useMe();
  const { data, isLoading } = useModeCollaborators(modeId);
  const invite = useInviteToMode();
  const remove = useRemoveCollaborator();
  const cancel = useCancelInvitation();

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setRole("editor");
      setError(null);
    }
  }, [isOpen]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!modeId || !email.trim()) return;
    setError(null);

    try {
      await invite.mutateAsync({ modeId, email: email.trim().toLowerCase(), role });
      setEmail("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send invitation.");
    }
  }

  async function handleRemove(collaborator: ModeCollaborator) {
    if (!modeId) return;
    await remove.mutateAsync({ modeId, collaboratorId: collaborator.id });
  }

  async function handleCancelInvite(invitationId: number) {
    if (!modeId) return;
    await cancel.mutateAsync({ invitationId, modeId });
  }

  const isOwner = mode?.isOwned ?? false;
  const collaborators = data?.collaborators ?? [];
  const pendingInvitations = data?.pendingInvitations ?? [];

  function getDisplayName(user: ModeCollaborator["user"]) {
    if (user.profile?.displayName) return user.profile.displayName;
    return user.username;
  }

  function getInitial(user: ModeCollaborator["user"]) {
    if (user.profile?.displayName) return user.profile.displayName[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "?";
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden"
          style={{ boxShadow: `0 0 0 2px ${mode?.color || "#000000"}, 0 25px 50px -12px rgba(0,0,0,0.25)` }}
        >
          {/* Header with mode color */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ backgroundColor: mode?.color || "#000000" }}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-white" />
              <Dialog.Title className="text-lg font-semibold text-white">
                {mode?.title || "Collaboration"}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="text-white/80 hover:text-white transition p-1">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Owner info */}
            <div className="flex items-center gap-3 text-sm text-neutral-600">
              <Crown className="w-4 h-4 text-amber-500" />
              <span>
                {isOwner ? "You own this mode" : `Owned by ${mode?.ownerName || "unknown"}`}
              </span>
            </div>

            {/* Invite form (owner only) */}
            {isOwner && (
              <form onSubmit={handleInvite} className="space-y-3">
                <label className="block text-sm font-medium text-neutral-700">
                  Invite collaborator
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="flex-1 border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-800"
                    required
                  />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
                    className="border border-neutral-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-800"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="submit"
                    disabled={invite.isPending || !email.trim()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    {invite.isPending ? "Sending..." : "Invite"}
                  </button>
                </div>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
              </form>
            )}

            {/* Loading state */}
            {isLoading && (
              <p className="text-sm text-neutral-500">Loading collaborators...</p>
            )}

            {/* Collaborators list */}
            {collaborators.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-700">
                  Collaborators ({collaborators.length})
                </h3>
                <ul className="space-y-2">
                  {collaborators.map((collab) => (
                    <li
                      key={collab.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden text-sm font-medium text-neutral-600">
                          {collab.user.profile?.avatar ? (
                            <img
                              src={collab.user.profile.avatar}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getInitial(collab.user)
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {getDisplayName(collab.user)}
                            {collab.user.id === me.data?.id && (
                              <span className="ml-1.5 text-xs text-neutral-400">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-neutral-500">{collab.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400 capitalize">
                          {collab.role}
                        </span>
                        {isOwner && (
                          <button
                            onClick={() => handleRemove(collab)}
                            disabled={remove.isPending}
                            className="text-neutral-400 hover:text-red-500 transition p-1"
                            title="Remove collaborator"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pending invitations */}
            {pendingInvitations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-700">
                  Pending invitations ({pendingInvitations.length})
                </h3>
                <ul className="space-y-2">
                  {pendingInvitations.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-50 border border-amber-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {inv.email}
                          </p>
                          <p className="text-xs text-neutral-500 capitalize">
                            {inv.role} &middot; Pending
                          </p>
                        </div>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          disabled={cancel.isPending}
                          className="text-xs text-neutral-500 hover:text-red-500 transition"
                        >
                          Cancel
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Empty state */}
            {!isLoading &&
              collaborators.length === 0 &&
              pendingInvitations.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">
                    {isOwner
                      ? "No collaborators yet. Invite someone to get started."
                      : "No other collaborators on this mode."}
                  </p>
                </div>
              )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
