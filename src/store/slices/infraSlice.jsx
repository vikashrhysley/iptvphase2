import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchInfraStatus } from '../../services/api';

// No caching — every dispatch hits the live endpoint. Only guarded against
// piling up concurrent requests while one is already in flight.
export const fetchInfraStatus = createAsyncThunk('infra/fetchStatus',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchInfraStatus(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (_, { getState }) => !getState().infra.loading }
);

const infraSlice = createSlice({
  name: 'infra',
  initialState: {
    data: null,
    loading: false,
    error: null,
    lastChecked: null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchInfraStatus.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchInfraStatus.fulfilled, (s, a) => {
       s.loading = false;
       s.data = a.payload;
       s.lastChecked = new Date().toISOString();
     })
     .addCase(fetchInfraStatus.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export default infraSlice.reducer;
