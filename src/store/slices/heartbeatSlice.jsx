// src/store/slices/heartbeatSlice.js
/* eslint-disable react-refresh/only-export-components */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiFetchHeartbeatStats,
  apiFetchHeartbeatLogs,
  apiFetchRiskyHeartbeatDevices,
} from '../../services/api';

const DEFAULT_LOG_FILTERS = {
  device_id: '',
  status: '',
  page: 1,
  page_size: 8,
};

const DEFAULT_RISKY_FILTERS = {
  page: 1,
  page_size: 8,
};

export const fetchHeartbeatStats = createAsyncThunk(
  'heartbeat/fetchStats',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchHeartbeatStats(accessToken);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  { condition: (_, { getState }) => {
    const { statsLoading, stats } = getState().heartbeat;
    return !statsLoading && !stats;
  }}
);

export const fetchHeartbeatLogs = createAsyncThunk(
  'heartbeat/fetchLogs',
  async (filters = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchHeartbeatLogs(accessToken, { ...DEFAULT_LOG_FILTERS, ...filters });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchRiskyHeartbeatDevices = createAsyncThunk(
  'heartbeat/fetchRisky',
  async (filters = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchRiskyHeartbeatDevices(accessToken, { ...DEFAULT_RISKY_FILTERS, ...filters });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const heartbeatSlice = createSlice({
  name: 'heartbeat',
  initialState: {
    stats: null,
    statsLoading: false,
    statsError: null,

    logs: [],
    logsTotal: 0,
    logsLoading: false,
    logsError: null,
    logFilters: DEFAULT_LOG_FILTERS,

    risky: [],
    riskyTotal: 0,
    riskyLoading: false,
    riskyError: null,
    riskyFilters: DEFAULT_RISKY_FILTERS,
  },
  reducers: {
    setLogFilters(state, action) {
      state.logFilters = { ...state.logFilters, ...action.payload };
    },
    resetLogFilters(state) {
      state.logFilters = DEFAULT_LOG_FILTERS;
    },
    resetRiskyFilters(state) {
      state.riskyFilters = DEFAULT_RISKY_FILTERS;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHeartbeatStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchHeartbeatStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchHeartbeatStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload;
      });

    builder
      .addCase(fetchHeartbeatLogs.pending, (state, action) => {
        state.logsLoading = true;
        state.logsError = null;
        state.logFilters = { ...state.logFilters, ...action.meta.arg };
      })
      .addCase(fetchHeartbeatLogs.fulfilled, (state, action) => {
        state.logsLoading = false;
        state.logs = action.payload.items;
        state.logsTotal = action.payload.total;
      })
      .addCase(fetchHeartbeatLogs.rejected, (state, action) => {
        state.logsLoading = false;
        state.logsError = action.payload;
      });

    builder
      .addCase(fetchRiskyHeartbeatDevices.pending, (state, action) => {
        state.riskyLoading = true;
        state.riskyError = null;
        state.riskyFilters = { ...state.riskyFilters, ...action.meta.arg };
      })
      .addCase(fetchRiskyHeartbeatDevices.fulfilled, (state, action) => {
        state.riskyLoading = false;
        state.risky = action.payload.items;
        state.riskyTotal = action.payload.total;
      })
      .addCase(fetchRiskyHeartbeatDevices.rejected, (state, action) => {
        state.riskyLoading = false;
        state.riskyError = action.payload;
      });
  },
});

export const {
  setLogFilters,
  resetLogFilters,
  resetRiskyFilters,
} = heartbeatSlice.actions;
export { DEFAULT_LOG_FILTERS, DEFAULT_RISKY_FILTERS };
export default heartbeatSlice.reducer;
