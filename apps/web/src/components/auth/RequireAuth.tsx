"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMe } from "@shared/api/hooks/auth/useMe";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();

  useEffect(() => {
    if (me.isFetched && me.isError) {
      router.replace("/login/");
    }
  }, [me.isFetched, me.isError, router]);

  // Redirect un-onboarded users to /onboarding (unless already there)
  useEffect(() => {
    if (
      me.data &&
      me.data.profile &&
      !me.data.profile.hasCompletedOnboarding &&
      pathname !== "/onboarding"
    ) {
      router.replace("/onboarding");
    }
  }, [me.data, pathname, router]);

  if (me.isLoading) {
    return <div className="p-6">Loading…</div>;
  }

  if (me.isError) {
    return null; // redirect is happening
  }

  return <>{children}</>;
}
