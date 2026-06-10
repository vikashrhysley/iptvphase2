import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearCreateState,
  clearSelectedUser,
  clearUpdateState,
  createAdminUser,
  fetchAdminUserDetail,
  fetchAdminUsers,
  fetchAdminUsersStats,
  fetchAssignableRoles,
  setFilters,
  updateAdminUser,
} from '../../store/slices/adminUsersSlice';
import './AdminUsersPage.css';

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.5 18.5 0 0 1 4.22-5.06M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const fmtDateTime = (iso) => {
  if (!iso || iso === 'null') return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const relativeTime = (iso) => {
  if (!iso || iso === 'null') return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const isPast = diffMs >= 0;
  const absMs = Math.abs(diffMs);

  const mins = Math.round(absMs / 60000);
  const hours = Math.round(absMs / 3600000);
  const days = Math.round(absMs / 86400000);

  const unit = mins < 60 ? 'min' : hours < 24 ? 'hour' : 'day';
  const val = unit === 'min' ? mins : unit === 'hour' ? hours : days;

  const plural = val === 1 ? '' : 's';
  return isPast ? `${val} ${unit}${plural} ago` : `in ${val} ${unit}${plural}`;
};

const roleBadgeText = (role) => {
  if (!role) return '—';
  if (role === 'superadmin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  if (role === 'viewer') return 'Viewer';
  return role;
};

// Used until /admin/users/roles has loaded (or if it fails)
const FALLBACK_ROLES = [
  { id: 'viewer', name: 'viewer' },
  { id: 'admin', name: 'admin' },
  { id: 'superadmin', name: 'superadmin' },
];

const statusBadgeClass = (status) => {
  if (status === 'active') return 'active';
  if (status === 'disabled') return 'disabled';
  return 'unknown';
};

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ChevLeft = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

function StatsCard({ icon, label, value, tone }) {
  return (
    <div className={`au-stats-card ${tone || ''}`}>
      <span className="au-stats-icon">{icon}</span>
      <div className="au-stats-value">{value}</div>
      <div className="au-stats-label">{label}</div>
    </div>
  );
}

function Pagination({ current, totalPages, totalItems, pageSize, onPage }) {
  if (!totalItems) return null;

  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, totalItems);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - current) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push(`e${p}`);
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="au-pagination">
      <span className="au-dp-info">
        Showing <strong>{start}</strong>-<strong>{end}</strong> of <strong>{totalItems}</strong> admin users
      </span>
      <div className="au-dp-controls">
        <button className="au-dp-nav" onClick={() => onPage(Math.max(1, current - 1))} disabled={current === 1}>
          <ChevLeft /> Previous
        </button>
        <div className="au-dp-pages">
          {pages.map((p) => (
            typeof p === 'string'
              ? <span key={p} className="au-dp-ellipsis">...</span>
              : (
                <button
                  key={p}
                  className={`au-dp-page${p === current ? ' active' : ''}`}
                  onClick={() => onPage(p)}
                >
                  {p}
                </button>
              )
          ))}
        </div>
        <button className="au-dp-nav" onClick={() => onPage(Math.min(totalPages, current + 1))} disabled={current === totalPages}>
          Next <ChevRight />
        </button>
      </div>
    </div>
  );
}

