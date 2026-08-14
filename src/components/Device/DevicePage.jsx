import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  fetchDevices, fetchDeviceStats,
  clearToast, setDeviceFilters, clearDeviceFilters, clearDeviceDetail,
  invalidateDevices, patchDeviceInList,
} from '../../store/slices/deviceSlice';
import { apiFetchAdminDevices, apiBlockDevice, apiUnblockDevice } from '../../services/api';
import DeviceDetail from './DeviceDetail';
import './DevicePage.css';

/* ── Icons ─────────────────────────────────────────────── */
const SearchIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const CopyIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;

// Copy any table-cell value to the clipboard without triggering the row's own click (opens
// the device detail) — every copy button stops propagation before writing.
const copyToClipboard = (e, text) => {
  e.stopPropagation();
  if (!text || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => toast.success('Email copied')).catch(() => {});
};
const ChevLeft    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;

/* ── Device status → chip/button helpers ────────────────── */
// device.status vocabulary (7 values, Devices Rework build guide §2.1). 'retired' was renamed
// to 'recovery_device'; account deletion now DETACHES the device (status returns to 'normal')
// instead of setting 'deleted' — that value only remains on legacy/historical rows.
// STATE (this) and PRESENCE (online-now) are different axes — never conflate them.
// Labels per Admin Devices List build guide §3d — must match STATUS_FILTERS/STATUS_LABELS/
// STATUS_BAR_ROWS exactly, since the same statuses are named all over this page.
const STATUS_MAP = {
  normal:             { label: 'Active',         cls: 'in-service' },   // green
  auto_blocked:       { label: 'Auto-blocked',   cls: 'auto-blocked' }, // amber (user can clear)
  admin_blocked:      { label: 'Admin-blocked',  cls: 'blocked' },      // red
  risk_score_blocked: { label: 'Risk-blocked',   cls: 'blocked' },      // red
  admin_released:     { label: 'Released',       cls: 'out-service' },  // grey
  recovery_device:    { label: 'Recovery',       cls: 'out-service' },  // grey
  // Legacy only — excluded from new /admin/devices rows, but kept as a non-crashing fallback.
  deleted:            { label: 'Deleted',        cls: 'out-service' },  // grey
};
// The three blocked states are the only ones with an Unblock action.
const isBlockedStatus = (s) => {
  const v = String(s || '').toLowerCase();
  return v === 'admin_blocked' || v === 'auto_blocked' || v === 'risk_score_blocked';
};
// The "out of service" family: finished, not blocked — no unblock, the user re-enrols.
const isOutOfService = (s) => {
  const v = String(s || '').toLowerCase();
  return v === 'recovery_device' || v === 'admin_released' || v === 'deleted';
};
const dispStatusKey = (s) => STATUS_MAP[String(s || '').toLowerCase()]?.cls || 'unknown';
const dispStatusLabel = (s) => {
  const v = String(s || '').toLowerCase();
  if (STATUS_MAP[v]) return STATUS_MAP[v].label;
  return v ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ') : '—';
};

// The single access-control button, driven entirely by device.status.
function DeviceAccessButton({ device, busy, onBlock, onUnblock, compact }) {
  const v = String(device.status || '').toLowerCase();
  const style = compact ? { padding: '5px 12px', fontSize: '0.72rem' } : undefined;
  if (isOutOfService(v)) return null;   // recovery / released / deleted → no action; user re-enrols
  if (isBlockedStatus(v)) {
    return (
      <button className="dc-btn unblock" style={style} onClick={() => onUnblock(device)} disabled={busy}>
        {busy ? '…' : '✔ Unblock'}
      </button>
    );
  }
  // normal (and any unknown routine state) → Block
  return (
    <button className="dc-btn block" style={style} onClick={() => onBlock(device)} disabled={busy}>
      {busy ? '…' : '⛔ Block'}
    </button>
  );
}

