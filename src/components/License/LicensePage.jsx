import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchLicenses, fetchLicenseStats, fetchExpiringLicenses,
  editLicense,
  clearToast, openEditModal, closeEditModal,
  setLicenseFilters, clearLicenseFilters,
} from '../../store/slices/licenseSlice';
import LicenseDetail from './LicenseDetail';
import './LicensePage.css';

/* ── Icons ─────────────────────────────────────────────── */
const SearchIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const EditIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const ChevLeft    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;
const SortAsc     = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const SortDesc    = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
const SortNone    = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 10 12 5 19 10"/><polyline points="5 14 12 19 19 14"/></svg>;
const CheckIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon       = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

/* ── Helpers ────────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); } catch { return '—'; }
};
const PLATFORM_ICONS = { android:'🤖', ios:'🍎', firetv:'🔥', roku:'📺', samsung:'📺' };
const statusClass = (s) => ({ active:'lc-active', expired:'lc-expired', revoked:'lc-revoked', suspended:'lc-suspended', grace:'lc-grace' }[s] || 'lc-unknown');
const planClass   = (p) => ({ paid:'lc-paid', trial:'lc-trial', grace:'lc-grace-plan' }[p] || 'lc-unknown');

const FILTER_LABELS = {
  '':               'All Licenses',
  'active':         'Active',
  'trial':          'Trial',
  'expiring_soon':  'Expiring Soon',
  'expired':        'Expired',
  'revoked':        'Revoked',
  'expired_revoked':'Expired / Revoked',
};

/* Extract the license ID regardless of which field name the API uses */
const getLicId = (l) => {
  const id = l?.id || l?.license_id || l?.licenseId || '';
  if (!id) console.warn('[License] No ID found on item — available keys:', Object.keys(l || {}));
  return id;
};

/* ── Toast ─────────────────────────────────────────────── */
function Toast() {
  const dispatch = useDispatch();
  const { toast } = useSelector(s => s.licenses);
  useEffect(() => {
    if (toast) { const t = setTimeout(() => dispatch(clearToast()), 3200); return () => clearTimeout(t); }
  }, [toast, dispatch]);
  if (!toast) return null;
  return (
    <div className={`lc-toast ${toast.type}`}>
      {toast.type === 'success' ? <CheckIcon /> : <XIcon />} {toast.msg}
    </div>
  );
}

/* ── Pagination ─────────────────────────────────────────── */
function Pagination({ current, totalPages, total, pageSize, onPage }) {
  if (!total) return null;
  const start = (current - 1) * pageSize + 1;
  const end   = Math.min(current * pageSize, total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - current) <= 1)
    .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push(`e${p}`); acc.push(p); return acc; }, []);
  return (
    <div className="lc-pagination">
      <span className="lc-pg-info">Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{total}</strong> licenses</span>
      <div className="lc-pg-controls">
        <button className="lc-pg-nav" onClick={() => onPage(Math.max(1, current-1))} disabled={current===1}><ChevLeft /> Prev</button>
        <div className="lc-pg-pages">
          {pages.map(p => typeof p === 'string'
            ? <span key={p} className="lc-pg-ellipsis">…</span>
            : <button key={p} className={`lc-pg-page${p===current?' active':''}`} onClick={() => onPage(p)}>{p}</button>
          )}
        </div>
        <button className="lc-pg-nav" onClick={() => onPage(Math.min(totalPages, current+1))} disabled={current===totalPages}>Next <ChevRight /></button>
      </div>
    </div>
  );
}

/* ── Edit Modal ─────────────────────────────────────────── */
function EditModal() {
  const { editModal, actionLoading } = useSelector(s => s.licenses);
  if (!editModal) return null;

  return (
    <EditModalForm
      key={getLicId(editModal)}
      editModal={editModal}
      actionLoading={actionLoading}
    />
  );
}

