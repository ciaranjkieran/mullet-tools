"use client";

import { useState, useRef, useEffect } from "react";
import { useMe } from "@shared/api/hooks/auth/useMe";
import { useUpdateProfile } from "@shared/api/hooks/auth/useUpdateProfile";

export default function SettingsPage() {
  const me = useMe();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state when user data loads
  useEffect(() => {
    if (me.data?.profile) {
      setDisplayName(me.data.profile.displayName || "");
      setAvatarPreview(me.data.profile.avatar || null);
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
      </div>
    </main>
  );
}