/* ── Block / Unblock confirm dialog ─────────────────────── */
function AccessDialog({ device, mode, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const isBlock = mode === 'block';
  const name = device.device_brand
    ? `${device.device_brand} ${device.device_model || ''}`.trim()
    : (device.device_name || device.name || 'this device');
  const submit = (e) => { e.preventDefault(); onConfirm(reason.trim()); };

  return (
    <div className="rv-overlay" onClick={e => e.target === e.currentTarget && !busy && onClose()}>
      <form className="rv-modal" onSubmit={submit}>
        <div className="rv-title">{isBlock ? '⛔ Block Device' : '✔ Unblock Device'}</div>
        <p className="rv-sub">{isBlock ? <>Block <strong>{name}</strong>.</> : <>Unblock <strong>{name}</strong>.</>}</p>
        {isBlock ? (
          <ul className="rv-list">
            <li>This device is <strong>signed out immediately</strong> and cannot stream.</li>
            <li>Its MAC seat is freed, so another of the user's devices can take it.</li>
            <li>The user's account, licence and <strong>other devices are NOT affected</strong>.</li>
            <li>The device cannot re-enrol until an admin unblocks it.</li>
          </ul>
        ) : (
          <ul className="rv-list">
            <li>The device comes back <strong>signed out</strong> — the user has to sign in again. This restores eligibility, not a live session.</li>
            <li>Its risk score is reset to 0 and any open risk events are resolved.</li>
            <li>If its MAC seat was taken by another device since it was blocked, unblocking alone will not restore streaming.</li>
          </ul>
        )}

        <div className="rv-field">
          <label>Reason <span className="rv-required">*</span></label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={isBlock ? 'e.g. Suspicious activity from multiple IPs' : 'e.g. Reviewed — false positive'}
            rows={3}
            disabled={busy}
            autoFocus
          />
        </div>

        <div className="rv-actions">
          <button type="button" className="rv-cancel" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={`rv-confirm${isBlock ? ' rv-danger' : ' rv-primary'}`} disabled={busy || !reason.trim()}>
            {busy ? '…' : (isBlock ? '⛔ Block device' : '✔ Unblock device')}
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

// Status dropdown — the STATE axis. active/inactive were REMOVED (they now match nothing and
// return an empty list, pinned by a backend test — Devices Rework build guide §3.1); every
// value here is a real ?status= bucket the backend recognises. 'in_service' is still accepted
// as a legacy alias of 'active' server-side, but we only ever send the current value.
const STATUS_FILTERS = [
  { value: '',                   label: 'All statuses' },
  { value: 'normal',             label: 'Active' },
  { value: 'auto_blocked',       label: 'Auto-blocked' },
  { value: 'admin_blocked',      label: 'Admin-blocked' },
  { value: 'risk_score_blocked', label: 'Risk-blocked' },
  { value: 'recovery_device',    label: 'Recovery' },
  { value: 'admin_released',     label: 'Released' },
  { value: 'deleted',            label: 'Deleted' },
  { value: 'blocked',            label: 'Blocked (all)' },
  { value: 'out_of_service',     label: 'Out of service' },
];

// Human labels for every clickable ?status= bucket (status + roll-ups + in-use + signals),
// used by the active-filter chip so a filter set from a card click still reads clearly.
const STATUS_LABELS = {
  normal: 'Active', auto_blocked: 'Auto-blocked', admin_blocked: 'Admin-blocked',
  risk_score_blocked: 'Risk-blocked', recovery_device: 'Recovery', admin_released: 'Released',
  deleted: 'Deleted', blocked: 'Blocked', out_of_service: 'Out of service',
  online_now: 'Online now', logged_in_idle: 'Idle', logged_out: 'Signed out',
  never_heartbeat: 'Never checked in', high_risk: 'High risk', push_enabled: 'Push enabled',
  new_enrollments_24h: 'New (24h)', new_enrollments_7d: 'New (7d)',
};

/* ── Devices-page stat-card row definitions (from GET /admin/devices/stats) ── */
// Card A — DEVICE STATUS. Six by_status buckets, mutually exclusive, always sum to stats.total
// (Device Center Stats Cards build guide §4). `deleted` is GONE from the response entirely —
// self-delete now returns a device to `normal` instead — so there is no row for it any more,
// not even a permanent 0. Every remaining key equals the row's own ?status= filter value.
const STATUS_BAR_ROWS = [
  { key: 'normal', label: 'Active Device', tone: 'good', status: 'normal' },
  {
    key: 'recovery_device', label: 'Recovery Device', tone: 'muted', status: 'recovery_device',
    tipTitle: 'Counts as recovery', tipItems: ['Factory Reset', 'Damage Device', 'Replace Device', 'Lost Device'],
  },
  {
    key: 'auto_blocked', label: 'Auto-blocked Device', tone: 'warn', status: 'auto_blocked',
    tipTitle: 'Counts as auto-blocked', tipItems: ['Missed Heartbeat'],
  },
  { key: 'admin_blocked',      label: 'Admin-blocked Device', tone: 'bad', status: 'admin_blocked' },
  { key: 'risk_score_blocked', label: 'Risk-blocked Device',  tone: 'bad', status: 'risk_score_blocked' },
  { key: 'admin_released',     label: 'Released Device',      tone: 'muted', status: 'admin_released' },
];
// Card C — NEEDS ATTENTION. Signals overlap each other and the partition — tiles, no total bar.
const SIGNAL_TILE_ROWS = [
  { key: 'never_heartbeat',     label: 'Never checked in', icon: '📡', color: '#fbbf24', status: 'never_heartbeat' },
  { key: 'high_risk_devices',   label: 'High risk',        icon: '⚠️', color: '#f87171', status: 'high_risk' },
  { key: 'push_enabled',        label: 'Push enabled',     icon: '🔔', color: '#8b5cf6', status: 'push_enabled' },
  { key: 'new_enrollments_24h', label: 'New (24h)',        icon: '✨', color: '#00d4ff', status: 'new_enrollments_24h' },
  { key: 'new_enrollments_7d',  label: 'New (7d)',         icon: '🆕', color: '#34d399', status: 'new_enrollments_7d' },
];

// A filled circle with a bold "i" glyph reads far more clearly than a stroked SVG at 14–16px.
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="8" cy="8" r="8" opacity="0.18" />
    <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <rect x="7.1" y="6.7" width="1.8" height="5.3" rx="0.9" />
    <circle cx="8" cy="4.3" r="1.05" />
  </svg>
);

// A small info icon whose styled popover lists what counts as this status — e.g. "Recovery
// Device" / "Auto-blocked Device". Pure-CSS hover/focus (:hover, :focus-within) rather than
// JS-computed positioning: no rect math, no fixed-position containing-block edge cases,
// nothing that can silently fail. `tabIndex` makes it reachable via keyboard, not just hover.
function DeviceInfoTip({ title = 'Counts as', items }) {
  return (
    <span className="dv-bar-info" onClick={(e) => e.stopPropagation()} tabIndex={0}>
      <InfoIcon />
      <span className="dv-bar-info-pop" role="tooltip">
        <span className="dv-bar-info-pop-title">{title}</span>
        <span className="dv-bar-info-pop-list">
          {items.map((item) => <span key={item} className="dv-bar-info-pop-item">{item}</span>)}
        </span>
      </span>
    </span>
  );
}

// One horizontal bar for the status / in-use cards. Clickable → filters the list below.
// `tipItems`, when present, adds a small info icon next to the label whose own hover
// (independent of the row's `tip`/title) shows a short list — e.g. what counts as "Recovery".
// `level` indents a row under its parent (e.g. Online now / Idle under Logged in) — the
// indentation itself is what tells the admin it's a breakdown OF the parent, not a sibling
// (Device Center Stats Cards build guide §3). A row with no `onClick` (the Logged in parent —
// there's no single ?status= bucket for a roll-up) renders as an inert div, not a button, so it
// doesn't invite a click that would do nothing.
function DeviceStatBar({ label, value, total, tone, tip, tipTitle, tipItems, level = 0, onClick }) {
  const pct = total > 0 && value > 0 ? Math.max((value / total) * 100, value > 0 ? 1.5 : 0) : 0;
  const cls = `dv-bar-row${level > 0 ? ` lvl-${level}` : ''}`;
  const content = (
    <>
      <span className="dv-bar-label">
        <span className="dv-bar-label-text">{label}</span>
        {tipItems?.length > 0 && <DeviceInfoTip title={tipTitle} items={tipItems} />}
      </span>
      <span className="dv-bar-track">
        <span className={`dv-bar-fill tone-${tone}`} style={{ width: `${pct}%`, minWidth: value > 0 ? 3 : 0 }} />
      </span>
      <span className="dv-bar-value">{Number(value || 0).toLocaleString()}</span>
    </>
  );
  if (!onClick) {
    return <div className={`${cls} dv-bar-row-static`}>{content}</div>;
  }
  return (
    <button type="button" className={cls} onClick={onClick} title={tip ? `${label} — ${tip}` : `Filter to ${label}`}>
      {content}
    </button>
  );
}

// A full card of bars (status partition or in-use), with a reconciling headline.
function DeviceBarCard({ title, icon, headlineLabel, total, rows, source, sort, onFilter }) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  let items = rows.map((r) => ({ ...r, value: num(source?.[r.key]) }));
  if (sort) items = [...items].sort((a, b) => b.value - a.value);
  return (
    <div className="device-stats-panel dv-bar-card">
      <div className="dsp-title"><span className="dsp-title-icon">{icon}</span> {title}</div>
      <div className="dv-bar-headline">
        <strong>{num(total).toLocaleString()}</strong>
        <span>{headlineLabel}</span>
      </div>
      <div className="dv-bar-list">
        {items.map((r) => (
          <DeviceStatBar key={r.key} label={r.label} value={r.value} total={num(total)} tone={r.tone} tip={r.tip}
            tipTitle={r.tipTitle} tipItems={r.tipItems} level={r.level} onClick={() => onFilter(r.status)} />
        ))}
      </div>
    </div>
  );
}

/* ── Mobile-only swipe carousel (Device Status ↔ Platform Stats) ──────────
   Scroll-snap does the actual swiping; the dots just mirror scroll position
   (rAF-throttled so it doesn't fire a state update per pixel). */
function DeviceSwipeCards({ slides }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const frame = useRef(null);

  const handleScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const el = trackRef.current;
      if (!el || !el.clientWidth) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActive((prev) => (prev === idx ? prev : idx));
    });
  };

  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);

  const goTo = (idx) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="device-swipe-group">
      <div className="device-swipe-track" ref={trackRef} onScroll={handleScroll}>
        {slides.map((s) => (
          <div className="device-swipe-slide" key={s.key}>{s.node}</div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="device-swipe-dots">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={`device-swipe-dot${i === active ? ' active' : ''}`}
              aria-label={`Show ${s.key} card`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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

/* ── Device Table Row ───────────────────────────────────── */
// Columns per the Admin Devices List build guide §2/§3 — the row is trimmed to exactly 13
// fields. Device / Registered by / Current user / Device Status / Activity / Risk Score /
// Last Seen / App Version / Location / Actions. Platform is icon selection ONLY (never
// printed as text, §3a) and LIC is gone entirely (§3j — no license data is fetched per row
// any more). `last_active_display` and `location_display` are pre-formatted by the API —
// never re-derived here (§3g, §3i).
const USAGE_META = {
  online_now:     { label: 'Online now', cls: 'online' },
  logged_in_idle: { label: 'Idle',       cls: 'idle' },
  logged_out:     { label: 'Signed out', cls: 'out' },
};
const riskClass = (score) => (score >= 90 ? 'crit' : score >= 70 ? 'high' : 'ok');

// Icon selection only (§3a) — device_type/device_brand/device_model are no longer sent, so the
// row icon is picked from `platform` alone now, not the device-type filter's TYPE_CONFIG.
const PLATFORM_ICON_META = {
  android: { icon: '🤖', bg: 'rgba(61,220,132,0.1)' },
  roku:    { icon: '📺', bg: 'rgba(167,139,250,0.1)' },
  samsung: { icon: '📺', bg: 'rgba(0,180,216,0.1)' },
  lg:      { icon: '📺', bg: 'rgba(255,153,0,0.1)' },
};
const DEFAULT_PLATFORM_ICON = { icon: '📦', bg: 'rgba(100,116,139,0.1)' };

function DeviceTableRow({ device, canEdit, actionLoading, onRowClick, onBlock, onUnblock }) {
  const id   = device.device_id || device.id;
  const busy = actionLoading === id;
  const pIcon = PLATFORM_ICON_META[device.platform] || DEFAULT_PLATFORM_ICON;

  // Device name: device_name, else "Device" (no brand/model/platform label sent to fall back
  // through any more — platform is icon-only, §3a).
  const name = device.device_name || 'Device';
  const os = device.os_version || '—';

  const usage = USAGE_META[device.usage_state];
  const risk  = device.risk_score ?? 0;

  // Copy button only makes sense when there's an actual email to copy.
  const emailCell = (email) => email ? (
    <div className="dt-owner">
      <span>{email}</span>
      <button type="button" className="dt-copy-btn" onClick={(e) => copyToClipboard(e, email)} title="Copy email">
        <CopyIcon />
      </button>
    </div>
  ) : <span className="dt-owner-none">—</span>;

  return (
    <tr className="dt-row" onClick={onRowClick} style={{ cursor: 'pointer' }}>
      <td>
        <div className="dt-type-cell" style={{ '--type-bg': pIcon.bg }}>
          <div className="dt-type-icon">{pIcon.icon}</div>
          <div>
            <div className="dt-device-name">{name}</div>
            <div className="dt-device-os">{os}</div>
          </div>
        </div>
      </td>
      {/* Registered by — who ENROLLED the hardware, permanent, present even when nobody
          currently owns the account. Never the same question as Current user (§1, §3b). */}
      <td>{emailCell(device.registered_email)}</td>
      {/* Current user — who is logged in RIGHT NOW. "—" means nobody is, NOT "no owner" — do
          not fall back to registered_email here, that would misrepresent an idle device as
          having an active session (§3c). */}
      <td>{emailCell(device.current_user_email)}</td>
      <td>
        <span className={`dc-status ${dispStatusKey(device.status)}`} style={{ fontSize: '0.7rem' }}>
          <span className="dc-status-dot" />
          {dispStatusLabel(device.status)}
        </span>
      </td>
      <td>
        {usage
          ? <span className={`dt-usage-pill ${usage.cls}`}>{usage.label}</span>
          : <span className="dt-usage-none">—</span>}
      </td>
      <td><span className={`dt-risk ${riskClass(risk)}`}>{risk}</span></td>
      <td className="dt-lastseen" title={device.last_active_at || undefined}>{device.last_active_display || '—'}</td>
      <td className="dt-appver">{device.app_version || '—'}</td>
      <td className="dt-location">{device.location_display || '—'}</td>
      <td onClick={e => e.stopPropagation()}>
        <div className="dt-actions">
          <button type="button" className="dt-view-btn" onClick={onRowClick}>View</button>
          {canEdit && <DeviceAccessButton device={device} busy={busy} onBlock={onBlock} onUnblock={onUnblock} compact />}
        </div>
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

  const [detailId,      setDetailId]     = useState(
    () => sessionStorage.getItem('deviceDetailId') || null
  );
  const [accessTarget,  setAccessTarget] = useState(null); // { device, mode: 'block' | 'unblock' }
  const [accessBusy,    setAccessBusy]   = useState(false);
  const [exportOpen,    setExportOpen]   = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError,   setExportError]   = useState(null);
  const exportRef = useRef(null);

  // All hooks before any conditional return

  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debounceRef = useRef(null);
  const totalPages  = Math.max(1, Math.ceil(total / (pageSize || 20)));

  /* All hooks first */
  // Single source of truth for all three stat cards — total, by_status and usage are all on
  // this one response now (Device Center Stats Cards build guide §2), so there's nothing else
  // to fetch for them.
  useEffect(() => { dispatch(fetchDeviceStats()); }, [dispatch]);

  // Click a card bucket → filter the list below in place (pass the ?status= value straight through).
  const applyStatusFilter = (status) => dispatch(setDeviceFilters({ status, current_session: false, page: 1 }));
  const clearStatusFilter = () => dispatch(setDeviceFilters({ status: '', current_session: false, page: 1 }));

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

  // A stale sessionStorage ID restored after a refresh silently falls back to the list when its
  // fetch fails. A device the admin just CLICKED must not — it should open and show any error
  // in the detail view. (Auto-bouncing every click, via a stale detailError captured in this
  // effect's closure, is what made the detail page look like it "won't open".)
  const restoredIdRef = useRef(sessionStorage.getItem('deviceDetailId') || null);
  useEffect(() => {
    if (detailId && detailId === restoredIdRef.current && detailError) {
      sessionStorage.removeItem('deviceDetailId');
      dispatch(clearDeviceDetail());
      setDetailId(null);
      restoredIdRef.current = null;
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
    // A user-clicked device is never the "stale restore" case — clear the ref so its detail
    // fetch is never auto-bounced back to the list.
    restoredIdRef.current = null;
    sessionStorage.setItem('deviceDetailId', id);
    setDetailId(id);
  };
  const closeDetail = () => {
    sessionStorage.removeItem('deviceDetailId');
    setDetailId(null);
  };

  // Re-fetch the current device list. Invalidate first so the 30s cache guard on
  // fetchDevices doesn't skip the refetch right after a block/unblock.
  const refreshDevices = () => {
    dispatch(invalidateDevices());
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

  // ── Block / Unblock ──────────────────────────────────────
  const openBlock   = (device) => setAccessTarget({ device, mode: 'block' });
  const openUnblock = (device) => setAccessTarget({ device, mode: 'unblock' });
  const closeAccess = () => { if (!accessBusy) setAccessTarget(null); };

  const amberStyle = { border: '1px solid rgba(251,191,36,0.5)', color: '#fbbf24', maxWidth: 460 };

  // Block. When fully_enforced is false the device IS blocked but a cut-off step failed —
  // warn (amber, verbatim message + warnings) and offer to re-issue the same block call.
  const runBlock = async (device, reason) => {
    const id = device.device_id || device.id;
    const data = await apiBlockDevice(accessToken, id, reason);
    // Instant table update; the refetch below reconciles with the server.
    dispatch(patchDeviceInList({ deviceId: id, changes: { status: data.new_status || 'admin_blocked', is_logged_in: data.is_logged_in ?? false } }));
    if (data.fully_enforced === false) {
      const warns = Array.isArray(data.warnings) ? data.warnings : [];
      toast((t) => (
        <div className="dv-warn-toast">
          <strong>{data.message || 'Device blocked, but enforcement is incomplete.'}</strong>
          {warns.length > 0 && <ul>{warns.map((w, i) => <li key={i}>{w}</li>)}</ul>}
          <button
            type="button"
            className="dv-warn-retry"
            onClick={() => { toast.dismiss(t.id); runBlock(device, reason).then(refreshDevices).catch(handleAccessError); }}
          >
            Retry enforcement
          </button>
        </div>
      ), { duration: 12000, style: amberStyle });
    } else {
      toast.success(data.message || 'Device blocked. Session terminated.');
    }
  };

  // Unblock (routine/auto). seat_available === false ⇒ unblocked, but the seat is gone —
  // amber warning that streaming stays unavailable until one frees up.
  const runUnblock = async (device, reason) => {
    const id = device.device_id || device.id;
    const data = await apiUnblockDevice(accessToken, id, reason);
    dispatch(patchDeviceInList({ deviceId: id, changes: { status: data.new_status || 'normal', is_logged_in: data.is_logged_in ?? false } }));
    if (data.seat_available === false) {
      toast(data.message || 'Device unblocked, but no free seat — streaming stays unavailable until one frees up.',
        { icon: '⚠️', duration: 9000, style: amberStyle });
    } else {
      toast.success(data.message || 'Device unblocked. It must log in again.');
    }
  };

  // 400 (already/not blocked, or risk ≥ 90 → superadmin route) and 404 are informational and
  // want a card refresh; anything else is a hard error.
  const handleAccessError = (err) => {
    if (err.status === 400 || err.status === 404) {
      toast(err.message || (err.status === 404 ? 'Device not found — refreshing the list.' : 'Action not allowed in the current state.'),
        { icon: 'ℹ️', duration: 7000 });
      refreshDevices();
    } else {
      toast.error(err.message || 'Action failed.');
    }
  };

  const doAccess = async (reason) => {
    if (!accessTarget) return;
    const { device, mode } = accessTarget;
    setAccessBusy(true);
    try {
      if (mode === 'block') await runBlock(device, reason);
      else                  await runUnblock(device, reason);
      setAccessTarget(null);
      refreshDevices();
      dispatch(fetchDeviceStats());
    } catch (err) {
      setAccessTarget(null);
      handleAccessError(err);
    } finally {
      setAccessBusy(false);
    }
  };

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

  /* Stats cards — all three now read from the single GET /admin/devices/stats response
     (Device Center Stats Cards build guide §2): stats.stats for Device Status + Active
     Devices, stats.platform_breakdown for Platform Stats. No client-side reconciliation —
     the backend guarantees stats.total == sum(by_status) and by_status.normal ==
     usage.logged_in.total + usage.logged_out. */
  const st       = stats?.stats ?? {};
  const byStatus = st.by_status ?? {};
  const usage    = st.usage ?? {};
  const loggedIn = usage.logged_in ?? {};
  const totalCount  = st.total ?? 0;
  const normalCount = byStatus.normal ?? 0;
  const PB = stats?.platform_breakdown ?? {};

  if (import.meta.env.DEV && stats) {
    const statusSum = STATUS_BAR_ROWS.reduce((sum, r) => sum + Number(byStatus[r.key] ?? 0), 0);
    console.assert(statusSum === totalCount, `[Devices] by_status sum (${statusSum}) != stats.total (${totalCount})`);
    const usageSum = Number(loggedIn.total ?? 0) + Number(usage.logged_out ?? 0);
    console.assert(usageSum === normalCount, `[Devices] usage.logged_in.total + usage.logged_out (${usageSum}) != by_status.normal (${normalCount})`);
  }

  // Fixed 7-key platform breakdown (Devices Rework build guide §3.3). Only Android is split by
  // device_type (Tizen TVs misreport device_type="android_tv" and Roku is inconsistent, so
  // device_type is only trustworthy within Android) — platform decides the bucket everywhere
  // else. Keys are always rendered, even at 0, in this exact declared order.
  const PLATFORM_META = {
    android_tv:      { label: 'Android TV',        color: '#10b981', icon: '📺' },
    android_mobile:  { label: 'Android Mobile',    color: '#3ddc84', icon: '📱' },
    android_unknown: { label: 'Android (unknown)', color: '#64748b', icon: '❔' },
    roku:            { label: 'Roku',              color: '#a78bfa', icon: '📺' },
    samsung:         { label: 'Samsung (Tizen)',   color: '#00b4d8', icon: '📺' },
    lg:              { label: 'LG (webOS)',        color: '#ff9900', icon: '📺' },
    unknown:         { label: 'Unknown',           color: '#475569', icon: '🧩' },
  };
  const platformStatItems = Object.keys(PLATFORM_META).map((key) => ({
    key, value: PB[key] ?? 0, ...PLATFORM_META[key],
  }));

  // Card A — DEVICE STATUS (6 bars, reconciles to stats.total)
  const deviceStatusCard = (
    <DeviceBarCard
      title="Device Status" icon="📊"
      headlineLabel="Total Devices" total={totalCount}
      rows={STATUS_BAR_ROWS} source={byStatus} sort
      onFilter={applyStatusFilter}
    />
  );

  // Card B — ACTIVE DEVICES (IN SERVICE RIGHT NOW). Two-level tree, not three flat siblings
  // (build guide §3): Logged in is a parent row with its own count; Online now / Idle are its
  // children, indented; Logged out is a sibling of Logged in, not nested under it. The headline
  // (by_status.normal) is the SAME field as the Device Status card's Active Device row.
  const inUseCard = (
    <div className="device-stats-panel dv-bar-card">
      <div className="dsp-title"><span className="dsp-title-icon">🟢</span> Active Devices (In Service Right Now)</div>
      <div className="dv-bar-headline">
        <strong>{normalCount.toLocaleString()}</strong>
        <span>In service</span>
      </div>
      <div className="dv-bar-list">
        {/* No single ?status= bucket represents "logged in" as a whole — it's online_now + idle
            — so this row has no onClick and renders as an inert div (see DeviceStatBar). */}
        <DeviceStatBar label="Logged in" value={loggedIn.total} total={normalCount} tone="good" />
        <DeviceStatBar label="Online now" value={loggedIn.online_now} total={loggedIn.total} tone="good" level={1}
          tip="Heartbeat within the last few minutes — genuinely in use right now"
          onClick={() => applyStatusFilter('online_now')} />
        <DeviceStatBar label="Idle" value={loggedIn.idle} total={loggedIn.total} tone="warn" level={1}
          tip="Session open but heartbeat stale or missing — not proof of current use"
          onClick={() => applyStatusFilter('logged_in_idle')} />
        <DeviceStatBar label="Logged out" value={usage.logged_out} total={normalCount} tone="muted"
          tip="No session — resting state after logout"
          onClick={() => applyStatusFilter('logged_out')} />
      </div>
    </div>
  );

  // Platform Stats — unchanged content
  const platformStatsPanel = (
    <div className="device-stats-panel">
      <div className="dsp-title"><span className="dsp-title-icon">🌐</span> Platform Stats</div>
      <div className="dsp-grid">
        {platformStatItems.map(({ key, label, value, color, icon }) => (
          <div className="dsp-item" key={key} style={{ '--dsc': color }}>
            <div className="dsp-icon">{icon}</div>
            <div className="dsp-info">
              <div className="dsp-value">{value.toLocaleString()}</div>
              <div className="dsp-label">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="device-page">
      <Toast />

      {/* ── Stats ── */}
      {statsLoading && !stats && <div className="device-stats-shimmer" />}
      {(stats || !statsLoading) && (
        <>
          {/* Desktop / tablet — three cards side by side, same order as the mobile swipe. */}
          <div className="device-stats device-stats-3 device-stats-desktop">
            {platformStatsPanel}
            {inUseCard}
            {deviceStatusCard}
          </div>

          {/* Mobile (≤900px) — all three cards swipe together, in this order. */}
          <div className="device-stats-mobile">
            <DeviceSwipeCards slides={[
              { key: 'platform', node: platformStatsPanel },
              { key: 'inuse', node: inUseCard },
              { key: 'status', node: deviceStatusCard },
            ]} />
          </div>
        </>
      )}

      {/* ── Toolbar: row 1 = tabs + export · row 2 = search + status filter ── */}
      <div className="device-toolbar">
        <div className="device-toolbar-row">
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

          {/* Right: export */}
          <div className="toolbar-export">
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
          </div>
        </div>

        {/* Row 2: search + status filter */}
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
            value={STATUS_FILTERS.some(f => f.value === filters.status) ? filters.status : ''}
            onChange={e => dispatch(setDeviceFilters({ status: e.target.value, current_session: false, page: 1 }))}
          >
            {STATUS_FILTERS.map(f => (
              <option key={f.value || 'all'} value={f.value}>{f.label}</option>
            ))}
          </select>

          {/* Active filter chip — shows any status set from a card click, with a clear (x) */}
          {filters.status && (
            <span className="dv-filter-chip">
              {STATUS_LABELS[filters.status] || filters.status}
              <button type="button" className="dv-filter-chip-x" onClick={clearStatusFilter} title="Clear filter">✕</button>
            </span>
          )}
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
      ) : (
        <div className="device-table-wrap">
          <div style={{ overflowX: 'auto' }}>
            <table className="device-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Registered by</th>
                  <th>Current user</th>
                  <th>Device Status</th>
                  <th>Activity</th>
                  <th>Risk Score</th>
                  <th>Last Seen</th>
                  <th>App Version</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <DeviceTableRow key={d.device_id || d.id} device={d} canEdit={canEdit}
                    actionLoading={accessBusy ? (accessTarget?.device?.device_id || accessTarget?.device?.id) : null}
                    onRowClick={() => openDetail(d.device_id || d.id)} onBlock={openBlock} onUnblock={openUnblock} />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination current={page} totalPages={totalPages} totalItems={total} pageSize={pageSize}
            onPage={p => dispatch(setDeviceFilters({ page: p }))} />
        </div>
      )}

      {accessTarget && (
        <AccessDialog
          device={accessTarget.device}
          mode={accessTarget.mode}
          busy={accessBusy}
          onClose={closeAccess}
          onConfirm={doAccess}
        />
      )}
    </div>
  );
}
