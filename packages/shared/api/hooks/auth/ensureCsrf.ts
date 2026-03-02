import api, { getAuthMode } from "../../axios";

export async function ensureCsrf() {
  // Token auth (mobile) does not need CSRF
  if (getAuthMode() === "token") return;

  const res = await api.get<{ csrftoken: string }>("/auth/csrf/");
  api.defaults.headers.common["X-CSRFToken"] = res.data.csrftoken;
  return res.data.csrftoken;
}
