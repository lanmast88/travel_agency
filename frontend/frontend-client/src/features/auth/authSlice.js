import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http, writeStoredAuth, clearStoredAuth } from "../../shared/api/http";

const AUTH_STORAGE_KEY = "stacktravel-client-auth";

function loadPersistedAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const PYDANTIC_RU = {
  "Field required": "Заполните все обязательные поля",
  "value is not a valid email address": "Некорректный адрес email",
  "String should have at least 1 character": "Поле не может быть пустым",
  "String should have at least 8 characters": "Минимум 8 символов",
  "String should have at most 255 characters": "Слишком длинное значение",
};

function getErrorMessage(error, fallback) {
  if (!error.response) return "Нет соединения с сервером";
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = [...new Set(detail.map((i) => PYDANTIC_RU[i.msg] ?? i.msg))];
    return msgs.join(". ");
  }
  return fallback;
}

async function completeAuthRequest(request) {
  const { data } = await request;
  writeStoredAuth(data);
  let currentUser = null;
  try {
    const r = await http.get("/v1/users/me");
    currentUser = r.data;
  } catch {}
  return { ...data, currentUser };
}

export const registerUser = createAsyncThunk("auth/register", async (payload, { rejectWithValue }) => {
  try {
    return await completeAuthRequest(http.post("/v1/auth/register", payload));
  } catch (e) {
    return rejectWithValue(getErrorMessage(e, "Не удалось зарегистрироваться."));
  }
});

export const loginUser = createAsyncThunk("auth/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    const body = new URLSearchParams();
    body.set("username", email.trim());
    body.set("password", password);
    return await completeAuthRequest(
      http.post("/v1/auth/login", body, { headers: { "Content-Type": "application/x-www-form-urlencoded" } }),
    );
  } catch (e) {
    return rejectWithValue(getErrorMessage(e, "Неверный email или пароль."));
  }
});

export const fetchCurrentUser = createAsyncThunk("auth/fetchMe", async (_, { rejectWithValue }) => {
  try {
    const { data } = await http.get("/v1/users/me");
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e, "Не удалось загрузить профиль."));
  }
});

export const updateCurrentUser = createAsyncThunk("auth/updateMe", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await http.patch("/v1/users/me", payload);
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e, "Не удалось сохранить профиль."));
  }
});

export const changePassword = createAsyncThunk("auth/changePassword", async (payload, { rejectWithValue }) => {
  try {
    await http.patch("/v1/users/me/password", payload);
  } catch (e) {
    return rejectWithValue(getErrorMessage(e, "Не удалось изменить пароль."));
  }
});

export const logoutUser = createAsyncThunk("auth/logout", async (_, { getState }) => {
  const { refreshToken } = getState().auth;
  if (refreshToken) {
    try { await http.post("/v1/auth/logout", { refresh_token: refreshToken }); } catch {}
  }
});

function resetAuth(state) {
  state.accessToken = null;
  state.refreshToken = null;
  state.currentUser = null;
  state.loginStatus = "idle";
  state.loginError = null;
  state.registerStatus = "idle";
  state.registerError = null;
  state.profileStatus = "idle";
  state.profileUpdateStatus = "idle";
  state.profileUpdateError = null;
  state.passwordStatus = "idle";
  state.passwordError = null;
  state.dialogOpen = false;
  state.dialogMessage = null;
  clearStoredAuth();
}

const persisted = loadPersistedAuth();

const authSlice = createSlice({
  name: "auth",
  initialState: {
    accessToken: persisted?.access_token ?? null,
    refreshToken: persisted?.refresh_token ?? null,
    currentUser: null,
    loginStatus: "idle",
    loginError: null,
    registerStatus: "idle",
    registerError: null,
    profileStatus: "idle",
    profileError: null,
    profileUpdateStatus: "idle",
    profileUpdateError: null,
    passwordStatus: "idle",
    passwordError: null,
    dialogOpen: false,
    dialogMode: "login",
    dialogMessage: null,
  },
  reducers: {
    openAuthDialog(state, action) {
      state.dialogOpen = true;
      state.dialogMode = action.payload?.mode ?? "login";
      state.dialogMessage = action.payload?.message ?? null;
    },
    closeAuthDialog(state) {
      state.dialogOpen = false;
      state.dialogMessage = null;
    },
    expireSession(state, action) {
      resetAuth(state);
      state.dialogOpen = true;
      state.dialogMode = "login";
      state.dialogMessage = action.payload ?? "Сессия истекла. Войдите снова.";
    },
    logout(state) { resetAuth(state); },
    clearPasswordState(state) { state.passwordStatus = "idle"; state.passwordError = null; },
  },
  extraReducers: (b) => {
    b
      .addCase(loginUser.pending, (s) => { s.loginStatus = "loading"; s.loginError = null; })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.loginStatus = "succeeded"; s.loginError = null;
        s.accessToken = a.payload.access_token; s.refreshToken = a.payload.refresh_token;
        s.currentUser = a.payload.currentUser; s.dialogOpen = false; s.dialogMessage = null;
      })
      .addCase(loginUser.rejected, (s, a) => { s.loginStatus = "failed"; s.loginError = a.payload; })

      .addCase(registerUser.pending, (s) => { s.registerStatus = "loading"; s.registerError = null; })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.registerStatus = "succeeded"; s.registerError = null;
        s.accessToken = a.payload.access_token; s.refreshToken = a.payload.refresh_token;
        s.currentUser = a.payload.currentUser; s.dialogMessage = null;
      })
      .addCase(registerUser.rejected, (s, a) => { s.registerStatus = "failed"; s.registerError = a.payload; })

      .addCase(fetchCurrentUser.pending, (s) => { s.profileStatus = "loading"; s.profileError = null; })
      .addCase(fetchCurrentUser.fulfilled, (s, a) => { s.profileStatus = "succeeded"; s.currentUser = a.payload; })
      .addCase(fetchCurrentUser.rejected, (s, a) => { s.profileStatus = "failed"; s.profileError = a.payload; })

      .addCase(updateCurrentUser.pending, (s) => { s.profileUpdateStatus = "loading"; s.profileUpdateError = null; })
      .addCase(updateCurrentUser.fulfilled, (s, a) => { s.profileUpdateStatus = "succeeded"; s.currentUser = a.payload; })
      .addCase(updateCurrentUser.rejected, (s, a) => { s.profileUpdateStatus = "failed"; s.profileUpdateError = a.payload; })

      .addCase(changePassword.pending, (s) => { s.passwordStatus = "loading"; s.passwordError = null; })
      .addCase(changePassword.fulfilled, (s) => { s.passwordStatus = "succeeded"; })
      .addCase(changePassword.rejected, (s, a) => { s.passwordStatus = "failed"; s.passwordError = a.payload; })

      .addCase(logoutUser.fulfilled, resetAuth);
  },
});

export const { openAuthDialog, closeAuthDialog, expireSession, logout, clearPasswordState } = authSlice.actions;
export const authReducer = authSlice.reducer;
