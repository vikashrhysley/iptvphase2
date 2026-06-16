import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchSubscriptionPlans, apiFetchPlanDetail, apiTogglePlanStatus } from '../../services/api';

export const fetchSubscriptionPlans = createAsyncThunk('plans/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchSubscriptionPlans(accessToken);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchPlanDetail = createAsyncThunk('plans/fetchDetail',
  async (id, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchPlanDetail(accessToken, id);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const togglePlanStatus = createAsyncThunk('plans/toggleStatus',
  async ({ id, isActive }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiTogglePlanStatus(accessToken, id, isActive);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

const plansSlice = createSlice({
  name: 'plans',
  initialState: {
    plans:   [],
    loading: false,
    error:   null,

    selectedPlan:  null,
    detailLoading: false,
    detailError:   null,

    toggleLoading: false,
    toggleError:   null,
    toggleSuccess: false,
  },
  reducers: {
    clearPlanDetail(s) {
      s.selectedPlan = null;
      s.detailLoading = false;
      s.detailError = null;
      s.toggleLoading = false;
      s.toggleError = null;
      s.toggleSuccess = false;
    },
    clearToggleState(s) {
      s.toggleLoading = false;
      s.toggleError = null;
      s.toggleSuccess = false;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchSubscriptionPlans.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchSubscriptionPlans.fulfilled, (s, a) => { s.loading = false; s.plans = a.payload; })
     .addCase(fetchSubscriptionPlans.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(fetchPlanDetail.pending, (s) => { s.detailLoading = true; s.detailError = null; })
     .addCase(fetchPlanDetail.fulfilled, (s, a) => { s.detailLoading = false; s.selectedPlan = a.payload; })
     .addCase(fetchPlanDetail.rejected, (s, a) => { s.detailLoading = false; s.detailError = a.payload; })
     .addCase(togglePlanStatus.pending, (s) => { s.toggleLoading = true; s.toggleError = null; s.toggleSuccess = false; })
     .addCase(togglePlanStatus.fulfilled, (s, a) => {
       s.toggleLoading = false;
       s.toggleSuccess = true;
       const updated = a.payload || {};
       const isActive = updated.is_active ?? a.meta.arg.isActive;
       if (s.selectedPlan) s.selectedPlan = { ...s.selectedPlan, ...updated, is_active: isActive };
       const idx = s.plans.findIndex((p) => p.id === a.meta.arg.id);
       if (idx !== -1) s.plans[idx] = { ...s.plans[idx], ...updated, is_active: isActive };
     })
     .addCase(togglePlanStatus.rejected, (s, a) => { s.toggleLoading = false; s.toggleError = a.payload; });
  },
});

export const { clearPlanDetail, clearToggleState } = plansSlice.actions;
export default plansSlice.reducer;
