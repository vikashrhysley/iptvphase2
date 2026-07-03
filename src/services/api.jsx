// src/services/api.js
// Real API — https://iptvapp.studyineurope.xyz/api/v1

const ORIGIN = import.meta.env.VITE_API_ORIGIN || '';
const BASE = `${ORIGIN}/api/v1`;

// Generic request helper
const request = async (url, options = {}) => {
  const { headers: extraHeaders = {}, ...restOptions } = options;
  const fullUrl = url.startsWith('/') && !url.startsWith(ORIGIN) && ORIGIN
    ? `${ORIGIN}${url}`
    : url;
  const res = await fetch(fullUrl, {
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

// 5. Token status — POST /auth/token-status (public — no auth header)
//    Body: { access_token?, refresh_token? }
//    Response: { next_step, access_token_status, refresh_token_status, ... }
export const apiTokenStatus = async (accessToken, refreshToken) => {
  const body = {};
  if (accessToken)  body.access_token  = accessToken;
  if (refreshToken) body.refresh_token = refreshToken;
  const res = await request(`${BASE}/auth/token-status`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data || res;
};

// 6. Refresh token — POST /auth/refresh (public — refresh token in body)
//    Body: { refresh_token }
//    Response: { access_token, refresh_token, expires_in }
export const apiRefreshToken = async (refreshToken) => {
  const res = await request(`${BASE}/auth/refresh`, {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  return res.data || res;
};

// 7. Logout — POST /auth/logout
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
// DASHBOARD APIs
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

// ─────────────────────────────────────────────────────────
// ANALYTICS APIs
// ─────────────────────────────────────────────────────────

// GET /admin/analytics/revenue
export const apiFetchRevenueAnalytics = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date)   query.set('end_date',   params.end_date);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/analytics/revenue${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/analytics/users
export const apiFetchUserAnalytics = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date)   query.set('end_date',   params.end_date);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/analytics/users${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/analytics/devices
export const apiFetchDeviceAnalytics = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/analytics/devices`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/analytics/licenses
export const apiFetchLicenseAnalytics = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/analytics/licenses`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/analytics/conversion-funnel
export const apiFetchFunnelAnalytics = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date)   query.set('end_date',   params.end_date);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/analytics/conversion-funnel${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/analytics/churn
export const apiFetchChurnAnalytics = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date)   query.set('end_date',   params.end_date);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/analytics/churn${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/analytics/risk
export const apiFetchRiskAnalytics = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date)   query.set('end_date',   params.end_date);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/analytics/risk${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

export const apiFetchSystemAnalytics = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/analytics/system`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

export const apiFetchGeoAnalytics = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', params.limit);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/analytics/geo${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

export const apiFetchSecurityAnalytics = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date)   query.set('end_date',   params.end_date);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/analytics/security${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
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

// POST /admin/devices/{id}/replace — mark device as replaced (query param reason)
export const apiReplaceDevice = async (accessToken, deviceId, reason) => {
  if (!accessToken) throw new Error('Unauthorized');
  const qs = reason?.trim() ? `?reason=${encodeURIComponent(reason.trim())}` : '';
  const res = await request(`${BASE}/admin/devices/${deviceId}/replace${qs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return { success: true, deviceId, ...(res.data || res) };
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

// POST /admin/app-users/{id}/review - flag user for manual security review
export const apiFlagUserForReview = async (accessToken, userId, data) => {
  if (!accessToken) throw new Error('Unauthorized');
  const payload = { reason: data.reason };
  if (data.notes?.trim())  payload.notes    = data.notes.trim();
  if (data.priority)       payload.priority = data.priority;
  const res = await request(`${BASE}/admin/app-users/${userId}/review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.data || res;
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

// ── Audit Log APIs ────────────────────────────────────────

// GET /admin/audit-logs — paginated list with filters
export const apiFetchAuditLogs = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.action)      query.set('action',      params.action);
  if (params.entity_type) query.set('entity_type', params.entity_type);
  if (params.entity_id)   query.set('entity_id',   params.entity_id);
  if (params.severity)    query.set('severity',     params.severity);
  if (params.actor_id)    query.set('actor_id',     params.actor_id);
  if (params.date_from)   query.set('date_from',    params.date_from);
  if (params.date_to)     query.set('date_to',      params.date_to);
  if (params.ip_address)  query.set('ip_address',   params.ip_address);
  if (params.page)        query.set('page',         String(params.page));
  if (params.page_size)   query.set('page_size',    String(params.page_size));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/audit-logs${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw   = res.data || res;
  const items = Array.isArray(raw)       ? raw
              : Array.isArray(raw.logs)  ? raw.logs
              : Array.isArray(raw.items) ? raw.items
              : Array.isArray(raw.data)  ? raw.data
              : [];
  const meta  = res.meta || raw.meta || {};
  return {
    logs:     items,
    total:    raw.total      ?? raw.total_count  ?? raw.total_records ?? meta.total    ?? items.length,
    page:     raw.page       ?? raw.current_page ?? meta.page         ?? params.page   ?? 1,
    pageSize: raw.page_size  ?? raw.pageSize     ?? meta.page_size    ?? params.page_size ?? 20,
  };
};

// GET /admin/audit-logs/{id} — single log with before/after snapshots
export const apiFetchAuditLogDetail = async (accessToken, id) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/audit-logs/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// ── RBAC APIs ─────────────────────────────────────────────

// GET /admin/rbac/roles
export const apiGetRbacRoles = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/rbac/roles`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw = res.data || res;
  return Array.isArray(raw) ? raw : Array.isArray(raw.roles) ? raw.roles : [];
};

// GET /admin/rbac/modules
export const apiGetRbacModules = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/rbac/modules`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw = res.data || res;
  return Array.isArray(raw) ? raw : Array.isArray(raw.modules) ? raw.modules : [];
};

// POST /admin/rbac/roles — create new role
export const apiCreateRbacRole = async (accessToken, { name, description, permissions }) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/rbac/roles`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name, description, permissions: permissions || {} }),
  });
  return res.data || res;
};

// GET /admin/rbac/roles/{id} — full detail with users list
export const apiGetRbacRoleDetail = async (accessToken, roleId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/rbac/roles/${roleId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// PATCH /admin/rbac/roles/{id} — update name / description / is_active
export const apiPatchRbacRole = async (accessToken, roleId, updates) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/rbac/roles/${roleId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(updates),
  });
  return res.data || res;
};

// DELETE /admin/rbac/roles/{id}
export const apiDeleteRbacRole = async (accessToken, roleId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/rbac/roles/${roleId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// PUT /admin/rbac/roles/{id}/permissions — full replacement
export const apiPutRbacRolePermissions = async (accessToken, roleId, permissions) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/rbac/roles/${roleId}/permissions`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ permissions }),
  });
  return res.data || res;
};

// PATCH /admin/rbac/roles/{id}/permissions — partial add/remove
export const apiPatchRbacRolePermissions = async (accessToken, roleId, { add, remove }) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/rbac/roles/${roleId}/permissions`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ add, remove }),
  });
  return res.data || res;
};

