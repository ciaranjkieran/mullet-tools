"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@shared/api/hooks/auth/useMe";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const me = useMe();

  useEffect(() => {
    if (me.isFetched && me.isError) {
      router.replace("/login/");
    }
  }, [me.isFetched, me.isError, router]);

  if (me.isLoading) {
    return <div className="p-6">Loading…</div>;
  }

  if (me.isError) {
    return null; // redirect is happening
  }

  return <>{children}</>;
}
