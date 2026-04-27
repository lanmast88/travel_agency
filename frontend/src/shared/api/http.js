import axios from "axios";

const AUTH_STORAGE_KEY = "stacktravel-auth";

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
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    clearStoredAuth();
    return null;
  }
}

function writeStoredAuth(data) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

function clearStoredAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

function emitSessionExpired() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("auth:session-expired", {
      detail: {
        message: "Сессия истекла. Войдите снова, чтобы продолжить.",
      },
    }),
  );
}

function isRefreshRequest(url) {
  return url?.includes("/v1/auth/refresh");
}

async function refreshSession() {
  const auth = readStoredAuth();
  const refreshToken = auth?.refresh_token;

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const { data } = await refreshClient.post("/v1/auth/refresh", {
    refresh_token: refreshToken,
  });

  writeStoredAuth(data);
  return data;
}

http.interceptors.request.use((config) => {
  if (typeof window === "undefined") {
    return config;
  }

  const auth = readStoredAuth();
  const accessToken = auth?.access_token;

  if (!accessToken) {
    return config;
  }

  config.headers.Authorization = `Bearer ${accessToken}`;

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    if (error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshRequest(originalRequest.url)) {
      clearStoredAuth();
      emitSessionExpired();
      return Promise.reject(error);
    }

    const auth = readStoredAuth();

    if (!auth?.refresh_token) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshRequest) {
        refreshRequest = refreshSession().finally(() => {
          refreshRequest = null;
        });
      }

      const refreshedAuth = await refreshRequest;
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${refreshedAuth.access_token}`;

      return http(originalRequest);
    } catch (refreshError) {
      clearStoredAuth();
      emitSessionExpired();
      return Promise.reject(refreshError);
    }
  },
);
