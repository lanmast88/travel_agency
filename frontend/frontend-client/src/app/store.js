import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "../features/auth/authSlice";
import { toursReducer } from "../features/tours/toursSlice";
import { reviewsReducer } from "../features/reviews/reviewsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tours: toursReducer,
    reviews: reviewsReducer,
  },
});