// GET /admin/users/roles — active roles for the role-selector UI
export const apiGetAssignableRoles = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/users/roles`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// POST /admin/rbac/roles/{id}/assign — assign role to admin user
export const apiAssignRbacRole = async (accessToken, roleId, { user_id, reason }) => {
  if (!accessToken) throw new Error('Unauthorized');
  const body = { user_id };
  if (reason?.trim()) body.reason = reason.trim();
  const res = await request(`${BASE}/admin/rbac/roles/${roleId}/assign`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  return res.data || res;
};

// DELETE /admin/rbac/modules/{id} — remove a module
export const apiDeleteRbacModule = async (accessToken, moduleId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/rbac/modules/${moduleId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return { ...(res.data || res), id: moduleId };
};

// POST /admin/rbac/modules — register a new RBAC module
export const apiCreateRbacModule = async (accessToken, { name, display_name, available_actions, description }) => {
  if (!accessToken) throw new Error('Unauthorized');
  const body = { name, display_name, available_actions };
  if (description?.trim()) body.description = description.trim();
  const res = await request(`${BASE}/admin/rbac/modules`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  return res.data || res;
};

// GET /admin/audit-logs?export=csv|json — download export
export const apiExportAuditLogs = async (accessToken, params = {}, format = 'csv') => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  query.set('export', format);
  if (params.action)      query.set('action',      params.action);
  if (params.entity_type) query.set('entity_type', params.entity_type);
  if (params.severity)    query.set('severity',     params.severity);
  if (params.date_from)   query.set('date_from',    params.date_from);
  if (params.date_to)     query.set('date_to',      params.date_to);
  if (params.ip_address)  query.set('ip_address',   params.ip_address);
  const res = await fetch(`${BASE}/admin/audit-logs?${query.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `audit-logs_${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};


// GET /admin/subscriptions - paginated subscription list
export const apiFetchSubscriptions = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.status)    query.set('status', params.status);
  if (params.plan_type) query.set('plan_type', params.plan_type);
  if (params.user_id)   query.set('user_id', params.user_id);
  if (params.date_from) query.set('date_from', params.date_from);
  if (params.date_to)   query.set('date_to', params.date_to);
  if (params.page)      query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/subscriptions${qs}`, {
    method: 'GET', headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw   = res.data || res;
  const meta  = res.meta || raw.meta || {};
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : Array.isArray(raw.items) ? raw.items : [];
  return {
    subscriptions: items,
    total:    raw.total    ?? raw.total_count   ?? meta.total    ?? items.length,
    page:     raw.page     ?? raw.current_page  ?? meta.page     ?? params.page ?? 1,
    pageSize: raw.page_size ?? raw.pageSize     ?? meta.page_size ?? params.page_size ?? 20,
  };
};

// GET /admin/subscriptions/{id}
export const apiFetchSubscriptionDetail = async (accessToken, id) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/subscriptions/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/subscriptions/{id}/history
export const apiFetchSubscriptionHistory = async (accessToken, id) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/subscriptions/${id}/history`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// PATCH /admin/subscriptions/{id} - partial update (admin+)
export const apiUpdateSubscription = async (accessToken, id, data) => {
  if (!accessToken) throw new Error('Unauthorized');
  const payload = {};
  if (data.auto_renew     !== undefined) payload.auto_renew     = data.auto_renew;
  if (data.billing_cycle  !== undefined) payload.billing_cycle  = data.billing_cycle;
  if (data.cancel_reason  !== undefined) payload.cancel_reason  = data.cancel_reason;
  if (data.next_billing_at !== undefined) payload.next_billing_at = data.next_billing_at;
  payload.reason = data.reason;
  const res = await request(`${BASE}/admin/subscriptions/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  return res.data || res;
};

