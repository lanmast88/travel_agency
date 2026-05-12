import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http } from "../../shared/api/http";

const BASE = "/v1/sales";
const PAGE_SIZE = 20;

function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((i) => i.msg).join(". ");
  return fallback;
}

export const fetchSales = createAsyncThunk(
  "sales/fetchSales",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { page, filters } = getState().sales;
      const params = { page, page_size: PAGE_SIZE };
      if (filters.status) params.status = filters.status;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      const { data } = await http.get(BASE, { params });
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось загрузить продажи."));
    }
  },
);

export const fetchSalesLookups = createAsyncThunk(
  "sales/fetchSalesLookups",
  async (_, { rejectWithValue }) => {
    try {
      const [clientsRes, toursRes, usersRes] = await Promise.all([
        http.get("/v1/clients", { params: { page: 1, page_size: 500 } }),
        http.get("/v1/tours", { params: { page: 1, page_size: 500 } }),
        http.get("/v1/users", { params: { limit: 500 } }),
      ]);
      return {
        clients: clientsRes.data.items,
        tours: toursRes.data.items,
        users: usersRes.data,
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось загрузить справочники."));
    }
  },
);

export const createSale = createAsyncThunk(
  "sales/createSale",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await http.post(BASE, payload);
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось создать продажу."));
    }
  },
);

export const cancelSale = createAsyncThunk(
  "sales/cancelSale",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await http.post(`${BASE}/${id}/cancel`);
      return data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Не удалось отменить продажу."));
    }
  },
);

const salesSlice = createSlice({
  name: "sales",
  initialState: {
    sales: [],
    total: 0,
    page: 1,
    pages: 0,
    listStatus: "idle",
    listError: null,

    filters: {
      status: "",
      dateFrom: "",
      dateTo: "",
    },

    clientsList: [],
    toursList: [],
    usersList: [],
    lookupsStatus: "idle",
    lookupsError: null,

    createStatus: "idle",
    createError: null,

    cancelStatus: "idle",
    cancelError: null,
  },
  reducers: {
    setSalesFilter(state, action) {
      const { key, value } = action.payload;
      state.filters[key] = value;
      state.page = 1;
    },
    setSalesPage(state, action) {
      state.page = action.payload;
    },
    clearCreateSaleState(state) {
      state.createStatus = "idle";
      state.createError = null;
    },
    clearCancelSaleState(state) {
      state.cancelStatus = "idle";
      state.cancelError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSales.pending, (state) => {
        state.listStatus = "loading";
        state.listError = null;
      })
      .addCase(fetchSales.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.sales = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchSales.rejected, (state, action) => {
        state.listStatus = "failed";
        state.listError = action.payload ?? "Не удалось загрузить продажи.";
      })
      .addCase(fetchSalesLookups.pending, (state) => {
        state.lookupsStatus = "loading";
        state.lookupsError = null;
      })
      .addCase(fetchSalesLookups.fulfilled, (state, action) => {
        state.lookupsStatus = "succeeded";
        state.clientsList = action.payload.clients;
        state.toursList = action.payload.tours;
        state.usersList = action.payload.users;
      })
      .addCase(fetchSalesLookups.rejected, (state, action) => {
        state.lookupsStatus = "failed";
        state.lookupsError = action.payload ?? "Не удалось загрузить справочники.";
      })
      .addCase(createSale.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createSale.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        state.sales = [action.payload, ...state.sales].slice(0, PAGE_SIZE);
        state.total += 1;
        state.pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
      })
      .addCase(createSale.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload ?? "Не удалось создать продажу.";
      })
      .addCase(cancelSale.pending, (state) => {
        state.cancelStatus = "loading";
        state.cancelError = null;
      })
      .addCase(cancelSale.fulfilled, (state, action) => {
        state.cancelStatus = "succeeded";
        state.sales = state.sales.map((s) =>
          s.id === action.payload.id ? action.payload : s,
        );
      })
      .addCase(cancelSale.rejected, (state, action) => {
        state.cancelStatus = "failed";
        state.cancelError = action.payload ?? "Не удалось отменить продажу.";
      });
  },
});

export const { setSalesFilter, setSalesPage, clearCreateSaleState, clearCancelSaleState } =
  salesSlice.actions;
export const salesReducer = salesSlice.reducer;
