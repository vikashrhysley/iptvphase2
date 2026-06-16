import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlanDetail, clearPlanDetail, togglePlanStatus, clearToggleState } from '../../store/slices/plansSlice';
import { fmtDateTime } from '../Subscriptions/subscriptionsHelpers';
import './PlansPage.css';
import './PlanDetailPage.css';

/* ── Icons ─────────────────────────────────────────────── */
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const PowerIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>;

const planClass = (p) => {
  const v = (p || '').toLowerCase();
  if (v.includes('trial'))   return 'pp-type-trial';
  if (v.includes('life'))    return 'pp-type-lifetime';
  if (v.includes('premium') || v.includes('pro')) return 'pp-type-premium';
  return 'pp-type-default';
};

/* ── Detail Field ───────────────────────────────────────── */
function InfoField({ label, value, mono, full }) {
  return (
    <div className={`pdp-field${full ? ' pdp-field-full' : ''}`}>
      <span className="pdp-field-lbl">{label}</span>
      <span className={`pdp-field-val${mono ? ' sb-mono' : ''}`}>{value === null || value === undefined || value === '' ? '—' : value}</span>
    </div>
  );
}

/* ── Activate / Deactivate Plan Modal ────────────────────── */
function TogglePlanStatusModal({ plan, onClose }) {
  const dispatch = useDispatch();
  const { toggleLoading, toggleError, toggleSuccess } = useSelector((s) => s.plans);
  const activating = !plan.is_active;

  const handleConfirm = (e) => {
    e.preventDefault();
    dispatch(togglePlanStatus({ id: plan.id, isActive: activating }));
  };

  return (
    <div className="pdp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="pdp-modal" onSubmit={handleConfirm}>
        <div className="pdp-modal-header">
          <div className={`pdp-modal-title${activating ? '' : ' pdp-modal-title-danger'}`}><PowerIcon /> {activating ? 'Activate Plan' : 'Deactivate Plan'}</div>
          <button type="button" className="pdp-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <p className="pdp-modal-sub">
          {activating
            ? <>This will make <strong>{plan.name || plan.plan_code}</strong> available for new subscriptions again.</>
            : <>This will deactivate <strong>{plan.name || plan.plan_code}</strong>. It will no longer be available for new subscriptions, but existing subscribers are unaffected.</>}
        </p>

        {toggleError && (
          <div className="pdp-modal-error">{toggleError}</div>
        )}
        {toggleSuccess && (
          <div className="pdp-modal-success"><CheckIcon /> Plan {activating ? 'activated' : 'deactivated'} successfully.</div>
        )}

        <div className="pdp-modal-actions">
          <button type="button" className="pdp-btn-cancel" onClick={onClose} disabled={toggleLoading}>
            {toggleSuccess ? 'Close' : 'Cancel'}
          </button>
          <button type="submit" className={activating ? 'pdp-btn-save' : 'pdp-btn-danger'} disabled={toggleLoading || toggleSuccess}>
            {toggleLoading ? <span className="pdp-mini-spin" /> : <PowerIcon />}
            {toggleLoading ? 'Saving…' : toggleSuccess ? 'Done' : activating ? 'Activate Plan' : 'Deactivate Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */
export default function PlanDetailPage({ planId, onBack }) {
  const dispatch = useDispatch();
  const { selectedPlan: plan, detailLoading, detailError } = useSelector((s) => s.plans);
  const { user: me } = useSelector((s) => s.auth);
  const [showToggle, setShowToggle] = useState(false);
  const isSuperAdmin = me?.role === 'superadmin';

  useEffect(() => {
    dispatch(fetchPlanDetail(planId));
    return () => dispatch(clearPlanDetail());
  }, [dispatch, planId]);

  const handleCloseToggle = () => {
    dispatch(clearToggleState());
    setShowToggle(false);
  };

  const usage = plan?.usage_stats || {};
  const features = plan?.features || {};

  return (
    <div className="pdp-page">
      <div className="pdp-topbar">
        <button className="pdp-back-btn" onClick={onBack}><BackIcon /> Back to Plans</button>
        {plan && isSuperAdmin && (
          <div className="pdp-topbar-actions">
            <button className={plan.is_active ? 'pdp-deactivate-btn' : 'pdp-activate-btn'} onClick={() => setShowToggle(true)}>
              <PowerIcon /> {plan.is_active ? 'Deactivate Plan' : 'Activate Plan'}
            </button>
          </div>
        )}
      </div>

      {detailLoading && (
        <div className="pdp-loading">
          <span className="pdp-spinner" />
          <span>Loading plan…</span>
        </div>
      )}

      {detailError && !detailLoading && (
        <div className="pdp-error">{detailError}</div>
      )}

      {plan && !detailLoading && !detailError && (
        <>
          <div className="pdp-summary">
            <span className={`pp-type-pill ${planClass(plan.plan_type)}`}>{plan.plan_type || '—'}</span>
            {plan.is_default && <span className="pp-badge default">Default</span>}
            <span className={`pp-badge ${plan.is_active ? 'active' : 'inactive'}`}>{plan.is_active ? 'Active' : 'Inactive'}</span>
            <span className="pdp-summary-name">{plan.name || '—'}</span>
          </div>

          <div className="pdp-cards">
            <div className="pdp-section">
              <div className="pdp-sect-title">Plan Details</div>
              <div className="pdp-grid">
                <InfoField label="Plan ID" value={plan.id} mono full />
                <InfoField label="Plan Code" value={plan.plan_code} mono />
                <InfoField label="Plan Type" value={plan.plan_type} />
                <InfoField label="Billing Cycle" value={plan.billing_cycle} />
                <InfoField label="Amount" value={plan.amount_display != null ? `${plan.amount_display} ${plan.currency || ''}`.trim() : null} />
                <InfoField label="Amount (cents)" value={plan.amount_cents} mono />
                <InfoField label="Currency" value={plan.currency} />
                <InfoField label="Trial Days" value={plan.trial_days ?? 0} />
                <InfoField label="Created At" value={fmtDateTime(plan.created_at)} />
              </div>
            </div>

            <div className="pdp-section">
              <div className="pdp-sect-title">Limits & Features</div>
              <div className="pdp-grid">
                <InfoField label="Max Devices" value={plan.max_devices ?? '—'} />
                <InfoField label="Max Concurrent Streams" value={plan.max_concurrent_streams ?? '—'} />
                <InfoField label="Device Limit Policy" value={plan.device_limit_policy} />
                <InfoField label="Requires Payment Method" value={plan.requires_payment_method ? 'Yes' : 'No'} />
                <InfoField label="HD" value={
                  <span className={`pp-feature-chip ${features.hd ? 'on' : 'off'}`}>{features.hd ? <CheckIcon/> : <XIcon/>} HD</span>
                } />
                <InfoField label="4K" value={
                  <span className={`pp-feature-chip ${features['4k'] ? 'on' : 'off'}`}>{features['4k'] ? <CheckIcon/> : <XIcon/>} 4K</span>
                } />
              </div>
            </div>

            <div className="pdp-section pdp-section-full">
              <div className="pdp-sect-title">Usage Stats</div>
              <div className="pdp-grid">
                <InfoField label="Active Licenses" value={(usage.active_licenses ?? plan.active_licenses ?? 0).toLocaleString()} />
                <InfoField label="Total Licenses Ever" value={(usage.total_licenses_ever ?? 0).toLocaleString()} />
                <InfoField label="Revenue (30d)" value={usage.revenue_30d_cents != null ? `${(usage.revenue_30d_cents / 100).toFixed(2)} ${plan.currency || ''}`.trim() : '—'} />
              </div>
            </div>
          </div>
        </>
      )}

      {showToggle && plan && (
        <TogglePlanStatusModal plan={plan} onClose={handleCloseToggle} />
      )}
    </div>
  );
}
