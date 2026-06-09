import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAuditLogs, fetchAuditLogDetail,
  setAuditFilters, clearAuditFilters, clearAuditDetail,
} from '../../store/slices/auditSlice';
import './AuditPage.css';

// ─── Icons ────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const NetworkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
    <line x1="12" y1="8" x2="5.5" y2="16.5"/><line x1="12" y1="8" x2="18.5" y2="16.5"/>
  </svg>
);
const ChevLeft  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;
const CloseIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const ShieldOffIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="4.5" y1="4.5" x2="19.5" y2="19.5"/>
  </svg>
);
const LogIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const AlertTriIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);
const ActivityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const UserCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

// ─── Severity / entity config ─────────────────────────────────────────────────
const SEV = {
  info:     { color: '#38bdf8', glow: 'rgba(56,189,248,0.2)',  bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.25)',  dot: '#38bdf8', label: 'Info'     },
  warning:  { color: '#fbbf24', glow: 'rgba(251,191,36,0.2)',  bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.3)',   dot: '#fbbf24', label: 'Warning'  },
  critical: { color: '#f87171', glow: 'rgba(248,113,113,0.2)', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.3)',  dot: '#f87171', label: 'Critical' },
};

const ENT = {
  device:       { color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.2)'   },
  license:      { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.2)'  },
  subscription: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.2)'   },
  plan:         { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.2)'   },
  user:         { color: '#fb923c', bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.2)'   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

const fmtDateShort = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
};

