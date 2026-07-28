import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSubscriptionPlans, createPlan, clearCreateState } from '../../store/slices/plansSlice';
import PlanDetailPage from './PlanDetailPage';
import {
  AMOUNT_MAX, isAmountInputAllowed, isIntegerInputAllowed,
  blockNonNumericKeys, blockIntegerKeys, validateAmount, validateInteger,
} from './planFormFields';
import './PlansPage.css';

/* ── Icons ─────────────────────────────────────────────── */
const CheckIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon      = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const PlusIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

/* ── Helpers ────────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; }
};

// plan_type is strictly 'free' | 'paid' on the wire. Display mapping is UI-only:
// free -> "Trial" (the single default trial plan), paid -> "Paid".
const planTypeLabel = (type) => {
  const v = String(type || '').toLowerCase();
  if (v === 'free') return 'Trial';
  if (v === 'paid') return 'Paid';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : '—';
};

const planClass = (p) => {
  const v = (p || '').toLowerCase();
  if (v === 'free' || v.includes('trial')) return 'pp-type-trial';
  return 'pp-type-premium';
};

/* ── Create Plan Modal ──────────────────────────────────── */
// plan_type defaults to 'paid' — the trial is a one-time setup and its option is
// disabled once an active trial exists.
const EMPTY_FORM = {
  name: '', plan_code: '', description: '', plan_type: 'paid',
  billing_cycle: 'monthly', amount: '', currency: 'USD', duration_days: '',
  max_devices: 1, max_concurrent_streams: 1,
  hd: false, fourk: false,
  requires_payment_method: true,
  authorization_type: 'setup_intent', requires_phone_verify: true, is_default: false,
};

