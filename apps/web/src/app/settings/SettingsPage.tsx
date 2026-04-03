"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@shared/api/hooks/auth/useMe";
import { useUpdateProfile } from "@shared/api/hooks/auth/useUpdateProfile";
import { useDeleteAccount } from "@shared/api/hooks/auth/useDeleteAccount";
import api from "@shared/api/axios";

export default function SettingsPage() {
  const router = useRouter();
  const me = useMe();
  const updateProfile = useUpdateProfile();
  const deleteAccount = useDeleteAccount();

  const [displayName, setDisplayName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteTyped, setDeleteTyped] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when user data loads
  useEffect(() => {
    if (me.data?.profile) {
      setDisplayName(me.data.profile.displayName || "");
      const raw = me.data.profile.avatar || null;
      // Avatar URL from API is relative (/media/...) — prefix with backend origin
      if (raw && !raw.startsWith("http") && !raw.startsWith("blob:")) {
        const origin = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
        setAvatarPreview(`${origin}${raw}`);
      } else {
        setAvatarPreview(raw);
      }
    }
  }, [me.data]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);

    const formData = new FormData();
    formData.append("displayName", displayName);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    await updateProfile.mutateAsync(formData);
    setAvatarFile(null);
    setSaved(true);
  }

  if (me.isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight mb-8">
          Account Settings
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-3">
              Profile Photo
            </label>
            <div className="flex items-center gap-5">
              <div
                className="w-20 h-20 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl text-neutral-400">
                    {displayName?.[0]?.toUpperCase() ||
                      me.data?.email?.[0]?.toUpperCase() ||
                      "?"}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-neutral-700 border border-neutral-300 rounded-md px-4 py-2 hover:bg-neutral-50 transition"
              >
                Upload photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-neutral-700 mb-2"
            >
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you want to appear to collaborators"
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-800"
              maxLength={100}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Email
            </label>
            <p className="text-sm text-neutral-500">{me.data?.email}</p>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              {updateProfile.isPending ? "Saving..." : "Save changes"}
            </button>

            {saved && !updateProfile.isPending && (
              <span className="text-sm text-green-600 font-medium">
                Saved
              </span>
            )}

            {updateProfile.isError && (
              <span className="text-sm text-red-600 font-medium">
                Failed to save. Please try again.
              </span>
            )}
          </div>
        </form>

        {/* ── Data Export ── */}
        <div className="mt-12 border-t border-neutral-200 pt-8">
          <h2 className="text-lg font-semibold tracking-tight mb-1">
            Export Your Data
          </h2>
          <p className="text-sm text-neutral-500 mb-5">
            Download a copy of all your data including modes, goals, projects,
            milestones, tasks, time entries, notes, comments, pins, and
            templates.
          </p>
          <div className="flex gap-3">
            <ExportButton format="json" label="Download JSON" />
            <ExportButton format="csv" label="Download CSV (zip)" />
          </div>
        </div>

        {/* ── Delete Account ── */}
        <div className="mt-12 border-t border-red-200 pt-8 pb-12">
          <h2 className="text-lg font-semibold tracking-tight text-red-700 mb-1">
            Delete Account
          </h2>
          <p className="text-sm text-neutral-500 mb-5">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-md border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
            >
              Delete my account
            </button>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 space-y-4">
              <p className="text-sm font-medium text-red-800">
                This will permanently delete your account, all modes, entities,
                time entries, and cancel any active subscription. This cannot be
                undone.
              </p>

              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Password"
                  className="w-full border border-red-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">
                  Type <span className="font-bold">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteTyped}
                  onChange={(e) => setDeleteTyped(e.target.value)}
                  placeholder="DELETE"
                  className="w-full border border-red-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {deleteAccount.isError && (
                <p className="text-sm text-red-600">
                  {(deleteAccount.error as any)?.response?.data?.detail ??
                    "Failed to delete account."}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword("");
                    setDeleteTyped("");
                  }}
                  className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    deleteTyped !== "DELETE" ||
                    !deletePassword ||
                    deleteAccount.isPending
                  }
                  onClick={async () => {
                    try {
                      await deleteAccount.mutateAsync(deletePassword);
                      router.replace("/login");
                    } catch {
                      // error shown in UI
                    }
                  }}
                  className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
                >
                  {deleteAccount.isPending
                    ? "Deleting..."
                    : "Permanently delete account"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function ExportButton({ format, label }: { format: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleExport() {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/auth/export/?export_format=${format}`, {
        responseType: "blob",
      });
      const ext = format === "csv" ? "zip" : "json";
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mullet-export.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
      >
        {loading ? "Exporting..." : label}
      </button>
      {error && (
        <span className="text-xs text-red-600 mt-1">
          Export failed. Please try again.
        </span>
      )}
    </div>
  );
}
