import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sdps_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Resolves a candidate photo URL.
 * - Absolute URLs (https://, data:) → returned as-is.
 * - Relative `/api/...` (lazy photo endpoint) → prefixed with BACKEND_URL.
 * - Empty / missing → null (caller renders an initial-letter placeholder).
 */
export const photoUrl = (photo) => {
  if (!photo) return null;
  if (/^(https?:|data:)/i.test(photo)) return photo;
  if (photo.startsWith("/")) return `${BACKEND_URL}${photo}`;
  return photo;
};

