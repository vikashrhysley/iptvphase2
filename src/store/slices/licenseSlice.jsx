// src/store/slices/licenseSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiFetchLicenses, apiFetchLicenseDetail,
  apiRenewLicense, apiRevokeLicense, apiEditLicense,
} from '../../services/api';

export const fetchLicenses = createAsyncThunk('licenses/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchLicenses(accessToken);
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
  async ({ licenseId, data }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiEditLicense(accessToken, licenseId, data);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

const licenseSlice = createSlice({
  name: 'licenses',
  initialState: {
    licenses:       [],
    selectedDetail: null, // full detail of clicked license
    loading:        false,
    detailLoading:  false,
    error:          null,
    actionLoading:  null,
    toast:          null,
    editModal:      null,
  },
  reducers: {
    clearToast(s)       { s.toast = null; },
    setToast(s, a)      { s.toast = a.payload; },
    openEditModal(s, a) { s.editModal = a.payload; },
    closeEditModal(s)   { s.editModal = null; },
    clearDetail(s)      { s.selectedDetail = null; },
  },
  extraReducers: (b) => {
    b.addCase(fetchLicenses.pending,   s => { s.loading = true;  s.error = null; })
     .addCase(fetchLicenses.fulfilled, (s, a) => { s.loading = false; s.licenses = a.payload.licenses; })
     .addCase(fetchLicenses.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });

    b.addCase(fetchLicenseDetail.pending,   s => { s.detailLoading = true; })
     .addCase(fetchLicenseDetail.fulfilled, (s, a) => { s.detailLoading = false; s.selectedDetail = a.payload; })
     .addCase(fetchLicenseDetail.rejected,  (s, a) => { s.detailLoading = false; s.error = a.payload; });

    b.addCase(renewLicense.pending,   (s, a) => { s.actionLoading = a.meta.arg.licenseId; })
     .addCase(renewLicense.fulfilled, (s, a) => {
       s.actionLoading = null;
       const l = s.licenses.find(l => l.id === a.payload.licenseId);
       if (l) { l.status = 'active'; if (a.payload.expiration_date || a.payload.expirationDate) l.expirationDate = a.payload.expiration_date || a.payload.expirationDate; }
       s.toast = { type: 'success', msg: 'License renewed successfully' };
     })
     .addCase(renewLicense.rejected, (s, a) => { s.actionLoading = null; s.toast = { type: 'error', msg: a.payload }; });

    b.addCase(revokeLicense.pending,   (s, a) => { s.actionLoading = a.meta.arg.licenseId; })
     .addCase(revokeLicense.fulfilled, (s, a) => {
       s.actionLoading = null;
       const l = s.licenses.find(l => l.id === a.payload.licenseId);
       if (l) l.status = 'revoked';
       s.toast = { type: 'success', msg: 'License revoked' };
     })
     .addCase(revokeLicense.rejected, (s, a) => { s.actionLoading = null; s.toast = { type: 'error', msg: a.payload }; });

    b.addCase(editLicense.pending,   (s, a) => { s.actionLoading = a.meta.arg.licenseId; })
     .addCase(editLicense.fulfilled, (s, a) => {
       s.actionLoading = null; s.editModal = null;
       const l = s.licenses.find(l => l.id === a.payload.licenseId);
       if (l) Object.assign(l, a.payload);
       s.toast = { type: 'success', msg: 'License updated' };
     })
     .addCase(editLicense.rejected, (s, a) => { s.actionLoading = null; s.toast = { type: 'error', msg: a.payload }; });
  },
});

export const { clearToast, setToast, openEditModal, closeEditModal, clearDetail } = licenseSlice.actions;
export default licenseSlice.reducer;