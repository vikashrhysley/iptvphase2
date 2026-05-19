// src/components/License/LicensePage.js
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchLicenses, renewLicense, revokeLicense, editLicense,
  clearToast, openEditModal, closeEditModal,
} from '../../store/slices/licenseSlice';
import './LicensePage.css';

const PAGE_SIZE = 8;

// ── Type config ───────────────────────────────────────────
const TYPE_CONFIG = {
  Enterprise:   { color: '#00d4ff', bg: 'rgba(0,212,255,0.1)',   border: 'rgba(0,212,255,0.25)',   icon: '🏢' },
  Professional: { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.25)', icon: '💼' },
  Starter:      { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  icon: '🚀' },
  Team:         { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  icon: '👥' },
  Developer:    { color: '#ec4899', bg: 'rgba(236,72,153,0.1)',  border: 'rgba(236,72,153,0.25)',  icon: '⚙️' },
};

const BILLING_ICONS = { Monthly: '📅', Quarterly: '🗓️', Annual: '📆', Biennial: '🗂️' };

// ── Icons ─────────────────────────────────────────────────
const SearchIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
const EditIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const RenewIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
const RevokeIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const SaveIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const ChevLeft    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;

// ── Helpers ───────────────────────────────────────────────
const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const daysUntil  = (iso) => Math.ceil((new Date(iso) - Date.now()) / 86400000);
const daysAgo    = (iso) => Math.ceil((Date.now() - new Date(iso)) / 86400000);