const shortId  = (id) => id ? id.slice(0, 8) + '…' : '—';
const parseJson = (str) => {
  if (!str) return null;
  if (typeof str === 'object') return str;
  // Try valid JSON first
  try { return JSON.parse(str); } catch {}
  // Convert Python dict format: 'key' → "key", True/False/None
  try {
    const fixed = str
      .replace(/'/g, '"')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null');
    return JSON.parse(fixed);
  } catch {}
  return null;
};

const actorInitials = (name, email) => {
  if (name) {
    const p = name.trim().split(/\s+/);
    return p.length > 1 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : p[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'SY';
};

const actorColor = (email = '') => {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#ef4444','#84cc16'];
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ severity, size = 'sm' }) {
  const s = SEV[severity] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', dot: '#94a3b8', label: severity };
  return (
    <span className={`al-sev-badge al-sev-${size}`} style={{ color: s.color, background: s.bg, borderColor: s.border }}>
      <span className="al-sev-dot" style={{ background: s.dot }} />
      {s.label || severity}
    </span>
  );
}

function EntityBadge({ type }) {
  const e = ENT[type] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' };
  return (
    <span className="al-entity-badge" style={{ color: e.color, background: e.bg, borderColor: e.border }}>
      {type || '—'}
    </span>
  );
}

function ActionCell({ action }) {
  if (!action) return <span className="al-action-empty">—</span>;
  const dot = action.indexOf('.');
  if (dot < 0) return <code className="al-action-full">{action}</code>;
  return (
    <code className="al-action">
      <span className="al-action-ns">{action.slice(0, dot)}</span>
      <span className="al-action-sep">.</span>
      <span className="al-action-cmd">{action.slice(dot + 1)}</span>
    </code>
  );
}

function ActorAvatar({ email, name }) {
  const initials = actorInitials(name, email);
  const color    = actorColor(email || name || '');
  return (
    <span className="al-avatar" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {initials}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, glow }) {
  return (
    <div className="al-stat-card" style={{ '--sc': color, '--sg': glow }}>
      <div className="al-stat-icon">{icon}</div>
      <div className="al-stat-body">
        <div className="al-stat-val">{value ?? '—'}</div>
        <div className="al-stat-label">{label}</div>
      </div>
      <div className="al-stat-bar" />
    </div>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function SkeletonRows() {
  return Array.from({ length: 7 }, (_, i) => (
    <tr key={i} className="al-skeleton-row">
      {Array.from({ length: 8 }, (_, j) => (
        <td key={j}><span className="al-skeleton" style={{ width: `${50 + (i + j * 3) % 40}%` }} /></td>
      ))}
    </tr>
  ));
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ current, totalPages, total, pageSize, onPage }) {
  if (!total || totalPages <= 1) return null;
  const start = (current - 1) * pageSize + 1;
  const end   = Math.min(current * pageSize, total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - current) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push(`e${p}`);
      acc.push(p);
      return acc;
    }, []);
  return (
    <div className="al-pagination">
      <span className="al-pg-info">
        Showing <strong>{start}–{end}</strong> of <strong>{total}</strong> entries
      </span>
      <div className="al-pg-controls">
        <button className="al-pg-nav" onClick={() => onPage(Math.max(1, current - 1))} disabled={current === 1}>
          <ChevLeft /> Prev
        </button>
        <div className="al-pg-pages">
          {pages.map(p =>
            typeof p === 'string'
              ? <span key={p} className="al-pg-dots">…</span>
              : <button key={p} className={`al-pg-page${p === current ? ' active' : ''}`} onClick={() => onPage(p)}>{p}</button>
          )}
        </div>
        <button className="al-pg-nav" onClick={() => onPage(Math.min(totalPages, current + 1))} disabled={current === totalPages}>
          Next <ChevRight />
        </button>
      </div>
    </div>
  );
}

// ─── State block — structured key-value with diff highlight ──────────────────
const TYPE_COLOR = {
  boolean: '#f472b6',
  number:  '#fb923c',
  string:  '#86efac',
  null:    '#94a3b8',
};

function TypedValue({ raw }) {
  if (raw === null || raw === undefined) return <span style={{ color: TYPE_COLOR.null }}>null</span>;
  if (typeof raw === 'boolean') return <span style={{ color: TYPE_COLOR.boolean }}>{String(raw)}</span>;
  if (typeof raw === 'number')  return <span style={{ color: TYPE_COLOR.number  }}>{raw}</span>;
  // Try coercing string numbers / booleans for nicer display
  if (raw === 'true')  return <span style={{ color: TYPE_COLOR.boolean }}>true</span>;
  if (raw === 'false') return <span style={{ color: TYPE_COLOR.boolean }}>false</span>;
  if (raw === 'null')  return <span style={{ color: TYPE_COLOR.null }}>null</span>;
  if (!isNaN(raw) && raw !== '') return <span style={{ color: TYPE_COLOR.number }}>{raw}</span>;
  return <span style={{ color: TYPE_COLOR.string }}>"{raw}"</span>;
}

function StateBlock({ label, data, compareObj }) {
  if (!data) return null;
  const obj = parseJson(data);

  const CFG = {
    Before: { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.2)'  },
    After:  { color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)'  },
  };
  const c = CFG[label] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.05)', border: 'rgba(148,163,184,0.15)' };

  // Fallback: no parsed object — show raw string
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return (
      <div className="al-state-block" style={{ '--sh': c.color }}>
        <div className="al-state-label-bar"><span className="al-state-dot" style={{ background: c.color }} />{label}</div>
        <pre className="al-state-pre">{data != null ? String(data) : '—'}</pre>
      </div>
    );
  }

  const keys = Object.keys(obj);
  return (
    <div className="al-state-block" style={{ '--sh': c.color }}>
      <div className="al-state-label-bar" style={{ color: c.color, background: c.bg, borderColor: c.border }}>
        <span className="al-state-dot" style={{ background: c.color }} />
        {label}
        <span className="al-state-count">{keys.length} field{keys.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="al-state-rows">
        {keys.map(key => {
          const val     = obj[key];
          const cmpVal  = compareObj ? compareObj[key] : undefined;
          const changed = compareObj !== undefined && String(val) !== String(cmpVal);
          return (
            <div key={key} className={`al-state-row${changed ? ' al-state-changed' : ''}`}>
              <span className="al-state-key">{key.replace(/_/g, '_​')}</span>
              <span className="al-state-val"><TypedValue raw={val} /></span>
              {changed && <span className="al-state-diff-dot" title="Changed" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({ onClose }) {
  const { selectedLog: log, detailLoading, detailError } = useSelector(s => s.audit);
  const sev = log ? (SEV[log.severity] || SEV.info) : SEV.info;

  return (
    <div className="al-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="al-drawer">
        {/* Drawer header */}
        <div className="al-drawer-head" style={{ '--dh': sev.color, '--dg': sev.glow }}>
          <div className="al-drawer-head-glow" />
          <div className="al-drawer-head-top">
            <div className="al-drawer-head-label">
              <span className="al-drawer-head-icon"><LogIcon /></span>
              Audit Log Detail
            </div>
            <button className="al-drawer-close" onClick={onClose}><CloseIcon /></button>
          </div>
          {log && !detailLoading && (
            <div className="al-drawer-head-summary">
              <ActionCell action={log.action} />
              <SeverityBadge severity={log.severity} size="md" />
            </div>
          )}
        </div>

        <div className="al-drawer-body">
          {detailLoading && (
            <div className="al-drawer-loading">
              <div className="al-spin-lg" />
              <span>Loading details…</span>
            </div>
          )}
          {detailError && (
            <div className="al-drawer-err">
              <span>⚠</span> {detailError}
            </div>
          )}
          {log && !detailLoading && (
            <>
              {/* Timestamp banner */}
              <div className="al-drawer-ts">
                <ClockIcon />
                {fmtDate(log.created_at)}
              </div>

              {/* Section: Identity */}
              <div className="al-drawer-section">
                <div className="al-drawer-sect-title">Actor</div>
                <div className="al-drawer-actor-row">
                  <ActorAvatar email={log.actor_email} name={log.actor_full_name} />
                  <div>
                    <div className="al-drawer-actor-name">{log.actor_full_name || log.actor_email || 'System'}</div>
                    {log.actor_full_name && <div className="al-drawer-actor-email">{log.actor_email}</div>}
                    {log.actor_role && <span className="al-drawer-role-chip">{log.actor_role}</span>}
                  </div>
                </div>
              </div>

              {/* Section: Event details */}
              <div className="al-drawer-section">
                <div className="al-drawer-sect-title">Event</div>
                <div className="al-drawer-grid">
                  <div className="al-drawer-field">
                    <span className="al-drawer-field-lbl">Entity Type</span>
                    <EntityBadge type={log.entity_type} />
                  </div>
                  <div className="al-drawer-field">
                    <span className="al-drawer-field-lbl">Entity ID</span>
                    <span className="al-drawer-field-val al-mono">{log.entity_id || '—'}</span>
                  </div>
                  <div className="al-drawer-field">
                    <span className="al-drawer-field-lbl">IP Address</span>
                    <span className="al-drawer-field-val al-mono">{log.ip_address || '—'}</span>
                  </div>
                  <div className="al-drawer-field">
                    <span className="al-drawer-field-lbl">Log ID</span>
                    <span className="al-drawer-field-val al-mono al-dim">{log.id || '—'}</span>
                  </div>
                  {log.session_jti && (
                    <div className="al-drawer-field al-drawer-field-full">
                      <span className="al-drawer-field-lbl">Session JTI</span>
                      <span className="al-drawer-field-val al-mono al-dim">{log.session_jti}</span>
                    </div>
                  )}
                  {log.notes && (
                    <div className="al-drawer-field al-drawer-field-full">
                      <span className="al-drawer-field-lbl">Notes</span>
                      <span className="al-drawer-field-val">{log.notes}</span>
                    </div>
                  )}
                  {log.user_agent && (
                    <div className="al-drawer-field al-drawer-field-full">
                      <span className="al-drawer-field-lbl">User Agent</span>
                      <span className="al-drawer-field-val al-ua">{log.user_agent}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section: State diff */}
              {(log.before_state || log.after_state) && (() => {
                const beforeObj = parseJson(log.before_state);
                const afterObj  = parseJson(log.after_state);
                return (
                  <div className="al-drawer-section">
                    <div className="al-drawer-sect-title">State Snapshot</div>
                    <div className="al-state-cols">
                      <StateBlock label="Before" data={log.before_state} compareObj={afterObj}  />
                      <StateBlock label="After"  data={log.after_state}  compareObj={beforeObj} />
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const dispatch = useDispatch();
  const { logs, total, page, pageSize, loading, error, filters, selectedLog } = useSelector(s => s.audit);
  const { accessToken, user: me } = useSelector(s => s.auth);
  const isSuperAdmin = me?.role === 'superadmin';

  const [showDrawer,  setShowDrawer]  = useState(false);
  const [actionInput, setActionInput] = useState(filters.action || '');
  const [ipInput,     setIpInput]     = useState(filters.ip_address || '');
  const debounceRef = useRef(null);
  const totalPages  = Math.max(1, Math.ceil(total / (pageSize || 20)));

  // Derived severity counts from current page
  const criticalCount = logs.filter(l => l.severity === 'critical').length;
  const warningCount  = logs.filter(l => l.severity === 'warning').length;
  const infoCount     = logs.filter(l => l.severity === 'info').length;

  useEffect(() => {
    if (!isSuperAdmin) return;
    const p = {};
    if (filters.action)      p.action      = filters.action;
    if (filters.entity_type) p.entity_type = filters.entity_type;
    if (filters.severity)    p.severity    = filters.severity;
    if (filters.date_from)   p.date_from   = filters.date_from;
    if (filters.date_to)     p.date_to     = filters.date_to;
    if (filters.ip_address)  p.ip_address  = filters.ip_address;
    p.page      = filters.page;
    p.page_size = filters.page_size;
    dispatch(fetchAuditLogs(p));
  }, [dispatch, isSuperAdmin,
      filters.action, filters.entity_type, filters.severity,
      filters.date_from, filters.date_to, filters.ip_address,
      filters.page, filters.page_size]);

  const debounce = (key, value) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch(setAuditFilters({ [key]: value.trim(), page: 1 }));
    }, 380);
  };

  const handleRowClick = (id) => {
    dispatch(fetchAuditLogDetail(id));
    setShowDrawer(true);
  };

  const hasFilters = filters.action || filters.entity_type || filters.severity ||
                     filters.date_from || filters.date_to || filters.ip_address;

  // ── Access denied ──────────────────────────────────────────────────────────
  if (!isSuperAdmin) {
    return (
      <div className="audit-page">
        <div className="al-access-denied">
          <div className="al-access-icon"><ShieldOffIcon /></div>
          <div className="al-access-title">Access Restricted</div>
          <div className="al-access-sub">Audit logs are only accessible to Super Admins.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-page">

      {/* ── Page header ── */}
      <div className="al-hero">
        <div className="al-hero-glow" />
        <div className="al-hero-left">
          <div className="al-hero-icon"><LogIcon /></div>
          <div>
            <h1 className="al-hero-title">Audit Logs</h1>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="al-stats">
        <StatCard icon={<ActivityIcon />} label="Total Logs"      value={total}         color="#60a5fa" glow="rgba(96,165,250,0.15)" />
        <StatCard icon={<AlertTriIcon />} label="Critical Events" value={criticalCount} color="#f87171" glow="rgba(248,113,113,0.15)" />
        <StatCard icon={<AlertTriIcon />} label="Warnings"        value={warningCount}  color="#fbbf24" glow="rgba(251,191,36,0.15)"  />
        <StatCard icon={<InfoIcon />}     label="Info Events"     value={infoCount}     color="#38bdf8" glow="rgba(56,189,248,0.15)"  />
      </div>

      {/* ── Filters ── */}
      <div className="al-filters">
        <div className="al-filter-group">
          <span className="al-filter-ico"><SearchIcon /></span>
          <input
            className="al-filter-input"
            placeholder="Search action (e.g. device.block)"
            value={actionInput}
            onChange={e => { setActionInput(e.target.value); debounce('action', e.target.value); }}
          />
        </div>

        <div className="al-filter-group">
          <span className="al-filter-ico"><NetworkIcon /></span>
          <input
            className="al-filter-input"
            placeholder="IP address filter"
            value={ipInput}
            onChange={e => { setIpInput(e.target.value); debounce('ip_address', e.target.value); }}
          />
        </div>

        <select className="al-filter-select" value={filters.entity_type}
          onChange={e => dispatch(setAuditFilters({ entity_type: e.target.value, page: 1 }))}>
          <option value="">All Entities</option>
          <option value="device">Device</option>
          <option value="license">License</option>
          <option value="subscription">Subscription</option>
          <option value="plan">Plan</option>
          <option value="user">User</option>
        </select>

        <select className="al-filter-select" value={filters.severity}
          onChange={e => dispatch(setAuditFilters({ severity: e.target.value, page: 1 }))}>
          <option value="">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>

        <div className="al-filter-date-wrap">
          <div className="al-filter-date-field">
            <span className="al-filter-date-lbl">From</span>
            <input
              className="al-filter-date-input"
              type="date"
              value={filters.date_from}
              onChange={e => dispatch(setAuditFilters({ date_from: e.target.value, page: 1 }))}
            />
          </div>
          <span className="al-date-sep">→</span>
          <div className="al-filter-date-field">
            <span className="al-filter-date-lbl">To</span>
            <input
              className="al-filter-date-input"
              type="date"
              value={filters.date_to}
              onChange={e => dispatch(setAuditFilters({ date_to: e.target.value, page: 1 }))}
            />
          </div>
        </div>

        {hasFilters && (
          <button className="al-clear-btn" onClick={() => {
            setActionInput(''); setIpInput('');
            dispatch(clearAuditFilters());
          }}>
            ✕ Clear Filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="al-card">
        <div className="al-table-scroll">
          <table className="al-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Severity</th>
                <th>Actor</th>
                <th>Role</th>
                <th>IP Address</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : error ? (
                <tr>
                  <td colSpan={8}>
                    <div className="al-error-state">
                      <span className="al-error-icon">⚠</span>
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="al-empty-state">
                      <div className="al-empty-icon"><LogIcon /></div>
                      <div className="al-empty-title">No audit logs found</div>
                      <div className="al-empty-sub">
                        {hasFilters ? 'Try adjusting your filters.' : 'No admin actions have been recorded yet.'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const s = SEV[log.severity] || SEV.info;
                  const isActive = showDrawer && selectedLog?.id === log.id;
                  return (
                    <tr
                      key={log.id}
                      className={`al-row${isActive ? ' al-row-active' : ''}`}
                      style={{ '--row-sev': s.color, '--row-glow': s.glow }}
                      onClick={() => handleRowClick(log.id)}
                    >
                      <td>
                        <div className="al-date-cell">
                          <span className="al-date-main">{fmtDateShort(log.created_at)}</span>
                        </div>
                      </td>
                      <td><ActionCell action={log.action} /></td>
                      <td>
                        <div className="al-entity-cell">
                          <EntityBadge type={log.entity_type} />
                          <span className="al-entity-id">{shortId(log.entity_id)}</span>
                        </div>
                      </td>
                      <td><SeverityBadge severity={log.severity} /></td>
                      <td>
                        <div className="al-actor-cell">
                          <ActorAvatar email={log.actor_email} name={log.actor_full_name} />
                          <div className="al-actor-info">
                            <span className="al-actor-name">{log.actor_full_name || log.actor_email || 'System'}</span>
                            {log.actor_full_name && <span className="al-actor-email">{log.actor_email}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        {log.actor_role
                          ? <span className="al-role-chip">{log.actor_role}</span>
                          : <span className="al-dim">—</span>}
                      </td>
                      <td><code className="al-ip">{log.ip_address || '—'}</code></td>
                      <td>
                        <span className="al-notes-cell">
                          {log.notes ? log.notes.slice(0, 38) + (log.notes.length > 38 ? '…' : '') : <span className="al-dim">—</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && (
          <Pagination
            current={page} totalPages={totalPages} total={total} pageSize={pageSize}
            onPage={p => dispatch(setAuditFilters({ page: p }))}
          />
        )}
      </div>

      {/* ── Detail drawer ── */}
      {showDrawer && (
        <DetailDrawer onClose={() => { setShowDrawer(false); dispatch(clearAuditDetail()); }} />
      )}
    </div>
  );
}
