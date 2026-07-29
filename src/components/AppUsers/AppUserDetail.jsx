import { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAppUserDetail, clearSelectedUser, flagUserForReview, clearReviewState } from '../../store/slices/appUsersSlice';
import {
  apiFetchLicenseHistory, apiFetchSubscriptionHistory, apiFetchLicenseDetail, apiFetchSubscriptionDetail,
  apiCancelSubscription, apiExtendSubscription, apiSetSubscriptionDeviceLimit, apiActivateSubscription,
} from '../../services/api';
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
const FlagIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
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
  if (s === 'active') return 'active';
  if (s === 'blocked') return 'blocked';
  if (s === 'suspended') return 'suspended';
  if (s === 'inactive') return 'inactive';
  return 'unknown';
};

const devStatusClass = (s) => (s === 'active' ? 'active' : 'inactive');

// plan_type is 'free' | 'paid' on the wire; shown as Trial / Paid.
const planTypeLabel = (type) => {
  const v = String(type || '').toLowerCase();
  if (v === 'free') return 'Trial';
  if (v === 'paid') return 'Paid';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : '—';
};

/* ── Shared entitlement helpers (license + subscription) ─── */
// Map license/subscription statuses onto the existing pill palette.
const entStatusClass = (s) => {
  const v = String(s || '').toLowerCase();
  if (v === 'active') return 'active';
  if (v === 'revoked' || v === 'blocked') return 'blocked';
  if (v === 'inactive_due_to_payment') return 'suspended';
  return 'inactive'; // expired · cancelled · deleted · unknown
};
const humanizeStatus = (s) => String(s || '').replace(/_/g, ' ') || '—';
const humanizeKey = (k) => String(k).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Big headline for a license: prefer the server's pre-formatted expiry_display.
const licenseHeadline = (lic) => {
  if (lic.expiry_display) return lic.expiry_display;
  const d = fmtDate(lic.expires_at);
  if (d === '—') return '—';
  return lic.days_remaining != null ? `${d} · ${lic.days_remaining}d left` : d;
};

const prettySnapshot = (raw) => {
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return JSON.stringify(obj, null, 2);
  } catch { return String(raw); }
};

// A small entitlement tile (label above, value below).
function EntTile({ label, children }) {
  return (
    <div className="udd-ent-tile">
      <span className="udd-ent-tile-label">{label}</span>
      <div className="udd-ent-tile-value">{children ?? '—'}</div>
    </div>
  );
}

// A titled group of fields (e.g. "Entitlement", "Access State", "Meta").
function EntSection({ title, children }) {
  return (
    <div className="udd-ent-section">
      <div className="udd-ent-section-title">{title}</div>
      {children}
    </div>
  );
}

// A full-width identity row: label on the left, full (mono) value on the right.
// When onClick is provided (and there's a value), the row becomes a link-style button.
function EntIdRow({ label, value, onClick }) {
  const clickable = Boolean(onClick && value);
  return (
    <div
      className={`udd-ent-idrow${clickable ? ' clickable' : ''}`}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      title={clickable ? 'Open this plan' : undefined}
    >
      <span className="udd-ent-idrow-label">{label}</span>
      <span className="udd-ent-idrow-val">
        {value || '—'}{clickable && <span className="udd-ent-idrow-go">↗</span>}
      </span>
    </div>
  );
}

// Fire a cross-page navigation intent handled by AppLayout.
const navigateToPlan = (planId) => {
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: 'plans', planId } }));
};

// Selector shown when the user owns more than one license / subscription.
function ItemSelector({ items, idKey, value, onChange }) {
  if (items.length <= 1) return null;
  return (
    <label className="udd-modal-field udd-field-full udd-ent-select">
      <span>Select</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        {items.map((it) => <option key={it[idKey]} value={it[idKey]}>{it[idKey]}</option>)}
      </select>
    </label>
  );
}

