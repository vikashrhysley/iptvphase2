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

// Device API
const DEVICE_TYPES = ['phone','tablet','desktop','tv'];
const DEVICE_OS    = { phone:['iOS 17','Android 14','Android 13','iOS 16'], tablet:['iPadOS 17','Android 13','iPadOS 16','Android 12'], desktop:['Windows 11','macOS Sonoma','Ubuntu 22.04','Windows 10'], tv:['Android TV 12','Tizen 7','webOS 23','Fire OS 8'] };
const DEVICE_NAMES = { phone:['iPhone 15 Pro','Samsung Galaxy S24','Pixel 8','OnePlus 12'], tablet:['iPad Pro 12.9"','Samsung Tab S9','iPad Air','Lenovo Tab P12'], desktop:['MacBook Pro','Dell XPS 15','HP EliteBook','ThinkPad X1'], tv:['Samsung QLED 4K','LG C3 OLED','Fire TV Stick 4K','Chromecast HD'] };
const LOCATIONS    = ['New York, US','London, UK','Tokyo, JP','Sydney, AU','Berlin, DE','Toronto, CA','Singapore, SG','Dubai, AE'];

export const apiFetchDevices = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res  = await fetch('https://dummyjson.com/users?limit=20');
  const data = await res.json();
  const devices = data.users.flatMap((u, ui) =>
    Array.from({ length: (ui % 3) + 1 }, (_, di) => {
      const type = DEVICE_TYPES[(ui + di) % 4];
      return {
        id: `DEV-${String(ui * 3 + di + 1).padStart(4,'0')}`,
        userId: `USR-${String(u.id).padStart(3,'0')}`,
        userName: `${u.firstName} ${u.lastName}`,
        userImage: u.image, username: u.username, type,
        name:       DEVICE_NAMES[type][(ui+di)%4],
        os:         DEVICE_OS[type][(ui+di)%4],
        location:   LOCATIONS[(ui*2+di)%8],
        status:     ['active','active','active','inactive','blocked'][(ui+di*3)%5],
        lastSeen:   new Date(Date.now()-((ui*7+di*3)%30+1)*86400000).toISOString(),
        appVersion: `v${2+(ui%3)}.${di+1}.${(ui+di)%9}`,
      };
    })
  );
  return { devices };
};

export const apiUpdateDeviceStatus = async (_, deviceId, status) => { await new Promise(r=>setTimeout(r,400)); return { success:true, deviceId, status }; };
export const apiRevokeDevice       = async (_, deviceId)         => { await new Promise(r=>setTimeout(r,400)); return { success:true, deviceId }; };

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

// GET /admin/licenses  — list all licenses
// Header: Authorization: Bearer <access_token>
export const apiFetchLicenses = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/licenses`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // Response: { success, data: [ ...licenses ] } or { success, data: { items: [...] } }
  const raw = res.data || res;
  const list = Array.isArray(raw) ? raw
             : Array.isArray(raw.items) ? raw.items
             : Array.isArray(raw.licenses) ? raw.licenses
             : [];
  return { licenses: list.map(normalizeLicense) };
};

// GET /admin/licenses/:id  — single license detail
// Header: Authorization: Bearer <access_token>
export const apiFetchLicenseDetail = async (accessToken, licenseId) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res = await request(`${BASE}/admin/licenses/${licenseId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // API response: { success, data: { id, plan_type, status, start_date, expires_at, device, history, snapshot, ... } }
  const raw = res.data || res;
  return normalizeLicense(raw);
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

// ── Trial & Grace Policy APIs ─────────────────────────────

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

// PUT /admin/system-config/trial  — update trial period (superadmin only)
export const apiUpdateTrialConfig = async (accessToken, data) => {
  if (!accessToken) throw new Error('Unauthorized');
  const payload = {
    ...data,
    trial_duration_days: data.trial_period_days,
    max_devices_per_trial: data.max_trial_extensions,
  };
  const res = await request(`${BASE}/admin/system-config/trial`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  return res.data || res;
};
