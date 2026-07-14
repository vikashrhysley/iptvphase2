import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchAdminMetrics, apiFetchAdminErrors, apiFetchAdminAlerts, apiAcknowledgeAlert, apiResolveAlert, apiArchiveAlert } from '../../services/api';

export const fetchAdminMetrics = createAsyncThunk('monitoring/fetchMetrics',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchAdminMetrics(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (_, { getState }) => !getState().monitoring.metricsLoading }
);

export const fetchAdminErrors = createAsyncThunk('monitoring/fetchErrors',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchAdminErrors(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (_, { getState }) => !getState().monitoring.errorsLoading }
);

export const fetchAdminAlerts = createAsyncThunk('monitoring/fetchAlerts',
  async (params, { getState, rejectWithValue }) => {
    try { return await apiFetchAdminAlerts(getState().auth.accessToken, params); }
    catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (_, { getState }) => !getState().monitoring.alertsLoading }
);

const mkAlertAction = (name, apiFn, nextStatus) =>
  createAsyncThunk(`monitoring/${name}`,
    async (id, { getState, rejectWithValue }) => {
      try {
        await apiFn(getState().auth.accessToken, id);
        return { id, status: nextStatus };
      } catch (err) { return rejectWithValue(err.message); }
    }
  );

export const acknowledgeAlert = mkAlertAction('acknowledgeAlert', apiAcknowledgeAlert, 'acknowledged');
export const resolveAlert     = mkAlertAction('resolveAlert',     apiResolveAlert,     'resolved');
export const archiveAlert     = mkAlertAction('archiveAlert',     apiArchiveAlert,     'archived');

const DEFAULT_ALERT_FILTERS = {
  status: 'open', severity: '', start_date: '', end_date: '', page: 1, page_size: 20,
};

const monitoringSlice = createSlice({
  name: 'monitoring',
  initialState: {
    metrics:       null, metricsLoading: false, metricsError: null, metricsLastChecked: null,
    errors:        null, errorsLoading:  false, errorsError:  null, errorsLastChecked:  null,
    alerts:        [],   alertsLoading:  false, alertsError:  null, alertsMeta: {},
    alertFilters: DEFAULT_ALERT_FILTERS,
    alertActioning: [],  // alert IDs currently being transitioned
    alertActionError: null,
  },
  reducers: {
    setAlertFilters(s, a) { s.alertFilters = { ...s.alertFilters, ...a.payload }; },
    resetAlertFilters(s)  { s.alertFilters = DEFAULT_ALERT_FILTERS; },
  },
  extraReducers: (b) => {
    b.addCase(fetchAdminMetrics.pending,   (s) => { s.metricsLoading = true;  s.metricsError = null; })
     .addCase(fetchAdminMetrics.fulfilled, (s, a) => { s.metricsLoading = false; s.metrics = a.payload; s.metricsLastChecked = new Date().toISOString(); })
     .addCase(fetchAdminMetrics.rejected,  (s, a) => { s.metricsLoading = false; s.metricsError = a.payload; });

    b.addCase(fetchAdminErrors.pending,   (s) => { s.errorsLoading = true;  s.errorsError = null; })
     .addCase(fetchAdminErrors.fulfilled, (s, a) => { s.errorsLoading = false; s.errors = a.payload; s.errorsLastChecked = new Date().toISOString(); })
     .addCase(fetchAdminErrors.rejected,  (s, a) => { s.errorsLoading = false; s.errorsError = a.payload; });

    b.addCase(fetchAdminAlerts.pending,   (s) => { s.alertsLoading = true;  s.alertsError = null; })
     .addCase(fetchAdminAlerts.fulfilled, (s, a) => { s.alertsLoading = false; s.alerts = a.payload.data; s.alertsMeta = a.payload.meta; })
     .addCase(fetchAdminAlerts.rejected,  (s, a) => { s.alertsLoading = false; s.alertsError = a.payload; });

    [acknowledgeAlert, resolveAlert, archiveAlert].forEach(thunk => {
      b.addCase(thunk.pending,   (s, a) => {
        s.alertActioning = [...s.alertActioning, a.meta.arg];
        s.alertActionError = null;
      })
       .addCase(thunk.fulfilled, (s, a) => {
        s.alertActioning = s.alertActioning.filter(id => id !== a.payload.id);
        const idx = s.alerts.findIndex(al => al.id === a.payload.id);
        if (idx !== -1) s.alerts[idx] = { ...s.alerts[idx], status: a.payload.status };
      })
       .addCase(thunk.rejected,  (s, a) => {
        s.alertActioning = s.alertActioning.filter(id => id !== a.meta.arg);
        s.alertActionError = a.payload;
      });
    });
  },
});

export const { setAlertFilters, resetAlertFilters } = monitoringSlice.actions;
export default monitoringSlice.reducer;
