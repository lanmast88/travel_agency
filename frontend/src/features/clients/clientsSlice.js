import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http } from "../../shared/api/http";

const PAGE_SIZE = 20;
const BASE = "/v1/clients";

function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((i) => i.msg).join(". ");
  return fallback;
}

export const fetchClients = createAsyncThunk(
  "clients/fetchClients",
  async ({ page = 1, loyaltyLevel = null, search = "" } = {}, { rejectWithValue }) => {
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (loyaltyLevel) params.loyalty_level = loyaltyLevel;
      if (search.trim()) params.search = search.trim();
      const { data } = await http.get(BASE, { params });
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось загрузить клиентов."));
    }
  },
);

export const fetchClientsSummary = createAsyncThunk(
  "clients/fetchClientsSummary",
  async (_, { rejectWithValue }) => {
    try {
      const [all, bronze, silver, gold] = await Promise.all([
        http.get(BASE, { params: { page: 1, page_size: 1 } }),
        http.get(BASE, { params: { page: 1, page_size: 1, loyalty_level: "bronze" } }),
        http.get(BASE, { params: { page: 1, page_size: 1, loyalty_level: "silver" } }),
        http.get(BASE, { params: { page: 1, page_size: 1, loyalty_level: "gold" } }),
      ]);
      return {
        total: all.data.total,
        withDiscount: bronze.data.total + silver.data.total + gold.data.total,
        vip: gold.data.total,
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось загрузить статистику."));
    }
  },
);

export const createClient = createAsyncThunk(
  "clients/createClient",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await http.post(BASE, payload);
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось создать клиента."));
    }
  },
);

export const updateClient = createAsyncThunk(
  "clients/updateClient",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await http.patch(`${BASE}/${id}`, payload);
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось обновить клиента."));
    }
  },
);

export const deleteClient = createAsyncThunk(
  "clients/deleteClient",
  async (id, { rejectWithValue }) => {
    try {
      await http.delete(`${BASE}/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось удалить клиента."));
    }
  },
);

const clientsSlice = createSlice({
  name: "clients",
  initialState: {
    clients: [],
    total: 0,
    page: 1,
    pages: 0,
    listStatus: "idle",
    listError: null,

    summaryTotal: 0,
    summaryWithDiscount: 0,
    summaryVip: 0,
    summaryStatus: "idle",

    createStatus: "idle",
    createError: null,
    updateStatus: "idle",
    updateError: null,
    deleteStatus: "idle",
    deleteError: null,
  },
  reducers: {
    setPage(state, action) {
      state.page = action.payload;
    },
    clearCreateState(state) {
      state.createStatus = "idle";
      state.createError = null;
    },
    clearUpdateState(state) {
      state.updateStatus = "idle";
      state.updateError = null;
    },
    clearDeleteState(state) {
      state.deleteStatus = "idle";
      state.deleteError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.listStatus = "loading";
        state.listError = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.clients = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.listStatus = "failed";
        state.listError = action.payload ?? "Не удалось загрузить клиентов.";
      })
      .addCase(fetchClientsSummary.fulfilled, (state, action) => {
        state.summaryStatus = "succeeded";
        state.summaryTotal = action.payload.total;
        state.summaryWithDiscount = action.payload.withDiscount;
        state.summaryVip = action.payload.vip;
      })
      .addCase(createClient.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        state.clients = [action.payload, ...state.clients].slice(0, PAGE_SIZE);
        state.total += 1;
        state.pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
        state.summaryTotal += 1;
      })
      .addCase(createClient.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload ?? "Не удалось создать клиента.";
      })
      .addCase(updateClient.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        state.clients = state.clients.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        );
      })
      .addCase(updateClient.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload ?? "Не удалось обновить клиента.";
      })
      .addCase(deleteClient.pending, (state) => {
        state.deleteStatus = "loading";
        state.deleteError = null;
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        state.clients = state.clients.filter((c) => c.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
        state.pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
        state.summaryTotal = Math.max(0, state.summaryTotal - 1);
      })
      .addCase(deleteClient.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.deleteError = action.payload ?? "Не удалось удалить клиента.";
      });
  },
});

export const { setPage, clearCreateState, clearUpdateState, clearDeleteState } =
  clientsSlice.actions;
export const clientsReducer = clientsSlice.reducer;
