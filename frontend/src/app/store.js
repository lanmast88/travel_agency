import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "../features/auth/authSlice";
import { clientsReducer } from "../features/clients/clientsSlice";
import { dashboardReducer } from "../features/dashboard/dashboardSlice";
import { reportsReducer } from "../features/reports/reportsSlice";
import { salesReducer } from "../features/sales/salesSlice";
import { travelReducer } from "../features/travel/travelSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    clients: clientsReducer,
    dashboard: dashboardReducer,
    reports: reportsReducer,
    sales: salesReducer,
    travel: travelReducer,
  },
});
