// src/store/slices/dashboardSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetchUsers, apiUpdateDevice, apiRevokeAccount, apiEditUser } from '../../services/api';

export const fetchUsers = createAsyncThunk(
  'dashboard/fetchUsers',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiFetchUsers(accessToken);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateDevice = createAsyncThunk(
  'dashboard/updateDevice',
  async ({ userId, status }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiUpdateDevice(accessToken, userId, status);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const revokeAccount = createAsyncThunk(
  'dashboard/revokeAccount',
  async ({ userId }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiRevokeAccount(accessToken, userId);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const editUser = createAsyncThunk(
  'dashboard/editUser',
  async ({ userId, data }, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiEditUser(accessToken, userId, data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    users: [],
    loading: false,
    error: null,
    actionLoading: null,
    editModal: null, // { userId, data }
    notification: null,
  },
  reducers: {
    openEditModal(state, action) {
      state.editModal = action.payload;
    },
    closeEditModal(state) {
      state.editModal = null;
    },
    clearNotification(state) {
      state.notification = null;
    },
    setNotification(state, action) {
      state.notification = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(updateDevice.pending, (state, action) => {
        state.actionLoading = action.meta.arg.userId;
      })
      .addCase(updateDevice.fulfilled, (state, action) => {
        state.actionLoading = null;
        const user = state.users.find(u => u.id === action.payload.userId);
        if (user) user.device = action.payload.device;
        state.notification = { type: 'success', message: `Device status updated successfully` };
      })
      .addCase(updateDevice.rejected, (state, action) => {
        state.actionLoading = null;
        state.notification = { type: 'error', message: action.payload };
      });

    builder
      .addCase(revokeAccount.pending, (state, action) => {
        state.actionLoading = action.meta.arg.userId;
      })
      .addCase(revokeAccount.fulfilled, (state, action) => {
        state.actionLoading = null;
        const user = state.users.find(u => u.id === action.payload.userId);
        if (user) user.account = 'revoked';
        state.notification = { type: 'success', message: 'Account revoked successfully' };
      })
      .addCase(revokeAccount.rejected, (state, action) => {
        state.actionLoading = null;
        state.notification = { type: 'error', message: action.payload };
      });

    builder
      .addCase(editUser.pending, (state) => { state.actionLoading = 'edit'; })
      .addCase(editUser.fulfilled, (state, action) => {
        state.actionLoading = null;
        state.editModal = null;
        const user = state.users.find(u => u.id === action.payload.userId);
        if (user) Object.assign(user, action.payload);
        state.notification = { type: 'success', message: 'User updated successfully' };
      })
      .addCase(editUser.rejected, (state, action) => {
        state.actionLoading = null;
        state.notification = { type: 'error', message: action.payload };
      });
  },
});

export const { openEditModal, closeEditModal, clearNotification, setNotification } = dashboardSlice.actions;
export default dashboardSlice.reducer;