// ── Toast ─────────────────────────────────────────────────
function Toast() {
  const dispatch = useDispatch();
  const { toast } = useSelector(s => s.licenses);
  useEffect(() => {
    if (toast) { const t = setTimeout(() => dispatch(clearToast()), 3200); return () => clearTimeout(t); }
  }, [toast, dispatch]);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type === 'success' ? 'success' : 'error'}`}>
      {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────
function EditModal() {
  const dispatch = useDispatch();
  const { editModal, actionLoading } = useSelector(s => s.licenses);
  const [form, setForm] = useState({ licenseType: '', seats: '', billingCycle: '', expirationDate: '' });

  useEffect(() => {
    if (editModal) setForm({
      licenseType:    editModal.licenseType    || '',
      seats:          editModal.seats          || '',
      billingCycle:   editModal.billingCycle   || '',
      expirationDate: editModal.expirationDate ? editModal.expirationDate.slice(0, 10) : '',
    });
  }, [editModal]);

  if (!editModal) return null;
  const busy = actionLoading === editModal.id;

  const handleSave = () => dispatch(editLicense({ licenseId: editModal.id, data: { ...form, seats: Number(form.seats) } }));
  const onKey = e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') dispatch(closeEditModal()); };

  return (
    <div className="lc-modal-overlay" onClick={() => dispatch(closeEditModal())}>
      <div className="lc-modal" onClick={e => e.stopPropagation()}>
        <div className="lc-modal-title"><EditIcon /> Edit License — {editModal.id}</div>
        <div className="lc-modal-grid">
          {/* License Type */}
          <div className="lc-modal-field">
            <label className="lc-modal-label">License Type</label>
            <select className="lc-modal-select" value={form.licenseType} onChange={e => setForm(f => ({ ...f, licenseType: e.target.value }))}>
              {Object.keys(TYPE_CONFIG).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {/* Seats */}
          <div className="lc-modal-field">
            <label className="lc-modal-label">Number of Seats</label>
            <input className="lc-modal-input" type="number" min="1" value={form.seats}
              onChange={e => setForm(f => ({ ...f, seats: e.target.value }))}
              onKeyDown={onKey} />
          </div>
          {/* Expiration */}
          <div className="lc-modal-field">
            <label className="lc-modal-label">Expiration Date</label>
            <input className="lc-modal-input" type="date" value={form.expirationDate}
              onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))}
              onKeyDown={onKey} />
          </div>
          {/* Billing Cycle */}
          <div className="lc-modal-field">
            <label className="lc-modal-label">Billing Cycle</label>
            <select className="lc-modal-select" value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}>
              {['Monthly','Quarterly','Annual','Biennial'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
        <div className="lc-modal-actions">
          <button className="lc-modal-cancel" onClick={() => dispatch(closeEditModal())}>Cancel</button>
          <button className="lc-modal-save" onClick={handleSave} disabled={busy}>
            {busy ? <span className="lc-mini-spin" /> : <><SaveIcon /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────
function Pagination({ current, total, totalItems, onPrev, onNext, onPage }) {
  if (total <= 1) return null;
  const start = (current - 1) * PAGE_SIZE + 1;
  const end   = Math.min(current * PAGE_SIZE, totalItems);
  const pages = Array.from({ length: total }, (_, i) => i + 1)
    .filter(p => p === 1 || p === total || Math.abs(p - current) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('e' + p);
      acc.push(p);
      return acc;
    }, []);
  return (
    <div className="license-pagination">
      <span className="lp-info">Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{totalItems}</strong> licenses</span>
      <div className="lp-controls">
        <button className="lp-nav" onClick={onPrev} disabled={current === 1}><ChevLeft /> Previous</button>
        <div className="lp-pages">
          {pages.map(p => typeof p === 'string'
            ? <span key={p} className="lp-ellipsis">…</span>
            : <button key={p} className={`lp-page${p === current ? ' active' : ''}`} onClick={() => onPage(p)}>{p}</button>
          )}
        </div>
        <button className="lp-nav" onClick={onNext} disabled={current === total}>Next <ChevRight /></button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function LicensePage() {
  const dispatch = useDispatch();
  const { licenses, loading, actionLoading } = useSelector(s => s.licenses);
  const { user: me } = useSelector(s => s.auth);
  const canEdit = me?.role === 'superadmin';

  // All hooks first
  const [search,    setSearch]    = useState('');
  const [typeFilter,setTypeFilter]= useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page,      setPage]      = useState(1);

  useEffect(() => { dispatch(fetchLicenses()); }, [dispatch]);

  const handleSearch = v => { setSearch(v);       setPage(1); };
  const handleType   = v => { setTypeFilter(v);   setPage(1); };
  const handleStatus = v => { setStatusFilter(v); setPage(1); };

  const filtered = licenses.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || [l.userName, l.userEmail, l.licenseType, l.id, l.licenseKey, l.username]
      .some(v => v?.toLowerCase().includes(q));
    const matchType   = typeFilter   === 'all' || l.licenseType === typeFilter;
    const matchStatus = statusFilter === 'all' || l.status      === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total:        licenses.length,
    active:       licenses.filter(l => l.status === 'active').length,
    expiringSoon: licenses.filter(l => l.status === 'expiring_soon').length,
    expired:      licenses.filter(l => l.status === 'expired').length,
    totalSeats:   licenses.reduce((s, l) => s + l.seats, 0),
    usedSeats:    licenses.reduce((s, l) => s + l.seatsUsed, 0),
  };

  const handleRenew = (id) => dispatch(renewLicense({ licenseId: id }));
  const handleRevoke = (id) => {
    if (window.confirm('Revoke this license? The user will lose access immediately.')) {
      dispatch(revokeLicense({ licenseId: id }));
    }
  };
  const handleEdit = (l) => dispatch(openEditModal(l));

  return (
    <div className="license-page">
      <Toast />
      <EditModal />

      {/* ── Stats ── */}
      <div className="license-stats">
        <div className="ls-card" style={{ '--lsc': 'var(--accent-primary)' }}>
          <span className="ls-icon">🔑</span>
          <div className="ls-value">{stats.total}</div>
          <div className="ls-label">Total Licenses</div>
        </div>
        <div className="ls-card" style={{ '--lsc': '#10b981' }}>
          <span className="ls-icon">✅</span>
          <div className="ls-value">{stats.active}</div>
          <div className="ls-label">Active</div>
        </div>
        <div className="ls-card" style={{ '--lsc': '#f59e0b' }}>
          <span className="ls-icon">⚠️</span>
          <div className="ls-value">{stats.expiringSoon}</div>
          <div className="ls-label">Expiring Soon</div>
        </div>
        <div className="ls-card" style={{ '--lsc': '#ef4444' }}>
          <span className="ls-icon">❌</span>
          <div className="ls-value">{stats.expired}</div>
          <div className="ls-label">Expired</div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="license-toolbar">
        <div className="license-search-wrap">
          <SearchIcon />
          <input className="license-search" placeholder="Search license, user, key…"
            value={search} onChange={e => handleSearch(e.target.value)} />
        </div>

        {/* Type filter */}
        <select className="license-filter-select" value={typeFilter} onChange={e => handleType(e.target.value)}>
          <option value="all">All Types</option>
          {Object.keys(TYPE_CONFIG).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].icon} {t}</option>)}
        </select>

        {/* Status filter */}
        <select className="license-filter-select" value={statusFilter} onChange={e => handleStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">● Active</option>
          <option value="expiring_soon">⚠ Expiring Soon</option>
          <option value="expired">✕ Expired</option>
          <option value="revoked">⊘ Revoked</option>
        </select>

        <div className="license-toolbar-right">
          <button className="lc-icon-btn" onClick={() => dispatch(fetchLicenses())} title="Refresh"><RefreshIcon /></button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="license-table-section">
        <div className="license-table-header">
          <div>
            <div className="lth-title">License Records</div>
            <div className="lth-meta">
              {filtered.length > 0 ? `Page ${page} of ${totalPages} · ${filtered.length} total` : '0 licenses'}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="license-loading"><div className="license-spinner" /> Loading licenses…</div>
        ) : filtered.length === 0 ? (
          <div className="license-empty"><span className="license-empty-icon">🔑</span>No licenses match your filters.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="license-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>License Type</th>
                    <th>Expiration Date</th>
                    <th>Billing Cycle</th>
                    <th>Status</th>
                    <th>License Key</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(l => {
                    const tc   = TYPE_CONFIG[l.licenseType] || TYPE_CONFIG.Starter;
                    const busy = actionLoading === l.id;
                    const days = daysUntil(l.expirationDate);
                    const isExpired = l.status === 'expired' || days < 0;
                    const isExpiring = l.status === 'expiring_soon' || (days >= 0 && days <= 30);
                    const seatPct = Math.min(100, Math.round((l.seatsUsed / l.seats) * 100));
                    const seatColor = seatPct >= 90 ? '#ef4444' : seatPct >= 70 ? '#f59e0b' : '#10b981';

                    return (
                      <tr key={l.id}>
                        {/* User */}
                        <td>
                          <div className="lc-user-cell">
                            <div className="lc-user-avatar-fb">{l.userName?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                            <div>
                              <div className="lc-user-name">{l.userName}</div>
                              <div className="lc-user-email">{l.userEmail}</div>
                            </div>
                          </div>
                        </td>

                        {/* License Type */}
                        <td>
                          <span className="lc-type-badge" style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color }}>
                            {tc.icon} {l.licenseType}
                          </span>
                        </td>

                        {/* Expiration Date */}
                        <td>
                          <div className={`lc-date${isExpired ? ' lc-date-expired' : isExpiring ? ' lc-date-warning' : ''}`}>
                            {formatDate(l.expirationDate)}
                          </div>
                          <div className={`lc-date-days${isExpired ? ' expired' : isExpiring ? ' warning' : ''}`}>
                            {isExpired
                              ? `Expired ${daysAgo(l.expirationDate)}d ago`
                              : isExpiring
                              ? `Expires in ${days}d`
                              : `Expires in ${days}d`}
                          </div>
                        </td>

                        {/* Billing Cycle */}
                        <td>
                          <span className="lc-billing">
                            {BILLING_ICONS[l.billingCycle] || '📅'} {l.billingCycle}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`lc-status ${l.status}`}>
                            <span className="lc-status-dot" />
                            {l.status === 'expiring_soon' ? 'Expiring Soon' : l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                          </span>
                        </td>

                        {/* License Key */}
                        <td><span className="lc-key">{l.licenseKey}</span></td>

                        {/* Actions */}
                        {canEdit && (
                          <td>
                            <div className="lc-actions">
                              {l.status !== 'revoked' && (
                                <button className="lc-btn renew" onClick={() => handleRenew(l.id)} disabled={busy} title="Renew license">
                                  {busy ? '…' : <><RenewIcon /> Renew</>}
                                </button>
                              )}
                              <button className="lc-btn edit" onClick={() => handleEdit(l)} disabled={busy} title="Edit license">
                                {busy ? '…' : <><EditIcon /> Edit</>}
                              </button>
                              {l.status !== 'revoked' && (
                                <button className="lc-btn revoke" onClick={() => handleRevoke(l.id)} disabled={busy} title="Revoke license">
                                  {busy ? '…' : <><RevokeIcon /> Revoke</>}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              current={page} total={totalPages} totalItems={filtered.length}
              onPrev={() => setPage(p => Math.max(1, p - 1))}
              onNext={() => setPage(p => Math.min(totalPages, p + 1))}
              onPage={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
