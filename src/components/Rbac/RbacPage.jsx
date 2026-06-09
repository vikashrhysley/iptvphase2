import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRbacRoles, fetchRbacModules } from '../../store/slices/rbacSlice';
import './RbacPage.css';

// ─── Icons ────────────────────────────────────────────────
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const LayersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const MinusIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const StarIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const RefreshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
  </svg>
);
const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

// ─── Action config ────────────────────────────────────────
const ACTION_CFG = {
  read:    { color: '#38bdf8', bg: 'rgba(56,189,248,0.15)',  label: 'Read'    },
  write:   { color: '#34d399', bg: 'rgba(52,211,153,0.15)',  label: 'Write'   },
  delete:  { color: '#f87171', bg: 'rgba(248,113,113,0.15)', label: 'Delete'  },
  execute: { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', label: 'Execute' },
};
const ALL_ACTIONS = ['read', 'write', 'delete', 'execute'];

const roleColor = (name = '') => {
  const palette = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
};

const initials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean)
    .map(w => w[0]).slice(0, 2).join('').toUpperCase() || name.slice(0, 2).toUpperCase();

const permCount = (role) =>
  Object.values(role.permissions || {}).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);

// ─── Permission dot ───────────────────────────────────────
function PermDot({ action, active, available }) {
  if (!available) return <span className="rb-perm-na">—</span>;
  const c = ACTION_CFG[action] || {};
  if (!active) return <span className="rb-perm-off"><MinusIcon /></span>;
  return (
    <span className="rb-perm-on" style={{ '--ac': c.color, '--ab': c.bg }}>
      <CheckIcon />
    </span>
  );
}

