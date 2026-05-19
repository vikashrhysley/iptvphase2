// src/components/Dashboard/DashboardTable.js
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchUsers,
  updateDevice,
  revokeAccount,
  editUser,
  openEditModal,
  closeEditModal,
  clearNotification,
} from '../../store/slices/dashboardSlice';
import UserProfile from './UserProfile';
import './DashboardTable.css';

const PAGE_SIZE    = 8;
const canEditRevoke = (role) => role === 'superadmin';
const canSeeAccount = (role) => role !== 'viewer';

// ── Prev / Next icons ────────────────────────────────────
const ChevLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ── Edit Modal ───────────────────────────────────────────
function EditModal() {
  const dispatch = useDispatch();
  const { editModal, actionLoading } = useSelector(s => s.dashboard);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    if (editModal) {
      setForm({ name: editModal.name || '', phone: editModal.phone || '', address: editModal.address || '' });
    }
  }, [editModal]);

  if (!editModal) return null;

  const handleSave = () => dispatch(editUser({ userId: editModal.id, data: form }));
  const onKey = (e) => {
    if (e.key === 'Enter')  handleSave();
    if (e.key === 'Escape') dispatch(closeEditModal());
  };

  return (
    <div className="modal-overlay" onClick={() => dispatch(closeEditModal())}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Edit User — {editModal.userId}</div>
        {['name', 'phone', 'address'].map(field => (
          <div className="modal-field" key={field}>
            <label className="modal-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
            <input
              className="modal-input"
              value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              onKeyDown={onKey}
              autoFocus={field === 'name'}
            />
          </div>
        ))}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => dispatch(closeEditModal())}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={actionLoading === 'edit'}>
            {actionLoading === 'edit' ? <span className="loading-spinner" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────
function Toast() {
  const dispatch = useDispatch();
  const { notification } = useSelector(s => s.dashboard);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => dispatch(clearNotification()), 3500);
      return () => clearTimeout(t);
    }
  }, [notification, dispatch]);

  if (!notification) return null;
  return (
    <div className={`toast ${notification.type}`}>
      {notification.type === 'success' ? '✓' : '✕'} {notification.message}
    </div>
  );
}

