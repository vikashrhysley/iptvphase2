import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSubscriptionPlans } from '../../store/slices/plansSlice';
import PlanDetailPage from './PlanDetailPage';
import './PlansPage.css';

/* ── Icons ─────────────────────────────────────────────── */
const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

/* ── Helpers ────────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; }
};

const planClass = (p) => {
  const v = (p || '').toLowerCase();
  if (v.includes('trial'))   return 'pp-type-trial';
  if (v.includes('life'))    return 'pp-type-lifetime';
  if (v.includes('premium') || v.includes('pro')) return 'pp-type-premium';
  return 'pp-type-default';
};

/* ── Plan Card ──────────────────────────────────────────── */
function PlanCard({ plan, onClick }) {
  const features = plan.features || {};
  const hd   = !!features.hd;
  const four = !!features['4k'];

  return (
    <div className={`pp-card${!plan.is_active ? ' inactive' : ''}`} onClick={onClick} role="button" tabIndex={0}>
      <div className="pp-card-top">
        <span className={`pp-type-pill ${planClass(plan.plan_type)}`}>{plan.plan_type || '—'}</span>
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
        <div className="pp-limit-row"><span>Trial Days</span><strong>{plan.trial_days ?? 0}</strong></div>
        <div className="pp-limit-row"><span>Device Policy</span><strong>{plan.device_limit_policy || '—'}</strong></div>
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
  const [detailPlanId, setDetailPlanId] = useState(null);

  useEffect(() => { dispatch(fetchSubscriptionPlans()); }, [dispatch]);

  if (detailPlanId) return <PlanDetailPage planId={detailPlanId} onBack={() => setDetailPlanId(null)} />;

  const totalPlans  = plans.length;
  const activePlans = plans.filter(p => p.is_active).length;
  const totalActiveLicenses = plans.reduce((sum, p) => sum + (p.active_licenses || 0), 0);

  return (
    <div className="pp-page">
      {/* ── Header ── */}
      <div className="pp-header">
        <div>
          <h1 className="pp-title">Subscription Plans</h1>
          <div className="pp-subtitle">Plan definitions, pricing and active license counts.</div>
        </div>
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

      {/* ── Plans grid ── */}
      {loading ? (
        <div className="pp-loading">Loading plans…</div>
      ) : error ? (
        <div className="pp-error">{error}</div>
      ) : plans.length === 0 ? (
        <div className="pp-empty">No subscription plans found.</div>
      ) : (
        <div className="pp-grid">
          {plans.map(plan => <PlanCard key={plan.id} plan={plan} onClick={() => setDetailPlanId(plan.id)} />)}
        </div>
      )}
    </div>
  );
}