// POST /admin/subscriptions/{id}/cancel - force-cancel on behalf of a user (admin+)
export const apiCancelSubscription = async (accessToken, id, reason) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/subscriptions/${id}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ reason }),
  });
  return res.data || res;
};

// POST /admin/subscriptions/{id}/extend-trial - extend trial period by N days (admin+)
export const apiExtendTrial = async (accessToken, id, extendDays, reason) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/subscriptions/${id}/extend-trial`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ extend_days: extendDays, reason }),
  });
  return res.data || res;
};

// GET /admin/subscription-plans - list all subscription plan definitions
export const apiFetchSubscriptionPlans = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/subscription-plans`, {
    method: 'GET', headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw = res.data || res;
  return Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];
};

// GET /admin/subscription-plans/{id} - full plan object + usage_stats (viewer+)
export const apiFetchPlanDetail = async (accessToken, id) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/subscription-plans/${id}`, {
    method: 'GET', headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// POST /admin/subscription-plans - create a new plan (superadmin)
export const apiCreatePlan = async (accessToken, data) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/subscription-plans`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.data || res;
};

// PUT /admin/subscription-plans/{id} - update editable plan fields (superadmin)
export const apiUpdatePlan = async (accessToken, id, data) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/subscription-plans/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.data || res;
};

// PATCH /admin/subscription-plans/{id} - activate or deactivate a plan (superadmin)
export const apiTogglePlanStatus = async (accessToken, id, isActive) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/subscription-plans/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ is_active: isActive }),
  });
  return res.data || res;
};

