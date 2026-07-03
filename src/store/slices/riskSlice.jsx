import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchRiskDashboard, apiFetchRiskDevices, apiFetchDeviceRisk, apiFetchDeviceRiskHistory, apiPostRiskOverride } from '../../services/api';

const DEFAULT_DEVICE_FILTERS = {
  risk_level: '',
  status:     '',
  sort_by:    'risk_score',
  page:       1,
  page_size:  20,
};

export const fetchRiskDashboard = createAsyncThunk(
  'risk/fetchDashboard',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchRiskDashboard(accessToken, params);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  { condition: (params, { getState }) => {
    if (params?.force) return true;
    const { loading, lastFetched, days } = getState().risk;
    const sameDays = (params.days ?? 30) === days;
    return !loading && (!lastFetched || !sameDays || Date.now() - lastFetched > 60_000);
  }}
);

export const fetchDeviceRisk = createAsyncThunk(
  'risk/fetchDeviceRisk',
  async (deviceId, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchDeviceRisk(accessToken, deviceId);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchDeviceRiskHistory = createAsyncThunk(
  'risk/fetchDeviceRiskHistory',
  async ({ deviceId, page = 1, page_size = 20 }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchDeviceRiskHistory(accessToken, deviceId, { page, page_size });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const postRiskOverride = createAsyncThunk(
  'risk/postOverride',
  async ({ deviceId, action, reason, new_score }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      const body = { action, reason };
      if (action === 'reduce_score' && new_score !== undefined) body.new_score = Number(new_score);
      return await apiPostRiskOverride(accessToken, deviceId, body);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchRiskDevices = createAsyncThunk(
  'risk/fetchDevices',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchRiskDevices(accessToken, params);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  { condition: (params, { getState }) => {
    if (params?.force) return true;
    const { devicesLoading, devicesLastFetched } = getState().risk;
    return !devicesLoading && (!devicesLastFetched || Date.now() - devicesLastFetched > 30_000);
  }}
);

const riskSlice = createSlice({
  name: 'risk',
  initialState: {
    // dashboard
    data:        null,
    loading:     false,
    error:       null,
    lastFetched: null,
    days:        30,

    // device risk detail
    deviceRisk:        null,
    deviceRiskLoading: false,
    deviceRiskError:   null,
    deviceRiskId:      null,

    // override
    overrideLoading: false,
    overrideError:   null,
    overrideResult:  null,

    // device risk history
    riskHistory:          [],
    riskHistoryTotal:     0,
    riskHistoryPage:      1,
    riskHistoryTotalPages: 1,
    riskHistoryLoading:   false,
    riskHistoryError:     null,

    // device list
    devices:          [],
    devicesCounts:    { safe: 0, monitor: 0, high: 0, critical: 0 },
    devicesTotal:     0,
    devicesPage:      1,
    devicesPageSize:  20,
    devicesTotalPages: 1,
    devicesLoading:   false,
    devicesError:     null,
    devicesLastFetched: null,
    deviceFilters:    { ...DEFAULT_DEVICE_FILTERS },
  },
  reducers: {
    setDays(state, action) {
      state.days = action.payload;
      state.lastFetched = null;
    },
    setDeviceFilters(state, action) {
      state.deviceFilters = { ...state.deviceFilters, ...action.payload };
      state.devicesLastFetched = null;
    },
    clearDeviceFilters(state) {
      state.deviceFilters = { ...DEFAULT_DEVICE_FILTERS };
      state.devicesLastFetched = null;
    },
    clearDeviceRisk(state) {
      state.deviceRisk            = null;
      state.deviceRiskLoading     = false;
      state.deviceRiskError       = null;
      state.deviceRiskId          = null;
      state.riskHistory           = [];
      state.riskHistoryTotal      = 0;
      state.riskHistoryPage       = 1;
      state.riskHistoryTotalPages = 1;
      state.riskHistoryLoading    = false;
      state.riskHistoryError      = null;
      state.overrideLoading       = false;
      state.overrideError         = null;
      state.overrideResult        = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchRiskDashboard.pending,   s => { s.loading = true; s.error = null; })
     .addCase(fetchRiskDashboard.fulfilled, (s, a) => {
       s.loading     = false;
       s.lastFetched = Date.now();
       s.data        = a.payload;
       s.days        = a.meta.arg.days ?? 30;
     })
     .addCase(fetchRiskDashboard.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });

    b.addCase(fetchDeviceRiskHistory.pending,   s => { s.riskHistoryLoading = true; s.riskHistoryError = null; })
     .addCase(fetchDeviceRiskHistory.fulfilled, (s, a) => {
       s.riskHistoryLoading    = false;
       s.riskHistory           = a.payload.events;
       s.riskHistoryTotal      = a.payload.total;
       s.riskHistoryPage       = a.payload.page;
       s.riskHistoryTotalPages = a.payload.totalPages;
     })
     .addCase(fetchDeviceRiskHistory.rejected,  (s, a) => { s.riskHistoryLoading = false; s.riskHistoryError = a.payload; });

    b.addCase(fetchDeviceRisk.pending,   s => { s.deviceRiskLoading = true; s.deviceRiskError = null; s.deviceRisk = null; })
     .addCase(fetchDeviceRisk.fulfilled, (s, a) => { s.deviceRiskLoading = false; s.deviceRisk = a.payload; s.deviceRiskId = a.payload?.device_id ?? a.meta.arg; })
     .addCase(fetchDeviceRisk.rejected,  (s, a) => { s.deviceRiskLoading = false; s.deviceRiskError = a.payload; });

    b.addCase(postRiskOverride.pending,   s => { s.overrideLoading = true; s.overrideError = null; s.overrideResult = null; })
     .addCase(postRiskOverride.fulfilled, (s, a) => { s.overrideLoading = false; s.overrideResult = a.payload?.data ?? a.payload; })
     .addCase(postRiskOverride.rejected,  (s, a) => { s.overrideLoading = false; s.overrideError = a.payload; });

    b.addCase(fetchRiskDevices.pending,   s => { s.devicesLoading = true; s.devicesError = null; })
     .addCase(fetchRiskDevices.fulfilled, (s, a) => {
       s.devicesLoading    = false;
       s.devicesLastFetched = Date.now();
       s.devices           = a.payload.devices;
       s.devicesCounts     = a.payload.counts;
       s.devicesTotal      = a.payload.total;
       s.devicesPage       = a.payload.page;
       s.devicesPageSize   = a.payload.pageSize;
       s.devicesTotalPages = a.payload.totalPages;
     })
     .addCase(fetchRiskDevices.rejected,  (s, a) => { s.devicesLoading = false; s.devicesError = a.payload; });
  },
});

export const { setDays, setDeviceFilters, clearDeviceFilters, clearDeviceRisk } = riskSlice.actions;
export default riskSlice.reducer;
