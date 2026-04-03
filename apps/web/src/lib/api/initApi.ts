// Side-effect module: configures the shared axios instance for web (session auth).
// Must be imported before any API calls are made.

import { configureApi } from "@shared/api/axios";
import { ensureCsrf } from "@shared/api/hooks/auth/ensureCsrf";
import { setOnLogoutCleanup } from "@shared/api/hooks/auth/useLogout";
import { resetAllStores } from "@shared/store/resetAllStores";
import { useTimerUIStore } from "@/lib/store/useTimerUIStore";

configureApi({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api",
  authMode: "session",
  onSubscriptionExpired: () => {
    window.dispatchEvent(new CustomEvent("subscription:expired"));
  },
});

// Eagerly fetch CSRF token so the first write request doesn't fail
if (typeof window !== "undefined") {
  ensureCsrf().catch(() => {});
}

// Inject store reset logic for logout (includes web-only useTimerUIStore)
setOnLogoutCleanup(() => {
  resetAllStores();
  useTimerUIStore.getState().reset?.();
});
