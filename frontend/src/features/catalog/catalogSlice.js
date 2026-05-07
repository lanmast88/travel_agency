import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http } from "../../shared/api/http";

const PAGE_SIZE = 10;

function getErrorMessage(error, fallback) {
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((i) => i.msg).join(". ");
  return fallback;
}

export const fetchCatalogCities = createAsyncThunk(
  "catalog/fetchCities",
  async (page = 1, { rejectWithValue }) => {
    try {
      const { data } = await http.get("/v1/cities", {
        params: { page, page_size: PAGE_SIZE },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось загрузить города."),
      );
    }
  },
);

export const createCity = createAsyncThunk(
  "catalog/createCity",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await http.post("/v1/cities", payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось создать город."),
      );
    }
  },
);

export const updateCity = createAsyncThunk(
  "catalog/updateCity",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await http.patch(`/v1/cities/${id}`, payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось обновить город."),
      );
    }
  },
);

export const deleteCity = createAsyncThunk(
  "catalog/deleteCity",
  async (id, { rejectWithValue }) => {
    try {
      await http.delete(`/v1/cities/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось удалить город."),
      );
    }
  },
);

export const fetchCatalogHotels = createAsyncThunk(
  "catalog/fetchHotels",
  async ({ page = 1, cityId = null } = {}, { rejectWithValue }) => {
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (cityId) params.city_id = cityId;
      const { data } = await http.get("/v1/hotels", { params });
      return data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось загрузить отели."),
      );
    }
  },
);

export const createHotel = createAsyncThunk(
  "catalog/createHotel",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await http.post("/v1/hotels", payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось создать отель."),
      );
    }
  },
);

export const updateHotel = createAsyncThunk(
  "catalog/updateHotel",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await http.patch(`/v1/hotels/${id}`, payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось обновить отель."),
      );
    }
  },
);

export const deleteHotel = createAsyncThunk(
  "catalog/deleteHotel",
  async (id, { rejectWithValue }) => {
    try {
      await http.delete(`/v1/hotels/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Не удалось удалить отель."),
      );
    }
  },
);

function makeCrudState(prefix) {
  return {
    [`${prefix}Status`]: "idle",
    [`${prefix}Error`]: null,
  };
}

