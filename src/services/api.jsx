// src/services/api.js
// Real API — https://iptvapp.studyineurope.xyz/api/v1

const BASE = 'https://iptvapp.studyineurope.xyz/api/v1';

// Generic request helper
const request = async (url, options = {}) => {
  const { headers: extraHeaders = {}, ...restOptions } = options;
  const res = await fetch(url, {
    ...restOptions,
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      ...extraHeaders,
    },
  });

  let data;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = { message: text }; }

  if (!res.ok) {
    // Safely extract a string message from any API response shape
    const extractMsg = (val) => {
      if (!val) return null;
      if (typeof val === 'string' && val.length < 300) return val;
      if (typeof val === 'object') {
        // Try common nested fields
        const nested = val.message || val.msg || val.detail || val.error || val.text;
        if (typeof nested === 'string') return nested;
        if (Array.isArray(nested)) return nested.map(e => e?.msg || e).join(', ');
        // Last resort: stringify but only if short
        const str = JSON.stringify(val);
        return str.length < 200 ? str : null;
      }
      return null;
    };

    const apiMsg =
      extractMsg(data?.data?.message) ||
      extractMsg(data?.data?.error)   ||
      extractMsg(data?.message)       ||
      extractMsg(data?.error)         ||
      extractMsg(data?.detail)        ||
      extractMsg(data?.errors?.[0]);

    // User-friendly fallback messages per HTTP status
    const statusMsg = {
      400: 'Invalid request. Please check your input.',
      401: 'Incorrect email or password. Please try again.',
      403: 'Access denied. You do not have permission.',
      404: 'Resource not found.',
      409: 'Conflict — this resource already exists.',
      422: 'Validation error. Please check your input.',
      429: 'Too many attempts. Please wait and try again.',
      500: 'Server error. Please try again in a moment.',
      502: 'Service unavailable. Please try again.',
      503: 'Service under maintenance. Please try again later.',
    }[res.status];

    throw new Error(apiMsg || statusMsg || `Request failed (${res.status})`);
  }
  return data;
};

// ─────────────────────────────────────────────────────────
// AUTH APIS
// ─────────────────────────────────────────────────────────

// 1. Login — POST /auth/login
//    Body: { email, password }
//    Response: { success, data: { partial_token, requires_totp, requires_2fa_setup, message } }
export const apiLogin = async (email, password) => {
  const res = await request(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  // Real API response shape (from Postman screenshot):
  // { success: true, data: { partial_token, requires_totp, requires_2fa_setup, message } }
  const d = res.data || res;

  const tempToken        = d.partial_token || d.access_token || d.token;
  // requires_totp=true       → already setup → skip to OTP entry (step 3)
  // requires_2fa_setup=true  → first time    → show QR setup (step 2)
  const requiresTotp     = d.requires_totp     ?? false;
  const requires2faSetup = d.requires_2fa_setup ?? false;

  return { tempToken, requiresTotp, requires2faSetup };
};

// 2. 2FA Setup — POST /auth/2fa/setup
//    Header: Authorization: Bearer <partial token>
//    Response: { success, data: { provisioning_uri, qr_code, secret } }
export const api2FASetup = async (tempToken) => {
  const res = await request(`${BASE}/auth/2fa/setup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tempToken}` },
  });

  const d = res.data || res;
  return {
    provisioningUri: d.provisioning_uri || d.otpauth_url  || '',
    qrCode:          d.qr_code          || d.qr_code_url  || d.qr_code_base64 || '',
    secret:          d.secret           || d.totp_secret  || '',
    message:         d.message || res.message || '',
  };
};

// 3. Confirm 2FA setup — POST /auth/2fa/confirm
//    Header: Authorization: Bearer <partial token>
//    Body: { totp_code }
//    Response: { success, data: { access_token, refresh_token, role, role_id } }
export const api2FAConfirm = async (tempToken, totpCode) => {
  const res = await request(`${BASE}/auth/2fa/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tempToken}` },
    body: JSON.stringify({ totp_code: totpCode }),
  });

  const d = res.data || res;
  return {
    accessToken:  d.access_token,
    refreshToken: d.refresh_token,
    user: { role: d.role, roleId: d.role_id, ...d.user },
  };
};

