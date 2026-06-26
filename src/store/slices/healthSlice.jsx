import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiFetchHealth,
  apiFetchHealthDb,
  apiFetchHealthRedis,
  apiFetchHealthQdrant,
  apiFetchMetrics,
  apiFetchVersion,
} from '../../services/api';

export const fetchHealth = createAsyncThunk('health/fetch',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchHealth(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchHealthDb = createAsyncThunk('health/fetchDb',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchHealthDb(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchHealthRedis = createAsyncThunk('health/fetchRedis',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchHealthRedis(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchHealthQdrant = createAsyncThunk('health/fetchQdrant',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchHealthQdrant(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchMetrics = createAsyncThunk('health/fetchMetrics',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchMetrics(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchVersion = createAsyncThunk('health/fetchVersion',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchVersion(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

const mk = (prefix) => ({
  pending:   (s) => { s[`${prefix}Loading`] = true;  s[`${prefix}Error`] = null; },
  fulfilled: (s, a) => {
    s[`${prefix}Loading`]     = false;
    s[prefix]                 = a.payload;
    s[`${prefix}LastChecked`] = new Date().toISOString();
  },
  rejected:  (s, a) => { s[`${prefix}Loading`] = false; s[`${prefix}Error`] = a.payload; },
});

const healthSlice = createSlice({
  name: 'health',
  initialState: {
    data:        null,  loading:         false,  error:         null,  lastChecked:         null,
    db:          null,  dbLoading:       false,  dbError:       null,  dbLastChecked:       null,
    redis:       null,  redisLoading:    false,  redisError:    null,  redisLastChecked:    null,
    qdrant:      null,  qdrantLoading:   false,  qdrantError:   null,  qdrantLastChecked:   null,
    metrics:     null,  metricsLoading:  false,  metricsError:  null,  metricsLastChecked:  null,
    version:     null,  versionLoading:  false,  versionError:  null,  versionLastChecked:  null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchHealth.pending,   (s) => { s.loading = true;  s.error = null; })
     .addCase(fetchHealth.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; s.lastChecked = new Date().toISOString(); })
     .addCase(fetchHealth.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });

    for (const [thunk, prefix] of [
      [fetchHealthDb,     'db'],
      [fetchHealthRedis,  'redis'],
      [fetchHealthQdrant, 'qdrant'],
      [fetchMetrics,      'metrics'],
      [fetchVersion,      'version'],
    ]) {
      const c = mk(prefix);
      b.addCase(thunk.pending,   c.pending)
       .addCase(thunk.fulfilled, c.fulfilled)
       .addCase(thunk.rejected,  c.rejected);
    }
  },
});

export default healthSlice.reducer;