function CreatePlanModal({ onClose, hasActiveTrial }) {
  const dispatch = useDispatch();
  const { createLoading, createError, createSuccess } = useSelector((s) => s.plans);
  const [form, setForm] = useState(EMPTY_FORM);
  const [localError, setLocalError] = useState('');

  const isTrial = form.plan_type === 'free';

  const set = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }));
    setLocalError('');
    if (createError) dispatch(clearCreateState());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.plan_code.trim()) { setLocalError('Plan code is required.'); return; }
    if (!/^[a-z0-9_]+$/.test(form.plan_code.trim())) { setLocalError('Plan code must be lowercase letters, numbers and underscores only.'); return; }

    const durationError = validateInteger(form.duration_days, 'Duration (days)', 365);
    const limitsError = validateInteger(form.max_devices, 'Max devices', 100)
      || validateInteger(form.max_concurrent_streams, 'Max concurrent streams', 10);
    if (limitsError) { setLocalError(limitsError); return; }

    // Fields shared by both plan types.
    const payload = {
      plan_code:              form.plan_code.trim(),
      plan_type:              form.plan_type,
      requires_phone_verify:  form.requires_phone_verify,
      max_devices:            Number(form.max_devices),
      max_concurrent_streams: Number(form.max_concurrent_streams),
      features:               { hd: form.hd, '4k': form.fourk },
      // NOTE: device_limit_policy is intentionally NOT sent — it is not a backend field.
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.currency.trim())    payload.currency   = form.currency.trim().toUpperCase();

    if (isTrial) {
      // Trial: the backend force-shapes these regardless, so mirror them explicitly.
      if (form.duration_days === '') { setLocalError('Duration is required for a Trial.'); return; }
      if (durationError) { setLocalError(durationError); return; }
      if (Number(form.duration_days) < 1) { setLocalError('A Trial must last at least 1 day.'); return; }
      const n = Number(form.duration_days);
      payload.name = `Trial (${n} day${n === 1 ? '' : 's'})`;
      payload.amount = 0;
      payload.billing_cycle = 'once';
      payload.duration_days = n;
      payload.requires_payment_method = false;
      payload.is_default = true;
    } else {
      // Paid plan.
      if (!form.name.trim()) { setLocalError('Name is required.'); return; }
      if (form.amount === '') { setLocalError('Amount is required.'); return; }
      const amountError = validateAmount(form.amount);
      if (amountError) { setLocalError(amountError); return; }
      if (Number(form.amount) <= 0) { setLocalError('A paid plan amount must be greater than 0.'); return; }
      if (durationError) { setLocalError(durationError); return; }
      payload.name = form.name.trim();
      payload.amount = Number(form.amount);
      payload.billing_cycle = form.billing_cycle;
      payload.requires_payment_method = form.requires_payment_method;
      payload.authorization_type = form.authorization_type;
      payload.is_default = form.is_default;
      if (form.duration_days !== '') payload.duration_days = Number(form.duration_days);
    }

    dispatch(clearCreateState());
    dispatch(createPlan(payload));
  };

  return (
    <div className="pp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="pp-modal" onSubmit={handleSubmit}>
        <div className="pp-modal-header">
          <div className="pp-modal-title"><PlusIcon /> Create Subscription Plan</div>
          <button type="button" className="pp-modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <p className="pp-modal-sub">Plan code is immutable after creation and must be globally unique.</p>

        <div className="pp-modal-grid">
          {/* Plan type — strictly Trial (free) / Paid (paid) */}
          <label className="pp-modal-field">
            <span>Plan Type <span className="pp-required">*</span></span>
            <select value={form.plan_type} onChange={(e) => set('plan_type', e.target.value)} disabled={createLoading}>
              <option value="free" disabled={hasActiveTrial}
                title={hasActiveTrial ? 'A trial plan already exists — deactivate it first.' : undefined}>
                Trial{hasActiveTrial ? ' (already exists)' : ''}
              </option>
              <option value="paid">Paid</option>
            </select>
          </label>

          {/* Plan code */}
          <label className="pp-modal-field">
            <span>Plan Code <span className="pp-required">*</span></span>
            <input value={form.plan_code} onChange={(e) => set('plan_code', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="monthly_basic" disabled={createLoading} />
          </label>

          {/* Name — free text for Paid; auto-generated & locked for Trial */}
          <label className="pp-modal-field pp-field-full">
            <span>Name {!isTrial && <span className="pp-required">*</span>}</span>
            {isTrial ? (
              <input value={form.duration_days ? `Trial (${form.duration_days} day${Number(form.duration_days) === 1 ? '' : 's'})` : 'Trial'}
                disabled readOnly title="Auto-generated from the duration" />
            ) : (
              <input value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="Monthly Basic" disabled={createLoading} />
            )}
          </label>

          {/* Currency */}
          <label className="pp-modal-field">
            <span>Currency</span>
            <input value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())}
              placeholder="USD" maxLength={3} disabled={createLoading} />
          </label>

          {/* Billing cycle — Paid only (Trial is forced to 'once') */}
          {!isTrial && (
            <label className="pp-modal-field">
              <span>Billing Cycle <span className="pp-required">*</span></span>
              <select value={form.billing_cycle === 'once' ? 'monthly' : form.billing_cycle}
                onChange={(e) => set('billing_cycle', e.target.value)} disabled={createLoading}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </label>
          )}

          {/* Amount — forced 0 & locked for Trial */}
          <label className="pp-modal-field">
            <span>Amount ($) {!isTrial && <span className="pp-required">*</span>}</span>
            {isTrial ? (
              <input value="0.00" disabled readOnly title="Trial plans are free" />
            ) : (
              <input type="number" min={0} max={AMOUNT_MAX} step="0.01" value={form.amount}
                onChange={(e) => isAmountInputAllowed(e.target.value) && set('amount', e.target.value)}
                onKeyDown={blockNonNumericKeys} placeholder="9.99" disabled={createLoading} />
            )}
          </label>

          {/* Duration (days) — required for Trial, optional for Paid */}
          {isTrial && (
            <label className="pp-modal-field">
              <span>Duration (days) <span className="pp-required">*</span></span>
              <input type="number" min={1} max={365} value={form.duration_days}
                onChange={(e) => isIntegerInputAllowed(e.target.value, 365) && set('duration_days', e.target.value)}
                onKeyDown={blockIntegerKeys} placeholder="7" disabled={createLoading} />
            </label>
          )}

          {/* Max devices */}
          <label className="pp-modal-field">
            <span>Max Devices</span>
            <input type="number" min={0} max={100} value={form.max_devices}
              onChange={(e) => isIntegerInputAllowed(e.target.value, 100) && set('max_devices', e.target.value)}
              onKeyDown={blockIntegerKeys} disabled={createLoading} />
          </label>

          {/* Max concurrent streams */}
          <label className="pp-modal-field">
            <span>Max Concurrent Streams</span>
            <input type="number" min={0} max={10} value={form.max_concurrent_streams}
              onChange={(e) => isIntegerInputAllowed(e.target.value, 10) && set('max_concurrent_streams', e.target.value)}
              onKeyDown={blockIntegerKeys} disabled={createLoading} />
          </label>

          {/* Authorization type — Paid only (no payment on a Trial) */}
          {!isTrial && (
            <label className="pp-modal-field">
              <span>Authorization Type</span>
              <select value={form.authorization_type} onChange={(e) => set('authorization_type', e.target.value)} disabled={createLoading}>
                <option value="setup_intent">Setup Intent</option>
                <option value="auth_hold">Auth Hold</option>
              </select>
            </label>
          )}

          {/* Description */}
          <label className="pp-modal-field pp-field-full">
            <span>Description</span>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="Human-readable description…" rows={2} disabled={createLoading} />
          </label>

          {/* Checkboxes row */}
          <div className="pp-modal-checks pp-field-full">
            {/* Requires payment method — Paid only (Trial forces false) */}
            {!isTrial && (
              <label className="pp-check-label">
                <input type="checkbox" checked={form.requires_payment_method}
                  onChange={(e) => set('requires_payment_method', e.target.checked)} disabled={createLoading} />
                Requires Payment Method
              </label>
            )}
            <label className="pp-check-label">
              <input type="checkbox" checked={form.requires_phone_verify}
                onChange={(e) => set('requires_phone_verify', e.target.checked)} disabled={createLoading} />
              Requires Phone Verification
            </label>
            <label className="pp-check-label">
              <input type="checkbox" checked={form.hd}
                onChange={(e) => set('hd', e.target.checked)} disabled={createLoading} />
              HD
            </label>
            <label className="pp-check-label">
              <input type="checkbox" checked={form.fourk}
                onChange={(e) => set('fourk', e.target.checked)} disabled={createLoading} />
              4K
            </label>
            {/* Default toggle — Paid only (a Trial is always the default free plan) */}
            {!isTrial && (
              <label className="pp-check-label">
                <input type="checkbox" checked={form.is_default}
                  onChange={(e) => set('is_default', e.target.checked)} disabled={createLoading} />
                Set as Default Paid Plan
              </label>
            )}
          </div>
        </div>

        {(localError || createError) && (
          <div className="pp-modal-error">{localError || createError}</div>
        )}
        {createSuccess && (
          <div className="pp-modal-success"><CheckIcon /> Plan created successfully.</div>
        )}

        <div className="pp-modal-actions">
          <button type="button" className="pp-btn-cancel" onClick={onClose} disabled={createLoading}>
            {createSuccess ? 'Close' : 'Cancel'}
          </button>
          <button type="submit" className="pp-btn-save" disabled={createLoading || createSuccess}>
            {createLoading ? <span className="pp-mini-spin" /> : <PlusIcon />}
            {createLoading ? 'Creating…' : createSuccess ? 'Created' : 'Create Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Plan Card ──────────────────────────────────────────── */
function PlanCard({ plan, onClick }) {
  const features = plan.features || {};
  const hd   = !!features.hd;
  const four = !!features['4k'];

  return (
    <div className={`pp-card${!plan.is_active ? ' inactive' : ''}`} onClick={onClick} role="button" tabIndex={0}>
      <div className="pp-card-top">
        <span className={`pp-type-pill ${planClass(plan.plan_type)}`}>{planTypeLabel(plan.plan_type)}</span>
        <div className="pp-badges">
          {plan.is_default && <span className="pp-badge default">Default</span>}
          <span className={`pp-badge ${plan.is_active ? 'active' : 'inactive'}`}>{plan.is_active ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      <div className="pp-name">{plan.name || '—'}</div>
      <div className="pp-code">{plan.plan_code}</div>

      <div className="pp-price">
        <span className="pp-price-amount">{plan.amount_display ?? '—'}</span>
        {plan.billing_cycle && <span className="pp-price-cycle">/ {plan.billing_cycle}</span>}
        {plan.currency && <span className="pp-price-currency">{plan.currency}</span>}
      </div>

      <div className="pp-licenses">
        <div className="pp-licenses-value">{(plan.active_licenses ?? 0).toLocaleString()}</div>
        <div className="pp-licenses-label">Active Licenses</div>
      </div>

      <div className="pp-features">
        <span className={`pp-feature-chip ${hd ? 'on' : 'off'}`}>{hd ? <CheckIcon/> : <XIcon/>} HD</span>
        <span className={`pp-feature-chip ${four ? 'on' : 'off'}`}>{four ? <CheckIcon/> : <XIcon/>} 4K</span>
      </div>

      <div className="pp-limits">
        <div className="pp-limit-row"><span>Max Devices</span><strong>{plan.max_devices ?? '—'}</strong></div>
        <div className="pp-limit-row"><span>Max Streams</span><strong>{plan.max_concurrent_streams ?? '—'}</strong></div>
        <div className="pp-limit-row"><span>Duration (days)</span><strong>{plan.duration_days ?? 0}</strong></div>
        <div className="pp-limit-row"><span>Payment Required</span><strong>{plan.requires_payment_method ? 'Yes' : 'No'}</strong></div>
      </div>

      <div className="pp-footer">Created {fmtDate(plan.created_at)}</div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
export default function PlansPage() {
  const dispatch = useDispatch();
  const { plans, loading, error } = useSelector((s) => s.plans);
  const { user: me } = useSelector((s) => s.auth);
  const isSuperAdmin = me?.role === 'superadmin';
  const [detailPlanId, setDetailPlanId] = useState(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [search,       setSearch]       = useState('');
  const [planType,     setPlanType]     = useState('all');
  const [status,       setStatus]       = useState('all');

  // Active trial gate: only one active free/trial plan may exist at a time.
  const hasActiveTrial = useMemo(
    () => plans.some(p => p.is_active && p.plan_type === 'free'),
    [plans]
  );

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plans.filter(plan => {
      if (planType !== 'all' && plan.plan_type !== planType) return false;
      if (status !== 'all' && !!plan.is_active !== (status === 'active')) return false;
      if (query && !(plan.name || '').toLowerCase().includes(query)) return false;
      return true;
    });
  }, [plans, search, planType, status]);

  useEffect(() => { dispatch(fetchSubscriptionPlans()); }, [dispatch]);

  const handleCloseCreate = () => {
    dispatch(clearCreateState());
    setShowCreate(false);
  };

  if (detailPlanId) return <PlanDetailPage planId={detailPlanId} onBack={() => setDetailPlanId(null)} />;

  const totalPlans  = plans.length;
  const activePlans = plans.filter(p => p.is_active).length;
  const totalActiveLicenses = plans.reduce((sum, p) => sum + (p.active_licenses || 0), 0);

  return (
    <>
    {showCreate && <CreatePlanModal onClose={handleCloseCreate} hasActiveTrial={hasActiveTrial} />}
    <div className="pp-page">
      {/* ── Header ── */}
      <div className="pp-header">
        <div>
          <h1 className="pp-title">Subscription Plans</h1>
          <div className="pp-subtitle">Plan definitions, pricing and active license counts.</div>
        </div>
        {isSuperAdmin && (
          <button className="pp-create-btn" onClick={() => setShowCreate(true)}>
            <PlusIcon /> Create Plan
          </button>
        )}
      </div>

      {/* ── Summary stats ── */}
      {!loading && !error && plans.length > 0 && (
        <div className="pp-stats-row">
          <div className="pp-stat-card" style={{ '--psc': '#00d4ff' }}>
            <div className="pp-stat-accent" />
            <div className="pp-stat-value">{totalPlans.toLocaleString()}</div>
            <div className="pp-stat-label">Total Plans</div>
          </div>
          <div className="pp-stat-card" style={{ '--psc': '#10b981' }}>
            <div className="pp-stat-accent" />
            <div className="pp-stat-value">{activePlans.toLocaleString()}</div>
            <div className="pp-stat-label">Active Plans</div>
          </div>
          <div className="pp-stat-card" style={{ '--psc': '#a78bfa' }}>
            <div className="pp-stat-accent" />
            <div className="pp-stat-value">{totalActiveLicenses.toLocaleString()}</div>
            <div className="pp-stat-label">Total Active Licenses</div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      {!loading && !error && plans.length > 0 && (
        <div className="pp-toolbar">
          <div className="pp-search-wrap">
            <label htmlFor="pp-search">Search</label>
            <div className="pp-search-input-wrap">
              <SearchIcon />
              <input
                id="pp-search"
                className="pp-search-input"
                type="text"
                placeholder="Search by plan name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" className="pp-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                  <XIcon />
                </button>
              )}
            </div>
          </div>

          <div className="pp-filter">
            <label htmlFor="pp-plan-type">Plan Type</label>
            <select id="pp-plan-type" className="pp-select" value={planType} onChange={(e) => setPlanType(e.target.value)}>
              <option value="all">All</option>
              <option value="free">Trial</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="pp-filter">
            <label htmlFor="pp-status">Status</label>
            <select id="pp-status" className="pp-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

        </div>
      )}

      {/* ── Plans grid ── */}
      {loading ? (
        <div className="pp-loading">Loading plans…</div>
      ) : error ? (
        <div className="pp-error">{error}</div>
      ) : plans.length === 0 ? (
        <div className="pp-empty">No subscription plans found.</div>
      ) : filteredPlans.length === 0 ? (
        <div className="pp-empty">No plans match these filters.</div>
      ) : (
        <div className="pp-grid">
          {filteredPlans.map(plan => <PlanCard key={plan.id} plan={plan} onClick={() => setDetailPlanId(plan.id)} />)}
        </div>
      )}
    </div>
    </>
  );
}
