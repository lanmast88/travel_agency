import { createSlice } from "@reduxjs/toolkit";
import { reportsData } from "./reportsData";

const reportsSlice = createSlice({
  name: "reports",
  initialState: reportsData,
  reducers: {},
});

export const reportsReducer = reportsSlice.reducer;
