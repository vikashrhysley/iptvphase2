import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchRiskDashboard, fetchRiskDevices, fetchDeviceRisk, fetchDeviceRiskHistory,
  setDays, setDeviceFilters, clearDeviceFilters, clearDeviceRisk, postRiskOverride,
} from '../../store/slices/riskSlice';
import './RiskPage.css';

/* ── Icons ──────────────────────────────────────────────── */
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const AlertTriangleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const MonitorIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const RiskyIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const HighRiskIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const SuspendIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10"/>
    <line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>
  </svg>
);
const BlockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);
const ChevLeft  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;
const CloseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

/* ── Risk level config ──────────────────────────────────── */
const LEVEL_META = {
  SAFE:     { label: 'Safe',     color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)'  },
  MONITOR:  { label: 'Monitor',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)'  },
  HIGH:     { label: 'High',     color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)'  },
  CRITICAL: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)'   },
};

const scoreColor = (score) => {
  if (score >= 85) return '#ef4444';
  if (score >= 70) return '#f97316';
  if (score >= 50) return '#f59e0b';
  return '#10b981';
};

const statusColor = (status) => {
  const map = { active: '#10b981', inactive: '#8fa3c0', suspended: '#f59e0b', blocked: '#ef4444', replaced: '#8b5cf6' };
  return map[status] || '#8fa3c0';
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

/* ── Trend bar chart (inline SVG) ───────────────────────── */
function TrendChart({ trend }) {
  if (!trend || trend.length === 0) {
    return <div className="re-no-trend">No trend data for this window.</div>;
  }
  const max = Math.max(...trend.map(t => t.total_events), 1);
  const W = 600, H = 120, PAD_L = 32, PAD_B = 28, PAD_T = 10, PAD_R = 8;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_B - PAD_T;
  const barW = Math.max(4, Math.floor(chartW / trend.length) - 2);
  const step = chartW / trend.length;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ pct: f, val: Math.round(max * f) }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="re-trend-svg" preserveAspectRatio="xMidYMid meet">
      {yTicks.map(({ pct, val }) => {
        const y = PAD_T + chartH * (1 - pct);
        return (
          <g key={pct}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">{val}</text>
          </g>
        );
      })}
      {trend.map((t, i) => {
        const barH = Math.max(2, (t.total_events / max) * chartH);
        const x = PAD_L + i * step + (step - barW) / 2;
        const y = PAD_T + chartH - barH;
        const isLast = i === trend.length - 1;
        return (
          <g key={t.date}>
            <rect x={x} y={y} width={barW} height={barH} rx="2"
              fill={t.total_events > max * 0.7 ? '#ef4444' : t.total_events > max * 0.4 ? '#f59e0b' : 'var(--accent-primary)'}
              opacity="0.85"
            />
            {(i % Math.ceil(trend.length / 8) === 0 || isLast) && (
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="8" fill="var(--text-muted)">
                {t.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
      <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + chartH} y2={PAD_T + chartH} stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
    </svg>
  );
}

/* ── Stat card ───────────────────────────────────────────── */
function StatCard({ icon, label, value, accent, note }) {
  return (
    <div className={`re-stat-card re-stat-${accent}`}>
      <div className="re-stat-icon">{icon}</div>
      <div className="re-stat-body">
        <div className="re-stat-value">{value ?? '—'}</div>
        <div className="re-stat-label">{label}</div>
        {note && <div className="re-stat-note">{note}</div>}
      </div>
    </div>
  );
}

/* ── Factor row ─────────────────────────────────────────── */
function FactorRow({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="re-factor-row">
      <div className="re-factor-label">{label}</div>
      <div className="re-factor-bar-wrap">
        <div className="re-factor-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="re-factor-count">{value ?? 0}</div>
    </div>
  );
}

/* ── Risk flags chips ───────────────────────────────────── */
function RiskFlagsCell({ flags }) {
  if (!flags || typeof flags !== 'object') return <span className="re-td-muted">none</span>;
  const active = Object.entries(flags).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' '));
  if (active.length === 0) return <span className="re-td-muted">none</span>;
  return (
    <div className="re-flags-wrap">
      {active.map(f => <span key={f} className="re-flag-chip">{f}</span>)}
    </div>
  );
}

/* ── Skeleton rows ──────────────────────────────────────── */
function DeviceSkelRows() {
  return Array.from({ length: 6 }, (_, i) => (
    <tr key={i} className="re-skel-row">
      {Array.from({ length: 9 }, (_, j) => (
        <td key={j}><div className="re-skel-cell" /></td>
      ))}
    </tr>
  ));
}

/* ── Severity badge ─────────────────────────────────────── */
const SEV_STYLE = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)'  },
  high:     { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)'  },
  warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)'  },
  info:     { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.2)'    },
};

