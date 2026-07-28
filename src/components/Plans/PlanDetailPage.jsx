import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlanDetail, clearPlanDetail, togglePlanStatus, clearToggleState, updatePlan, clearUpdateState } from '../../store/slices/plansSlice';
import { fmtDateTime } from '../Subscriptions/subscriptionsHelpers';
import {
  AMOUNT_MAX, isAmountInputAllowed, isIntegerInputAllowed,
  blockNonNumericKeys, blockIntegerKeys, validateAmount, validateInteger,
} from './planFormFields';
import './PlansPage.css';
import './PlanDetailPage.css';
import toast from "react-hot-toast";

/* ── Icons ─────────────────────────────────────────────── */
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>;
const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>;
const XIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const PowerIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;

const planClass = (p) => {
  const v = (p || '').toLowerCase();
  if (v === 'free' || v.includes('trial')) return 'pp-type-trial';
  return 'pp-type-premium';
};

// plan_type is 'free' | 'paid' on the wire; shown as Trial / Paid.
const planTypeLabel = (type) => {
  const v = String(type || '').toLowerCase();
  if (v === 'free') return 'Trial';
  if (v === 'paid') return 'Paid';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : '—';
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

/* ── Edit Plan Modal ─────────────────────────────────────── */
function EditPlanModal({ plan, onClose }) {
  const dispatch = useDispatch();
  const { updateLoading, updateError, updateSuccess } = useSelector((s) => s.plans);
  const features = plan.features || {};

  const initAmount = plan.amount != null
    ? String(plan.amount)
    : plan.amount_cents != null
      ? (plan.amount_cents / 100).toFixed(2)
      : '';

  // plan_type / plan_code / billing_cycle are immutable — shown read-only, never edited.
  const isTrial = plan.plan_type === 'free';

  const [form, setForm] = useState({
    name: plan.name || '',
    description: plan.description || '',
    amount: initAmount,
    currency: plan.currency || 'USD',
    duration_days: plan.duration_days != null ? String(plan.duration_days) : '',
    max_devices: plan.max_devices ?? 1,
    max_concurrent_streams: plan.max_concurrent_streams ?? 1,
    hd: !!features.hd,
    fourk: !!features['4k'],
    requires_payment_method: plan.requires_payment_method ?? true,
    authorization_type: plan.authorization_type || 'setup_intent',
    requires_phone_verify: plan.requires_phone_verify ?? true,
    is_default: plan.is_default ?? false,
    reason: '',
  });
  const [localError, setLocalError] = useState('');

  const set = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }));
    setLocalError('');
    if (updateError) dispatch(clearUpdateState());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.reason.trim()) { setLocalError('Reason is required for the audit log.'); return; }
    const fieldError = validateAmount(form.amount)
      || validateInteger(form.duration_days, 'Duration (days)', 365)
      || validateInteger(form.max_devices, 'Max devices', 100)
      || validateInteger(form.max_concurrent_streams, 'Max concurrent streams', 10);
    if (fieldError) { setLocalError(fieldError); return; }

    // NOTE: plan_type / plan_code / billing_cycle are immutable and device_limit_policy is
    // not a backend field — none are sent.
    const payload = { reason: form.reason.trim() };
    if (form.name.trim() !== (plan.name || '')) payload.name = form.name.trim();
    if (form.description.trim() !== (plan.description || '')) payload.description = form.description.trim();
    if (form.amount !== '' && Number(form.amount) !== Number(initAmount)) payload.amount = Number(form.amount);
    if (form.currency.trim().toUpperCase() !== (plan.currency || '')) payload.currency = form.currency.trim().toUpperCase();
    if (form.duration_days !== '' && Number(form.duration_days) !== plan.duration_days) payload.duration_days = Number(form.duration_days);
    if (Number(form.max_devices) !== plan.max_devices) payload.max_devices = Number(form.max_devices);
    if (Number(form.max_concurrent_streams) !== plan.max_concurrent_streams) payload.max_concurrent_streams = Number(form.max_concurrent_streams);
    if (form.requires_payment_method !== (plan.requires_payment_method ?? true)) payload.requires_payment_method = form.requires_payment_method;
    if (form.authorization_type !== (plan.authorization_type || 'setup_intent')) payload.authorization_type = form.authorization_type;
    if (form.requires_phone_verify !== (plan.requires_phone_verify ?? true)) payload.requires_phone_verify = form.requires_phone_verify;
    if (form.is_default !== (plan.is_default ?? false)) payload.is_default = form.is_default;

    const newFeatures = { hd: form.hd, '4k': form.fourk };
    if (form.hd !== !!features.hd || form.fourk !== !!features['4k']) payload.features = newFeatures;

    if (Object.keys(payload).length === 1) { setLocalError('Change at least one field before saving.'); return; }

    dispatch(clearUpdateState());
    dispatch(updatePlan({ id: plan.id, data: payload }));
  };

  return (
    <div className="pdp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="pdp-modal pdp-edit-modal" onSubmit={handleSubmit}>
        <div className="pdp-modal-header">
          <div className="pdp-modal-title"><EditIcon /> Edit Plan</div>
          <button type="button" className="pdp-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <p className="pdp-modal-sub">plan_code and plan_type are immutable and cannot be changed.</p>

        <div className="pdp-edit-grid">
          {/* Immutable identifiers — read-only */}
          <label className="pdp-edit-field">
            <span>Plan Type</span>
            <input value={planTypeLabel(plan.plan_type)} disabled readOnly />
          </label>
          <label className="pdp-edit-field">
            <span>Plan Code</span>
            <input value={plan.plan_code || '—'} disabled readOnly />
          </label>
          <label className="pdp-edit-field">
            <span>Billing Cycle</span>
            <input value={plan.billing_cycle || '—'} disabled readOnly />
          </label>

          {/* Name */}
          <label className="pdp-edit-field pdp-edit-full">
            <span>Name</span>
            <input value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="Display name" disabled={updateLoading} />
          </label>

          {/* Amount */}
          <label className="pdp-edit-field">
            <span>Amount ($)</span>
            <input type="number" min={0} max={AMOUNT_MAX} step="0.01" value={form.amount}
              onChange={(e) => isAmountInputAllowed(e.target.value) && set('amount', e.target.value)}
              onKeyDown={blockNonNumericKeys} placeholder="9.99" disabled={updateLoading} />
          </label>

          {/* Currency */}
          <label className="pdp-edit-field">
            <span>Currency</span>
            <input value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())}
              placeholder="USD" maxLength={3} disabled={updateLoading} />
          </label>

          {/* Duration (days) */}
          <label className="pdp-edit-field">
            <span>Duration (days)</span>
            <input type="number" min={0} max={365} value={form.duration_days}
              onChange={(e) => isIntegerInputAllowed(e.target.value, 365) && set('duration_days', e.target.value)}
              onKeyDown={blockIntegerKeys} placeholder="7" disabled={updateLoading} />
          </label>

          {/* Max devices */}
          <label className="pdp-edit-field">
            <span>Max Devices</span>
            <input type="number" min={0} max={100} value={form.max_devices}
              onChange={(e) => isIntegerInputAllowed(e.target.value, 100) && set('max_devices', e.target.value)}
              onKeyDown={blockIntegerKeys} disabled={updateLoading} />
          </label>

          {/* Max concurrent streams */}
          <label className="pdp-edit-field">
            <span>Max Concurrent Streams</span>
            <input type="number" min={0} max={10} value={form.max_concurrent_streams}
              onChange={(e) => isIntegerInputAllowed(e.target.value, 10) && set('max_concurrent_streams', e.target.value)}
              onKeyDown={blockIntegerKeys} disabled={updateLoading} />
          </label>

          {/* Authorization type */}
          <label className="pdp-edit-field">
            <span>Authorization Type</span>
            <select value={form.authorization_type} onChange={(e) => set('authorization_type', e.target.value)} disabled={updateLoading}>
              <option value="setup_intent">Setup Intent</option>
              <option value="auth_hold">Auth Hold</option>
            </select>
          </label>

          {/* Description */}
          <label className="pdp-edit-field pdp-edit-full">
            <span>Description</span>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="Human-readable description…" rows={2} disabled={updateLoading} />
          </label>

          {/* Checkboxes */}
          <div className="pdp-edit-checks pdp-edit-full">
            <label className="pdp-check-label">
              <input type="checkbox" checked={form.requires_payment_method}
                onChange={(e) => set('requires_payment_method', e.target.checked)} disabled={updateLoading} />
              Requires Payment Method
            </label>
            <label className="pdp-check-label">
              <input type="checkbox" checked={form.requires_phone_verify}
                onChange={(e) => set('requires_phone_verify', e.target.checked)} disabled={updateLoading} />
              Requires Phone Verification
            </label>
            <label className="pdp-check-label">
              <input type="checkbox" checked={form.hd}
                onChange={(e) => set('hd', e.target.checked)} disabled={updateLoading} />
              HD
            </label>
            <label className="pdp-check-label">
              <input type="checkbox" checked={form.fourk}
                onChange={(e) => set('fourk', e.target.checked)} disabled={updateLoading} />
              4K
            </label>
            {/* Default: editable for Paid; for a Trial it is always the default — shown locked. */}
            <label className="pdp-check-label" title={isTrial ? 'The trial plan is always the default free plan.' : undefined}>
              <input type="checkbox" checked={isTrial ? true : form.is_default}
                onChange={(e) => set('is_default', e.target.checked)} disabled={updateLoading || isTrial} />
              {isTrial ? 'Default Trial Plan' : 'Set as Default Paid Plan'}
            </label>
          </div>

          {/* Reason (required) */}
          <label className="pdp-edit-field pdp-edit-full">
            <span>Reason <span className="pdp-required">*</span></span>
            <textarea value={form.reason} onChange={(e) => set('reason', e.target.value)}
              placeholder="Describe why this change is being made…" rows={3} disabled={updateLoading} />
          </label>
        </div>

        {(localError || updateError) && (
          <div className="pdp-modal-error">{localError || updateError}</div>
        )}
        {updateSuccess && (
          <div className="pdp-modal-success"><CheckIcon /> Plan updated successfully.</div>
        )}

        <div className="pdp-modal-actions">
          <button type="button" className="pdp-btn-cancel" onClick={onClose} disabled={updateLoading}>
            {updateSuccess ? 'Close' : 'Cancel'}
          </button>
          <button type="submit" className="pdp-btn-save" disabled={updateLoading || updateSuccess}>
            {updateLoading ? <span className="pdp-mini-spin" /> : <EditIcon />}
            {updateLoading ? 'Saving…' : updateSuccess ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </form>
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

  useEffect(() => {
    if (toggleSuccess) {
      onClose()
      toast.success(
        `Plan ${activating ? "deactivated" : "activated"} successfully`
      );
    }

  }, [toggleSuccess])

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
  const [showEdit, setShowEdit] = useState(false);
  const isSuperAdmin = me?.role === 'superadmin';

  useEffect(() => {
    dispatch(fetchPlanDetail(planId));
    return () => dispatch(clearPlanDetail());
  }, [dispatch, planId]);

  const handleCloseToggle = () => {
    console.log(6777, "hello .....")
    dispatch(clearToggleState());
    setShowToggle(false);
  };

  const handleCloseEdit = () => {
    dispatch(clearUpdateState());
    setShowEdit(false);
  };

  const usage = plan?.usage_stats || {};
  const features = plan?.features || {};

  return (
    <div className="pdp-page">
      <div className="pdp-topbar">
        <button className="pdp-back-btn" onClick={onBack}><BackIcon /> Back to Plans</button>
        {plan && isSuperAdmin && (
          <div className="pdp-topbar-actions">
            <button className="pdp-edit-btn" onClick={() => setShowEdit(true)}>
              <EditIcon /> Edit Plan
            </button>
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
            <span className={`pp-type-pill ${planClass(plan.plan_type)}`}>{planTypeLabel(plan.plan_type)}</span>
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
                <InfoField label="Plan Type" value={planTypeLabel(plan.plan_type)} />
                <InfoField label="Billing Cycle" value={plan.billing_cycle} />
                <InfoField label="Amount" value={plan.amount_display != null ? `${plan.amount_display} ${plan.currency || ''}`.trim() : null} />
                <InfoField label="Amount (cents)" value={plan.amount_cents} mono />
                <InfoField label="Currency" value={plan.currency} />
                <InfoField label="Duration (days)" value={plan.duration_days ?? 0} />
                <InfoField label="Created At" value={fmtDateTime(plan.created_at)} />
              </div>
            </div>

            <div className="pdp-section">
              <div className="pdp-sect-title">Limits & Features</div>
              <div className="pdp-grid">
                <InfoField label="Max Devices" value={plan.max_devices ?? '—'} />
                <InfoField label="Max Concurrent Streams" value={plan.max_concurrent_streams ?? '—'} />
                <InfoField label="Requires Payment Method" value={plan.requires_payment_method ? 'Yes' : 'No'} />
                <InfoField label="HD" value={
                  <span className={`pp-feature-chip ${features.hd ? 'on' : 'off'}`}>{features.hd ? <CheckIcon /> : <XIcon />} HD</span>
                } />
                <InfoField label="4K" value={
                  <span className={`pp-feature-chip ${features['4k'] ? 'on' : 'off'}`}>{features['4k'] ? <CheckIcon /> : <XIcon />} 4K</span>
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

      {showEdit && plan && <EditPlanModal plan={plan} onClose={handleCloseEdit} />}
      {showToggle && plan && <TogglePlanStatusModal plan={plan} onClose={handleCloseToggle} />}
    </div>
  );
}
