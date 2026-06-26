// src/components/Profile/ProfilePage.js
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { apiChangePassword, apiGetProfile } from '../../services/api';
import './ProfilePage.css';

const UserIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const ShieldIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const KeyIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const LockIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const RefreshIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

const fmtDateTime = (iso) => {
  if (!iso || iso === 'null') return '-';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

const valueOrDash = (value) => value || '-';

const roleLabel = (profile) => (
  profile?.role_display ||
  (profile?.role === 'superadmin' ? 'Super Admin' : profile?.role?.replace(/_/g, ' ')) ||
  'Admin'
);

const initialsFor = (profile) => {
  const name = profile?.full_name || profile?.username || profile?.email || '';
  const initials = name.includes(' ')
    ? name.split(' ').map(part => part[0]).join('')
    : name.slice(0, 2);
  return initials.toUpperCase() || '??';
};

function Field({ label, value, mono, accent }) {
  return (
    <div className="pp-field">
      <div className="pp-field-label">{label}</div>
      <div className={`pp-field-value${mono ? ' mono' : ''}${accent ? ' accent' : ''}`}>
        {valueOrDash(value)}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone, icon }) {
  return (
    <div className={`pp-summary-card ${tone || ''}`}>
      <span className="pp-summary-icon">{icon}</span>
      <strong>{valueOrDash(value)}</strong>
      <span>{label}</span>
    </div>
  );
}

function PermissionMark({ allowed }) {
  return (
    <span className={`pp-permission-mark ${allowed ? 'yes' : 'no'}`}>
      {allowed ? <CheckIcon /> : <XIcon />}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="profile-loading">
      <div className="pp-spinner" />
      <span>Loading profile...</span>
    </div>
  );
}

function ChangePasswordModal({ accessToken, onClose, onSuccess }) {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const submitPassword = async (event) => {
    event.preventDefault();

    if (!form.current_password || !form.new_password || !form.confirm_password) {
      setError('All password fields are required.');
      return;
    }

    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setError('New password and confirm password must match.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await apiChangePassword(accessToken, form);
      onSuccess('Password changed successfully. Existing sessions may be invalidated.');
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to change password.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="pp-modal-overlay" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="pp-modal" onSubmit={submitPassword}>
        <div className="pp-modal-title">
          <LockIcon /> Change Password
          <button type="button" className="pp-modal-close" onClick={onClose} aria-label="Close">
            <XIcon />
          </button>
        </div>
        <p className="pp-modal-subtitle">
          Update your admin password. This action can invalidate existing sessions.
        </p>

        <div className="pp-modal-grid">
          <label className="pp-modal-field">
            <span>Current Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={form.current_password}
              onChange={event => updateField('current_password', event.target.value)}
              placeholder="Enter current password"
            />
          </label>

          <label className="pp-modal-field">
            <span>New Password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.new_password}
              onChange={event => updateField('new_password', event.target.value)}
              placeholder="Enter new password"
            />
          </label>

          <label className="pp-modal-field">
            <span>Confirm Password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirm_password}
              onChange={event => updateField('confirm_password', event.target.value)}
              placeholder="Confirm new password"
            />
          </label>
        </div>

        {error ? <div className="pp-modal-error">{error}</div> : null}

        <div className="pp-modal-actions">
          <button type="button" className="pp-cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="pp-save-btn" disabled={saving}>
            {saving ? <span className="pp-mini-spin" /> : <LockIcon />}
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

export default function ProfilePage() {
  const { accessToken } = useSelector(s => s.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!accessToken) {
      setError('No access token available. Please log in again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiGetProfile(accessToken);
      setProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const timer = setTimeout(() => { loadProfile(); }, 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3600);
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="profile-page-wrap">
        <div className="pp-error">
          <div>
            <strong>Failed to load profile</strong>
            <span>{error}</span>
          </div>
          <button onClick={loadProfile}><RefreshIcon /> Retry</button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const role = profile.role || 'admin';
  const permissions = Array.isArray(profile.permissions) ? profile.permissions : [];
  const enabledPermissions = permissions.reduce((sum, item) => (
    sum + ['read', 'write', 'delete', 'execute'].filter(action => item[action]).length
  ), 0);

  return (
    <div className="profile-page-wrap">
      {toast ? (
        <div className={`pp-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckIcon /> : <XIcon />}
          <span>{toast.message}</span>
        </div>
      ) : null}

      <div className={`pp-hero ${role}`}>
        <div className="pp-avatar-shell">
          {profile.avatar_url ? (
            <img className="pp-avatar-img" src={profile.avatar_url} alt={profile.full_name || profile.email} />
          ) : (
            <div className={`pp-avatar ${role}`}>{initialsFor(profile)}</div>
          )}
        </div>

        <div className="pp-hero-info">
          <div className="pp-name">{profile.full_name || profile.username || 'Admin User'}</div>
          <div className="pp-email">{profile.email}</div>
          <div className="pp-badges">
            <span className={`pp-role-badge ${role}`}>{roleLabel(profile)}</span>
            <span className={`pp-status-badge ${profile.status || 'unknown'}`}>
              <span className="pp-status-dot" /> {valueOrDash(profile.status)}
            </span>
            <span className={`pp-2fa-badge ${profile.totp_enabled ? 'enabled' : 'disabled'}`}>
              <KeyIcon /> {profile.totp_enabled ? '2FA Enabled' : '2FA Off'}
            </span>
          </div>
        </div>

        <div className="pp-hero-actions">
          <button
            type="button"
            className="pp-password-btn"
            onClick={() => setPasswordModalOpen(true)}
          >
            <LockIcon /> Change Password
          </button>
          <button className="pp-refresh-btn" onClick={loadProfile} title="Refresh profile">
            <RefreshIcon />
          </button>
        </div>
      </div>

      <div className="pp-summary-grid">
        <SummaryCard label="Resources" value={profile.total_resources ?? permissions.length} tone="cyan" icon={<ShieldIcon />} />
        <SummaryCard label="Permissions" value={enabledPermissions} tone="green" icon={<CheckIcon />} />
        <SummaryCard label="Failed Logins" value={profile.failed_login_count ?? 0} tone="amber" icon={<XIcon />} />
        <SummaryCard label="Last Login" value={fmtDateTime(profile.last_login_at)} tone="blue" icon={<UserIcon />} />
      </div>

      <div className="pp-grid">
        <section className="pp-card">
          <div className="pp-card-title"><UserIcon /> Profile Details</div>
          <div className="pp-info-grid">
            <Field label="Username" value={profile.username} />
            <Field label="Full Name" value={profile.full_name} />
            <Field label="Email" value={profile.email} accent />
            <Field label="Phone" value={profile.phone_number} />
            <Field label="User ID" value={profile.id} mono />
            <Field label="Role ID" value={profile.role_id} mono />
          </div>
        </section>

        <section className="pp-card">
          <div className="pp-card-title"><KeyIcon /> Security</div>
          <div className="pp-info-grid">
            <Field label="Status" value={profile.status} accent={profile.status === 'active'} />
            <Field label="2FA Enabled" value={profile.totp_enabled ? 'Enabled' : 'Not enabled'} />
            <Field label="Last Login" value={fmtDateTime(profile.last_login_at)} />
            <Field label="Failed Login Count" value={profile.failed_login_count ?? 0} />
            <Field label="Locked Until" value={fmtDateTime(profile.locked_until)} />
            <Field label="Role" value={roleLabel(profile)} accent />
          </div>
        </section>
      </div>

      <section className="pp-permissions">
        <div className="pp-card-title">
          <ShieldIcon /> Access Permissions
          <span>{permissions.length} modules</span>
        </div>

        {permissions.length ? (
          <div className="pp-permission-table-wrap">
            <table className="pp-permission-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Read</th>
                  <th>Write</th>
                  <th>Delete</th>
                  <th>Execute</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map(item => (
                  <tr key={item.module}>
                    <td>
                      <div className="pp-module-cell">
                        <strong>{item.display_name || item.module}</strong>
                        <span>{item.module}</span>
                      </div>
                    </td>
                    <td><PermissionMark allowed={item.read} /></td>
                    <td><PermissionMark allowed={item.write} /></td>
                    <td><PermissionMark allowed={item.delete} /></td>
                    <td><PermissionMark allowed={item.execute} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="pp-empty">No permissions returned from API.</div>
        )}
      </section>

      {passwordModalOpen ? (
        <ChangePasswordModal
          accessToken={accessToken}
          onClose={() => setPasswordModalOpen(false)}
          onSuccess={showToast}
        />
      ) : null}
    </div>
  );
}
