// src/services/api.js
// Real API — http://iptvapp.studyineurope.xyz/api/v1

const BASE = 'http://iptvapp.studyineurope.xyz/api/v1';

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

  let data = {};
  const text = await res.text();
  try { data = JSON.parse(text); } catch (_) { data = { message: text }; }

  if (!res.ok) {
    // Try to get message from nested data object too
    const msg =
      data?.data?.message ||
      data?.message       ||
      data?.detail        ||
      data?.error         ||
      (typeof data === 'string' ? data : `Request failed (${res.status})`);
    throw new Error(msg);
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
  } catch (_) {
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

// License API
const LIC_TYPES  = ['Enterprise','Professional','Starter','Team','Developer'];
const LIC_BILL   = ['Monthly','Quarterly','Annual','Biennial'];
const LIC_STATUS = ['active','active','active','expired','expiring_soon'];

export const apiFetchLicenses = async (accessToken) => {
  if (!accessToken) throw new Error('Unauthorized');
  const res  = await fetch('https://dummyjson.com/users?limit=20');
  const data = await res.json();
  const now  = Date.now();
  const licenses = data.users.map((u, i) => {
    const status = LIC_STATUS[i % 5];
    let expiry = status === 'expired' ? new Date(now-(i+1)*15*86400000)
               : status === 'expiring_soon' ? new Date(now+(i%25+5)*86400000)
               : new Date(now+(i+1)*90*86400000);
    return {
      id: `LIC-${String(i+1).padStart(4,'0')}`,
      userId: `USR-${String(u.id).padStart(3,'0')}`,
      userName: `${u.firstName} ${u.lastName}`,
      userImage: u.image, userEmail: u.email, username: u.username,
      licenseType: LIC_TYPES[i%5], seats: [5,10,25,50,100,200][i%6],
      seatsUsed: Math.floor([5,10,25,50,100,200][i%6]*(0.4+(i%5)*0.1)),
      expirationDate: expiry.toISOString(),
      issueDate: new Date(now-(i+1)*120*86400000).toISOString(),
      billingCycle: LIC_BILL[i%4], status,
      licenseKey: `${LIC_TYPES[i%5].slice(0,3).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}-${String(u.id).padStart(4,'0')}`,
    };
  });
  return { licenses };
};

export const apiRenewLicense  = async (_, licenseId) => { await new Promise(r=>setTimeout(r,500)); return { success:true, licenseId, expirationDate: new Date(Date.now()+365*86400000).toISOString(), status:'active' }; };
export const apiRevokeLicense = async (_, licenseId) => { await new Promise(r=>setTimeout(r,400)); return { success:true, licenseId }; };
export const apiEditLicense   = async (_, licenseId, data) => { await new Promise(r=>setTimeout(r,400)); return { success:true, licenseId, ...data }; };