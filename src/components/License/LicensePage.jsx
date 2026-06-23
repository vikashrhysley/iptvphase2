import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
const LicenseStatIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const LayersIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const TagIcon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></svg>;
const ClockIcon      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const DownloadIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const ExcelIcon      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>;
const PdfIcon        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h1.5a1.5 1.5 0 0 1 0 3H9v-3z"/><path d="M13 13h2"/><path d="M13 16h2"/></svg>;

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

const STATUS_META = {
  active:    { label: 'Active',    color: '#34d399' },
  expired:   { label: 'Expired',   color: '#f87171' },
  revoked:   { label: 'Revoked',   color: '#94a3b8' },
  suspended: { label: 'Suspended', color: '#fbbf24' },
  grace:     { label: 'Grace',     color: '#7c3aed' },
};

const PLAN_META = {
  trial: { label: 'Trial', color: '#a78bfa' },
  paid:  { label: 'Paid',  color: '#00d4ff' },
  grace: { label: 'Grace', color: '#f59e0b' },
};

/* Extract the license ID regardless of which field name the API uses */
const getLicId = (l) => {
  const id = l?.id || l?.license_id || l?.licenseId || '';
  if (!id) console.warn('[License] No ID found on item — available keys:', Object.keys(l || {}));
  return id;
};

