import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { http } from "../../shared/api/http";

export const fetchReviews = createAsyncThunk("reviews/fetchList", async ({ tourId, page = 1, pageSize = 10 }, { rejectWithValue }) => {
  try {
    const { data } = await http.get(`/v1/tours/${tourId}/reviews`, { params: { page, page_size: pageSize } });
    return data;
  } catch {
    return rejectWithValue("Не удалось загрузить отзывы.");
  }
});

export const createReview = createAsyncThunk("reviews/create", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await http.post("/v1/reviews", payload);
    return data;
  } catch (e) {
    const detail = e.response?.data?.detail;
    return rejectWithValue(typeof detail === "string" ? detail : "Не удалось оставить отзыв.");
  }
});

export const updateReview = createAsyncThunk("reviews/update", async ({ id, ...body }, { rejectWithValue }) => {
  try {
    const { data } = await http.patch(`/v1/reviews/${id}`, body);
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.detail ?? "Не удалось обновить отзыв.");
  }
});

export const deleteReview = createAsyncThunk("reviews/delete", async (id, { rejectWithValue }) => {
  try {
    await http.delete(`/v1/reviews/${id}`);
    return id;
  } catch (e) {
    return rejectWithValue(e.response?.data?.detail ?? "Не удалось удалить отзыв.");
  }
});

const reviewsSlice = createSlice({
  name: "reviews",
  initialState: {
    items: [],
    total: 0,
    status: "idle",
    error: null,
    createStatus: "idle",
    createError: null,
    mutateStatus: "idle",
    mutateError: null,
  },
  reducers: {
    clearCreateState(state) { state.createStatus = "idle"; state.createError = null; },
    clearMutateState(state) { state.mutateStatus = "idle"; state.mutateError = null; },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchReviews.pending, (s) => { s.status = "loading"; s.error = null; })
      .addCase(fetchReviews.fulfilled, (s, a) => { s.status = "succeeded"; s.items = a.payload.items; s.total = a.payload.total; })
      .addCase(fetchReviews.rejected, (s, a) => { s.status = "failed"; s.error = a.payload; })

      .addCase(createReview.pending, (s) => { s.createStatus = "loading"; s.createError = null; })
      .addCase(createReview.fulfilled, (s, a) => { s.createStatus = "succeeded"; s.items = [a.payload, ...s.items]; s.total += 1; })
      .addCase(createReview.rejected, (s, a) => { s.createStatus = "failed"; s.createError = a.payload; })

      .addCase(updateReview.pending, (s) => { s.mutateStatus = "loading"; s.mutateError = null; })
      .addCase(updateReview.fulfilled, (s, a) => {
        s.mutateStatus = "succeeded";
        const idx = s.items.findIndex((r) => r.id === a.payload.id);
        if (idx !== -1) s.items[idx] = a.payload;
      })
      .addCase(updateReview.rejected, (s, a) => { s.mutateStatus = "failed"; s.mutateError = a.payload; })

      .addCase(deleteReview.pending, (s) => { s.mutateStatus = "loading"; s.mutateError = null; })
      .addCase(deleteReview.fulfilled, (s, a) => { s.mutateStatus = "succeeded"; s.items = s.items.filter((r) => r.id !== a.payload); s.total -= 1; })
      .addCase(deleteReview.rejected, (s, a) => { s.mutateStatus = "failed"; s.mutateError = a.payload; });
  },
});

export const { clearCreateState, clearMutateState } = reviewsSlice.actions;
export const reviewsReducer = reviewsSlice.reducer;
