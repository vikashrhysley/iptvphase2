// src/store/slices/trialSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiGetTrialConfig, apiUpdateTrialConfig,
  apiGetSystemConfig, apiUpdateSystemConfigKey,
} from '../../services/api';

const TRIAL_FIELDS = [
  { key: 'trial_duration_days',   label: 'Trial duration',        unit: 'days' },
  { key: 'grace_period_days',     label: 'Grace period',          unit: 'days' },
  { key: 'max_trial_extensions',  label: 'Max extensions' },
  { key: 'trial_extension_days',  label: 'Extension length',      unit: 'days' },
  { key: 'trial_reminder_days',   label: 'Notify before expiry',  unit: 'days' },
  { key: 'trial_auto_convert',    label: 'Auto convert' },
  { key: 'max_devices_per_trial', label: 'Max devices per trial' },
  { key: 'device_limit_policy',   label: 'Device limit policy' },
];

const formatValue = (value, unit) => typeof value === 'boolean'
  ? (value ? 'enabled' : 'disabled')
  : `${value}${unit ? ` ${unit}` : ''}`;

const buildSuccessMessage = (previous = {}, requested = {}) => {
  const changes = TRIAL_FIELDS
    .filter(({ key }) => previous[key] !== undefined && requested[key] !== undefined && previous[key] !== requested[key])
    .map(({ key, label, unit }) => ({ key, label, from: previous[key], to: requested[key], unit }));

  const trialChange = changes.find(c => c.key === 'trial_duration_days');
  if (trialChange && Number(trialChange.to) > Number(trialChange.from)) {
    return `Trial duration increased from ${formatValue(trialChange.from, trialChange.unit)} to ${formatValue(trialChange.to, trialChange.unit)}`;
  }
  if (changes.length === 1) {
    const c = changes[0];
    return `${c.label} updated from ${formatValue(c.from, c.unit)} to ${formatValue(c.to, c.unit)}`;
  }
  if (changes.length > 1) {
    const labels = changes.slice(0, 3).map(c => c.label).join(', ');
    return `Trial policy updated: ${labels}${changes.length > 3 ? ' and more' : ''}`;
  }
  return 'Trial policy updated successfully';
};

export const fetchTrialConfig = createAsyncThunk('trial/fetch',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiGetTrialConfig(accessToken);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const updateTrialConfig = createAsyncThunk('trial/update',
  async ({ data, previousConfig, changeNote }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiUpdateTrialConfig(accessToken, data, changeNote);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchSystemConfig = createAsyncThunk('trial/fetchSystemConfig',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiGetSystemConfig(accessToken);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const updateSystemConfigKey = createAsyncThunk('trial/updateSystemConfigKey',
  async ({ key, value, changeNote }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiUpdateSystemConfigKey(accessToken, key, value, changeNote);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

const trialSlice = createSlice({
  name: 'trial',
  initialState: {
    config:              null,
    loading:             false,
    saving:              false,
    error:               null,
    toast:               null,
    systemConfig:        [],
    systemConfigLoading: false,
    systemConfigError:   null,
    systemConfigSaving:  null, // key currently being saved
  },
  reducers: {
    clearToast(s) { s.toast = null; },
  },
  extraReducers: b => {
    b.addCase(fetchTrialConfig.pending,   s => { s.loading = true; s.error = null; })
     .addCase(fetchTrialConfig.fulfilled, (s, a) => { s.loading = false; s.config = a.payload; })
     .addCase(fetchTrialConfig.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });

    b.addCase(updateTrialConfig.pending,   s => { s.saving = true; s.error = null; })
     .addCase(updateTrialConfig.fulfilled, (s, a) => {
       s.saving = false;
       const requested      = a.meta.arg.data           || {};
       const previousConfig = a.meta.arg.previousConfig || {};
       s.config = { ...s.config, ...requested, ...a.payload };
       s.toast  = { type: 'success', msg: buildSuccessMessage(previousConfig, requested) };
     })
     .addCase(updateTrialConfig.rejected,  (s, a) => {
       s.saving = false;
       s.toast  = { type: 'error', msg: a.payload };
     });

    b.addCase(fetchSystemConfig.pending,   s => { s.systemConfigLoading = true; s.systemConfigError = null; })
     .addCase(fetchSystemConfig.fulfilled, (s, a) => { s.systemConfigLoading = false; s.systemConfig = a.payload; })
     .addCase(fetchSystemConfig.rejected,  (s, a) => { s.systemConfigLoading = false; s.systemConfigError = a.payload; });

    b.addCase(updateSystemConfigKey.pending, (s, a) => { s.systemConfigSaving = a.meta.arg.key; })
     .addCase(updateSystemConfigKey.fulfilled, (s, a) => {
       s.systemConfigSaving = null;
       const key = a.meta.arg.key;
       const idx = s.systemConfig.findIndex(c => c.key === key);
       if (idx >= 0) {
         s.systemConfig[idx] = { ...s.systemConfig[idx], ...a.payload, value: a.meta.arg.value };
       }
       s.toast = { type: 'success', msg: `Config key "${key}" updated.` };
     })
     .addCase(updateSystemConfigKey.rejected, (s, a) => {
       s.systemConfigSaving = null;
       s.toast = { type: 'error', msg: a.payload };
     });
  },
});

export const { clearToast } = trialSlice.actions;
export default trialSlice.reducer;
