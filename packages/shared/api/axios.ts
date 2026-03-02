import axios from "axios";

type AuthMode = "session" | "token";

interface ApiConfig {
  baseURL: string;
  authMode: AuthMode;
  onSubscriptionExpired?: () => void;
}

let _authMode: AuthMode = "session";

const api = axios.create();

/**
 * Called once at app boot by each platform.
 *
 * Web:    configureApi({ baseURL: "…/api", authMode: "session", onSubscriptionExpired })
 * Mobile: configureApi({ baseURL: "…/api", authMode: "token" }, tokenGetter)
 */
export function configureApi(
  config: ApiConfig,
  tokenGetter?: () => Promise<string | null>
) {
  _authMode = config.authMode;
  api.defaults.baseURL = config.baseURL;

  if (config.authMode === "session") {
    api.defaults.withCredentials = true;
    api.defaults.xsrfCookieName = "csrftoken";
    api.defaults.xsrfHeaderName = "X-CSRFToken";
  }

  // Token mode: inject Authorization header on every request
  if (config.authMode === "token" && tokenGetter) {
    api.interceptors.request.use(async (reqConfig) => {
      const token = await tokenGetter();
      if (token) {
        reqConfig.headers.Authorization = `Token ${token}`;
      }
      return reqConfig;
    });
  }

  // Response interceptor: detect subscription expiry
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        error.response?.status === 403 &&
        error.response?.data?.code === "subscription_expired"
      ) {
        config.onSubscriptionExpired?.();
      }
      return Promise.reject(error);
    }
  );
}

export function getAuthMode(): AuthMode {
  return _authMode;
}

export default api;
