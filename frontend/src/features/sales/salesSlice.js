import { createSlice } from "@reduxjs/toolkit";
import { salesData } from "./salesData";

const salesSlice = createSlice({
  name: "sales",
  initialState: salesData,
  reducers: {},
});

export const salesReducer = salesSlice.reducer;
