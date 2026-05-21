// src/store/slices/trialSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGetTrialConfig, apiUpdateTrialConfig } from '../../services/api';

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
       s.config = { ...s.config, ...a.payload };
       s.toast  = { type: 'success', msg: 'Trial policy updated successfully' };
     })
     .addCase(updateTrialConfig.rejected,  (s, a) => {
       s.saving = false;
       s.toast  = { type: 'error', msg: a.payload };
     });
  },
});

export const { clearToast } = trialSlice.actions;
export default trialSlice.reducer;