// GET /health — combined health check (PostgreSQL + Redis)
export const apiFetchHealth = async (accessToken) => {
  const res = await request('/health', {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  return res.data || res;
};

// GET /health/db — PostgreSQL latency probe (SELECT 1 round-trip)
export const apiFetchHealthDb = async (accessToken) => {
  const res = await request('/health/db', {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  return res.data || res;
};

// GET /health/redis — Redis PING latency probe
export const apiFetchHealthRedis = async (accessToken) => {
  const res = await request('/health/redis', {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  return res.data || res;
};

// GET /health/qdrant — Qdrant vector DB availability check
export const apiFetchHealthQdrant = async (accessToken) => {
  const res = await request('/health/qdrant', {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  return res.data || res;
};

// GET /metrics — Prometheus-compatible text/plain metrics
export const apiFetchMetrics = async (accessToken) => {
  const res = await fetch(`${ORIGIN}/metrics`, {
    method: 'GET',
    headers: {
      'Accept': 'text/plain',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
};

// GET /version — app version and build metadata
export const apiFetchVersion = async (accessToken) => {
  const res = await request('/version', {
    method: 'GET',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  return res.data || res;
};

// ── Risk Engine APIs ──────────────────────────────────────

// GET /admin/risk/dashboard
export const apiFetchRiskDashboard = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.days) query.set('days', String(params.days));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/risk/dashboard${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/risk/devices
export const apiFetchRiskDevices = async (accessToken, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.risk_level) query.set('risk_level', params.risk_level);
  if (params.threshold != null) query.set('threshold', String(params.threshold));
  if (params.status)     query.set('status',     params.status);
  if (params.sort_by)    query.set('sort_by',    params.sort_by);
  if (params.page)       query.set('page',       String(params.page));
  if (params.page_size)  query.set('page_size',  String(params.page_size));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/risk/devices${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw = res;
  const items = Array.isArray(raw.data) ? raw.data : [];
  const meta  = raw.meta || {};
  return {
    devices:    items,
    counts:     raw.counts || { safe: 0, monitor: 0, high: 0, critical: 0 },
    total:      meta.total      ?? items.length,
    page:       meta.page       ?? params.page ?? 1,
    pageSize:   meta.page_size  ?? params.page_size ?? 20,
    totalPages: meta.total_pages ?? 1,
  };
};

// GET /admin/devices/{device_id}/risk
export const apiFetchDeviceRisk = async (accessToken, deviceId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/devices/${deviceId}/risk`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data || res;
};

// GET /admin/devices/{device_id}/risk/history
export const apiFetchDeviceRiskHistory = async (accessToken, deviceId, params = {}) => {
  if (!accessToken) throw new Error('Unauthorized');
  const query = new URLSearchParams();
  if (params.page)      query.set('page',      String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await request(`${BASE}/admin/devices/${deviceId}/risk/history${qs}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meta = res.meta || {};
  return {
    events:     Array.isArray(res.data) ? res.data : [],
    total:      meta.total       ?? 0,
    page:       meta.page        ?? 1,
    pageSize:   meta.page_size   ?? 20,
    totalPages: meta.total_pages ?? 1,
  };
};

// POST /admin/devices/{device_id}/risk/override
export const apiPostRiskOverride = async (accessToken, deviceId, body) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/devices/${deviceId}/risk/override`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  return res;
};
