import { createSlice } from "@reduxjs/toolkit";
import { travelData } from "./travelData";

const travelSlice = createSlice({
  name: "travel",
  initialState: travelData,
  reducers: {},
});

export const travelReducer = travelSlice.reducer;
