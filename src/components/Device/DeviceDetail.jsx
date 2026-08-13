import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
const riskClass  = (s) => s >= 70 ? 'high' : s >= 30 ? 'med' : 'low';
const statusCls  = (s) => ({ active:'active', inactive:'inactive', blocked:'blocked', suspended:'suspended', revoked:'revoked' }[s] || 'unknown');
const sevCls     = (s) => ({ critical:'critical', warning:'warning', info:'info', success:'success' }[s] || 'info');

const PLATFORM_ICONS = { android:'🤖', firetv:'🔥', ios:'🍎', roku:'📺', samsung:'📺' };

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

  const devName = d ? `${d.device_brand || ''} ${d.device_model || d.device_name || ''}`.trim() : '';

  if (showActivity && d)     return <DeviceActivity    deviceId={d.device_id||d.id} deviceName={devName} onBack={() => setShowActivity(false)} />;
  if (showLoginHistory && d) return <DeviceLoginHistory deviceId={d.device_id||d.id} deviceName={devName} onBack={() => setShowLoginHistory(false)} />;

  const name = devName;
  const initials = (n) => n ? n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

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
          {/* ── Hero ── */}
          <div className="dd-hero">
            <div className="dd-hero-avatar">
              {PLATFORM_ICONS[d.platform] || '📱'}
            </div>
            <div className="dd-hero-body">
              <div className="dd-hero-name">{name || d.device_name || '—'}</div>
              <div className="dd-hero-sub">{d.platform_display || d.platform} · {d.os_version}</div>
              {(d.device_id || d.id) && (
                <div className="dd-hero-id">
                  <span className="dd-hero-id-label">Device ID</span>
                  <span className="dd-hero-id-val" title={d.device_id || d.id}>{d.device_id || d.id}</span>
                </div>
              )}
              <div className="dd-hero-badges">
                <span className={`dd-status-pill ${statusCls(d.status)}`}>{d.status}</span>
                {d.is_online && <span className="dd-badge online">● Online</span>}
                {!d.is_online && <span className="dd-badge offline">○ Offline</span>}
                {d.push_enabled && <span className="dd-badge push">Push On</span>}
                <span className={`dd-risk-badge ${riskClass(d.risk_score ?? 0)}`}>Risk {d.risk_score ?? 0}</span>
              </div>
            </div>
            <div className="dd-hero-stats">
              <div className="dd-hero-stat">
                <strong>{d.heartbeat_success_rate_7d != null ? `${d.heartbeat_success_rate_7d}%` : '—'}</strong>
                <span>HB Success 7d</span>
              </div>
              <div className="dd-hero-stat">
                <strong>{d.heartbeat_miss_count ?? 0}</strong>
                <span>Missed HBs</span>
              </div>
              <div className="dd-hero-stat">
                <strong>{d.license_days_remaining != null ? `${d.license_days_remaining}d` : '—'}</strong>
                <span>License Left</span>
              </div>
              <div className="dd-hero-stat">
                <strong>{d.activity_summary?.sessions_7d ?? '—'}</strong>
                <span>Sessions 7d</span>
              </div>
            </div>
          </div>

          {/* ── Row 1: Device Info + License ── */}
          <div className="dd-grid-2">
            <SectionCard title="Device Info">
              <InfoRow label="Activation"    value={d.activation_type} />
              <InfoRow label="Brand"         value={d.device_brand} />
              <InfoRow label="Model"         value={d.device_model} />
              <InfoRow label="OS Version"    value={d.os_version} />
              <InfoRow label="App Version"   value={d.app_version} />
              <InfoRow label="Device Type"   value={d.device_type?.replace(/_/g,' ')} />
              <InfoRow label="Virtual MAC"   value={<span style={{fontFamily:'monospace',fontSize:'0.8rem'}}>{d.virtual_mac || '—'}</span>} />
              <InfoRow label="Device ID"     value={<span style={{fontFamily:'monospace',fontSize:'0.8rem',overflowWrap:'anywhere'}}>{d.device_id || d.id || '—'}</span>} />
              <InfoRow label="Enrolled"      value={fmtDate(d.enrolled_at)} />
            </SectionCard>

            <SectionCard title="License">
              <InfoRow label="Status"     value={<span className={`dd-status-pill ${statusCls(d.license_status)}`}>{d.license_status || '—'}</span>} />
              <InfoRow label="Plan"       value={d.license_plan_type} />
              <InfoRow label="Started"    value={fmtDate(d.enrolled_at)} />
              <InfoRow label="Expires"    value={fmtDate(d.license_expires_at)} />
              <InfoRow label="Days Left"  value={d.license_days_remaining != null ? `${d.license_days_remaining} days` : '—'} />
              <InfoRow label="Active"     value={d.license_is_active ? '✅ Yes' : '❌ No'} />
            </SectionCard>
          </div>

          {/* ── Row 2: Location + User ── */}
          <div className="dd-grid-2">
            <SectionCard title="Location & Network">
              <InfoRow label="City"         value={d.last_seen_city} />
              <InfoRow label="Country"      value={d.last_seen_country} />
              <InfoRow label="Last IP"      value={<span style={{fontFamily:'monospace',fontSize:'0.8rem'}}>{d.last_seen_ip || '—'}</span>} />
              <InfoRow label="Last Seen"    value={relTime(d.last_heartbeat_at)} />
              <InfoRow label="Days Since HB" value={d.days_since_heartbeat != null ? `${d.days_since_heartbeat}d` : '—'} />
              <InfoRow label="Push Token"   value={d.push_token_updated_at ? fmtDate(d.push_token_updated_at) : '—'} />
            </SectionCard>

            <SectionCard title="User Profile">
              <div className="dd-user-hero">
                <div className="dd-user-avatar">{initials(d.user_full_name)}</div>
                <div>
                  <div className="dd-user-name">{d.user_full_name || '—'}</div>
                  <div className="dd-user-email">{d.user_email || '—'}</div>
                </div>
              </div>
              <InfoRow label="User ID" value={<span style={{fontFamily:'monospace',fontSize:'0.78rem',overflowWrap:'anywhere'}}>{d.user_id || '—'}</span>} />
              {d.risk_flags && (
                <div className="dd-risk-flags">
                  {Object.entries(d.risk_flags).map(([k, v]) => (
                    <span key={k} className={`dd-flag-chip ${v ? 'on' : 'off'}`}>
                      {k.replace(/_/g,' ')}
                    </span>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Activity Summary ── */}
          {d.activity_summary && (
            <SectionCard title="Activity Summary (7d)">
              <div className="dd-activity-grid">
                <InfoRow label="Sessions"           value={d.activity_summary.sessions_7d} />
                <InfoRow label="Watch Hours"        value={d.activity_summary.watch_hours_7d != null ? `${d.activity_summary.watch_hours_7d}h` : '—'} />
                <InfoRow label="Last Watched"       value={fmt(d.activity_summary.last_watched_at)} />
                <InfoRow label="Last Content Title" value={d.activity_summary.last_content_title} />
                <InfoRow label="Last Content Type"  value={d.activity_summary.last_content_type} />
              </div>
            </SectionCard>
          )}

          {/* ── Heartbeat Logs ── */}
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

          {/* ── Audit Trail ── */}
          {d.audit_trail?.length > 0 && (
            <SectionCard title={`Audit Trail (${d.audit_trail.length})`} collapsible defaultOpen={false}>
              <div className="dd-table-scroll">
                <table className="dd-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Severity</th>
                      <th>IP</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.audit_trail.map((a) => (
                      <tr key={a.id}>
                        <td className="dd-mono">{fmt(a.created_at)}</td>
                        <td className="dd-action">{a.action}</td>
                        <td><span className={`dd-sev-pill ${sevCls(a.severity)}`}>{a.severity}</span></td>
                        <td className="dd-mono">{a.ip_address || '—'}</td>
                        <td className="dd-notes">{a.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── Ownership History — NEW, bottom of page (Devices Rework build guide §5, §6) ── */}
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