// 4. Verify TOTP (returning user — 2FA already set up)
//    POST /auth/verify-totp
//    Header: Authorization: Bearer <partial token>
//    Body: { totp_code }
//    Response: { success, data: { access_token, refresh_token, token_type, expires_in, role, role_id } }
export const apiVerifyTOTP = async (tempToken, totpCode) => {
  const res = await request(`${BASE}/auth/verify-totp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tempToken}` },
    body: JSON.stringify({ totp_code: totpCode }),
  });

  const d = res.data || res;
  return {
    accessToken:  d.access_token,
    refreshToken: d.refresh_token,
    user: { role: d.role, roleId: d.role_id, expiresIn: d.expires_in },
  };
};

// 5. Logout — POST /auth/logout
//    Header: Authorization: Bearer <access_token>
//    Response: { success: true, data: { message: "Logged out successfully" } }
export const apiLogout = async (accessToken) => {
  try {
    await request(`${BASE}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // Even if API call fails, we clear local state
  }
  return { success: true };
};

// 6. Get Profile — GET /auth/me
//    Header: access_token: <access_token>
//    Response: { success, data: { id, email, full_name, role, role_id, totp_enabled, permissions } }
export const apiGetProfile = async (accessToken) => {
  // Try Authorization: Bearer first (standard), also send access_token header
  // (Postman showed access_token header key, but server may require Bearer)
  const res = await request(`${BASE}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'access_token':  accessToken,
    },
  });
  return res.data || res;
};

// 7. Change own password - POST /auth/me/change-password
//    Body: { current_password, new_password, confirm_password }
export const apiChangePassword = async (accessToken, data) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/auth/me/change-password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      current_password: data.current_password,
      new_password: data.new_password,
      confirm_password: data.confirm_password,
    }),
  });
  return res.data || res;
};

// ─────────────────────────────────────────────────────────
// DASHBOARD / DEVICES / LICENSES — dummyjson (mock data)
// ─────────────────────────────────────────────────────────

export const apiFetchDashboardStats = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/dashboard/stats`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

export const apiFetchDashboardOverview = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/dashboard/overview`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

export const apiFetchDashboardRevenue = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/dashboard/revenue`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

export const apiFetchUsers = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res  = await fetch('https://dummyjson.com/users?limit=20');
  if (!res.ok) throw new Error('Failed to fetch users');
  const data = await res.json();
  const users = data.users.map(u => ({
    id:      `USR-${String(u.id).padStart(3, '0')}`,
    rawId:   u.id,
    name:    `${u.firstName} ${u.lastName}`,
    phone:   u.phone,
    address: `${u.address.address}, ${u.address.city} ${u.address.state}`,
    userId:  u.username,
    image:   u.image,
    device:  u.id % 2 === 0 ? 'inactive' : 'active',
    account: null,
  }));
  return { users };
};

export const apiUpdateDevice = async (accessToken, userId, status) => {
  if (!accessToken) throw new Error('Unauthorized');
  const rawId = userId.replace('USR-', '').replace(/^0+/, '') || '1';
  await fetch(`https://dummyjson.com/users/${rawId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device: status }),
  });
  return { success: true, userId, device: status };
};

export const apiRevokeAccount = async (accessToken, userId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const rawId = userId.replace('USR-', '').replace(/^0+/, '') || '1';
  await fetch(`https://dummyjson.com/users/${rawId}`, { method: 'DELETE' });
  return { success: true, userId };
};