function CreateAdminUserModal({ onClose, onCreated }) {
  const dispatch = useDispatch();
  const { createLoading, createError, assignableRoles, assignableRolesLoading } =
    useSelector((s) => s.adminUsers);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'admin',
  });
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const roleOptions = assignableRoles.length ? assignableRoles : FALLBACK_ROLES;
  const selectedRole = assignableRoles.find((r) => r.name === form.role);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (localError) setLocalError('');
    if (createError) dispatch(clearCreateState());
  };

  const submit = async (event) => {
    event.preventDefault();
    const email = form.email.trim();
    const fullName = form.full_name.trim();

    if (!email) {
      setLocalError('Email is required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setLocalError('Enter a valid admin email.');
      return;
    }
    if (!form.password) {
      setLocalError('Initial password is required.');
      return;
    }
    if (form.password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    if (!form.role) {
      setLocalError('Role is required.');
      return;
    }

    try {
      await dispatch(createAdminUser({
        email,
        password: form.password,
        role: form.role,
        full_name: fullName || undefined,
      })).unwrap();
      onCreated();
    } catch {
      // Error is rendered from Redux state.
    }
  };

  return (
    <div className="au-modal-overlay" role="presentation">
      <form className="au-modal" onSubmit={submit}>
        <div className="au-modal-title">
          <PlusIcon /> Create New Admin User
        </div>
        <p className="au-modal-subtitle">
          The new admin must complete 2FA setup on first login.
        </p>

        <div className="au-modal-grid">
          <label className="au-modal-field">
            <span>Full Name</span>
            <input
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              placeholder="Jane Smith"
              disabled={createLoading}
            />
          </label>

          <label className="au-modal-field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="newadmin@company.com"
              disabled={createLoading}
            />
          </label>

          <label className="au-modal-field">
            <span>Initial Password</span>
            <div className="au-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="TempPass123!"
                disabled={createLoading}
              />
              <button
                type="button"
                className="au-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <label className="au-modal-field">
            <span>Role</span>
            <select
              value={form.role}
              onChange={(e) => updateField('role', e.target.value)}
              disabled={createLoading || assignableRolesLoading}
            >
              {roleOptions.map((r) => (
                <option key={r.id || r.name} value={r.name}>
                  {roleBadgeText(r.name)}
                </option>
              ))}
            </select>
            {selectedRole?.description && (
              <span className="au-form-hint">{selectedRole.description}</span>
            )}
          </label>
        </div>

        {(localError || createError) && (
          <div className="au-modal-error">{localError || createError}</div>
        )}

        <div className="au-modal-actions">
          <button type="button" className="au-cancel-btn" onClick={onClose} disabled={createLoading}>
            Cancel
          </button>
          <button type="submit" className="au-create-submit" disabled={createLoading}>
            {createLoading ? <span className="au-mini-spin" /> : <PlusIcon />}
            {createLoading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminUserDetailModal({ userId, onClose, isSuperAdmin, currentUserEmail }) {
  const dispatch = useDispatch();
  const {
    selectedUser, detailLoading, detailError, updateLoading, updateError, updateSuccess,
    assignableRoles, assignableRolesLoading,
  } = useSelector((s) => s.adminUsers);

  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const roleOptions = assignableRoles.length ? assignableRoles : FALLBACK_ROLES;
  const selectedRole = assignableRoles.find((r) => r.name === editRole);

  useEffect(() => {
    dispatch(fetchAdminUserDetail(userId));
    return () => dispatch(clearSelectedUser());
  }, [dispatch, userId]);

  useEffect(() => {
    if (selectedUser) {
      setEditRole(selectedUser.role || 'admin');
      setEditStatus(selectedUser.status || 'active');
    }
  }, [selectedUser]);

  useEffect(() => {
    if (updateSuccess) dispatch(clearUpdateState());
  }, [updateSuccess, dispatch]);

  const canEdit =
    isSuperAdmin &&
    selectedUser &&
    selectedUser.email !== currentUserEmail;

  const handleSave = () => {
    if (!selectedUser) return;
    const changes = {};
    if (editRole !== selectedUser.role) changes.role = editRole;
    if (editStatus !== selectedUser.status) changes.status = editStatus;
    if (!Object.keys(changes).length) return;
    dispatch(clearUpdateState());
    dispatch(updateAdminUser({ userId: selectedUser.id, data: changes }));
  };

  const initials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="au-modal-overlay" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="au-detail-modal">
        <button className="au-detail-close" type="button" onClick={onClose}>
          <XIcon />
        </button>

        {detailLoading && (
          <div className="au-detail-loading">
            <span className="au-detail-spinner" />
            Loading user details…
          </div>
        )}

        {detailError && !detailLoading && (
          <div className="au-detail-error">{detailError}</div>
        )}

        {selectedUser && !detailLoading && (
          <>
            <div className="au-detail-hero">
              <div className="au-detail-avatar">{initials(selectedUser.full_name)}</div>
              <div className="au-detail-hero-info">
                <div className="au-detail-name">{selectedUser.full_name || '—'}</div>
                <div className="au-detail-email">{selectedUser.email}</div>
                <div className="au-detail-badges">
                  <span className={`au-role-pill role-${(selectedUser.role || 'viewer').toLowerCase()}`}>
                    {selectedUser.role_display || roleBadgeText(selectedUser.role)}
                  </span>
                  <span className={`au-status-pill ${statusBadgeClass(selectedUser.status)}`}>
                    {selectedUser.status || '—'}
                  </span>
                  {selectedUser.totp_enabled && (
                    <span className="au-detail-2fa-badge">2FA On</span>
                  )}
                </div>
              </div>
            </div>

            <div className="au-detail-section-title">Account Details</div>
            <div className="au-detail-grid">
              <div className="au-detail-row">
                <span className="au-detail-key">Last Login</span>
                <span className="au-detail-val">{fmtDateTime(selectedUser.last_login_at)}</span>
              </div>
              <div className="au-detail-row">
                <span className="au-detail-key">Last Login IP</span>
                <span className="au-detail-val">{selectedUser.last_login_ip || '—'}</span>
              </div>
              <div className="au-detail-row">
                <span className="au-detail-key">Country</span>
                <span className="au-detail-val">{selectedUser.last_login_country || '—'}</span>
              </div>
              <div className="au-detail-row">
                <span className="au-detail-key">Failed Logins</span>
                <span className="au-detail-val">{selectedUser.failed_login_count ?? '—'}</span>
              </div>
              <div className="au-detail-row">
                <span className="au-detail-key">Locked Until</span>
                <span className="au-detail-val">
                  {selectedUser.is_locked ? fmtDateTime(selectedUser.locked_until) : 'Not locked'}
                </span>
              </div>
              <div className="au-detail-row">
                <span className="au-detail-key">Audit Actions</span>
                <span className="au-detail-val">{selectedUser.total_audit_actions ?? '—'}</span>
              </div>
              <div className="au-detail-row">
                <span className="au-detail-key">Last Audit</span>
                <span className="au-detail-val">{fmtDateTime(selectedUser.last_audit_action_at)}</span>
              </div>
              <div className="au-detail-row">
                <span className="au-detail-key">Created</span>
                <span className="au-detail-val">{fmtDateTime(selectedUser.created_at)}</span>
              </div>
              <div className="au-detail-row">
                <span className="au-detail-key">Updated</span>
                <span className="au-detail-val">{fmtDateTime(selectedUser.updated_at)}</span>
              </div>
            </div>

            {canEdit && (
              <>
                <div className="au-detail-section-title" style={{ marginTop: 24 }}>Edit Account</div>
                <div className="au-detail-edit-row">
                  <label className="au-modal-field" style={{ flex: 1 }}>
                    <span>Role</span>
                    <select
                      value={editRole}
                      onChange={(e) => { setEditRole(e.target.value); dispatch(clearUpdateState()); }}
                      disabled={updateLoading || assignableRolesLoading}
                    >
                      {roleOptions.map((r) => (
                        <option key={r.id || r.name} value={r.name}>
                          {roleBadgeText(r.name)}
                        </option>
                      ))}
                    </select>
                    {selectedRole?.description && (
                      <span className="au-form-hint">{selectedRole.description}</span>
                    )}
                  </label>
                  <label className="au-modal-field" style={{ flex: 1 }}>
                    <span>Status</span>
                    <select
                      value={editStatus}
                      onChange={(e) => { setEditStatus(e.target.value); dispatch(clearUpdateState()); }}
                      disabled={updateLoading}
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </label>
                </div>

                {updateError && (
                  <div className="au-modal-error" style={{ marginTop: 10 }}>{updateError}</div>
                )}
                {updateSuccess && (
                  <div className="au-detail-success">
                    <CheckIcon /> User updated successfully.
                  </div>
                )}

                <div className="au-modal-actions" style={{ marginTop: 14 }}>
                  <button type="button" className="au-cancel-btn" onClick={onClose} disabled={updateLoading}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="au-create-submit"
                    onClick={handleSave}
                    disabled={
                      updateLoading ||
                      (editRole === selectedUser.role && editStatus === selectedUser.status)
                    }
                  >
                    {updateLoading ? <span className="au-mini-spin" /> : null}
                    {updateLoading ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </>
            )}

            {!canEdit && (
              <div className="au-modal-actions" style={{ marginTop: 24 }}>
                <button type="button" className="au-cancel-btn" onClick={onClose}>
                  Close
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const dispatch = useDispatch();
  const { user: me } = useSelector((s) => s.auth);
  const { users, total, page, pageSize, stats, loading, error, statsLoading, statsError, filters } = useSelector(
    (s) => s.adminUsers
  );
  const canView = true; // access viewer+; enforced via backend
  const canCreate = me?.role === 'superadmin';
  const isSuperAdmin = me?.role === 'superadmin';
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [detailUserId, setDetailUserId] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 1)));

  const statsCards = useMemo(() => {
    const s = stats || {};
    const byRole = s.by_role || {};
    const byStatus = s.by_status || {};

    const totalCount = s.total ?? 0;

    return [
      {
        label: 'Total',
        value: totalCount,
        tone: 'cyan',
        icon: '👥',
      },
      {
        label: 'Active',
        value: byStatus.active ?? 0,
        tone: 'green',
        icon: '✅',
      },
      {
        label: '2FA Enabled',
        value: s.totp_enabled ?? 0,
        tone: 'violet',
        icon: '🔑',
      },
      {
        label: 'Locked',
        value: s.locked_accounts ?? 0,
        tone: 'red',
        icon: <LockIcon />,
      },
      {
        label: 'Super Admins',
        value: byRole.superadmin ?? 0,
        tone: 'amber',
        icon: '🛡️',
      },
      {
        label: 'Admins',
        value: byRole.admin ?? 0,
        tone: 'blue',
        icon: '🧩',
      },
    ];
  }, [stats]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  useEffect(() => {
    dispatch(fetchAdminUsersStats());
    dispatch(fetchAssignableRoles());
  }, [dispatch]);

  useEffect(() => {
    if (!canView) return;

    dispatch(
      fetchAdminUsers({
        role: filters.role !== 'all' ? filters.role : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        page: filters.page,
        page_size: filters.page_size,
      })
    );
  }, [dispatch, filters.role, filters.status, filters.page, filters.page_size, canView]);

  const handleRole = (value) => {
    dispatch(setFilters({ role: value, page: 1 }));
  };

  const handleStatus = (value) => {
    dispatch(setFilters({ status: value, page: 1 }));
  };

  const refreshCurrentPage = () => {
    dispatch(fetchAdminUsersStats());
    dispatch(
      fetchAdminUsers({
        role: filters.role !== 'all' ? filters.role : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        page: filters.page,
        page_size: filters.page_size,
      })
    );
  };

  const handleCreated = () => {
    setShowCreate(false);
    dispatch(clearCreateState());
    refreshCurrentPage();
    setToast({
      type: 'success',
      message: 'Admin user created successfully. 2FA setup is required on first login.',
    });
    setTimeout(() => setToast(null), 3600);
  };

  return (
    <div className="au-page">
      {toast && (
        <div className={`au-toast ${toast.type}`}>
          <CheckIcon />
          <span>{toast.message}</span>
        </div>
      )}

      <div className="au-header">
        <div>
          <h1 className="au-title">Admin Users</h1>
          <div className="au-subtitle">Paginated list of admin portal accounts (viewer/admin/superadmin).</div>
        </div>
        <button
          className="au-create-btn"
          type="button"
          onClick={() => {
            dispatch(clearCreateState());
            setShowCreate(true);
          }}
          disabled={!canCreate}
          title={canCreate ? 'Create new admin user' : 'Only Super Admin can create admin users'}
        >
          <PlusIcon /> Create New User
        </button>
      </div>

      <div className="au-stats-grid">
        {statsLoading ? (
          <div className="au-loading-row">Loading stats…</div>
        ) : statsError ? (
          <div className="au-error-row">Failed to load stats: {statsError}</div>
        ) : (
          statsCards.map((c) => (
            <StatsCard
              key={c.label}
              icon={c.icon}
              label={c.label}
              value={c.value ?? 0}
              tone={c.tone}
            />
          ))
        )}
      </div>

      <div className="au-toolbar">
        <div className="au-search-wrap">
          <label>Search</label>
          <div className="au-search-input-wrap">
            <SearchIcon />
            <input
              className="au-search-input"
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="au-toolbar-filters">
          <div className="au-filter">
            <label>Role</label>
            <select
              value={filters.role}
              onChange={(e) => handleRole(e.target.value)}
              className="au-select"
            >
              <option value="all">All</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>

          <div className="au-filter">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleStatus(e.target.value)}
              className="au-select"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="au-table-wrap">
        {loading ? (
          <div className="au-loading-wrap">Loading admin users…</div>
        ) : error ? (
          <div className="au-error-wrap">{error}</div>
        ) : (
          <div className="au-table-scroll">
          <table className="au-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>2FA</th>
                <th>Last Login</th>
                <th className="au-col-locked">Locked</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="au-row-clickable" onClick={() => setDetailUserId(u.id)}>
                    <td className="au-name">{u.full_name || '—'}</td>
                    <td className="au-email">{u.email || '—'}</td>
                    <td>
                      <span className={`au-role-pill role-${(u.role || 'viewer').toLowerCase()}`}>
                        {roleBadgeText(u.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`au-status-pill ${statusBadgeClass(u.status)}`}>
                        {u.status || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`au-2fa-pill ${u.totp_enabled ? 'yes' : 'no'}`}>
                        {u.totp_enabled ? <CheckIcon /> : <XIcon />}
                      </span>
                    </td>
                    <td title={fmtDateTime(u.last_login_at)}>{relativeTime(u.last_login_at)}</td>
                    <td className="au-col-locked">
                      {u.is_locked ? (
                        <span className="au-locked-pill">
                          <LockIcon />
                        </span>
                      ) : (
                        <span className="au-locked-empty">—</span>
                      )}
                    </td>
                    <td title={fmtDateTime(u.created_at)}>{fmtDateTime(u.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="au-empty">
                    No admin users returned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}

        {!loading && !error && (
          <Pagination
            current={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPage={(nextPage) => dispatch(setFilters({ page: nextPage }))}
          />
        )}
      </div>

      {showCreate && (
        <CreateAdminUserModal
          onClose={() => {
            dispatch(clearCreateState());
            setShowCreate(false);
          }}
          onCreated={handleCreated}
        />
      )}

      {detailUserId && (
        <AdminUserDetailModal
          userId={detailUserId}
          isSuperAdmin={isSuperAdmin}
          currentUserEmail={me?.email}
          onClose={() => setDetailUserId(null)}
        />
      )}
    </div>
  );
}

