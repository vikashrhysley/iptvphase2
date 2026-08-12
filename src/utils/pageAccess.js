// Shared page-level access control used by the sidebar (which nav items to show) and the app
// layout (which page is allowed to render). Superadmin sees everything; every other role only
// reaches a page whose RBAC module grants at least one action.
//
// IMPORTANT: RBAC module names and sidebar page keys are DIFFERENT vocabularies — modules are
// often plural or suffixed (devices, licenses, audit_logs) while page keys are singular
// (device, license, audit). So we map each page to the set of module names that grant it rather
// than assuming they're identical.

const ACTION_KEYS = ['read', 'write', 'delete', 'execute', 'view', 'access', 'manage'];

// Normalise any permissions payload shape into a Set of granted module names (lower-cased).
// Handles: array of { module, read, write, … } rows (what /auth/me returns), array of
// { module, actions:[…] } rows, an array of plain module-name strings, and a { module:[actions] }
// dict (RBAC's own shape). Returns null only when there is no permissions data at all.
export const extractPermittedModules = (permissions) => {
  if (!permissions) return null;
  const set = new Set();
  const add = (k) => { if (k) set.add(String(k).toLowerCase()); };
  const anyFlag = (o) => ACTION_KEYS.some((k) => o[k]);
  const hasFlag = (o) => ACTION_KEYS.some((k) => k in o);

  if (Array.isArray(permissions)) {
    for (const p of permissions) {
      if (typeof p === 'string') { add(p); continue; }
      if (!p || typeof p !== 'object') continue;
      const key = p.module || p.name || p.resource || p.page || p.key;
      if (!key) continue;
      if (Array.isArray(p.actions)) { if (p.actions.length) add(key); }
      else if (hasFlag(p))          { if (anyFlag(p)) add(key); }
      else                          { add(key); }
    }
  } else if (typeof permissions === 'object') {
    for (const [key, val] of Object.entries(permissions)) {
      if (Array.isArray(val))                  { if (val.length) add(key); }
      else if (val && typeof val === 'object') { if (anyFlag(val)) add(key); }
      else if (val)                            { add(key); }
    }
  }
  return set;
};

// Sidebar page key → the RBAC module name(s) that grant it. Listed lower-case; several aliases
// per page so plural/singular and naming variants all resolve.
export const PAGE_MODULE_KEYS = {
  home:            ['home', 'dashboard'],
  analytics:       ['analytics'],
  admin_users:     ['admin_users', 'admin_user', 'admins', 'admin'],
  app_users:       ['app_users', 'app_user', 'users', 'user'],
  notifications:   ['notifications', 'notification'],
  license:         ['license', 'licenses', 'licensing'],
  device:          ['device', 'devices'],
  heartbeat:       ['heartbeat', 'heartbeats', 'heartbeat_monitoring'],
  plans:           ['plans', 'plan', 'subscription_plans'],
  trial:           ['trial', 'system_configuration', 'system_config', 'configuration', 'config'],
  security_events: ['security_events', 'security_event', 'security'],
  risk:            ['risk', 'risk_engine'],
  health:          ['health'],
  monitoring:      ['monitoring'],
  infra:           ['infra', 'infrastructure'],
  audit:           ['audit', 'audit_logs', 'audit_log'],
  rbac:            ['rbac', 'roles', 'role_management'],
};

// Pages that are superadmin-only regardless of any granted permission.
export const SUPERADMIN_ONLY_PAGES = new Set(['audit', 'rbac']);

// Sidebar nav order — used to pick a sensible landing page when the current one isn't allowed.
export const NAV_PAGE_ORDER = [
  'home', 'analytics', 'admin_users', 'app_users', 'notifications', 'license', 'device',
  'heartbeat', 'plans', 'trial', 'security_events', 'risk', 'health', 'monitoring', 'infra',
  'audit', 'rbac',
];

// Can `user` reach `page`? Fails CLOSED while the profile is unknown (user null) so a reload
// never briefly grants a gated user the full app. `profile` is always reachable once loaded.
export const canAccessPage = (user, page) => {
  if (!user) return false;                       // profile not loaded yet → deny
  if (user.role === 'superadmin') return true;   // superadmin sees everything
  if (page === 'profile') return true;           // own profile is always reachable
  if (SUPERADMIN_ONLY_PAGES.has(page)) return false;
  const permitted = extractPermittedModules(user.permissions);
  if (!permitted) return true;                   // loaded but no permissions field → don't gate
  const keys = PAGE_MODULE_KEYS[page] || [page];
  return keys.some((k) => permitted.has(String(k).toLowerCase()));
};

// First nav page this user is allowed to open (used as a redirect target), else their profile.
export const firstAccessiblePage = (user) =>
  NAV_PAGE_ORDER.find((p) => canAccessPage(user, p)) || 'profile';
