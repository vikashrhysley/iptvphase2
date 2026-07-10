import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchUserLoginHistory, apiFetchUserActivity, apiUpdateAppUser, apiFlagUserForReview, apiFetchAppUserDetail, apiFetchAppUsers, apiFetchAppUsersStats } from '../../services/api';

const DEFAULT_PAGE_SIZE = 10;

export const fetchUserLoginHistory = createAsyncThunk(
  'appUsers/fetchLoginHistory',
  async ({ userId, params }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchUserLoginHistory(accessToken, userId, params);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchUserActivity = createAsyncThunk(
  'appUsers/fetchActivity',
  async ({ userId, params }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchUserActivity(accessToken, userId, params);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const flagUserForReview = createAsyncThunk(
  'appUsers/flagForReview',
  async ({ userId, data }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFlagUserForReview(accessToken, userId, data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateAppUser = createAsyncThunk(
  'appUsers/updateUser',
  async ({ userId, data }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiUpdateAppUser(accessToken, userId, data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchAppUserDetail = createAsyncThunk(
  'appUsers/fetchDetail',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchAppUserDetail(accessToken, userId);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchAppUsersStats = createAsyncThunk(
  'appUsers/fetchStats',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchAppUsersStats(accessToken);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  { condition: (_, { getState }) => {
    const { statsLoading, stats } = getState().appUsers;
    return !statsLoading && !stats;
  }}
);

export const fetchAppUsers = createAsyncThunk(
  'appUsers/fetchUsers',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchAppUsers(accessToken, params);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  { condition: (_, { getState }) => {
    const { loading, lastFetched } = getState().appUsers;
    return !loading && (!lastFetched || Date.now() - lastFetched > 30_000);
  }}
);

const appUsersSlice = createSlice({
  name: 'appUsers',
  initialState: {
    users: [],
    total: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,

    loading: false,
    error: null,

    stats: null,
    statsLoading: false,
    statsError: null,

    selectedUser: null,
    detailLoading: false,
    detailError: null,

    updateLoading: false,
    updateError: null,
    updateSuccess: false,

    reviewLoading: false,
    reviewError: null,
    reviewSuccess: false,

    activityItems: [],
    activityTotal: 0,
    activityPage: 1,
    activityPageSize: 20,
    activityLoading: false,
    activityError: null,
    activityFilters: {
      content_type: 'all',
      date_from: '',
      date_to: '',
      page: 1,
      page_size: 20,
    },

    loginHistoryItems: [],
    loginHistoryTotal: 0,
    loginHistoryPage: 1,
    loginHistoryPageSize: 20,
    loginHistoryLoading: false,
    loginHistoryError: null,
    loginHistoryFilters: {
      status: 'all',
      page: 1,
      page_size: 20,
    },

    filters: {
      search: '',
      search_type: 'email',
      status: 'all',
      device_status: 'all',
      trial_used: 'all',
      sort_by: 'created_at',
      sort_order: 'desc',
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
    },
    lastFetched: null,
  },
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.lastFetched = null;
    },
    clearSelectedUser(state) {
      state.selectedUser  = null;
      state.detailLoading = false;
      state.detailError   = null;
      state.updateLoading = false;
      state.updateError   = null;
      state.updateSuccess = false;
      state.reviewLoading = false;
      state.reviewError   = null;
      state.reviewSuccess = false;
    },
    clearUpdateState(state) {
      state.updateLoading = false;
      state.updateError   = null;
      state.updateSuccess = false;
    },
    clearReviewState(state) {
      state.reviewLoading = false;
      state.reviewError   = null;
      state.reviewSuccess = false;
    },
    setActivityFilters(state, action) {
      state.activityFilters = { ...state.activityFilters, ...action.payload };
    },
    clearActivityState(state) {
      state.activityItems   = [];
      state.activityTotal   = 0;
      state.activityPage    = 1;
      state.activityLoading = false;
      state.activityError   = null;
      state.activityFilters = { content_type: 'all', date_from: '', date_to: '', page: 1, page_size: 20 };
    },
    setLoginHistoryFilters(state, action) {
      state.loginHistoryFilters = { ...state.loginHistoryFilters, ...action.payload };
    },
    clearLoginHistoryState(state) {
      state.loginHistoryItems   = [];
      state.loginHistoryTotal   = 0;
      state.loginHistoryPage    = 1;
      state.loginHistoryLoading = false;
      state.loginHistoryError   = null;
      state.loginHistoryFilters = { status: 'all', page: 1, page_size: 20 };
    },
    clearFilters(state) {
      state.filters = {
        search: '',
        search_type: 'email',
        status: 'all',
        device_status: 'all',
        trial_used: 'all',
        sort_by: 'created_at',
        sort_order: 'desc',
        page: 1,
        page_size: DEFAULT_PAGE_SIZE,
      };
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchUserLoginHistory.pending, (s) => {
      s.loginHistoryLoading = true;
      s.loginHistoryError   = null;
    })
      .addCase(fetchUserLoginHistory.fulfilled, (s, a) => {
        s.loginHistoryLoading  = false;
        s.loginHistoryItems    = a.payload.items;
        s.loginHistoryTotal    = a.payload.total;
        s.loginHistoryPage     = a.payload.page;
        s.loginHistoryPageSize = a.payload.pageSize;
      })
      .addCase(fetchUserLoginHistory.rejected, (s, a) => {
        s.loginHistoryLoading = false;
        s.loginHistoryError   = a.payload;
      });

    b.addCase(fetchUserActivity.pending, (s) => {
      s.activityLoading = true;
      s.activityError   = null;
    })
      .addCase(fetchUserActivity.fulfilled, (s, a) => {
        s.activityLoading = false;
        s.activityItems   = a.payload.items;
        s.activityTotal   = a.payload.total;
        s.activityPage    = a.payload.page;
        s.activityPageSize = a.payload.pageSize;
      })
      .addCase(fetchUserActivity.rejected, (s, a) => {
        s.activityLoading = false;
        s.activityError   = a.payload;
      });

    b.addCase(flagUserForReview.pending, (s) => {
      s.reviewLoading = true;
      s.reviewError   = null;
      s.reviewSuccess = false;
    })
      .addCase(flagUserForReview.fulfilled, (s, a) => {
        s.reviewLoading = false;
        s.reviewSuccess = true;
        if (s.selectedUser) {
          s.selectedUser.flagged_for_review = a.payload?.flagged_for_review ?? true;
          s.selectedUser.flagged_at         = a.payload?.flagged_at ?? new Date().toISOString();
        }
      })
      .addCase(flagUserForReview.rejected, (s, a) => {
        s.reviewLoading = false;
        s.reviewError   = a.payload;
      });

    b.addCase(updateAppUser.pending, (s) => {
      s.updateLoading = true;
      s.updateError   = null;
      s.updateSuccess = false;
    })
      .addCase(updateAppUser.fulfilled, (s, a) => {
        s.updateLoading = false;
        s.updateSuccess = true;
        const updated = a.payload?.data || a.payload;
        if (updated && s.selectedUser) {
          s.selectedUser = { ...s.selectedUser, ...updated };
        }
      })
      .addCase(updateAppUser.rejected, (s, a) => {
        s.updateLoading = false;
        s.updateError   = a.payload;
      });

    b.addCase(fetchAppUserDetail.pending, (s) => {
      s.detailLoading = true;
      s.detailError = null;
      s.selectedUser = null;
    })
      .addCase(fetchAppUserDetail.fulfilled, (s, a) => {
        s.detailLoading = false;
        s.selectedUser = a.payload?.data || a.payload;
      })
      .addCase(fetchAppUserDetail.rejected, (s, a) => {
        s.detailLoading = false;
        s.detailError = a.payload;
      });

    b.addCase(fetchAppUsersStats.pending, (s) => {
      s.statsLoading = true;
      s.statsError   = null;
    })
      .addCase(fetchAppUsersStats.fulfilled, (s, a) => {
        s.statsLoading = false;
        s.stats        = a.payload?.data || a.payload;
      })
      .addCase(fetchAppUsersStats.rejected, (s, a) => {
        s.statsLoading = false;
        s.statsError   = a.payload;
      });

    b.addCase(fetchAppUsers.pending, (s) => {
      s.loading = true;
      s.error = null;
    })
      .addCase(fetchAppUsers.fulfilled, (s, a) => {
        const p = a.payload;
        const meta = p?.meta || p?.pagination || {};
        const rows = Array.isArray(p?.users) ? p.users
          : Array.isArray(p?.data) ? p.data
          : Array.isArray(p) ? p : [];
        s.loading     = false;
        s.lastFetched = Date.now();
        s.users    = rows;
        s.total    = p?.total ?? p?.count ?? p?.total_count ?? meta.total ?? rows.length;
        s.page     = p?.page  ?? p?.current_page ?? meta.page ?? s.filters.page;
        s.pageSize = p?.pageSize ?? p?.page_size  ?? meta.page_size ?? s.filters.page_size;
      })
      .addCase(fetchAppUsers.rejected, (s, a) => {
        s.loading = false;
        s.error   = a.payload;
      });
  },
});

export const {
  setFilters, clearFilters,
  clearSelectedUser, clearUpdateState, clearReviewState,
  setActivityFilters, clearActivityState,
  setLoginHistoryFilters, clearLoginHistoryState,
} = appUsersSlice.actions;
export default appUsersSlice.reducer;
