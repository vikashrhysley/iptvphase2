// Get Help Support Console (§24) — queue, KPI summary, assignees and the open ticket.
// Ticket detail, analytics, templates and settings keep their own local state in the page.
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiFetchSupportTickets,
  apiFetchSupportSummary,
  apiFetchSupportAssignees,
} from '../../services/api';

export const DEFAULT_SUPPORT_FILTERS = {
  view:        'all_open',
  status:      '',
  priority:    '',
  ticket_type: '',
  category:    '',
  assignee:    '',
  sla_state:   '',
  date_from:   '',
  date_to:     '',
  q:           '',
  unread_only: false,
  sort:        'last_activity',
  page:        1,
  page_size:   25,
};

const TICKET_KEY = 'supportTicket';

// Only send what is set — the backend rejects unknown views/sorts with 422.
const toQuery = (f) => {
  const p = { view: f.view, sort: f.sort, page: f.page, page_size: f.page_size };
  ['status', 'priority', 'ticket_type', 'category', 'assignee', 'sla_state', 'date_from', 'date_to'].forEach((k) => {
    if (f[k]) p[k] = f[k];
  });
  if (f.q?.trim()) p.q = f.q.trim().slice(0, 200);
  if (f.unread_only) p.unread_only = true;
  return p;
};

export const fetchSupportTickets = createAsyncThunk(
  'support/fetchTickets',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth, support } = getState();
      return await apiFetchSupportTickets(auth.accessToken, toQuery(support.filters));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchSupportSummary = createAsyncThunk(
  'support/fetchSummary',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await apiFetchSupportSummary(getState().auth.accessToken);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchSupportAssignees = createAsyncThunk(
  'support/fetchAssignees',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await apiFetchSupportAssignees(getState().auth.accessToken);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  { condition: (params, { getState }) => {
    if (params?.force) return true;
    const { assigneesLoading, assigneesFetchedAt } = getState().support;
    return !assigneesLoading && (!assigneesFetchedAt || Date.now() - assigneesFetchedAt > 5 * 60_000);
  }}
);

const readStoredTicket = () => {
  try { return sessionStorage.getItem(TICKET_KEY) || null; } catch { return null; }
};

const supportSlice = createSlice({
  name: 'support',
  initialState: {
    filters:    { ...DEFAULT_SUPPORT_FILTERS },
    tickets:    [],
    total:      0,
    totalPages: 1,
    loading:    false,
    error:      null,
    lastFetched: null,
    latestRequestId: null,

    summary:        null,
    summaryLoading: false,
    summaryError:   null,

    assignees:          [],
    assigneesLoading:   false,
    assigneesError:     null,
    assigneesFetchedAt: null,

    activeTicket: readStoredTicket(),
  },
  reducers: {
    setSupportFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetSupportFilters(state, action) {
      state.filters = { ...DEFAULT_SUPPORT_FILTERS, ...(action.payload || {}) };
    },
    setActiveSupportTicket(state, action) {
      state.activeTicket = action.payload || null;
      try {
        if (action.payload) sessionStorage.setItem(TICKET_KEY, action.payload);
        else sessionStorage.removeItem(TICKET_KEY);
      } catch { /* storage unavailable — detail just won't survive a reload */ }
    },
    // Keep a queue row in step with an action taken in the detail view (no refetch needed).
    patchSupportTicketRow(state, action) {
      const { ticket_number, ...patch } = action.payload || {};
      const row = state.tickets.find((t) => t.ticket_number === ticket_number);
      if (row) Object.assign(row, patch);
    },
  },
  extraReducers: (b) => {
    // Quick filter clicks can overlap requests — only the latest one may write the list.
    b.addCase(fetchSupportTickets.pending,   (s, a) => { s.loading = true; s.error = null; s.latestRequestId = a.meta.requestId; })
     .addCase(fetchSupportTickets.fulfilled, (s, a) => {
       if (a.meta.requestId !== s.latestRequestId) return;
       s.loading     = false;
       s.lastFetched = Date.now();
       s.tickets     = a.payload.items;
       s.total       = a.payload.total;
       s.totalPages  = Math.max(1, a.payload.totalPages || 1);
     })
     .addCase(fetchSupportTickets.rejected,  (s, a) => {
       if (a.meta.requestId !== s.latestRequestId) return;
       s.loading = false;
       s.error   = a.payload;
     });

    b.addCase(fetchSupportSummary.pending,   (s) => { s.summaryLoading = true; s.summaryError = null; })
     .addCase(fetchSupportSummary.fulfilled, (s, a) => { s.summaryLoading = false; s.summary = a.payload || {}; })
     .addCase(fetchSupportSummary.rejected,  (s, a) => { s.summaryLoading = false; s.summaryError = a.payload; });

    b.addCase(fetchSupportAssignees.pending,   (s) => { s.assigneesLoading = true; s.assigneesError = null; })
     .addCase(fetchSupportAssignees.fulfilled, (s, a) => {
       s.assigneesLoading   = false;
       s.assigneesFetchedAt = Date.now();
       s.assignees          = a.payload || [];
     })
     .addCase(fetchSupportAssignees.rejected,  (s, a) => { s.assigneesLoading = false; s.assigneesError = a.payload; });
  },
});

export const {
  setSupportFilters,
  resetSupportFilters,
  setActiveSupportTicket,
  patchSupportTicketRow,
} = supportSlice.actions;
export default supportSlice.reducer;
