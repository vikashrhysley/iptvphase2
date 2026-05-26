// src/store/slices/trialSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGetTrialConfig, apiUpdateTrialConfig } from '../../services/api';

const TRIAL_FIELDS = [
  { key: 'trial_period_days', label: 'Trial period', unit: 'days' },
  { key: 'grace_period_days', label: 'Grace period', unit: 'days' },
  { key: 'max_trial_extensions', label: 'Max devices per trial' },
  { key: 'extension_days', label: 'Extension length', unit: 'days' },
  { key: 'notify_before_days', label: 'Notify before expiry', unit: 'days' },
  { key: 'auto_convert', label: 'Auto convert' },
];

const formatValue = (value, unit) => typeof value === 'boolean'
  ? (value ? 'enabled' : 'disabled')
  : `${value}${unit ? ` ${unit}` : ''}`;

const buildSuccessMessage = (previous = {}, requested = {}) => {
  const changes = TRIAL_FIELDS
    .filter(({ key }) => previous[key] !== undefined && requested[key] !== undefined && previous[key] !== requested[key])
    .map(({ key, label, unit }) => ({
      key,
      label,
      from: previous[key],
      to: requested[key],
      unit,
    }));

  const trialChange = changes.find(change => change.key === 'trial_period_days');
  if (trialChange && Number(trialChange.to) > Number(trialChange.from)) {
    return `Trial period increased from ${formatValue(trialChange.from, trialChange.unit)} to ${formatValue(trialChange.to, trialChange.unit)}`;
  }

  if (changes.length === 1) {
    const change = changes[0];
    return `${change.label} updated from ${formatValue(change.from, change.unit)} to ${formatValue(change.to, change.unit)}`;
  }

  if (changes.length > 1) {
    const labels = changes.slice(0, 3).map(change => change.label).join(', ');
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
  async ({ data }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiUpdateTrialConfig(accessToken, data);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

const trialSlice = createSlice({
  name: 'trial',
  initialState: {
    config:  null,
    loading: false,
    saving:  false,
    error:   null,
    toast:   null,
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
       const requested = a.meta.arg.data || {};
       const previousConfig = a.meta.arg.previousConfig || {};

       s.config = { ...s.config, ...requested, ...a.payload };
       s.toast  = {
         type: 'success',
         msg: buildSuccessMessage(previousConfig, requested),
       };
     })
     .addCase(updateTrialConfig.rejected,  (s, a) => {
       s.saving = false;
       s.toast  = { type: 'error', msg: a.payload };
     });
  },
});

export const { clearToast } = trialSlice.actions;
export default trialSlice.reducer;
