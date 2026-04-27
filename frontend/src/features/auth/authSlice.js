import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http } from "../../shared/api/http";

const AUTH_STORAGE_KEY = "stacktravel-auth";

function loadPersistedAuth() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistAuth(data) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

function clearPersistedAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function completeAuthRequest(request) {
  const { data } = await request;
  persistAuth(data);

  let currentUser = null;

  try {
    const profileResponse = await http.get("/v1/users/me");
    currentUser = profileResponse.data;
  } catch {
    currentUser = null;
  }

  return {
    ...data,
    currentUser,
  };
}

function getErrorMessage(error, fallbackMessage) {
  if (!error.response) {
    return "Нет соединения с auth-service";
  }

  const detail = error.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(". ");
  }

  return fallbackMessage;
}

const persistedAuth = loadPersistedAuth();

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (payload, { rejectWithValue }) => {
    try {
      return await completeAuthRequest(http.post("/v1/auth/register", payload));
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось зарегистрироваться. Попробуйте ещё раз."),
      );
    }
  },
);

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const payload = new URLSearchParams();
      payload.set("username", email.trim());
      payload.set("password", password);

      return await completeAuthRequest(
        http.post("/v1/auth/login", payload, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }),
      );
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось войти. Проверьте email и пароль."),
      );
    }
  },
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await http.get("/v1/users/me");
      return data;
    } catch (error) {
      const detail = error.response?.data?.detail;

      if (typeof detail === "string") {
        return rejectWithValue(detail);
      }

      return rejectWithValue("Не удалось загрузить профиль.");
    }
  },
);

export const updateCurrentUser = createAsyncThunk(
  "auth/updateCurrentUser",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await http.patch("/v1/users/me", payload);
      return data;
    } catch (error) {
      const detail = error.response?.data?.detail;

      if (typeof detail === "string") {
        return rejectWithValue(detail);
      }

      if (Array.isArray(detail)) {
        return rejectWithValue(detail.map((item) => item.msg).join(". "));
      }

      return rejectWithValue("Не удалось сохранить профиль.");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    accessToken: persistedAuth?.access_token ?? null,
    refreshToken: persistedAuth?.refresh_token ?? null,
    tokenType: persistedAuth?.token_type ?? null,
    expiresIn: persistedAuth?.expires_in ?? null,
    refreshExpiresIn: persistedAuth?.refresh_expires_in ?? null,
    currentUser: null,
    registerStatus: "idle",
    registerError: null,
    loginStatus: "idle",
    loginError: null,
    profileStatus: "idle",
    profileError: null,
    profileUpdateStatus: "idle",
    profileUpdateError: null,
    authDialogOpen: false,
    authDialogMode: "login",
    authDialogMessage: null,
  },
  reducers: {
    clearRegisterError(state) {
      state.registerError = null;
    },
    clearLoginError(state) {
      state.loginError = null;
    },
    clearProfileError(state) {
      state.profileError = null;
      state.profileUpdateError = null;
    },
    closeAuthDialog(state) {
      state.authDialogOpen = false;
      state.authDialogMessage = null;
    },
    openAuthDialog(state, action) {
      state.authDialogOpen = true;
      state.authDialogMode = action.payload?.mode ?? "login";
      state.authDialogMessage = action.payload?.message ?? null;
    },
    expireSession(state, action) {
      state.accessToken = null;
      state.refreshToken = null;
      state.tokenType = null;
      state.expiresIn = null;
      state.refreshExpiresIn = null;
      state.currentUser = null;
      state.registerStatus = "idle";
      state.registerError = null;
      state.loginStatus = "idle";
      state.loginError = null;
      state.profileStatus = "idle";
      state.profileError = null;
      state.profileUpdateStatus = "idle";
      state.profileUpdateError = null;
      state.authDialogOpen = true;
      state.authDialogMode = "login";
      state.authDialogMessage =
        action.payload ?? "Сессия истекла. Войдите снова, чтобы продолжить.";
      clearPersistedAuth();
    },
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.tokenType = null;
      state.expiresIn = null;
      state.refreshExpiresIn = null;
      state.currentUser = null;
      state.registerStatus = "idle";
      state.registerError = null;
      state.loginStatus = "idle";
      state.loginError = null;
      state.profileStatus = "idle";
      state.profileError = null;
      state.profileUpdateStatus = "idle";
      state.profileUpdateError = null;
      state.authDialogOpen = false;
      state.authDialogMessage = null;
      clearPersistedAuth();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.registerStatus = "loading";
        state.registerError = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.registerStatus = "succeeded";
        state.registerError = null;
        state.accessToken = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.tokenType = action.payload.token_type;
        state.expiresIn = action.payload.expires_in;
        state.refreshExpiresIn = action.payload.refresh_expires_in;
        state.currentUser = action.payload.currentUser;
        state.authDialogMessage = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.registerStatus = "failed";
        state.registerError =
          action.payload ??
          "Не удалось зарегистрироваться. Попробуйте ещё раз.";
      })
      .addCase(loginUser.pending, (state) => {
        state.loginStatus = "loading";
        state.loginError = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loginStatus = "succeeded";
        state.loginError = null;
        state.accessToken = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.tokenType = action.payload.token_type;
        state.expiresIn = action.payload.expires_in;
        state.refreshExpiresIn = action.payload.refresh_expires_in;
        state.currentUser = action.payload.currentUser;
        state.authDialogOpen = false;
        state.authDialogMessage = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loginStatus = "failed";
        state.loginError =
          action.payload ?? "Не удалось войти. Проверьте email и пароль.";
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.profileStatus = "loading";
        state.profileError = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.profileStatus = "succeeded";
        state.profileError = null;
        state.currentUser = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.profileStatus = "failed";
        state.profileError = action.payload ?? "Не удалось загрузить профиль.";
      })
      .addCase(updateCurrentUser.pending, (state) => {
        state.profileUpdateStatus = "loading";
        state.profileUpdateError = null;
      })
      .addCase(updateCurrentUser.fulfilled, (state, action) => {
        state.profileUpdateStatus = "succeeded";
        state.profileUpdateError = null;
        state.currentUser = action.payload;
      })
      .addCase(updateCurrentUser.rejected, (state, action) => {
        state.profileUpdateStatus = "failed";
        state.profileUpdateError =
          action.payload ?? "Не удалось сохранить профиль.";
      });
  },
});

export const {
  clearLoginError,
  clearProfileError,
  clearRegisterError,
  closeAuthDialog,
  expireSession,
  logout,
  openAuthDialog,
} = authSlice.actions;
export const authReducer = authSlice.reducer;
