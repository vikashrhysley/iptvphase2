import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAppUserDetail, clearSelectedUser, updateAppUser, clearUpdateState } from '../../store/slices/appUsersSlice';
import UserActivityPage from './UserActivityPage';
import UserLoginHistory from './UserLoginHistory';
import './AppUserDetail.css';

/* ── Icons ─────────────────────────────────────────────── */
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const ActivityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M22 12h-4l-3 8-6-16-3 8H2" />
  </svg>
);
const LoginHistoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

/* ── Helpers ────────────────────────────────────────────── */
const fmt = (iso) => {
  if (!iso || iso === 'null') return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

const fmtDate = (iso) => {
  if (!iso || iso === 'null') return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return '—'; }
};

const initials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

const statusClass = (s) => {
  if (s === 'active')    return 'active';
  if (s === 'blocked')   return 'blocked';
  if (s === 'suspended') return 'suspended';
  if (s === 'inactive')  return 'inactive';
  return 'unknown';
};

const devStatusClass = (s) => (s === 'active' ? 'active' : 'inactive');

/* ── Small reusable pieces ──────────────────────────────── */
function BoolChip({ value, yes = 'Yes', no = 'No' }) {
  return (
    <span className={`udd-bool ${value ? 'yes' : 'no'}`}>
      {value ? <CheckIcon /> : <XIcon />} {value ? yes : no}
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="udd-info-row">
      <span className="udd-info-key">{label}</span>
      <span className="udd-info-val">{value ?? '—'}</span>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="udd-card">
      <div className="udd-card-title">{title}</div>
      {children}
    </div>
  );
}

