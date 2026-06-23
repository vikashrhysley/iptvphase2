import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchRevenueAnalytics, apiFetchUserAnalytics, apiFetchDeviceAnalytics, apiFetchLicenseAnalytics, apiFetchFunnelAnalytics, apiFetchChurnAnalytics, apiFetchRiskAnalytics, apiFetchSecurityAnalytics, apiFetchGeoAnalytics, apiFetchSystemAnalytics } from '../../services/api';

const DEFAULT_REVENUE_FILTERS = {
  start_date: '',
  end_date:   '',
};

const DEFAULT_USERS_FILTERS = {
  start_date: '',
  end_date:   '',
};

const DEFAULT_FUNNEL_FILTERS = {
  start_date: '',
  end_date:   '',
};

const DEFAULT_CHURN_FILTERS = {
  start_date: '',
  end_date:   '',
};

const DEFAULT_RISK_FILTERS = {
  start_date: '',
  end_date:   '',
};

const DEFAULT_SECURITY_FILTERS = {
  start_date: '',
  end_date:   '',
};

export const fetchRevenueAnalytics = createAsyncThunk('analytics/fetchRevenue',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchRevenueAnalytics(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchUserAnalytics = createAsyncThunk('analytics/fetchUsers',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchUserAnalytics(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchDeviceAnalytics = createAsyncThunk('analytics/fetchDevices',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchDeviceAnalytics(accessToken);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchLicenseAnalytics = createAsyncThunk('analytics/fetchLicenses',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchLicenseAnalytics(accessToken);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchFunnelAnalytics = createAsyncThunk('analytics/fetchFunnel',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchFunnelAnalytics(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchChurnAnalytics = createAsyncThunk('analytics/fetchChurn',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchChurnAnalytics(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchSystemAnalytics = createAsyncThunk('analytics/fetchSystem',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchSystemAnalytics(accessToken);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchGeoAnalytics = createAsyncThunk('analytics/fetchGeo',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchGeoAnalytics(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchRiskAnalytics = createAsyncThunk('analytics/fetchRisk',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchRiskAnalytics(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchSecurityAnalytics = createAsyncThunk('analytics/fetchSecurity',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchSecurityAnalytics(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    revenue: null,
    loading: false,
    error:   null,

    users:        null,
    usersLoading: false,
    usersError:   null,

    devices:        null,
    devicesLoading: false,
    devicesError:   null,

    licenses:        null,
    licensesLoading: false,
    licensesError:   null,

    funnel:        null,
    funnelLoading: false,
    funnelError:   null,

    churn:        null,
    churnLoading: false,
    churnError:   null,

    risk:        null,
    riskLoading: false,
    riskError:   null,

    system:        null,
    systemLoading: false,
    systemError:   null,

    geo:        null,
    geoLoading: false,
    geoError:   null,
    geoLimit:   10,

    securityEvents:        null,
    securityEventsLoading: false,
    securityEventsError:   null,

    revenueFilters: { ...DEFAULT_REVENUE_FILTERS },
    usersFilters:   { ...DEFAULT_USERS_FILTERS },
    funnelFilters:  { ...DEFAULT_FUNNEL_FILTERS },
    churnFilters:   { ...DEFAULT_CHURN_FILTERS },
    riskFilters:      { ...DEFAULT_RISK_FILTERS },
    securityFilters:  { ...DEFAULT_SECURITY_FILTERS },
  },
  reducers: {
    setRevenueFilters(s, a) { s.revenueFilters = { ...s.revenueFilters, ...a.payload }; },
    clearRevenueFilters(s)  { s.revenueFilters = { ...DEFAULT_REVENUE_FILTERS }; },
    setUsersFilters(s, a) { s.usersFilters = { ...s.usersFilters, ...a.payload }; },
    clearUsersFilters(s)  { s.usersFilters = { ...DEFAULT_USERS_FILTERS }; },
    setFunnelFilters(s, a) { s.funnelFilters = { ...s.funnelFilters, ...a.payload }; },
    clearFunnelFilters(s)  { s.funnelFilters = { ...DEFAULT_FUNNEL_FILTERS }; },
    setChurnFilters(s, a) { s.churnFilters = { ...s.churnFilters, ...a.payload }; },
    clearChurnFilters(s)  { s.churnFilters = { ...DEFAULT_CHURN_FILTERS }; },
    setGeoLimit(s, a)   { s.geoLimit = a.payload; },
    setRiskFilters(s, a) { s.riskFilters = { ...s.riskFilters, ...a.payload }; },
    clearRiskFilters(s)  { s.riskFilters = { ...DEFAULT_RISK_FILTERS }; },
    setSecurityFilters(s, a) { s.securityFilters = { ...s.securityFilters, ...a.payload }; },
    clearSecurityFilters(s)  { s.securityFilters = { ...DEFAULT_SECURITY_FILTERS }; },
  },
  extraReducers: (b) => {
    b.addCase(fetchRevenueAnalytics.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(fetchRevenueAnalytics.fulfilled, (s, a) => { s.loading = false; s.revenue = a.payload; })
     .addCase(fetchRevenueAnalytics.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(fetchUserAnalytics.pending, (s) => { s.usersLoading = true; s.usersError = null; })
     .addCase(fetchUserAnalytics.fulfilled, (s, a) => { s.usersLoading = false; s.users = a.payload; })
     .addCase(fetchUserAnalytics.rejected, (s, a) => { s.usersLoading = false; s.usersError = a.payload; })
     .addCase(fetchDeviceAnalytics.pending, (s) => { s.devicesLoading = true; s.devicesError = null; })
     .addCase(fetchDeviceAnalytics.fulfilled, (s, a) => { s.devicesLoading = false; s.devices = a.payload; })
     .addCase(fetchDeviceAnalytics.rejected, (s, a) => { s.devicesLoading = false; s.devicesError = a.payload; })
     .addCase(fetchLicenseAnalytics.pending, (s) => { s.licensesLoading = true; s.licensesError = null; })
     .addCase(fetchLicenseAnalytics.fulfilled, (s, a) => { s.licensesLoading = false; s.licenses = a.payload; })
     .addCase(fetchLicenseAnalytics.rejected, (s, a) => { s.licensesLoading = false; s.licensesError = a.payload; })
     .addCase(fetchFunnelAnalytics.pending, (s) => { s.funnelLoading = true; s.funnelError = null; })
     .addCase(fetchFunnelAnalytics.fulfilled, (s, a) => { s.funnelLoading = false; s.funnel = a.payload; })
     .addCase(fetchFunnelAnalytics.rejected, (s, a) => { s.funnelLoading = false; s.funnelError = a.payload; })
     .addCase(fetchChurnAnalytics.pending, (s) => { s.churnLoading = true; s.churnError = null; })
     .addCase(fetchChurnAnalytics.fulfilled, (s, a) => { s.churnLoading = false; s.churn = a.payload; })
     .addCase(fetchChurnAnalytics.rejected, (s, a) => { s.churnLoading = false; s.churnError = a.payload; })
     .addCase(fetchSystemAnalytics.pending, (s) => { s.systemLoading = true; s.systemError = null; })
     .addCase(fetchSystemAnalytics.fulfilled, (s, a) => { s.systemLoading = false; s.system = a.payload; })
     .addCase(fetchSystemAnalytics.rejected, (s, a) => { s.systemLoading = false; s.systemError = a.payload; })
     .addCase(fetchGeoAnalytics.pending, (s) => { s.geoLoading = true; s.geoError = null; })
     .addCase(fetchGeoAnalytics.fulfilled, (s, a) => { s.geoLoading = false; s.geo = a.payload; })
     .addCase(fetchGeoAnalytics.rejected, (s, a) => { s.geoLoading = false; s.geoError = a.payload; })
     .addCase(fetchRiskAnalytics.pending, (s) => { s.riskLoading = true; s.riskError = null; })
     .addCase(fetchRiskAnalytics.fulfilled, (s, a) => { s.riskLoading = false; s.risk = a.payload; })
     .addCase(fetchRiskAnalytics.rejected, (s, a) => { s.riskLoading = false; s.riskError = a.payload; })
     .addCase(fetchSecurityAnalytics.pending, (s) => { s.securityEventsLoading = true; s.securityEventsError = null; })
     .addCase(fetchSecurityAnalytics.fulfilled, (s, a) => { s.securityEventsLoading = false; s.securityEvents = a.payload; })
     .addCase(fetchSecurityAnalytics.rejected, (s, a) => { s.securityEventsLoading = false; s.securityEventsError = a.payload; });
  },
});

export const { setRevenueFilters, clearRevenueFilters, setUsersFilters, clearUsersFilters, setFunnelFilters, clearFunnelFilters, setChurnFilters, clearChurnFilters, setRiskFilters, clearRiskFilters, setSecurityFilters, clearSecurityFilters, setGeoLimit } = analyticsSlice.actions;
export default analyticsSlice.reducer;