// Fetch shell for a single license / subscription, with a reload() for post-action refresh.
function useEntityDetail(items, idKey, fetcher) {
  const accessToken = useSelector((s) => s.auth.accessToken);
  const [selectedId, setSelectedId] = useState(items[0]?.[idKey] || null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!selectedId) return undefined;
    let alive = true;
    setLoading(true); setError(null);
    fetcher(accessToken, selectedId)
      .then((d) => { if (alive) setDetail(d); })
      .catch((err) => { if (alive) setError(err.message || 'Failed to load details.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [selectedId, accessToken, fetcher, tick]);

  return { accessToken, selectedId, setSelectedId, detail, loading, error, reload: () => setTick((t) => t + 1) };
}

/* ── License Detail popup (read-only) ───────────────────── */
function LicenseDetailModal({ items, onClose }) {
  const { selectedId, setSelectedId, detail, loading, error } =
    useEntityDetail(items, 'license_id', apiFetchLicenseDetail);
  // apiFetchLicenseDetail wraps the record as { license, history, device }; unwrap it.
  const lic = detail && (detail.license || detail);
  const revoked = lic && String(lic.status).toLowerCase() === 'revoked';

  return (
    <div className="udd-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="udd-modal udd-modal-wide">
        <div className="udd-modal-header">
          <div className="udd-modal-title">License Details</div>
          <button type="button" className="udd-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <ItemSelector items={items} idKey="license_id" value={selectedId} onChange={setSelectedId} />

        {!selectedId ? (
          <div className="udd-empty-section">No license to show.</div>
        ) : loading ? (
          <div className="udd-empty-section">Loading license…</div>
        ) : error ? (
          <div className="udd-modal-error">{error}</div>
        ) : !lic ? (
          <div className="udd-empty-section">No license found.</div>
        ) : (
          <div className="udd-ent">
            {/* Header: plan + badge + status */}
            <div className="udd-ent-head">
              <div className="udd-ent-plan">
                <span className="udd-ent-plan-name">{lic.plan_name || '—'}</span>
                <span className={`udd-plan-badge ${String(lic.plan_type).toLowerCase() === 'free' ? 'trial' : 'paid'}`}>
                  {planTypeLabel(lic.plan_type)}
                </span>
              </div>
              <span className={`udd-status-pill ${entStatusClass(lic.status)}`}>{humanizeStatus(lic.status)}</span>
            </div>

            {revoked && (
              <div className="udd-ent-banner danger">
                <strong>License revoked — access is blocked.</strong>
                <span>
                  Revoked by {lic.revoked_by || 'unknown'} on {fmtDate(lic.revoked_at)}.
                  {lic.revocation_reason ? ` Reason: ${lic.revocation_reason}.` : ''}
                </span>
              </div>
            )}

            {/* Headline: pre-formatted expiry */}
            <div className="udd-ent-headline">{licenseHeadline(lic)}</div>

            {/* Entitlement */}
            <EntSection title="Entitlement">
              <div className="udd-ent-grid">
                <EntTile label="Devices">{lic.max_devices ?? '—'}</EntTile>
                <EntTile label="Streams">{lic.max_concurrent_streams ?? '—'}</EntTile>
                <EntTile label="Billing Cycle">{lic.billing_cycle || '—'}</EntTile>
                <EntTile label="Duration">{lic.duration_days != null ? `${lic.duration_days}d` : '—'}</EntTile>
              </div>
            </EntSection>

            {/* Access state */}
            <EntSection title="Access State">
              <div className="udd-ent-grid">
                <EntTile label="Status">
                  <span className={`udd-status-pill ${entStatusClass(lic.status)}`}>{humanizeStatus(lic.status)}</span>
                </EntTile>
                <EntTile label="Starts">{fmtDate(lic.starts_at)}</EntTile>
                <EntTile label="Expires">{fmtDate(lic.expires_at)}</EntTile>
                <EntTile label="Days Left">{lic.days_remaining != null ? `${lic.days_remaining}d` : '—'}</EntTile>
              </div>
            </EntSection>

            {/* Identity */}
            <EntSection title="Identity">
              <div className="udd-ent-id-list">
                <EntIdRow label="User Email" value={lic.user_email} />
                <EntIdRow label="License ID" value={lic.license_id} />
                <EntIdRow label="User ID" value={lic.user_id} />
                <EntIdRow
                  label="Plan ID"
                  value={lic.subscription_plan_id}
                  onClick={() => { onClose(); navigateToPlan(lic.subscription_plan_id); }}
                />
              </div>
            </EntSection>

            {/* Meta */}
            <EntSection title="Meta">
              <div className="udd-ent-grid">
                <EntTile label="Created">{fmtDate(lic.created_at)}</EntTile>
                <EntTile label="Updated">{fmtDate(lic.updated_at)}</EntTile>
              </div>
            </EntSection>
          </div>
        )}

        <div className="udd-modal-actions">
          <button type="button" className="udd-btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Subscription action dialog (Cancel / Extend / Device / Activate) ── */
const SUB_ACTIONS = {
  cancel:      { title: 'Cancel Subscription', verb: 'Cancel Subscription', danger: true },
  extend:      { title: 'Extend Subscription', verb: 'Extend', needsDays: true },
  devicelimit: { title: 'Change Device Limit', verb: 'Update Limit', needsDevices: true },
  activate:    { title: 'Activate Subscription', verb: 'Activate' },
};

function SubActionDialog({ action, sub, presetDevices, onClose, onDone }) {
  const accessToken = useSelector((s) => s.auth.accessToken);
  const cfg = SUB_ACTIONS[action];
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('30');
  const [devices, setDevices] = useState(String(presetDevices ?? sub.max_devices ?? 1));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 3) { setErr('Reason must be at least 3 characters.'); return; }
    if (cfg.needsDays && (!days || Number(days) < 1 || Number(days) > 3650)) { setErr('Days must be between 1 and 3650.'); return; }
    if (cfg.needsDevices && (!devices || Number(devices) < 1 || Number(devices) > 50)) { setErr('Devices must be between 1 and 50.'); return; }
    setBusy(true); setErr('');
    try {
      if (action === 'cancel')           await apiCancelSubscription(accessToken, sub.id, reason.trim());
      else if (action === 'extend')      await apiExtendSubscription(accessToken, sub.id, Number(days), reason.trim());
      else if (action === 'devicelimit') await apiSetSubscriptionDeviceLimit(accessToken, sub.id, Number(devices), reason.trim());
      else if (action === 'activate')    await apiActivateSubscription(accessToken, sub.id, reason.trim());
      onDone();
    } catch (e2) {
      setErr(e2.message || 'Action failed.'); // surfaces 409/422/404 detail from the API
    } finally { setBusy(false); }
  };

  return (
    <div className="udd-modal-overlay udd-modal-overlay-top" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="udd-modal" onSubmit={submit}>
        <div className="udd-modal-header">
          <div className="udd-modal-title">{cfg.title}</div>
          <button type="button" className="udd-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <div className="udd-modal-grid">
          {cfg.needsDays && (
            <label className="udd-modal-field">
              <span>Extend by (days)</span>
              <input inputMode="numeric" value={days}
                onChange={(e) => setDays(e.target.value.replace(/[^\d]/g, ''))} disabled={busy} />
            </label>
          )}
          {cfg.needsDevices && (
            <label className="udd-modal-field">
              <span>Max devices (1–50)</span>
              <input inputMode="numeric" value={devices}
                onChange={(e) => setDevices(e.target.value.replace(/[^\d]/g, ''))} disabled={busy} />
            </label>
          )}
          <label className="udd-modal-field udd-field-full">
            <span>Reason <span className="udd-required">*</span></span>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="At least 3 characters — written to the audit log…" disabled={busy} />
          </label>
        </div>
        {err && <div className="udd-modal-error">{err}</div>}
        <div className="udd-modal-actions">
          <button type="button" className="udd-btn-cancel" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={`udd-btn-save${cfg.danger ? ' udd-btn-danger' : ''}`} disabled={busy}>
            {busy && <span className="udd-mini-spin" />}{busy ? 'Working…' : cfg.verb}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Subscription Detail popup (with actions) ───────────── */
function SubscriptionDetailModal({ items, onClose }) {
  const { selectedId, setSelectedId, detail: sub, loading, error, reload } =
    useEntityDetail(items, 'subscription_id', apiFetchSubscriptionDetail);
  const [action, setAction] = useState(null); // { type, presetDevices }

  const status = String(sub?.status || '').toLowerCase();
  const blocked = sub && (sub.user_blocked === true || String(sub.license_status).toLowerCase() === 'revoked');
  const maxDev = sub?.max_devices ?? 1;

  const openAction = (type, presetDevices) => setAction({ type, presetDevices });

  return (
    <div className="udd-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="udd-modal udd-modal-wide">
        <div className="udd-modal-header">
          <div className="udd-modal-title">Subscription Details</div>
          <button type="button" className="udd-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <ItemSelector items={items} idKey="subscription_id" value={selectedId} onChange={setSelectedId} />

        {!selectedId ? (
          <div className="udd-empty-section">No subscription to show.</div>
        ) : loading ? (
          <div className="udd-empty-section">Loading subscription…</div>
        ) : error ? (
          <div className="udd-modal-error">{error}</div>
        ) : !sub ? (
          <div className="udd-empty-section">No subscription found.</div>
        ) : (
          <div className="udd-ent">
            <div className="udd-ent-head">
              <div className="udd-ent-plan">
                <span className="udd-ent-plan-name">{sub.plan_name || '—'}</span>
                <span className={`udd-plan-badge ${String(sub.plan_type).toLowerCase() === 'free' ? 'trial' : 'paid'}`}>
                  {planTypeLabel(sub.plan_type)}
                </span>
              </div>
              <span className={`udd-status-pill ${entStatusClass(sub.status)}`}>{humanizeStatus(sub.status)}</span>
            </div>

            {blocked && (
              <div className="udd-ent-banner danger">
                <strong>User blocked · access revoked.</strong>
                <span>This user has been blocked; their access is revoked. Unblock from the user profile.</span>
              </div>
            )}

            {/* Headline: term end */}
            <div className="udd-ent-headline">Ends: {fmtDate(sub.current_period_end)}</div>

            {/* Primary actions (right under the headline) */}
            <div className="udd-ent-actions">
              {status === 'active' && (
                <button type="button" className="udd-ent-act danger" onClick={() => openAction('cancel')}>Cancel</button>
              )}
              {(status === 'active' || status === 'expired') && (
                <button type="button" className="udd-ent-act" onClick={() => openAction('extend')}>Extend</button>
              )}
              {status === 'cancelled' && (
                <button type="button" className="udd-ent-act" onClick={() => openAction('activate')}>Activate</button>
              )}
            </div>

            {/* Plan (plan_type · billing_cycle · max_devices ± control) */}
            <EntSection title="Plan">
              <div className="udd-ent-grid">
                <EntTile label="Plan Type">
                  <span className={`udd-plan-badge ${String(sub.plan_type).toLowerCase() === 'free' ? 'trial' : 'paid'}`}>
                    {planTypeLabel(sub.plan_type)}
                  </span>
                </EntTile>
                <EntTile label="Billing Cycle">{sub.billing_cycle || '—'}</EntTile>
                <div className="udd-ent-tile">
                  <span className="udd-ent-tile-label">Devices</span>
                  <div className="udd-ent-devices">
                    <button type="button" className="udd-step" title="Decrease"
                      disabled={status !== 'active' || maxDev <= 1}
                      onClick={() => openAction('devicelimit', Math.max(1, maxDev - 1))}>−</button>
                    <span className="udd-ent-devices-n">{sub.max_devices ?? '—'}</span>
                    <button type="button" className="udd-step" title="Increase"
                      disabled={status !== 'active' || maxDev >= 50}
                      onClick={() => openAction('devicelimit', Math.min(50, maxDev + 1))}>+</button>
                  </div>
                </div>
              </div>
            </EntSection>

            {/* Commercial state */}
            <EntSection title="Commercial State">
              <div className="udd-ent-grid">
                <EntTile label="Status">
                  <span className={`udd-status-pill ${entStatusClass(sub.status)}`}>{humanizeStatus(sub.status)}</span>
                </EntTile>
                <EntTile label="Started">{fmtDate(sub.current_period_start)}</EntTile>
                <EntTile label="Ends">{fmtDate(sub.current_period_end)}</EntTile>
                {status === 'cancelled' && <EntTile label="Cancelled">{fmtDate(sub.cancelled_at)}</EntTile>}
              </div>
              {status === 'cancelled' && sub.cancel_reason && (
                <div className="udd-ent-cancelled">Reason: {sub.cancel_reason}</div>
              )}
            </EntSection>

            {/* Identity */}
            <EntSection title="Identity">
              <div className="udd-ent-id-list">
                <EntIdRow label="User Email" value={sub.user_email} />
                <EntIdRow label="Subscription ID" value={sub.id} />
                <EntIdRow label="User ID" value={sub.user_id} />
                <EntIdRow
                  label="Plan ID"
                  value={sub.subscription_plan_id}
                  onClick={() => { onClose(); navigateToPlan(sub.subscription_plan_id); }}
                />
              </div>
            </EntSection>

            {/* Meta */}
            <EntSection title="Meta">
              <div className="udd-ent-grid">
                <EntTile label="Created">{fmtDate(sub.created_at)}</EntTile>
                <EntTile label="Updated">{fmtDate(sub.updated_at)}</EntTile>
              </div>
            </EntSection>
          </div>
        )}

        <div className="udd-modal-actions">
          <button type="button" className="udd-btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>

      {action && sub && (
        <SubActionDialog
          action={action.type}
          sub={sub}
          presetDevices={action.presetDevices}
          onClose={() => setAction(null)}
          onDone={() => { setAction(null); reload(); }}
        />
      )}
    </div>
  );
}

/* ── History changelog (shared: license + subscription) ─── */
const FIELD_LABELS = {
  status: 'Status', plan_type: 'Plan type', plan_name: 'Plan', plan: 'Plan',
  max_devices: 'Devices', max_concurrent_streams: 'Streams', billing_cycle: 'Cycle',
  expires_at: 'Expires', starts_at: 'Starts', current_period_end: 'Ends', duration_days: 'Duration',
};
const fieldLabel = (f) => FIELD_LABELS[f] || humanizeKey(f);

const fmtFieldVal = (field, v) => {
  if (v == null || v === '') return '—';
  if (field === 'plan_type') return planTypeLabel(v);
  if (/(_at|_date|expires|starts|period_end|period_start)/.test(field)) {
    const d = fmtDate(v); return d === '—' ? String(v) : d;
  }
  return String(v);
};

// Human labels for the common change_metadata keys.
const META_LABELS = { actor: 'Actor', reason: 'Reason', admin_id: 'Admin', note: 'Note', source: 'Source' };
const metaLabel = (k) => META_LABELS[k] || humanizeKey(k);
const isIdLike = (k) => /(actor|admin|_id$|^id$|uuid)/i.test(k);
const fmtMetaVal = (v) => {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}[T\s]/.test(v)) return fmt(v);
  return String(v);
};

// Renders change_metadata as clean labeled rows (scalars) + a raw block for any nested objects.
function ChangeMetaFields({ meta }) {
  if (meta == null) return null;
  if (typeof meta !== 'object') return <div className="udd-cl-meta-val">{String(meta)}</div>;
  const scalars = Object.entries(meta).filter(([, v]) => v != null && typeof v !== 'object');
  const nested = Object.entries(meta).filter(([, v]) => v && typeof v === 'object');
  if (!scalars.length && !nested.length) return <div className="udd-muted">No extra details.</div>;
  return (
    <div className="udd-cl-meta-fields">
      {scalars.map(([k, v]) => (
        <div className={`udd-cl-meta-row${isIdLike(k) ? ' wide' : ''}`} key={k}>
          <span className="udd-cl-meta-key">{metaLabel(k)}</span>
          <span className={`udd-cl-meta-value${isIdLike(k) ? ' mono' : ''}`}>{fmtMetaVal(v)}</span>
        </div>
      ))}
      {nested.map(([k, v]) => (
        <div className="udd-cl-meta-row wide" key={k}>
          <span className="udd-cl-meta-key">{metaLabel(k)}</span>
          <pre className="udd-hist-snap-pre">{prettySnapshot(v)}</pre>
        </div>
      ))}
    </div>
  );
}

// One changelog card: snapshot heading + changed_fields diff + reason/actor/when.
function ChangelogCard({ entry, variant }) {
  const [showMeta, setShowMeta] = useState(false);
  const isLicense = variant === 'license';
  const diffs = Array.isArray(entry.changed_fields) ? entry.changed_fields : [];
  const meta = entry.change_metadata;
  // Subscription history has no top-level actor yet, but change_metadata often carries one.
  const actor = entry.changed_by || meta?.actor;

  // Snapshot heading = only the fields present in this event, so missing ones (e.g. an
  // empty plan_name on the "created" row) don't leave a bare "—" with dangling separators.
  const headParts = [];
  if (entry.plan_name) headParts.push(<span className="udd-cl-plan">{entry.plan_name}</span>);
  if (isLicense && entry.expires_at) headParts.push(<span>expires {fmtDate(entry.expires_at)}</span>);
  if (entry.max_devices != null) headParts.push(<span>{entry.max_devices} devices</span>);

  return (
    <div className="udd-cl-card">
      <div className="udd-cl-head">
        <span className={`udd-status-pill ${entStatusClass(entry.status)}`}>{humanizeStatus(entry.status)}</span>
        {headParts.map((node, i) => (
          <Fragment key={i}>
            <span className="udd-cl-sep">·</span>
            {node}
          </Fragment>
        ))}
      </div>

      <div className="udd-cl-diff">
        {diffs.length === 0 ? (
          <span className="udd-cl-created">Created · first state</span>
        ) : diffs.map((d, i) => (
          <div className="udd-cl-diff-row" key={i}>
            <span className="udd-cl-field">{fieldLabel(d.field)}:</span>
            <span className="udd-cl-from">{fmtFieldVal(d.field, d.from)}</span>
            <span className="udd-cl-arrow">→</span>
            <span className="udd-cl-to">{fmtFieldVal(d.field, d.to)}</span>
          </div>
        ))}
      </div>

      <div className="udd-cl-meta">
        {entry.change_reason && <span className="udd-cl-reason">{entry.change_reason}</span>}
        {actor && <span className="udd-cl-by">· by <span className="udd-cl-actor" title={actor}>{actor}</span></span>}
        <span className="udd-cl-when">· {fmt(entry.changed_at)}</span>
      </div>

      {meta != null && (
        <div className="udd-hist-snapshot">
          <button type="button" className="udd-hist-snap-toggle" onClick={() => setShowMeta((s) => !s)}>
            {showMeta ? '▾ Hide details' : '▸ Details'}
          </button>
          {showMeta && <ChangeMetaFields meta={meta} />}
        </div>
      )}
    </div>
  );
}

// History viewer: fetches per-item changelog, with a selector when the user has more than one.
function ChangelogModal({ title, items = [], idKey, fetcher, variant, onClose }) {
  const accessToken = useSelector((s) => s.auth.accessToken);
  const [selectedId, setSelectedId] = useState(items[0]?.[idKey] || null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedId) return undefined;
    let alive = true;
    setLoading(true); setError(null);
    fetcher(accessToken, selectedId)
      .then((data) => { if (alive) setEntries(Array.isArray(data) ? data : []); })
      .catch((err) => { if (alive) setError(err.message || 'Failed to load history.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [selectedId, accessToken, fetcher]);

  return (
    <div className="udd-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="udd-modal udd-modal-wide">
        <div className="udd-modal-header">
          <div className="udd-modal-title">{title}</div>
          <button type="button" className="udd-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <ItemSelector items={items} idKey={idKey} value={selectedId} onChange={setSelectedId} />

        {!selectedId ? (
          <div className="udd-empty-section">Nothing to show history for.</div>
        ) : loading ? (
          <div className="udd-empty-section">Loading history…</div>
        ) : error ? (
          <div className="udd-modal-error">{error}</div>
        ) : entries.length === 0 ? (
          <div className="udd-empty-section">No history found.</div>
        ) : (
          <div className="udd-cl-list">
            {entries.map((e, i) => <ChangelogCard key={e.id || i} entry={e} variant={variant} />)}
          </div>
        )}

        <div className="udd-modal-actions">
          <button type="button" className="udd-btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

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

/* ── Flag for Review Modal ──────────────────────────────── */
const REVIEW_REASONS = [
  { value: 'suspicious_login_pattern', label: 'Suspicious Login Pattern' },
  { value: 'multiple_country_access', label: 'Multiple Country Access' },
  { value: 'high_failed_login_count', label: 'High Failed Login Count' },
  { value: 'account_sharing_suspected', label: 'Account Sharing Suspected' },
  { value: 'payment_fraud_suspected', label: 'Payment Fraud Suspected' },
  { value: 'unusual_activity_pattern', label: 'Unusual Activity Pattern' },
  { value: 'manual_review_requested', label: 'Manual Review Requested' },
];

function FlagReviewModal({ user, onClose }) {
  const dispatch = useDispatch();
  const { reviewLoading, reviewError, reviewSuccess } = useSelector((s) => s.appUsers);
  const [form, setForm] = useState({ reason: '', notes: '', priority: 'medium' });
  const [localError, setLocalError] = useState('');

  const set = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }));
    setLocalError('');
    if (reviewError) dispatch(clearReviewState());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.reason) { setLocalError('Reason is required.'); return; }
    dispatch(clearReviewState());
    dispatch(flagUserForReview({ userId: user.id, data: form }));
  };

  return (
    <div className="udd-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="udd-modal" onSubmit={handleSubmit}>
        <div className="udd-modal-header">
          <div className="udd-modal-title udd-modal-title-flag"><FlagIcon /> Flag for Security Review</div>
          <button type="button" className="udd-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <p className="udd-modal-sub">
          Flags this user for manual security review. User status is <strong>not</strong> changed.
          An audit log entry will be written.
        </p>

        <div className="udd-modal-grid">
          <label className="udd-modal-field udd-field-full">
            <span>Reason <span className="udd-required">*</span></span>
            <select value={form.reason} onChange={(e) => set('reason', e.target.value)} disabled={reviewLoading}>
              <option value="">Select a reason…</option>
              {REVIEW_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>

          <label className="udd-modal-field">
            <span>Priority</span>
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)} disabled={reviewLoading}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="udd-modal-field udd-field-full">
            <span>Notes (optional)</span>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="Additional context for the security team…"
              rows={3} disabled={reviewLoading} />
          </label>
        </div>

        {(localError || reviewError) && (
          <div className="udd-modal-error">{localError || reviewError}</div>
        )}
        {reviewSuccess && (
          <div className="udd-modal-success"><CheckIcon /> User flagged for security review.</div>
        )}

        <div className="udd-modal-actions">
          <button type="button" className="udd-btn-cancel" onClick={onClose} disabled={reviewLoading}>
            {reviewSuccess ? 'Close' : 'Cancel'}
          </button>
          <button type="submit" className="udd-btn-flag" disabled={reviewLoading || reviewSuccess}>
            {reviewLoading ? <span className="udd-mini-spin udd-mini-spin-dark" /> : <FlagIcon />}
            {reviewLoading ? 'Flagging…' : reviewSuccess ? 'Flagged' : 'Flag for Review'}
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
  const [showFlag, setShowFlag] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [showLicenses, setShowLicenses] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [showLicenseHistory, setShowLicenseHistory] = useState(false);
  const [showSubscriptionHistory, setShowSubscriptionHistory] = useState(false);

  // All hooks must run before any conditional return
  useEffect(() => {
    dispatch(fetchAppUserDetail(userId));
    return () => dispatch(clearSelectedUser());
  }, [dispatch, userId]);

  const handleCloseFlag = () => {
    dispatch(clearReviewState());
    setShowFlag(false);
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
          <BackIcon /> Back to App Users
        </button>
        {u && (
          <div className="udd-topbar-actions">
            <button className="udd-activity-btn" onClick={() => setShowActivity(true)}>
              <ActivityIcon /> Activity
            </button>
            <button className="udd-activity-btn" onClick={() => setShowLoginHistory(true)}>
              <LoginHistoryIcon /> Login History
            </button>
            <button
              className={`udd-flag-btn${u?.flagged_for_review ? ' flagged' : ''}`}
              onClick={() => setShowFlag(true)}
              title={u?.flagged_for_review ? `Flagged at ${fmt(u.flagged_at)}` : 'Flag for security review'}
            >
              <FlagIcon /> {u?.flagged_for_review ? 'Flagged' : 'Flag for Review'}
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
            {/* Left: identity */}
            <div className="udd-hero-left">
              <div className="udd-avatar">{initials(u.full_name)}</div>
              <div className="udd-hero-body">
                <div className="udd-hero-email">{u.email}</div>
                <div className="udd-hero-id" title={u.id}>ID: {u.id}</div>
                <div className="udd-hero-badges">
                  <span className={`udd-status-pill ${statusClass(u.status)}`}>{u.status}</span>
                  {u.email_verified && <span className="udd-badge green">Email Verified</span>}
                  {u.phone_verified && <span className="udd-badge green">Phone Verified</span>}
                  {u.trial_used && <span className="udd-badge amber">Trial Used</span>}
                  {u.is_locked && <span className="udd-badge red">Locked</span>}
                </div>
              </div>
            </div>

            {/* Right: quick actions */}
            <div className="udd-hero-actions">
              <button className="udd-action-btn" onClick={() => setShowSubscriptions(true)}>
                View Subscription
              </button>
              <button className="udd-action-btn" onClick={() => setShowSubscriptionHistory(true)}>
                View Subscription History
              </button>
              <button className="udd-action-btn" onClick={() => setShowLicenses(true)}>
                View Licenses
              </button>
              <button className="udd-action-btn" onClick={() => setShowLicenseHistory(true)}>
                View Licenses History
              </button>
            </div>
          </div>
          {/* ── Preferences ──────────────────────────────── */}
          {u.preferences && (
            <SectionCard title="Preferences">
              <div className="udd-pref-grid">
                <InfoRow label="Language" value={u.preferences.preferred_language} />
                <InfoRow label="Quality" value={u.preferences.preferred_quality} />
                <InfoRow label="Timezone" value={u.preferences.timezone} />
                <InfoRow label="Contact Method" value={u.preferences.preferred_contact_method} />
                <InfoRow label="Notifications" value={<BoolChip value={u.preferences.notifications_enabled} />} />
                <InfoRow label="Analytics Consent" value={<BoolChip value={u.preferences.analytics_consent} />} />
              </div>
            </SectionCard>
          )}
          {/* ── Row 1: Personal + Payment ─────────────────── */}
          <div className="udd-grid-2">
            <SectionCard title="Personal Info">
              <InfoRow label="Phone" value={u.phone_number} />
              <InfoRow label="Country" value={u.country_code} />
              <InfoRow label="Registered" value={fmtDate(u.created_at)} />
              <InfoRow label="Last Purchase" value={fmtDate(u.last_purchase_at)} />
              <InfoRow label="Days Since Purchase" value={u.days_since_last_purchase != null ? `${u.days_since_last_purchase} days` : '—'} />
              <InfoRow label="Trial Used At" value={u.trial_used ? fmt(u.trial_used_at) : 'No'} />
              <InfoRow label="Failed OTP" value={u.failed_otp_count ?? 0} />
              <InfoRow label="OTP Locked Until" value={u.otp_locked_until ? fmt(u.otp_locked_until) : 'Not locked'} />
            </SectionCard>

            <SectionCard title="Payment Info">
              {u.payment_info ? (
                <>
                  <InfoRow label="Has Payment Method" value={<BoolChip value={u.payment_info.has_payment_method} />} />
                  <InfoRow label="Card" value={u.payment_info.has_payment_method
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
                  <InfoRow label="Sessions" value={u.activity_summary.total_sessions_30d} />
                  <InfoRow label="Watch Hours" value={u.activity_summary.total_watch_hours_30d != null ? `${u.activity_summary.total_watch_hours_30d}h` : '—'} />
                  <InfoRow label="Last Watched" value={fmt(u.activity_summary.last_watched_at)} />
                  <InfoRow label="Last Content" value={u.activity_summary.last_content_title || '—'} />
                  <InfoRow label="Content Type" value={u.activity_summary.last_content_type || '—'} />
                  <InfoRow label="Quality" value={u.activity_summary.preferred_quality || '—'} />
                </>
              ) : (
                <div className="udd-empty-section">No activity data available.</div>
              )}
            </SectionCard>

            <SectionCard title="Security Summary (30d)">
              {u.security_summary ? (
                <>
                  <InfoRow label="Total Logins" value={u.security_summary.total_logins_30d} />
                  <InfoRow label="Failed Logins" value={u.security_summary.failed_logins_30d} />
                  <InfoRow label="Last Login IP" value={u.security_summary.last_login_ip || '—'} />
                  <InfoRow label="Last Country" value={u.security_summary.last_login_country || '—'} />
                  <InfoRow label="Unique Countries" value={u.security_summary.unique_countries_30d} />
                  <InfoRow label="Login Anomaly" value={<BoolChip value={u.security_summary.login_anomaly} yes="Detected" no="None" />} />
                </>
              ) : (
                <div className="udd-empty-section">No security data available.</div>
              )}
            </SectionCard>
          </div>

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

        </>
      )}

      {showFlag && u && (
        <FlagReviewModal user={u} onClose={handleCloseFlag} />
      )}
      {showLicenses && u && (
        <LicenseDetailModal
          items={u.licenses || []}
          onClose={() => setShowLicenses(false)}
        />
      )}
      {showSubscriptions && u && (
        <SubscriptionDetailModal
          items={u.subscriptions || []}
          onClose={() => setShowSubscriptions(false)}
        />
      )}
      {showLicenseHistory && u && (
        <ChangelogModal
          title="License History"
          items={u.licenses || []}
          idKey="license_id"
          fetcher={apiFetchLicenseHistory}
          variant="license"
          onClose={() => setShowLicenseHistory(false)}
        />
      )}
      {showSubscriptionHistory && u && (
        <ChangelogModal
          title="Subscription History"
          items={u.subscriptions || []}
          idKey="subscription_id"
          fetcher={apiFetchSubscriptionHistory}
          variant="subscription"
          onClose={() => setShowSubscriptionHistory(false)}
        />
      )}
    </div>
  );
}
