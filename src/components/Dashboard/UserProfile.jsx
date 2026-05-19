// src/components/Dashboard/UserProfile.js
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  revokeAccount,
  editUser,
  setNotification,
  clearNotification,
} from '../../store/slices/dashboardSlice';

// ── Inline style tokens (no dependency on global.css vars) ─
const T = {
  bg:         '#0d1320',
  bgCard:     '#0f1a2e',
  bgSurface:  '#111827',
  bgRaised:   '#1a2235',
  accent:     '#00d4ff',
  accentGlow: 'rgba(0,212,255,0.12)',
  accent2:    '#7c3aed',
  ok:         '#10b981',
  danger:     '#ef4444',
  dangerBg:   'rgba(239,68,68,0.08)',
  dangerBdr:  'rgba(239,68,68,0.25)',
  t1:         '#f0f4ff',
  t2:         '#8fa3c0',
  t3:         '#4a6080',
  b1:         'rgba(255,255,255,0.06)',
  b2:         'rgba(255,255,255,0.10)',
  b3:         'rgba(0,212,255,0.28)',
  r1:         '6px',
  r2:         '10px',
  r3:         '16px',
  ff:         "'Syne', sans-serif",
  fb:         "'DM Sans', sans-serif",
};

// ── Icons ─────────────────────────────────────────────────
const Ico = {
  back:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>,
  user:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  phone:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l1.18-1.18a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  map:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  shield: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  device: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  edit:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  revoke: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  save:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  info:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

// ── Spinner ───────────────────────────────────────────────
const Spinner = ({ size = 16 }) => (
  <span style={{
    display: 'inline-block', width: size, height: size,
    border: '2px solid rgba(255,255,255,0.15)',
    borderTopColor: T.accent, borderRadius: '50%',
    animation: 'spin 0.65s linear infinite', flexShrink: 0,
  }} />
);

// ── Field row ─────────────────────────────────────────────
function Field({ label, value, color }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: '0.72rem', color: T.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.88rem', color: color || T.t1, fontWeight: 500, wordBreak: 'break-word', lineHeight: 1.5 }}>
        {value || '—'}
      </div>
    </div>
  );
}

