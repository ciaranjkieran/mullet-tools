import api, { getAuthMode } from "../../axios";

let _csrfPromise: Promise<string | undefined> | null = null;

export async function ensureCsrf() {
  // Token auth (mobile) does not need CSRF
  if (getAuthMode() === "token") return;

  // Already have a token cached on the axios instance
  if (api.defaults.headers.common["X-CSRFToken"]) return;

  // Deduplicate concurrent calls
  if (!_csrfPromise) {
    _csrfPromise = api
      .get<{ csrftoken: string }>("/auth/csrf/")
      .then((res) => {
        api.defaults.headers.common["X-CSRFToken"] = res.data.csrftoken;
        return res.data.csrftoken;
      })
      .catch((err) => {
        _csrfPromise = null;
        throw err;
      });
  }

  return _csrfPromise;
}
