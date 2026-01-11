import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api`
    : "http://localhost:8000/api"; // fallback for local dev

const api = axios.create({
  baseURL,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

export default api;
