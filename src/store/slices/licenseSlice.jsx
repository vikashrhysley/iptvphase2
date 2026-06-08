import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchExpiringLicenses, apiFetchLicenses, apiFetchLicenseStats, apiFetchLicenseDetail, apiRenewLicense, apiRevokeLicense, apiEditLicense } from '../../services/api';

const DEFAULT_FILTERS = {
  license_filter: '',
  plan_type: '',
  search: '',
  sort_by: 'expires_at',
  sort_order: 'asc',
  page: 1,
  page_size: 20,
};

export const fetchExpiringLicenses = createAsyncThunk('licenses/fetchExpiring',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchExpiringLicenses(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchLicenses = createAsyncThunk('licenses/fetchAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchLicenses(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchLicenseStats = createAsyncThunk('licenses/fetchStats',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchLicenseStats(accessToken);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchLicenseDetail = createAsyncThunk('licenses/fetchDetail',
  async ({ licenseId }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchLicenseDetail(accessToken, licenseId);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const renewLicense = createAsyncThunk('licenses/renew',
  async ({ licenseId }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiRenewLicense(accessToken, licenseId);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const revokeLicense = createAsyncThunk('licenses/revoke',
  async ({ licenseId }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiRevokeLicense(accessToken, licenseId);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const editLicense = createAsyncThunk('licenses/edit',
  async ({ licenseId, data }, { getState, rejectWithValue, dispatch }) => {
    try {
      const { accessToken } = getState().auth;
      const result = await apiEditLicense(accessToken, licenseId, data);
      dispatch(fetchLicenseStats());
      return result;
    } catch (err) { return rejectWithValue(err.message); }
  }
);

const licenseSlice = createSlice({
  name: 'licenses',
  initialState: {
    licenses:      [],
    total:         0,
    page:          1,
    pageSize:      20,
    loading:       false,
    error:         null,

    stats:         null,
    statsLoading:  false,
    statsError:    null,

    selectedDetail: null,
    detailLoading:  false,
    detailError:    null,

    actionLoading: null,
    toast:         null,
    editModal:     null,

    filters: { ...DEFAULT_FILTERS },
  },
  reducers: {
    clearToast(s)         { s.toast = null; },
    setToast(s, a)        { s.toast = a.payload; },
    openEditModal(s, a)   { s.editModal = a.payload; },
    closeEditModal(s)     { s.editModal = null; },
    clearDetail(s)        { s.selectedDetail = null; s.detailLoading = false; s.detailError = null; },
    setLicenseFilters(s, a) { s.filters = { ...s.filters, ...a.payload }; },
    clearLicenseFilters(s)  { s.filters = { ...DEFAULT_FILTERS }; },
  },
  extraReducers: (b) => {
    b.addCase(fetchExpiringLicenses.pending,   s => { s.loading = true;  s.error = null; })
     .addCase(fetchExpiringLicenses.fulfilled, (s, a) => {
       s.loading  = false;
       s.licenses = a.payload.licenses;
       s.total    = a.payload.total;
       s.page     = a.payload.page;
       s.pageSize = a.payload.pageSize;
     })
     .addCase(fetchExpiringLicenses.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });

    b.addCase(fetchLicenses.pending,   s => { s.loading = true;  s.error = null; })
     .addCase(fetchLicenses.fulfilled, (s, a) => {
       s.loading  = false;
       s.licenses = a.payload.licenses;
       s.total    = a.payload.total;
       s.page     = a.payload.page;
       s.pageSize = a.payload.pageSize;
     })
     .addCase(fetchLicenses.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });

    b.addCase(fetchLicenseStats.pending,   s => { s.statsLoading = true;  s.statsError = null; })
     .addCase(fetchLicenseStats.fulfilled, (s, a) => { s.statsLoading = false; s.stats = a.payload?.data || a.payload; })
     .addCase(fetchLicenseStats.rejected,  (s, a) => { s.statsLoading = false; s.statsError = a.payload; });

    b.addCase(fetchLicenseDetail.pending,   s => { s.detailLoading = true; s.detailError = null; s.selectedDetail = null; })
     .addCase(fetchLicenseDetail.fulfilled, (s, a) => { s.detailLoading = false; s.selectedDetail = a.payload; })
     .addCase(fetchLicenseDetail.rejected,  (s, a) => { s.detailLoading = false; s.detailError = a.payload || 'Failed to load license details.'; });

    b.addCase(renewLicense.pending,   (s, a) => { s.actionLoading = a.meta.arg.licenseId; })
     .addCase(renewLicense.fulfilled, (s, a) => {
       s.actionLoading = null;
       const id = a.meta.arg.licenseId;
       const l  = s.licenses.find(l => l.id === id);
       if (l) l.status = 'active';
       s.toast = { type: 'success', msg: 'License renewed successfully.' };
     })
     .addCase(renewLicense.rejected, (s, a) => { s.actionLoading = null; s.toast = { type: 'error', msg: a.payload }; });

    b.addCase(revokeLicense.pending,   (s, a) => { s.actionLoading = a.meta.arg.licenseId; })
     .addCase(revokeLicense.fulfilled, (s, a) => {
       s.actionLoading = null;
       const id = a.meta.arg.licenseId;
       const l  = s.licenses.find(l => l.id === id);
       if (l) l.status = 'revoked';
       s.toast = { type: 'success', msg: 'License revoked.' };
     })
     .addCase(revokeLicense.rejected, (s, a) => { s.actionLoading = null; s.toast = { type: 'error', msg: a.payload }; });

    b.addCase(editLicense.pending,   (s, a) => { s.actionLoading = a.meta.arg.licenseId; })
     .addCase(editLicense.fulfilled, (s) => {
       s.actionLoading = null;
       s.editModal     = null;
       s.toast = { type: 'success', msg: 'License updated successfully.' };
     })
     .addCase(editLicense.rejected, (s, a) => { s.actionLoading = null; s.toast = { type: 'error', msg: a.payload }; });
  },
});

export const { clearToast, setToast, openEditModal, closeEditModal, clearDetail, setLicenseFilters, clearLicenseFilters } = licenseSlice.actions;
export default licenseSlice.reducer;
