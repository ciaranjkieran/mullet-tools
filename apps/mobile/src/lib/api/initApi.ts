// Side-effect module: configures the shared axios instance for mobile (token auth).
// Must be imported before any API calls are made.

import api, { configureApi } from "@shared/api/axios";
import { setOnTokenReceived, setOnTokenCleared } from "@shared/api/hooks/auth/tokenCallbacks";
import { setOnLogoutCleanup } from "@shared/api/hooks/auth/useLogout";
import { resetAllStores } from "@shared/store/resetAllStores";
import { getToken, setToken, clearToken } from "../auth/tokenStorage";
import { useAuthStore } from "../store/useAuthStore";

const API_URL = "https://mullet-tools-backend.onrender.com/api";

configureApi(
  {
    baseURL: API_URL,
    authMode: "token",
  },
  getToken
);

// If any request returns 401, the token is invalid — clear it and force re-login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearToken();
      resetAllStores();
      useAuthStore.getState().setAuthenticated(false);
    }
    return Promise.reject(error);
  }
);

// Wire up token persistence
setOnTokenReceived(async (token: string) => {
  await setToken(token);
});

setOnTokenCleared(async () => {
  await clearToken();
});

// Wire up store resets for logout
setOnLogoutCleanup(() => {
  resetAllStores();
});