// ── Card section ──────────────────────────────────────────
function Card({ icon, title, children }) {
  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.b1}`,
      borderRadius: T.r2, padding: '22px',
      transition: 'border-color 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: T.t3, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 18 }}>
        <span style={{ color: T.accent }}>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────
export default function UserProfile({ user, onBack }) {
  const dispatch    = useDispatch();
  const { actionLoading } = useSelector(s => s.dashboard);
  const { user: me }      = useSelector(s => s.auth);
  const liveUser = useSelector(s => s.dashboard.users.find(u => u.id === user.id) || user);

  const role    = me?.role;
  const canEdit = role === 'superadmin';

  const [showEdit,   setShowEdit]   = useState(false);
  const [showRevoke, setShowRevoke] = useState(false);
  const [form, setForm] = useState({
    name:    liveUser.name    || '',
    phone:   liveUser.phone   || '',
    address: liveUser.address || '',
  });

  const isBusy    = actionLoading === liveUser.id || actionLoading === 'edit';
  const isRevoked = liveUser.account === 'revoked';
  const initials  = liveUser.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  const notify = (type, message) => {
    dispatch(setNotification({ type, message }));
    setTimeout(() => dispatch(clearNotification()), 3500);
  };

  const handleUpdate = () => {
    dispatch(editUser({ userId: liveUser.id, data: form }))
      .unwrap()
      .then(() => { setShowEdit(false); notify('success', 'Profile updated successfully'); })
      .catch(err  => notify('error', err));
  };

  const handleRevoke = () => {
    dispatch(revokeAccount({ userId: liveUser.id }))
      .unwrap()
      .then(() => { setShowRevoke(false); notify('success', 'Account revoked'); });
  };

  // ── styles ───────────────────────────────────────────────
  const S = {
    page: {
      fontFamily: T.fb,
      color: T.t1,
      minHeight: '60vh',
    },
    backBtn: {
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: 'none', border: `1px solid ${T.b1}`,
      borderRadius: T.r1, color: T.t2, fontSize: '0.82rem',
      fontWeight: 500, padding: '7px 14px', cursor: 'pointer',
      marginBottom: 22, transition: 'all 0.15s', fontFamily: T.fb,
    },
    hero: {
      background: T.bgCard, border: `1px solid ${T.b1}`,
      borderRadius: T.r3, padding: 28,
      display: 'flex', alignItems: 'flex-start',
      gap: 22, marginBottom: 18, position: 'relative',
      overflow: 'hidden', flexWrap: 'wrap',
    },
    heroAccentBar: {
      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
      background: `linear-gradient(90deg, ${T.accent}, ${T.accent2})`,
    },
    avatar: {
      width: 84, height: 84, borderRadius: '50%',
      objectFit: 'cover', border: `3px solid ${T.b2}`,
      boxShadow: `0 0 0 4px ${T.accentGlow}`, flexShrink: 0,
    },
    avatarFallback: {
      width: 84, height: 84, borderRadius: '50%',
      background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.ff, fontSize: '1.5rem', fontWeight: 700,
      color: '#fff', flexShrink: 0,
    },
    name: {
      fontFamily: T.ff, fontSize: '1.3rem', fontWeight: 700,
      letterSpacing: '-0.02em', color: T.t1, marginBottom: 2,
    },
    username: { fontSize: '0.84rem', color: T.t3, marginBottom: 10 },
    badgeRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    idBadge: {
      padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem',
      fontWeight: 600, background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${T.b1}`, color: T.t3, fontFamily: 'monospace',
    },
    activeBadge: {
      padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399',
    },
    inactiveBadge: {
      padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
      background: T.dangerBg, border: `1px solid ${T.dangerBdr}`, color: '#f87171',
    },
    actions: { display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'flex-start', flexWrap: 'wrap' },
    updateBtn: {
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '9px 18px', borderRadius: T.r2, fontSize: '0.85rem',
      fontWeight: 600, fontFamily: T.ff, cursor: canEdit ? 'pointer' : 'not-allowed',
      border: 'none', background: canEdit
        ? 'linear-gradient(135deg,#00c4ef,#0070d4)'
        : 'rgba(255,255,255,0.05)',
      color: canEdit ? '#fff' : T.t3,
      opacity: isBusy ? 0.5 : 1,
      transition: 'all 0.2s',
    },
    revokeBtn: {
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '9px 18px', borderRadius: T.r2, fontSize: '0.85rem',
      fontWeight: 600, fontFamily: T.ff, cursor: canEdit ? 'pointer' : 'not-allowed',
      background: T.dangerBg, border: `1px solid ${T.dangerBdr}`,
      color: canEdit ? '#f87171' : T.t3, opacity: isBusy ? 0.5 : 1,
      transition: 'all 0.2s',
    },
    grid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))',
      gap: 16, marginTop: 4,
    },
    editForm: {
      background: T.bgCard, border: `1px solid ${T.b3}`,
      borderRadius: T.r3, padding: 24, marginBottom: 16,
    },
    editGrid: {
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 14, marginBottom: 18,
    },
    editLabel: {
      display: 'block', fontSize: '0.75rem', fontWeight: 600,
      color: T.t2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
    },
    editInput: {
      width: '100%', padding: '10px 12px',
      background: T.bgSurface, border: `1px solid ${T.b1}`,
      borderRadius: T.r1, color: T.t1, fontSize: '0.875rem',
      fontFamily: T.fb, outline: 'none', boxSizing: 'border-box',
      transition: 'border-color 0.15s',
    },
    revokeStrip: {
      background: T.dangerBg, border: `1px solid ${T.dangerBdr}`,
      borderRadius: T.r2, padding: '16px 20px', marginBottom: 16,
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
    },
    permNote: {
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: '0.78rem', color: '#fbbf24',
      background: 'rgba(245,158,11,0.06)',
      border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: T.r2, padding: '10px 14px', marginBottom: 16,
    },
  };

  return (
    <>
      {/* Spinner keyframe injected once */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={S.page}>

        {/* Back */}
        <button style={S.backBtn} onClick={onBack}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.b1;     e.currentTarget.style.color = T.t2; }}>
          {Ico.back} Back to Dashboard
        </button>

        {/* Permission notice for non-superadmin */}
        {!canEdit && (
          <div style={S.permNote}>
            {Ico.info}
            {role === 'admin' ? 'Admin view — read only, no edit or revoke permissions.' : 'Viewer access — profile is read only.'}
          </div>
        )}

        {/* Hero card */}
        <div style={S.hero}>
          <div style={S.heroAccentBar} />
          {liveUser.image
            ? <img style={S.avatar} src={liveUser.image} alt={liveUser.name} onError={e => { e.target.style.display='none'; }} />
            : <div style={S.avatarFallback}>{initials}</div>
          }

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.name}>{liveUser.name}</div>
            <div style={S.username}>@<span style={{ color: T.accent }}>{liveUser.userId}</span></div>
            <div style={S.badgeRow}>
              <span style={S.idBadge}>{liveUser.id}</span>
              <span style={isRevoked ? S.inactiveBadge : liveUser.device === 'active' ? S.activeBadge : S.inactiveBadge}>
                {isRevoked ? 'Account Revoked' : liveUser.device === 'active' ? '● Active' : '○ Inactive'}
              </span>
            </div>
          </div>

          {!isRevoked && (
            <div style={S.actions}>
              <button style={S.updateBtn} disabled={isBusy}
                onClick={() => { if (!canEdit) return; setShowEdit(s => !s); setShowRevoke(false); }}
                title={canEdit ? 'Update profile' : 'No permission'}
                onMouseEnter={e => { if (canEdit && !isBusy) e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,196,239,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>
                {Ico.edit} Update Profile
              </button>
              <button style={S.revokeBtn} disabled={isBusy}
                onClick={() => { if (!canEdit) return; setShowRevoke(s => !s); setShowEdit(false); }}
                title={canEdit ? 'Revoke account' : 'No permission'}
                onMouseEnter={e => { if (canEdit && !isBusy) e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.dangerBg; }}>
                {Ico.revoke} Revoke
              </button>
            </div>
          )}
          {isRevoked && (
            <div style={{ ...S.inactiveBadge, padding: '8px 16px', fontSize: '0.82rem' }}>Account Revoked</div>
          )}
        </div>

        {/* Revoke confirm strip */}
        {showRevoke && (
          <div style={S.revokeStrip}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#f87171', fontWeight: 500 }}>
                Revoke {liveUser.name}'s account?
              </div>
              <div style={{ fontSize: '0.78rem', color: T.t2, marginTop: 2 }}>
                This will suspend all access. This action cannot be undone.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowRevoke(false)} style={{
                padding: '7px 14px', background: 'transparent', border: `1px solid ${T.b2}`,
                borderRadius: T.r1, color: T.t2, fontSize: '0.82rem', cursor: 'pointer', fontFamily: T.fb,
              }}>Cancel</button>
              <button onClick={handleRevoke} disabled={isBusy} style={{
                padding: '7px 16px', background: 'rgba(239,68,68,0.15)',
                border: `1px solid rgba(239,68,68,0.4)`, borderRadius: T.r1,
                color: '#f87171', fontSize: '0.82rem', fontWeight: 600,
                cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: T.fb,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {isBusy ? <Spinner size={13} /> : 'Yes, Revoke'}
              </button>
            </div>
          </div>
        )}

        {/* Inline edit form */}
        {showEdit && (
          <div style={S.editForm}>
            <div style={{ fontFamily: T.ff, fontSize: '1rem', fontWeight: 700, color: T.t1, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              {Ico.edit} Edit Profile
            </div>
            <div style={S.editGrid}>
              {[
                { key: 'name',    label: 'Full Name', full: false },
                { key: 'phone',   label: 'Phone',     full: false },
                { key: 'address', label: 'Address',   full: true  },
              ].map(f => (
                <div key={f.key} style={f.full ? { gridColumn: '1 / -1' } : {}}>
                  <label style={S.editLabel}>{f.label}</label>
                  <input
                    style={S.editInput}
                    value={form[f.key]}
                    autoFocus={f.key === 'name'}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    onFocus={e  => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}`; }}
                    onBlur={e   => { e.target.style.borderColor = T.b1;     e.target.style.boxShadow = 'none'; }}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') setShowEdit(false); }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEdit(false)} style={{
                padding: '10px 20px', background: 'transparent', border: `1px solid ${T.b2}`,
                borderRadius: T.r2, color: T.t2, fontSize: '0.875rem', cursor: 'pointer', fontFamily: T.fb,
              }}>Cancel</button>
              <button onClick={handleUpdate} disabled={isBusy} style={{
                padding: '10px 22px', background: 'linear-gradient(135deg,#00c4ef,#0070d4)',
                border: 'none', borderRadius: T.r2, color: '#fff',
                fontSize: '0.875rem', fontWeight: 600, fontFamily: T.ff,
                cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                {isBusy ? <Spinner size={14} /> : <>{Ico.save} Save Changes</>}
              </button>
            </div>
          </div>
        )}

        {/* Detail grid */}
        <div style={S.grid}>

          <Card icon={Ico.user} title="Personal Info">
            <Field label="Full Name" value={liveUser.name} />
            <Field label="Username"  value={`@${liveUser.userId}`} color={T.accent} />
            <Field label="User ID"   value={liveUser.id}   color={T.t3} />
            <Field label="Phone"     value={liveUser.phone} />
          </Card>

          <Card icon={Ico.map} title="Location">
            <Field label="Address" value={liveUser.address} />
          </Card>

          <Card icon={Ico.shield} title="Account Status">
            <Field label="Account"       value={isRevoked ? 'Revoked' : 'Active'}  color={isRevoked ? '#f87171' : '#34d399'} />
            <Field label="Device Status" value={liveUser.device === 'active' ? 'Active' : 'Inactive'} color={liveUser.device === 'active' ? '#34d399' : '#f87171'} />
            <Field label="Viewed By"     value={me?.name}   color={T.t3} />
            <Field label="Permission"    value={role === 'superadmin' ? 'Full Access' : role === 'admin' ? 'Read Only' : 'View Only'} color={T.t3} />
          </Card>

          <Card icon={Ico.device} title="Device Info">
            <Field label="Status"  value={liveUser.device === 'active' ? '● Connected' : '○ Disconnected'} color={liveUser.device === 'active' ? '#34d399' : '#f87171'} />
            <Field label="User ID" value={liveUser.id} color={T.t3} />
          </Card>

        </div>
      </div>
    </>
  );
}