function EditModalForm({ editModal, actionLoading }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState(() => ({
    action: 'extend',
    expires_at: editModal.expires_at?.slice(0, 10) || '',
    reason: '',
  }));
  const [localError, setLocalError] = useState('');
  const busy = actionLoading === editModal.id;

  const submit = (e) => {
    e.preventDefault();
    if (form.action === 'revoke' && !form.reason.trim()) {
      setLocalError('Reason is required when revoking a license.');
      return;
    }
    setLocalError('');
    const data = form.action === 'extend'
      ? { action: 'extend', expires_at: form.expires_at }
      : { action: 'revoke', reason: form.reason.trim() };
    dispatch(editLicense({ licenseId: getLicId(editModal), data }));
  };

  return (
    <div className="lc-modal-overlay" onClick={e => e.target === e.currentTarget && dispatch(closeEditModal())}>
      <form className="lc-modal" onSubmit={submit}>
        <div className="lc-modal-title"><EditIcon /> Edit License</div>
        <p className="lc-modal-sub">License <span className="lc-mono">{getLicId(editModal)?.slice(0, 12)}…</span></p>

        <div className="lc-modal-field">
          <label>Action</label>
          <div className="lc-action-opts">
            {[{ v:'extend', l:'Extend Expiry' }, { v:'revoke', l:'Revoke' }].map(o => (
              <label key={o.v} className={`lc-action-opt${form.action===o.v?' selected':''}`}>
                <input type="radio" name="action" value={o.v} checked={form.action===o.v} onChange={() => setForm(f=>({...f,action:o.v}))} />
                {o.l}
              </label>
            ))}
          </div>
        </div>

        {form.action === 'extend' && (
          <div className="lc-modal-field">
            <label>New Expiry Date</label>
            <input type="date" value={form.expires_at} onChange={e => setForm(f=>({...f,expires_at:e.target.value}))} disabled={busy} required />
          </div>
        )}
        {form.action === 'revoke' && (
          <div className="lc-modal-field">
            <label>Reason <span style={{ color:'#f87171' }}>*</span></label>
            <textarea
              value={form.reason}
              onChange={e => { setForm(f=>({...f,reason:e.target.value})); setLocalError(''); }}
              placeholder="Revocation reason is required…"
              rows={3}
              disabled={busy}
            />
          </div>
        )}

        {localError && (
          <div className="lc-modal-error">{localError}</div>
        )}

        <div className="lc-modal-actions">
          <button type="button" className="lc-btn-cancel" onClick={() => dispatch(closeEditModal())} disabled={busy}>Cancel</button>
          <button type="submit" className="lc-btn-save" disabled={busy}>
            {busy ? <span className="lc-mini-spin" /> : <CheckIcon />}
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Sort header ─────────────────────────────────────────── */
function SortTh({ field, sortBy, sortOrder, onSort, children }) {
  const active = sortBy === field;
  return (
    <th className={`lc-th-sort${active?' lc-th-active':''}`} onClick={() => onSort(field)}>
      <span className="lc-th-inner">
        {children}
        <span className="lc-sort-icon">{!active ? <SortNone /> : sortOrder==='asc' ? <SortAsc /> : <SortDesc />}</span>
      </span>
    </th>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
export default function LicensePage() {
  const dispatch = useDispatch();
  const { licenses, total, page, pageSize, loading, error, stats, statsLoading, actionLoading, filters } = useSelector(s => s.licenses);
  const { user: me } = useSelector(s => s.auth);
  const canEdit = me?.role === 'superadmin' || me?.role === 'admin';

  const [searchInput,   setSearchInput]   = useState(filters.search || '');
  const [detailLicenseId, setDetailLicenseId] = useState(null);
  const debounceRef = useRef(null);
  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 20)));

  /* Fetch stats on mount */
  useEffect(() => { dispatch(fetchLicenseStats()); }, [dispatch]);

  /* Debounce search */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch(setLicenseFilters({ search: searchInput.trim() || '', page: 1 }));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput, dispatch]);

  /* Fetch on filter change — route expiring_soon to dedicated endpoint */
  useEffect(() => {
    if (filters.license_filter === 'expiring_soon') {
      dispatch(fetchExpiringLicenses({
        days:      7,
        page:      filters.page,
        page_size: filters.page_size,
      }));
    } else {
      const p = {};
      if (filters.license_filter) p.license_filter = filters.license_filter;
      if (filters.plan_type)      p.plan_type      = filters.plan_type;
      if (filters.search)         p.search         = filters.search;
      p.sort_by    = filters.sort_by;
      p.sort_order = filters.sort_order;
      p.page       = filters.page;
      p.page_size  = filters.page_size;
      dispatch(fetchLicenses(p));
    }
  }, [dispatch, filters.license_filter, filters.plan_type, filters.search, filters.sort_by, filters.sort_order, filters.page, filters.page_size]);

  const handleSort = (field) => {
    dispatch(setLicenseFilters({
      sort_by: field,
      sort_order: filters.sort_by === field && filters.sort_order === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  if (detailLicenseId) {
    return <LicenseDetail licenseId={detailLicenseId} onBack={() => setDetailLicenseId(null)} />;
  }

  const fc = stats?.ui_filter_counts || {};
  const S  = stats || {};

  /* Stats cards */
  const statCards = [
    { label: 'Total Licenses',   value: S.total_licenses  ?? 0, color: '#00d4ff' },
    { label: 'Active',           value: S.active_count    ?? 0, color: '#10b981' },
    { label: 'Expiring (7d)',    value: S.expiring_7d     ?? 0, color: '#f59e0b' },
    { label: 'Expired / Revoked',value: (S.expired_count ?? 0) + (S.revoked_count ?? 0), color: '#ef4444' },
  ];

  return (
    <div className="license-page">
      <Toast />
      <EditModal />

      {/* ── Header ── */}
      <div className="lc-header">
        <div>
          <h1 className="lc-title">License Center</h1>
          <div className="lc-subtitle">Manage, filter, and act on all subscriber licenses.</div>
        </div>
      </div>

      {/* ── Stats cards ── */}
      {statsLoading && <div className="lc-stats-shimmer" />}
      {!statsLoading && (
        <div className="lc-stats-row">
          {statCards.map(({ label, value, color }) => (
            <div className="lc-stat-card" key={label} style={{ '--lsc': color }}>
              <div className="lc-stat-accent" />
              <div className="lc-stat-value">{(value ?? 0).toLocaleString()}</div>
              <div className="lc-stat-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Plan breakdown chips */}
      {S.by_plan && !statsLoading && (
        <div className="lc-plan-chips">
          {Object.entries(S.by_plan).map(([plan, count]) => (
            <span key={plan} className={`lc-plan-chip ${plan}`} onClick={() => dispatch(setLicenseFilters({ plan_type: plan === filters.plan_type ? '' : plan, page: 1 }))}>
              {plan.charAt(0).toUpperCase()+plan.slice(1)} <strong>{count.toLocaleString()}</strong>
            </span>
          ))}
          {S.auto_renew_enabled != null && (
            <span className="lc-plan-chip auto-renew">
              Auto-Renew <strong>{S.auto_renew_enabled.toLocaleString()}</strong>
            </span>
          )}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="lc-toolbar">
        {/* Search */}
        <div className="lc-search-wrap">
          <SearchIcon />
          <input className="lc-search" placeholder="Search license ID, email, device…"
            value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </div>

        {/* Compound filter dropdown with badge counts */}
        <div className="lc-filter">
          <label>Filter</label>
          <select className="lc-select" value={filters.license_filter}
            onChange={e => dispatch(setLicenseFilters({ license_filter: e.target.value, page: 1 }))}>
            {Object.entries(FILTER_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}{fc[v] != null ? ` (${fc[v]})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Plan filter */}
        <div className="lc-filter">
          <label>Plan</label>
          <select className="lc-select" value={filters.plan_type}
            onChange={e => dispatch(setLicenseFilters({ plan_type: e.target.value, page: 1 }))}>
            <option value="">All Plans</option>
            <option value="paid">Paid</option>
            <option value="trial">Trial</option>
            <option value="grace">Grace</option>
          </select>
        </div>

        {/* Sort Order toggle */}
        <div className="lc-filter">
          <label>Order</label>
          <select className="lc-select" value={filters.sort_order}
            onChange={e => dispatch(setLicenseFilters({ sort_order: e.target.value, page: 1 }))}>
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </div>

        {(filters.license_filter || filters.plan_type || filters.search) && (
          <button className="lc-clear-btn" onClick={() => { setSearchInput(''); dispatch(clearLicenseFilters()); }}>
            Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="lc-table-wrap">
        {loading ? (
          <div className="lc-loading">Loading licenses…</div>
        ) : error ? (
          <div className="lc-error">{error}</div>
        ) : (
          <div className="lc-table-scroll">
            <table className="lc-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Device</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <SortTh field="expires_at"     sortBy={filters.sort_by} sortOrder={filters.sort_order} onSort={handleSort}>Expiry</SortTh>
                  <SortTh field="days_remaining" sortBy={filters.sort_by} sortOrder={filters.sort_order} onSort={handleSort}>Days Left</SortTh>
                  <th>Auto-Renew</th>
                  <th>Reminder</th>
                  <SortTh field="created_at"     sortBy={filters.sort_by} sortOrder={filters.sort_order} onSort={handleSort}>Issued</SortTh>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {licenses.length ? licenses.map(l => {
                  const lid  = getLicId(l);
                  const busy = actionLoading === lid;
                  const days = l.days_remaining;
                  return (
                    <tr key={lid} className={l.is_expiring_soon ? 'lc-row-warn' : ''}>
                      <td className="lc-clickable" onClick={() => lid && setDetailLicenseId(lid)}>
                        <div className="lc-user-email">{l.user_email || '—'}</div>
                        {l.user_full_name && <div className="lc-user-name">{l.user_full_name}</div>}
                      </td>
                      <td>
                        <div className="lc-device-cell">
                          <span>{PLATFORM_ICONS[l.device_platform] || '📱'}</span>
                          <span className="lc-device-name">{l.device_name || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`lc-plan-pill ${planClass(l.plan_type)}`}>
                          {l.plan_name || l.plan_type || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`lc-status-pill ${statusClass(l.status)}`}>
                          {l.status || '—'}
                        </span>
                      </td>
                      <td className="lc-nowrap">
                        {l.expiry_display || fmtDate(l.expires_at)}
                        {l.is_expiring_soon && <span className="lc-expiring-badge">Soon</span>}
                      </td>
                      <td>
                        {days != null
                          ? <span className={`lc-days ${days <= 7 ? 'danger' : days <= 30 ? 'warn' : 'ok'}`}>{days}d</span>
                          : '—'}
                      </td>
                      <td className="lc-center">
                        <span className={`lc-bool-pill ${l.auto_renew ? 'yes' : 'no'}`}>
                          {l.auto_renew ? <CheckIcon /> : <XIcon />}
                        </span>
                      </td>
                      <td className="lc-center">
                        <span className={`lc-bool-pill ${l.reminder_sent ? 'yes' : 'no'}`}>
                          {l.reminder_sent ? <CheckIcon /> : <XIcon />}
                        </span>
                      </td>
                      <td className="lc-nowrap lc-muted">{fmtDate(l.created_at)}</td>
                      {canEdit && (
                        <td>
                          <div className="lc-action-btns">
                            {l.status !== 'revoked' && (
                              <button className="lc-action-btn edit" onClick={() => dispatch(openEditModal({ ...l, id: lid }))} disabled={busy} title="Edit">
                                <EditIcon />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={canEdit ? 10 : 9} className="lc-empty">No licenses found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && (
          <Pagination current={page} totalPages={totalPages} total={total} pageSize={pageSize}
            onPage={p => dispatch(setLicenseFilters({ page: p }))} />
        )}
      </div>
    </div>
  );
}