/* ── Export helpers ─────────────────────────────────────── */
const escCsv = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const exportToCSV = (licenses) => {
  const headers = ['License ID','User Email','User Name','Device Name','Platform','Plan Name','Plan Type','Status','Expiry Date','Days Left','Auto-Renew','Reminder Sent','Issued Date'];
  const rows = licenses.map(l => [
    getLicId(l),
    l.user_email || '',
    l.user_full_name || '',
    l.device_name || '',
    l.device_platform || '',
    l.plan_name || '',
    l.plan_type || '',
    l.status || '',
    l.expiry_display || fmtDate(l.expires_at),
    l.days_remaining != null ? l.days_remaining : '',
    l.auto_renew ? 'Yes' : 'No',
    l.reminder_sent ? 'Yes' : 'No',
    fmtDate(l.created_at),
  ]);
  const csv = [headers, ...rows].map(r => r.map(escCsv).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `licenses_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportToPDF = (licenses) => {
  const now = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
  const rows = licenses.map(l => `<tr>
    <td>${l.user_email || '—'}</td>
    <td>${l.user_full_name || '—'}</td>
    <td>${l.device_name || '—'}</td>
    <td>${l.device_platform || '—'}</td>
    <td>${l.plan_name || l.plan_type || '—'}</td>
    <td>${l.status || '—'}</td>
    <td>${l.expiry_display || fmtDate(l.expires_at)}</td>
    <td>${l.days_remaining != null ? l.days_remaining + 'd' : '—'}</td>
    <td>${l.auto_renew ? 'Yes' : 'No'}</td>
    <td>${l.reminder_sent ? 'Yes' : 'No'}</td>
    <td>${fmtDate(l.created_at)}</td>
  </tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>License Export</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;background:#fff;padding:20px;font-size:11px}
h1{font-size:16px;margin-bottom:3px;color:#0f172a}
.meta{font-size:11px;color:#64748b;margin-bottom:14px}
table{width:100%;border-collapse:collapse}
th{background:#f1f5f9;border:1px solid #cbd5e1;padding:6px 8px;text-align:left;font-weight:700;white-space:nowrap;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
td{border:1px solid #e2e8f0;padding:5px 8px;vertical-align:top}
tr:nth-child(even) td{background:#f8fafc}
@media print{body{padding:8px}@page{margin:1cm}}
</style></head><body>
<h1>License Center Export</h1>
<p class="meta">Generated: ${now} — ${licenses.length} record(s) on this page</p>
<table><thead><tr>
<th>User Email</th><th>User Name</th><th>Device</th><th>Platform</th>
<th>Plan</th><th>Status</th><th>Expiry</th><th>Days Left</th>
<th>Auto-Renew</th><th>Reminder</th><th>Issued</th>
</tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to export PDF.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
};

/* ── Export Dropdown ─────────────────────────────────────── */
function ExportDropdown({ licenses }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="lc-export-wrap" ref={ref}>
      <button className="lc-export-btn" onClick={() => setOpen(v => !v)} disabled={!licenses.length}>
        <DownloadIcon /> Export
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft:2 }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="lc-export-menu">
          <button className="lc-export-item" onClick={() => { exportToCSV(licenses); setOpen(false); }}>
            <ExcelIcon /> Excel (CSV)
          </button>
          <button className="lc-export-item" onClick={() => { exportToPDF(licenses); setOpen(false); }}>
            <PdfIcon /> PDF
          </button>
        </div>
      )}
    </div>
  );
}

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

  return createPortal(
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
    </div>,
    document.body
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

  const S  = stats || {};
  const ST = S.stats    || {};
  const EX = S.expiring || {};
  const BS = S.by_status || {};
  const BP = S.by_plan   || {};
  const fc = S.ui_filter_counts || {};
  const ovTotal = ST.total_licenses || 1;
  const ovPct   = (n) => Math.min(100, Math.round(((n ?? 0) / ovTotal) * 100));

  return (
    <div className="license-page">
      <Toast />
      <EditModal />

      {/* ── Header ── */}
      <div className="lc-header">
        <div>
          <h1 className="lc-title">License Center</h1>
          <p className="lc-subtitle">Manage, assign, and track all subscriber licenses and their activation status.</p>
        </div>
        <ExportDropdown licenses={licenses} />
      </div>

      {/* ── Overview cards ── */}
      {statsLoading && <div className="lc-stats-shimmer" />}
      {!statsLoading && stats && (
        <>
          <div className="lc-cards-row-4">
            {/* Card 1 · License Overview */}
            <div className="lc-ov-card">
              <div className="lc-ov-top">
                <span className="lc-ov-label">License Overview</span>
                <span className="lc-ov-icon cyan"><LicenseStatIcon /></span>
              </div>
              <div className="lc-ov-big">{(ST.total_licenses ?? 0).toLocaleString()}</div>
              <div className="lc-ov-sub">Total Licenses</div>
              <div className="lc-seg-bar">
                <div className="lc-seg" style={{ flex: ST.active_count  || 0, background: '#34d399' }} />
                <div className="lc-seg" style={{ flex: ST.expired_count || 0, background: '#f87171' }} />
                <div className="lc-seg" style={{ flex: ST.revoked_count || 0, background: '#94a3b8' }} />
              </div>
              <div className="lc-ov-chips">
                {[
                  { key: 'active_count',  label: 'Active',  color: '#34d399' },
                  { key: 'expired_count', label: 'Expired', color: '#f87171' },
                  { key: 'revoked_count', label: 'Revoked', color: '#94a3b8' },
                ].map(({ key, label, color }) => (
                  <div className="lc-ov-chip" key={key} style={{ '--cc': color }}>
                    <span className="lc-ov-dot" />
                    <span className="lc-ov-chip-label">{label}</span>
                    <strong className="lc-ov-chip-val">{(ST[key] ?? 0).toLocaleString()}</strong>
                    <span className="lc-ov-chip-pct">{ovPct(ST[key])}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2 · Status Breakdown */}
            <div className="lc-ov-card">
              <div className="lc-ov-top">
                <span className="lc-ov-label">Status Breakdown</span>
                <span className="lc-ov-icon violet"><LayersIcon /></span>
              </div>
              <div className="lc-seg-bar">
                {Object.entries(BS).map(([k, v]) => (
                  <div key={k} className="lc-seg" style={{ flex: v || 0, background: STATUS_META[k]?.color || '#475569' }} />
                ))}
              </div>
              <div className="lc-ov-chips two-col">
                {Object.entries(BS).map(([k, v]) => (
                  <div className="lc-ov-chip" key={k} style={{ '--cc': STATUS_META[k]?.color || '#475569' }}>
                    <span className="lc-ov-dot" />
                    <span className="lc-ov-chip-label">{STATUS_META[k]?.label || k}</span>
                    <strong className="lc-ov-chip-val">{(v ?? 0).toLocaleString()}</strong>
                    <span className="lc-ov-chip-pct">{ovPct(v)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3 · Plan Breakdown */}
            <div className="lc-ov-card">
              <div className="lc-ov-top">
                <span className="lc-ov-label">Plan Breakdown</span>
                <span className="lc-ov-icon green"><TagIcon /></span>
              </div>
              <div className="lc-seg-bar">
                {Object.entries(BP).map(([k, v]) => (
                  <div key={k} className="lc-seg" style={{ flex: v || 0, background: PLAN_META[k]?.color || '#475569' }} />
                ))}
              </div>
              <div className="lc-ov-chips">
                {Object.entries(BP).map(([k, v]) => (
                  <div
                    className={`lc-ov-chip clickable${filters.plan_type === k ? ' selected' : ''}`}
                    key={k}
                    style={{ '--cc': PLAN_META[k]?.color || '#475569' }}
                    onClick={() => dispatch(setLicenseFilters({ plan_type: k === filters.plan_type ? '' : k, page: 1 }))}
                  >
                    <span className="lc-ov-dot" />
                    <span className="lc-ov-chip-label">{PLAN_META[k]?.label || k}</span>
                    <strong className="lc-ov-chip-val">{(v ?? 0).toLocaleString()}</strong>
                    <span className="lc-ov-chip-pct">{ovPct(v)}%</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Card 4 · Expiring & Renewals */}
            <div className="lc-ov-card">
              <div className="lc-ov-top">
                <span className="lc-ov-label">Expiring & Renewals</span>
                <span className="lc-ov-icon amber"><ClockIcon /></span>
              </div>
              <div className="lc-exp-row">
                <div className="lc-exp-item">
                  <div className="lc-exp-val warn">{(EX.expiring_7d ?? 0).toLocaleString()}</div>
                  <div className="lc-exp-label">Next 7 Days</div>
                </div>
                <div className="lc-exp-divider" />
                <div className="lc-exp-item">
                  <div className="lc-exp-val">{(EX.expiring_30d ?? 0).toLocaleString()}</div>
                  <div className="lc-exp-label">Next 30 Days</div>
                </div>
                <div className="lc-exp-divider" />
                <div className="lc-exp-item">
                  <div className="lc-exp-val ok">{(EX.auto_renew_enabled ?? 0).toLocaleString()}</div>
                  <div className="lc-exp-label">Auto-Renew On</div>
                </div>
              </div>
            </div>
          </div>
        </>
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
