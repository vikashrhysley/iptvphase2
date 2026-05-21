// src/components/License/LicensePage.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchLicenses, fetchLicenseDetail,
  renewLicense, revokeLicense, editLicense,
  clearToast, openEditModal, closeEditModal, clearDetail,
} from '../../store/slices/licenseSlice';
import './LicensePage.css';

const PAGE_SIZE = 8;

// ── Icons ────────────────────────────────────────────────
const SearchIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
const EditIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const RenewIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
const RevokeIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const SaveIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const BackIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevLeft    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;

// ── Helpers ───────────────────────────────────────────────
const fmt     = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : '—';
const daysLeft = (iso) => iso ? Math.ceil((new Date(iso) - Date.now()) / 86400000) : null;

const ST = {
  active:        { bg:'rgba(16,185,129,0.1)',  border:'rgba(16,185,129,0.3)',  color:'#34d399' },
  expiring_soon: { bg:'rgba(245,158,11,0.1)',  border:'rgba(245,158,11,0.3)',  color:'#fbbf24' },
  expired:       { bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.25)',  color:'#f87171' },
  revoked:       { bg:'rgba(100,100,100,0.1)', border:'rgba(100,100,100,0.3)', color:'#94a3b8' },
  trial:         { bg:'rgba(124,58,237,0.1)',  border:'rgba(124,58,237,0.3)',  color:'#a78bfa' },
};

