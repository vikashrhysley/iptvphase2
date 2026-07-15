import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchSubscriptions, apiFetchSubscriptionDetail, apiFetchSubscriptionHistory, apiUpdateSubscription, apiCancelSubscription, apiExtendTrial } from '../../services/api';

const DEFAULT_FILTERS = {
  status:    '',
  plan_type: '',
  user_id:   '',
  search:    '',
  date_from: '',
  date_to:   '',
  page:      1,
  page_size: 10,
};

export const fetchSubscriptions = createAsyncThunk('subscriptions/fetchAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchSubscriptions(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (_, { getState }) => {
    const { loading, lastFetched } = getState().subscriptions;
    return !loading && (!lastFetched || Date.now() - lastFetched > 30_000);
  }}
);

export const fetchSubscriptionDetail = createAsyncThunk('subscriptions/fetchDetail',
  async (id, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchSubscriptionDetail(accessToken, id);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchSubscriptionHistory = createAsyncThunk('subscriptions/fetchHistory',
  async (id, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchSubscriptionHistory(accessToken, id);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const updateSubscription = createAsyncThunk('subscriptions/update',
  async ({ id, data }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiUpdateSubscription(accessToken, id, data);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const cancelSubscription = createAsyncThunk('subscriptions/cancel',
  async ({ id, reason }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiCancelSubscription(accessToken, id, reason);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const extendTrial = createAsyncThunk('subscriptions/extendTrial',
  async ({ id, extendDays, reason }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiExtendTrial(accessToken, id, extendDays, reason);
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

    selectedSubscription: null,
    detailLoading:        false,
    detailError:          null,

    history:        [],
    historyLoading: false,
    historyError:   null,

    updateLoading: false,
    updateError:   null,
    updateSuccess: false,
    updatedFields: [],
    updatedAt:     null,

    cancelLoading: false,
    cancelError:   null,
    cancelSuccess: false,

    extendLoading: false,
    extendError:   null,
    extendSuccess: false,
    extendedDaysRemaining: null,

    filters: { ...DEFAULT_FILTERS },
    lastFetched: null,
  },
  reducers: {
    setSubscriptionFilters(s, a) { s.filters = { ...s.filters, ...a.payload }; s.lastFetched = null; },
    clearSubscriptionFilters(s)  { s.filters = { ...DEFAULT_FILTERS }; s.lastFetched = null; },
    clearSubscriptionDetail(s)   {
      s.selectedSubscription = null;
      s.detailError = null;
      s.history = [];
      s.historyError = null;
      s.updateLoading = false;
      s.updateError = null;
      s.updateSuccess = false;
      s.updatedFields = [];
      s.updatedAt = null;
      s.cancelLoading = false;
      s.cancelError = null;
      s.cancelSuccess = false;
      s.extendLoading = false;
      s.extendError = null;
      s.extendSuccess = false;
      s.extendedDaysRemaining = null;
    },
    clearUpdateState(s) {
      s.updateLoading = false;
      s.updateError = null;
      s.updateSuccess = false;
    },
    clearCancelState(s) {
      s.cancelLoading = false;
      s.cancelError = null;
      s.cancelSuccess = false;
    },
    clearExtendState(s) {
      s.extendLoading = false;
      s.extendError = null;
      s.extendSuccess = false;
      s.extendedDaysRemaining = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchSubscriptions.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchSubscriptions.fulfilled, (s, a) => {
       s.loading       = false;
       s.lastFetched   = Date.now();
       s.subscriptions = a.payload.subscriptions;
       s.total         = a.payload.total;
       s.page          = a.payload.page;
       s.pageSize      = a.payload.pageSize;
     })
     .addCase(fetchSubscriptions.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(fetchSubscriptionDetail.pending, (s) => { s.detailLoading = true; s.detailError = null; })
     .addCase(fetchSubscriptionDetail.fulfilled, (s, a) => { s.detailLoading = false; s.selectedSubscription = a.payload; })
     .addCase(fetchSubscriptionDetail.rejected, (s, a) => { s.detailLoading = false; s.detailError = a.payload; })
     .addCase(fetchSubscriptionHistory.pending, (s) => { s.historyLoading = true; s.historyError = null; })
     .addCase(fetchSubscriptionHistory.fulfilled, (s, a) => { s.historyLoading = false; s.history = a.payload?.history || a.payload || []; })
     .addCase(fetchSubscriptionHistory.rejected, (s, a) => { s.historyLoading = false; s.historyError = a.payload; })
     .addCase(updateSubscription.pending, (s) => { s.updateLoading = true; s.updateError = null; s.updateSuccess = false; })
     .addCase(updateSubscription.fulfilled, (s, a) => {
       s.updateLoading = false;
       s.updateSuccess = true;
       s.updatedFields = a.payload?.updated_fields || [];
       s.updatedAt     = a.payload?.updated_at || null;
       if (s.selectedSubscription) {
         const { data } = a.meta.arg;
         Object.keys(data).forEach((key) => {
           if (key !== 'reason') s.selectedSubscription[key] = data[key];
         });
       }
     })
     .addCase(updateSubscription.rejected, (s, a) => { s.updateLoading = false; s.updateError = a.payload; })
     .addCase(cancelSubscription.pending, (s) => { s.cancelLoading = true; s.cancelError = null; s.cancelSuccess = false; })
     .addCase(cancelSubscription.fulfilled, (s, a) => {
       s.cancelLoading = false;
       s.cancelSuccess = true;
       if (s.selectedSubscription) {
         s.selectedSubscription.status       = a.payload?.status || 'cancelled';
         s.selectedSubscription.cancelled_at = a.payload?.cancelled_at || new Date().toISOString();
         s.selectedSubscription.cancel_reason = a.meta.arg.reason;
         s.selectedSubscription.auto_renew   = false;
       }
     })
     .addCase(cancelSubscription.rejected, (s, a) => { s.cancelLoading = false; s.cancelError = a.payload; })
     .addCase(extendTrial.pending, (s) => { s.extendLoading = true; s.extendError = null; s.extendSuccess = false; })
     .addCase(extendTrial.fulfilled, (s, a) => {
       s.extendLoading = false;
       s.extendSuccess = true;
       s.extendedDaysRemaining = a.payload?.days_remaining ?? a.payload?.trial_days_remaining ?? null;
       if (s.selectedSubscription && a.payload?.trial_end_at) {
         s.selectedSubscription.trial_end_at = a.payload.trial_end_at;
       }
     })
     .addCase(extendTrial.rejected, (s, a) => { s.extendLoading = false; s.extendError = a.payload; })
  },
});

export const { setSubscriptionFilters, clearSubscriptionFilters, clearSubscriptionDetail, clearUpdateState, clearCancelState, clearExtendState } = subscriptionsSlice.actions;
export default subscriptionsSlice.reducer;