export const apiEditUser = async (accessToken, userId, data) => {
  if (!accessToken) throw new Error('Unauthorized');
  const rawId = userId.replace('USR-', '').replace(/^0+/, '') || '1';
  const [firstName = '', ...rest] = (data.name || '').split(' ');
  const res = await fetch(`https://dummyjson.com/users/${rawId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName: rest.join(' '), phone: data.phone }),
  });
  const updated = await res.json();
  return { success: true, userId, name: `${updated.firstName} ${updated.lastName}`, phone: updated.phone || data.phone, address: data.address };
};

// ── Device APIs ──────────────────────────────────────────────
// GET /admin/devices/stats
export const apiFetchDeviceStats = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/devices/stats`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/devices
export const apiFetchAdminDevices = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.search)          query.set('search',           params.search);
  if (params.status)          query.set('status',           params.status);
  if (params.device_type)     query.set('device_type',      params.device_type);
  if (params.platform)        query.set('platform',         params.platform);
  if (params.plan_type)       query.set('plan_type',        params.plan_type);
  if (params.risk_min != null) query.set('risk_min',        String(params.risk_min));
  if (params.risk_max != null) query.set('risk_max',        String(params.risk_max));
  if (params.has_risk_flag)    query.set('has_risk_flag',   'true');
  if (params.heartbeat_stale)  query.set('heartbeat_stale', 'true');
  if (params.sort_by)          query.set('sort_by',         params.sort_by);
  if (params.sort_order)       query.set('sort_order',      params.sort_order);
  if (params.page)             query.set('page',            String(params.page));
  if (params.page_size)        query.set('page_size',       String(params.page_size));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/devices${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw   = res.data || res;
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];
  const meta  = res.meta || raw.meta || {};
  return {
    devices:  items,
    total:    raw.total    ?? raw.total_count    ?? meta.total    ?? items.length,
    page:     raw.page     ?? raw.current_page   ?? meta.page     ?? params.page ?? 1,
    pageSize: raw.page_size ?? raw.pageSize      ?? meta.page_size ?? params.page_size ?? 20,
  };
};

// GET /admin/devices/{id}/activity
export const apiFetchDeviceActivity = async (accessToken, deviceId, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.content_type) query.set('content_type', params.content_type);
  if (params.date_from)    query.set('date_from', params.date_from);
  if (params.date_to)      query.set('date_to', params.date_to);
  if (params.page)         query.set('page', String(params.page));
  if (params.page_size)    query.set('page_size', String(params.page_size));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/devices/${deviceId}/activity${qs}`, {
    method: 'GET', headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw = res.data || res;
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];
  const meta  = res.meta || raw.meta || {};
  return { items, total: raw.total ?? meta.total ?? items.length, page: raw.page ?? meta.page ?? 1, pageSize: raw.page_size ?? meta.page_size ?? 20 };
};

// GET /admin/devices/{id}/login-history
export const apiFetchDeviceLoginHistory = async (accessToken, deviceId, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.status)    query.set('status', params.status);
  if (params.page)      query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/devices/${deviceId}/login-history${qs}`, {
    method: 'GET', headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw = res.data || res;
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];
  const meta  = res.meta || raw.meta || {};
  return { items, total: raw.total ?? meta.total ?? items.length, page: raw.page ?? meta.page ?? 1, pageSize: raw.page_size ?? meta.page_size ?? 20 };
};

// GET /admin/devices/{id} - full device detail
export const apiFetchDeviceDetail = async (accessToken, deviceId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/devices/${deviceId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// PATCH /admin/devices/{id}/status
export const apiUpdateDeviceStatus = async (accessToken, deviceId, status, reason) => {
  if (!accessToken) throw new Error('Unauthorized');
  const payload = { status };
  if (reason?.trim()) payload.reason = reason.trim();
  const res = await request(`${BASE}/admin/devices/${deviceId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  return { success: true, deviceId, status, ...(res.data || res) };
};

// POST /admin/devices/{id}/revoke
export const apiRevokeDevice = async (accessToken, deviceId, reason) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/devices/${deviceId}/revoke`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ reason }),
  });
  return { success: true, deviceId, ...(res.data || res) };
};

// Keep alias for backward compat
export const apiFetchDevices = apiFetchAdminDevices;

