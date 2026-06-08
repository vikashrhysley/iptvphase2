import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDevices, fetchDeviceStats,
  updateDeviceStatus, revokeDevice,
  clearToast, setDeviceFilters, clearDeviceFilters,
} from '../../store/slices/deviceSlice';
import { apiExportDevices } from '../../services/api';
import DeviceDetail from './DeviceDetail';
import './DevicePage.css';

/* ── Icons ─────────────────────────────────────────────── */
const SearchIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const GridIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
const ListIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
const MapPinIcon  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const ClockIcon   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const AppIcon     = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
const ChevLeft    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;

/* ── Revoke modal ───────────────────────────────────────── */
function RevokeModal({ device, onClose, onConfirm, busy }) {
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!reason.trim()) { setLocalError('Reason is required.'); return; }
    onConfirm(reason.trim());
  };

  const name = device.device_brand
    ? `${device.device_brand} ${device.device_model || ''}`.trim()
    : (device.device_name || device.name || 'this device');

  return (
    <div className="rv-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <form className="rv-modal" onSubmit={submit}>
        <div className="rv-title">✕ Revoke Device Access</div>
        <p className="rv-sub">
          Revoke the active license on <strong>{name}</strong>.
          The device will fail heartbeat validation immediately.
        </p>

        <div className="rv-field">
          <label>Reason <span className="rv-required">*</span></label>
          <textarea
            value={reason}
            onChange={e => { setReason(e.target.value); setLocalError(''); }}
            placeholder="e.g. Fraudulent activation detected"
            rows={3}
            disabled={busy}
            autoFocus
          />
          {localError && <span className="rv-field-error">{localError}</span>}
        </div>

        <div className="rv-actions">
          <button type="button" className="rv-cancel" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="rv-confirm" disabled={busy}>
            {busy ? '…' : '✕ Revoke'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Device type config ─────────────────────────────────── */
const TYPE_CONFIG = {
  phone:           { icon: '📱', label: 'Phone',      color: '#00d4ff', bg: 'rgba(0,212,255,0.08)',   border: 'rgba(0,212,255,0.2)'   },
  tablet:          { icon: '📟', label: 'Tablet',     color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
  android_tv:      { icon: '📺', label: 'Android TV', color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)'  },
  desktop:         { icon: '🖥️', label: 'Desktop',    color: '#0284c7', bg: 'rgba(2,132,199,0.08)',   border: 'rgba(2,132,199,0.2)'   },
  smart_tv:        { icon: '📺', label: 'Smart TV',   color: '#ea580c', bg: 'rgba(234,88,12,0.08)',   border: 'rgba(234,88,12,0.2)'   },
  streaming_stick: { icon: '🔌', label: 'Streaming',  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
};

const TYPE_TABS = [
  { key: '',           label: 'All' },
  { key: 'phone',      label: 'Phone' },
  { key: 'tablet',     label: 'Tablet' },
  { key: 'android_tv', label: 'Android TV' },
  { key: 'desktop',    label: 'Desktop' },
  { key: 'smart_tv',   label: 'Smart TV' },
];

/* ── Helpers ────────────────────────────────────────────── */
const timeAgo = (iso) => {
  if (!iso) return '—';
  const diff  = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return 'Just now';
};

const initials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

/* ── Toast ─────────────────────────────────────────────── */
function Toast() {
  const dispatch = useDispatch();
  const { toast } = useSelector(s => s.devices);
  useEffect(() => {
    if (toast) { const t = setTimeout(() => dispatch(clearToast()), 3200); return () => clearTimeout(t); }
  }, [toast, dispatch]);
  if (!toast) return null;
  return (
    <div className={`device-toast ${toast.type}`}>
      {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
    </div>
  );
}

/* ── Pagination ─────────────────────────────────────────── */
function Pagination({ current, totalPages, totalItems, pageSize, onPage }) {
  if (!totalItems || totalPages <= 1) return null;
  const start = (current - 1) * pageSize + 1;
  const end   = Math.min(current * pageSize, totalItems);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - current) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i-1] > 1) acc.push(`e${p}`);
      acc.push(p); return acc;
    }, []);
  return (
    <div className="device-pagination">
      <span className="dp-info">Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{totalItems}</strong> devices</span>
      <div className="dp-controls">
        <button className="dp-nav" onClick={() => onPage(Math.max(1, current-1))} disabled={current===1}><ChevLeft /> Previous</button>
        <div className="dp-pages">
          {pages.map(p => typeof p === 'string'
            ? <span key={p} className="dp-ellipsis">…</span>
            : <button key={p} className={`dp-page${p===current?' active':''}`} onClick={() => onPage(p)}>{p}</button>
          )}
        </div>
        <button className="dp-nav" onClick={() => onPage(Math.min(totalPages, current+1))} disabled={current===totalPages}>Next <ChevRight /></button>
      </div>
    </div>
  );
}

