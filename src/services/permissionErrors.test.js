import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiBlockDevice, apiFetchAdminDevices, apiAssignRbacRole, apiFetchLicenses } from './api';
import { PERMISSION_DENIED_EVENT, isPermissionDenied, __resetPermissionErrors } from './permissionErrors';

const TOKEN = 'test-token';
let nextStatus;
let nextBody;
let popups;

const onDenied = (e) => popups.push(e.detail);

// Same fetch-stub pattern as notificationsApi.test.js; the `request` helper reads status + text.
beforeEach(() => {
  __resetPermissionErrors();
  popups = [];
  // Tests run in Node (no DOM): a bare EventTarget is all the pop-up event needs.
  const win = new EventTarget();
  win.addEventListener(PERMISSION_DENIED_EVENT, onDenied);
  vi.stubGlobal('window', win);
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: nextStatus < 400,
    status: nextStatus,
    text: async () => JSON.stringify(nextBody),
  })));
});

const forbidden = (message, code = 'INSUFFICIENT_PERMISSIONS', action = 'write') => {
  nextStatus = 403;
  nextBody = { success: false, error: { code, message, details: { module: 'devices', action } } };
};

describe('global 403 handling (guide B2)', () => {
  it('a refused action (POST) raises the pop-up with the backend message', async () => {
    forbidden("You don't have permission to make changes in Devices");
    const err = await apiBlockDevice(TOKEN, 'dev-1', 'test').catch((e) => e);
    expect(err.status).toBe(403);
    expect(err.code).toBe('INSUFFICIENT_PERMISSIONS');
    expect(err.message).toBe("You don't have permission to make changes in Devices");
    expect(popups).toEqual([{ message: "You don't have permission to make changes in Devices", code: 'INSUFFICIENT_PERMISSIONS' }]);
    expect(isPermissionDenied(err)).toBe(true);
    expect(isPermissionDenied(err.message)).toBe(true); // what a thunk stores in state
  });

  it('a refused page load (GET) never pops up, but is recognised for the inline state', async () => {
    forbidden("You don't have permission to view Devices", 'INSUFFICIENT_PERMISSIONS', 'read');
    const err = await apiFetchAdminDevices(TOKEN, {}).catch((e) => e);
    expect(popups).toHaveLength(0);
    expect(isPermissionDenied(err.message)).toBe(true);
  });

  it('SUPERADMIN_REQUIRED and plain-text HTTP_403 also use the pop-up', async () => {
    forbidden('Only a superadmin can grant superadmin', 'SUPERADMIN_REQUIRED');
    await apiAssignRbacRole(TOKEN, 'role-1', { user_id: 'u1' }).catch(() => {});
    forbidden('Cannot assign a role to your own account', 'HTTP_403');
    await apiAssignRbacRole(TOKEN, 'role-1', { user_id: 'me' }).catch(() => {});
    expect(popups.map((p) => p.code)).toEqual(['SUPERADMIN_REQUIRED', 'HTTP_403']);
  });

  it('400 / 404 / 409 / 422 are ordinary errors — no pop-up, not a permission error', async () => {
    for (const status of [400, 404, 409, 422]) {
      nextStatus = status;
      nextBody = { success: false, error: { code: 'VALIDATION_ERROR', message: `plain ${status}` } };
      const err = await apiBlockDevice(TOKEN, 'dev-1', 'x').catch((e) => e);
      expect(err.message).toBe(`plain ${status}`);
      expect(isPermissionDenied(err.message)).toBe(false);
    }
    expect(popups).toHaveLength(0);
  });

  it('a 200 passes straight through', async () => {
    nextStatus = 200;
    nextBody = { success: true, data: { items: [], total: 0 } };
    await expect(apiFetchLicenses(TOKEN, {})).resolves.toBeTruthy();
    expect(popups).toHaveLength(0);
  });
});
