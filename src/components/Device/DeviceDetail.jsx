import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDeviceDetail, clearDeviceDetail, updateDeviceStatus, replaceDevice, clearUpdateState } from '../../store/slices/deviceSlice';
import DeviceActivity    from './DeviceActivity';
import DeviceLoginHistory from './DeviceLoginHistory';
import './DeviceDetail.css';

/* ── Icons ─────────────────────────────────────────────── */
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
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

/* ── Reusable row ───────────────────────────────────────── */
function InfoRow({ label, value }) {
  return (
    <div className="dd-info-row">
      <span className="dd-info-key">{label}</span>
      <span className="dd-info-val">{value ?? '—'}</span>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="dd-card">
      <div className="dd-card-title">{title}</div>
      {children}
    </div>
  );
}

/* ── Update Status Modal ────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active',    color: '#34d399' },
  { value: 'blocked',   label: 'Blocked',   color: '#f87171' },
  { value: 'suspended', label: 'Suspended', color: '#fbbf24' },
  { value: 'replaced',  label: 'Replaced',  color: '#a78bfa' },
];

function UpdateStatusModal({ device, onClose }) {
  const dispatch = useDispatch();
  const { updateLoading, updateError, updateSuccess } = useSelector(s => s.devices);
  const [status, setStatus] = useState(device.status || 'active');
  const [reason, setReason] = useState('');

  const isReplaced   = status === 'replaced';
  const alreadyThat  = status === device.status;
  const deviceId     = device.device_id || device.id;

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(clearUpdateState());
    if (isReplaced) {
      dispatch(replaceDevice({ deviceId, reason: reason || 'admin_replacement' }));
    } else {
      dispatch(updateDeviceStatus({ deviceId, status, reason }));
    }
  };

  return (
    <div className="dd-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <form className="dd-modal" onSubmit={handleSubmit}>
        <div className="dd-modal-header">
          <div className="dd-modal-title"><EditIcon /> Update Device Status</div>
          <button type="button" className="dd-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <p className="dd-modal-sub">
          Change status for <strong>{device.device_brand} {device.device_model || device.device_name}</strong>.
          The reason is written to the audit log.
        </p>

        <div className="dd-modal-field">
          <label>New Status</label>
          <div className="dd-status-options">
            {STATUS_OPTIONS.map(opt => {
              const disabled = opt.value === 'replaced' && device.status === 'replaced';
              return (
                <label
                  key={opt.value}
                  className={`dd-status-option${status === opt.value ? ' selected' : ''}${disabled ? ' dd-opt-disabled' : ''}`}
                  style={{ '--opt-color': opt.color }}
                >
                  <input type="radio" name="status" value={opt.value}
                    checked={status === opt.value}
                    disabled={disabled}
                    onChange={() => { if (!disabled) { setStatus(opt.value); dispatch(clearUpdateState()); } }}
                  />
                  <span className="dd-opt-dot" />
                  {opt.label}
                </label>
              );
            })}
          </div>
        </div>

        {isReplaced && (
          <div className="dd-replace-warn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Sets status to <strong>replaced</strong> via a dedicated endpoint. This records a factory reset or device swap.
            Defaults reason to <code>admin_replacement</code> if left blank.
          </div>
        )}

        <div className="dd-modal-field">
          <label>Reason <span className="dd-optional">(optional — written to audit log)</span></label>
          <textarea
            value={reason}
            onChange={e => { setReason(e.target.value); dispatch(clearUpdateState()); }}
            placeholder={isReplaced ? 'e.g. factory_reset, device_swap… (default: admin_replacement)' : 'Describe why this status change is being made…'}
            rows={3}
            disabled={updateLoading}
          />
        </div>

        {updateError && (
          <div className="dd-modal-error">{updateError}</div>
        )}
        {updateSuccess && (
          <div className="dd-modal-success">
            <CheckIcon /> {isReplaced ? 'Device marked as replaced.' : 'Status updated successfully.'}
          </div>
        )}

        <div className="dd-modal-actions">
          <button type="button" className="dd-btn-cancel" onClick={onClose} disabled={updateLoading}>
            {updateSuccess ? 'Close' : 'Cancel'}
          </button>
          <button type="submit" className="dd-btn-save"
            disabled={updateLoading || updateSuccess || alreadyThat}>
            {updateLoading ? <span className="dd-mini-spin" /> : <EditIcon />}
            {updateLoading ? 'Saving…' : updateSuccess ? 'Saved' : isReplaced ? 'Mark as Replaced' : 'Update Status'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export default function DeviceDetail({ deviceId, onBack }) {
  const dispatch = useDispatch();
  const { selectedDevice: d, detailLoading, detailError } = useSelector(s => s.devices);
  const [showUpdate,       setShowUpdate]       = useState(false);
  const [showActivity,     setShowActivity]     = useState(false);
  const [showLoginHistory, setShowLoginHistory] = useState(false);

  useEffect(() => {
    dispatch(fetchDeviceDetail(deviceId));
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
            <button className="dd-update-btn" onClick={() => { dispatch(clearUpdateState()); setShowUpdate(true); }}>
              <EditIcon /> Update Status
            </button>
          </div>
        )}
      </div>

      {detailLoading && (
        <div className="dd-loading"><span className="dd-spinner" /> Loading device details…</div>
      )}
      {detailError && !detailLoading && (
        <div className="dd-error">{detailError}</div>
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
              <InfoRow label="Brand"         value={d.device_brand} />
              <InfoRow label="Model"         value={d.device_model} />
              <InfoRow label="OS Version"    value={d.os_version} />
              <InfoRow label="App Version"   value={d.app_version} />
              <InfoRow label="Device Type"   value={d.device_type?.replace(/_/g,' ')} />
              <InfoRow label="Virtual MAC"   value={<span style={{fontFamily:'monospace',fontSize:'0.8rem'}}>{d.virtual_mac || '—'}</span>} />
              <InfoRow label="Activation"    value={d.activation_type} />
              <InfoRow label="Enrolled"      value={fmtDate(d.enrolled_at)} />
            </SectionCard>

            <SectionCard title="License">
              <InfoRow label="Status"     value={<span className={`dd-status-pill ${statusCls(d.license_status)}`}>{d.license_status || '—'}</span>} />
              <InfoRow label="Plan"       value={d.license_plan_type} />
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

            <SectionCard title="User">
              <div className="dd-user-hero">
                <div className="dd-user-avatar">{initials(d.user_full_name)}</div>
                <div>
                  <div className="dd-user-name">{d.user_full_name || '—'}</div>
                  <div className="dd-user-email">{d.user_email || '—'}</div>
                </div>
              </div>
              <InfoRow label="User ID" value={<span style={{fontFamily:'monospace',fontSize:'0.78rem'}}>{d.user_id?.slice(0,16)}…</span>} />
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
                <InfoRow label="Sessions"      value={d.activity_summary.sessions_7d} />
                <InfoRow label="Watch Hours"   value={d.activity_summary.watch_hours_7d != null ? `${d.activity_summary.watch_hours_7d}h` : '—'} />
                <InfoRow label="Avg Buffers"   value={d.activity_summary.avg_buffer_count} />
                <InfoRow label="Last Portal"   value={d.activity_summary.last_portal_url
                  ? <a href={d.activity_summary.last_portal_url} target="_blank" rel="noreferrer" className="dd-link">{d.activity_summary.last_portal_url}</a>
                  : '—'} />
              </div>
              {d.activity_summary.stream_quality_breakdown && (
                <div className="dd-quality-row">
                  {Object.entries(d.activity_summary.stream_quality_breakdown).map(([q, count]) => (
                    <div className="dd-quality-chip" key={q}>
                      <strong>{count}</strong>
                      <span>{q.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* ── Heartbeat Logs ── */}
          {d.heartbeat_logs?.length > 0 && (
            <SectionCard title={`Recent Heartbeats (${d.heartbeat_logs.length})`}>
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
            <SectionCard title={`Audit Trail (${d.audit_trail.length})`}>
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
        </>
      )}

      {showUpdate && d && (
        <UpdateStatusModal
          device={d}
          onClose={() => { dispatch(clearUpdateState()); setShowUpdate(false); }}
        />
      )}
    </div>
  );
}
