import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http } from "../../shared/api/http";

const BASE = "/v1/users";

function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((i) => i.msg).join(". ");
  return fallback;
}

export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async ({ activeOnly = false } = {}, { rejectWithValue }) => {
    try {
      const params = { limit: 200 };
      if (activeOnly) params.is_active = true;
      const { data } = await http.get(BASE, { params });
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось загрузить пользователей."));
    }
  },
);

export const createUser = createAsyncThunk(
  "users/createUser",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await http.post(BASE, payload);
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось создать пользователя."));
    }
  },
);

export const updateUser = createAsyncThunk(
  "users/updateUser",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await http.patch(`${BASE}/${id}`, payload);
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось обновить пользователя."));
    }
  },
);

export const deactivateUser = createAsyncThunk(
  "users/deactivateUser",
  async (id, { rejectWithValue }) => {
    try {
      await http.delete(`${BASE}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось деактивировать пользователя."));
    }
  },
);

const usersSlice = createSlice({
  name: "users",
  initialState: {
    users: [],
    listStatus: "idle",
    listError: null,
    createStatus: "idle",
    createError: null,
    updateStatus: "idle",
    updateError: null,
    deactivateStatus: "idle",
    deactivateError: null,
  },
  reducers: {
    clearCreateState(state) {
      state.createStatus = "idle";
      state.createError = null;
    },
    clearUpdateState(state) {
      state.updateStatus = "idle";
      state.updateError = null;
    },
    clearDeactivateState(state) {
      state.deactivateStatus = "idle";
      state.deactivateError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.listStatus = "loading";
        state.listError = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.listStatus = "failed";
        state.listError = action.payload ?? "Не удалось загрузить пользователей.";
      })
      .addCase(createUser.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        state.users = [action.payload, ...state.users];
      })
      .addCase(createUser.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload ?? "Не удалось создать пользователя.";
      })
      .addCase(updateUser.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        state.users = state.users.map((u) =>
          u.id === action.payload.id ? action.payload : u,
        );
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload ?? "Не удалось обновить пользователя.";
      })
      .addCase(deactivateUser.pending, (state) => {
        state.deactivateStatus = "loading";
        state.deactivateError = null;
      })
      .addCase(deactivateUser.fulfilled, (state, action) => {
        state.deactivateStatus = "succeeded";
        state.users = state.users.filter((u) => u.id !== action.payload);
      })
      .addCase(deactivateUser.rejected, (state, action) => {
        state.deactivateStatus = "failed";
        state.deactivateError = action.payload ?? "Не удалось деактивировать пользователя.";
      });
  },
});

export const { clearCreateState, clearUpdateState, clearDeactivateState } = usersSlice.actions;
export const usersReducer = usersSlice.reducer;
