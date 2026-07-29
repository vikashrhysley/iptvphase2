import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiFetchNotifications,
  apiFetchNotificationSummary,
  apiFetchNotificationUnreadCount,
  apiFetchNotificationDetail,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
} from '../../services/api';

const DEFAULT_PAGE_SIZE = 20;

const withToken = (getState) => getState().auth.accessToken;

// ── Thunks ────────────────────────────────────────────────
// Badge poll (~15–20s). Kept silent (no loading flag) so polling never flickers UI.
export const fetchNotificationUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchNotificationUnreadCount(withToken(getState)); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

// Dropdown summary poll (~30–60s).
export const fetchNotificationSummary = createAsyncThunk(
  'notifications/fetchSummary',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiFetchNotificationSummary(withToken(getState)); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchList',
  async (params, { getState, rejectWithValue }) => {
    try { return await apiFetchNotifications(withToken(getState), params); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchNotificationDetail = createAsyncThunk(
  'notifications/fetchDetail',
  async (id, { getState, rejectWithValue }) => {
    try { return await apiFetchNotificationDetail(withToken(getState), id); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

// Mark one read for the calling admin. `notification` carries category/was-unread so
// the reducer can optimistically adjust the badge + summary without a refetch.
export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async ({ id }, { getState, rejectWithValue }) => {
    try { return await apiMarkNotificationRead(withToken(getState), id); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async ({ category } = {}, { getState, rejectWithValue }) => {
    try { return await apiMarkAllNotificationsRead(withToken(getState), category); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

// Mark ONLY the notifications currently loaded on the page (this page + filter), by
// calling the per-id read endpoint for each unread one. Used by the page's "Mark all
// read" so it never touches items the admin can't currently see.
export const markVisibleNotificationsRead = createAsyncThunk(
  'notifications/markVisibleRead',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth, notifications } = getState();
      const unread = notifications.items.filter((n) => !n.is_read);
      await Promise.all(unread.map((n) => apiMarkNotificationRead(auth.accessToken, n.id)));
      return unread.map((n) => n.id);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

const initialState = {
  unreadCount: 0,
  // Ids marked-read on the server but whose local badge drop is still on the 5s delay.
  // Cleared whenever the poll fetches an authoritative count, so the delayed drop never
  // double-counts against polling.
  pendingReadIds: [],

  summary: { totalUnread: 0, byCategory: [] },
  summaryLoading: false,

  items: [],
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
  loading: false,
  error: null,
  filters: {
    is_read: 'all',        // 'all' | 'true' | 'false'
    category: '',
    priority: '',
    include_archived: false,
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
  },

  detail: null,
  detailLoading: false,
  detailError: null,
};

// Drop one unread from the badge + the matching category in the summary.
const decrementUnread = (state, category) => {
  state.unreadCount = Math.max(0, state.unreadCount - 1);
  state.summary.totalUnread = Math.max(0, state.summary.totalUnread - 1);
  const row = state.summary.byCategory.find((c) => c.category === category);
  if (row) row.unread_count = Math.max(0, (row.unread_count ?? 0) - 1);
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotificationFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearNotificationDetail(state) {
      state.detail = null;
      state.detailError = null;
    },
    // Delayed badge drop (fired ~5s after a click). Only applies if the id is still
    // pending — if the poll already reconciled the count, this is a no-op.
    dropReadFromCount(state, action) {
      const { id, category } = action.payload;
      if (!state.pendingReadIds.includes(id)) return;
      state.pendingReadIds = state.pendingReadIds.filter((x) => x !== id);
      decrementUnread(state, category);
    },
    // Delayed list removal (fired ~10s after a click).
    removeNotification(state, action) {
      state.items = state.items.filter((n) => n.id !== action.payload);
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchNotificationUnreadCount.fulfilled, (s, a) => {
        s.unreadCount = a.payload;   // server truth
        s.pendingReadIds = [];       // poll accounts for all reads → cancel pending drops
      });

    b.addCase(fetchNotificationSummary.pending,   (s) => { s.summaryLoading = true; })
     .addCase(fetchNotificationSummary.fulfilled, (s, a) => { s.summaryLoading = false; s.summary = a.payload; })
     .addCase(fetchNotificationSummary.rejected,  (s) => { s.summaryLoading = false; });

    b.addCase(fetchNotifications.pending,   (s) => { s.loading = true; s.error = null; })
     .addCase(fetchNotifications.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload.items;
        s.page = a.payload.page;
        s.pageSize = a.payload.pageSize;
        s.total = a.payload.total;
        s.totalPages = a.payload.totalPages;
      })
     .addCase(fetchNotifications.rejected, (s, a) => { s.loading = false; s.error = a.payload; });

    b.addCase(fetchNotificationDetail.pending,   (s) => { s.detailLoading = true; s.detailError = null; })
     .addCase(fetchNotificationDetail.fulfilled, (s, a) => { s.detailLoading = false; s.detail = a.payload; })
     .addCase(fetchNotificationDetail.rejected,  (s, a) => { s.detailLoading = false; s.detailError = a.payload; });

    b.addCase(markNotificationRead.fulfilled, (s, a) => {
        const id = a.payload?.id ?? a.meta.arg.id;
        const item = s.items.find((n) => n.id === id);
        // Mark the visual read state now; the badge drop is deferred (dropReadFromCount, ~5s)
        // and the list removal is deferred too (removeNotification, ~10s).
        const wasUnread = item && !item.is_read && a.payload?.already_read !== true;
        if (item) item.is_read = true;
        if (s.detail && s.detail.id === id) s.detail.is_read = true;
        if (wasUnread && !s.pendingReadIds.includes(id)) s.pendingReadIds.push(id);
      });

    b.addCase(markVisibleNotificationsRead.fulfilled, (s, a) => {
        const ids = new Set(a.payload);
        s.items.forEach((n) => { if (ids.has(n.id)) n.is_read = true; });
        // Count/summary are refreshed authoritatively by the page (fetchUnreadCount + summary).
      });

    b.addCase(markAllNotificationsRead.fulfilled, (s, a) => {
        const category = a.payload?.category ?? a.meta.arg?.category ?? null;
        s.items.forEach((n) => { if (!category || n.category === category) n.is_read = true; });
        if (category) {
          const row = s.summary.byCategory.find((c) => c.category === category);
          const removed = row?.unread_count ?? 0;
          if (row) row.unread_count = 0;
          s.unreadCount = Math.max(0, s.unreadCount - removed);
          s.summary.totalUnread = Math.max(0, s.summary.totalUnread - removed);
        } else {
          s.unreadCount = 0;
          s.summary = { totalUnread: 0, byCategory: s.summary.byCategory.map((c) => ({ ...c, unread_count: 0 })) };
        }
      });
  },
});

export const {
  setNotificationFilters,
  clearNotificationDetail,
  dropReadFromCount,
  removeNotification,
} = notificationsSlice.actions;
export default notificationsSlice.reducer;
