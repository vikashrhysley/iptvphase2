import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchSubscriptions } from '../../services/api';

const DEFAULT_FILTERS = {
  status:    '',
  plan_type: '',
  user_id:   '',
  date_from: '',
  date_to:   '',
  page:      1,
  page_size: 20,
};

export const fetchSubscriptions = createAsyncThunk('subscriptions/fetchAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchSubscriptions(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

const subscriptionsSlice = createSlice({
  name: 'subscriptions',
  initialState: {
    subscriptions: [],
    total:    0,
    page:     1,
    pageSize: 20,
    loading:  false,
    error:    null,

    filters: { ...DEFAULT_FILTERS },
  },
  reducers: {
    setSubscriptionFilters(s, a) { s.filters = { ...s.filters, ...a.payload }; },
    clearSubscriptionFilters(s)  { s.filters = { ...DEFAULT_FILTERS }; },
  },
  extraReducers: (b) => {
    b.addCase(fetchSubscriptions.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchSubscriptions.fulfilled, (s, a) => {
       s.loading       = false;
       s.subscriptions = a.payload.subscriptions;
       s.total         = a.payload.total;
       s.page          = a.payload.page;
       s.pageSize      = a.payload.pageSize;
     })
     .addCase(fetchSubscriptions.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export const { setSubscriptionFilters, clearSubscriptionFilters } = subscriptionsSlice.actions;
export default subscriptionsSlice.reducer;