const catalogSlice = createSlice({
  name: "catalog",
  initialState: {
    cities: [],
    citiesTotal: 0,
    citiesPage: 1,
    citiesPages: 0,
    ...makeCrudState("cities"),
    ...makeCrudState("createCity"),
    ...makeCrudState("updateCity"),
    ...makeCrudState("deleteCity"),

    hotels: [],
    hotelsTotal: 0,
    hotelsPage: 1,
    hotelsPages: 0,
    hotelsFilterCityId: "",
    ...makeCrudState("hotels"),
    ...makeCrudState("createHotel"),
    ...makeCrudState("updateHotel"),
    ...makeCrudState("deleteHotel"),
  },
  reducers: {
    setCitiesPage(state, action) {
      state.citiesPage = action.payload;
    },
    setHotelsPage(state, action) {
      state.hotelsPage = action.payload;
    },
    setHotelsFilterCityId(state, action) {
      state.hotelsFilterCityId = action.payload;
      state.hotelsPage = 1;
    },
    clearCreateCityState(state) {
      state.createCityStatus = "idle";
      state.createCityError = null;
    },
    clearUpdateCityState(state) {
      state.updateCityStatus = "idle";
      state.updateCityError = null;
    },
    clearDeleteCityState(state) {
      state.deleteCityStatus = "idle";
      state.deleteCityError = null;
    },
    clearCreateHotelState(state) {
      state.createHotelStatus = "idle";
      state.createHotelError = null;
    },
    clearUpdateHotelState(state) {
      state.updateHotelStatus = "idle";
      state.updateHotelError = null;
    },
    clearDeleteHotelState(state) {
      state.deleteHotelStatus = "idle";
      state.deleteHotelError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCatalogCities
      .addCase(fetchCatalogCities.pending, (state) => {
        state.citiesStatus = "loading";
        state.citiesError = null;
      })
      .addCase(fetchCatalogCities.fulfilled, (state, action) => {
        state.citiesStatus = "succeeded";
        state.cities = action.payload.items;
        state.citiesTotal = action.payload.total;
        state.citiesPage = action.payload.page;
        state.citiesPages = action.payload.pages;
      })
      .addCase(fetchCatalogCities.rejected, (state, action) => {
        state.citiesStatus = "failed";
        state.citiesError = action.payload ?? "Не удалось загрузить города.";
      })
      // createCity
      .addCase(createCity.pending, (state) => {
        state.createCityStatus = "loading";
        state.createCityError = null;
      })
      .addCase(createCity.fulfilled, (state, action) => {
        state.createCityStatus = "succeeded";
        state.cities = [action.payload, ...state.cities].slice(0, PAGE_SIZE);
        state.citiesTotal += 1;
        state.citiesPages = Math.max(
          1,
          Math.ceil(state.citiesTotal / PAGE_SIZE),
        );
      })
      .addCase(createCity.rejected, (state, action) => {
        state.createCityStatus = "failed";
        state.createCityError = action.payload ?? "Не удалось создать город.";
      })
      // updateCity
      .addCase(updateCity.pending, (state) => {
        state.updateCityStatus = "loading";
        state.updateCityError = null;
      })
      .addCase(updateCity.fulfilled, (state, action) => {
        state.updateCityStatus = "succeeded";
        state.cities = state.cities.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        );
      })
      .addCase(updateCity.rejected, (state, action) => {
        state.updateCityStatus = "failed";
        state.updateCityError = action.payload ?? "Не удалось обновить город.";
      })
      // deleteCity
      .addCase(deleteCity.pending, (state) => {
        state.deleteCityStatus = "loading";
        state.deleteCityError = null;
      })
      .addCase(deleteCity.fulfilled, (state, action) => {
        state.deleteCityStatus = "succeeded";
        state.cities = state.cities.filter((c) => c.id !== action.payload);
        state.citiesTotal = Math.max(0, state.citiesTotal - 1);
        state.citiesPages = Math.max(
          1,
          Math.ceil(state.citiesTotal / PAGE_SIZE),
        );
      })
      .addCase(deleteCity.rejected, (state, action) => {
        state.deleteCityStatus = "failed";
        state.deleteCityError = action.payload ?? "Не удалось удалить город.";
      })
      // fetchCatalogHotels
      .addCase(fetchCatalogHotels.pending, (state) => {
        state.hotelsStatus = "loading";
        state.hotelsError = null;
      })
      .addCase(fetchCatalogHotels.fulfilled, (state, action) => {
        state.hotelsStatus = "succeeded";
        state.hotels = action.payload.items;
        state.hotelsTotal = action.payload.total;
        state.hotelsPage = action.payload.page;
        state.hotelsPages = action.payload.pages;
      })
      .addCase(fetchCatalogHotels.rejected, (state, action) => {
        state.hotelsStatus = "failed";
        state.hotelsError = action.payload ?? "Не удалось загрузить отели.";
      })
      // createHotel
      .addCase(createHotel.pending, (state) => {
        state.createHotelStatus = "loading";
        state.createHotelError = null;
      })
      .addCase(createHotel.fulfilled, (state, action) => {
        state.createHotelStatus = "succeeded";
        state.hotels = [action.payload, ...state.hotels].slice(0, PAGE_SIZE);
        state.hotelsTotal += 1;
        state.hotelsPages = Math.max(
          1,
          Math.ceil(state.hotelsTotal / PAGE_SIZE),
        );
      })
      .addCase(createHotel.rejected, (state, action) => {
        state.createHotelStatus = "failed";
        state.createHotelError = action.payload ?? "Не удалось создать отель.";
      })
      // updateHotel
      .addCase(updateHotel.pending, (state) => {
        state.updateHotelStatus = "loading";
        state.updateHotelError = null;
      })
      .addCase(updateHotel.fulfilled, (state, action) => {
        state.updateHotelStatus = "succeeded";
        state.hotels = state.hotels.map((h) =>
          h.id === action.payload.id ? action.payload : h,
        );
      })
      .addCase(updateHotel.rejected, (state, action) => {
        state.updateHotelStatus = "failed";
        state.updateHotelError = action.payload ?? "Не удалось обновить отель.";
      })
      // deleteHotel
      .addCase(deleteHotel.pending, (state) => {
        state.deleteHotelStatus = "loading";
        state.deleteHotelError = null;
      })
      .addCase(deleteHotel.fulfilled, (state, action) => {
        state.deleteHotelStatus = "succeeded";
        state.hotels = state.hotels.filter((h) => h.id !== action.payload);
        state.hotelsTotal = Math.max(0, state.hotelsTotal - 1);
        state.hotelsPages = Math.max(
          1,
          Math.ceil(state.hotelsTotal / PAGE_SIZE),
        );
      })
      .addCase(deleteHotel.rejected, (state, action) => {
        state.deleteHotelStatus = "failed";
        state.deleteHotelError = action.payload ?? "Не удалось удалить отель.";
      });
  },
});

export const {
  setCitiesPage,
  setHotelsPage,
  setHotelsFilterCityId,
  clearCreateCityState,
  clearUpdateCityState,
  clearDeleteCityState,
  clearCreateHotelState,
  clearUpdateHotelState,
  clearDeleteHotelState,
} = catalogSlice.actions;

export const catalogReducer = catalogSlice.reducer;
