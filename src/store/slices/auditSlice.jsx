import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchAuditLogs, apiFetchAuditLogDetail } from '../../services/api';

const DEFAULT_FILTERS = {
  action:      '',
  entity_type: '',
  severity:    '',
  date_from:   '',
  date_to:     '',
  ip_address:  '',
  page:        1,
  page_size:   20,
};

export const fetchAuditLogs = createAsyncThunk('audit/fetchLogs',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchAuditLogs(accessToken, params);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchAuditLogDetail = createAsyncThunk('audit/fetchDetail',
  async (id, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchAuditLogDetail(accessToken, id);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

const auditSlice = createSlice({
  name: 'audit',
  initialState: {
    logs:          [],
    total:         0,
    page:          1,
    pageSize:      20,
    loading:       false,
    error:         null,
    filters:       { ...DEFAULT_FILTERS },
    selectedLog:   null,
    detailLoading: false,
    detailError:   null,
  },
  reducers: {
    setAuditFilters(s, a) {
      s.filters = { ...s.filters, ...a.payload };
    },
    clearAuditFilters(s) {
      s.filters = { ...DEFAULT_FILTERS };
    },
    clearAuditDetail(s) {
      s.selectedLog  = null;
      s.detailError  = null;
    },
  },
  extraReducers: b => {
    b.addCase(fetchAuditLogs.pending,   s => { s.loading = true; s.error = null; })
     .addCase(fetchAuditLogs.fulfilled, (s, a) => {
       const p    = a.payload ?? {};
       s.loading  = false;
       s.logs     = Array.isArray(p.logs) ? p.logs : [];
       s.total    = p.total    ?? s.total;
       s.page     = p.page     ?? s.page;
       s.pageSize = p.pageSize ?? s.pageSize;
     })
     .addCase(fetchAuditLogs.rejected,  (s, a) => { s.loading = false; s.error = a.payload ?? 'Failed to load audit logs'; });

    b.addCase(fetchAuditLogDetail.pending,   s => { s.detailLoading = true; s.detailError = null; s.selectedLog = null; })
     .addCase(fetchAuditLogDetail.fulfilled, (s, a) => { s.detailLoading = false; s.selectedLog = a.payload ?? null; })
     .addCase(fetchAuditLogDetail.rejected,  (s, a) => { s.detailLoading = false; s.detailError = a.payload ?? 'Failed to load detail'; });
  },
});

export const { setAuditFilters, clearAuditFilters, clearAuditDetail } = auditSlice.actions;
export default auditSlice.reducer;
