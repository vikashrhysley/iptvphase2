// src/components/License/LicensePage.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchExpiringLicenses, fetchLicenses, fetchLicenseDetail, fetchLicenseStats,
  editLicense, validateLicense,
  clearToast, openEditModal, closeEditModal, closeValidationModal, clearDetail,
} from '../../store/slices/licenseSlice';
import './LicensePage.css';

const PAGE_SIZE = 8;

// ── Icons ────────────────────────────────────────────────
const SearchIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const RefreshIcon= () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
const EditIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const RenewIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
const RevokeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const SaveIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const ValidateIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M8 12l3 3 5-6"/></svg>;
const BackIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevLeft   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevRight  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;

// ── Helpers ───────────────────────────────────────────────
const fmt = (iso) => {
  if (!iso || iso === 'null') return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }); }
  catch { return '—'; }
};
const fmtDateTime = (iso) => {
  if (!iso || iso === 'null') return '—';
  try { return new Date(iso).toLocaleString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return '—'; }
};
const daysLeft = (iso) => {
  if (!iso || iso === 'null') return null;
  try { return Math.ceil((new Date(iso) - Date.now()) / 86400000); }
  catch { return null; }
};

const ST = {
  active:        { bg:'rgba(16,185,129,0.1)',  border:'rgba(16,185,129,0.3)',  color:'#34d399' },
  trial:         { bg:'rgba(124,58,237,0.1)',  border:'rgba(124,58,237,0.3)',  color:'#a78bfa' },
  expiring_soon: { bg:'rgba(245,158,11,0.1)',  border:'rgba(245,158,11,0.3)',  color:'#fbbf24' },
  expired:       { bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.25)',  color:'#f87171' },
  revoked:       { bg:'rgba(100,100,100,0.1)', border:'rgba(100,100,100,0.3)', color:'#94a3b8' },
};
const stStyle = (s) => ST[s] || ST.active;
const stLabel = (s) => s === 'expiring_soon' ? 'Expiring Soon' : s ? s.charAt(0).toUpperCase()+s.slice(1) : 'Active';

const DEVICE_ICONS = { phone:'📱', desktop:'🖥️', tablet:'📟', mobile:'📱', web:'🌐', tv:'📺', default:'📱' };

const buildEditForm = (license) => ({
  action: license?.defaultAction || 'extend',
  expires_at: license?.expiresAt ? license.expiresAt.slice(0,10) : '',
  token_ttl_seconds: '',
  revoke_reason: '',
});

const buildLicensePatchPayload = (form) => {
  if (form.action === 'extend') {
    return {
      action: 'extend',
      expires_at: form.expires_at,
    };
  }

  if (form.action === 'set_ttl') {
    return {
      action: 'set_ttl',
      token_ttl_seconds: Number(form.token_ttl_seconds),
    };
  }

  return {
    action: 'revoke',
    reason: form.revoke_reason?.trim() || undefined,
  };
};

const isLicensePatchValid = (form) => {
  if (form.action === 'extend') return Boolean(form.expires_at);
  if (form.action === 'set_ttl') return Number(form.token_ttl_seconds) > 0;
  return true;
};

const actionCopy = {
  extend: {
    title: 'Change Expiry',
    description: 'Update this license expiration date.',
    button: 'Apply Change',
  },
  set_ttl: {
    title: 'Override Token TTL',
    description: 'Set a custom token time-to-live in seconds.',
    button: 'Update TTL',
  },
  revoke: {
    title: 'Revoke License',
    description: 'Revoke access for this license. The linked device will fail validation.',
    button: 'Revoke License',
  },
};

const countText = (value) => Number(value || 0).toLocaleString();

