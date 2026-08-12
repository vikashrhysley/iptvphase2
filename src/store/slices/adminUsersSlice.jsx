import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiCreateAdminUser,
  apiFetchAdminUserDetail,
  apiFetchAdminUsers,
  apiFetchAdminUsersStats,
  apiGetAssignableRoles,
  apiUpdateAdminUser,
} from '../../services/api';

const DEFAULT_PAGE_SIZE = 8;

export const fetchAdminUsersStats = createAsyncThunk(
  'adminUsers/fetchStats',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchAdminUsersStats(accessToken);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  { condition: (_, { getState }) => {
    const { statsLoading, stats } = getState().adminUsers;
    return !statsLoading && !stats;
  }}
);

export const fetchAdminUsers = createAsyncThunk(
  'adminUsers/fetchUsers',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchAdminUsers(accessToken, {
        role: params.role,
        status: params.status,
        page: params.page,
        page_size: params.page_size,
      });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchAdminUserDetail = createAsyncThunk(
  'adminUsers/fetchDetail',
  async (userId, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchAdminUserDetail(accessToken, userId);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateAdminUser = createAsyncThunk(
  'adminUsers/updateUser',
  async ({ userId, data }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiUpdateAdminUser(accessToken, userId, data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createAdminUser = createAsyncThunk(
  'adminUsers/createUser',
  async (data, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiCreateAdminUser(accessToken, data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchAssignableRoles = createAsyncThunk(
  'adminUsers/fetchAssignableRoles',
  async (_arg, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiGetAssignableRoles(accessToken);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
  // Cached: only fetch once (when empty). Pass { force: true } to bypass the cache and pull a
  // fresh list — e.g. right after a new role is created, so it shows up without a page reload.
  { condition: (arg, { getState }) => {
    if (arg && arg.force) return true;
    const { assignableRolesLoading, assignableRoles } = getState().adminUsers;
    return !assignableRolesLoading && assignableRoles.length === 0;
  }}
);

const adminUsersSlice = createSlice({
  name: 'adminUsers',
  initialState: {
    users: [],
    total: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,

    stats: null,

    loading: false,
    error: null,

    statsLoading: false,
    statsError: null,

    createLoading: false,
    createError: null,
    createdUser: null,

    selectedUser: null,
    detailLoading: false,
    detailError: null,

    updateLoading: false,
    updateError: null,
    updateSuccess: false,

    filters: {
      role: 'all',
      status: 'all',
      page: 1,
      page_size: DEFAULT_PAGE_SIZE,
    },

    lastRefreshAt: null,

    assignableRoles: [],
    assignableRolesLoading: false,
    assignableRolesError: null,
  },
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters(state) {
      state.filters = {
        role: 'all',
        status: 'all',
        page: 1,
        page_size: DEFAULT_PAGE_SIZE,
      };
    },
    resetUsersState(state) {
      state.users = [];
      state.total = 0;
      state.page = 1;
      state.pageSize = DEFAULT_PAGE_SIZE;
      state.error = null;
      state.loading = false;
    },
    clearCreateState(state) {
      state.createLoading = false;
      state.createError = null;
      state.createdUser = null;
    },
    clearSelectedUser(state) {
      state.selectedUser = null;
      state.detailLoading = false;
      state.detailError = null;
      state.updateLoading = false;
      state.updateError = null;
      state.updateSuccess = false;
    },
    clearUpdateState(state) {
      state.updateLoading = false;
      state.updateError = null;
      state.updateSuccess = false;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchAdminUsersStats.pending, (s) => {
      s.statsLoading = true;
      s.statsError = null;
    })
      .addCase(fetchAdminUsersStats.fulfilled, (s, a) => {
        s.statsLoading = false;
        s.stats = a.payload?.data || a.payload;
      })
      .addCase(fetchAdminUsersStats.rejected, (s, a) => {
        s.statsLoading = false;
        s.statsError = a.payload;
      });

    b.addCase(fetchAdminUsers.pending, (s) => {
      s.loading = true;
      s.error = null;
    })
      .addCase(fetchAdminUsers.fulfilled, (s, a) => {
        const payload = a.payload;
        const meta = payload?.meta || payload?.pagination || {};
        const rows = Array.isArray(payload?.users)
          ? payload.users
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];
        s.loading = false;
        s.users = rows;
        s.total = payload?.total
          ?? payload?.count
          ?? payload?.total_count
          ?? meta.total
          ?? meta.count
          ?? meta.total_count
          ?? meta.total_items
          ?? rows.length;
        s.page = payload?.page
          ?? payload?.current_page
          ?? meta.page
          ?? meta.current_page
          ?? s.filters.page;
        s.pageSize = payload?.pageSize
          ?? payload?.page_size
          ?? meta.pageSize
          ?? meta.page_size
          ?? s.filters.page_size;
        s.lastRefreshAt = Date.now();
      })
      .addCase(fetchAdminUsers.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      });

    b.addCase(fetchAdminUserDetail.pending, (s) => {
      s.detailLoading = true;
      s.detailError = null;
      s.selectedUser = null;
    })
      .addCase(fetchAdminUserDetail.fulfilled, (s, a) => {
        s.detailLoading = false;
        s.selectedUser = a.payload?.data || a.payload;
      })
      .addCase(fetchAdminUserDetail.rejected, (s, a) => {
        s.detailLoading = false;
        s.detailError = a.payload;
      });

    b.addCase(updateAdminUser.pending, (s) => {
      s.updateLoading = true;
      s.updateError = null;
      s.updateSuccess = false;
    })
      .addCase(updateAdminUser.fulfilled, (s, a) => {
        s.updateLoading = false;
        s.updateSuccess = true;
        const updated = a.payload?.data || a.payload;
        if (updated && s.selectedUser) {
          s.selectedUser = { ...s.selectedUser, ...updated };
        }
        // Patch the user in the list too
        const idx = s.users.findIndex((u) => u.id === updated?.id);
        if (idx !== -1) s.users[idx] = { ...s.users[idx], ...updated };
      })
      .addCase(updateAdminUser.rejected, (s, a) => {
        s.updateLoading = false;
        s.updateError = a.payload;
      });

    b.addCase(createAdminUser.pending, (s) => {
      s.createLoading = true;
      s.createError = null;
      s.createdUser = null;
    })
      .addCase(createAdminUser.fulfilled, (s, a) => {
        s.createLoading = false;
        s.createError = null;
        s.createdUser = a.payload?.data || a.payload;
      })
      .addCase(createAdminUser.rejected, (s, a) => {
        s.createLoading = false;
        s.createError = a.payload;
      });

    b.addCase(fetchAssignableRoles.pending, (s) => {
      s.assignableRolesLoading = true;
      s.assignableRolesError = null;
    })
      .addCase(fetchAssignableRoles.fulfilled, (s, a) => {
        s.assignableRolesLoading = false;
        s.assignableRoles = Array.isArray(a.payload) ? a.payload : [];
      })
      .addCase(fetchAssignableRoles.rejected, (s, a) => {
        s.assignableRolesLoading = false;
        s.assignableRolesError = a.payload;
      });
  },
});

export const {
  setFilters,
  clearFilters,
  resetUsersState,
  clearCreateState,
  clearSelectedUser,
  clearUpdateState,
} = adminUsersSlice.actions;

export default adminUsersSlice.reducer;

