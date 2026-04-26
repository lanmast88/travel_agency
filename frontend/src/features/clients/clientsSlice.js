import { createSlice } from "@reduxjs/toolkit";
import { clientsData } from "./clientsData";

const clientsSlice = createSlice({
  name: "clients",
  initialState: clientsData,
  reducers: {},
});

export const clientsReducer = clientsSlice.reducer;
