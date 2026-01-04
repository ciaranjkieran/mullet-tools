// src/shared/api/auth/ensureCsrf.ts
import api from "../../axios";

export async function ensureCsrf() {
  const res = await api.get<{ csrftoken: string }>("/auth/csrf/");
  api.defaults.headers.common["X-CSRFToken"] = res.data.csrftoken;
  return res.data.csrftoken;
}