// GET /admin/devices/export — download CSV or JSON with current filters
export const apiExportDevices = async (accessToken, filters = {}, format = 'csv') => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  query.set('format', format);
  if (filters.search)          query.set('search',           filters.search);
  if (filters.status)          query.set('status',           filters.status);
  if (filters.device_type)     query.set('device_type',      filters.device_type);
  if (filters.platform)        query.set('platform',         filters.platform);
  if (filters.plan_type)       query.set('plan_type',        filters.plan_type);
  if (filters.has_risk_flag)   query.set('has_risk_flag',    'true');
  if (filters.heartbeat_stale) query.set('heartbeat_stale',  'true');
  if (filters.sort_by)         query.set('sort_by',          filters.sort_by);
  if (filters.sort_order)      query.set('sort_order',       filters.sort_order);

  const res = await fetch(`${BASE}/admin/devices/export?${query.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const ts   = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `devices_${ts}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Heartbeat Monitoring APIs
const cleanParams = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

const normalizePagedResponse = (res) => {
  const raw = res.data || res;
  const meta = res.meta || raw.meta || {};
  const items = Array.isArray(raw) ? raw
    : Array.isArray(raw.data) ? raw.data
    : Array.isArray(raw.items) ? raw.items
    : Array.isArray(raw.results) ? raw.results
    : [];

  return {
    items,
    total: raw.total ?? raw.total_count ?? raw.count ?? meta.total ?? meta.total_count ?? items.length,
    page: raw.page ?? raw.current_page ?? meta.page ?? null,
    pageSize: raw.page_size ?? raw.pageSize ?? meta.page_size ?? null,
  };
};

export const apiFetchHeartbeatStats = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/heartbeat/stats`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

export const apiFetchHeartbeatLogs = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/heartbeat/logs${cleanParams(params)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return normalizePagedResponse(res);
};

export const apiFetchRiskyHeartbeatDevices = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/heartbeat/risky${cleanParams(params)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return normalizePagedResponse(res);
};

// ── License APIs — Real endpoints ────────────────────────

// GET /admin/licenses — paginated list with compound filter support
export const apiFetchLicenses = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.license_filter)      query.set('license_filter', params.license_filter);
  if (params.status)              query.set('status',         params.status);
  if (params.plan_type)           query.set('plan_type',      params.plan_type);
  if (params.search)              query.set('search',         params.search);
  if (params.device_id)           query.set('device_id',      params.device_id);
  if (params.user_id)             query.set('user_id',        params.user_id);
  if (params.expires_soon != null) query.set('expires_soon',  String(params.expires_soon));
  if (params.is_active != null)   query.set('is_active',      String(params.is_active));
  if (params.auto_renew != null)  query.set('auto_renew',     String(params.auto_renew));
  if (params.date_from)           query.set('date_from',      params.date_from);
  if (params.date_to)             query.set('date_to',        params.date_to);
  if (params.sort_by)             query.set('sort_by',        params.sort_by);
  if (params.sort_order)          query.set('sort_order',     params.sort_order);
  if (params.page)                query.set('page',           String(params.page));
  if (params.page_size)           query.set('page_size',      String(params.page_size));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/licenses${qs}`, {
    method: 'GET', headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw   = res.data || res;
  const meta  = res.meta || raw.meta || {};
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : Array.isArray(raw.items) ? raw.items : [];
  return {
    licenses: items,
    total:    raw.total    ?? raw.total_count    ?? meta.total    ?? items.length,
    page:     raw.page     ?? raw.current_page   ?? meta.page     ?? params.page ?? 1,
    pageSize: raw.page_size ?? raw.pageSize      ?? meta.page_size ?? params.page_size ?? 20,
  };
};

// GET /admin/licenses/stats
export const apiFetchLicenseStats = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/licenses/stats`, {
    method: 'GET', headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/licenses/expiring — licenses expiring within N days
export const apiFetchExpiringLicenses = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  query.set('days',      String(params.days      || 7));
  query.set('page',      String(params.page      || 1));
  query.set('page_size', String(params.page_size || 20));
  const res = await request(`${BASE}/admin/licenses/expiring?${query.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw   = res.data || res;
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : Array.isArray(raw.items) ? raw.items : [];
  const meta  = res.meta || raw.meta || {};
  return {
    licenses: items,
    total:    raw.total ?? raw.total_count ?? meta.total ?? items.length,
    page:     raw.page  ?? raw.current_page ?? meta.page ?? params.page ?? 1,
    pageSize: raw.page_size ?? raw.pageSize ?? meta.page_size ?? params.page_size ?? 20,
  };
};

// GET /admin/licenses/{id} — full detail with history + device
export const apiFetchLicenseDetail = async (accessToken, licenseId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const id = String(licenseId || '').trim();
  if (!id || id === 'undefined' || id === 'null') throw new Error(`Invalid license ID: "${licenseId}"`);
  const res = await request(`${BASE}/admin/licenses/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw = res.data || res;
  if (raw.license) return { license: raw.license, history: raw.history || [], device: raw.device || null };
  return { license: raw, history: raw.history || [], device: raw.device || null };
};

// Normalize any API shape → consistent license object for the UI
// Normalize API response → consistent UI model
// Real API shape (from Raw API screenshots):
// { id, plan_type, status, start_date, expires_at,
//   device: { id, status, risk_score, device_type, device_brand, device_model, app_version, last_heartbeat_at, enrolled_at },
//   history: [{ id, change_reason, status, plan_type, expires_at, revoked_at, changed_by, snapshot }],
//   snapshot: "{...escaped JSON string...}"
// }
const parseSnapshot = (snapshot) => {
  if (!snapshot) return {};
  if (typeof snapshot === 'object') return snapshot;
  if (typeof snapshot !== 'string') return {};

  try {
    const parsed = JSON.parse(snapshot);
    return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
  } catch {
    return {};
  }
};

const getPath = (obj, path) => path.split('.').reduce((val, key) => val?.[key], obj);
const firstPresent = (...values) => values.find(v => v !== undefined && v !== null && v !== '' && v !== 'null') ?? null;

const getLicenseDate = (source, fields) => firstPresent(
  ...fields.flatMap(field => [
    source?.[field],
    getPath(source, `license.${field}`),
    getPath(source, `subscription.${field}`),
    getPath(source, `data.${field}`),
  ])
);

const normalizeLicense = (l) => {
  // snapshot is often an escaped JSON string, and sometimes contains nested license data.
  const snap = parseSnapshot(l.snapshot);
  const device = l.device || snap.device || null;
  const history = Array.isArray(l.history)
    ? l.history
    : Array.isArray(snap.history) ? snap.history : [];

  const startFields = [
    'start_date', 'startDate',
    'valid_from', 'validFrom',
    'starts_at', 'startsAt',
    'started_at', 'startedAt',
    'activated_at', 'activatedAt',
    'issue_date', 'issueDate',
    'issued_at', 'issuedAt',
    'created_at', 'createdAt',
    'created',
  ];

  const expiryFields = [
    'expires_at', 'expiresAt',
    'expiration_date', 'expirationDate',
    'expiry_date', 'expiryDate',
    'valid_until', 'validUntil',
    'ends_at', 'endsAt',
  ];

  const historyStart = history.find(h => getLicenseDate(h, startFields));

  return {
    id:               l.id                      || l.license_id       || l.uuid || snap.id || snap.license_id || '',
    planType:         l.plan_type               || l.license_type     || l.licenseType || l.type || snap.plan_type || snap.license_type || '—',
    status:           l.status                  || snap.status        || 'active',
    startDate:        getLicenseDate(l, startFields)
                    || getLicenseDate(snap, startFields)
                    || getLicenseDate(historyStart, startFields)
                    || device?.enrolled_at
                    || null,
    expiresAt:        getLicenseDate(l, expiryFields)
                    || getLicenseDate(snap, expiryFields)
                    || null,
    // Device object
    device,
    // History array
    history,
    revocationReason: l.revocation_reason       || snap.revocation_reason || null,
    notes:            l.notes                   || l.description || snap.notes || snap.description || null,
  };
};

export const apiRenewLicense = async (accessToken, licenseId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/licenses/${licenseId}/renew`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return { success: true, licenseId, ...(res.data || res) };
};

export const apiRevokeLicense = async (accessToken, licenseId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/licenses/${licenseId}/revoke`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return { success: true, licenseId, ...(res.data || res) };
};

export const apiEditLicense = async (accessToken, licenseId, data) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/licenses/${licenseId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data),
  });
  const raw = res.data || res;
  const hasLicenseShape = raw && typeof raw === 'object' && (
    raw.id || raw.license_id || raw.plan_type || raw.license_type ||
    raw.status || raw.expires_at || raw.expiration_date || raw.snapshot
  );

  const fallback = {};
  if (data.action === 'extend') fallback.expiresAt = data.expires_at;
  if (data.action === 'revoke') {
    fallback.status = 'revoked';
    fallback.revocationReason = data.reason || null;
  }

  return {
    success: true,
    licenseId,
    action: data.action,
    ...fallback,
    ...(hasLicenseShape ? normalizeLicense(raw) : {}),
  };
};

export const apiValidateLicense = async (accessToken, licenseId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/licenses/validate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ license_id: licenseId }),
  });
  const raw = res.data || res;
  return {
    licenseId,
    license_id: raw.license_id || licenseId,
    is_valid: raw.is_valid,
    status: raw.status,
    expires_at: raw.expires_at,
    ttl_seconds: raw.ttl_seconds,
    device_id: raw.device_id,
    validation_errors: raw.validation_errors || [],
  };
};

// ── Trial & Grace Policy APIs ─────────────────────────────

// GET /admin/system-config — all runtime config key/value pairs (superadmin)
export const apiGetSystemConfig = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/system-config`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
};

// PUT /admin/system-config/{key} — update a single config key (superadmin)
export const apiUpdateSystemConfigKey = async (accessToken, key, value, changeNote) => {
  if (!accessToken) throw new Error('Unauthorized');
  const body = { value: String(value) };
  if (changeNote?.trim()) body.change_note = changeNote.trim();
  const res = await request(`${BASE}/admin/system-config/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  return res.data || res;
};

// GET /admin/system-config/trial
// Header: Authorization: Bearer <access_token>
export const apiGetTrialConfig = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/system-config/trial`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// PATCH /admin/system-config/trial — update trial & grace period settings (superadmin only)
// Only sends fields supported by the endpoint; device_limit_policy is excluded (use PUT /admin/system-config/{key})
export const apiUpdateTrialConfig = async (accessToken, data, changeNote) => {
  if (!accessToken) throw new Error('Unauthorized');
  const payload = {};
  if (data.trial_duration_days   != null) payload.trial_duration_days   = data.trial_duration_days;
  if (data.max_trial_extensions  != null) payload.max_trial_extensions  = data.max_trial_extensions;
  if (data.trial_extension_days  != null) payload.trial_extension_days  = data.trial_extension_days;
  if (data.trial_reminder_days   != null) payload.trial_reminder_days   = data.trial_reminder_days;
  if (data.trial_auto_convert    != null) payload.trial_auto_convert    = data.trial_auto_convert;
  if (data.grace_period_days     != null) payload.grace_period_days     = data.grace_period_days;
  if (data.max_devices_per_trial != null) payload.max_devices_per_trial = data.max_devices_per_trial;
  if (changeNote?.trim())                 payload.change_note           = changeNote.trim();
  const res = await request(`${BASE}/admin/system-config/trial`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  return res.data || res;
};

// ── Admin Users APIs ────────────────────────────────────────

// GET /admin/users
// Header: Authorization: Bearer <access_token>
// Query: role=viewer|admin|superadmin, status=active|disabled, page, page_size
export const apiFetchAdminUsers = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');

  const query = new URLSearchParams();
  if (params.role) query.set('role', params.role);
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', params.page);
  if (params.page_size) query.set('page_size', params.page_size);

  const qs = query.toString() ? `?${query.toString()}` : '';

  const res = await request(`${BASE}/admin/users${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const raw = res.data || res;

  // Expected: { data: [ ... ] }
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];

  // If API provides pagination meta, map it; otherwise derive.
  const meta = res.meta || raw.meta || {};
  return {
    users: items,
    total: raw.total ?? raw.total_count ?? meta.total ?? meta.total_count ?? items.length,
    page: raw.page ?? raw.current_page ?? meta.page ?? params.page ?? 1,
    pageSize: raw.page_size ?? raw.pageSize ?? meta.page_size ?? meta.pageSize ?? params.page_size ?? 20,
    data: res.data || res,
  };
};

// GET /admin/users/stats
// Header: Authorization: Bearer <access_token>
export const apiFetchAdminUsersStats = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/users/stats`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/app-users/{id}/login-history
export const apiFetchUserLoginHistory = async (accessToken, userId, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.status)    query.set('status', params.status);
  if (params.page)      query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/app-users/${userId}/login-history${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw   = res.data || res;
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];
  const meta  = res.meta || raw.meta || {};
  return {
    items,
    total:    raw.total    ?? raw.total_count    ?? meta.total    ?? items.length,
    page:     raw.page     ?? raw.current_page   ?? meta.page     ?? params.page ?? 1,
    pageSize: raw.page_size ?? raw.pageSize      ?? meta.page_size ?? params.page_size ?? 20,
  };
};

// GET /admin/app-users/{id}/activity
export const apiFetchUserActivity = async (accessToken, userId, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.content_type) query.set('content_type', params.content_type);
  if (params.date_from)    query.set('date_from', params.date_from);
  if (params.date_to)      query.set('date_to', params.date_to);
  if (params.page)         query.set('page', String(params.page));
  if (params.page_size)    query.set('page_size', String(params.page_size));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/app-users/${userId}/activity${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw   = res.data || res;
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];
  const meta  = res.meta || raw.meta || {};
  return {
    items,
    total:    raw.total    ?? raw.total_count    ?? meta.total    ?? items.length,
    page:     raw.page     ?? raw.current_page   ?? meta.page     ?? params.page ?? 1,
    pageSize: raw.page_size ?? raw.pageSize      ?? meta.page_size ?? params.page_size ?? 20,
  };
};

// PATCH /admin/app-users/{id} - update profile fields
export const apiUpdateAppUser = async (accessToken, userId, data) => {
  if (!accessToken) throw new Error('Unauthorized');
  const payload = {};
  if (data.full_name    !== undefined) payload.full_name    = data.full_name;
  if (data.status       !== undefined) payload.status       = data.status;
  if (data.max_devices  !== undefined) payload.max_devices  = data.max_devices;
  if (data.country_code !== undefined) payload.country_code = data.country_code;
  if (data.reason       !== undefined) payload.reason       = data.reason;
  const res = await request(`${BASE}/admin/app-users/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  return res.data || res;
};

// GET /admin/app-users/{id}
export const apiFetchAppUserDetail = async (accessToken, userId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/app-users/${userId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/app-users/stats
export const apiFetchAppUsersStats = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/app-users/stats`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/app-users - paginated subscriber accounts
export const apiFetchAppUsers = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');

  const query = new URLSearchParams();
  if (params.search)       query.set('search', params.search);
  if (params.status)       query.set('status', params.status);
  if (params.device_status) query.set('device_status', params.device_status);
  if (params.country_code) query.set('country_code', params.country_code);
  if (params.trial_used !== undefined && params.trial_used !== '')
    query.set('trial_used', params.trial_used);
  if (params.has_active_license !== undefined && params.has_active_license !== '')
    query.set('has_active_license', params.has_active_license);
  if (params.date_from)    query.set('date_from', params.date_from);
  if (params.date_to)      query.set('date_to', params.date_to);
  if (params.sort_by)      query.set('sort_by', params.sort_by);
  if (params.sort_order)   query.set('sort_order', params.sort_order);
  if (params.page)         query.set('page', String(params.page));
  if (params.page_size)    query.set('page_size', String(params.page_size));

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/app-users${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const raw = res.data || res;
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];
  const meta  = res.meta || raw.meta || {};
  return {
    users:    items,
    total:    raw.total    ?? raw.total_count    ?? meta.total    ?? meta.total_count    ?? items.length,
    page:     raw.page     ?? raw.current_page   ?? meta.page     ?? params.page         ?? 1,
    pageSize: raw.page_size ?? raw.pageSize      ?? meta.page_size ?? meta.pageSize      ?? params.page_size ?? 20,
  };
};

// GET /admin/users/{id}
export const apiFetchAdminUserDetail = async (accessToken, userId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/users/${userId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// PATCH /admin/users/{id} - update role or status (superadmin only)
// Body: { role?, status? }
export const apiUpdateAdminUser = async (accessToken, userId, data) => {
  if (!accessToken) throw new Error('Unauthorized');
  const payload = {};
  if (data.role !== undefined) payload.role = data.role;
  if (data.status !== undefined) payload.status = data.status;
  const res = await request(`${BASE}/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  return res.data || res;
};

// POST /admin/users - create a new admin account
// Body: { email, password, role, full_name? }
export const apiCreateAdminUser = async (accessToken, data) => {
  if (!accessToken) throw new Error('Unauthorized');
  const payload = {
    email: data.email,
    password: data.password,
    role: data.role,
  };
  if (data.full_name) payload.full_name = data.full_name;

  const res = await request(`${BASE}/admin/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  return res.data || res;
};

