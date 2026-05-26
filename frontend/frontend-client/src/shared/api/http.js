import axios from "axios";

const AUTH_STORAGE_KEY = "stacktravel-client-auth";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 10000,
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 10000,
});

let refreshRequest = null;

function readStoredAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    clearStoredAuth();
    return null;
  }
}

export function writeStoredAuth(data) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

export function clearStoredAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

function emitSessionExpired() {
  window.dispatchEvent(
    new CustomEvent("auth:session-expired", {
      detail: { message: "Сессия истекла. Войдите снова." },
    }),
  );
}

http.interceptors.request.use((config) => {
  const auth = readStoredAuth();
  if (auth?.access_token) {
    config.headers.Authorization = `Bearer ${auth.access_token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || !originalRequest) return Promise.reject(error);
    if (error.response.status !== 401 || originalRequest._retry) return Promise.reject(error);
    if (originalRequest.url?.includes("/v1/auth/refresh")) {
      clearStoredAuth();
      emitSessionExpired();
      return Promise.reject(error);
    }

    const auth = readStoredAuth();
    if (!auth?.refresh_token) return Promise.reject(error);

    originalRequest._retry = true;

    try {
      if (!refreshRequest) {
        refreshRequest = refreshClient
          .post("/v1/auth/refresh", { refresh_token: auth.refresh_token })
          .then((r) => { writeStoredAuth(r.data); return r.data; })
          .finally(() => { refreshRequest = null; });
      }

      const refreshed = await refreshRequest;
      originalRequest.headers.Authorization = `Bearer ${refreshed.access_token}`;
      return http(originalRequest);
    } catch {
      clearStoredAuth();
      emitSessionExpired();
      return Promise.reject(error);
    }
  },
);