/* ── Update Profile Modal ───────────────────────────────── */
function UpdateProfileModal({ user, onClose }) {
  const dispatch = useDispatch();
  const { updateLoading, updateError, updateSuccess } = useSelector((s) => s.appUsers);

  const [form, setForm] = useState({
    full_name:    user.full_name    || '',
    status:       user.status       || 'active',
    max_devices:  user.max_devices  ?? 2,
    country_code: user.country_code || '',
    reason:       '',
  });
  const [localError, setLocalError] = useState('');

  const set = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }));
    setLocalError('');
    if (updateError) dispatch(clearUpdateState());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) { setLocalError('Reason is required for the audit log.'); return; }
    const payload = {};
    if (form.full_name.trim()    !== (user.full_name    || '')) payload.full_name    = form.full_name.trim();
    if (form.status              !== user.status)               payload.status       = form.status;
    if (Number(form.max_devices) !== user.max_devices)          payload.max_devices  = Number(form.max_devices);
    if (form.country_code.trim() !== (user.country_code || '')) payload.country_code = form.country_code.trim().toUpperCase();
    payload.reason = form.reason.trim();
    dispatch(clearUpdateState());
    dispatch(updateAppUser({ userId: user.id, data: payload }));
  };

  return (
    <div className="udd-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="udd-modal" onSubmit={handleSubmit}>
        <div className="udd-modal-header">
          <div className="udd-modal-title"><EditIcon /> Update User Profile</div>
          <button type="button" className="udd-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <p className="udd-modal-sub">Changes are applied immediately and written to the audit log.</p>

        <div className="udd-modal-grid">
          <label className="udd-modal-field udd-field-full">
            <span>Full Name</span>
            <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)}
              placeholder="John Doe" disabled={updateLoading} />
          </label>

          <label className="udd-modal-field">
            <span>Status</span>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} disabled={updateLoading}>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>

          <label className="udd-modal-field">
            <span>Max Devices (1–10)</span>
            <input type="number" min={1} max={10} value={form.max_devices}
              onChange={(e) => set('max_devices', e.target.value)} disabled={updateLoading} />
          </label>

          <label className="udd-modal-field">
            <span>Country Code</span>
            <input value={form.country_code} onChange={(e) => set('country_code', e.target.value)}
              placeholder="US" maxLength={2} disabled={updateLoading} />
          </label>

          <label className="udd-modal-field udd-field-full">
            <span>Reason <span className="udd-required">*</span></span>
            <textarea value={form.reason} onChange={(e) => set('reason', e.target.value)}
              placeholder="Describe why this change is being made…"
              rows={3} disabled={updateLoading} />
          </label>
        </div>

        {(localError || updateError) && (
          <div className="udd-modal-error">{localError || updateError}</div>
        )}
        {updateSuccess && (
          <div className="udd-modal-success"><CheckIcon /> Profile updated successfully.</div>
        )}

        <div className="udd-modal-actions">
          <button type="button" className="udd-btn-cancel" onClick={onClose} disabled={updateLoading}>Cancel</button>
          <button type="submit" className="udd-btn-save" disabled={updateLoading || updateSuccess}>
            {updateLoading ? <span className="udd-mini-spin" /> : <EditIcon />}
            {updateLoading ? 'Saving…' : updateSuccess ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */
export default function AppUserDetail({ userId, onBack }) {
  const dispatch = useDispatch();
  const { selectedUser: u, detailLoading, detailError } = useSelector((s) => s.appUsers);
  const [showEdit, setShowEdit] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showLoginHistory, setShowLoginHistory] = useState(false);

  // All hooks must run before any conditional return
  useEffect(() => {
    dispatch(fetchAppUserDetail(userId));
    return () => dispatch(clearSelectedUser());
  }, [dispatch, userId]);

  const handleCloseEdit = () => {
    dispatch(clearUpdateState());
    setShowEdit(false);
  };

  if (showActivity && u) {
    return (
      <UserActivityPage
        userId={u.id}
        userName={u.full_name}
        userEmail={u.email}
        onBack={() => setShowActivity(false)}
      />
    );
  }

  if (showLoginHistory && u) {
    return (
      <UserLoginHistory
        userId={u.id}
        userName={u.full_name}
        userEmail={u.email}
        onBack={() => setShowLoginHistory(false)}
      />
    );
  }

  return (
    <div className="udd-page">
      {/* Back bar */}
      <div className="udd-topbar">
        <button className="udd-back-btn" onClick={onBack}>
          <BackIcon /> Back to Subscribers
        </button>
        {u && (
          <div className="udd-topbar-actions">
            <button className="udd-activity-btn" onClick={() => setShowActivity(true)}>
              <ActivityIcon /> Activity
            </button>
            <button className="udd-activity-btn" onClick={() => setShowLoginHistory(true)}>
              <LoginHistoryIcon /> Login History
            </button>
            <button className="udd-edit-btn" onClick={() => setShowEdit(true)}>
              <EditIcon /> Update User Profile
            </button>
          </div>
        )}
      </div>

      {detailLoading && (
        <div className="udd-loading">
          <span className="udd-spinner" /> Loading subscriber details…
        </div>
      )}

      {detailError && !detailLoading && (
        <div className="udd-error">{detailError}</div>
      )}

      {u && !detailLoading && (
        <>
          {/* ── Hero ──────────────────────────────────────── */}
          <div className="udd-hero">
            <div className="udd-avatar">{initials(u.full_name)}</div>
            <div className="udd-hero-body">
              <div className="udd-hero-name">{u.full_name || '—'}</div>
              <div className="udd-hero-email">{u.email}</div>
              <div className="udd-hero-badges">
                <span className={`udd-status-pill ${statusClass(u.status)}`}>{u.status}</span>
                {u.email_verified  && <span className="udd-badge green">Email Verified</span>}
                {u.phone_verified  && <span className="udd-badge green">Phone Verified</span>}
                {u.trial_used      && <span className="udd-badge amber">Trial Used</span>}
                {u.is_locked       && <span className="udd-badge red">Locked</span>}
              </div>
            </div>
            <div className="udd-hero-stats">
              <div className="udd-hero-stat">
                <strong>{u.active_device_count ?? 0}</strong>
                <span>Active Devices</span>
              </div>
              <div className="udd-hero-stat">
                <strong>{u.active_license_count ?? 0}</strong>
                <span>Licenses</span>
              </div>
              <div className="udd-hero-stat">
                <strong>{u.account_age_days ?? 0}d</strong>
                <span>Account Age</span>
              </div>
              <div className="udd-hero-stat">
                <strong>{u.max_devices ?? '—'}</strong>
                <span>Max Devices</span>
              </div>
            </div>
          </div>

          {/* ── Row 1: Personal + Payment ─────────────────── */}
          <div className="udd-grid-2">
            <SectionCard title="Personal Info">
              <InfoRow label="Phone"      value={u.phone_number} />
              <InfoRow label="Country"    value={u.country_code} />
              <InfoRow label="Registered" value={fmtDate(u.created_at)} />
              <InfoRow label="Last Purchase" value={fmtDate(u.last_purchase_at)} />
              <InfoRow label="Days Since Purchase" value={u.days_since_last_purchase != null ? `${u.days_since_last_purchase} days` : '—'} />
              <InfoRow label="Trial Used At"  value={u.trial_used ? fmt(u.trial_used_at) : 'No'} />
              <InfoRow label="Failed OTP"     value={u.failed_otp_count ?? 0} />
              <InfoRow label="OTP Locked Until" value={u.otp_locked_until ? fmt(u.otp_locked_until) : 'Not locked'} />
            </SectionCard>

            <SectionCard title="Payment Info">
              {u.payment_info ? (
                <>
                  <InfoRow label="Has Payment Method" value={<BoolChip value={u.payment_info.has_payment_method} />} />
                  <InfoRow label="Card"   value={u.payment_info.has_payment_method
                    ? `${(u.payment_info.card_brand || '').toUpperCase()} •••• ${u.payment_info.card_last4}`
                    : '—'} />
                  <InfoRow label="Expires" value={u.payment_info.card_expires || '—'} />
                  <InfoRow label="Auth Status" value={u.payment_info.authorization_status || '—'} />
                  <InfoRow label="Expiring Soon" value={<BoolChip value={u.payment_info.is_card_expiring_soon} yes="Yes" no="No" />} />
                </>
              ) : (
                <div className="udd-empty-section">No payment info available.</div>
              )}
            </SectionCard>
          </div>

          {/* ── Row 2: Activity + Security ───────────────── */}
          <div className="udd-grid-2">
            <SectionCard title="Activity Summary (30d)">
              {u.activity_summary ? (
                <>
                  <InfoRow label="Sessions"      value={u.activity_summary.total_sessions_30d} />
                  <InfoRow label="Watch Hours"   value={u.activity_summary.total_watch_hours_30d != null ? `${u.activity_summary.total_watch_hours_30d}h` : '—'} />
                  <InfoRow label="Last Watched"  value={fmt(u.activity_summary.last_watched_at)} />
                  <InfoRow label="Last Content"  value={u.activity_summary.last_content_title || '—'} />
                  <InfoRow label="Content Type"  value={u.activity_summary.last_content_type || '—'} />
                  <InfoRow label="Quality"       value={u.activity_summary.preferred_quality || '—'} />
                </>
              ) : (
                <div className="udd-empty-section">No activity data available.</div>
              )}
            </SectionCard>

            <SectionCard title="Security Summary (30d)">
              {u.security_summary ? (
                <>
                  <InfoRow label="Total Logins"    value={u.security_summary.total_logins_30d} />
                  <InfoRow label="Failed Logins"   value={u.security_summary.failed_logins_30d} />
                  <InfoRow label="Last Login IP"   value={u.security_summary.last_login_ip || '—'} />
                  <InfoRow label="Last Country"    value={u.security_summary.last_login_country || '—'} />
                  <InfoRow label="Unique Countries" value={u.security_summary.unique_countries_30d} />
                  <InfoRow label="Login Anomaly"   value={<BoolChip value={u.security_summary.login_anomaly} yes="Detected" no="None" />} />
                </>
              ) : (
                <div className="udd-empty-section">No security data available.</div>
              )}
            </SectionCard>
          </div>

          {/* ── Preferences ──────────────────────────────── */}
          {u.preferences && (
            <SectionCard title="Preferences">
              <div className="udd-pref-grid">
                <InfoRow label="Language"     value={u.preferences.preferred_language} />
                <InfoRow label="Quality"      value={u.preferences.preferred_quality} />
                <InfoRow label="Timezone"     value={u.preferences.timezone} />
                <InfoRow label="Contact Method" value={u.preferences.preferred_contact_method} />
                <InfoRow label="Notifications" value={<BoolChip value={u.preferences.notifications_enabled} />} />
                <InfoRow label="Analytics Consent" value={<BoolChip value={u.preferences.analytics_consent} />} />
              </div>
            </SectionCard>
          )}

          {/* ── Devices ──────────────────────────────────── */}
          {u.devices?.length > 0 && (
            <SectionCard title={`Devices (${u.total_device_count ?? u.devices.length})`}>
              <div className="udd-table-scroll">
                <table className="udd-table">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>Platform</th>
                      <th>Type</th>
                      <th>OS Version</th>
                      <th>App Version</th>
                      <th>Status</th>
                      <th>Risk Score</th>
                      <th>Last Heartbeat</th>
                      <th>Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u.devices.map((d) => (
                      <tr key={d.device_id}>
                        <td>
                          <div className="udd-device-name">{d.device_name || '—'}</div>
                          <div className="udd-device-model">{d.device_brand} {d.device_model}</div>
                        </td>
                        <td className="udd-capitalize">{d.platform || '—'}</td>
                        <td className="udd-capitalize">{d.device_type || '—'}</td>
                        <td>{d.os_version || '—'}</td>
                        <td>{d.app_version || '—'}</td>
                        <td>
                          <span className={`udd-status-pill ${devStatusClass(d.status)}`}>{d.status}</span>
                        </td>
                        <td>
                          <span className={`udd-risk ${d.risk_score > 50 ? 'high' : d.risk_score > 20 ? 'med' : 'low'}`}>
                            {d.risk_score ?? '—'}
                          </span>
                        </td>
                        <td>{fmt(d.last_heartbeat_at)}</td>
                        <td>{fmtDate(d.enrolled_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── Licenses ─────────────────────────────────── */}
          {u.licenses?.length > 0 && (
            <SectionCard title="Licenses">
              <div className="udd-table-scroll">
                <table className="udd-table">
                  <thead>
                    <tr>
                      <th>License ID</th>
                      <th>Plan</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Starts</th>
                      <th>Expires</th>
                      <th>Days Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u.licenses.map((l) => (
                      <tr key={l.license_id}>
                        <td className="udd-mono">{l.license_id?.slice(0, 12)}…</td>
                        <td>{l.plan_name || '—'}</td>
                        <td className="udd-capitalize">{l.plan_type || '—'}</td>
                        <td>
                          <span className={`udd-status-pill ${statusClass(l.status)}`}>{l.status}</span>
                        </td>
                        <td>{fmtDate(l.starts_at)}</td>
                        <td>{fmtDate(l.expires_at)}</td>
                        <td>
                          <span className={`udd-days ${(l.days_remaining ?? 99) < 14 ? 'warn' : 'ok'}`}>
                            {l.days_remaining != null ? `${l.days_remaining}d` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── Subscriptions ────────────────────────────── */}
          {u.subscriptions?.length > 0 && (
            <SectionCard title="Subscriptions">
              <div className="udd-table-scroll">
                <table className="udd-table">
                  <thead>
                    <tr>
                      <th>Subscription ID</th>
                      <th>Plan</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Period End</th>
                      <th>Auto Renew</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u.subscriptions.map((s) => (
                      <tr key={s.subscription_id}>
                        <td className="udd-mono">{s.subscription_id?.slice(0, 12)}…</td>
                        <td>{s.plan_name || '—'}</td>
                        <td className="udd-capitalize">{s.plan_type || '—'}</td>
                        <td>
                          <span className={`udd-status-pill ${statusClass(s.status)}`}>{s.status}</span>
                        </td>
                        <td>{fmtDate(s.current_period_end)}</td>
                        <td><BoolChip value={s.auto_renew} yes="On" no="Off" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </>
      )}

      {showEdit && u && (
        <UpdateProfileModal user={u} onClose={handleCloseEdit} />
      )}
    </div>
  );
}
