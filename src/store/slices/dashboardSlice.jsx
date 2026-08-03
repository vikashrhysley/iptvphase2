// src/store/slices/dashboardSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiFetchDashboardOverview,
  apiFetchDashboardRevenue,
  apiFetchDashboardStats,
} from '../../services/api';

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchDashboardStats(accessToken);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  { condition: (_, { getState }) => !getState().dashboard.loading }
);

export const fetchDashboardOverview = createAsyncThunk(
  'dashboard/fetchOverview',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchDashboardOverview(accessToken);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  { condition: (_, { getState }) => !getState().dashboard.overviewLoading }
);

export const fetchDashboardRevenue = createAsyncThunk(
  'dashboard/fetchRevenue',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchDashboardRevenue(accessToken);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  { condition: (_, { getState }) => !getState().dashboard.revenueLoading }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    stats: null,
    overview: null,
    revenue: null,
    loading: false,
    overviewLoading: false,
    revenueLoading: false,
    error: null,
    overviewError: null,
    revenueError: null,
    notification: null,
  },
  reducers: {
    clearNotification(state) {
      state.notification = null;
    },
    setNotification(state, action) {
      state.notification = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Silent polls (arg.silent) skip the loading/error toggles so the panel doesn't
      // flicker or blank out — the on-screen numbers stay put until fresh data arrives.
      .addCase(fetchDashboardStats.pending, (state, action) => {
        if (action.meta.arg?.silent) return;
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        if (!action.meta.arg?.silent) state.error = action.payload;
      });

    builder
      .addCase(fetchDashboardOverview.pending, (state, action) => {
        if (action.meta.arg?.silent) return;
        state.overviewLoading = true;
        state.overviewError = null;
      })
      .addCase(fetchDashboardOverview.fulfilled, (state, action) => {
        state.overviewLoading = false;
        state.overview = action.payload;
      })
      .addCase(fetchDashboardOverview.rejected, (state, action) => {
        state.overviewLoading = false;
        if (!action.meta.arg?.silent) state.overviewError = action.payload;
      });

    builder
      .addCase(fetchDashboardRevenue.pending, (state, action) => {
        if (action.meta.arg?.silent) return;
        state.revenueLoading = true;
        state.revenueError = null;
      })
      .addCase(fetchDashboardRevenue.fulfilled, (state, action) => {
        state.revenueLoading = false;
        state.revenue = action.payload;
      })
      .addCase(fetchDashboardRevenue.rejected, (state, action) => {
        state.revenueLoading = false;
        if (!action.meta.arg?.silent) state.revenueError = action.payload;
      });

  },
});

export const { clearNotification, setNotification } = dashboardSlice.actions;
export default dashboardSlice.reducer;
