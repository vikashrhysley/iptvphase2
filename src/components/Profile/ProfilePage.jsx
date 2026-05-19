// src/components/Profile/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { apiGetProfile } from '../../services/api';
import './ProfilePage.css';

// ── Icons ─────────────────────────────────────────────────
const EditIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const UserIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const ShieldIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const KeyIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const SaveIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const CheckIcon  = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon      = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const RefreshIcon= () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;

// ── Permission resource labels ─────────────────────────────
const RESOURCE_LABELS = {
  devices:       '📱 Devices',
  licenses:      '🔑 Licenses',
  subscriptions: '📋 Subscriptions',
  payments:      '💳 Payments',
  users:         '👥 Users',
  admin_users:   '🛡️ Admin Users',
  audit_logs:    '📝 Audit Logs',
  system_config: '⚙️ System Config',
  risk:          '⚠️ Risk',
};

const ACTION_COLORS = {
  read:    { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  color: '#34d399' },
  write:   { bg: 'rgba(0,212,255,0.1)',   border: 'rgba(0,212,255,0.3)',   color: '#00d4ff' },
  delete:  { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   color: '#f87171' },
  execute: { bg: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.3)',  color: '#a78bfa' },
};

// ── Field ──────────────────────────────────────────────────
function Field({ label, value, className = '' }) {
  return (
    <div className="pp-field">
      <div className="pp-field-label">{label}</div>
      <div className={`pp-field-value ${className}`}>{value || '—'}</div>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────
function EditModal({ profile, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    email:     profile?.email    || '',
  });
  const [saving, setSaving]     = useState(false);
  const [toast,  setToast]      = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    onSave(form);
    setToast(true);
    setTimeout(() => { setToast(false); onClose(); }, 1200);
  };
  const onKey = e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); };

  return (
    <>
      {toast && <div className="pp-toast"><CheckIcon /> Profile updated successfully</div>}
      <div className="pp-modal-overlay" onClick={onClose}>
        <div className="pp-modal" onClick={e => e.stopPropagation()}>
          <div className="pp-modal-title"><EditIcon /> Edit Profile</div>
          <div className="pp-modal-grid">
            <div className="pp-modal-field full">
              <label className="pp-modal-label">Full Name</label>
              <input className="pp-modal-input" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                onKeyDown={onKey} autoFocus placeholder="Enter your full name" />
            </div>
            <div className="pp-modal-field full">
              <label className="pp-modal-label">Email</label>
              <input className="pp-modal-input" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                onKeyDown={onKey} />
            </div>
          </div>
          <div className="pp-modal-actions">
            <button className="pp-cancel-btn" onClick={onClose}>Cancel</button>
            <button className="pp-save-btn" onClick={handleSave} disabled={saving}>
              {saving
                ? <span className="pp-mini-spin" />
                : <><SaveIcon /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main ───────────────────────────────────────────────────
export default function ProfilePage() {
  const { accessToken } = useSelector(s => s.auth);
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [showEdit,  setShowEdit]  = useState(false);

  const loadProfile = async () => {
    if (!accessToken) {
      setError('No access token available. Please log in again.');
      setLoading(false);
      return;
    }
    setLoading(true); setError(null);
    try {
      const data = await apiGetProfile(accessToken);
      setProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, [accessToken]);

  const handleSave = (updated) => setProfile(p => ({ ...p, ...updated }));

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:14, color:'var(--text-muted)', flexDirection:'column' }}>
      <div style={{ width:32, height:32, border:'3px solid var(--border-medium)', borderTopColor:'var(--accent-primary)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Loading profile…
    </div>
  );

  if (error) return (
    <div className="profile-page-wrap">
      <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'var(--radius-md)', padding:'20px 24px', color:'#f87171', display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:'1.2rem' }}>⚠️</span>
        <div>
          <div style={{ fontWeight:600, marginBottom:4 }}>Failed to load profile</div>
          <div style={{ fontSize:'0.82rem', opacity:0.8 }}>{error}</div>
        </div>
        <button onClick={loadProfile} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--radius-sm)', color:'#f87171', cursor:'pointer', fontSize:'0.8rem', fontFamily:'var(--font-body)' }}>
          <RefreshIcon /> Retry
        </button>
      </div>
    </div>
  );

  if (!profile) return null;

  const role     = profile.role || 'viewer';
  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
    : profile.email?.slice(0,2).toUpperCase() || '??';

  const roleLabel = role === 'superadmin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1);
  const perms     = profile.permissions || {};

  return (
    <div className="profile-page-wrap">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {showEdit && (
        <EditModal profile={profile} onClose={() => setShowEdit(false)} onSave={handleSave} />
      )}

      {/* ── Hero ── */}
      <div className={`pp-hero ${role}`}>
        <div className={`pp-avatar ${role}`}>
          {initials}
          <div className={`pp-avatar-badge ${role}`}>
            {role === 'superadmin' ? '★' : role === 'admin' ? 'A' : 'V'}
          </div>
        </div>

        <div className="pp-hero-info">
          <div className="pp-name">{profile.full_name || profile.email?.split('@')[0] || 'User'}</div>
          <div className="pp-email">{profile.email}</div>
          <div className="pp-badges">
            <span className={`pp-role-badge ${role}`}>
              {role === 'superadmin' ? '★' : role === 'admin' ? '◆' : '●'} {roleLabel}
            </span>
            <span className="pp-status-badge">
              <span className="pp-status-dot" /> Active
            </span>
            {profile.totp_enabled && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:20, fontSize:'0.72rem', fontWeight:500, background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.25)', color:'#a78bfa' }}>
                🔐 2FA Enabled
              </span>
            )}
          </div>
        </div>

        <div className="pp-hero-actions">
          <button className="pp-edit-btn" onClick={() => setShowEdit(true)}>
            <EditIcon /> Edit Profile
          </button>
          <button onClick={loadProfile} title="Refresh" style={{ width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-raised)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', cursor:'pointer', color:'var(--text-muted)', transition:'all 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--accent-primary)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
            <RefreshIcon />
          </button>
        </div>
      </div>

      {/* ── Info cards ── */}
      <div className="pp-grid">

        {/* Personal Info */}
        <div className="pp-card">
          <div className="pp-card-title"><UserIcon /> Personal Information</div>
          <Field label="Full Name" value={profile.full_name || '—'} />
          <Field label="Email"     value={profile.email}     className="accent" />
          <Field label="2FA"       value={profile.totp_enabled ? '✓ Enabled' : '✗ Not enabled'} className={profile.totp_enabled ? 'accent' : 'muted'} />
        </div>

        {/* Account */}
        <div className="pp-card">
          <div className="pp-card-title"><KeyIcon /> Account Details</div>
          <Field label="Role"    value={roleLabel} />
          <Field label="Role ID" value={profile.role_id} className="mono" />
          <Field label="User ID" value={profile.id}      className="mono" />
          <Field label="Status"  value="Active"           className="accent" />
        </div>

      </div>

      {/* ── Permissions ── */}
      {Object.keys(perms).length > 0 && (
        <div className="pp-permissions">
          <div className="pp-card-title" style={{ marginBottom:16 }}>
            <ShieldIcon /> Access Permissions
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {Object.entries(perms).map(([resource, actions]) => (
              <div key={resource} style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', padding:'12px 16px', background:'var(--bg-surface)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-subtle)' }}>
                {/* Resource name */}
                <div style={{ minWidth:140, fontSize:'0.82rem', fontWeight:600, color:'var(--text-primary)' }}>
                  {RESOURCE_LABELS[resource] || resource}
                </div>
                {/* Action badges */}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {Array.isArray(actions) && actions.map(action => {
                    const cfg = ACTION_COLORS[action] || ACTION_COLORS.read;
                    return (
                      <span key={action} style={{
                        padding:'3px 10px', borderRadius:20,
                        fontSize:'0.7rem', fontWeight:600,
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        color: cfg.color,
                        textTransform:'capitalize',
                      }}>
                        {action}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}