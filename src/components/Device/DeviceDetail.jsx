import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { fetchDeviceDetail, clearDeviceDetail, fetchDeviceOwnershipHistory } from '../../store/slices/deviceSlice';
import DeviceActivity    from './DeviceActivity';
import DeviceLoginHistory from './DeviceLoginHistory';
import './DeviceDetail.css';

/* ── Icons ─────────────────────────────────────────────── */
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

/* ── Helpers ────────────────────────────────────────────── */
const fmt = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return '—'; }
};
const relTime = (iso) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000), h = Math.floor(diff / 3600000), m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'Just now';
};

const copyText = (text, label) => {
  if (!text || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`)).catch(() => {});
};

const PLATFORM_ICONS = { android:'🤖', firetv:'🔥', ios:'🍎', roku:'📺', samsung:'📺' };

// Device Info build guide §4a — Status labels must match the Device Status card on Device
// Management exactly (same vocabulary used in DevicePage.jsx's STATUS_MAP).
const STATUS_LABELS = {
  normal:             { label: 'Active',        cls: 'in-service' },
  auto_blocked:       { label: 'Auto-blocked',  cls: 'auto-blocked' },
  admin_blocked:      { label: 'Admin-blocked', cls: 'blocked' },
  risk_score_blocked: { label: 'Risk-blocked',  cls: 'blocked' },
  recovery_device:    { label: 'Recovery',      cls: 'out-service' },
  admin_released:     { label: 'Released',      cls: 'out-service' },
};
const statusLabel = (s) => STATUS_LABELS[s]?.label || s || '—';
const statusCls   = (s) => STATUS_LABELS[s]?.cls || 'unknown';

const USAGE_LABELS = { online_now: 'Online now', logged_in_idle: 'Idle', logged_out: 'Signed out' };
const usageLabel = (s) => USAGE_LABELS[s] || '—';

const riskClass = (score) => score >= 70 ? 'high' : score >= 30 ? 'med' : 'low';

// status_reason (§4a): only shown when there's something to say — a bare "note" and/or the
// resolved actor name, joined with the relative change time when known.
const statusNote = (sr) => {
  if (!sr || (!sr.note && !sr.changed_by_name)) return null;
  const parts = [sr.note, sr.changed_by_name || 'System'].filter(Boolean);
  if (sr.changed_at) parts.push(relTime(sr.changed_at));
  return parts.join(' · ');
};

// Ownership History reason codes → plain English (Devices Rework build guide §6.3.4).
// Backfilled rows are inferred, not observed (an approximate started_at / ended_at) — render
// them muted rather than presenting them with the same confidence as an observed tenure.
const START_REASON_LABELS = {
  enrollment: 'Enrolled this device',
  ownership_transfer: 'Took over from previous owner',
  backfill: 'Recorded before ownership tracking',
};
const END_REASON_LABELS = {
  claimed_by_other_user: 'Passed to another user',
  account_deleted: 'Owner deleted their account',
  backfill_detached: 'Recorded before ownership tracking',
};
const isBackfilledTenure = (entry) => entry.start_reason === 'backfill' || entry.end_reason === 'backfill_detached';

// Audit Trail (§6): actions arrive as raw strings (e.g. "device.admin_blocked") — humanize
// without a full per-action phrase map, per the guide's explicit fallback.
const humanizeAction = (action) => {
  if (!action) return 'Unknown action';
  return action.replace(/^device\./, '').replace(/_/g, ' ');
};

/* ── Reusable row ───────────────────────────────────────── */
function InfoRow({ label, value }) {
  return (
    <div className="dd-info-row">
      <span className="dd-info-key">{label}</span>
      <span className="dd-info-val">{value ?? '—'}</span>
    </div>
  );
}

function SectionCard({ title, children, collapsible, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = !collapsible || open;
  const toggle = () => setOpen((o) => !o);
  return (
    <div className="dd-card">
      <div
        className={`dd-card-title${collapsible ? ' dd-card-title-toggle' : ''}`}
        onClick={collapsible ? toggle : undefined}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
        onKeyDown={collapsible ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } } : undefined}
      >
        <span>{title}</span>
        {collapsible && <span className={`dd-card-caret${isOpen ? ' open' : ''}`}>▾</span>}
      </div>
      {isOpen && children}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export default function DeviceDetail({ deviceId, onBack }) {
  const dispatch = useDispatch();
  const {
    selectedDevice: d, detailLoading, detailError,
    ownershipHistoryItems, ownershipHistoryLoading, ownershipHistoryError,
  } = useSelector(s => s.devices);
  const [showActivity,     setShowActivity]     = useState(false);
  const [showLoginHistory, setShowLoginHistory] = useState(false);

  useEffect(() => {
    dispatch(fetchDeviceDetail(deviceId));
    // Its own fetch, never chained off the detail call — same pattern as MAC seats on the App
    // User detail page.
    dispatch(fetchDeviceOwnershipHistory({ deviceId, params: { page: 1, page_size: 20 } }));
    return () => dispatch(clearDeviceDetail());
  }, [dispatch, deviceId]);

  // GET /admin/devices/{id} response is reshaped to one key per card (Device Detail build
  // guide §2/§3) — device / risk / owner / network / heartbeat, plus the unchanged blocks.
  const dev        = d?.device || {};
  const risk       = d?.risk || {};
  const owner      = d?.owner || null;
  const network    = d?.network || {};
  const heartbeat  = d?.heartbeat || {};
  const riskScore  = risk.score ?? 0;

  const devName = dev.device_name || '';

  if (showActivity && d)     return <DeviceActivity    deviceId={dev.device_id} deviceName={devName} onBack={() => setShowActivity(false)} />;
  if (showLoginHistory && d) return <DeviceLoginHistory deviceId={dev.device_id} deviceName={devName} onBack={() => setShowLoginHistory(false)} />;

  const initials = (n) => n ? n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

  const openOwner = () => {
    if (!owner?.user_id) return;
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: 'app_users', userId: owner.user_id } }));
  };

  return (
    <div className="dd-page">
      {/* Top bar */}
      <div className="dd-topbar">
        <button className="dd-back-btn" onClick={onBack}>
          <BackIcon /> Back to Devices
        </button>
        {d && (
          <div style={{ display:'flex', gap:8 }}>
            <button className="dd-outline-btn" onClick={() => setShowActivity(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 8-6-16-3 8H2"/></svg>
              Activity
            </button>
            <button className="dd-outline-btn" onClick={() => setShowLoginHistory(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Login History
            </button>
          </div>
        )}
      </div>

      {detailLoading && (
        <div className="dd-loading"><span className="dd-spinner" /> Loading device details…</div>
      )}
      {detailError && !detailLoading && (
        <div className="dd-error">
          <div className="dd-error-msg">{detailError}</div>
          <div className="dd-error-hint">
            This device’s details couldn’t be loaded from the server. Other devices open normally,
            so this is a server-side error for this specific device rather than a problem with the page.
          </div>
          <button className="dd-error-retry" onClick={() => dispatch(fetchDeviceDetail(deviceId))}>
            Retry
          </button>
        </div>
      )}

      {d && !detailLoading && (
        <>
          {/* ── Header stat tiles (§4f) — License Left removed, no license data on this page ── */}
          <div className="dd-hero-stats dd-stat-strip">
            <div className="dd-hero-stat">
              <strong>{heartbeat.success_rate_7d != null ? `${heartbeat.success_rate_7d}%` : '—'}</strong>
              <span>HB Success 7d</span>
            </div>
            <div className="dd-hero-stat">
              <strong>{heartbeat.miss_count ?? 0}</strong>
              <span>Missed HBs</span>
            </div>
            <div className="dd-hero-stat">
              <strong>{d.activity_summary?.sessions_7d ?? '—'}</strong>
              <span>Sessions 7d</span>
            </div>
          </div>

          {/* ── Device Info — the ONE hero card (§2, §4a) ── */}
          <div className="dd-idcard">
            <div className="dd-idcard-body">
              <div className="dd-idrail">
                <div className="dd-avatar">{PLATFORM_ICONS[dev.platform] || '📱'}</div>
              </div>
              <div className="dd-idmain">
                <div className="dd-idtitle-row">
                  <div>
                    <div className="dd-idtitle">{dev.device_name || '—'}</div>
                    <div className="dd-idsubtitle">{dev.os_version || '—'}</div>
                  </div>
                  <span className={`dd-risk-badge ${riskClass(riskScore)}`}>Risk {riskScore}</span>
                </div>
                <div className="dd-idrecord">
                  <div className="dd-info-row">
                    <span className="dd-info-key">Device ID</span>
                    <span className="dd-info-val dd-idcopy-val">
                      <span className="dd-mono">{dev.device_id || '—'}</span>
                      {dev.device_id && (
                        <button type="button" className="dd-idcopy" title="Copy device ID"
                          onClick={() => copyText(dev.device_id, 'Device ID')}>
                          <CopyIcon />
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="dd-info-row dd-status-info-row">
                    <span className="dd-info-key">Status</span>
                    <span className="dd-info-val">
                      <span className={`dd-status-pill ${statusCls(dev.status)}`}>{statusLabel(dev.status)}</span>
                    </span>
                  </div>
                  {statusNote(dev.status_reason) && (
                    <div className="dd-status-note">{statusNote(dev.status_reason)}</div>
                  )}
                  <InfoRow label="Activity"      value={usageLabel(dev.usage_state)} />
                  <InfoRow label="Virtual MAC"   value={dev.virtual_mac ? <span className="dd-mono">{dev.virtual_mac}</span> : '—'} />
                  <InfoRow label="Brand"         value={dev.device_brand} />
                  <InfoRow label="Model"         value={dev.device_model} />
                  <InfoRow label="OS Version"    value={dev.os_version} />
                  <InfoRow label="Registered By" value={dev.registered_by} />
                  <InfoRow label="Enrolled"      value={fmtDate(dev.enrolled_at)} />
                  <InfoRow label="Activation"    value={dev.activation_type} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 1: Risk + Current Owner ── */}
          <div className="dd-grid-2">
            <SectionCard title="Risk">
              <div className="dd-risk-score">
                <span className={`dd-risk-score-val ${riskClass(riskScore)}`}>{riskScore}</span>
                <span className="dd-risk-score-label">Risk Score</span>
              </div>
              {risk.flags && Object.keys(risk.flags).length > 0 && (
                <div className="dd-risk-flags">
                  {Object.entries(risk.flags).map(([k, v]) => (
                    <span key={k} className={`dd-flag-chip ${v ? 'on' : 'off'}`}>
                      {k.replace(/_/g,' ')}
                    </span>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Current Owner">
              {owner ? (
                <>
                  <div className="dd-user-hero dd-owner-click" onClick={openOwner} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openOwner(); } }}>
                    <div className="dd-user-avatar">{initials(owner.full_name)}</div>
                    <div>
                      {owner.full_name && <div className="dd-user-name">{owner.full_name}</div>}
                      <div className="dd-user-email">{owner.email || '—'}</div>
                    </div>
                  </div>
                  <div className="dd-info-row">
                    <span className="dd-info-key">User ID</span>
                    <span className="dd-info-val dd-idcopy-val">
                      <span className="dd-mono dd-link" onClick={openOwner}>{owner.user_id}</span>
                      <button type="button" className="dd-idcopy" title="Copy user ID"
                        onClick={(e) => { e.stopPropagation(); copyText(owner.user_id, 'User ID'); }}>
                        <CopyIcon />
                      </button>
                    </span>
                  </div>
                </>
              ) : (
                <div className="dd-empty-section">No current owner</div>
              )}
            </SectionCard>
          </div>

          {/* ── Location & Network (§4d) ── */}
          <div className="dd-grid-2">
            <SectionCard title="Location & Network">
              <InfoRow label="Location"  value={network.location_display} />
              <InfoRow label="Last IP"   value={network.ip ? <span className="dd-mono">{network.ip}</span> : '—'} />
              <InfoRow label="Last Seen" value={network.last_seen?.display} />
            </SectionCard>

            {/* ── Activity Summary — unchanged (§4g) ── */}
            {d.activity_summary && (
              <SectionCard title="Activity Summary (7d)">
                <InfoRow label="Sessions"           value={d.activity_summary.sessions_7d} />
                <InfoRow label="Watch Hours"        value={d.activity_summary.watch_hours_7d != null ? `${d.activity_summary.watch_hours_7d}h` : '—'} />
                <InfoRow label="Last Watched"       value={fmt(d.activity_summary.last_watched_at)} />
                <InfoRow label="Last Content Title" value={d.activity_summary.last_content_title} />
                <InfoRow label="Last Content Type"  value={d.activity_summary.last_content_type} />
              </SectionCard>
            )}
          </div>

          {/* ── Heartbeat Logs — unchanged (§4h) ── */}
          {d.heartbeat_logs?.length > 0 && (
            <SectionCard title={`Recent Heartbeats (${d.heartbeat_logs.length})`} collapsible defaultOpen={false}>
              <div className="dd-table-scroll">
                <table className="dd-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Status</th>
                      <th>IP</th>
                      <th>Country</th>
                      <th>Playback</th>
                      <th>Screen</th>
                      <th>Portal</th>
                      <th>Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.heartbeat_logs.map((h) => (
                      <tr key={h.id}>
                        <td className="dd-mono">{fmt(h.created_at)}</td>
                        <td><span className={`dd-hb-pill ${h.status}`}>{h.status}</span></td>
                        <td className="dd-mono">{h.ip_address || '—'}</td>
                        <td>{h.country_code || '—'}</td>
                        <td>{h.playback_active ? <span className="dd-yes">Yes</span> : <span className="dd-no">No</span>}</td>
                        <td className="dd-capitalize">{h.active_screen || '—'}</td>
                        <td><span className={`dd-portal-pill ${h.portal_status}`}>{h.portal_status || '—'}</span></td>
                        <td className="dd-mono">{h.response_ms != null ? `${h.response_ms}ms` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── Audit Trail — reshaped: actor + changed_fields, not severity (§6) ── */}
          {d.audit_trail?.length > 0 && (
            <SectionCard title={`Audit Trail (${d.audit_trail.length})`} collapsible defaultOpen={false}>
              <div className="dd-audit-list">
                {d.audit_trail.map((a) => (
                  <div className="dd-audit-row" key={a.id}>
                    <div className="dd-audit-head">
                      <span className="dd-audit-actor">{a.actor || 'System'}</span>
                      <span className="dd-audit-action">{humanizeAction(a.action)}</span>
                      <span className="dd-audit-time">{fmt(a.created_at)}{a.ip_address ? ` · ${a.ip_address}` : ''}</span>
                    </div>
                    {a.changed_fields?.length > 0 && (
                      <div className="dd-audit-diffs">
                        {a.changed_fields.map((c, i) => (
                          <div key={i} className="dd-audit-diff">
                            <span className="dd-audit-diff-field">{c.field}:</span>{' '}
                            {String(c.from ?? '—')} <span className="dd-audit-arrow">→</span> {String(c.to ?? '—')}
                          </div>
                        ))}
                      </div>
                    )}
                    {a.notes && <div className="dd-audit-notes">{a.notes}</div>}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── Ownership History — bottom of page (Devices Rework build guide §5, §6) ── */}
          <SectionCard title="Ownership History" collapsible defaultOpen={false}>
            {ownershipHistoryLoading ? (
              <div className="dd-empty-section">Loading ownership history…</div>
            ) : ownershipHistoryError ? (
              <div className="dd-error" style={{ margin: 0 }}>{ownershipHistoryError}</div>
            ) : ownershipHistoryItems.length === 0 ? (
              // Empty state matters here: until the ownership-history migration runs this is the
              // normal state for every device, not an error and not a loading flicker (§6.3.5).
              <div className="dd-empty-section">No ownership history recorded</div>
            ) : (
              <div className="dd-own-list">
                {ownershipHistoryItems.map((entry) => {
                  const muted = isBackfilledTenure(entry);
                  const reasonText = entry.is_current
                    ? null
                    : END_REASON_LABELS[entry.end_reason] || START_REASON_LABELS[entry.start_reason] || null;
                  return (
                    <div className={`dd-own-row${entry.is_current ? ' current' : ''}${muted ? ' muted' : ''}`} key={entry.id}>
                      <div className="dd-own-who">
                        <span className="dd-own-name">{entry.owner_name || '—'}</span>
                        <span className="dd-own-email">{entry.owner_email}</span>
                      </div>
                      <div className="dd-own-period">
                        {fmtDate(entry.started_at)} – {entry.is_current || entry.ended_at == null ? 'now' : fmtDate(entry.ended_at)}
                      </div>
                      <div className="dd-own-status">
                        {entry.is_current
                          ? <span className="dd-own-current-badge">Current</span>
                          : reasonText && <span className="dd-own-reason">{reasonText}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
