// Pure rules for the Roles & Permissions page (Roles & Permissions build guide, Part C).
// Kept free of React so the grid behaviour is unit-tested in rbacRules.test.js.

export const VIEW = 'read';   // the "View" column — any GET
export const ACT  = 'write';  // the "Act" column — any POST / PUT / PATCH / DELETE

// Carved-out modules with no page of their own: only an Act column ("--" for View), saved as
// ["write"] (C5).
export const ACT_ONLY_MODULES = new Set([
  'license_override', 'risk_override', 'subscription_override', 'refunds', 'purge',
]);

// The 26 built-in modules (A3). The backend maps its routes to these, so they can't be deleted
// or switched off (C8). Anything else on the Modules tab is a leftover that gates nothing.
export const BUILT_IN_MODULES = new Set([
  'dashboard', 'analytics', 'app_users', 'devices', 'risk', 'risk_override', 'licenses',
  'license_override', 'subscriptions', 'subscription_override', 'subscription_plans', 'payments',
  'refunds', 'notifications', 'support_tickets', 'heartbeat', 'monitoring', 'infra', 'health',
  'audit_logs', 'admin_users', 'rbac', 'system_config', 'purge', 'crm_sync', 'welcome_emails',
]);

// Suggested grid grouping (labels only — the backend doesn't care). Unknown modules land in
// "Other" so nothing the API returns is ever hidden.
export const MODULE_GROUPS = [
  { key: 'everyday', label: 'Everyday', modules: ['dashboard', 'app_users', 'devices', 'licenses', 'subscriptions', 'subscription_plans', 'payments', 'notifications', 'support_tickets'] },
  { key: 'reports', label: 'Reports & monitoring', modules: ['analytics', 'risk', 'heartbeat', 'monitoring', 'infra', 'health', 'audit_logs', 'crm_sync', 'welcome_emails'] },
  { key: 'admin', label: 'Administration', modules: ['admin_users', 'rbac', 'system_config'] },
  { key: 'sensitive', label: 'Sensitive actions', modules: ['license_override', 'risk_override', 'subscription_override', 'refunds', 'purge'] },
];

export const SYSTEM_ROLE_NAMES = new Set(['viewer', 'admin', 'superadmin']);
export const APP_USER_ROLE = 'user';
export const SUPERADMIN = 'superadmin';

export const isActOnly = (moduleName) => ACT_ONLY_MODULES.has(moduleName);
export const isSuperadminRole = (role) => role?.name === SUPERADMIN;

// The "user" role is the mobile-app role, not a portal role — never shown here (C2).
export const visibleRoles = (roles) => (roles || []).filter((r) => r?.name !== APP_USER_ROLE);

// "Start from" options: every visible role except superadmin (C3).
export const templateRoles = (roles) => visibleRoles(roles).filter((r) => r.name !== SUPERADMIN);

// Normalise any stored map to the two-action model: keep only read/write, drop empty rows, and
// store Act-only modules as ["write"]. The API silently ignores anything else (C5).
export const normalizeGrid = (permissions) => {
  const out = {};
  for (const [mod, actions] of Object.entries(permissions || {})) {
    if (!Array.isArray(actions)) continue;
    const view = actions.includes(VIEW);
    const act = actions.includes(ACT);
    if (isActOnly(mod)) {
      if (act) out[mod] = [ACT];
    } else if (act) {
      out[mod] = [VIEW, ACT];   // you can't act on a page you can't open
    } else if (view) {
      out[mod] = [VIEW];
    }
  }
  return out;
};

export const hasView = (grid, mod) => !isActOnly(mod) && (grid?.[mod] || []).includes(VIEW);
export const hasAct = (grid, mod) => (grid?.[mod] || []).includes(ACT);

// Tick rules (C5): ticking Act also ticks View; unticking View also unticks Act. Act-only rows
// have no View. Every function returns a new map.
export const setView = (grid, mod, on) => {
  if (isActOnly(mod)) return grid;
  const next = { ...grid };
  if (on) next[mod] = hasAct(grid, mod) ? [VIEW, ACT] : [VIEW];
  else delete next[mod];
  return next;
};

export const setAct = (grid, mod, on) => {
  const next = { ...grid };
  if (isActOnly(mod)) {
    if (on) next[mod] = [ACT];
    else delete next[mod];
    return next;
  }
  if (on) next[mod] = [VIEW, ACT];
  else if (hasView(grid, mod)) next[mod] = [VIEW];
  else delete next[mod];
  return next;
};

// "26 view · 8 act" (C2). Superadmin always reads "Full access (always)".
export const accessCounts = (permissions) => {
  let view = 0;
  let act = 0;
  for (const actions of Object.values(permissions || {})) {
    if (!Array.isArray(actions)) continue;
    if (actions.includes(VIEW)) view += 1;
    if (actions.includes(ACT)) act += 1;
  }
  return { view, act };
};

export const accessLabel = (role) => {
  if (isSuperadminRole(role)) return 'Full access (always)';
  const { view, act } = accessCounts(role?.permissions);
  return `${view} view · ${act} act`;
};

// Name rules (C3): lowercase letters, digits and underscores; not a system role name.
export const validateRoleName = (name) => {
  const v = String(name ?? '');
  if (!v.trim()) return 'Name is required.';
  if (!/^[a-z0-9_]+$/.test(v)) return 'Use lowercase letters, digits and underscores only.';
  if (SYSTEM_ROLE_NAMES.has(v)) return `"${v}" is a system role name — choose another.`;
  if (v === APP_USER_ROLE) return '"user" is reserved for app users — choose another.';
  return '';
};

// Rows for the grid: the API's active modules, grouped. Superadmin's grid is drawn fully ticked.
export const groupModules = (modules) => {
  const active = (modules || []).filter((m) => m && m.is_active !== false);
  const byName = new Map(active.map((m) => [m.name, m]));
  const used = new Set();
  const groups = MODULE_GROUPS.map((g) => {
    const rows = g.modules.filter((n) => byName.has(n)).map((n) => { used.add(n); return byName.get(n); });
    return { key: g.key, label: g.label, rows };
  }).filter((g) => g.rows.length);
  const other = active.filter((m) => !used.has(m.name));
  if (other.length) groups.push({ key: 'other', label: 'Other', rows: other });
  return groups;
};

export const fullGrid = (modules) => {
  const out = {};
  for (const m of modules || []) out[m.name] = isActOnly(m.name) ? [ACT] : [VIEW, ACT];
  return out;
};

export const gridsEqual = (a, b) => {
  const na = normalizeGrid(a);
  const nb = normalizeGrid(b);
  const keys = new Set([...Object.keys(na), ...Object.keys(nb)]);
  for (const k of keys) {
    if ((na[k] || []).join() !== (nb[k] || []).join()) return false;
  }
  return true;
};
