import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDevices, fetchDeviceStats,
  updateDeviceStatus, revokeDevice,
  clearToast, setDeviceFilters, clearDeviceFilters, clearDeviceDetail, clearUpdateState,
} from '../../store/slices/deviceSlice';
import { apiFetchAdminDevices } from '../../services/api';
import DeviceDetail, { UpdateStatusModal } from './DeviceDetail';
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
  { key: '',                label: 'All' },
  { key: 'phone',           label: 'Phone' },
  { key: 'tablet',          label: 'Tablet' },
  { key: 'android_tv',      label: 'Android TV' },
  { key: 'desktop',         label: 'Desktop' },
  { key: 'smart_tv',        label: 'Smart TV' },
  { key: 'streaming_stick', label: 'Streaming' },
];

const STATUS_FILTERS = [
  { key: 'all',             label: 'All',             status: '',         current_session: false },
  { key: 'active',          label: 'Active',          status: 'active',   current_session: false, color: '#10b981' },
  { key: 'blocked',         label: 'Blocked',         status: 'blocked',  current_session: false, color: '#ef4444' },
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
// Device health "normal" is shown to admins as "Active" (and styled green like active).
const dispStatusKey = (s) => (String(s || '').toLowerCase() === 'normal' ? 'active' : String(s || '').toLowerCase());
const dispStatusLabel = (s) => { const k = dispStatusKey(s); return k ? k.charAt(0).toUpperCase() + k.slice(1) : '—'; };

function DeviceCard({ device, canEdit, onToggle, onRevoke, actionLoading, onCardClick, onEdit }) {
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
        <span className={`dc-status ${dispStatusKey(device.status)}`}>
          <span className="dc-status-dot" />
          {dispStatusLabel(device.status)}
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
          <button className="dc-btn edit" onClick={onEdit}>
            ✎ Edit
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Device Table Row ───────────────────────────────────── */
function DeviceTableRow({ device, canEdit, onToggle, onRevoke, actionLoading, onRowClick, onEdit }) {
  const id   = device.device_id || device.id;
  const tc   = TYPE_CONFIG[device.device_type || device.type] || TYPE_CONFIG.phone;
  const busy = actionLoading === id;
  const name = device.device_brand ? `${device.device_brand} ${device.device_model || ''}`.trim() : (device.device_name || device.name || '—');
  const os   = device.os_version || device.os || '—';
  const userDisplayName = device.user_full_name || device.userName || null;
  const location = device.last_seen_city
    ? `${device.last_seen_city}${device.last_seen_country ? ', '+device.last_seen_country : ''}`
    : (device.location || '—');
  return (
    <tr className="dt-row" onClick={onRowClick} style={{ cursor: 'pointer' }}>
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
        <div style={{ fontSize:'0.82rem', fontWeight:500 }}>
          {userDisplayName || device.user_email || '—'}
        </div>
        {userDisplayName && device.user_email && (
          <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{device.user_email}</div>
        )}
      </td>
      <td><span style={{ fontSize:'0.75rem', background:tc.bg, color:tc.color, padding:'3px 10px', borderRadius:12, fontWeight:700, border:`1px solid ${tc.border}`, whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:5 }}>{tc.icon} {tc.label}</span></td>
      <td style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>{location}</td>
      <td style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{timeAgo(device.last_heartbeat_at || device.lastSeen)}</td>
      <td>
        <span className={`dc-status ${dispStatusKey(device.status)}`} style={{ fontSize:'0.7rem' }}>
          <span className="dc-status-dot" />
          {dispStatusLabel(device.status)}
        </span>
      </td>
      <td onClick={e => e.stopPropagation()}>
        {!canEdit ? <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>—</span>
          : device.status === 'blocked' || device.status === 'revoked' ? (
            <button className="dc-btn activate" style={{ padding:'5px 12px' }} onClick={() => onToggle(id,'active')} disabled={busy}>{busy?'…':'✓ Restore'}</button>
          ) : (
            <button className="dc-btn edit" style={{ padding:'5px 12px', fontSize:'0.72rem' }} onClick={onEdit}>✎ Edit</button>
          )}
      </td>
    </tr>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
export default function DevicePage() {
  const dispatch = useDispatch();
  const { devices, total, page, pageSize, loading, error, actionLoading, stats, statsLoading, filters, detailError } = useSelector(s => s.devices);
  const { user: me, accessToken } = useSelector(s => s.auth);
  const canEdit = me?.role === 'superadmin' || me?.role === 'admin';

  const [view,          setView]         = useState('grid');
  const [detailId,      setDetailId]     = useState(
    () => sessionStorage.getItem('deviceDetailId') || null
  );
  const [revokeTarget,  setRevokeTarget] = useState(null);
  const [editTarget,    setEditTarget]   = useState(null);
  const [exportOpen,    setExportOpen]   = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError,   setExportError]   = useState(null);
  const exportRef = useRef(null);

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
    if (filters.has_risk_flag)   p.has_risk_flag   = true;
    if (filters.heartbeat_stale) p.heartbeat_stale  = true;
    if (filters.current_session) p.current_session  = true;
    p.sort_by    = filters.sort_by;
    p.sort_order = filters.sort_order;
    p.page       = filters.page;
    p.page_size  = filters.page_size;
    dispatch(fetchDevices(p));
  }, [dispatch, filters.search, filters.status, filters.device_type, filters.platform,
      filters.plan_type, filters.has_risk_flag, filters.heartbeat_stale, filters.current_session,
      filters.sort_by, filters.sort_order, filters.page, filters.page_size]);

  // If detail fetch fails (e.g. stale sessionStorage ID after refresh), silently fall back to list
  useEffect(() => {
    if (detailId && detailError) {
      sessionStorage.removeItem('deviceDetailId');
      dispatch(clearDeviceDetail());
      setDetailId(null);
    }
  }, [detailId, detailError, dispatch]);

  // Close export menu on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  const openDetail = (id) => {
    sessionStorage.setItem('deviceDetailId', id);
    setDetailId(id);
  };
  const closeDetail = () => {
    sessionStorage.removeItem('deviceDetailId');
    setDetailId(null);
  };

  // Re-fetch the current device list (used after an inline status edit so the card/row
  // reflects the new status without a page reload).
  const refreshDevices = () => {
    const p = {};
    if (filters.search)          p.search          = filters.search;
    if (filters.status)          p.status          = filters.status;
    if (filters.device_type)     p.device_type     = filters.device_type;
    if (filters.platform)        p.platform        = filters.platform;
    if (filters.plan_type)       p.plan_type       = filters.plan_type;
    if (filters.has_risk_flag)   p.has_risk_flag   = true;
    if (filters.heartbeat_stale) p.heartbeat_stale = true;
    if (filters.current_session) p.current_session = true;
    p.sort_by    = filters.sort_by;
    p.sort_order = filters.sort_order;
    p.page       = filters.page;
    p.page_size  = filters.page_size;
    dispatch(fetchDevices(p));
  };

  const openEdit = (device) => { dispatch(clearUpdateState()); setEditTarget(device); };
  const closeEdit = () => { setEditTarget(null); refreshDevices(); };

  if (detailId) {
    return <DeviceDetail deviceId={detailId} onBack={closeDetail} />;
  }

  const datestamp = () => new Date().toISOString().slice(0, 10);

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildExportRows = (list) => list.map(d => ({
    'Device ID':    d.device_id   || d.id                                    || '',
    'Device Name':  d.device_brand
                      ? `${d.device_brand} ${d.device_model || ''}`.trim()
                      : (d.device_name || d.name                             || ''),
    'Type':         d.device_type || d.type                                  || '',
    'OS Version':   d.os_version  || d.os                                    || '',
    'App Version':  d.app_version || d.appVersion                            || '',
    'Status':       d.status                                                  || '',
    'User Name':    d.user_full_name || d.userName                           || '',
    'User Email':   d.user_email                                              || '',
    'Location':     d.last_seen_city
                      ? `${d.last_seen_city}${d.last_seen_country ? ', '+d.last_seen_country : ''}`
                      : (d.location                                           || ''),
    'Last Seen':    d.last_heartbeat_at || d.lastSeen                        || '',
  }));

  const handleExport = async (format) => {
    setExportOpen(false);
    setExportError(null);
    setExportLoading(true);

    let allData = [];

    try {
      /* Build base filter params (no page/page_size yet) */
      const baseParams = { sort_by: filters.sort_by, sort_order: filters.sort_order };
      if (filters.search)          baseParams.search          = filters.search;
      if (filters.status)          baseParams.status          = filters.status;
      if (filters.device_type)     baseParams.device_type     = filters.device_type;
      if (filters.platform)        baseParams.platform        = filters.platform;
      if (filters.plan_type)       baseParams.plan_type       = filters.plan_type;
      if (filters.has_risk_flag)   baseParams.has_risk_flag   = true;
      if (filters.heartbeat_stale) baseParams.heartbeat_stale = true;
      if (filters.current_session) baseParams.current_session = true;

      /* Page through ALL results — backend may cap page_size */
      const PAGE_SIZE = 100;
      let currentPage = 1;
      let fetchedTotal = 0;

      while (true) {
        const result = await apiFetchAdminDevices(accessToken, {
          ...baseParams,
          page: currentPage,
          page_size: PAGE_SIZE,
        });
        const items      = Array.isArray(result.devices) ? result.devices : [];
        const serverTotal = result.total ?? 0;

        allData.push(...items);
        fetchedTotal = allData.length;

        /* Stop when we've collected all records or received an empty page */
        if (items.length === 0 || fetchedTotal >= serverTotal) break;
        currentPage++;
      }
    } catch (fetchErr) {
      console.warn('[Export] fetch failed, falling back to current page:', fetchErr);
      allData = devices; // fallback: whatever is currently in Redux
    }

    if (allData.length === 0) {
      setExportError('No device data available to export.');
      setExportLoading(false);
      return;
    }

    try {
      const rows    = buildExportRows(allData);
      const stamp   = datestamp();
      const headers = Object.keys(rows[0]);

      if (format === 'excel') {
        const { utils, writeFile } = await import('xlsx');
        const wb = utils.book_new();
        const ws = utils.aoa_to_sheet([
          headers,
          ...rows.map(r => headers.map(h => r[h])),
        ]);
        ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 18) }));
        utils.book_append_sheet(wb, ws, 'Devices');
        writeFile(wb, `devices_${stamp}.xlsx`);
      } else {
        const { jsPDF }              = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();

        doc.setFontSize(15);
        doc.setTextColor(30, 30, 60);
        doc.text('Device Management Export', pageW / 2, 14, { align: 'center' });
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
          `Generated: ${new Date().toLocaleString()}  ·  ${allData.length} device${allData.length !== 1 ? 's' : ''}`,
          pageW / 2, 20, { align: 'center' }
        );

        autoTable(doc, {
          startY: 26,
          head: [headers],
          body: rows.map(r => headers.map(h => String(r[h] ?? ''))),
          theme: 'striped',
          headStyles: { fillColor: [15, 25, 35], textColor: 255, fontSize: 7, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7, textColor: [40, 40, 80] },
          alternateRowStyles: { fillColor: [245, 246, 250] },
          margin: { left: 10, right: 10 },
          styles: { overflow: 'linebreak', cellPadding: 2 },
        });

        doc.save(`devices_${stamp}.pdf`);
      }
    } catch (genErr) {
      console.error('[Export] file generation failed:', genErr);
      setExportError(`Export failed: ${genErr.message}`);
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
  const S  = stats?.stats             ?? {};
  const ES = stats?.extra_stats       ?? {};
  const PB = stats?.platform_breakdown ?? {};

  const deviceStatItems = [
    { label: 'Total',    value: S.total    ?? 0, color: '#00d4ff', icon: '📱' },
    { label: 'Active',   value: S.active   ?? 0, color: '#10b981', icon: '✅' },
    { label: 'Inactive', value: S.inactive ?? 0, color: '#94a3b8', icon: '💤' },
    { label: 'Blocked',  value: S.blocked  ?? 0, color: '#ef4444', icon: '🚫' },
  ];

  const auxiliaryStatItems = [
    { label: 'Current Sessions', value: ES.current_sessions     ?? 0, color: '#00d4ff', icon: '🟢' },
    { label: 'High Risk',        value: ES.high_risk            ?? 0, color: '#f87171', icon: '⚠️' },
    { label: 'Expiring 7d',      value: ES.expiring_licenses_7d ?? 0, color: '#fbbf24', icon: '⏳' },
    { label: 'Push Enabled',     value: ES.push_enabled         ?? 0, color: '#8b5cf6', icon: '🔔' },
  ];

  const PLATFORM_META = {
    android: { color: '#3ddc84', icon: '🤖' },
    ios:     { color: '#e5e7eb', icon: '🍎' },
    roku:    { color: '#a78bfa', icon: '📺' },
    tizen:   { color: '#00b4d8', icon: '📺' },
    firetv:  { color: '#ff9900', icon: '🔥' },
    windows: { color: '#0078d4', icon: '🖥️' },
    web:     { color: '#06b6d4', icon: '🌐' },
  };
  const platformStatItems = Object.entries(PB).map(([key, value]) => {
    const meta = PLATFORM_META[key] || { color: '#64748b', icon: '🧩' };
    return { label: key.charAt(0).toUpperCase() + key.slice(1), value: value ?? 0, ...meta };
  });

  return (
    <div className="device-page">
      <Toast />

      {/* ── Stats ── */}
      {statsLoading && <div className="device-stats-shimmer" />}
      {!statsLoading && (
        <div className="device-stats">
          <div className="device-stats-panel">
            <div className="dsp-title"><span className="dsp-title-icon">📊</span> Device Stats</div>
            <div className="dsp-grid">
              {deviceStatItems.map(({ label, value, color, icon }) => (
                <div className="dsp-item" key={label} style={{ '--dsc': color }}>
                  <div className="dsp-icon">{icon}</div>
                  <div className="dsp-info">
                    <div className="dsp-value">{value.toLocaleString()}</div>
                    <div className="dsp-label">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="device-stats-panel">
            <div className="dsp-title"><span className="dsp-title-icon">📈</span> Auxiliary Stats</div>
            <div className="dsp-grid">
              {auxiliaryStatItems.map(({ label, value, color, icon }) => (
                <div className="dsp-item" key={label} style={{ '--dsc': color }}>
                  <div className="dsp-icon">{icon}</div>
                  <div className="dsp-info">
                    <div className="dsp-value">{value.toLocaleString()}</div>
                    <div className="dsp-label">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="device-stats-panel">
            <div className="dsp-title"><span className="dsp-title-icon">🌐</span> Platform Stats</div>
            <div className="dsp-grid">
              {platformStatItems.map(({ label, value, color, icon }) => (
                <div className="dsp-item" key={label} style={{ '--dsc': color }}>
                  <div className="dsp-icon">{icon}</div>
                  <div className="dsp-info">
                    <div className="dsp-value">{value.toLocaleString()}</div>
                    <div className="dsp-label">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

        {/* Right: search + status + view + export */}
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

          <select
            className="status-filter"
            value={filters.current_session ? 'current_session' : (filters.status || '')}
            onChange={e => {
              const val = e.target.value;
              const f = STATUS_FILTERS.find(x => x.key === val) || STATUS_FILTERS[0];
              dispatch(setDeviceFilters({ status: f.status, current_session: f.current_session, page: 1 }));
            }}
          >
            {STATUS_FILTERS.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>

          {/* Export */}
          <div className="dv-export-wrap" ref={exportRef}>
            <button
              className={`dv-export-btn${exportOpen ? ' open' : ''}`}
              onClick={() => !exportLoading && setExportOpen(o => !o)}
              disabled={exportLoading || total === 0}
              title={total === 0 ? 'No data to export' : `Export all ${total.toLocaleString()} devices`}
            >
              {exportLoading
                ? <><span className="dv-export-spinner" /> Exporting…</>
                : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export <span className="dv-export-caret" style={{ fontSize:'0.68rem', opacity:0.6, transition:'transform 0.18s', display:'inline-block', transform: exportOpen ? 'rotate(180deg)' : 'none' }}>▾</span></>
              }
            </button>
            {exportOpen && (
              <div className="dv-export-dropdown">
                <button className="dv-export-option" onClick={() => handleExport('excel')}>
                  📊 <span><strong>Excel</strong> <span style={{fontSize:'0.7rem',opacity:0.6}}>.xlsx spreadsheet</span></span>
                </button>
                <button className="dv-export-option" onClick={() => handleExport('pdf')}>
                  📄 <span><strong>PDF</strong> <span style={{fontSize:'0.7rem',opacity:0.6}}>Printable report</span></span>
                </button>
              </div>
            )}
          </div>

          {exportError && (
            <span className="dv-export-err">{exportError}</span>
          )}

          <div className="view-toggle">
            <button className={`view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} title="Grid view"><GridIcon /></button>
            <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} title="List view"><ListIcon /></button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading && !devices.length ? (
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
                onCardClick={() => openDetail(d.device_id || d.id)}
                onEdit={() => openEdit(d)}
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
                    onToggle={handleToggle} onRevoke={() => handleRevoke(d)} actionLoading={actionLoading}
                    onRowClick={() => openDetail(d.device_id || d.id)} onEdit={() => openEdit(d)} />
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

      {editTarget && (
        <UpdateStatusModal device={editTarget} onClose={closeEdit} />
      )}
    </div>
  );
}
