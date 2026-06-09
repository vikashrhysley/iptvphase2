import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGetRbacRoles, apiGetRbacModules } from '../../services/api';

export const fetchRbacRoles = createAsyncThunk('rbac/fetchRoles',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiGetRbacRoles(accessToken);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchRbacModules = createAsyncThunk('rbac/fetchModules',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { accessToken } = getState().auth;
      return await apiGetRbacModules(accessToken);
    } catch (err) { return rejectWithValue(err.message); }
  }
);

const rbacSlice = createSlice({
  name: 'rbac',
  initialState: {
    roles:          [],
    modules:        [],
    rolesLoading:   false,
    modulesLoading: false,
    rolesError:     null,
    modulesError:   null,
  },
  reducers: {},
  extraReducers: b => {
    b.addCase(fetchRbacRoles.pending,   s => { s.rolesLoading = true;  s.rolesError = null; })
     .addCase(fetchRbacRoles.fulfilled, (s, a) => { s.rolesLoading = false; s.roles   = Array.isArray(a.payload) ? a.payload : []; })
     .addCase(fetchRbacRoles.rejected,  (s, a) => { s.rolesLoading = false; s.rolesError   = a.payload ?? 'Failed to load roles'; });

    b.addCase(fetchRbacModules.pending,   s => { s.modulesLoading = true;  s.modulesError = null; })
     .addCase(fetchRbacModules.fulfilled, (s, a) => { s.modulesLoading = false; s.modules = Array.isArray(a.payload) ? a.payload : []; })
     .addCase(fetchRbacModules.rejected,  (s, a) => { s.modulesLoading = false; s.modulesError = a.payload ?? 'Failed to load modules'; });
  },
});

export default rbacSlice.reducer;
