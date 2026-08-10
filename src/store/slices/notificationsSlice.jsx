import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiFetchNotifications,
  apiFetchNotificationSummary,
  apiFetchNotificationUnreadCount,
  apiFetchNotificationDetail,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  apiFetchNotificationSummaryByUser,
  apiFetchNotificationUserGroups,
  apiFetchNotificationUserHistory,
  apiMarkUserNotificationsRead,
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

// ── User-grouped thunks ───────────────────────────────────
// Bell dropdown: users (about whom there are unread events), newest-active first.
export const fetchNotificationSummaryByUser = createAsyncThunk(
  'notifications/fetchSummaryByUser',
  async (limit, { getState, rejectWithValue }) => {
    try { return await apiFetchNotificationSummaryByUser(withToken(getState), limit); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

// Page level 1: paginated list of users with notification activity.
export const fetchNotificationUserGroups = createAsyncThunk(
  'notifications/fetchUserGroups',
  async (params, { getState, rejectWithValue }) => {
    try { return await apiFetchNotificationUserGroups(withToken(getState), params); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

// Page level 2: one user's full history (filterable, paginated).
export const fetchNotificationUserHistory = createAsyncThunk(
  'notifications/fetchUserHistory',
  async ({ userId, params }, { getState, rejectWithValue }) => {
    try { return await apiFetchNotificationUserHistory(withToken(getState), userId, params); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

// Mark one user's notifications read (optionally one category). marked_count/target_user_id
// in the payload let the reducer trim the badge, the bell list and the group row at once.
export const markUserNotificationsRead = createAsyncThunk(
  'notifications/markUserRead',
  async ({ userId, category } = {}, { getState, rejectWithValue }) => {
    try { return await apiMarkUserNotificationsRead(withToken(getState), userId, category); }
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

  // ── User-grouped views ──────────────────────────────────
  // Bell dropdown (summary-by-user).
  summaryByUser: { totalUnreadUsers: 0, users: [] },
  summaryByUserLoading: false,

  // Page level 1: user-grouped list.
  userGroups: [],
  userGroupsPage: 1,
  userGroupsPageSize: DEFAULT_PAGE_SIZE,
  userGroupsTotal: 0,
  userGroupsTotalPages: 1,
  userGroupsLoading: false,
  userGroupsError: null,
  userGroupsIncludeArchived: false,

  // Page level 2: one user's history + which user the page is currently drilled into.
  activeUser: null, // { user_id, email, full_name }
  userHistory: [],
  userHistoryPage: 1,
  userHistoryPageSize: DEFAULT_PAGE_SIZE,
  userHistoryTotal: 0,
  userHistoryTotalPages: 1,
  userHistoryLoading: false,
  userHistoryError: null,
  userHistoryFilters: {
    category: '',
    priority: '',
    include_archived: false,
    date_from: '',
    date_to: '',
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
  },
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
    // Which user the Notifications page is drilled into (null → the user-grouped list view).
    // Setting a user resets the per-user history filters to a clean slate.
    setActiveNotificationUser(state, action) {
      state.activeUser = action.payload;
      state.userHistory = [];
      state.userHistoryError = null;
      state.userHistoryFilters = {
        category: '', priority: '', include_archived: false,
        date_from: '', date_to: '', page: 1, page_size: state.userHistoryPageSize,
      };
    },
    setUserHistoryFilters(state, action) {
      state.userHistoryFilters = { ...state.userHistoryFilters, ...action.payload };
    },
    setUserGroupsIncludeArchived(state, action) {
      state.userGroupsIncludeArchived = action.payload;
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
        const hist = s.userHistory.find((n) => n.id === id);
        const wasUnread = ((item && !item.is_read) || (hist && !hist.is_read)) && a.payload?.already_read !== true;
        if (item) item.is_read = true;
        if (hist) hist.is_read = true;
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
        s.userHistory.forEach((n) => { if (!category || n.category === category) n.is_read = true; });
        if (category) {
          const row = s.summary.byCategory.find((c) => c.category === category);
          const removed = row?.unread_count ?? 0;
          if (row) row.unread_count = 0;
          s.unreadCount = Math.max(0, s.unreadCount - removed);
          s.summary.totalUnread = Math.max(0, s.summary.totalUnread - removed);
          // Per-user views: category read-all across all users is hard to reconcile locally;
          // leave the bell/group counts for the next poll/refetch to correct.
        } else {
          s.unreadCount = 0;
          s.summary = { totalUnread: 0, byCategory: s.summary.byCategory.map((c) => ({ ...c, unread_count: 0 })) };
          // Global read-all empties the bell (every user is now caught up) and zeroes group rows.
          s.summaryByUser = { totalUnreadUsers: 0, users: [] };
          s.userGroups.forEach((g) => { g.unread_count = 0; });
        }
      });

    // ── User-grouped extra reducers ─────────────────────────
    b.addCase(fetchNotificationSummaryByUser.pending,   (s) => { s.summaryByUserLoading = true; })
     .addCase(fetchNotificationSummaryByUser.fulfilled, (s, a) => { s.summaryByUserLoading = false; s.summaryByUser = a.payload; })
     .addCase(fetchNotificationSummaryByUser.rejected,  (s) => { s.summaryByUserLoading = false; });

    b.addCase(fetchNotificationUserGroups.pending,   (s) => { s.userGroupsLoading = true; s.userGroupsError = null; })
     .addCase(fetchNotificationUserGroups.fulfilled, (s, a) => {
        s.userGroupsLoading = false;
        s.userGroups = a.payload.items;
        s.userGroupsPage = a.payload.page;
        s.userGroupsPageSize = a.payload.pageSize;
        s.userGroupsTotal = a.payload.total;
        s.userGroupsTotalPages = a.payload.totalPages;
      })
     .addCase(fetchNotificationUserGroups.rejected, (s, a) => { s.userGroupsLoading = false; s.userGroupsError = a.payload; });

    b.addCase(fetchNotificationUserHistory.pending,   (s) => { s.userHistoryLoading = true; s.userHistoryError = null; })
     .addCase(fetchNotificationUserHistory.fulfilled, (s, a) => {
        s.userHistoryLoading = false;
        s.userHistory = a.payload.items;
        s.userHistoryPage = a.payload.page;
        s.userHistoryPageSize = a.payload.pageSize;
        s.userHistoryTotal = a.payload.total;
        s.userHistoryTotalPages = a.payload.totalPages;
      })
     .addCase(fetchNotificationUserHistory.rejected, (s, a) => { s.userHistoryLoading = false; s.userHistoryError = a.payload; });

    b.addCase(markUserNotificationsRead.fulfilled, (s, a) => {
        const category = a.payload?.category ?? a.meta.arg?.category ?? null;
        const userId   = a.payload?.target_user_id ?? a.meta.arg?.userId ?? null;
        const marked   = a.payload?.marked_count ?? 0;

        // Badge: drop the marked count (poll will reconcile any drift).
        s.unreadCount = Math.max(0, s.unreadCount - marked);

        // Bell dropdown: a fully-read user drops out; a category read-all just decrements.
        const su = s.summaryByUser.users.find((u) => u.user_id === userId);
        if (su) {
          if (!category) {
            s.summaryByUser.users = s.summaryByUser.users.filter((u) => u.user_id !== userId);
            s.summaryByUser.totalUnreadUsers = Math.max(0, s.summaryByUser.totalUnreadUsers - 1);
          } else {
            su.unread_count = Math.max(0, (su.unread_count ?? 0) - marked);
            if (su.unread_count === 0) {
              s.summaryByUser.users = s.summaryByUser.users.filter((u) => u.user_id !== userId);
              s.summaryByUser.totalUnreadUsers = Math.max(0, s.summaryByUser.totalUnreadUsers - 1);
            }
          }
        }

        // Page level 1 group row.
        const g = s.userGroups.find((u) => u.user_id === userId);
        if (g) g.unread_count = Math.max(0, (g.unread_count ?? 0) - marked);

        // Page level 2 history rows (the user currently drilled into).
        if (s.activeUser && s.activeUser.user_id === userId) {
          s.userHistory.forEach((n) => { if (!category || n.category === category) n.is_read = true; });
        }
      });
  },
});

export const {
  setNotificationFilters,
  clearNotificationDetail,
  dropReadFromCount,
  removeNotification,
  setActiveNotificationUser,
  setUserHistoryFilters,
  setUserGroupsIncludeArchived,
} = notificationsSlice.actions;
export default notificationsSlice.reducer;
