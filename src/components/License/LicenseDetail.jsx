import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLicenseDetail, clearDetail } from '../../store/slices/licenseSlice';
import './LicenseDetail.css';

/* ── Icons ─────────────────────────────────────────────── */
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

/* ── Helpers ────────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
};

const fmt = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
};

const statusCls = (s) => ({ active: 'ld-active', expired: 'ld-expired', revoked: 'ld-revoked', suspended: 'ld-suspended', grace: 'ld-grace' }[s] || 'ld-unknown');
const planCls = (p) => ({ paid: 'ld-paid', trial: 'ld-trial', grace: 'ld-grace-plan' }[p] || 'ld-unknown');
const riskCls = (r) => (r >= 70 ? 'high' : r >= 30 ? 'med' : 'low');

const PLATFORM_ICONS = {
  android: '🤖', ios: '🍎', firetv: '🔥', roku: '📺', samsung: '📺',
  phone: '📱', tablet: '📟', desktop: '🖥️', android_tv: '📺',
};

/* Renders a value, or a contextual empty-state label instead of a bare
   dash / "N/A" — each field says what its absence actually means. */
function InfoRow({ label, value, emptyLabel = 'Not set' }) {
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <div className="ld-info-row">
      <span className="ld-info-key">{label}</span>
      <span className={`ld-info-val${isEmpty ? ' is-empty' : ''}`}>{isEmpty ? emptyLabel : value}</span>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="ld-card">
      <div className="ld-card-title">{title}</div>
      {children}
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export default function LicenseDetail({ licenseId, onBack }) {
  const dispatch = useDispatch();
  const { selectedDetail, detailLoading, detailError } = useSelector((s) => s.licenses);

  useEffect(() => {
    dispatch(fetchLicenseDetail({ licenseId }));
    return () => dispatch(clearDetail());
  }, [dispatch, licenseId]);

  const detail = selectedDetail;
  const L = detail?.license || null;
  const history = detail?.history || [];
  const device = detail?.device || null;

  return (
    <div className="ld-page">
      <button className="ld-back-btn" onClick={onBack}>
        <BackIcon /> Back to Licenses
      </button>

      {(detailLoading || (!selectedDetail && !detailError)) && (
        <div className="ld-loading"><span className="ld-spinner" /> Loading license details…</div>
      )}

      {detailError && !detailLoading && (
        <div className="ld-error">{detailError}</div>
      )}

      {L && !detailLoading && (
        <>
          {/* ── Hero ── */}
          <div className="ld-hero">
            <div className="ld-hero-body">
              <div className="ld-hero-id">ID: {L.id}</div>
              <div className="ld-hero-user">{L.user_email}</div>
              <div className="ld-hero-badges">

                <div className="ld-badge-group">
                  <span className="ld-badge-label">
                    Status:
                  </span>

                  <span className={`ld-status-pill ${statusCls(L.status)}`}>
                    {L.status || "N/A"}
                  </span>
                </div>
                {/* <br /> */}

                <div className="ld-badge-group">
                  <span className="ld-badge-label">
                    Plan Type:
                  </span>

                  <span className={`ld-plan-pill bg-warning text-light rounded-1 px-2 py-0 ${planCls(L.plan_type)}`}>
                    {L.plan_name || L.plan_type || "N/A"}
                  </span>
                </div>


                {
                  L.auto_renew && (
                    <span className="ld-badge-group">
                      <span className="ld-badge-label">
                        Renewal:
                      </span>

                      <span className="ld-badge cyan">
                        Auto-Renew
                      </span>
                    </span>
                  )
                }

              </div>
            </div>
            <div className="ld-hero-stats">
              <div className="ld-hero-stat">
                <strong>{L.days_remaining != null ? `${L.days_remaining}d` : '—'}</strong>
                <span>Days Left</span>
              </div>
              <div className="ld-hero-stat">
                <strong>{L.max_concurrent_streams ?? '—'}</strong>
                <span>Streams</span>
              </div>
              <div className="ld-hero-stat">
                <strong>{L.extension_count ?? 0}</strong>
                <span>Extensions</span>
              </div>
              <div className="ld-hero-stat">
                <strong>{L.plan_amount_display || '—'}</strong>
                <span>Amount</span>
              </div>
            </div>
          </div>

          {/* ── Row 1: License + Status ── */}
          <div className="ld-grid-2">
            <Card title="License Info">
              <InfoRow label="Plan" value={L.plan_name} emptyLabel="No plan assigned" />
              <InfoRow label="Plan Code" value={L.plan_code && <span className="ld-mono">{L.plan_code}</span>} emptyLabel="No plan code" />
              <InfoRow label="Billing Cycle" value={L.billing_cycle} emptyLabel="No billing cycle" />
              <InfoRow label="Duration" value={L.license_duration_days ? `${L.license_duration_days} days` : null} emptyLabel="No fixed duration" />
              <InfoRow label="Trial Days" value={L.trial_days} emptyLabel="Not a trial" />
              <InfoRow label="Max Streams" value={L.max_concurrent_streams} emptyLabel="Unlimited" />
              <InfoRow label="Token TTL" value={L.token_ttl_override ? `${L.token_ttl_override}s` : null} emptyLabel="Using default TTL" />
              <InfoRow label="Issued" value={fmtDate(L.created_at)} emptyLabel="Issue date unknown" />
              <InfoRow label="Last Updated" value={fmtDate(L.updated_at)} emptyLabel="Never updated" />
            </Card>

            <Card title="Status & Expiry">
              <InfoRow label="Status" value={<span className={`ld-status-pill ${statusCls(L.status)}`}>{L.status}</span>} />
              <InfoRow label="Is Active" value={L.is_active ? '✅ Yes' : '❌ No'} />
              <InfoRow label="Starts" value={fmtDate(L.starts_at)} emptyLabel="No start date" />
              <InfoRow label="Expires" value={fmtDate(L.expires_at)} emptyLabel="Does not expire" />
              <InfoRow label="Expiry Display" value={L.expiry_display} emptyLabel="No expiry summary" />
              <InfoRow label="Auto-Renew" value={L.auto_renew ? 'Yes' : 'No'} />
              <InfoRow label="Reminder Sent" value={L.reminder_sent ? fmtDate(L.reminder_sent_at) : null} emptyLabel="Not sent yet" />
              {L.revoked_at && (
                <>
                  <InfoRow label="Revoked At" value={fmt(L.revoked_at)} />
                  <InfoRow label="Revoked By" value={L.revoked_by_email} emptyLabel="Unknown admin" />
                  <InfoRow label="Reason" value={L.revocation_reason} emptyLabel="No reason logged" />
                </>
              )}
            </Card>
          </div>

          {/* ── Device Info ── */}
          {device && (
            <Card title="Associated Device">
              <div className="ld-device-hero">
                <span className="ld-device-icon">{PLATFORM_ICONS[device.device_type] || '📱'}</span>
                <div>
                  <div className="ld-device-name">{device.device_brand} {device.device_model}</div>
                  <div className="ld-device-sub">{device.device_type} · App {device.app_version}</div>
                </div>
                <span className={`ld-status-pill ${statusCls(device.status)}`}>{device.status}</span>
                <span className={`ld-risk-badge ${riskCls(device.risk_score ?? 0)}`}>Risk {device.risk_score ?? 0}</span>
              </div>
              <div className="ld-device-rows">
                <InfoRow label="Last Heartbeat" value={fmt(device.last_heartbeat_at)} emptyLabel="No heartbeat received" />
                <InfoRow label="Enrolled" value={fmtDate(device.enrolled_at)} emptyLabel="Enrollment date unknown" />
              </div>
            </Card>
          )}

          {/* ── Change History ── */}
          {history.length > 0 && (
            <Card title={`Change History (${history.length})`}>
              <div className="ld-table-scroll">
                <table className="ld-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Plan</th>
                      <th>Expires</th>
                      <th>Changed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="ld-mono">{fmt(h.created_at) || 'Unknown date'}</td>
                        <td className="ld-reason">{h.change_reason?.replace(/_/g, ' ') || 'No reason logged'}</td>
                        <td><span className={`ld-status-pill ${statusCls(h.status)}`}>{h.status}</span></td>
                        <td className="ld-capitalize">{h.plan_type || 'No plan'}</td>
                        <td className="ld-mono">{fmtDate(h.expires_at) || 'No expiry'}</td>
                        <td className="ld-muted">{h.changed_by || 'System'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