// ── Pagination Bar ───────────────────────────────────────
function PaginationBar({ currentPage, totalPages, totalItems, onPrev, onNext, onPage }) {
  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end   = Math.min(currentPage * PAGE_SIZE, totalItems);

  // Build page numbers: always show first, last, ±1 around current, with ellipsis
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('ellipsis' + p);
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="pagination-bar">
      {/* Left: entry count */}
      <span className="pagination-info">
        Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{totalItems}</strong> entries
      </span>

      {/* Right: controls */}
      <div className="pagination-controls">
        {/* Previous */}
        <button
          className="page-nav-btn"
          onClick={onPrev}
          disabled={currentPage === 1}
        >
          <ChevLeft /> Previous
        </button>

        {/* Page numbers */}
        <div className="page-numbers">
          {pages.map((p) =>
            typeof p === 'string' ? (
              <span key={p} className="page-ellipsis">…</span>
            ) : (
              <button
                key={p}
                className={`page-num${p === currentPage ? ' active' : ''}`}
                onClick={() => onPage(p)}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          className="page-nav-btn"
          onClick={onNext}
          disabled={currentPage === totalPages}
        >
          Next <ChevRight />
        </button>
      </div>
    </div>
  );
}

// ── Main Table ───────────────────────────────────────────
export default function DashboardTable() {
  const dispatch = useDispatch();
  const { users, loading, actionLoading } = useSelector(s => s.dashboard);
  const { user: currentUser } = useSelector(s => s.auth);

  // All hooks first — no exceptions
  const [search, setSearch]             = useState('');
  const [currentPage, setCurrentPage]   = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter]   = useState('all');  // all | active | inactive

  useEffect(() => { dispatch(fetchUsers()); }, [dispatch]);

  const role = currentUser?.role;

  const filtered = users.filter(u => {
    const matchSearch = [u.name, u.phone, u.address, u.userId, u.id]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || u.device === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = {
    total:   users.length,
    active:  users.filter(u => u.device  === 'active').length,
    revoked: users.filter(u => u.account === 'revoked').length,
  };

  const handleSearch = (val) => { setSearch(val);       setCurrentPage(1); };
  const handleStatus = (val) => { setStatusFilter(val); setCurrentPage(1); };

  const handleDeviceChange = (userId, status) => dispatch(updateDevice({ userId, status }));
  const handleRevoke = (userId) => {
    if (window.confirm('Revoke this account? This action cannot be undone.')) {
      dispatch(revokeAccount({ userId }));
    }
  };

  // Profile view — all hooks already called above
  if (selectedUser) {
    return (
      <div className="dashboard-content">
        <Toast />
        <UserProfile user={selectedUser} onBack={() => setSelectedUser(null)} />
      </div>
    );
  }

  // Table view
  return (
    <div className="dashboard-content">
      <Toast />
      <EditModal />

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card" style={{ '--stat-accent': 'var(--accent-primary)' }}>
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">Registered accounts</div>
        </div>
        <div className="stat-card" style={{ '--stat-accent': 'var(--accent-success)' }}>
          <div className="stat-label">Active Devices</div>
          <div className="stat-value">{stats.active}</div>
          <div className="stat-sub">{stats.total - stats.active} inactive</div>
        </div>
        <div className="stat-card" style={{ '--stat-accent': 'var(--accent-danger)' }}>
          <div className="stat-label">Revoked</div>
          <div className="stat-value">{stats.revoked}</div>
          <div className="stat-sub">Accounts suspended</div>
        </div>
        <div className="stat-card" style={{ '--stat-accent': 'var(--accent-secondary)' }}>
          <div className="stat-label">Your Role</div>
          <div className="stat-value" style={{ fontSize: '1rem', paddingTop: 4 }}>
            {role === 'superadmin' ? 'Super Admin' : role?.charAt(0).toUpperCase() + role?.slice(1)}
          </div>
          <div className="stat-sub">
            {role === 'superadmin' ? 'Full permissions' : role === 'admin' ? 'Read only' : 'View only'}
          </div>
        </div>
      </div>

      {/* Table section */}
      <div className="table-section">

        {/* Header */}
        <div className="table-header">
          <div className="table-header-left">
            <div className="table-title">User Records</div>
            <div className="table-meta">
              {filtered.length > 0
                ? `Page ${currentPage} of ${totalPages} · ${filtered.length} total`
                : '0 entries'}
            </div>
          </div>
          <div className="table-header-controls">
            {/* Search */}
            <div className="table-search">
              <svg className="table-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                placeholder="Search users..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>

            {/* Status dropdown */}
            <select
              className="th-status-select"
              value={statusFilter}
              onChange={e => handleStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">● Active</option>
              <option value="inactive">○ Inactive</option>
            </select>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="table-loading">
            <span className="loading-spinner" style={{ width: 28, height: 28 }} />
            <span>Loading user data...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">No users match your search.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>User ID</th>
                    <th>Device</th>
                    {canSeeAccount(role) && <th>Account</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(u => {
                    const initials  = u.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                    const isLoading = actionLoading === u.id;
                    return (
                      <tr key={u.id} className="fade-in">
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-sm">
                              {initials}
                            </div>
                            <div>
                              <div
                                className="user-cell-name"
                                onClick={() => setSelectedUser(u)}
                                style={{ cursor: 'pointer', color: 'var(--accent-primary)', textDecoration: 'underline', textDecorationColor: 'rgba(0,212,255,0.3)', textUnderlineOffset: 3 }}
                                title="View profile"
                              >
                                {u.name}
                              </div>
                              <div className="user-cell-id">{u.id}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="phone-text">{u.phone}</span></td>
                        <td><span className="address-text">{u.address}</span></td>
                        <td>
                          <code style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4 }}>
                            {u.userId}
                          </code>
                        </td>
                        <td>
                          <select
                            className={`device-select ${u.device}`}
                            value={u.device}
                            onChange={e => handleDeviceChange(u.id, e.target.value)}
                            disabled={!canEditRevoke(role) || isLoading}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        {canSeeAccount(role) && (
                          <td>
                            {u.account === 'revoked' ? (
                              <span className="status-revoked">Revoked</span>
                            ) : (
                              <div className="account-actions">
                                <button
                                  className="action-btn revoke"
                                  onClick={() => handleRevoke(u.id)}
                                  disabled={!canEditRevoke(role) || isLoading}
                                  title={!canEditRevoke(role) ? 'No permission' : 'Revoke account'}
                                >
                                  {isLoading ? <span className="loading-spinner" style={{ width: 12, height: 12 }} /> : 'Revoke'}
                                </button>
                                <button
                                  className="action-btn edit"
                                  onClick={() => dispatch(openEditModal(u))}
                                  disabled={!canEditRevoke(role) || isLoading}
                                  title={!canEditRevoke(role) ? 'No permission' : 'Edit user'}
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination bar — only when more than 1 page */}
            {totalPages > 1 && (
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
                onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                onPage={(p) => setCurrentPage(p)}
              />
            )}
          </>
        )}

      </div>
    </div>
  );
}