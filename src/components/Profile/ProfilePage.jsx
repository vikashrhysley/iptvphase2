// src/components/Profile/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import './ProfilePage.css';

// ── Icons ─────────────────────────────────────────────────
const EditIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const UserIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const ShieldIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const KeyIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const SaveIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const CheckIcon  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon      = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

// ── Role config ────────────────────────────────────────────
const ROLE_CONFIG = {
  superadmin: {
    label:       'Super Admin',
    description: 'Full system access — can manage all users, devices, licenses and system settings.',
    permissions: [
      { label: 'View Dashboard',        allowed: true  },
      { label: 'Edit Users',            allowed: true  },
      { label: 'Revoke Accounts',       allowed: true  },
      { label: 'Manage Devices',        allowed: true  },
      { label: 'Manage Licenses',       allowed: true  },
      { label: 'Renew Licenses',        allowed: true  },
      { label: 'Revoke Licenses',       allowed: true  },
      { label: 'View Account Column',   allowed: true  },
      { label: 'System Settings',       allowed: true  },
      { label: 'User Management',       allowed: true  },
    ],
  },
  admin: {
    label:       'Admin',
    description: 'Read-only access to all data. Cannot edit, revoke or manage users.',
    permissions: [
      { label: 'View Dashboard',        allowed: true  },
      { label: 'Edit Users',            allowed: false },
      { label: 'Revoke Accounts',       allowed: false },
      { label: 'Manage Devices',        allowed: false },
      { label: 'Manage Licenses',       allowed: false },
      { label: 'Renew Licenses',        allowed: false },
      { label: 'Revoke Licenses',       allowed: false },
      { label: 'View Account Column',   allowed: true  },
      { label: 'System Settings',       allowed: false },
      { label: 'User Management',       allowed: false },
    ],
  },
  viewer: {
    label:       'Viewer',
    description: 'View-only access. Account column is hidden. No management capabilities.',
    permissions: [
      { label: 'View Dashboard',        allowed: true  },
      { label: 'Edit Users',            allowed: false },
      { label: 'Revoke Accounts',       allowed: false },
      { label: 'Manage Devices',        allowed: false },
      { label: 'Manage Licenses',       allowed: false },
      { label: 'Renew Licenses',        allowed: false },
      { label: 'Revoke Licenses',       allowed: false },
      { label: 'View Account Column',   allowed: false },
      { label: 'System Settings',       allowed: false },
      { label: 'User Management',       allowed: false },
    ],
  },
};