/* ── Device risk drawer ─────────────────────────────────── */
const OVERRIDE_ACTIONS = [
  { value: 'approve',      label: 'Approve — resolve all open events' },
  { value: 'reduce_score', label: 'Reduce Score — set explicit value' },
  { value: 'suspend',      label: 'Suspend device' },
  { value: 'unblock',      label: 'Unblock device' },
];

function DeviceRiskDrawer({
  deviceRisk, loading, error, selectedRow, onClose,
  riskHistory, riskHistoryTotal, riskHistoryPage, riskHistoryTotalPages,
  riskHistoryLoading, riskHistoryError, onHistoryPage,
  overrideLoading, overrideError, overrideResult, onOverride,
}) {
  const [tab,        setTab]        = useState('overview');
  const [showOvForm, setShowOvForm] = useState(false);
  const [ovAction,   setOvAction]   = useState('approve');
  const [ovScore,    setOvScore]    = useState(20);
  const [ovReason,   setOvReason]   = useState('');
  const [ovErr,      setOvErr]      = useState('');

  const open    = !!(selectedRow);
  const d       = deviceRisk || {};
  const lvlMeta = LEVEL_META[d.risk_level] || {};

  // Reset everything when a different device is opened
  useEffect(() => {
    setTab('overview');
    setShowOvForm(false);
    setOvAction('approve');
    setOvScore(20);
    setOvReason('');
    setOvErr('');
  }, [selectedRow]);

  // Collapse form automatically on success
  useEffect(() => {
    if (overrideResult) { setShowOvForm(false); setOvReason(''); setOvErr(''); }
  }, [overrideResult]);

  const handleOverrideSubmit = () => {
    if (!ovReason.trim()) { setOvErr('Reason is required.'); return; }
    if (ovAction === 'reduce_score' && (ovScore < 0 || ovScore > 100)) {
      setOvErr('Score must be 0–100.'); return;
    }
    setOvErr('');
    onOverride({ action: ovAction, reason: ovReason.trim(), new_score: ovScore });
  };

  const activeFlags = d.risk_flags
    ? Object.entries(d.risk_flags).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' '))
    : [];

  const histStart = (riskHistoryPage - 1) * 20 + 1;
  const histEnd   = Math.min(riskHistoryPage * 20, riskHistoryTotal);

  return (
    <>
      {open && <div className="re-drawer-backdrop" onClick={onClose} />}
      <div className={`re-drawer${open ? ' open' : ''}`}>
        <div className="re-drawer-header">
          <div className="re-drawer-title"><ShieldIcon />Device Risk</div>
          <button className="re-drawer-close" onClick={onClose}><CloseIcon /></button>
        </div>

        {/* Tabs */}
        {open && (
          <div className="re-drawer-tabs">
            <button className={`re-drawer-tab${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
            <button className={`re-drawer-tab${tab === 'history' ? ' active' : ''}`} onClick={() => { setTab('history'); onHistoryPage(1); }}>
              History
              {riskHistoryTotal > 0 && <span className="re-drawer-tab-count">{riskHistoryTotal}</span>}
            </button>
          </div>
        )}

        {loading && <div className="re-drawer-loading"><div className="re-spinner" /></div>}
        {error && !loading && <div className="re-error" style={{ margin: 16 }}><AlertTriangleIcon /><span>{error}</span></div>}

        {/* ── Overview tab ── */}
        {!loading && !error && d.device_id && tab === 'overview' && (
          <div className="re-drawer-body">
            <div className="re-dr-score-row">
              <div className="re-dr-score" style={{ color: scoreColor(d.risk_score ?? 0) }}>{d.risk_score ?? '—'}</div>
              <div>
                {d.risk_level && (
                  <span className="re-level-badge" style={{ color: lvlMeta.color, background: lvlMeta.bg, borderColor: lvlMeta.border }}>
                    {lvlMeta.label || d.risk_level}
                  </span>
                )}
                <div className="re-dr-score-sub">Risk Score</div>
              </div>
            </div>

            <div className="re-dr-row">
              <span className="re-dr-label">Device Status</span>
              <span className="re-dr-val">
                <span className="re-status-dot" style={{ background: statusColor(d.status) }} />
                {d.status || '—'}
              </span>
            </div>
            <div className="re-dr-row">
              <span className="re-dr-label">Device ID</span>
              <span className="re-dr-mono">{d.device_id}</span>
            </div>

            {activeFlags.length > 0 && (
              <div className="re-dr-section">
                <div className="re-dr-section-title">Active Risk Flags</div>
                <div className="re-flags-wrap">
                  {activeFlags.map(f => <span key={f} className="re-flag-chip">{f}</span>)}
                </div>
              </div>
            )}

            {d.factors?.length > 0 && (
              <div className="re-dr-section">
                <div className="re-dr-section-title">Latest Factor per Type</div>
                <div className="re-dr-factors">
                  {d.factors.map((f, i) => {
                    const sev = SEV_STYLE[f.severity] || SEV_STYLE.info;
                    return (
                      <div key={i} className="re-dr-factor-card">
                        <div className="re-dr-factor-top">
                          <span className="re-dr-event-type">{f.event_type?.replace(/_/g, ' ')}</span>
                          <span className="re-dr-factor-score" style={{ color: scoreColor(f.risk_score ?? 0) }}>+{f.risk_score ?? 0}</span>
                        </div>
                        <div className="re-dr-factor-bottom">
                          <span className="re-dr-sev-badge" style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}>{f.severity}</span>
                          <span className={`re-dr-status-badge${f.status === 'open' ? ' open' : ''}`}>{f.status}</span>
                          <span className="re-dr-date">{fmtDateTime(f.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(!d.factors || d.factors.length === 0) && (
              <div className="re-dr-empty">No risk factors recorded for this device.</div>
            )}

            {/* ── Override result banner ── */}
            {overrideResult && (
              <div className="re-ov-success">
                <strong>{overrideResult.message || 'Override applied.'}</strong>
                {overrideResult.old_risk_score !== undefined && (
                  <span>Score: <s>{overrideResult.old_risk_score}</s> → <strong style={{ color: scoreColor(overrideResult.new_risk_score) }}>{overrideResult.new_risk_score}</strong></span>
                )}
                {overrideResult.new_status !== overrideResult.old_status && (
                  <span>Status: {overrideResult.old_status} → <strong>{overrideResult.new_status}</strong></span>
                )}
              </div>
            )}

            {/* ── Risk override section ── */}
            <div className="re-ov-section">
              <div className="re-ov-header">
                <span className="re-ov-title">Risk Override</span>
                <span className="re-ov-badge">superadmin</span>
                <button className="re-ov-toggle" onClick={() => { setShowOvForm(v => !v); setOvErr(''); }}>
                  {showOvForm ? 'Close' : 'Apply Override'}
                </button>
              </div>

              {showOvForm && (
                <div className="re-ov-form">
                  <div className="re-ov-field">
                    <label className="re-ov-label">Action</label>
                    <select className="re-select re-ov-select" value={ovAction} onChange={e => setOvAction(e.target.value)}>
                      {OVERRIDE_ACTIONS.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>

                  {ovAction === 'reduce_score' && (
                    <div className="re-ov-field">
                      <label className="re-ov-label">New Score (0–100)</label>
                      <input
                        className="re-ov-input"
                        type="number"
                        min={0}
                        max={100}
                        value={ovScore}
                        onChange={e => setOvScore(Number(e.target.value))}
                      />
                    </div>
                  )}

                  <div className="re-ov-field">
                    <label className="re-ov-label">Reason <span className="re-ov-req">*</span></label>
                    <textarea
                      className="re-ov-textarea"
                      rows={3}
                      placeholder="Describe why this override is being applied…"
                      value={ovReason}
                      onChange={e => setOvReason(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Override sticky footer ── */}
        {showOvForm && tab === 'overview' && (
          <div className="re-ov-footer">
            {(ovErr || overrideError) && (
              <div className="re-ov-error"><AlertTriangleIcon /><span>{ovErr || overrideError}</span></div>
            )}
            <div className="re-ov-footer-btns">
              <button className="re-ov-toggle" onClick={() => { setShowOvForm(false); setOvErr(''); }}>
                Cancel
              </button>
              <button className="re-ov-submit" onClick={handleOverrideSubmit} disabled={overrideLoading}>
                {overrideLoading ? 'Applying…' : 'Confirm Override'}
              </button>
            </div>
          </div>
        )}

        {/* ── History tab ── */}
        {tab === 'history' && (
          <div className="re-drawer-body">
            {riskHistoryLoading && !riskHistory.length && (
              <div className="re-drawer-loading"><div className="re-spinner" /></div>
            )}
            {riskHistoryError && (
              <div className="re-error"><AlertTriangleIcon /><span>{riskHistoryError}</span></div>
            )}
            {!riskHistoryLoading && !riskHistoryError && riskHistory.length === 0 && (
              <div className="re-dr-empty">No risk history found for this device.</div>
            )}

            {riskHistory.length > 0 && (
              <>
                <div className="re-hist-meta">
                  Showing {histStart}–{histEnd} of {riskHistoryTotal} events
                </div>
                <div className="re-dr-factors">
                  {riskHistory.map((ev) => {
                    const sev = SEV_STYLE[ev.severity] || SEV_STYLE.info;
                    const payload = ev.event_payload && typeof ev.event_payload === 'object'
                      ? Object.entries(ev.event_payload)
                      : [];
                    return (
                      <div key={ev.id} className="re-dr-factor-card">
                        <div className="re-dr-factor-top">
                          <span className="re-dr-event-type">{ev.event_type?.replace(/_/g, ' ')}</span>
                          <span className="re-dr-factor-score" style={{ color: scoreColor(ev.risk_score ?? 0) }}>+{ev.risk_score ?? 0}</span>
                        </div>
                        <div className="re-dr-factor-bottom">
                          <span className="re-dr-sev-badge" style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}>{ev.severity}</span>
                          <span className={`re-dr-status-badge${ev.status === 'open' ? ' open' : ''}`}>{ev.status}</span>
                          {ev.source_ip && <span className="re-hist-ip">{ev.source_ip}</span>}
                          <span className="re-dr-date">{fmtDateTime(ev.created_at)}</span>
                        </div>
                        {ev.detected_by && (
                          <div className="re-hist-detected">via {ev.detected_by.replace(/_/g, ' ')}</div>
                        )}
                        {payload.length > 0 && (
                          <div className="re-hist-payload">
                            {payload.map(([k, v]) => (
                              <div key={k} className="re-hist-payload-row">
                                <span className="re-hist-payload-key">{k.replace(/_/g, ' ')}</span>
                                <span className="re-hist-payload-val">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {riskHistoryTotalPages > 1 && (
                  <div className="re-hist-pag">
                    <button className="re-pag-nav" disabled={riskHistoryPage <= 1} onClick={() => onHistoryPage(riskHistoryPage - 1)}>
                      <ChevLeft /> Prev
                    </button>
                    <span className="re-page-info">Page {riskHistoryPage} of {riskHistoryTotalPages}</span>
                    <button className="re-pag-nav" disabled={riskHistoryPage >= riskHistoryTotalPages} onClick={() => onHistoryPage(riskHistoryPage + 1)}>
                      Next <ChevRight />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
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
      if (i > 0 && p - arr[i - 1] > 1) acc.push(`e${p}`);
      acc.push(p); return acc;
    }, []);
  return (
    <div className="re-pagination">
      <span className="re-pag-info">Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{totalItems}</strong> devices</span>
      <div className="re-pag-controls">
        <button className="re-pag-nav" onClick={() => onPage(Math.max(1, current - 1))} disabled={current === 1}><ChevLeft /> Previous</button>
        <div className="re-pag-pages">
          {pages.map(p => typeof p === 'string'
            ? <span key={p} className="re-pag-ellipsis">…</span>
            : <button key={p} className={`re-pag-page${p === current ? ' active' : ''}`} onClick={() => onPage(p)}>{p}</button>
          )}
        </div>
        <button className="re-pag-nav" onClick={() => onPage(Math.min(totalPages, current + 1))} disabled={current === totalPages}>Next <ChevRight /></button>
      </div>
    </div>
  );
}

const DAYS_OPTIONS = [7, 14, 30, 90, 180, 365];
const RISK_LEVELS  = ['SAFE', 'MONITOR', 'HIGH', 'CRITICAL'];
const STATUS_OPTIONS = ['active', 'inactive', 'suspended', 'blocked'];
const SORT_OPTIONS   = [
  { value: 'risk_score',       label: 'Risk Score' },
  { value: 'last_heartbeat_at', label: 'Last Heartbeat' },
];

export default function RiskPage() {
  const dispatch = useDispatch();
  const {
    data, loading, error, days,
    devices, devicesCounts, devicesTotal, devicesPage, devicesTotalPages,
    devicesLoading, devicesError, deviceFilters,
    deviceRisk, deviceRiskLoading, deviceRiskError, deviceRiskId,
    riskHistory, riskHistoryTotal, riskHistoryPage, riskHistoryTotalPages, riskHistoryLoading, riskHistoryError,
    overrideLoading, overrideError, overrideResult,
    lastFetched,
  } = useSelector(s => s.risk);

  const [localDays, setLocalDays] = useState(days);
  const [tick, setTick] = useState(0);

  const dispatchDevices = useCallback((overrides = {}) => {
    const filters = { ...deviceFilters, ...overrides };
    dispatch(setDeviceFilters(overrides));
    dispatch(fetchRiskDevices(filters));
  }, [dispatch, deviceFilters]);

  useEffect(() => {
    dispatch(fetchRiskDashboard({ days: localDays }));
  }, [dispatch, localDays]);

  useEffect(() => {
    dispatch(fetchRiskDevices(deviceFilters));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(() => {
      dispatch(fetchRiskDashboard({ days: localDays, force: true }));
      dispatch(fetchRiskDevices({ ...deviceFilters, force: true }));
      setTick(t => t + 1); // nudge the "X ago" label
    }, 30_000);
    return () => clearInterval(id);
  }, [dispatch, localDays, deviceFilters]);

  // Tick every 5s so the "last updated" label stays fresh
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5_000);
    return () => clearInterval(id);
  }, []);

  const handleDaysChange = (d) => {
    setLocalDays(d);
    dispatch(setDays(d));
  };

  const handleLevelTab = (level) => {
    dispatchDevices({ risk_level: level === deviceFilters.risk_level ? '' : level, page: 1 });
  };

  const handleStatus = (e) => dispatchDevices({ status: e.target.value, page: 1 });
  const handleSort   = (e) => dispatchDevices({ sort_by: e.target.value, page: 1 });
  const handlePage   = (p) => dispatchDevices({ page: p });

  const handleRowClick = (deviceId) => {
    dispatch(fetchDeviceRisk(deviceId));
  };
  const handleDrawerClose = () => dispatch(clearDeviceRisk());
  const handleHistoryPage = (page) => {
    dispatch(fetchDeviceRiskHistory({ deviceId: deviceRiskId, page }));
  };

  const handleOverride = useCallback(({ action, reason, new_score }) => {
    dispatch(postRiskOverride({ deviceId: deviceRiskId, action, reason, new_score }))
      .unwrap()
      .then(() => {
        // Refresh drawer data + device list so scores reflect the change
        dispatch(fetchDeviceRisk(deviceRiskId));
        dispatch(setDeviceFilters({})); // bust TTL so next list fetch re-runs
        dispatch(fetchRiskDevices(deviceFilters));
      })
      .catch(() => {/* error already in overrideError state */});
  }, [dispatch, deviceRiskId, deviceFilters]);

  const d    = data || {};
  const factors = [
    { label: 'Clone Detections',    value: d.clone_detections    ?? 0, color: '#ef4444' },
    { label: 'Tamper Detections',   value: d.tamper_detections   ?? 0, color: '#f97316' },
    { label: 'Emulator Detections', value: d.emulator_detections ?? 0, color: '#f59e0b' },
    { label: 'Root Detections',     value: d.root_detections     ?? 0, color: '#eab308' },
    { label: 'Geo Anomalies',       value: d.geo_anomalies       ?? 0, color: '#8b5cf6' },
    { label: 'Admin Overrides',     value: d.admin_overrides     ?? 0, color: '#06b6d4' },
  ];
  const maxFactor = Math.max(...factors.map(f => f.value), 1);

  const totalFleet = (devicesCounts.safe ?? 0) + (devicesCounts.monitor ?? 0)
                   + (devicesCounts.high ?? 0) + (devicesCounts.critical ?? 0);

  return (
    <div className="re-page">
      {/* ── Header ── */}
      <div className="re-hero">
        <div className="re-hero-left">
          <div className="re-hero-icon"><ShieldIcon /></div>
          <div>
            <h1 className="re-title">Risk Engine</h1>
            <p className="re-subtitle">Live device risk metrics — always reflects current state</p>
          </div>
        </div>
        <div className="re-hero-right">
          <div className="re-days-tabs">
            {DAYS_OPTIONS.map(n => (
              <button
                key={n}
                className={`re-day-btn${localDays === n ? ' active' : ''}`}
                onClick={() => handleDaysChange(n)}
              >{n}d</button>
            ))}
          </div>
          <div className="re-auto-refresh-info">
            <span className={`re-refresh-dot${loading ? ' spinning' : ''}`} />
            {lastFetched
              ? (() => {
                  const sec = Math.floor((Date.now() - lastFetched) / 1000);
                  return sec < 10 ? 'Updated just now' : `Updated ${sec}s ago`;
                })()
              : 'Auto-refresh every 30s'
            }
          </div>
        </div>
      </div>

      {error && (
        <div className="re-error"><AlertTriangleIcon /><span>{error}</span></div>
      )}

      {/* ── Dashboard stat cards ── */}
      <div className="re-section-label">Device Counts (current)</div>
      <div className="re-stats-grid">
        <StatCard icon={<MonitorIcon />}  label="Total Monitored"   value={d.total_monitored_devices} accent="blue"   />
        <StatCard icon={<RiskyIcon />}    label="Risky (score ≥50)" value={d.risky_devices}           accent="amber"  note="MONITOR+" />
        <StatCard icon={<HighRiskIcon />} label="High Risk (≥70)"   value={d.high_risk_devices}       accent="orange" note="HIGH+" />
        <StatCard icon={<SuspendIcon />}  label="Suspended"          value={d.suspended_devices}       accent="yellow" />
        <StatCard icon={<BlockIcon />}    label="Blocked"            value={d.blocked_devices}         accent="red"    />
      </div>

      {/* ── Factor tallies ── */}
      <div className="re-section-label">
        Risk Factor Tallies
        <span className="re-section-sub">Events within last {localDays} days</span>
      </div>
      <div className="re-factors-card">
        {factors.map(f => (
          <FactorRow key={f.label} label={f.label} value={f.value} max={maxFactor} color={f.color} />
        ))}
      </div>

      {/* ── Daily trend ── */}
      <div className="re-section-label">
        Daily Event Trend
        <span className="re-section-sub">Last {localDays} days — total risk events per day</span>
      </div>
      <div className="re-trend-card">
        {loading && !d.trend
          ? <div className="re-trend-loading"><div className="re-spinner" /></div>
          : <TrendChart trend={d.trend} />
        }
      </div>

      {d.is_demo_data && (
        <div className="re-demo-banner">
          Demo data — live risk events not yet available in this environment.
        </div>
      )}

      {/* ── Device list ── */}
      <div className="re-section-label" style={{ marginTop: 32 }}>
        Risk Device List
        <span className="re-section-sub">{devicesTotal} device{devicesTotal !== 1 ? 's' : ''} total</span>
      </div>

      {/* Risk level tabs + filters in one row */}
      <div className="re-list-controls">
        <div className="re-level-tabs">
          <button
            className={`re-level-tab${!deviceFilters.risk_level ? ' active all' : ''}`}
            onClick={() => dispatchDevices({ risk_level: '', page: 1 })}
          >
            All
            <span className="re-level-count">{totalFleet}</span>
          </button>
          {RISK_LEVELS.map(lvl => {
            const meta  = LEVEL_META[lvl];
            const count = devicesCounts[lvl.toLowerCase()] ?? 0;
            const isActive = deviceFilters.risk_level === lvl;
            return (
              <button
                key={lvl}
                className={`re-level-tab${isActive ? ' active' : ''}`}
                style={isActive ? { borderColor: meta.color, color: meta.color, background: meta.bg } : {}}
                onClick={() => handleLevelTab(lvl)}
              >
                <span className="re-level-dot" style={{ background: meta.color }} />
                {meta.label}
                <span className="re-level-count" style={isActive ? { background: meta.bg, color: meta.color } : {}}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="re-filter-bar">
          <select className="re-select" value={deviceFilters.status} onChange={handleStatus}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select className="re-select" value={deviceFilters.sort_by} onChange={handleSort}>
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(deviceFilters.risk_level || deviceFilters.status) && (
            <button className="re-clear-btn" onClick={() => { dispatch(clearDeviceFilters()); dispatch(fetchRiskDevices({})); }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {devicesError && (
        <div className="re-error"><AlertTriangleIcon /><span>{devicesError}</span></div>
      )}

      {/* Table */}
      <div className="re-table-wrap">
        <table className="re-table">
          <thead>
            <tr>
              <th>Device</th>
              <th>User</th>
              <th>Platform</th>
              <th>Risk Score</th>
              <th>Risk Level</th>
              <th>Active Flags</th>
              <th>Status</th>
              <th>Last Heartbeat</th>
              <th>Rec. Action</th>
            </tr>
          </thead>
          <tbody>
            {devicesLoading && !devices.length ? (
              <DeviceSkelRows />
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={9} className="re-empty-cell">
                  No devices match the current filters.
                </td>
              </tr>
            ) : (
              devices.map(dev => {
                const lvlMeta = LEVEL_META[dev.risk_level] || {};
                return (
                  <tr key={dev.device_id} className={`re-device-row clickable${deviceRiskId === dev.device_id ? ' selected' : ''}`} onClick={() => handleRowClick(dev.device_id)}>
                    <td>
                      <div className="re-device-name">
                        {[dev.device_brand, dev.device_model].filter(Boolean).join(' ') || 'Unknown'}
                      </div>
                      <div className="re-device-id">{dev.device_id?.slice(0, 8)}…</div>
                    </td>
                    <td className="re-td-email">{dev.user_email || '—'}</td>
                    <td>
                      <span className="re-platform">{dev.platform || '—'}</span>
                    </td>
                    <td>
                      <span className="re-score-badge" style={{ color: scoreColor(dev.risk_score ?? 0), borderColor: scoreColor(dev.risk_score ?? 0) + '44' }}>
                        {dev.risk_score ?? '—'}
                      </span>
                    </td>
                    <td>
                      {dev.risk_level ? (
                        <span className="re-level-badge" style={{ color: lvlMeta.color, background: lvlMeta.bg, borderColor: lvlMeta.border }}>
                          {lvlMeta.label || dev.risk_level}
                        </span>
                      ) : '—'}
                    </td>
                    <td><RiskFlagsCell flags={dev.risk_flags} /></td>
                    <td>
                      <span className="re-status-dot" style={{ background: statusColor(dev.status) }} />
                      <span className="re-status-text">{dev.status || '—'}</span>
                    </td>
                    <td className="re-td-dt">{fmtDateTime(dev.last_heartbeat_at)}</td>
                    <td>
                      {dev.recommended_action && dev.recommended_action !== 'none' ? (
                        <span className={`re-action-chip re-action-${dev.recommended_action}`}>
                          {dev.recommended_action}
                        </span>
                      ) : (
                        <span className="re-td-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        current={devicesPage}
        totalPages={devicesTotalPages}
        totalItems={devicesTotal}
        pageSize={deviceFilters.page_size}
        onPage={handlePage}
      />

      <DeviceRiskDrawer
        deviceRisk={deviceRisk}
        loading={deviceRiskLoading}
        error={deviceRiskError}
        selectedRow={deviceRiskId}
        onClose={handleDrawerClose}
        riskHistory={riskHistory}
        riskHistoryTotal={riskHistoryTotal}
        riskHistoryPage={riskHistoryPage}
        riskHistoryTotalPages={riskHistoryTotalPages}
        riskHistoryLoading={riskHistoryLoading}
        riskHistoryError={riskHistoryError}
        onHistoryPage={handleHistoryPage}
        overrideLoading={overrideLoading}
        overrideError={overrideError}
        overrideResult={overrideResult}
        onOverride={handleOverride}
      />
    </div>
  );
}