/* ── Device Card ────────────────────────────────────────── */
function DeviceCard({ device, canEdit, onToggle, onRevoke, actionLoading, onCardClick }) {
  const id   = device.device_id || device.id;
  const tc   = TYPE_CONFIG[device.device_type || device.type] || TYPE_CONFIG.phone;
  const busy = actionLoading === id;
  const name = device.device_brand
    ? `${device.device_brand} ${device.device_model || ''}`.trim()
    : (device.device_name || device.name || 'Unknown Device');
  const os       = device.os_version || device.os || '—';
  const userName = device.user_full_name || device.userName || device.user_email || '—';
  const userId   = device.user_id ? `USR-${String(device.user_id).slice(0,6).toUpperCase()}` : (device.userId || '—');
  const location = device.last_seen_city
    ? `${device.last_seen_city}${device.last_seen_country ? ', '+device.last_seen_country : ''}`
    : (device.location || '—');
  const lastSeen   = device.last_heartbeat_at || device.lastSeen;
  const appVersion = device.app_version || device.appVersion || '—';

  return (
    <div
      className={`device-card${device.status === 'blocked' || device.status === 'revoked' ? ' blocked' : ''}`}
      style={{ '--type-color': tc.color, '--type-bg': tc.bg, '--type-border': tc.border, cursor: 'pointer' }}
      onClick={onCardClick}
    >
      {/* Top row */}
      <div className="dc-top">
        <div className="dc-type-icon">{tc.icon}</div>
        <div className="dc-header">
          <div className="dc-device-name">{name}</div>
          <div className="dc-os">{os}</div>
        </div>
        <span className={`dc-status ${device.status}`}>
          <span className="dc-status-dot" />
          {(device.status || '').charAt(0).toUpperCase() + (device.status || '').slice(1)}
        </span>
      </div>

      {/* User */}
      <div className="dc-user">
        <div className="dc-user-avatar-fb">{initials(userName)}</div>
        <div className="dc-user-info">
          <div className="dc-user-name">{userName}</div>
          <div className="dc-user-id">{userId}{device.user_email ? ` · ${device.user_email}` : ''}</div>
        </div>
      </div>

      {/* Meta */}
      <div className="dc-meta">
        <div className="dc-meta-row">
          <span className="dc-meta-key"><MapPinIcon /> Location</span>
          <span className="dc-meta-val">{location}</span>
        </div>
        <div className="dc-meta-row">
          <span className="dc-meta-key"><ClockIcon /> Last seen</span>
          <span className="dc-meta-val">{timeAgo(lastSeen)}</span>
        </div>
        <div className="dc-meta-row">
          <span className="dc-meta-key"><AppIcon /> App version</span>
          <span className="dc-meta-val" style={{ color: 'var(--accent-primary)' }}>{appVersion}</span>
        </div>
        <div className="dc-meta-row">
          <span className="dc-meta-key">Device ID</span>
          <span className="dc-meta-val dc-mono">{id}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="dc-actions" onClick={e => e.stopPropagation()}>
        {!canEdit ? (
          <button className="dc-btn disabled-btn" disabled>No Permission</button>
        ) : device.status === 'blocked' || device.status === 'revoked' ? (
          <button className="dc-btn activate" onClick={() => onToggle(id, 'active')} disabled={busy}>
            {busy ? '…' : '✓ Restore'}
          </button>
        ) : (
          <>
            <button
              className="dc-btn deactivate"
              disabled
            >
              ○ Deactivate
            </button>
            <button className="dc-btn revoke" onClick={() => onRevoke(id)} disabled={busy}>
              {busy ? '…' : '✕ Revoke'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Device Table Row ───────────────────────────────────── */
function DeviceTableRow({ device, canEdit, onToggle, onRevoke, actionLoading }) {
  const id   = device.device_id || device.id;
  const tc   = TYPE_CONFIG[device.device_type || device.type] || TYPE_CONFIG.phone;
  const busy = actionLoading === id;
  const name = device.device_brand ? `${device.device_brand} ${device.device_model || ''}`.trim() : (device.device_name || device.name || '—');
  const os   = device.os_version || device.os || '—';
  const userName = device.user_full_name || device.userName || '—';
  const location = device.last_seen_city
    ? `${device.last_seen_city}${device.last_seen_country ? ', '+device.last_seen_country : ''}`
    : (device.location || '—');
  return (
    <tr>
      <td>
        <div className="dt-type-cell" style={{ '--type-bg': tc.bg }}>
          <div className="dt-type-icon">{tc.icon}</div>
          <div>
            <div style={{ fontWeight:600, fontSize:'0.83rem' }}>{name}</div>
            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{os}</div>
          </div>
        </div>
      </td>
      <td>
        <div style={{ fontSize:'0.82rem', fontWeight:500 }}>{userName}</div>
        {device.user_email && <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{device.user_email}</div>}
      </td>
      <td><span style={{ fontSize:'0.75rem', background:tc.bg, color:tc.color, padding:'3px 10px', borderRadius:12, fontWeight:700, border:`1px solid ${tc.border}` }}>{tc.icon} {tc.label}</span></td>
      <td style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>{location}</td>
      <td style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{timeAgo(device.last_heartbeat_at || device.lastSeen)}</td>
      <td>
        <span className={`dc-status ${device.status}`} style={{ fontSize:'0.7rem' }}>
          <span className="dc-status-dot" />
          {(device.status||'').charAt(0).toUpperCase()+(device.status||'').slice(1)}
        </span>
      </td>
      <td>
        {!canEdit ? <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>—</span>
          : device.status === 'blocked' || device.status === 'revoked' ? (
            <button className="dc-btn activate" style={{ padding:'5px 12px' }} onClick={() => onToggle(id,'active')} disabled={busy}>{busy?'…':'✓ Restore'}</button>
          ) : (
            <div style={{ display:'flex', gap:6 }}>
              <button className={`dc-btn ${device.status==='active'?'deactivate':'activate'}`} style={{ padding:'5px 10px', fontSize:'0.72rem' }} onClick={() => onToggle(id, device.status==='active'?'inactive':'active')} disabled={busy}>{busy?'…':device.status==='active'?'Deactivate':'Activate'}</button>
              <button className="dc-btn revoke" style={{ padding:'5px 10px', fontSize:'0.72rem' }} onClick={() => onRevoke(id)} disabled={busy}>{busy?'…':'Revoke'}</button>
            </div>
          )}
      </td>
    </tr>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
export default function DevicePage() {
  const dispatch = useDispatch();
  const { devices, total, page, pageSize, loading, error, actionLoading, stats, statsLoading, filters } = useSelector(s => s.devices);
  const { user: me } = useSelector(s => s.auth);
  const canEdit = me?.role === 'superadmin' || me?.role === 'admin';

  const [view,          setView]         = useState('grid');
  const [detailId,      setDetailId]     = useState(null);
  const [revokeTarget,  setRevokeTarget] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError,   setExportError]   = useState('');
  const { accessToken } = useSelector(s => s.auth);

  // All hooks before any conditional return

  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debounceRef = useRef(null);
  const totalPages  = Math.max(1, Math.ceil(total / (pageSize || 20)));

  /* All hooks first */
  useEffect(() => { dispatch(fetchDeviceStats()); }, [dispatch]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch(setDeviceFilters({ search: searchInput.trim() || '', page: 1 }));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput, dispatch]);

  useEffect(() => {
    const p = {};
    if (filters.search)          p.search        = filters.search;
    if (filters.status)          p.status        = filters.status;
    if (filters.device_type)     p.device_type   = filters.device_type;
    if (filters.platform)        p.platform      = filters.platform;
    if (filters.plan_type)       p.plan_type     = filters.plan_type;
    if (filters.has_risk_flag)   p.has_risk_flag  = true;
    if (filters.heartbeat_stale) p.heartbeat_stale = true;
    p.sort_by    = filters.sort_by;
    p.sort_order = filters.sort_order;
    p.page       = filters.page;
    p.page_size  = filters.page_size;
    dispatch(fetchDevices(p));
  }, [dispatch, filters.search, filters.status, filters.device_type, filters.platform,
      filters.plan_type, filters.has_risk_flag, filters.heartbeat_stale,
      filters.sort_by, filters.sort_order, filters.page, filters.page_size]);

  if (detailId) {
    return <DeviceDetail deviceId={detailId} onBack={() => setDetailId(null)} />;
  }

  const handleExport = async (format) => {
    setExportError('');
    setExportLoading(true);
    try {
      await apiExportDevices(accessToken, filters, format);
    } catch (err) {
      setExportError(err.message || 'Export failed.');
      setTimeout(() => setExportError(''), 4000);
    } finally {
      setExportLoading(false);
    }
  };

  const handleToggle = (deviceId, status) => dispatch(updateDeviceStatus({ deviceId, status }));
  const handleRevoke = (device) => setRevokeTarget(device);
  const confirmRevoke = (reason) => {
    const id = revokeTarget.device_id || revokeTarget.id;
    dispatch(revokeDevice({ deviceId: id, reason }));
    setRevokeTarget(null);
  };

  /* Stats cards */
  const S = stats || {};
  const statCards = [
    { label: 'Total',       value: S.total                ?? 0, color: '#00d4ff' },
    { label: 'Active',      value: S.active               ?? 0, color: '#10b981' },
    { label: 'Inactive',    value: S.inactive             ?? 0, color: '#f59e0b' },
    { label: 'Blocked',     value: S.blocked              ?? 0, color: '#ef4444' },
    { label: 'High Risk',   value: S.high_risk            ?? 0, color: '#f87171' },
    { label: 'Expiring 7d', value: S.expiring_licenses_7d ?? 0, color: '#fbbf24' },
  ];

  return (
    <div className="device-page">
      <Toast />

      {/* ── Stats ── */}
      {statsLoading && <div className="device-stats-shimmer" />}
      {!statsLoading && (
        <div className="device-stats">
          {statCards.map(({ label, value, color }) => (
            <div className="device-stat-card" key={label} style={{ '--dsc': color }}>
              <div className="dsc-value">{value.toLocaleString()}</div>
              <div className="dsc-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar: tabs left · controls right ── */}
      <div className="device-toolbar">
        {/* Left: device type tabs */}
        <div className="filter-tabs">
          {TYPE_TABS.map(({ key, label }) => {
            const tc     = TYPE_CONFIG[key];
            const active = filters.device_type === key;
            return (
              <button
                key={key || 'all'}
                className={`filter-tab${active ? ' active' : ''}`}
                onClick={() => dispatch(setDeviceFilters({ device_type: key, page: 1 }))}
              >
                {tc ? tc.icon : '⊞'} {label}
                {key === '' && total > 0 && <span className="filter-tab-count">{total}</span>}
              </button>
            );
          })}
        </div>

        {/* Right: search + status + view + refresh */}
        <div className="toolbar-right">
          <div className="device-search-wrap">
            <SearchIcon />
            <input
              className="device-search"
              placeholder="Search…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>

          <select className="status-filter" value={filters.status}
            onChange={e => dispatch(setDeviceFilters({ status: e.target.value, page: 1 }))}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
            <option value="suspended">Suspended</option>
            <option value="revoked">Revoked</option>
          </select>

          {/* Export */}
          <div className="dv-export-wrap">
            <button className="dv-export-btn" disabled={exportLoading}>
              {exportLoading
                ? <span className="dv-export-spin" />
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
              Export
            </button>
            <div className="dv-export-dropdown">
              <button className="dv-export-option" onClick={() => handleExport('csv')}  disabled={exportLoading}>📄 Download CSV</button>
              <button className="dv-export-option" onClick={() => handleExport('json')} disabled={exportLoading}>📋 Download JSON</button>
            </div>
          </div>
          {exportError && <span className="dv-export-error">{exportError}</span>}

          <div className="view-toggle">
            <button className={`view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} title="Grid view"><GridIcon /></button>
            <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} title="List view"><ListIcon /></button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="device-loading">
          <div className="device-loading-spinner" />
          Loading devices…
        </div>
      ) : error ? (
        <div className="device-empty" style={{ color: '#f87171' }}>{error}</div>
      ) : devices.length === 0 ? (
        <div className="device-empty">
          <span className="device-empty-icon">📭</span>
          No devices match your filters.
        </div>
      ) : view === 'grid' ? (
        <>
          <div className="device-grid">
            {devices.map(d => (
              <DeviceCard
                key={d.device_id || d.id}
                device={d}
                canEdit={canEdit}
                onToggle={handleToggle}
                onRevoke={() => handleRevoke(d)}
                actionLoading={actionLoading}
                onCardClick={() => setDetailId(d.device_id || d.id)}
              />
            ))}
          </div>
          <Pagination current={page} totalPages={totalPages} totalItems={total} pageSize={pageSize}
            onPage={p => dispatch(setDeviceFilters({ page: p }))} />
        </>
      ) : (
        <div className="device-table-wrap">
          <div style={{ overflowX: 'auto' }}>
            <table className="device-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Last Seen</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <DeviceTableRow key={d.device_id || d.id} device={d} canEdit={canEdit}
                    onToggle={handleToggle} onRevoke={() => handleRevoke(d)} actionLoading={actionLoading} />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination current={page} totalPages={totalPages} totalItems={total} pageSize={pageSize}
            onPage={p => dispatch(setDeviceFilters({ page: p }))} />
        </div>
      )}

      {revokeTarget && (
        <RevokeModal
          device={revokeTarget}
          busy={!!actionLoading}
          onClose={() => setRevokeTarget(null)}
          onConfirm={confirmRevoke}
        />
      )}
    </div>
  );
}
