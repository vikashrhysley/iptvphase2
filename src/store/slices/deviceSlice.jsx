// src/store/slices/deviceSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchDevices, apiUpdateDeviceStatus, apiRevokeDevice } from '../../services/api';

export const fetchDevices = createAsyncThunk(
  'devices/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchDevices(accessToken);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateDeviceStatus = createAsyncThunk(
  'devices/updateStatus',
  async ({ deviceId, status }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiUpdateDeviceStatus(accessToken, deviceId, status);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const revokeDevice = createAsyncThunk(
  'devices/revoke',
  async ({ deviceId }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiRevokeDevice(accessToken, deviceId);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const deviceSlice = createSlice({
  name: 'devices',
  initialState: {
    devices:      [],
    loading:      false,
    error:        null,
    actionLoading: null,
    toast:        null,
  },
  reducers: {
    clearToast(state) { state.toast = null; },
    setToast(state, a) { state.toast = a.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDevices.pending,   s => { s.loading = true;  s.error = null; })
      .addCase(fetchDevices.fulfilled, (s, a) => { s.loading = false; s.devices = a.payload.devices; })
      .addCase(fetchDevices.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });

    builder
      .addCase(updateDeviceStatus.pending,   (s, a) => { s.actionLoading = a.meta.arg.deviceId; })
      .addCase(updateDeviceStatus.fulfilled, (s, a) => {
        s.actionLoading = null;
        const d = s.devices.find(d => d.id === a.payload.deviceId);
        if (d) d.status = a.payload.status;
        s.toast = { type: 'success', msg: 'Device status updated' };
      })
      .addCase(updateDeviceStatus.rejected,  (s, a) => { s.actionLoading = null; s.toast = { type: 'error', msg: a.payload }; });

    builder
      .addCase(revokeDevice.pending,   (s, a) => { s.actionLoading = a.meta.arg.deviceId; })
      .addCase(revokeDevice.fulfilled, (s, a) => {
        s.actionLoading = null;
        const d = s.devices.find(d => d.id === a.payload.deviceId);
        if (d) d.status = 'blocked';
        s.toast = { type: 'success', msg: 'Device access revoked' };
      })
      .addCase(revokeDevice.rejected,  (s, a) => { s.actionLoading = null; s.toast = { type: 'error', msg: a.payload }; });
  },
});

export const { clearToast, setToast } = deviceSlice.actions;
export default deviceSlice.reducer;
