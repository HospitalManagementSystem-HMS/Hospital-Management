import axios from "axios";
import { getToken, clearToken } from "./authStorage";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://15.206.100.247:8080/api",
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) clearToken();
    return Promise.reject(err);
  }
);

