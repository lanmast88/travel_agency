import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http } from "../../shared/api/http";

const DEFAULT_PAGE_SIZE = 9;

function buildToursParams(state) {
  const params = {
    page: state.page,
    page_size: state.pageSize,
  };

  if (state.filters.cityId) {
    params.city_id = state.filters.cityId;
  }

  if (state.filters.dateFrom) {
    params.start_date_from = state.filters.dateFrom;
  }

  if (state.filters.dateTo) {
    params.start_date_to = state.filters.dateTo;
  }

  if (state.filters.priceFrom) {
    params.min_price = state.filters.priceFrom;
  }

  if (state.filters.priceTo) {
    params.max_price = state.filters.priceTo;
  }

  if (state.filters.urgentOnly) {
    params.only_hot = true;
  }

  if (state.filters.category) {
    params.category = state.filters.category;
  }

  return params;
}

function getErrorMessage(error, fallbackMessage) {
  const detail = error.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(". ");
  }

  return fallbackMessage;
}

export const fetchTours = createAsyncThunk(
  "travel/fetchTours",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState().travel;
      const { data } = await http.get("/v1/tours", {
        params: buildToursParams(state),
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось загрузить список путёвок."),
      );
    }
  },
);

export const fetchCities = createAsyncThunk(
  "travel/fetchCities",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await http.get("/v1/cities", {
        params: {
          page: 1,
          page_size: 100,
        },
      });
      return data.items;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось загрузить список городов."),
      );
    }
  },
);

export const fetchHotels = createAsyncThunk(
  "travel/fetchHotels",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await http.get("/v1/hotels", {
        params: {
          page: 1,
          page_size: 100,
        },
      });
      return data.items;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось загрузить список отелей."),
      );
    }
  },
);

export const updateTour = createAsyncThunk(
  "travel/updateTour",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await http.patch(`/v1/tours/${id}`, payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось обновить путёвку."),
      );
    }
  },
);

export const deleteTour = createAsyncThunk(
  "travel/deleteTour",
  async (id, { rejectWithValue }) => {
    try {
      await http.delete(`/v1/tours/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось удалить путёвку."),
      );
    }
  },
);

export const createTour = createAsyncThunk(
  "travel/createTour",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await http.post("/v1/tours", payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось создать путёвку."),
      );
    }
  },
);

const travelSlice = createSlice({
  name: "travel",
  initialState: {
    items: [],
    total: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    pages: 0,
    cities: [],
    hotels: [],
    filters: {
      cityId: "",
      dateFrom: "",
      dateTo: "",
      priceFrom: "",
      priceTo: "",
      urgentOnly: false,
      search: "",
      category: "",
    },
    toursStatus: "idle",
    toursError: null,
    citiesStatus: "idle",
    citiesError: null,
    hotelsStatus: "idle",
    hotelsError: null,
    createStatus: "idle",
    createError: null,
    updateStatus: "idle",
    updateError: null,
    deleteStatus: "idle",
    deleteError: null,
  },
  reducers: {
    setTravelFilter(state, action) {
      const { key, value } = action.payload;
      state.filters[key] = value;
      state.page = 1;
    },
    setTravelPage(state, action) {
      state.page = action.payload;
    },
    clearCreateTourState(state) {
      state.createStatus = "idle";
      state.createError = null;
    },
    clearUpdateTourState(state) {
      state.updateStatus = "idle";
      state.updateError = null;
    },
    clearDeleteTourState(state) {
      state.deleteStatus = "idle";
      state.deleteError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTours.pending, (state) => {
        state.toursStatus = "loading";
        state.toursError = null;
      })
      .addCase(fetchTours.fulfilled, (state, action) => {
        state.toursStatus = "succeeded";
        state.toursError = null;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.page_size;
        state.pages = action.payload.pages;
      })
      .addCase(fetchTours.rejected, (state, action) => {
        state.toursStatus = "failed";
        state.toursError =
          action.payload ?? "Не удалось загрузить список путёвок.";
      })
      .addCase(fetchCities.pending, (state) => {
        state.citiesStatus = "loading";
        state.citiesError = null;
      })
      .addCase(fetchCities.fulfilled, (state, action) => {
        state.citiesStatus = "succeeded";
        state.citiesError = null;
        state.cities = action.payload;
      })
      .addCase(fetchCities.rejected, (state, action) => {
        state.citiesStatus = "failed";
        state.citiesError =
          action.payload ?? "Не удалось загрузить список городов.";
      })
      .addCase(fetchHotels.pending, (state) => {
        state.hotelsStatus = "loading";
        state.hotelsError = null;
      })
      .addCase(fetchHotels.fulfilled, (state, action) => {
        state.hotelsStatus = "succeeded";
        state.hotelsError = null;
        state.hotels = action.payload;
      })
      .addCase(fetchHotels.rejected, (state, action) => {
        state.hotelsStatus = "failed";
        state.hotelsError =
          action.payload ?? "Не удалось загрузить список отелей.";
      })
      .addCase(createTour.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createTour.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        state.createError = null;
        state.items = [action.payload, ...state.items].slice(0, state.pageSize);
        state.total += 1;
        state.pages = Math.max(1, Math.ceil(state.total / state.pageSize));
      })
      .addCase(createTour.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload ?? "Не удалось создать путёвку.";
      })
      .addCase(updateTour.pending, (state) => {
        state.updateStatus = "loading";
        state.updateError = null;
      })
      .addCase(updateTour.fulfilled, (state, action) => {
        state.updateStatus = "succeeded";
        state.updateError = null;
        const updated = action.payload;
        state.items = state.items.map((item) =>
          item.id === updated.id
            ? { ...updated, city_id: updated.city.id, hotel_id: updated.hotel.id }
            : item,
        );
      })
      .addCase(updateTour.rejected, (state, action) => {
        state.updateStatus = "failed";
        state.updateError = action.payload ?? "Не удалось обновить путёвку.";
      })
      .addCase(deleteTour.pending, (state) => {
        state.deleteStatus = "loading";
        state.deleteError = null;
      })
      .addCase(deleteTour.fulfilled, (state, action) => {
        state.deleteStatus = "succeeded";
        state.deleteError = null;
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
        state.pages = Math.max(1, Math.ceil(state.total / state.pageSize));
      })
      .addCase(deleteTour.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.deleteError = action.payload ?? "Не удалось удалить путёвку.";
      });
  },
});

export const {
  clearCreateTourState,
  clearUpdateTourState,
  clearDeleteTourState,
  setTravelFilter,
  setTravelPage,
} = travelSlice.actions;
export const travelReducer = travelSlice.reducer;
