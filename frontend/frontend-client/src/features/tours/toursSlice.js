import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http } from "../../shared/api/http";

export const fetchTours = createAsyncThunk("tours/fetchList", async (params = {}, { rejectWithValue }) => {
  try {
    const { data } = await http.get("/v1/tours", { params: { status: "active", ...params } });
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.detail ?? "Не удалось загрузить туры.");
  }
});

export const fetchTour = createAsyncThunk("tours/fetchOne", async (tourId, { rejectWithValue }) => {
  try {
    const { data } = await http.get(`/v1/tours/${tourId}`);
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.detail ?? "Тур не найден.");
  }
});

export const fetchCities = createAsyncThunk("tours/fetchCities", async (_, { rejectWithValue }) => {
  try {
    const { data } = await http.get("/v1/cities", { params: { page_size: 200 } });
    return data.items ?? data;
  } catch {
    return rejectWithValue("Не удалось загрузить города.");
  }
});

const toursSlice = createSlice({
  name: "tours",
  initialState: {
    items: [],
    total: 0,
    page: 1,
    pageSize: 12,
    status: "idle",
    error: null,
    currentTour: null,
    currentTourStatus: "idle",
    currentTourError: null,
    cities: [],
    citiesStatus: "idle",
  },
  reducers: {
    setPage(state, action) { state.page = action.payload; },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchTours.pending, (s) => { s.status = "loading"; s.error = null; })
      .addCase(fetchTours.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload.items;
        s.total = a.payload.total;
        s.page = a.payload.page;
        s.pageSize = a.payload.page_size;
      })
      .addCase(fetchTours.rejected, (s, a) => { s.status = "failed"; s.error = a.payload; })

      .addCase(fetchTour.pending, (s) => { s.currentTourStatus = "loading"; s.currentTourError = null; s.currentTour = null; })
      .addCase(fetchTour.fulfilled, (s, a) => { s.currentTourStatus = "succeeded"; s.currentTour = a.payload; })
      .addCase(fetchTour.rejected, (s, a) => { s.currentTourStatus = "failed"; s.currentTourError = a.payload; })

      .addCase(fetchCities.pending, (s) => { s.citiesStatus = "loading"; })
      .addCase(fetchCities.fulfilled, (s, a) => { s.citiesStatus = "succeeded"; s.cities = a.payload; })
      .addCase(fetchCities.rejected, (s) => { s.citiesStatus = "failed"; });
  },
});

export const { setPage } = toursSlice.actions;
export const toursReducer = toursSlice.reducer;
