import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSubscriptions, setSubscriptionFilters, clearSubscriptionFilters } from '../../store/slices/subscriptionsSlice';
import './SubscriptionsPage.css';

/* ── Icons ─────────────────────────────────────────────── */
const SearchIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const ChevLeft    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;
const CheckIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon       = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

/* ── Helpers ────────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; }
};
const shortId = (id) => (id ? `${String(id).slice(0, 8)}…` : '—');

const STATUS_CLASS = {
  active:     'sb-active',
  trialing:   'sb-trialing',
  trial:      'sb-trialing',
  past_due:   'sb-past-due',
  paused:     'sb-paused',
  cancelled:  'sb-cancelled',
  canceled:   'sb-cancelled',
  expired:    'sb-expired',
  incomplete: 'sb-past-due',
  unpaid:     'sb-past-due',
};
const statusClass = (s) => STATUS_CLASS[(s || '').toLowerCase()] || 'sb-unknown';

const planClass = (p) => {
  const v = (p || '').toLowerCase();
  if (v.includes('trial'))   return 'sb-plan-trial';
  if (v.includes('life'))    return 'sb-plan-lifetime';
  if (v.includes('premium') || v.includes('pro')) return 'sb-plan-premium';
  return 'sb-plan-default';
};

const STATUS_OPTIONS = [
  { value: '',          label: 'All Status' },
  { value: 'active',    label: 'Active' },
  { value: 'trialing',  label: 'Trialing' },
  { value: 'past_due',  label: 'Past Due' },
  { value: 'paused',    label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired',   label: 'Expired' },
];

/* ── Pagination ─────────────────────────────────────────── */
function Pagination({ current, totalPages, total, pageSize, onPage }) {
  if (!total) return null;
  const start = (current - 1) * pageSize + 1;
  const end   = Math.min(current * pageSize, total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - current) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push(`e${p}`); acc.push(p); return acc; }, []);
  return (
    <div className="sb-pagination">
      <span className="sb-pg-info">Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{total}</strong> subscriptions</span>
      <div className="sb-pg-controls">
        <button className="sb-pg-nav" onClick={() => onPage(Math.max(1, current-1))} disabled={current===1}><ChevLeft /> Prev</button>
        <div className="sb-pg-pages">
          {pages.map(p => typeof p === 'string'
            ? <span key={p} className="sb-pg-ellipsis">…</span>
            : <button key={p} className={`sb-pg-page${p===current?' active':''}`} onClick={() => onPage(p)}>{p}</button>
          )}
        </div>
        <button className="sb-pg-nav" onClick={() => onPage(Math.min(totalPages, current+1))} disabled={current===totalPages}>Next <ChevRight /></button>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
export default function SubscriptionsPage() {
  const dispatch = useDispatch();
  const { subscriptions, total, page, pageSize, loading, error, filters } = useSelector((s) => s.subscriptions);

  const [userIdInput, setUserIdInput] = useState(filters.user_id || '');
  const [planTypeInput, setPlanTypeInput] = useState(filters.plan_type || '');
  const debounceRef = useRef(null);
  const totalPages  = Math.max(1, Math.ceil(total / (pageSize || 20)));

  /* Debounce user_id / plan_type free-text filters */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch(setSubscriptionFilters({
        user_id:   userIdInput.trim(),
        plan_type: planTypeInput.trim(),
        page: 1,
      }));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [userIdInput, planTypeInput, dispatch]);

  /* Fetch on filter change */
  useEffect(() => {
    const p = {};
    if (filters.status)    p.status    = filters.status;
    if (filters.plan_type) p.plan_type = filters.plan_type;
    if (filters.user_id)   p.user_id   = filters.user_id;
    if (filters.date_from) p.date_from = filters.date_from;
    if (filters.date_to)   p.date_to   = filters.date_to;
    p.page      = filters.page;
    p.page_size = filters.page_size;
    dispatch(fetchSubscriptions(p));
  }, [dispatch, filters.status, filters.plan_type, filters.user_id, filters.date_from, filters.date_to, filters.page, filters.page_size]);

  const hasActiveFilters = filters.status || filters.plan_type || filters.user_id || filters.date_from || filters.date_to;

  const handleClear = () => {
    setUserIdInput('');
    setPlanTypeInput('');
    dispatch(clearSubscriptionFilters());
  };

  return (
    <div className="sb-page">
      {/* ── Header ── */}
      <div className="sb-header">
        <div>
          <h1 className="sb-title">Subscriptions</h1>
          <div className="sb-subtitle">Subscriber billing plans, renewal status and payment history.</div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="sb-toolbar">
        <div className="sb-search-wrap">
          <SearchIcon />
          <input className="sb-search" placeholder="User ID…"
            value={userIdInput} onChange={e => setUserIdInput(e.target.value)} />
        </div>

        <div className="sb-filter">
          <label>Status</label>
          <select className="sb-select" value={filters.status}
            onChange={e => dispatch(setSubscriptionFilters({ status: e.target.value, page: 1 }))}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="sb-filter">
          <label>Plan Type</label>
          <input className="sb-text-input" placeholder="e.g. premium"
            value={planTypeInput} onChange={e => setPlanTypeInput(e.target.value)} />
        </div>

        <div className="sb-filter">
          <label>From</label>
          <input type="date" className="sb-date-input" value={filters.date_from}
            onChange={e => dispatch(setSubscriptionFilters({ date_from: e.target.value, page: 1 }))} />
        </div>

        <div className="sb-filter">
          <label>To</label>
          <input type="date" className="sb-date-input" value={filters.date_to}
            onChange={e => dispatch(setSubscriptionFilters({ date_to: e.target.value, page: 1 }))} />
        </div>

        {hasActiveFilters && (
          <button className="sb-clear-btn" onClick={handleClear}>Clear</button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="sb-table-wrap">
        {loading ? (
          <div className="sb-loading">Loading subscriptions…</div>
        ) : error ? (
          <div className="sb-error">{error}</div>
        ) : (
          <div className="sb-table-scroll">
            <table className="sb-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Device</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Current Period</th>
                  <th>Next Billing</th>
                  <th>Auto-Renew</th>
                  <th>Last Payment</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length ? subscriptions.map(sub => (
                  <tr key={sub.id}>
                    <td>
                      <div className="sb-user-email">{sub.user_email || '—'}</div>
                      <div className="sb-user-id">{shortId(sub.user_id)}</div>
                    </td>
                    <td className="sb-mono">{shortId(sub.device_id)}</td>
                    <td>
                      <span className={`sb-plan-pill ${planClass(sub.plan_type)}`}>
                        {sub.plan_name || sub.plan_type || '—'}
                      </span>
                      {sub.billing_cycle && <div className="sb-billing-cycle">{sub.billing_cycle}</div>}
                    </td>
                    <td className="sb-nowrap">
                      <strong>{sub.amount_display ?? '—'}</strong>
                      {sub.currency && <span className="sb-currency">{sub.currency}</span>}
                    </td>
                    <td>
                      <span className={`sb-status-pill ${statusClass(sub.status)}`}>{sub.status || '—'}</span>
                      {sub.cancelled_at && <div className="sb-cancelled-date">Cancelled {fmtDate(sub.cancelled_at)}</div>}
                    </td>
                    <td className="sb-nowrap sb-muted">{fmtDate(sub.current_period_start)} → {fmtDate(sub.current_period_end)}</td>
                    <td className="sb-nowrap">{fmtDate(sub.next_billing_at)}</td>
                    <td className="sb-center">
                      <span className={`sb-bool-pill ${sub.auto_renew ? 'yes' : 'no'}`}>
                        {sub.auto_renew ? <CheckIcon /> : <XIcon />}
                      </span>
                    </td>
                    <td className="sb-nowrap sb-muted">{fmtDate(sub.last_payment_at)}</td>
                    <td className="sb-nowrap sb-muted">{fmtDate(sub.created_at)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={10} className="sb-empty">No subscriptions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && (
          <Pagination current={page} totalPages={totalPages} total={total} pageSize={pageSize}
            onPage={p => dispatch(setSubscriptionFilters({ page: p }))} />
        )}
      </div>
    </div>
  );
}
