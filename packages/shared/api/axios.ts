import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL + "/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

// Detect subscription expiry from middleware 403 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === "subscription_expired"
    ) {
      window.dispatchEvent(new CustomEvent("subscription:expired"));
    }
    return Promise.reject(error);
  }
);

export default api;
