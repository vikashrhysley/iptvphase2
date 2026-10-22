import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  apiGetRbacRoles,
  apiGetRbacModules,
  apiCreateRbacRole,
  apiGetRbacRoleDetail,
  apiPatchRbacRole,
  apiDeleteRbacRole,
  apiPutRbacRolePermissions,
  apiAssignRbacRole,
  apiPatchRbacModule,
  apiDeleteRbacModule,
} from '../../services/api';

// Cached after the first load; pass { force: true } to refetch after a change.
export const fetchRbacRoles = createAsyncThunk('rbac/fetchRoles',
  async (_arg, { getState, rejectWithValue }) => {
    try { return await apiGetRbacRoles(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (arg, { getState }) => {
    const { rolesLoading, roles } = getState().rbac;
    return !rolesLoading && (arg?.force || roles.length === 0);
  }}
);

export const fetchRbacModules = createAsyncThunk('rbac/fetchModules',
  async (_arg, { getState, rejectWithValue }) => {
    try { return await apiGetRbacModules(getState().auth.accessToken); }
    catch (err) { return rejectWithValue(err.message); }
  },
  { condition: (arg, { getState }) => {
    const { modulesLoading, modules } = getState().rbac;
    return !modulesLoading && (arg?.force || modules.length === 0);
  }}
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

// PATCH /admin/rbac/roles/{id} — name / description / is_active, only what changed (C4).
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

// PUT /admin/rbac/roles/{id}/permissions — the whole grid in one call (C5).
export const putRolePermissions = createAsyncThunk('rbac/putRolePermissions',
  async ({ roleId, permissions }, { getState, rejectWithValue }) => {
    try { return await apiPutRbacRolePermissions(getState().auth.accessToken, roleId, permissions); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const assignRbacRole = createAsyncThunk('rbac/assignRole',
  async ({ roleId, user_id, reason }, { getState, rejectWithValue }) => {
    try { return await apiAssignRbacRole(getState().auth.accessToken, roleId, { user_id, reason }); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const updateRbacModule = createAsyncThunk('rbac/updateModule',
  async ({ moduleId, ...updates }, { getState, rejectWithValue }) => {
    try { return await apiPatchRbacModule(getState().auth.accessToken, moduleId, updates); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

export const deleteRbacModule = createAsyncThunk('rbac/deleteModule',
  async (moduleId, { getState, rejectWithValue }) => {
    try { return await apiDeleteRbacModule(getState().auth.accessToken, moduleId); }
    catch (err) { return rejectWithValue(err.message); }
  }
);

const mergeRole = (roles, updated) => {
  if (!updated?.id) return;
  const idx = roles.findIndex(r => r.id === updated.id);
  if (idx !== -1) roles[idx] = { ...roles[idx], ...updated };
};

// Keep the open role editor in step with a role-shaped response (save / rename / toggle).
const mergeDetail = (s, updated) => {
  if (updated?.id && s.roleDetail?.id === updated.id) s.roleDetail = { ...s.roleDetail, ...updated };
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
    updatingModule: false, updateModuleError: null,
    deletingModule: false, deleteModuleError: null,
  },
  reducers: {
    clearCreateError:       s => { s.createError = null; },
    clearUpdateError:       s => { s.updateError = null; },
    clearSaveError:         s => { s.saveError = null; },
    clearDeleteError:       s => { s.deleteError = null; },
    clearAssignError:       s => { s.assignError = null; },
    clearUpdateModuleError: s => { s.updateModuleError = null; },
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
     .addCase(updateRbacRole.fulfilled, (s, a) => {
       s.updating = false;
       const r = a.payload?.data ?? a.payload;
       mergeRole(s.roles, r);
       mergeDetail(s, r);
     })
     .addCase(updateRbacRole.rejected,  (s, a) => { s.updating = false; s.updateError = a.payload ?? 'Failed to update role'; });

    b.addCase(deleteRbacRole.pending,   s => { s.deleting = true;  s.deleteError = null; })
     .addCase(deleteRbacRole.fulfilled, (s, a) => { s.deleting = false; s.roles = s.roles.filter(r => r.id !== a.payload); })
     .addCase(deleteRbacRole.rejected,  (s, a) => { s.deleting = false; s.deleteError = a.payload ?? 'Failed to delete role'; });

    // The API silently ignores unknown modules/actions, so the grid is redrawn from the
    // permissions in the response — never from what was sent (C5).
    b.addCase(putRolePermissions.pending,   s => { s.saving = true;  s.saveError = null; })
     .addCase(putRolePermissions.fulfilled, (s, a) => {
       s.saving = false;
       const r = a.payload?.data ?? a.payload;
       mergeRole(s.roles, r);
       mergeDetail(s, r);
     })
     .addCase(putRolePermissions.rejected,  (s, a) => { s.saving = false; s.saveError = a.payload ?? 'Failed to save permissions'; });

    b.addCase(assignRbacRole.pending,   s => { s.assigning = true;  s.assignError = null; })
     .addCase(assignRbacRole.fulfilled, s => { s.assigning = false; })
     .addCase(assignRbacRole.rejected,  (s, a) => { s.assigning = false; s.assignError = a.payload ?? 'Failed to assign role'; });

    b.addCase(updateRbacModule.pending,   s => { s.updatingModule = true;  s.updateModuleError = null; })
     .addCase(updateRbacModule.fulfilled, (s, a) => {
       s.updatingModule = false;
       const m = a.payload?.data ?? a.payload;
       const idx = s.modules.findIndex(x => x.id === m?.id);
       if (idx !== -1) s.modules[idx] = { ...s.modules[idx], ...m };
     })
     .addCase(updateRbacModule.rejected,  (s, a) => { s.updatingModule = false; s.updateModuleError = a.payload ?? 'Failed to update module'; });

    b.addCase(deleteRbacModule.pending,   s => { s.deletingModule = true;  s.deleteModuleError = null; })
     .addCase(deleteRbacModule.fulfilled, (s, a) => {
       s.deletingModule = false;
       const id = a.payload?.id ?? a.payload;
       s.modules = s.modules.filter(m => m.id !== id && m.name !== id);
     })
     .addCase(deleteRbacModule.rejected,  (s, a) => { s.deletingModule = false; s.deleteModuleError = a.payload ?? 'Failed to delete module'; });
  },
});

export const {
  clearCreateError, clearUpdateError, clearSaveError, clearDeleteError,
  clearAssignError, clearUpdateModuleError, clearDeleteModuleError, clearRoleDetail,
} = rbacSlice.actions;
export default rbacSlice.reducer;
