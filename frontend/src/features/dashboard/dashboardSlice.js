import { createSlice } from '@reduxjs/toolkit'
import { dashboardData } from './dashboardData'

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: dashboardData,
  reducers: {},
})

export const dashboardReducer = dashboardSlice.reducer