// ─── Roles table (list view) ──────────────────────────────
function RolesTable({ roles, loading, onSelect }) {
  if (loading) return <SkeletonTable />;
  if (!roles.length) return (
    <div className="rb-empty"><LockIcon /><span>No roles found.</span></div>
  );

  return (
    <div className="rb-table-wrap">
      <table className="rb-roles-table">
        <thead>
          <tr>
            <th className="rb-rth-role">Role</th>
            <th className="rb-rth-center">Users</th>
            <th className="rb-rth-center">Modules</th>
            <th className="rb-rth-center">Actions</th>
            <th className="rb-rth-center">Status</th>
            <th className="rb-rth-arrow" />
          </tr>
        </thead>
        <tbody>
          {roles.map((role, idx) => {
            const color = roleColor(role.name);
            const pc    = permCount(role);
            const mods  = Object.keys(role.permissions || {}).length;
            return (
              <tr
                key={role.id}
                className={`rb-rt-row${idx % 2 !== 0 ? ' rb-rt-odd' : ''}`}
                onClick={() => onSelect(role)}
              >
                <td className="rb-rtd-role">
                  <div className="rb-rt-avatar" style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}>
                    {initials(role.name)}
                  </div>
                  <div className="rb-rt-info">
                    <div className="rb-rt-name">
                      {role.name}
                      {role.is_system && (
                        <span className="rb-system-badge"><StarIcon /> System</span>
                      )}
                    </div>
                    {role.description && (
                      <div className="rb-rt-desc">{role.description}</div>
                    )}
                  </div>
                </td>
                <td className="rb-rtd-center">
                  <span className="rb-rt-num">{role.user_count ?? 0}</span>
                </td>
                <td className="rb-rtd-center">
                  <span className="rb-rt-num">{mods}</span>
                </td>
                <td className="rb-rtd-center">
                  <span className="rb-rt-num">{pc}</span>
                </td>
                <td className="rb-rtd-center">
                  {role.is_active !== false
                    ? <span className="rb-status-active">Active</span>
                    : <span className="rb-status-inactive">Inactive</span>
                  }
                </td>
                <td className="rb-rtd-arrow">
                  <span className="rb-rt-chevron"><ChevronRightIcon /></span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Permission matrix (detail view) ─────────────────────
function PermMatrix({ role, modules, onBack }) {
  const color = roleColor(role.name);
  const rows  = modules.length > 0
    ? modules
    : Object.keys(role.permissions || {}).map(k => ({ name: k, display_name: k, available_actions: ALL_ACTIONS }));

  return (
    <div className="rb-detail-wrap">
      {/* Detail header */}
      <div className="rb-detail-header">
        <button className="rb-back-btn" onClick={onBack}>
          <ArrowLeftIcon /> Back to Roles
        </button>
        <div className="rb-detail-role-info">
          <div className="rb-detail-avatar" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
            {initials(role.name)}
          </div>
          <div>
            <div className="rb-detail-role-name">
              {role.name}
              {role.is_system && <span className="rb-system-badge"><StarIcon /> System</span>}
            </div>
            <div className="rb-detail-role-sub">
              {Object.keys(role.permissions || {}).length} modules · {permCount(role)} actions granted
            </div>
          </div>
        </div>
        <div className="rb-matrix-legend">
          <span className="rb-legend-item rb-legend-granted"><CheckIcon /> Granted</span>
          <span className="rb-legend-item rb-legend-denied"><MinusIcon /> Denied</span>
          <span className="rb-legend-item rb-legend-na">— N/A</span>
        </div>
      </div>

      {/* Matrix table */}
      <div className="rb-matrix-scroll">
        <table className="rb-matrix-table">
          <thead>
            <tr>
              <th className="rb-th-module">Module</th>
              {ALL_ACTIONS.map(a => {
                const c = ACTION_CFG[a];
                return (
                  <th key={a} className="rb-th-action-col">
                    <span className="rb-th-dot" style={{ background: c?.color }} />
                    <span style={{ color: c?.color }}>{c?.label}</span>
                  </th>
                );
              })}
              <th className="rb-th-summary">Access</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((mod, idx) => {
              const granted      = role.permissions?.[mod.name] || [];
              const avail        = mod.available_actions || ALL_ACTIONS;
              const grantedCount = ALL_ACTIONS.filter(a => avail.includes(a) && granted.includes(a)).length;
              const availCount   = ALL_ACTIONS.filter(a => avail.includes(a)).length;
              const pct          = availCount > 0 ? Math.round((grantedCount / availCount) * 100) : 0;

              return (
                <tr key={mod.name} className={idx % 2 !== 0 ? 'rb-row-odd' : ''}>
                  <td className="rb-td-module">
                    <div className="rb-module-name">{mod.display_name || mod.name}</div>
                    <div className="rb-module-key">{mod.name}</div>
                  </td>
                  {ALL_ACTIONS.map(action => (
                    <td key={action} className="rb-td-perm">
                      <PermDot
                        action={action}
                        active={granted.includes(action)}
                        available={avail.includes(action)}
                      />
                    </td>
                  ))}
                  <td className="rb-td-summary">
                    <div className="rb-access-bar-wrap">
                      <div className="rb-access-bar">
                        <div className="rb-access-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="rb-access-pct">{grantedCount}/{availCount}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="rb-empty">
            <LockIcon />
            <span>No modules defined for this role.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton table ───────────────────────────────────────
function SkeletonTable() {
  return (
    <div className="rb-table-wrap">
      <table className="rb-roles-table">
        <thead>
          <tr>
            <th className="rb-rth-role">Role</th>
            <th className="rb-rth-center">Users</th>
            <th className="rb-rth-center">Modules</th>
            <th className="rb-rth-center">Actions</th>
            <th className="rb-rth-center">Status</th>
            <th className="rb-rth-arrow" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, i) => (
            <tr key={i} className={i % 2 !== 0 ? 'rb-rt-odd' : ''}>
              <td className="rb-rtd-role">
                <div className="rb-sk rb-sk-avatar" />
                <div style={{ flex: 1 }}>
                  <div className="rb-sk rb-sk-title" />
                  <div className="rb-sk rb-sk-sub" style={{ width: '60%' }} />
                </div>
              </td>
              {[1,2,3,4].map(j => (
                <td key={j} className="rb-rtd-center">
                  <div className="rb-sk" style={{ width: 40, height: 20, margin: '0 auto', borderRadius: 20 }} />
                </td>
              ))}
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────
export default function RbacPage() {
  const dispatch = useDispatch();
  const { roles, modules, rolesLoading, rolesError } = useSelector(s => s.rbac);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    dispatch(fetchRbacRoles());
    dispatch(fetchRbacModules());
  }, [dispatch]);

  const systemRoles = roles.filter(r => r.is_system);
  const totalUsers  = roles.reduce((acc, r) => acc + (r.user_count ?? 0), 0);

  return (
    <div className="rbac-page">

      {/* ── Hero ── */}
      <div className="rb-hero">
        <div className="rb-hero-glow" />
        <div className="rb-hero-left">
          <div className="rb-hero-icon"><ShieldIcon /></div>
          <div>
            <h1 className="rb-hero-title">Roles & Permissions</h1>
          </div>
        </div>
        <button
          className="rb-refresh-btn"
          onClick={() => { dispatch(fetchRbacRoles()); dispatch(fetchRbacModules()); }}
        >
          <RefreshIcon /> Refresh
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="rb-stats">
        <div className="rb-stat-card" style={{ '--sc': '#6366f1' }}>
          <div className="rb-stat-icon" style={{ color:'#818cf8', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)' }}><ShieldIcon /></div>
          <div><div className="rb-stat-val">{roles.length}</div><div className="rb-stat-lbl">Total Roles</div></div>
        </div>
        <div className="rb-stat-card" style={{ '--sc': '#f59e0b' }}>
          <div className="rb-stat-icon" style={{ color:'#fbbf24', background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.25)' }}><StarIcon /></div>
          <div><div className="rb-stat-val">{systemRoles.length}</div><div className="rb-stat-lbl">System Roles</div></div>
        </div>
        <div className="rb-stat-card" style={{ '--sc': '#06b6d4' }}>
          <div className="rb-stat-icon" style={{ color:'#22d3ee', background:'rgba(6,182,212,0.12)', border:'1px solid rgba(6,182,212,0.25)' }}><UsersIcon /></div>
          <div><div className="rb-stat-val">{totalUsers}</div><div className="rb-stat-lbl">Total Users</div></div>
        </div>
        <div className="rb-stat-card" style={{ '--sc': '#10b981' }}>
          <div className="rb-stat-icon" style={{ color:'#34d399', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)' }}><LayersIcon /></div>
          <div><div className="rb-stat-val">{modules.length}</div><div className="rb-stat-lbl">Modules</div></div>
        </div>
      </div>

      {/* ── Main panel ── */}
      {rolesError ? (
        <div className="rb-error">⚠ {rolesError}</div>
      ) : (
        <div className="rb-main-panel">
          {!selectedRole ? (
            <>
              <div className="rb-panel-head">
                <span className="rb-panel-title">All Roles</span>
                <span className="rb-panel-count">{roles.length}</span>
              </div>
              <RolesTable
                roles={roles}
                loading={rolesLoading}
                onSelect={setSelectedRole}
              />
            </>
          ) : (
            <PermMatrix
              role={selectedRole}
              modules={modules}
              onBack={() => setSelectedRole(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