const formatTtl = (seconds) => {
  if (seconds === undefined || seconds === null) return '—';
  const total = Number(seconds);
  if (!Number.isFinite(total)) return '—';
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const buildFallbackStats = (licenses) => ({
  total_licenses: licenses.length,
  active_count: licenses.filter(l => l.status === 'active').length,
  expired_count: licenses.filter(l => l.status === 'expired').length,
  revoked_count: licenses.filter(l => l.status === 'revoked').length,
  expiring_7d: licenses.filter(l => {
    const days = daysLeft(l.expiresAt);
    return l.status !== 'revoked' && days !== null && days >= 0 && days <= 7;
  }).length,
  ui_filter_counts: {
    active: licenses.filter(l => l.status === 'active').length,
    trial: licenses.filter(l => l.status === 'trial').length,
    expiring_soon: licenses.filter(l => {
      const days = daysLeft(l.expiresAt);
      return l.status !== 'revoked' && days !== null && days >= 0 && days <= 7;
    }).length,
    expired: licenses.filter(l => l.status === 'expired').length,
    revoked: licenses.filter(l => l.status === 'revoked').length,
    expired_revoked: licenses.filter(l => l.status === 'expired' || l.status === 'revoked').length,
  },
});

// ── Toast ─────────────────────────────────────────────────
function Toast() {
  const dispatch = useDispatch();
  const { toast } = useSelector(s => s.licenses);
  useEffect(() => {
    if (toast) { const t = setTimeout(() => dispatch(clearToast()), 3200); return () => clearTimeout(t); }
  }, [toast, dispatch]);
  if (!toast) return null;
  return <div className={`toast ${toast.type === 'success' ? 'success' : 'error'}`}>{toast.type==='success'?'✓':'✕'} {toast.msg}</div>;
}

// ── Edit Modal ────────────────────────────────────────────
function EditModal() {
  const dispatch = useDispatch();
  const { editModal, actionLoading } = useSelector(s => s.licenses);
  const [form, setForm] = useState(() => buildEditForm(editModal));
  const [submitError, setSubmitError] = useState('');

  if (!editModal) return null;
  const busy = actionLoading === editModal.id;
  const canSave = isLicensePatchValid(form);
  const copy = actionCopy[form.action] || actionCopy.extend;

  const handleApply = async () => {
    if (!canSave || busy) return;
    setSubmitError('');
    try {
      await dispatch(editLicense({ licenseId: editModal.id, data: buildLicensePatchPayload(form) })).unwrap();
    } catch (err) {
      setSubmitError(err || 'Unable to update license. Please try again.');
    }
  };

  return (
    <div className="lc-modal-overlay" onClick={() => dispatch(closeEditModal())}>
      <div className="lc-modal" onClick={e => e.stopPropagation()}>
        <div className="lc-modal-title"><EditIcon /> {copy.title}</div>
        <div className="lc-modal-subtitle">{copy.description}</div>
        <div className="lc-modal-grid">
          <div className="lc-modal-field full">
            <label className="lc-modal-label">Action</label>
            <select className="lc-modal-select" value={form.action}
              onChange={e => {
                setSubmitError('');
                setForm({...buildEditForm(editModal), action:e.target.value});
              }}
              autoFocus>
              <option value="extend">Extend expiry</option>
              <option value="set_ttl">Override token TTL</option>
              <option value="revoke">Revoke license</option>
            </select>
          </div>
          {form.action === 'extend' && (
            <div className="lc-modal-field full">
              <label className="lc-modal-label">New Expiration Date</label>
              <input className="lc-modal-input" type="date" value={form.expires_at}
                onChange={e => {
                  setSubmitError('');
                  setForm(f=>({...f,expires_at:e.target.value}));
                }} />
            </div>
          )}
          {form.action === 'set_ttl' && (
            <div className="lc-modal-field full">
              <label className="lc-modal-label">Token TTL Seconds</label>
              <input className="lc-modal-input" type="number" min="1" value={form.token_ttl_seconds}
                placeholder="Example: 3600"
                onChange={e => {
                  setSubmitError('');
                  setForm(f=>({...f,token_ttl_seconds:e.target.value}));
                }} />
            </div>
          )}
          {form.action === 'revoke' && (
            <div className="lc-modal-field full">
              <label className="lc-modal-label">Revocation Reason</label>
              <textarea className="lc-modal-input" rows={3} value={form.revoke_reason}
                placeholder="Optional reason"
                onChange={e => {
                  setSubmitError('');
                  setForm(f=>({...f,revoke_reason:e.target.value}));
                }} />
            </div>
          )}
        </div>
        {submitError && <div className="lc-modal-error">{submitError}</div>}
        <div className="lc-modal-actions">
          <button className="lc-modal-cancel" onClick={() => dispatch(closeEditModal())}>Cancel</button>
          <button className="lc-modal-save" disabled={busy || !canSave}
            onClick={handleApply}>
            {busy ? <span className="lc-mini-spin"/> : <><SaveIcon /> {copy.button}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ValidationModal() {
  const dispatch = useDispatch();
  const { validationModal: result } = useSelector(s => s.licenses);
  if (!result) return null;

  const valid = Boolean(result.is_valid);

  return (
    <div className="lc-modal-overlay" onClick={() => dispatch(closeValidationModal())}>
      <div className="lc-modal" onClick={e => e.stopPropagation()}>
        <div className="lc-modal-title"><ValidateIcon /> License Validation</div>
        <div className="lv-result">
          <div className={`lv-status ${valid ? 'valid' : 'invalid'}`}>
            <span>{valid ? 'Valid' : 'Invalid'}</span>
            <strong>{stLabel(result.status)}</strong>
          </div>
          <div className="lv-grid">
            <IF label="License ID" value={result.license_id || result.licenseId} mono />
            <IF label="Device ID" value={result.device_id} mono />
            <IF label="Expires" value={fmtDateTime(result.expires_at)} />
            <IF label="TTL" value={formatTtl(result.ttl_seconds)} accent />
          </div>
          <div className="lv-errors">
            <div className="lc-modal-label">Validation Errors</div>
            {result.validation_errors?.length ? (
              <ul>
                {result.validation_errors.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
              </ul>
            ) : (
              <div className="lv-empty">No validation errors returned.</div>
            )}
          </div>
        </div>
        <div className="lc-modal-actions">
          <button className="lc-modal-save" onClick={() => dispatch(closeValidationModal())}>Done</button>
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
          {pages.map(p=>typeof p==='string'
            ? <span key={p} className="lp-ellipsis">…</span>
            : <button key={p} className={`lp-page${p===current?' active':''}`} onClick={()=>onPage(p)}>{p}</button>)}
        </div>
        <button className="lp-nav" onClick={onNext} disabled={current===total}>Next <ChevRight /></button>
      </div>
    </div>
  );
}

// ── Info field ────────────────────────────────────────────
const IF = ({ label, value, accent, mono }) => (
  <div style={{ marginBottom:14 }}>
    <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>{label}</div>
    <div style={{ fontWeight:500, color: accent?'var(--accent-primary)':'var(--text-primary)',
      fontFamily: mono?'monospace':'inherit', fontSize: mono?'0.78rem':'0.875rem', wordBreak:'break-all' }}>
      {value ?? '—'}
    </div>
  </div>
);

// ── Info card ─────────────────────────────────────────────
const IC = ({ title, children, fullWidth }) => (
  <div className="ld-card" style={ fullWidth ? { gridColumn:'1/-1' } : {}}>
    <div className="ld-card-title">{title}</div>
    {children}
  </div>
);

// ── Detail Panel ──────────────────────────────────────────
function LicenseDetail({ onBack }) {
  const dispatch = useDispatch();
  const { selectedDetail: l, detailLoading, actionLoading } = useSelector(s => s.licenses);
  const { user: me } = useSelector(s => s.auth);
  const canEdit = me?.role === 'superadmin';
  const canValidate = me?.role === 'admin' || me?.role === 'superadmin';

  if (detailLoading || !l) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:14, color:'var(--text-muted)' }}>
      <div className="license-spinner" />
      <span>Loading license details…</span>
    </div>
  );

  const st   = stStyle(l.status);
  const busy = actionLoading === l.id;
  const days = daysLeft(l.expiresAt);

  // Device from API
  const dev = l.device || {};
  const devIcon = DEVICE_ICONS[dev.device_type?.toLowerCase()] || DEVICE_ICONS.default;

  // History from API
  const history = l.history || [];

  // Risk score from device
  const riskScore = dev.risk_score ?? null;
  const riskColor = riskScore === null ? 'var(--text-muted)'
    : riskScore >= 70 ? '#f87171'
    : riskScore >= 40 ? '#fbbf24'
    : '#34d399';

  return (
    <div className="license-page" style={{ maxWidth:900 }}>

      {/* Back button */}
      <button onClick={onBack} className="ld-back-btn"><BackIcon /> Back to Licenses</button>

      {/* Hero */}
      <div className="ld-hero">
        <div className="ld-hero-bar" />
        <div className="ld-hero-top">
          <div>
            <div className="ld-hero-title">{l.planType || 'License'} Plan</div>
            <div className="ld-hero-id">ID: <code style={{ fontSize:'0.78rem', opacity:0.7 }}>{l.id}</code></div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
              <span className="ld-badge" style={{ background:st.bg, border:`1px solid ${st.border}`, color:st.color }}>
                ● {stLabel(l.status)}
              </span>
              {days !== null && days >= 0 && l.status !== 'revoked' && (
                <span className="ld-badge" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--border-subtle)', color:'var(--text-muted)' }}>
                  {days}d remaining
                </span>
              )}
              {days !== null && days < 0 && (
                <span className="ld-badge" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171' }}>
                  Expired {Math.abs(days)}d ago
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {(canEdit || canValidate) && (
            <div className="ld-actions">
              {canValidate && (
                <button className="ld-btn ld-btn-validate" disabled={busy}
                  onClick={() => dispatch(validateLicense({ licenseId: l.id }))}>
                  <ValidateIcon /> Validate
                </button>
              )}
              {canEdit && l.status !== 'revoked' && (
                <button className="ld-btn ld-btn-change" disabled={busy}
                  onClick={() => dispatch(openEditModal({ ...l, defaultAction: 'extend' }))}>
                  <RenewIcon /> Change
                </button>
              )}
              {canEdit && l.status !== 'revoked' && (
                <button className="ld-btn ld-btn-revoke" disabled={busy}
                  onClick={() => dispatch(openEditModal({ ...l, defaultAction: 'revoke' }))}>
                  <RevokeIcon /> Revoke
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail grid */}
      <div className="ld-grid">

        {/* License Info */}
        <IC title="🔑 License Details">
          <IF label="License ID" value={l.id}         mono />
          <IF label="Plan Type"  value={l.planType}   accent />
          <IF label="Status"     value={stLabel(l.status)} />
          <IF label="Start Date" value={fmt(l.startDate)} />
          <IF label="Expires"    value={fmt(l.expiresAt)} />
          {l.revocationReason && <IF label="Revocation Reason" value={l.revocationReason} />}
        </IC>

        {/* Device */}
        {dev.id ? (
          <IC title={`${devIcon} Device`}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', marginBottom:14 }}>
              <span style={{ fontSize:'1.4rem' }}>{devIcon}</span>
              <div>
                <div style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--text-primary)', textTransform:'capitalize' }}>
                  {dev.device_brand ? `${dev.device_brand} ` : ''}{dev.device_type || 'Device'}
                </div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{dev.device_model || '—'}</div>
              </div>
              <span style={{ marginLeft:'auto', padding:'3px 10px', borderRadius:20, fontSize:'0.7rem', fontWeight:600,
                background: dev.status==='active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${dev.status==='active' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
                color: dev.status==='active' ? '#34d399' : '#f87171' }}>
                {dev.status || 'unknown'}
              </span>
            </div>
            <IF label="Device ID"    value={dev.id}          mono />
            <IF label="App Version"  value={dev.app_version} accent />
            <IF label="Enrolled At"  value={fmtDateTime(dev.enrolled_at)} />
            <IF label="Last Heartbeat" value={dev.last_heartbeat_at ? fmtDateTime(dev.last_heartbeat_at) : 'Never'} />
            {/* Risk score */}
            {riskScore !== null && (
              <div style={{ marginTop:8 }}>
                <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Risk Score</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, height:6, background:'var(--bg-raised)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(100,riskScore)}%`, background:riskColor, borderRadius:3 }} />
                  </div>
                  <span style={{ fontSize:'0.82rem', fontWeight:600, color:riskColor, minWidth:32 }}>{riskScore}</span>
                </div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:3 }}>
                  {riskScore < 40 ? 'Low risk' : riskScore < 70 ? 'Medium risk' : 'High risk'}
                </div>
              </div>
            )}
          </IC>
        ) : (
          <IC title="📱 Device">
            <div style={{ fontSize:'0.82rem', color:'var(--text-muted)', padding:'12px 0' }}>No device enrolled yet.</div>
          </IC>
        )}

        {/* History */}
        {history.length > 0 && (
          <IC title="📋 License History" fullWidth>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {history.map((h, i) => {
                const hSt = stStyle(h.status);
                return (
                  <div key={h.id || i} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'12px 16px', background:'var(--bg-surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)' }}>
                    {/* Status dot */}
                    <div style={{ width:8, height:8, borderRadius:'50%', background:hSt.color, marginTop:6, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                        <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-primary)', textTransform:'capitalize' }}>
                          {h.plan_type || '—'}
                        </span>
                        <span style={{ padding:'2px 8px', borderRadius:12, fontSize:'0.68rem', fontWeight:600, background:hSt.bg, border:`1px solid ${hSt.border}`, color:hSt.color }}>
                          {stLabel(h.status)}
                        </span>
                        {h.change_reason && (
                          <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontStyle:'italic' }}>
                            {h.change_reason.replace(/_/g,' ')}
                          </span>
                        )}
                      </div>
                      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                        {h.expires_at && (
                          <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                            Expires: {fmt(h.expires_at)}
                          </span>
                        )}
                        {h.revoked_at && (
                          <span style={{ fontSize:'0.75rem', color:'#f87171' }}>
                            Revoked: {fmtDateTime(h.revoked_at)}
                          </span>
                        )}
                        {h.changed_by && h.changed_by !== 'null' && (
                          <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                            By: {h.changed_by}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </IC>
        )}

        {/* Notes */}
        {l.notes && (
          <IC title="📝 Notes" fullWidth>
            <p style={{ fontSize:'0.875rem', color:'var(--text-secondary)', lineHeight:1.6 }}>{l.notes}</p>
          </IC>
        )}

      </div>
    </div>
  );
}

// ── Main License List ─────────────────────────────────────
export default function LicensePage() {
  const dispatch = useDispatch();
  const {
    licenses,
    expiringLicenses,
    stats: licenseStats,
    loading,
    expiringLoading,
    statsLoading,
    actionLoading,
    selectedDetail,
    editModal,
    validationModal,
  } = useSelector(s => s.licenses);
  const { user: me } = useSelector(s => s.auth);
  const canEdit = me?.role === 'superadmin';
  const canValidate = me?.role === 'admin' || me?.role === 'superadmin';
  const canShowActions = canEdit || canValidate;

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page,         setPage]         = useState(1);

  useEffect(() => {
    dispatch(fetchLicenses());
    dispatch(fetchLicenseStats());
  }, [dispatch]);

  useEffect(() => {
    if (statusFilter === 'expiring_soon') {
      dispatch(fetchExpiringLicenses({ days: 7, page: 1, page_size: 200 }));
    }
  }, [dispatch, statusFilter]);

  const handleRowClick = (lic) => dispatch(fetchLicenseDetail({ licenseId: lic.id }));
  const handleBack     = ()    => dispatch(clearDetail());
  const handleSearch   = v    => { setSearch(v);       setPage(1); };
  const handleStatus   = v    => { setStatusFilter(v); setPage(1); };

  if (selectedDetail) return <><Toast />{editModal && <EditModal />}{validationModal && <ValidationModal />}<LicenseDetail onBack={handleBack} /></>;

  const usingExpiringApi = statusFilter === 'expiring_soon';
  const tableLicenses = usingExpiringApi ? expiringLicenses : licenses;
  const tableLoading = loading || (usingExpiringApi && expiringLoading);

  const filtered = tableLicenses.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || [l.id, l.planType].some(v => v?.toLowerCase().includes(q));
    const days = daysLeft(l.expiresAt);
    const isExpiringSoon = l.status === 'expiring_soon'
      || (l.status !== 'revoked' && days !== null && days >= 0 && days <= 7);
    const matchStatus = statusFilter === 'all'
      || l.status === statusFilter
      || (statusFilter === 'expiring_soon' && (usingExpiringApi || isExpiringSoon));
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const fallbackStats = buildFallbackStats(licenses);
  const stats = licenseStats || fallbackStats;
  const filterCounts = stats.ui_filter_counts || fallbackStats.ui_filter_counts;
  const statCards = [
    { icon:'🔑', val:stats.total_licenses, label:'Total',           lsc:'var(--accent-primary)' },
    { icon:'✅', val:stats.active_count,   label:'Active',          lsc:'#10b981' },
    { icon:'◆',  val:stats.by_plan?.trial ?? filterCounts.trial, label:'Trial', lsc:'#7c3aed' },
    { icon:'⊘',  val:(stats.expired_count || 0) + (stats.revoked_count || 0), label:'Expired/Revoked', lsc:'#ef4444' },
  ];

  return (
    <div className="license-page">
      <Toast />{editModal && <EditModal />}{validationModal && <ValidationModal />}

      {/* Stats */}
      <div className="license-stats">
        {statCards.map(s => (
          <div key={s.label} className="ls-card" style={{'--lsc':s.lsc}}>
            <span className="ls-icon">{s.icon}</span>
            <div className="ls-value">{statsLoading ? '...' : countText(s.val)}</div>
            <div className="ls-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="license-toolbar">
        <div className="license-search-wrap">
          <SearchIcon />
          <input className="license-search" placeholder="Search by ID or plan type…"
            value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
        <select className="license-filter-select" value={statusFilter} onChange={e => handleStatus(e.target.value)}>
          <option value="all">All Status ({countText(stats.total_licenses)})</option>
          <option value="active">● Active ({countText(filterCounts.active)})</option>
          <option value="trial">◆ Trial ({countText(filterCounts.trial)})</option>
          <option value="expiring_soon">⚠ Expiring Soon ({countText(filterCounts.expiring_soon)})</option>
          <option value="expired">✕ Expired ({countText(filterCounts.expired)})</option>
          <option value="revoked">⊘ Revoked ({countText(filterCounts.revoked)})</option>
        </select>
        <div className="license-toolbar-right">
          <button
            className="lc-icon-btn"
            onClick={() => {
              dispatch(fetchLicenses());
              dispatch(fetchLicenseStats());
              if (statusFilter === 'expiring_soon') dispatch(fetchExpiringLicenses({ days: 7, page: 1, page_size: 200 }));
            }}
            title="Refresh"
          >
            <RefreshIcon />
          </button>
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

        {tableLoading ? (
          <div className="license-loading"><div className="license-spinner" /> Loading licenses…</div>
        ) : filtered.length === 0 ? (
          <div className="license-empty">
            <span className="license-empty-icon">🔑</span>
            {tableLicenses.length === 0 ? 'No licenses returned from API.' : 'No licenses match your filters.'}
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
                    {canShowActions && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(l => {
                    const st   = stStyle(l.status);
                    const busy = actionLoading === l.id;
                    const days = daysLeft(l.expiresAt);
                    return (
                      <tr key={l.id} onClick={() => handleRowClick(l)} style={{ cursor:'pointer' }}>
                        <td>
                          <code style={{ fontSize:'0.78rem', color:'var(--text-muted)', background:'rgba(255,255,255,0.04)', padding:'2px 7px', borderRadius:4 }}>
                            {l.id}
                          </code>
                        </td>
                        <td>
                          <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--accent-primary)' }}>
                            {l.planType || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ padding:'3px 10px', borderRadius:20, fontSize:'0.7rem', fontWeight:600, background:st.bg, border:`1px solid ${st.border}`, color:st.color, display:'inline-flex', alignItems:'center', gap:4 }}>
                            <span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor', display:'inline-block' }} />
                            {stLabel(l.status)}
                          </span>
                        </td>
                        <td style={{ fontSize:'0.82rem', color:'var(--text-secondary)' }}>
                          {fmt(l.startDate)}
                        </td>
                        <td>
                          <div style={{ fontSize:'0.82rem', color: days !== null && days < 0 ? '#f87171' : days !== null && days <= 30 ? '#fbbf24' : 'var(--text-secondary)' }}>
                            {fmt(l.expiresAt)}
                          </div>
                          {days !== null && (
                            <div style={{ fontSize:'0.72rem', color: days < 0 ? '#f87171' : days <= 30 ? '#fbbf24' : 'var(--text-muted)', marginTop:2 }}>
                              {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                            </div>
                          )}
                        </td>
                        {canShowActions && (
                          <td onClick={e => e.stopPropagation()}>
                            <div className="lc-actions">
                              {canValidate && (
                                <button className="lc-btn validate" disabled={busy}
                                  onClick={() => dispatch(validateLicense({ licenseId: l.id }))}>
                                  <ValidateIcon /> Validate
                                </button>
                              )}
                              {canEdit && l.status !== 'revoked' && (
                                <button className="lc-btn renew" disabled={busy}
                                  onClick={() => dispatch(openEditModal({ ...l, defaultAction: 'extend' }))}>
                                  <RenewIcon /> Change
                                </button>
                              )}
                              {canEdit && l.status !== 'revoked' && (
                                <button className="lc-btn revoke" disabled={busy}
                                  onClick={() => dispatch(openEditModal({ ...l, defaultAction: 'revoke' }))}>
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
