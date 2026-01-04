// lib/api/axios.ts
import axios from "axios";

const api =
  typeof window !== "undefined"
    ? axios.create({
        baseURL: `${window.location.protocol}//${window.location.hostname}:8000/api`,
        withCredentials: true,
        xsrfCookieName: "csrftoken",
        xsrfHeaderName: "X-CSRFToken",
      })
    : axios.create({
        baseURL: "http://localhost:8000/api",
      });

export default api;
