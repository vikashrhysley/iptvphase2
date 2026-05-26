// src/components/Device/DevicePage.js
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDevices,
  updateDeviceStatus,
  revokeDevice,
  clearToast,
} from '../../store/slices/deviceSlice';
import './DevicePage.css';

const PAGE_SIZE = 8;
const STATUS_TABS = ['all', 'active', 'inactive', 'blocked'];

// ── Device type config ────────────────────────────────────
const TYPE_CONFIG = {
  phone:   { icon: '📱', label: 'Phone',   color: '#00d4ff', bg: 'rgba(0,212,255,0.08)',   border: 'rgba(0,212,255,0.2)'   },
  tablet:  { icon: '📟', label: 'Tablet',  color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
  desktop: { icon: '🖥️', label: 'Desktop', color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)'  },
};

// ── Icons ─────────────────────────────────────────────────
const SearchIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const GridIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
const ListIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
const MapPinIcon  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const ClockIcon   = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const AppIcon     = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
const ChevLeft    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;

// ── Helpers ───────────────────────────────────────────────
const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
};

// ── Toast ─────────────────────────────────────────────────
function Toast() {
  const dispatch = useDispatch();
  const { toast } = useSelector(s => s.devices);
  useEffect(() => {
    if (toast) { const t = setTimeout(() => dispatch(clearToast()), 3200); return () => clearTimeout(t); }
  }, [toast, dispatch]);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type === 'success' ? 'success' : 'error'}`}>
      {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────
function Pagination({ current, total, totalItems, onPrev, onNext, onPage }) {
  if (total <= 1) return null;
  const start = (current - 1) * PAGE_SIZE + 1;
  const end   = Math.min(current * PAGE_SIZE, totalItems);
  const pages = Array.from({ length: total }, (_, i) => i + 1)
    .filter(p => p === 1 || p === total || Math.abs(p - current) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('e' + p);
      acc.push(p);
      return acc;
    }, []);
  return (
    <div className="device-pagination">
      <span className="dp-info">Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{totalItems}</strong> devices</span>
      <div className="dp-controls">
        <button className="dp-nav" onClick={onPrev} disabled={current === 1}><ChevLeft /> Previous</button>
        <div className="dp-pages">
          {pages.map((p) =>
            typeof p === 'string'
              ? <span key={p} className="dp-ellipsis">…</span>
              : <button key={p} className={`dp-page${p === current ? ' active' : ''}`} onClick={() => onPage(p)}>{p}</button>
          )}
        </div>
        <button className="dp-nav" onClick={onNext} disabled={current === total}>Next <ChevRight /></button>
      </div>
    </div>
  );
}

// ── Device Card ───────────────────────────────────────────
function DeviceCard({ device, canEdit, onToggle, onRevoke, actionLoading }) {
  const tc   = TYPE_CONFIG[device.type] || TYPE_CONFIG.phone;
  const busy = actionLoading === device.id;

  return (
    <div
      className={`device-card${device.status === 'blocked' ? ' blocked' : ''}`}
      style={{ '--type-color': tc.color, '--type-bg': tc.bg, '--type-border': tc.border }}
    >
      {/* Top row */}
      <div className="dc-top">
        <div className="dc-type-icon">{tc.icon}</div>
        <div className="dc-header">
          <div className="dc-device-name">{device.name}</div>
          <div className="dc-os">{device.os}</div>
        </div>
        <span className={`dc-status ${device.status}`}>
          <span className="dc-status-dot" />
          {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
        </span>
      </div>

      {/* User */}
      <div className="dc-user">
        <div className="dc-user-avatar-fb">{device.userName?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
        <div className="dc-user-info">
          <div className="dc-user-name">{device.userName}</div>
          <div className="dc-user-id">{device.userId} · @{device.username}</div>
        </div>
      </div>

      {/* Meta */}
      <div className="dc-meta">
        <div className="dc-meta-row">
          <span className="dc-meta-key"><MapPinIcon /> Location</span>
          <span className="dc-meta-val">{device.location}</span>
        </div>
        <div className="dc-meta-row">
          <span className="dc-meta-key"><ClockIcon /> Last seen</span>
          <span className="dc-meta-val">{timeAgo(device.lastSeen)}</span>
        </div>
        <div className="dc-meta-row">
          <span className="dc-meta-key"><AppIcon /> App version</span>
          <span className="dc-meta-val" style={{ color: 'var(--accent-primary)' }}>{device.appVersion}</span>
        </div>
        <div className="dc-meta-row">
          <span className="dc-meta-key">Device ID</span>
          <span className="dc-meta-val" style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{device.id}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="dc-actions">
        {!canEdit ? (
          <button className="dc-btn disabled-btn" disabled>No Permission</button>
        ) : device.status === 'blocked' ? (
          <>
            <button className="dc-btn activate" onClick={() => onToggle(device.id, 'active')} disabled={busy}>
              {busy ? '…' : '✓ Restore'}
            </button>
          </>
        ) : (
          <>
            <button
              className={`dc-btn ${device.status === 'active' ? 'deactivate' : 'activate'}`}
              onClick={() => onToggle(device.id, device.status === 'active' ? 'inactive' : 'active')}
              disabled={busy}
            >
              {busy ? '…' : device.status === 'active' ? '○ Deactivate' : '● Activate'}
            </button>
            <button className="dc-btn revoke" onClick={() => onRevoke(device.id)} disabled={busy}>
              {busy ? '…' : '✕ Revoke'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Device Table Row ──────────────────────────────────────
function DeviceTableRow({ device, canEdit, onToggle, onRevoke, actionLoading }) {
  const tc   = TYPE_CONFIG[device.type] || TYPE_CONFIG.phone;
  const busy = actionLoading === device.id;

  return (
    <tr>
      <td>
        <div className="dt-type-cell" style={{ '--type-bg': tc.bg }}>
          <div className="dt-type-icon">{tc.icon}</div>
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.84rem' }}>{device.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{device.os}</div>
          </div>
        </div>
      </td>
      <td>
        <div className="dt-user-cell">
          <div className="dt-user-img-fb">{device.userName?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{device.userName}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{device.username}</div>
          </div>
        </div>
      </td>
      <td>
        <span style={{ fontSize: '0.75rem', background: tc.bg, color: tc.color, padding: '3px 10px', borderRadius: 12, fontWeight: 600, border: `1px solid ${tc.border}` }}>
          {tc.icon} {tc.label}
        </span>
      </td>
      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{device.location}</td>
      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{timeAgo(device.lastSeen)}</td>
      <td>
        <span className={`dc-status ${device.status}`} style={{ fontSize: '0.7rem' }}>
          <span className="dc-status-dot" />
          {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
        </span>
      </td>
      <td>
        {!canEdit ? (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>—</span>
        ) : device.status === 'blocked' ? (
          <button className="dc-btn activate" style={{ flex: 'none', padding: '5px 12px' }} onClick={() => onToggle(device.id, 'active')} disabled={busy}>
            {busy ? '…' : '✓ Restore'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`dc-btn ${device.status === 'active' ? 'deactivate' : 'activate'}`}
              style={{ flex: 'none', padding: '5px 10px', fontSize: '0.72rem' }}
              onClick={() => onToggle(device.id, device.status === 'active' ? 'inactive' : 'active')}
              disabled={busy}
            >
              {busy ? '…' : device.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
            <button className="dc-btn revoke" style={{ flex: 'none', padding: '5px 10px', fontSize: '0.72rem' }} onClick={() => onRevoke(device.id)} disabled={busy}>
              {busy ? '…' : 'Revoke'}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function DevicePage() {
  const dispatch = useDispatch();
  const { devices, loading, actionLoading } = useSelector(s => s.devices);
  const { user: me } = useSelector(s => s.auth);
  const canEdit = me?.role === 'superadmin';

  // All hooks first
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [statusFilter,setStatusFilter]= useState('all');
  const [view,        setView]        = useState('grid'); // 'grid' | 'list'
  const [page,        setPage]        = useState(1);

  useEffect(() => { dispatch(fetchDevices()); }, [dispatch]);

  // Reset page on filter change
  const handleSearch = (v) => { setSearch(v);       setPage(1); };
  const handleType   = (v) => { setTypeFilter(v);   setPage(1); };
  const handleStatus = (v) => { setStatusFilter(v); setPage(1); };

  // Filter chain
  const filtered = devices.filter(d => {
    const matchType   = typeFilter   === 'all' || d.type   === typeFilter;
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || [d.name, d.os, d.userName, d.userId, d.username, d.location, d.id]
      .some(v => v?.toLowerCase().includes(q));
    return matchType && matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Counts for type tabs
  const countByType = (type) => type === 'all' ? devices.length : devices.filter(d => d.type === type).length;

  // Stats
  const stats = {
    total:    devices.length,
    active:   devices.filter(d => d.status === 'active').length,
    inactive: devices.filter(d => d.status === 'inactive').length,
    blocked:  devices.filter(d => d.status === 'blocked').length,
    phone:    devices.filter(d => d.type === 'phone').length,
    tablet:   devices.filter(d => d.type === 'tablet').length,
    desktop:  devices.filter(d => d.type === 'desktop').length,
  };

  const handleToggle = (deviceId, status) => dispatch(updateDeviceStatus({ deviceId, status }));
  const handleRevoke = (deviceId) => {
    if (window.confirm('Revoke access for this device? The user will be logged out immediately.')) {
      dispatch(revokeDevice({ deviceId }));
    }
  };

  return (
    <div className="device-page">
      <Toast />

      {/* ── Stats ── */}
      <div className="device-stats">
        <div className="device-stat-card" style={{ '--dsc': 'var(--accent-primary)' }}>
          <span className="dsc-icon">📱</span>
          <div className="dsc-value">{stats.total}</div>
          <div className="dsc-label">Total Devices</div>
        </div>
        <div className="device-stat-card" style={{ '--dsc': '#10b981' }}>
          <span className="dsc-icon">✅</span>
          <div className="dsc-value">{stats.active}</div>
          <div className="dsc-label">Active</div>
        </div>
        <div className="device-stat-card" style={{ '--dsc': '#f59e0b' }}>
          <span className="dsc-icon">⏸️</span>
          <div className="dsc-value">{stats.inactive}</div>
          <div className="dsc-label">Inactive</div>
        </div>
        <div className="device-stat-card" style={{ '--dsc': '#ef4444' }}>
          <span className="dsc-icon">🚫</span>
          <div className="dsc-value">{stats.blocked}</div>
          <div className="dsc-label">Blocked</div>
        </div>
        <div className="device-stat-card" style={{ '--dsc': '#00d4ff' }}>
          <span className="dsc-icon">📱</span>
          <div className="dsc-value">{stats.phone}</div>
          <div className="dsc-label">Phones</div>
        </div>
        <div className="device-stat-card" style={{ '--dsc': '#7c3aed' }}>
          <span className="dsc-icon">📟</span>
          <div className="dsc-value">{stats.tablet}</div>
          <div className="dsc-label">Tablets</div>
        </div>
        <div className="device-stat-card" style={{ '--dsc': '#10b981' }}>
          <span className="dsc-icon">🖥️</span>
          <div className="dsc-value">{stats.desktop}</div>
          <div className="dsc-label">Desktops</div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="device-toolbar">
        {/* Search */}
        <div className="device-search-wrap">
          <SearchIcon />
          <input
            className="device-search"
            placeholder="Search device, user, location…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {/* Type filter tabs */}
        <div className="filter-tabs">
          {['all', 'phone', 'tablet', 'desktop'].map(t => (
            <button
              key={t}
              className={`filter-tab${typeFilter === t ? ' active' : ''}`}
              onClick={() => handleType(t)}
            >
              {t === 'all' ? '⊞' : TYPE_CONFIG[t].icon}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span className="filter-tab-count">{countByType(t)}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-right">
          {/* Status filter */}
          <select className="status-filter" value={statusFilter} onChange={e => handleStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>

          {/* View toggle */}
          <div className="view-toggle">
            <button className={`view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} title="Grid view"><GridIcon /></button>
            <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} title="List view"><ListIcon /></button>
          </div>

          {/* Refresh */}
          <button
            className="view-btn"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', width: 36, height: 36 }}
            onClick={() => dispatch(fetchDevices())}
            title="Refresh"
          >
            <RefreshIcon />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="device-loading">
          <div className="device-loading-spinner" />
          Loading devices…
        </div>
      ) : filtered.length === 0 ? (
        <div className="device-empty">
          <span className="device-empty-icon">📭</span>
          No devices match your filters.
        </div>
      ) : view === 'grid' ? (
        <>
          <div className="device-grid">
            {paginated.map(d => (
              <DeviceCard
                key={d.id}
                device={d}
                canEdit={canEdit}
                onToggle={handleToggle}
                onRevoke={handleRevoke}
                actionLoading={actionLoading}
              />
            ))}
          </div>
          <Pagination
            current={page} total={totalPages} totalItems={filtered.length}
            onPrev={() => setPage(p => Math.max(1, p - 1))}
            onNext={() => setPage(p => Math.min(totalPages, p + 1))}
            onPage={setPage}
          />
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
                {paginated.map(d => (
                  <DeviceTableRow
                    key={d.id}
                    device={d}
                    canEdit={canEdit}
                    onToggle={handleToggle}
                    onRevoke={handleRevoke}
                    actionLoading={actionLoading}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            current={page} total={totalPages} totalItems={filtered.length}
            onPrev={() => setPage(p => Math.max(1, p - 1))}
            onNext={() => setPage(p => Math.min(totalPages, p + 1))}
            onPage={setPage}
          />
        </div>
      )}
    </div>
  );
}