const DEVICE_ICONS = { phone:'📱', desktop:'🖥️', tablet:'📟', mobile:'📱', web:'🌐', tv:'📺' };

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
  const [form, setForm] = useState({ plan_type:'', status:'', expires_at:'' });

  useEffect(() => {
    if (editModal) setForm({
      plan_type:  editModal.plan_type  || editModal.licenseType || '',
      status:     editModal.status     || '',
      expires_at: editModal.expires_at ? editModal.expires_at.slice(0,10)
                : editModal.expirationDate ? editModal.expirationDate.slice(0,10) : '',
    });
  }, [editModal]);

  if (!editModal) return null;
  const busy = actionLoading === editModal.id;
  const onKey = e => { if (e.key === 'Escape') dispatch(closeEditModal()); };

  return (
    <div className="lc-modal-overlay" onClick={() => dispatch(closeEditModal())}>
      <div className="lc-modal" onClick={e => e.stopPropagation()}>
        <div className="lc-modal-title"><EditIcon /> Edit License</div>
        <div className="lc-modal-grid">
          <div className="lc-modal-field">
            <label className="lc-modal-label">Plan Type</label>
            <input className="lc-modal-input" value={form.plan_type}
              onChange={e => setForm(f => ({...f, plan_type: e.target.value}))}
              onKeyDown={onKey} autoFocus />
          </div>
          <div className="lc-modal-field">
            <label className="lc-modal-label">Status</label>
            <select className="lc-modal-select" value={form.status}
              onChange={e => setForm(f => ({...f, status: e.target.value}))}>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
              <option value="trial">Trial</option>
            </select>
          </div>
          <div className="lc-modal-field full">
            <label className="lc-modal-label">Expiration Date</label>
            <input className="lc-modal-input" type="date" value={form.expires_at}
              onChange={e => setForm(f => ({...f, expires_at: e.target.value}))}
              onKeyDown={onKey} />
          </div>
        </div>
        <div className="lc-modal-actions">
          <button className="lc-modal-cancel" onClick={() => dispatch(closeEditModal())}>Cancel</button>
          <button className="lc-modal-save" disabled={busy}
            onClick={() => dispatch(editLicense({ licenseId: editModal.id, data: form }))}>
            {busy ? <span className="lc-mini-spin" /> : <><SaveIcon /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────
function Pagination({ current, total, totalItems, onPrev, onNext, onPage }) {
  if (total <= 1) return null;
  const start = (current-1)*PAGE_SIZE+1, end = Math.min(current*PAGE_SIZE, totalItems);
  const pages = Array.from({length:total},(_,i)=>i+1)
    .filter(p=>p===1||p===total||Math.abs(p-current)<=1)
    .reduce((acc,p,i,arr)=>{ if(i>0&&p-arr[i-1]>1)acc.push('e'+p); acc.push(p); return acc;},[]);
  return (
    <div className="license-pagination">
      <span className="lp-info">Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{totalItems}</strong></span>
      <div className="lp-controls">
        <button className="lp-nav" onClick={onPrev} disabled={current===1}><ChevLeft /> Previous</button>
        <div className="lp-pages">
          {pages.map(p => typeof p==='string'
            ? <span key={p} className="lp-ellipsis">…</span>
            : <button key={p} className={`lp-page${p===current?' active':''}`} onClick={()=>onPage(p)}>{p}</button>)}
        </div>
        <button className="lp-nav" onClick={onNext} disabled={current===total}>Next <ChevRight /></button>
      </div>
    </div>
  );
}

// ── Detail field helper ───────────────────────────────────
const DField = ({ label, value, accent, mono, wide }) => (
  <div style={{ gridColumn: wide ? '1/-1' : 'auto', marginBottom:14 }}>
    <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>{label}</div>
    <div style={{ fontSize:'0.875rem', fontWeight:500, wordBreak:'break-all', lineHeight:1.5,
      color: accent ? 'var(--accent-primary)' : 'var(--text-primary)',
      fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? '0.78rem' : '0.875rem' }}>
      {value ?? '—'}
    </div>
  </div>
);

// ── License Detail Panel ──────────────────────────────────
function LicenseDetail({ onBack }) {
  const dispatch = useDispatch();
  const { selectedDetail: l, detailLoading, actionLoading } = useSelector(s => s.licenses);
  const { user: me } = useSelector(s => s.auth);
  const canEdit = me?.role === 'superadmin';

  if (detailLoading || !l) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:14, color:'var(--text-muted)' }}>
      <div className="license-spinner" />
      <span>Loading license details…</span>
    </div>
  );

  const raw   = l._raw || l;
  const st    = ST[l.status] || ST.active;
  const busy  = actionLoading === l.id;
  const days  = daysLeft(raw.expires_at || l.expirationDate);

  // Parse device array if present
  const devices = raw.devices || raw.allowed_devices || [];
  // Risk score
  const riskScore = raw.risk_score ?? raw.riskScore ?? null;
  const riskColor = riskScore === null ? 'var(--text-muted)'
    : riskScore >= 70 ? '#f87171'
    : riskScore >= 40 ? '#fbbf24'
    : '#34d399';

  return (
    <div className="license-page" style={{ maxWidth: 900 }}>

      {/* Back */}
      <button onClick={onBack} className="ld-back-btn">
        <BackIcon /> Back to Licenses
      </button>

      {/* Hero card */}
      <div className="ld-hero">
        <div className="ld-hero-bar" />
        <div className="ld-hero-top">
          <div>
            <div className="ld-hero-title">
              {raw.plan_type || l.licenseType || 'License'} Plan
            </div>
            <div className="ld-hero-id">ID: {l.id}</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10 }}>
              <span className="ld-badge" style={{ background:st.bg, border:`1px solid ${st.border}`, color:st.color }}>
                ● {l.status === 'expiring_soon' ? 'Expiring Soon' : (l.status||'active').charAt(0).toUpperCase()+(l.status||'').slice(1)}
              </span>
              {days !== null && days >= 0 && l.status !== 'revoked' && (
                <span className="ld-badge" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--border-subtle)', color:'var(--text-muted)' }}>
                  {days} days remaining
                </span>
              )}
              {riskScore !== null && (
                <span className="ld-badge" style={{ background:'rgba(0,0,0,0.2)', border:`1px solid ${riskColor}33`, color: riskColor }}>
                  ⚠ Risk: {riskScore}
                </span>
              )}
            </div>
          </div>

          {/* Actions — Change / Revoke / Edit */}
          {canEdit && (
            <div className="ld-actions">
              {/* Change = Renew */}
              {l.status !== 'revoked' && (
                <button className="ld-btn ld-btn-change" disabled={busy}
                  onClick={() => dispatch(renewLicense({ licenseId: l.id }))}>
                  {busy ? '…' : <><RenewIcon /> Change</>}
                </button>
              )}
              <button className="ld-btn ld-btn-edit" disabled={busy}
                onClick={() => dispatch(openEditModal(raw))}>
                <EditIcon /> Edit
              </button>
              {l.status !== 'revoked' && (
                <button className="ld-btn ld-btn-revoke" disabled={busy}
                  onClick={() => { if(window.confirm('Revoke this license? This cannot be undone.')) dispatch(revokeLicense({ licenseId: l.id })); }}>
                  <RevokeIcon /> Revoke
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="ld-grid">

        {/* Core details */}
        <div className="ld-card">
          <div className="ld-card-title">🔑 License Details</div>
          <DField label="License ID" value={l.id}                          mono />
          <DField label="Plan Type"  value={raw.plan_type || l.licenseType} accent />
          <DField label="Status"     value={(l.status||'—').charAt(0).toUpperCase()+(l.status||'').slice(1)} />
          <DField label="Start Date" value={fmt(raw.start_date || raw.created_at || l.issueDate)} />
          <DField label="Expires"    value={fmt(raw.expires_at || l.expirationDate)} />
          {raw.revocation_reason && (
            <DField label="Revocation Reason" value={raw.revocation_reason} />
          )}
        </div>

        {/* Enrollment & risk */}
        <div className="ld-card">
          <div className="ld-card-title">📋 Enrollment & Risk</div>
          <DField label="Enrolled"      value={raw.enrolled !== undefined ? (raw.enrolled ? 'Yes' : 'No') : raw.enrollment_date ? fmt(raw.enrollment_date) : '—'} />
          <DField label="Enrolled Date" value={fmt(raw.enrollment_date || raw.enrolled_at)} />
          <DField label="Risk Score"    value={riskScore !== null ? `${riskScore} / 100` : '—'} />
          {riskScore !== null && (
            <div style={{ marginTop:4 }}>
              <div style={{ height:5, background:'var(--bg-raised)', borderRadius:3, overflow:'hidden', marginBottom:4 }}>
                <div style={{ height:'100%', width:`${Math.min(100,riskScore)}%`, background:riskColor, borderRadius:3, transition:'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>
                {riskScore < 40 ? 'Low risk' : riskScore < 70 ? 'Medium risk' : 'High risk'}
              </div>
            </div>
          )}
          {raw.revocation_reason && (
            <DField label="Revocation Reason" value={raw.revocation_reason} />
          )}
        </div>

        {/* Devices */}
        <div className="ld-card" style={{ gridColumn: devices.length > 0 ? '1/-1' : 'auto' }}>
          <div className="ld-card-title">📱 Devices</div>
          {devices.length === 0 ? (
            <div style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
              {raw.device_type
                ? <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.875rem', color:'var(--text-primary)' }}>
                    <span style={{ fontSize:'1.2rem' }}>{DEVICE_ICONS[raw.device_type?.toLowerCase()] || '📱'}</span>
                    {raw.device_type}
                  </div>
                : 'No device information available'}
            </div>
          ) : (
            <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
              {devices.map((d, i) => {
                const type = (typeof d === 'string' ? d : d.type || d.device_type || '').toLowerCase();
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', fontSize:'0.82rem' }}>
                    <span style={{ fontSize:'1.1rem' }}>{DEVICE_ICONS[type] || '📱'}</span>
                    <span style={{ color:'var(--text-primary)', fontWeight:500, textTransform:'capitalize' }}>
                      {typeof d === 'string' ? d : d.name || d.type || 'Device'}
                    </span>
                    {d.status && (
                      <span style={{ fontSize:'0.7rem', padding:'2px 7px', borderRadius:10, background: d.status==='active'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.08)', color: d.status==='active'?'#34d399':'#f87171', border:`1px solid ${d.status==='active'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.25)'}` }}>
                        {d.status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Raw data for superadmin */}
        {me?.role === 'superadmin' && (
          <div className="ld-card" style={{ gridColumn:'1/-1' }}>
            <div className="ld-card-title">🔧 Raw API Response
              <span style={{ marginLeft:'auto', fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>Super Admin only</span>
            </div>
            <pre style={{ fontSize:'0.72rem', color:'var(--text-muted)', overflowX:'auto', lineHeight:1.7, whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:300 }}>
              {JSON.stringify(raw, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main License Page ─────────────────────────────────────
export default function LicensePage() {
  const dispatch = useDispatch();
  const { licenses, loading, actionLoading, selectedDetail } = useSelector(s => s.licenses);
  const { user: me } = useSelector(s => s.auth);
  const canEdit = me?.role === 'superadmin';

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page,         setPage]         = useState(1);

  useEffect(() => { dispatch(fetchLicenses()); }, [dispatch]);

  const handleRowClick = (lic) => dispatch(fetchLicenseDetail({ licenseId: lic.id }));
  const handleBack     = ()    => dispatch(clearDetail());

  const handleSearch = v => { setSearch(v);       setPage(1); };
  const handleStatus = v => { setStatusFilter(v); setPage(1); };

  if (selectedDetail) return (
    <>
      <Toast /><EditModal /><LicenseDetail onBack={handleBack} />
    </>
  );

  const filtered = licenses.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || [l.id, l.licenseType, l.userEmail, l._raw?.plan_type]
      .some(v => v?.toLowerCase().includes(q));
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const stats = {
    total:   licenses.length,
    active:  licenses.filter(l => l.status==='active').length,
    soon:    licenses.filter(l => l.status==='expiring_soon').length,
    expired: licenses.filter(l => l.status==='expired'||l.status==='revoked').length,
  };

  return (
    <div className="license-page">
      <Toast /><EditModal />

      {/* Stats */}
      <div className="license-stats">
        {[
          { icon:'🔑', val:stats.total,   label:'Total',          lsc:'var(--accent-primary)' },
          { icon:'✅', val:stats.active,  label:'Active',         lsc:'#10b981' },
          { icon:'⚠️', val:stats.soon,    label:'Expiring Soon',  lsc:'#f59e0b' },
          { icon:'❌', val:stats.expired, label:'Expired/Revoked',lsc:'#ef4444' },
        ].map(s => (
          <div key={s.label} className="ls-card" style={{'--lsc':s.lsc}}>
            <span className="ls-icon">{s.icon}</span>
            <div className="ls-value">{s.val}</div>
            <div className="ls-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="license-toolbar">
        <div className="license-search-wrap">
          <SearchIcon />
          <input className="license-search" placeholder="Search by ID, plan, email…"
            value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
        <select className="license-filter-select" value={statusFilter} onChange={e => handleStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">● Active</option>
          <option value="trial">◆ Trial</option>
          <option value="expiring_soon">⚠ Expiring Soon</option>
          <option value="expired">✕ Expired</option>
          <option value="revoked">⊘ Revoked</option>
        </select>
        <div className="license-toolbar-right">
          <button className="lc-icon-btn" onClick={() => dispatch(fetchLicenses())} title="Refresh"><RefreshIcon /></button>
        </div>
      </div>

      {/* Table */}
      <div className="license-table-section">
        <div className="license-table-header">
          <div>
            <div className="lth-title">License Records</div>
            <div className="lth-meta">{filtered.length > 0 ? `Page ${page} of ${totalPages} · ${filtered.length} total` : '0 licenses'}</div>
          </div>
        </div>

        {loading ? (
          <div className="license-loading"><div className="license-spinner" /> Loading licenses…</div>
        ) : filtered.length === 0 ? (
          <div className="license-empty">
            <span className="license-empty-icon">🔑</span>
            {licenses.length === 0 ? 'No licenses returned from API.' : 'No licenses match your filters.'}
          </div>
        ) : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table className="license-table">
                <thead>
                  <tr>
                    <th>License ID</th>
                    <th>Plan Type</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>Expires</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(l => {
                    const raw  = l._raw || l;
                    const st   = ST[l.status] || ST.active;
                    const busy = actionLoading === l.id;
                    const days = daysLeft(raw.expires_at || l.expirationDate);
                    return (
                      <tr key={l.id} onClick={() => handleRowClick(l)}
                        style={{ cursor:'pointer' }}>
                        <td>
                          <code style={{ fontSize:'0.78rem', color:'var(--text-muted)', background:'rgba(255,255,255,0.04)', padding:'2px 7px', borderRadius:4 }}>
                            {l.id}
                          </code>
                        </td>
                        <td>
                          <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--accent-primary)' }}>
                            {raw.plan_type || l.licenseType || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.7rem', fontWeight:600, background:st.bg, border:`1px solid ${st.border}`, color:st.color, display:'inline-flex', alignItems:'center', gap:4 }}>
                            <span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor', display:'inline-block' }} />
                            {l.status === 'expiring_soon' ? 'Expiring Soon' : (l.status||'active').charAt(0).toUpperCase()+(l.status||'').slice(1)}
                          </span>
                        </td>
                        <td style={{ fontSize:'0.82rem', color:'var(--text-secondary)' }}>
                          {fmt(raw.start_date || raw.created_at || l.issueDate)}
                        </td>
                        <td>
                          <div style={{ fontSize:'0.82rem', color: days !== null && days < 0 ? '#f87171' : days !== null && days <= 30 ? '#fbbf24' : 'var(--text-secondary)' }}>
                            {fmt(raw.expires_at || l.expirationDate)}
                          </div>
                          {days !== null && (
                            <div style={{ fontSize:'0.72rem', color: days < 0 ? '#f87171' : days <= 30 ? '#fbbf24' : 'var(--text-muted)', marginTop:2 }}>
                              {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                            </div>
                          )}
                        </td>
                        {canEdit && (
                          <td onClick={e => e.stopPropagation()}>
                            <div className="lc-actions">
                              {l.status !== 'revoked' && (
                                <button className="lc-btn renew" disabled={busy}
                                  onClick={() => dispatch(renewLicense({ licenseId: l.id }))}>
                                  {busy ? '…' : <><RenewIcon /> Change</>}
                                </button>
                              )}
                              <button className="lc-btn edit" disabled={busy}
                                onClick={() => dispatch(openEditModal(raw))}>
                                <EditIcon /> Edit
                              </button>
                              {l.status !== 'revoked' && (
                                <button className="lc-btn revoke" disabled={busy}
                                  onClick={() => { if(window.confirm('Revoke?')) dispatch(revokeLicense({ licenseId: l.id })); }}>
                                  <RevokeIcon /> Revoke
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
            <Pagination current={page} total={totalPages} totalItems={filtered.length}
              onPrev={() => setPage(p => Math.max(1,p-1))}
              onNext={() => setPage(p => Math.min(totalPages,p+1))}
              onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}