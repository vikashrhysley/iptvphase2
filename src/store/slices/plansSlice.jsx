import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchSubscriptionPlans } from '../../services/api';

export const fetchSubscriptionPlans = createAsyncThunk('plans/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchSubscriptionPlans(accessToken);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

const plansSlice = createSlice({
  name: 'plans',
  initialState: {
    plans:   [],
    loading: false,
    error:   null,
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchSubscriptionPlans.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchSubscriptionPlans.fulfilled, (s, a) => { s.loading = false; s.plans = a.payload; })
     .addCase(fetchSubscriptionPlans.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export default plansSlice.reducer;
