import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiGetRbacRoles,
  apiGetRbacModules,
  apiCreateRbacRole,
  apiGetRbacRoleDetail,
  apiPatchRbacRole,
  apiDeleteRbacRole,
  apiPutRbacRolePermissions,
  apiPatchRbacRolePermissions,
  apiAssignRbacRole,
  apiCreateRbacModule,
  apiDeleteRbacModule,
  apiGetAssignableRoles,
} from '../../services/api';

export const fetchRbacRoles = createAsyncThunk('rbac/fetchRoles',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiGetRbacRoles(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchRbacModules = createAsyncThunk('rbac/fetchModules',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiGetRbacModules(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const createRbacRole = createAsyncThunk('rbac/createRole',
  async (payload, { getState, rejectWithValue }) => {
    try { return await apiCreateRbacRole(getState().auth.accessToken, payload); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchRoleDetail = createAsyncThunk('rbac/fetchRoleDetail',
  async (roleId, { getState, rejectWithValue }) => {
    try { return await apiGetRbacRoleDetail(getState().auth.accessToken, roleId); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const updateRbacRole = createAsyncThunk('rbac/updateRole',
  async ({ roleId, ...updates }, { getState, rejectWithValue }) => {
    try { return await apiPatchRbacRole(getState().auth.accessToken, roleId, updates); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const deleteRbacRole = createAsyncThunk('rbac/deleteRole',
  async (roleId, { getState, rejectWithValue }) => {
    try { await apiDeleteRbacRole(getState().auth.accessToken, roleId); return roleId; }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const putRolePermissions = createAsyncThunk('rbac/putRolePermissions',
  async ({ roleId, permissions }, { getState, rejectWithValue }) => {
    try { return await apiPutRbacRolePermissions(getState().auth.accessToken, roleId, permissions); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const patchRolePermissions = createAsyncThunk('rbac/patchRolePermissions',
  async ({ roleId, add, remove }, { getState, rejectWithValue }) => {
    try { return await apiPatchRbacRolePermissions(getState().auth.accessToken, roleId, { add, remove }); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const assignRbacRole = createAsyncThunk('rbac/assignRole',
  async ({ roleId, user_id, reason }, { getState, rejectWithValue }) => {
    try { return await apiAssignRbacRole(getState().auth.accessToken, roleId, { user_id, reason }); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const createRbacModule = createAsyncThunk('rbac/createModule',
  async (payload, { getState, rejectWithValue }) => {
    try { return await apiCreateRbacModule(getState().auth.accessToken, payload); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const deleteRbacModule = createAsyncThunk('rbac/deleteModule',
  async (moduleId, { getState, rejectWithValue }) => {
    try { return await apiDeleteRbacModule(getState().auth.accessToken, moduleId); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const fetchAssignableRoles = createAsyncThunk('rbac/fetchAssignableRoles',
  async (_, { getState, rejectWithValue }) => {
    try { return await apiGetAssignableRoles(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

const mergeRole = (roles, updated) => {
  if (!updated?.id) return;
  const idx = roles.findIndex(r => r.id === updated.id);
  if (idx !== -1) roles[idx] = { ...roles[idx], ...updated };
};

const rbacSlice = createSlice({
  name: 'rbac',
  initialState: {
    roles: [], modules: [], roleDetail: null,
    rolesLoading: false, modulesLoading: false, roleDetailLoading: false,
    rolesError: null, modulesError: null, roleDetailError: null,
    saving: false, saveError: null,
    creating: false, createError: null,
    updating: false, updateError: null,
    deleting: false, deleteError: null,
    assigning: false, assignError: null,
    creatingModule: false, createModuleError: null,
    deletingModule: false, deleteModuleError: null,
    assignableRoles: [], assignableRolesLoading: false, assignableRolesError: null,
  },
  reducers: {
    clearCreateError:       s => { s.createError = null; },
    clearUpdateError:       s => { s.updateError = null; },
    clearDeleteError:       s => { s.deleteError = null; },
    clearAssignError:       s => { s.assignError = null; },
    clearCreateModuleError: s => { s.createModuleError = null; },
    clearDeleteModuleError: s => { s.deleteModuleError = null; },
    clearRoleDetail:        s => { s.roleDetail = null; s.roleDetailError = null; },
  },
  extraReducers: b => {
    b.addCase(fetchRbacRoles.pending,   s => { s.rolesLoading = true;  s.rolesError = null; })
     .addCase(fetchRbacRoles.fulfilled, (s, a) => { s.rolesLoading = false; s.roles = Array.isArray(a.payload) ? a.payload : []; })
     .addCase(fetchRbacRoles.rejected,  (s, a) => { s.rolesLoading = false; s.rolesError = a.payload ?? 'Failed'; });

    b.addCase(fetchRbacModules.pending,   s => { s.modulesLoading = true;  s.modulesError = null; })
     .addCase(fetchRbacModules.fulfilled, (s, a) => { s.modulesLoading = false; s.modules = Array.isArray(a.payload) ? a.payload : []; })
     .addCase(fetchRbacModules.rejected,  (s, a) => { s.modulesLoading = false; s.modulesError = a.payload ?? 'Failed'; });

    b.addCase(createRbacRole.pending,   s => { s.creating = true;  s.createError = null; })
     .addCase(createRbacRole.fulfilled, (s, a) => { s.creating = false; const r = a.payload?.data ?? a.payload; if (r?.id) s.roles.push(r); })
     .addCase(createRbacRole.rejected,  (s, a) => { s.creating = false; s.createError = a.payload ?? 'Failed to create role'; });

    b.addCase(fetchRoleDetail.pending,   s => { s.roleDetailLoading = true;  s.roleDetailError = null; })
     .addCase(fetchRoleDetail.fulfilled, (s, a) => { s.roleDetailLoading = false; const d = a.payload?.data ?? a.payload; s.roleDetail = d; mergeRole(s.roles, d); })
     .addCase(fetchRoleDetail.rejected,  (s, a) => { s.roleDetailLoading = false; s.roleDetailError = a.payload ?? 'Failed'; });

    b.addCase(updateRbacRole.pending,   s => { s.updating = true;  s.updateError = null; })
     .addCase(updateRbacRole.fulfilled, (s, a) => { s.updating = false; mergeRole(s.roles, a.payload?.data ?? a.payload); })
     .addCase(updateRbacRole.rejected,  (s, a) => { s.updating = false; s.updateError = a.payload ?? 'Failed to update role'; });

    b.addCase(deleteRbacRole.pending,   s => { s.deleting = true;  s.deleteError = null; })
     .addCase(deleteRbacRole.fulfilled, (s, a) => { s.deleting = false; s.roles = s.roles.filter(r => r.id !== a.payload); })
     .addCase(deleteRbacRole.rejected,  (s, a) => { s.deleting = false; s.deleteError = a.payload ?? 'Failed to delete role'; });

    b.addCase(putRolePermissions.pending,   s => { s.saving = true;  s.saveError = null; })
     .addCase(putRolePermissions.fulfilled, (s, a) => { s.saving = false; mergeRole(s.roles, a.payload?.data ?? a.payload); })
     .addCase(putRolePermissions.rejected,  (s, a) => { s.saving = false; s.saveError = a.payload ?? 'Failed'; });

    b.addCase(patchRolePermissions.pending,   s => { s.saving = true;  s.saveError = null; })
     .addCase(patchRolePermissions.fulfilled, (s, a) => { s.saving = false; mergeRole(s.roles, a.payload?.data ?? a.payload); })
     .addCase(patchRolePermissions.rejected,  (s, a) => { s.saving = false; s.saveError = a.payload ?? 'Failed'; });

    b.addCase(assignRbacRole.pending,   s => { s.assigning = true;  s.assignError = null; })
     .addCase(assignRbacRole.fulfilled, s => { s.assigning = false; })
     .addCase(assignRbacRole.rejected,  (s, a) => { s.assigning = false; s.assignError = a.payload ?? 'Failed to assign role'; });

    b.addCase(createRbacModule.pending,   s => { s.creatingModule = true;  s.createModuleError = null; })
     .addCase(createRbacModule.fulfilled, (s, a) => {
       s.creatingModule = false;
       const m = a.payload?.data ?? a.payload;
       if (m?.name) s.modules.push(m);
     })
     .addCase(createRbacModule.rejected,  (s, a) => { s.creatingModule = false; s.createModuleError = a.payload ?? 'Failed to register module'; });

    b.addCase(deleteRbacModule.pending,   s => { s.deletingModule = true;  s.deleteModuleError = null; })
     .addCase(deleteRbacModule.fulfilled, (s, a) => {
       s.deletingModule = false;
       const id = a.payload?.id ?? a.payload;
       s.modules = s.modules.filter(m => m.id !== id && m.name !== id);
     })
     .addCase(deleteRbacModule.rejected,  (s, a) => { s.deletingModule = false; s.deleteModuleError = a.payload ?? 'Failed to delete module'; });

    b.addCase(fetchAssignableRoles.pending,   s => { s.assignableRolesLoading = true;  s.assignableRolesError = null; })
     .addCase(fetchAssignableRoles.fulfilled, (s, a) => { s.assignableRolesLoading = false; s.assignableRoles = Array.isArray(a.payload) ? a.payload : []; })
     .addCase(fetchAssignableRoles.rejected,  (s, a) => { s.assignableRolesLoading = false; s.assignableRolesError = a.payload ?? 'Failed to load roles'; });
  },
});

export const {
  clearCreateError, clearUpdateError, clearDeleteError,
  clearAssignError, clearCreateModuleError, clearDeleteModuleError, clearRoleDetail,
} = rbacSlice.actions;
export default rbacSlice.reducer;
