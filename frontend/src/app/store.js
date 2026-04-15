import { configureStore } from "@reduxjs/toolkit";
import { dashboardReducer } from "../features/dashboard/dashboardSlice";
import { travelReducer } from "../features/travel/travelSlice";

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    travel: travelReducer,
  },
});