// ── Field row ─────────────────────────────────────────────
function Field({ label, value, className = '' }) {
  return (
    <div className="pp-field">
      <div className="pp-field-label">{label}</div>
      <div className={`pp-field-value ${className}`}>{value || '—'}</div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────
function EditModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    name:     user?.name     || '',
    email:    user?.email    || '',
    username: user?.username || '',
    phone:    user?.phone    || '',
  });
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600)); // simulate API
    setSaving(false);
    onSave(form);
    setShowToast(true);
    setTimeout(() => { setShowToast(false); onClose(); }, 1200);
  };

  const onKey = e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); };

  return (
    <>
      {showToast && (
        <div className="pp-toast"><CheckIcon /> Profile updated successfully</div>
      )}
      <div className="pp-modal-overlay" onClick={onClose}>
        <div className="pp-modal" onClick={e => e.stopPropagation()}>
          <div className="pp-modal-title"><EditIcon /> Edit Profile</div>
          <div className="pp-modal-grid">
            <div className="pp-modal-field">
              <label className="pp-modal-label">Full Name</label>
              <input className="pp-modal-input" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={onKey} autoFocus />
            </div>
            <div className="pp-modal-field">
              <label className="pp-modal-label">Username</label>
              <input className="pp-modal-input" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                onKeyDown={onKey} />
            </div>
            <div className="pp-modal-field full">
              <label className="pp-modal-label">Email</label>
              <input className="pp-modal-input" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                onKeyDown={onKey} />
            </div>
            <div className="pp-modal-field full">
              <label className="pp-modal-label">Phone</label>
              <input className="pp-modal-input" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                onKeyDown={onKey} />
            </div>
          </div>
          <div className="pp-modal-actions">
            <button className="pp-cancel-btn" onClick={onClose}>Cancel</button>
            <button className="pp-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? <span className="pp-mini-spin" /> : <><SaveIcon /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function ProfilePage() {
  const { user: authUser } = useSelector(s => s.auth);
  const [showEdit, setShowEdit] = useState(false);
  const [localUser, setLocalUser] = useState(null);

  // Build full user profile from auth state + sensible defaults
  useEffect(() => {
    const role = authUser?.role || 'viewer';
    setLocalUser({
      name:     authUser?.name     || authUser?.email?.split('@')[0] || 'System User',
      email:    authUser?.email    || '—',
      username: authUser?.username || authUser?.email?.split('@')[0] || '—',
      phone:    authUser?.phone    || '—',
      roleId:   authUser?.roleId   || authUser?.role_id || '—',
      role,
      joinedDate: new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }),
      lastLogin:  new Date().toLocaleString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }),
      status:     'Active',
      twoFAEnabled: true,
    });
  }, [authUser]);

  if (!localUser) return null;

  const role       = localUser.role;
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.viewer;
  const initials   = localUser.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const handleSave = (updated) => {
    setLocalUser(prev => ({ ...prev, ...updated }));
  };

  return (
    <div className="profile-page-wrap">

      {showEdit && (
        <EditModal
          user={localUser}
          onClose={() => setShowEdit(false)}
          onSave={handleSave}
        />
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
          <div className="pp-name">{localUser.name}</div>
          <div className="pp-email">{localUser.email}</div>
          <div className="pp-badges">
            <span className={`pp-role-badge ${role}`}>
              {role === 'superadmin' ? '★' : role === 'admin' ? '◆' : '●'} {roleConfig.label}
            </span>
            <span className="pp-status-badge">
              <span className="pp-status-dot" /> Active
            </span>
            {localUser.twoFAEnabled && (
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
        </div>
      </div>

      {/* ── Info cards ── */}
      <div className="pp-grid">

        {/* Personal Info */}
        <div className="pp-card">
          <div className="pp-card-title"><UserIcon /> Personal Information</div>
          <Field label="Full Name"  value={localUser.name} />
          <Field label="Username"   value={`@${localUser.username}`} className="accent" />
          <Field label="Email"      value={localUser.email} className="muted" />
          <Field label="Phone"      value={localUser.phone} className="muted" />
        </div>

        {/* Account Info */}
        <div className="pp-card">
          <div className="pp-card-title"><KeyIcon /> Account Details</div>
          <Field label="Role"        value={roleConfig.label} />
          <Field label="Role ID"     value={localUser.roleId} className="mono" />
          <Field label="Status"      value="Active" className="accent" />
          <Field label="2FA"         value="Enabled" className="accent" />
          <Field label="Last Login"  value={localUser.lastLogin} className="muted" />
        </div>

      </div>

      {/* ── Permissions ── */}
      <div className="pp-permissions">
        <div className="pp-card-title" style={{ marginBottom:0 }}>
          <ShieldIcon /> Access Permissions
          <span style={{ marginLeft:'auto', fontSize:'0.78rem', color:'var(--text-muted)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>
            {roleConfig.description}
          </span>
        </div>
        <div className="pp-perm-list">
          {roleConfig.permissions.map((p, i) => (
            <div key={i} className={`pp-perm-item ${p.allowed ? 'allowed' : 'denied'}`}>
              <div className={`pp-perm-icon ${p.allowed ? 'allowed' : 'denied'}`}>
                {p.allowed ? <CheckIcon /> : <XIcon />}
              </div>
              {p.label}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}