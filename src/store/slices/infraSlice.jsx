import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchInfraStatus, apiFetchInfraDbPerf, apiFetchInfraQueues, apiFetchInfraPerformance } from '../../services/api';

export const fetchInfraStatus = createAsyncThunk('infra/fetchStatus',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchInfraStatus(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (_, { getState }) => !getState().infra.loading }
);

export const fetchInfraDbPerf = createAsyncThunk('infra/fetchDbPerf',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchInfraDbPerf(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (_, { getState }) => !getState().infra.dbPerfLoading }
);

export const fetchInfraQueues = createAsyncThunk('infra/fetchQueues',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchInfraQueues(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (_, { getState }) => !getState().infra.queuesLoading }
);

export const fetchInfraPerformance = createAsyncThunk('infra/fetchPerformance',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchInfraPerformance(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (_, { getState }) => !getState().infra.perfLoading }
);

const infraSlice = createSlice({
  name: 'infra',
  initialState: {
    data: null,
    loading: false,
    error: null,
    lastChecked: null,
    dbPerf: null,
    dbPerfLoading: false,
    dbPerfError: null,
    queues: null,
    queuesLoading: false,
    queuesError: null,
    perf: null,
    perfLoading: false,
    perfError: null,
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

    b.addCase(fetchInfraDbPerf.pending,   (s) => { s.dbPerfLoading = true; s.dbPerfError = null; })
     .addCase(fetchInfraDbPerf.fulfilled, (s, a) => { s.dbPerfLoading = false; s.dbPerf = a.payload; })
     .addCase(fetchInfraDbPerf.rejected,  (s, a) => { s.dbPerfLoading = false; s.dbPerfError = a.payload; });

    b.addCase(fetchInfraQueues.pending,   (s) => { s.queuesLoading = true; s.queuesError = null; })
     .addCase(fetchInfraQueues.fulfilled, (s, a) => { s.queuesLoading = false; s.queues = a.payload; })
     .addCase(fetchInfraQueues.rejected,  (s, a) => { s.queuesLoading = false; s.queuesError = a.payload; });

    b.addCase(fetchInfraPerformance.pending,   (s) => { s.perfLoading = true; s.perfError = null; })
     .addCase(fetchInfraPerformance.fulfilled, (s, a) => { s.perfLoading = false; s.perf = a.payload; })
     .addCase(fetchInfraPerformance.rejected,  (s, a) => { s.perfLoading = false; s.perfError = a.payload; });
  },
});

export default infraSlice.reducer;
