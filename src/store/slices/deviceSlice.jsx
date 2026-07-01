import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchDeviceActivity, apiFetchDeviceLoginHistory, apiFetchDeviceDetail, apiFetchDeviceStats, apiFetchAdminDevices, apiUpdateDeviceStatus, apiReplaceDevice, apiRevokeDevice } from '../../services/api';

const DEFAULT_FILTERS = {
  search: '',
  status: '',
  device_type: '',
  platform: '',
  plan_type: '',
  has_risk_flag: false,
  heartbeat_stale: false,
  sort_by: 'last_heartbeat_at',
  sort_order: 'desc',
  page: 1,
  page_size: 20,
};

export const fetchDeviceActivity = createAsyncThunk(
  'devices/fetchActivity',
  async ({ deviceId, params }, { getState, rejectWithValue }) => {
    try { return await apiFetchDeviceActivity(getState().auth.accessToken, deviceId, params); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchDeviceLoginHistory = createAsyncThunk(
  'devices/fetchLoginHistory',
  async ({ deviceId, params }, { getState, rejectWithValue }) => {
    try { return await apiFetchDeviceLoginHistory(getState().auth.accessToken, deviceId, params); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchDeviceDetail = createAsyncThunk(
  'devices/fetchDetail',
  async (deviceId, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchDeviceDetail(accessToken, deviceId);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchDeviceStats = createAsyncThunk(
  'devices/fetchStats',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchDeviceStats(accessToken);
    } catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (_, { getState }) => {
    const { statsLoading, stats } = getState().devices;
    return !statsLoading && !stats;
  }}
);

export const fetchDevices = createAsyncThunk(
  'devices/fetchAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchAdminDevices(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (_, { getState }) => {
    const { loading, lastFetched } = getState().devices;
    return !loading && (!lastFetched || Date.now() - lastFetched > 30_000);
  }}
);

export const updateDeviceStatus = createAsyncThunk(
  'devices/updateStatus',
  async ({ deviceId, status, reason }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiUpdateDeviceStatus(accessToken, deviceId, status, reason);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const replaceDevice = createAsyncThunk(
  'devices/replace',
  async ({ deviceId, reason }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiReplaceDevice(accessToken, deviceId, reason);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const revokeDevice = createAsyncThunk(
  'devices/revoke',
  async ({ deviceId, reason }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiRevokeDevice(accessToken, deviceId, reason);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

const deviceSlice = createSlice({
  name: 'devices',
  initialState: {
    devices: [],
    total: 0,
    page: 1,
    pageSize: 20,
    loading: false,
    error: null,
    actionLoading: null,
    toast: null,

    stats: null,
    statsLoading: false,
    statsError: null,

    selectedDevice: null,
    detailLoading: false,
    detailError: null,

    updateLoading: false,
    updateError: null,
    updateSuccess: false,

    activityItems: [], activityTotal: 0, activityPage: 1, activityPageSize: 20,
    activityLoading: false, activityError: null,
    activityFilters: { content_type: 'all', date_from: '', date_to: '', page: 1, page_size: 20 },

    loginHistoryItems: [], loginHistoryTotal: 0, loginHistoryPage: 1, loginHistoryPageSize: 20,
    loginHistoryLoading: false, loginHistoryError: null,
    loginHistoryFilters: { status: 'all', page: 1, page_size: 20 },

    filters: { ...DEFAULT_FILTERS },
    lastFetched: null,
  },
  reducers: {
    clearToast(state)       { state.toast = null; },
    setToast(state, a)      { state.toast = a.payload; },
    clearDeviceDetail(state) {
      state.selectedDevice = null;
      state.detailLoading  = false;
      state.detailError    = null;
      state.updateLoading  = false;
      state.updateError    = null;
      state.updateSuccess  = false;
    },
    clearUpdateState(state) {
      state.updateLoading = false;
      state.updateError   = null;
      state.updateSuccess = false;
    },
    setActivityFilters(state, a)      { state.activityFilters = { ...state.activityFilters, ...a.payload }; },
    clearActivityState(state) {
      state.activityItems = []; state.activityTotal = 0; state.activityPage = 1;
      state.activityLoading = false; state.activityError = null;
      state.activityFilters = { content_type: 'all', date_from: '', date_to: '', page: 1, page_size: 20 };
    },
    setLoginHistoryFilters(state, a)  { state.loginHistoryFilters = { ...state.loginHistoryFilters, ...a.payload }; },
    clearLoginHistoryState(state) {
      state.loginHistoryItems = []; state.loginHistoryTotal = 0; state.loginHistoryPage = 1;
      state.loginHistoryLoading = false; state.loginHistoryError = null;
      state.loginHistoryFilters = { status: 'all', page: 1, page_size: 20 };
    },
    setDeviceFilters(state, a) {
      state.filters = { ...state.filters, ...a.payload };
      state.lastFetched = null;
    },
    clearDeviceFilters(state) {
      state.filters = { ...DEFAULT_FILTERS };
      state.lastFetched = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchDeviceActivity.pending,   s => { s.activityLoading = true;  s.activityError = null; })
     .addCase(fetchDeviceActivity.fulfilled, (s, a) => { s.activityLoading = false; s.activityItems = a.payload.items; s.activityTotal = a.payload.total; s.activityPage = a.payload.page; s.activityPageSize = a.payload.pageSize; })
     .addCase(fetchDeviceActivity.rejected,  (s, a) => { s.activityLoading = false; s.activityError = a.payload; });

    b.addCase(fetchDeviceLoginHistory.pending,   s => { s.loginHistoryLoading = true;  s.loginHistoryError = null; })
     .addCase(fetchDeviceLoginHistory.fulfilled, (s, a) => { s.loginHistoryLoading = false; s.loginHistoryItems = a.payload.items; s.loginHistoryTotal = a.payload.total; s.loginHistoryPage = a.payload.page; s.loginHistoryPageSize = a.payload.pageSize; })
     .addCase(fetchDeviceLoginHistory.rejected,  (s, a) => { s.loginHistoryLoading = false; s.loginHistoryError = a.payload; });

    b.addCase(fetchDeviceDetail.pending,   s => { s.detailLoading = true;  s.detailError = null; s.selectedDevice = null; })
     .addCase(fetchDeviceDetail.fulfilled, (s, a) => { s.detailLoading = false; s.selectedDevice = a.payload?.data || a.payload; })
     .addCase(fetchDeviceDetail.rejected,  (s, a) => { s.detailLoading = false; s.detailError = a.payload; });

    b.addCase(fetchDeviceStats.pending,   s => { s.statsLoading = true;  s.statsError = null; })
     .addCase(fetchDeviceStats.fulfilled, (s, a) => { s.statsLoading = false; s.stats = a.payload?.data || a.payload; })
     .addCase(fetchDeviceStats.rejected,  (s, a) => { s.statsLoading = false; s.statsError = a.payload; });

    b.addCase(fetchDevices.pending,   s => { s.loading = true; s.error = null; })
     .addCase(fetchDevices.fulfilled, (s, a) => {
       s.loading     = false;
       s.lastFetched = Date.now();
       const p    = a.payload;
       const meta = p?.meta || p?.pagination || {};
       s.devices  = Array.isArray(p?.devices) ? p.devices : Array.isArray(p?.data) ? p.data : Array.isArray(p) ? p : [];
       s.total    = p?.total ?? p?.total_count ?? meta.total ?? s.devices.length;
       s.page     = p?.page  ?? p?.current_page ?? meta.page ?? s.filters.page;
       s.pageSize = p?.pageSize ?? p?.page_size ?? meta.page_size ?? s.filters.page_size;
     })
     .addCase(fetchDevices.rejected, (s, a) => { s.loading = false; s.error = a.payload; });

    b.addCase(updateDeviceStatus.pending,   (s, a) => {
       s.actionLoading = a.meta.arg.deviceId;
       s.updateLoading = true;
       s.updateError   = null;
       s.updateSuccess = false;
     })
     .addCase(updateDeviceStatus.fulfilled, (s, a) => {
       s.actionLoading = null;
       s.updateLoading = false;
       s.updateSuccess = true;
       // Use meta.arg as authoritative source — API response shape can vary
       const deviceId  = a.meta.arg.deviceId;
       const newStatus = a.payload?.new_status || a.payload?.status || a.meta.arg.status;
       const d = s.devices.find(d => (d.device_id || d.id) === deviceId);
       if (d) d.status = newStatus;
       if (s.selectedDevice && (s.selectedDevice.device_id || s.selectedDevice.id) === deviceId) {
         s.selectedDevice = { ...s.selectedDevice, status: newStatus };
       }
       s.toast = { type: 'success', msg: `Device ${newStatus === 'inactive' ? 'deactivated' : newStatus === 'active' ? 'activated' : 'status updated'}.` };
     })
     .addCase(updateDeviceStatus.rejected, (s, a) => {
       s.actionLoading = null;
       s.updateLoading = false;
       s.updateError   = a.payload;
       s.toast = { type: 'error', msg: a.payload };
     });

    b.addCase(replaceDevice.pending, (s, a) => {
       s.actionLoading = a.meta.arg.deviceId;
       s.updateLoading = true;
       s.updateError   = null;
       s.updateSuccess = false;
     })
     .addCase(replaceDevice.fulfilled, (s, a) => {
       s.actionLoading = null;
       s.updateLoading = false;
       s.updateSuccess = true;
       const deviceId  = a.meta.arg.deviceId;
       const newStatus = a.payload?.status || 'replaced';
       const d = s.devices.find(d => (d.device_id || d.id) === deviceId);
       if (d) d.status = newStatus;
       if (s.selectedDevice && (s.selectedDevice.device_id || s.selectedDevice.id) === deviceId) {
         s.selectedDevice = { ...s.selectedDevice, status: newStatus };
       }
       s.toast = { type: 'success', msg: 'Device marked as replaced.' };
     })
     .addCase(replaceDevice.rejected, (s, a) => {
       s.actionLoading = null;
       s.updateLoading = false;
       s.updateError   = a.payload;
       s.toast = { type: 'error', msg: a.payload };
     });

    b.addCase(revokeDevice.pending,   (s, a) => { s.actionLoading = a.meta.arg.deviceId; })
     .addCase(revokeDevice.fulfilled, (s, a) => {
       s.actionLoading = null;
       const deviceId  = a.meta.arg.deviceId;
       const newStatus = a.payload?.status || 'revoked';
       const d = s.devices.find(d => (d.device_id || d.id) === deviceId);
       if (d) d.status = newStatus;
       if (s.selectedDevice && (s.selectedDevice.device_id || s.selectedDevice.id) === deviceId) {
         s.selectedDevice = { ...s.selectedDevice, status: newStatus };
       }
       s.toast = { type: 'success', msg: `Device revoked. ${a.payload?.licenses_revoked ?? 0} license(s) revoked.` };
     })
     .addCase(revokeDevice.rejected, (s, a) => { s.actionLoading = null; s.toast = { type: 'error', msg: a.payload }; });
  },
});

export const {
  clearToast, setToast,
  setDeviceFilters, clearDeviceFilters,
  clearDeviceDetail, clearUpdateState,
  setActivityFilters, clearActivityState,
  setLoginHistoryFilters, clearLoginHistoryState,
} = deviceSlice.actions;
export default deviceSlice.reducer;
