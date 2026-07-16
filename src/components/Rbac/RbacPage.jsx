import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchRbacRoles,
  fetchRbacModules,
  createRbacRole,
  fetchRoleDetail,
  updateRbacRole,
  deleteRbacRole,
  patchRolePermissions,
  assignRbacRole,
  createRbacModule,
  deleteRbacModule,
  fetchAssignableRoles,
  clearCreateError,
  clearUpdateError,
  clearDeleteError,
  clearAssignError,
  clearCreateModuleError,
  clearDeleteModuleError,
  clearRoleDetail,
} from '../../store/slices/rbacSlice';
import './RbacPage.css';

// ─── Icons ────────────────────────────────────────────────
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const LayersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const MinusIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const StarIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const RefreshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
  </svg>
);
const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const SaveIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const WarningIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const CubeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="21 16 21 8 12 3 3 8 3 16 12 21 21 16"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const AssignIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <polyline points="16 11 18 13 22 9"/>
  </svg>
);

// ─── Action config ────────────────────────────────────────
const ACTION_CFG = {
  read:    { color: '#38bdf8', bg: 'rgba(56,189,248,0.15)',  label: 'Read'    },
  write:   { color: '#34d399', bg: 'rgba(52,211,153,0.15)',  label: 'Write'   },
  delete:  { color: '#f87171', bg: 'rgba(248,113,113,0.15)', label: 'Delete'  },
  execute: { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', label: 'Execute' },
};
const ALL_ACTIONS = ['read', 'write', 'delete', 'execute'];

const roleColor = (name = '') => {
  const palette = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
};
const getInitials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  || name.slice(0, 2).toUpperCase();
const getPermCount = (role) =>
  Object.values(role.permissions || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);

// ─── Export helpers ───────────────────────────────────────
const ROLE_COLS = ['Role Name', 'Description', 'Type', 'Status', 'Assigned Users', 'Modules', 'Total Permissions'];
const PERM_COLS = ['Role', 'Module', 'Read', 'Write', 'Delete', 'Execute'];

const buildRoleRows = (roles) =>
  roles.map(r => [
    r.name,
    r.description || '',
    r.is_system ? 'System' : 'Custom',
    r.is_active !== false ? 'Active' : 'Inactive',
    r.user_count ?? 0,
    Object.keys(r.permissions || {}).length,
    getPermCount(r),
  ]);

const buildPermRows = (roles) => {
  const rows = [];
  for (const r of roles) {
    for (const [mod, actions] of Object.entries(r.permissions || {})) {
      rows.push([
        r.name, mod,
        actions.includes('read')    ? '✓' : '✗',
        actions.includes('write')   ? '✓' : '✗',
        actions.includes('delete')  ? '✓' : '✗',
        actions.includes('execute') ? '✓' : '✗',
      ]);
    }
  }
  return rows;
};

const exportRbacToExcel = async (roles) => {
  const { utils, writeFile } = await import('xlsx');
  const wb = utils.book_new();
  const ws1 = utils.aoa_to_sheet([ROLE_COLS, ...buildRoleRows(roles)]);
  utils.book_append_sheet(wb, ws1, 'Roles');
  const permRows = buildPermRows(roles);
  if (permRows.length) {
    const ws2 = utils.aoa_to_sheet([PERM_COLS, ...permRows]);
    utils.book_append_sheet(wb, ws2, 'Permissions Matrix');
  }
  writeFile(wb, `rbac-roles-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

const exportRbacToPDF = async (roles) => {
  const { jsPDF }              = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const date = new Date().toLocaleString();

  doc.setFontSize(13);
  doc.text('RBAC — Roles', 40, 36);
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`Exported ${date}`, 40, 52);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 64,
    head: [ROLE_COLS],
    body: buildRoleRows(roles),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 35, 60], textColor: [200, 210, 230], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  });

  const permRows = buildPermRows(roles);
  if (permRows.length) {
    doc.addPage();
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('RBAC — Permissions Matrix', 40, 36);
    autoTable(doc, {
      startY: 52,
      head: [PERM_COLS],
      body: permRows,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 35, 60], textColor: [200, 210, 230], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 40, right: 40 },
    });
  }

  doc.save(`rbac-roles-${new Date().toISOString().slice(0, 10)}.pdf`);
};

function ExportButton({ onExportPDF, onExportExcel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  return (
    <div className="rb-export-wrap" ref={ref}>
      <button className="rb-export-btn" onClick={() => setOpen(o => !o)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export
      </button>
      {open && (
        <div className="rb-export-menu">
          <button onClick={() => { setOpen(false); onExportPDF(); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            PDF
          </button>
          <button onClick={() => { setOpen(false); onExportExcel(); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            Excel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Permission dot ───────────────────────────────────────
function PermDot({ action, active, available, editMode, onChange }) {
  if (!available) return <span className="rb-perm-na">—</span>;
  const c = ACTION_CFG[action] || {};
  if (editMode) {
    return (
      <button
        className={`rb-perm-btn ${active ? 'rb-perm-on' : 'rb-perm-off'}`}
        style={active ? { '--ac': c.color, '--ab': c.bg } : {}}
        onClick={onChange}
        title={active ? `Revoke ${c.label}` : `Grant ${c.label}`}
      >
        {active ? <CheckIcon /> : <MinusIcon />}
      </button>
    );
  }
  if (!active) return <span className="rb-perm-off"><MinusIcon /></span>;
  return (
    <span className="rb-perm-on" style={{ '--ac': c.color, '--ab': c.bg }}>
      <CheckIcon />
    </span>
  );
}

// ─── Change role modal ────────────────────────────────────
function AssignUserModal({ currentRole, user, assigning, assignError, onClose, onSubmit }) {
  const dispatch = useDispatch();
  const { assignableRoles, assignableRolesLoading, assignableRolesError } =
    useSelector(s => s.rbac);

  const [selectedRoleId, setSelectedRoleId] = useState(currentRole.id);
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchAssignableRoles());
  }, [dispatch]);

  const userColor = roleColor(user?.full_name || user?.email || '');
  const name  = user?.full_name || '';
  const email = user?.email || '';

  const selectedRole = assignableRoles.find(r => r.id === selectedRoleId);
  const isUnchanged  = selectedRoleId === currentRole.id;

  const handleSubmit = () => {
    if (!selectedRoleId) return;
    onSubmit(selectedRoleId, { user_id: user.id, reason });
  };

  return createPortal(
    <div className="rb-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rb-modal" style={{ maxWidth: 500 }}>
        <div className="rb-modal-header">
          <div className="rb-modal-title">
            <div className="rb-modal-icon"><AssignIcon /></div>
            Change Role
          </div>
          <button className="rb-modal-close" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="rb-modal-body">
          {/* User + current role row */}
          <div className="rb-assign-user-card">
            <div className="rb-user-av rb-user-av-lg" style={{ background: `${userColor}20`, color: userColor, border: `1px solid ${userColor}40` }}>
              {getInitials(name || email || '?')}
            </div>
            <div className="rb-assign-user-info">
              <span className="rb-assign-user-name">{name || email}</span>
              <span className="rb-assign-user-email">{name ? email : 'Admin user'}</span>
            </div>
            <div className="rb-assign-flow">
              <span className="rb-assign-flow-from">{currentRole.name}</span>
              <span className="rb-assign-flow-arrow">→</span>
              <span className="rb-assign-flow-to">
                {selectedRole ? selectedRole.name : '…'}
              </span>
            </div>
          </div>

          {/* Role select */}
          <div className="rb-form-group" style={{ marginTop: 14 }}>
            <label className="rb-form-label">Change role to</label>
            {assignableRolesLoading ? (
              <div className="rb-sk" style={{ height: 42, borderRadius: 8, width: '100%' }} />
            ) : assignableRolesError ? (
              <div className="rb-save-error">⚠ Could not load roles.</div>
            ) : (
              <select
                className="rb-form-select"
                value={selectedRoleId}
                onChange={e => setSelectedRoleId(e.target.value)}
              >
                {assignableRoles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.id === currentRole.id ? '  (current)' : ''}
                  </option>
                ))}
              </select>
            )}
            {selectedRole?.description && (
              <span className="rb-form-hint">{selectedRole.description}</span>
            )}
          </div>

          {/* Reason */}
          <div className="rb-form-group">
            <label className="rb-form-label">Reason <span className="rb-form-optional">optional</span></label>
            <input
              className="rb-form-input"
              type="text"
              placeholder="e.g. Promoted to billing reviewer"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <span className="rb-form-hint">Stored in the audit trail.</span>
          </div>

          {assignError && <div className="rb-save-error">⚠ {assignError}</div>}
        </div>

        <div className="rb-modal-footer">
          <button className="rb-cancel-btn" onClick={onClose} disabled={assigning}>Cancel</button>
          <button
            className="rb-save-btn"
            onClick={handleSubmit}
            disabled={assigning || !selectedRoleId || assignableRolesLoading}
          >
            {assigning
              ? <><span className="rb-spinner" /> Assigning…</>
              : isUnchanged
                ? <><AssignIcon /> Re-assign Role</>
                : <><AssignIcon /> Change to {selectedRole?.name || '…'}</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Create module modal ──────────────────────────────────
function CreateModuleModal({ creatingModule, createModuleError, onClose, onSubmit }) {
  const [name, setName]             = useState('');
  const [displayName, setDisplayName] = useState('');
  const [actions, setActions]       = useState(['read', 'write']);
  const [desc, setDesc]             = useState('');
  const [nameErr, setNameErr]       = useState('');
  const [actErr, setActErr]         = useState('');

  const validateName = v => {
    if (!v) return 'Name is required.';
    if (!/^[a-z][a-z0-9_]*$/.test(v)) return 'Lowercase letters, digits and underscores only.';
    return '';
  };

  const toggleAction = (a) =>
    setActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const handleSubmit = () => {
    const ne = validateName(name);
    if (ne) { setNameErr(ne); return; }
    if (!displayName.trim()) return;
    if (actions.length === 0) { setActErr('Select at least one action.'); return; }
    onSubmit({ name: name.trim(), display_name: displayName.trim(), available_actions: actions, description: desc });
  };

  return createPortal(
    <div className="rb-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rb-modal" style={{ maxWidth: 480 }}>
        <div className="rb-modal-header">
          <div className="rb-modal-title">
            <div className="rb-modal-icon"><CubeIcon /></div>
            Register Module
          </div>
          <button className="rb-modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="rb-modal-body">
          <div className="rb-form-group">
            <label className="rb-form-label">Module Name <span className="rb-required">*</span></label>
            <input
              className={`rb-form-input rb-mono-input ${nameErr ? 'rb-input-error' : ''}`}
              type="text"
              placeholder="e.g. analytics"
              value={name}
              onChange={e => { setName(e.target.value); setNameErr(''); }}
            />
            {nameErr
              ? <span className="rb-form-hint rb-hint-err">{nameErr}</span>
              : <span className="rb-form-hint">Unique machine name — lowercase, underscores only.</span>
            }
          </div>

          <div className="rb-form-group">
            <label className="rb-form-label">Display Name <span className="rb-required">*</span></label>
            <input
              className="rb-form-input"
              type="text"
              placeholder="e.g. Analytics"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>

          <div className="rb-form-group">
            <label className="rb-form-label">Available Actions <span className="rb-required">*</span></label>
            <div className="rb-checkbox-group">
              {ALL_ACTIONS.map(a => {
                const c = ACTION_CFG[a];
                return (
                  <label key={a} className={`rb-checkbox-item ${actions.includes(a) ? 'rb-cb-checked' : ''}`}>
                    <input
                      type="checkbox"
                      className="rb-checkbox-input"
                      checked={actions.includes(a)}
                      onChange={() => { toggleAction(a); setActErr(''); }}
                    />
                    <span className="rb-cb-dot" style={{ background: c.color }} />
                    <span className="rb-cb-label" style={{ color: actions.includes(a) ? c.color : undefined }}>
                      {c.label}
                    </span>
                  </label>
                );
              })}
            </div>
            {actErr && <span className="rb-form-hint rb-hint-err">{actErr}</span>}
          </div>

          <div className="rb-form-group">
            <label className="rb-form-label">Description <span className="rb-form-optional">optional</span></label>
            <textarea
              className="rb-form-textarea"
              rows={2}
              placeholder="Human-readable description of this module…"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          {createModuleError && <div className="rb-save-error">⚠ {createModuleError}</div>}
        </div>
        <div className="rb-modal-footer">
          <button className="rb-cancel-btn" onClick={onClose} disabled={creatingModule}>Cancel</button>
          <button className="rb-save-btn" onClick={handleSubmit} disabled={creatingModule}>
            {creatingModule ? <><span className="rb-spinner" /> Registering…</> : <><CubeIcon /> Register Module</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Assigned users section ───────────────────────────────
function AssignedUsers({ detail, loading, error, showHeader = true }) {
  const users = detail?.users || [];
  const count = detail?.user_count ?? users.length;

  return (
    <div className="rb-users-section">

      {/* Header — hidden when rendered inside AssignedUsersModal */}
      {showHeader && (
        <div className="rb-users-head">
          <span className="rb-users-title"><UserIcon /> Assigned Users</span>
          {!loading && <span className="rb-panel-count">{count}</span>}
        </div>
      )}

      {/* Column labels */}
      <div className="rb-ucols-head">
        <span className="rb-ucol rb-ucol-user">User</span>
        <span className="rb-ucol rb-ucol-email">Email</span>
        <span className="rb-ucol rb-ucol-status">Status</span>
      </div>

      {error ? (
        <div className="rb-users-error">⚠ Could not load users.</div>
      ) : loading ? (
        <div className="rb-users-body">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className={`rb-user-row${i % 2 !== 0 ? ' rb-user-row-alt' : ''}`}>
              <div className="rb-ucol rb-ucol-user">
                <div className="rb-sk" style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="rb-sk rb-sk-title" style={{ width: '55%' }} />
                  <div className="rb-sk rb-sk-sub"   style={{ width: '75%' }} />
                </div>
              </div>
              <div className="rb-ucol rb-ucol-email">
                <div className="rb-sk rb-sk-sub" style={{ width: '60%' }} />
              </div>
              <div className="rb-ucol rb-ucol-status">
                <div className="rb-sk" style={{ width: 54, height: 22, borderRadius: 20 }} />
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rb-users-empty">No users assigned to this role.</div>
      ) : (
        <div className="rb-users-body">
          {users.map((u, idx) => {
            const color = roleColor(u.full_name || u.email || '');
            const name  = u.full_name || '';
            const email = u.email || '';
            return (
              <div key={u.id} className={`rb-user-row${idx % 2 !== 0 ? ' rb-user-row-alt' : ''}`}>
                {/* User column */}
                <div className="rb-ucol rb-ucol-user">
                  <div className="rb-user-av" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                    {getInitials(name || email || '?')}
                  </div>
                  <div className="rb-user-av-info">
                    <span className="rb-user-av-name">{name || email}</span>
                    {name && <span className="rb-user-av-sub">{email}</span>}
                  </div>
                </div>
                {/* Email column */}
                <div className="rb-ucol rb-ucol-email">
                  <span className="rb-user-email-val">{email}</span>
                </div>
                {/* Status column */}
                <div className="rb-ucol rb-ucol-status">
                  <span className={u.status === 'active' ? 'rb-status-active' : 'rb-status-inactive'}>
                    {u.status || 'active'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Assigned users modal ────────────────────────────────
function AssignedUsersModal({ role, detail, loading, error, onClose, onAssign }) {
  const users = detail?.users || [];
  const count = detail?.user_count ?? users.length;

  return createPortal(
    <div className="rb-modal-overlay rb-users-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rb-modal rb-users-modal">
        {/* Header */}
        <div className="rb-modal-header">
          <div className="rb-modal-title">
            <div className="rb-modal-icon" style={{ background: 'rgba(6,182,212,0.12)', borderColor: 'rgba(6,182,212,0.3)', color: '#22d3ee' }}>
              <UsersIcon />
            </div>
            Assigned Users
            {!loading && <span className="rb-panel-count" style={{ marginLeft: 6 }}>{count}</span>}
            <span className="rb-modal-role-tag">{role.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="rb-assign-btn" onClick={onAssign}>
              <AssignIcon /> Assign User
            </button>
            <button className="rb-modal-close" onClick={onClose}><CloseIcon /></button>
          </div>
        </div>

        {/* Column labels */}
        <div className="rb-ucols-head rb-ucols-head-modal">
          <span className="rb-ucol rb-ucol-user">User</span>
          <span className="rb-ucol rb-ucol-email">Email</span>
          <span className="rb-ucol rb-ucol-status">Status</span>
        </div>

        {/* Body */}
        <div className="rb-modal-users-body">
          {error ? (
            <div className="rb-users-error">⚠ Could not load users.</div>
          ) : loading ? (
            <div className="rb-users-body">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className={`rb-user-row${i % 2 !== 0 ? ' rb-user-row-alt' : ''}`}>
                  <div className="rb-ucol rb-ucol-user">
                    <div className="rb-sk" style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="rb-sk rb-sk-title" style={{ width: '55%' }} />
                      <div className="rb-sk rb-sk-sub"   style={{ width: '70%' }} />
                    </div>
                  </div>
                  <div className="rb-ucol rb-ucol-email"><div className="rb-sk rb-sk-sub" style={{ width: '60%' }} /></div>
                  <div className="rb-ucol rb-ucol-status"><div className="rb-sk" style={{ width: 54, height: 22, borderRadius: 20 }} /></div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="rb-users-empty rb-users-empty-modal">
              <UserIcon />
              <span>No users are assigned to <strong>{role.name}</strong>.</span>
              <button className="rb-assign-btn" onClick={onAssign} style={{ marginTop: 8 }}>
                <AssignIcon /> Assign First User
              </button>
            </div>
          ) : (
            <div className="rb-users-body">
              {users.map((u, idx) => {
                const color = roleColor(u.full_name || u.email || '');
                const name  = u.full_name || '';
                const email = u.email || '';
                return (
                  <div key={u.id} className={`rb-user-row${idx % 2 !== 0 ? ' rb-user-row-alt' : ''}`}>
                    <div className="rb-ucol rb-ucol-user">
                      <div className="rb-user-av" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                        {getInitials(name || email || '?')}
                      </div>
                      <div className="rb-user-av-info">
                        <span className="rb-user-av-name">{name || email}</span>
                        {name && <span className="rb-user-av-sub">{email}</span>}
                      </div>
                    </div>
                    <div className="rb-ucol rb-ucol-email">
                      <span className="rb-user-email-val">{email}</span>
                    </div>
                    <div className="rb-ucol rb-ucol-status">
                      <span className={u.status === 'active' ? 'rb-status-active' : 'rb-status-inactive'}>
                        {u.status || 'active'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="rb-modal-footer">
          <span className="rb-modal-footer-hint">
            {count > 0 ? `${count} user${count !== 1 ? 's' : ''} assigned` : 'No users assigned yet'}
          </span>
          <button className="rb-cancel-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Create role modal ────────────────────────────────────
function CreateRoleModal({ modules, creating, createError, onClose, onSubmit }) {
  const [name, setName]             = useState('');
  const [desc, setDesc]             = useState('');
  const [draftPerms, setDraftPerms] = useState({});
  const [nameErr, setNameErr]       = useState('');

  const validateName = (v) => {
    if (!v) return 'Name is required.';
    if (!/^[a-z][a-z0-9_]*$/.test(v)) return 'Lowercase letters, digits and underscores only.';
    if (['viewer','admin','superadmin'].includes(v)) return 'Cannot shadow a system role name.';
    return '';
  };

  const togglePerm = (modName, action) => {
    setDraftPerms(prev => {
      const next = { ...prev, [modName]: [...(prev[modName] || [])] };
      const idx  = next[modName].indexOf(action);
      if (idx === -1) next[modName].push(action);
      else next[modName].splice(idx, 1);
      if (next[modName].length === 0) delete next[modName];
      return next;
    });
  };

  const handleSubmit = () => {
    const err = validateName(name);
    if (err) { setNameErr(err); return; }
    onSubmit({ name, description: desc, permissions: draftPerms });
  };

  const rows = modules.length > 0
    ? modules
    : [];

  return createPortal(
    <div className="rb-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rb-modal">
        <div className="rb-modal-header">
          <div className="rb-modal-title">
            <div className="rb-modal-icon"><PlusIcon /></div>
            Create New Role
          </div>
          <button className="rb-modal-close" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="rb-modal-body">
          {/* Name */}
          <div className="rb-form-group">
            <label className="rb-form-label">Role Name <span className="rb-required">*</span></label>
            <input
              className={`rb-form-input ${nameErr ? 'rb-input-error' : ''}`}
              type="text"
              placeholder="e.g. billing_viewer"
              value={name}
              onChange={e => { setName(e.target.value); setNameErr(''); }}
            />
            {nameErr
              ? <span className="rb-form-hint rb-hint-err">{nameErr}</span>
              : <span className="rb-form-hint">Lowercase letters, digits and underscores only.</span>
            }
          </div>

          {/* Description */}
          <div className="rb-form-group">
            <label className="rb-form-label">Description</label>
            <textarea
              className="rb-form-textarea"
              placeholder="Human-readable description of this role…"
              rows={2}
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          {/* Permissions */}
          {rows.length > 0 && (
            <div className="rb-form-group">
              <label className="rb-form-label">Initial Permissions <span className="rb-form-optional">optional</span></label>
              <div className="rb-create-matrix">
                <table className="rb-matrix-table">
                  <thead>
                    <tr>
                      <th className="rb-th-module">Module</th>
                      {ALL_ACTIONS.map(a => {
                        const c = ACTION_CFG[a];
                        return (
                          <th key={a} className="rb-th-action-col">
                            <span className="rb-th-dot" style={{ background: c?.color }} />
                            <span style={{ color: c?.color }}>{c?.label}</span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((mod, idx) => {
                      const granted = draftPerms[mod.name] || [];
                      const avail   = mod.available_actions || ALL_ACTIONS;
                      return (
                        <tr key={mod.name} className={idx % 2 !== 0 ? 'rb-row-odd' : ''}>
                          <td className="rb-td-module">
                            <div className="rb-module-name">{mod.display_name || mod.name}</div>
                            <div className="rb-module-key">{mod.name}</div>
                          </td>
                          {ALL_ACTIONS.map(action => (
                            <td key={action} className="rb-td-perm">
                              <PermDot
                                action={action}
                                active={granted.includes(action)}
                                available={avail.includes(action)}
                                editMode
                                onChange={() => togglePerm(mod.name, action)}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {createError && (
            <div className="rb-save-error">⚠ {createError}</div>
          )}
        </div>

        <div className="rb-modal-footer">
          <button className="rb-cancel-btn" onClick={onClose} disabled={creating}>Cancel</button>
          <button className="rb-save-btn" onClick={handleSubmit} disabled={creating}>
            {creating ? <><span className="rb-spinner" /> Creating…</> : <><PlusIcon /> Create Role</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Edit role modal ──────────────────────────────────────
function EditRoleModal({ role, updating, updateError, onClose, onSubmit }) {
  const [name, setName]         = useState(role.name);
  const [desc, setDesc]         = useState(role.description || '');
  const [isActive, setIsActive] = useState(role.is_active !== false);
  const [nameErr, setNameErr]   = useState('');

  const validateName = v => {
    if (!v) return 'Name is required.';
    if (!/^[a-z][a-z0-9_]*$/.test(v)) return 'Lowercase letters, digits and underscores only.';
    return '';
  };

  const handleSubmit = () => {
    if (!role.is_system) {
      const err = validateName(name);
      if (err) { setNameErr(err); return; }
    }
    const updates = { description: desc, is_active: isActive };
    if (!role.is_system) updates.name = name;
    onSubmit(role.id, updates);
  };

  return createPortal(
    <div className="rb-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rb-modal" style={{ maxWidth: 480 }}>
        <div className="rb-modal-header">
          <div className="rb-modal-title">
            <div className="rb-modal-icon"><EditIcon /></div>
            Edit Role
          </div>
          <button className="rb-modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="rb-modal-body">
          <div className="rb-form-group">
            <label className="rb-form-label">Role Name {!role.is_system && <span className="rb-required">*</span>}</label>
            <input
              className={`rb-form-input ${nameErr ? 'rb-input-error' : ''}`}
              type="text"
              value={name}
              disabled={role.is_system}
              onChange={e => { setName(e.target.value); setNameErr(''); }}
            />
            {role.is_system
              ? <span className="rb-form-hint">System role names cannot be changed.</span>
              : nameErr
                ? <span className="rb-form-hint rb-hint-err">{nameErr}</span>
                : <span className="rb-form-hint">Lowercase letters, digits and underscores only.</span>
            }
          </div>

          <div className="rb-form-group">
            <label className="rb-form-label">Description</label>
            <textarea
              className="rb-form-textarea"
              rows={2}
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          <div className="rb-form-group">
            <label className="rb-form-label">Status</label>
            <div className="rb-toggle-row" onClick={() => setIsActive(v => !v)}>
              <div className={`rb-toggle ${isActive ? 'rb-toggle-on' : ''}`}>
                <div className="rb-toggle-thumb" />
              </div>
              <span className={`rb-toggle-label ${isActive ? 'rb-toggle-label-on' : ''}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="rb-form-hint" style={{ marginLeft: 4 }}>
                {isActive ? 'Users with this role have full access.' : 'Users lose permissions until reactivated.'}
              </span>
            </div>
          </div>

          {updateError && <div className="rb-save-error">⚠ {updateError}</div>}
        </div>
        <div className="rb-modal-footer">
          <button className="rb-cancel-btn" onClick={onClose} disabled={updating}>Cancel</button>
          <button className="rb-save-btn" onClick={handleSubmit} disabled={updating}>
            {updating ? <><span className="rb-spinner" /> Saving…</> : <><SaveIcon /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Delete confirm modal ─────────────────────────────────
function DeleteConfirmModal({ role, deleting, deleteError, onClose, onConfirm }) {
  const hasUsers   = (role.user_count ?? 0) > 0;
  const isSystem   = role.is_system;
  const canDelete  = !hasUsers && !isSystem;

  return createPortal(
    <div className="rb-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rb-modal rb-confirm-modal">
        <div className="rb-modal-header">
          <div className="rb-modal-title">
            <div className="rb-modal-icon rb-modal-icon-danger"><TrashIcon /></div>
            Delete Role
          </div>
          <button className="rb-modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="rb-modal-body">
          <div className="rb-confirm-body">
            <div className="rb-confirm-warn-icon"><WarningIcon /></div>
            <div className="rb-confirm-text">
              <p>Are you sure you want to delete <strong>{role.name}</strong>?</p>
              {isSystem && (
                <div className="rb-confirm-block rb-confirm-err">
                  System roles cannot be deleted.
                </div>
              )}
              {!isSystem && hasUsers && (
                <div className="rb-confirm-block rb-confirm-err">
                  This role has <strong>{role.user_count}</strong> assigned user{role.user_count !== 1 ? 's' : ''}.
                  Reassign all users before deleting.
                </div>
              )}
              {canDelete && (
                <div className="rb-confirm-block rb-confirm-warn">
                  This action is permanent and will invalidate RBAC cache for all affected users.
                </div>
              )}
            </div>
          </div>
          {deleteError && <div className="rb-save-error">⚠ {deleteError}</div>}
        </div>
        <div className="rb-modal-footer">
          <button className="rb-cancel-btn" onClick={onClose} disabled={deleting}>Cancel</button>
          <button
            className="rb-delete-btn"
            onClick={() => canDelete && onConfirm(role.id)}
            disabled={deleting || !canDelete}
            title={isSystem ? 'Cannot delete system role' : hasUsers ? 'Reassign users first' : ''}
          >
            {deleting ? <><span className="rb-spinner rb-spinner-danger" /> Deleting…</> : <><TrashIcon /> Delete Role</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Roles table ──────────────────────────────────────────
function RolesTable({ roles, loading, onSelect, onEdit, onDelete }) {
  if (loading) return <SkeletonTable />;
  if (!roles.length) return (
    <div className="rb-empty"><LockIcon /><span>No roles found.</span></div>
  );
  return (
    <div className="rb-table-wrap">
      <table className="rb-roles-table">
        <thead>
          <tr>
            <th className="rb-rth-role">Role</th>
            <th className="rb-rth-center">Users</th>
            <th className="rb-rth-center">Modules</th>
            <th className="rb-rth-center">Perms</th>
            <th className="rb-rth-center">Status</th>
            <th className="rb-rth-actions" />
            <th className="rb-rth-arrow" />
          </tr>
        </thead>
        <tbody>
          {roles.map((role, idx) => {
            const color      = roleColor(role.name);
            const canDelete  = !role.is_system && !(role.user_count > 0);
            return (
              <tr
                key={role.id}
                className={`rb-rt-row${idx % 2 !== 0 ? ' rb-rt-odd' : ''}`}
                onClick={() => onSelect(role)}
              >
                <td className="rb-rtd-role">
                  <div className="rb-rt-avatar" style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}>
                    {getInitials(role.name)}
                  </div>
                  <div className="rb-rt-info">
                    <div className="rb-rt-name">
                      {role.name}
                      {role.is_system && <span className="rb-system-badge"><StarIcon /> System</span>}
                    </div>
                    {role.description && <div className="rb-rt-desc">{role.description}</div>}
                  </div>
                </td>
                <td className="rb-rtd-center"><span className="rb-rt-num">{role.user_count ?? 0}</span></td>
                <td className="rb-rtd-center"><span className="rb-rt-num">{Object.keys(role.permissions || {}).length}</span></td>
                <td className="rb-rtd-center"><span className="rb-rt-num">{getPermCount(role)}</span></td>
                <td className="rb-rtd-center">
                  {role.is_active !== false
                    ? <span className="rb-status-active">Active</span>
                    : <span className="rb-status-inactive">Inactive</span>
                  }
                </td>
                <td className="rb-rtd-actions" onClick={e => e.stopPropagation()}>
                  <div className="rb-row-actions">
                    <button
                      className="rb-action-btn rb-action-edit"
                      title="Edit role"
                      onClick={() => onEdit(role)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      className={`rb-action-btn rb-action-delete${!canDelete ? ' rb-action-disabled' : ''}`}
                      title={role.is_system ? 'Cannot delete system role' : role.user_count > 0 ? 'Reassign users first' : 'Delete role'}
                      onClick={() => onDelete(role)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
                <td className="rb-rtd-arrow">
                  <span className="rb-rt-chevron"><ChevronRightIcon /></span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Permission matrix ────────────────────────────────────
function PermMatrix({ role, modules, saving, saveError, onBack, onSave, detail, detailLoading, detailError, onAssign }) {
  const color = roleColor(role.name);
  const [editMode, setEditMode]     = useState(false);
  const [draftPerms, setDraftPerms] = useState(null);
  const [view, setView]             = useState('matrix'); // 'matrix' | 'users'

  // detail.permissions is the authoritative source once GET /roles/{id} responds
  const basePerms = detail?.permissions || role.permissions || {};

  const rows = modules.length > 0
    ? modules
    : Object.keys(basePerms).map(k => ({ name: k, display_name: k, available_actions: ALL_ACTIONS }));

  const activePerms    = editMode ? draftPerms : basePerms;
  const userCount      = detail?.user_count ?? (detail?.users?.length ?? role.user_count ?? 0);
  const permModCount   = Object.keys(basePerms).length;
  const permActCount   = Object.values(basePerms).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0);

  const enterEdit = () => {
    setDraftPerms(JSON.parse(JSON.stringify(basePerms)));
    setEditMode(true);
  };
  const cancelEdit = () => { setDraftPerms(null); setEditMode(false); };
  const switchToUsers = () => { cancelEdit(); setView('users'); };
  const switchToMatrix = () => setView('matrix');
  const togglePerm = (modName, action) => {
    setDraftPerms(prev => {
      const next = { ...prev, [modName]: [...(prev[modName] || [])] };
      const idx  = next[modName].indexOf(action);
      if (idx === -1) next[modName].push(action);
      else next[modName].splice(idx, 1);
      return next;
    });
  };
  const handleSave = async () => {
    const allMods = new Set([...Object.keys(basePerms), ...Object.keys(draftPerms)]);
    const add = {}, remove = {};
    for (const mod of allMods) {
      const orig  = basePerms[mod]  || [];
      const draft = draftPerms[mod] || [];
      const added   = draft.filter(a => !orig.includes(a));
      const removed = orig.filter(a => !draft.includes(a));
      if (added.length)   add[mod]    = added;
      if (removed.length) remove[mod] = removed;
    }
    await onSave(role.id, add, remove);
    setEditMode(false);
    setDraftPerms(null);
  };
  const isChanged = (modName, action) => {
    if (!editMode || !draftPerms) return false;
    const orig  = (basePerms)[modName] || [];
    const draft = draftPerms[modName] || [];
    return orig.includes(action) !== draft.includes(action);
  };

  const users = detail?.users || [];

  return (
    <div className="rb-detail-wrap">
      {/* ── Header ── */}
      <div className="rb-detail-header">
        <button className="rb-back-btn" onClick={onBack} disabled={saving}>
          <ArrowLeftIcon /> Back to Roles
        </button>
        <div className="rb-detail-role-info">
          <div className="rb-detail-avatar" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
            {getInitials(role.name)}
          </div>
          <div>
            <div className="rb-detail-role-name">
              {role.name}
              {role.is_system && <span className="rb-system-badge"><StarIcon /> System</span>}
            </div>
            <div className="rb-detail-role-sub">
              {view === 'matrix'
                ? `${permModCount} modules · ${permActCount} actions granted`
                : `${userCount} user${userCount !== 1 ? 's' : ''} assigned to this role`
              }
            </div>
          </div>
        </div>

        <div className="rb-detail-actions">
          {view === 'matrix' ? (
            <>
              <button className="rb-users-pill-btn" onClick={switchToUsers}>
                <UsersIcon />
                <span>Assigned Users</span>
                {userCount > 0 && <span className="rb-users-pill-count">{userCount}</span>}
              </button>
              {!editMode ? (
                <button className="rb-edit-btn" onClick={enterEdit}>
                  <EditIcon /> Edit Permissions
                </button>
              ) : (
                <>
                  <button className="rb-cancel-btn" onClick={cancelEdit} disabled={saving}>Cancel</button>
                  <button className="rb-save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? <><span className="rb-spinner" /> Saving…</> : <><SaveIcon /> Save Changes</>}
                  </button>
                </>
              )}
            </>
          ) : (
            <button className="rb-edit-btn" onClick={switchToMatrix}>
              <LockIcon /> View Permissions
            </button>
          )}
        </div>
      </div>

      {/* ── Matrix view ── */}
      {view === 'matrix' && (
        <>
          {saveError && <div className="rb-save-error">⚠ {saveError}</div>}
          {detailError && !saveError && <div className="rb-save-error">⚠ Could not load permissions — showing cached data.</div>}

          {/* ── Skeleton while detail is loading ── */}
          {detailLoading && !detail && !editMode ? (
            <div className="rb-matrix-scroll">
              <table className="rb-matrix-table">
                <thead>
                  <tr>
                    <th className="rb-th-module">Module</th>
                    {ALL_ACTIONS.map(a => {
                      const c = ACTION_CFG[a];
                      return (
                        <th key={a} className="rb-th-action-col">
                          <span className="rb-th-dot" style={{ background: c?.color }} />
                          <span style={{ color: c?.color }}>{c?.label}</span>
                        </th>
                      );
                    })}
                    <th className="rb-th-summary">Access</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 7 }, (_, i) => (
                    <tr key={i} className={i % 2 !== 0 ? 'rb-row-odd' : ''}>
                      <td className="rb-td-module">
                        <div className="rb-sk rb-sk-title" style={{ width: '55%', marginBottom: 5 }} />
                        <div className="rb-sk rb-sk-sub"  style={{ width: '38%' }} />
                      </td>
                      {ALL_ACTIONS.map(a => (
                        <td key={a} className="rb-td-perm">
                          <div className="rb-sk" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                        </td>
                      ))}
                      <td className="rb-td-summary">
                        <div className="rb-access-bar-wrap">
                          <div className="rb-sk" style={{ flex: 1, height: 6, borderRadius: 4 }} />
                          <div className="rb-sk rb-sk-sub" style={{ width: 28 }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── Real matrix once detail is loaded ── */
            <>
              {editMode && <div className="rb-edit-notice">Click any permission dot to toggle it, then press <strong>Save Changes</strong>.</div>}

              <div className="rb-legend-bar">
                <span className="rb-legend-item rb-legend-granted"><CheckIcon /> Granted</span>
                <span className="rb-legend-item rb-legend-denied"><MinusIcon /> Denied</span>
                <span className="rb-legend-item rb-legend-na">— N/A</span>
                {editMode && <span className="rb-legend-item rb-legend-changed">● Changed</span>}
              </div>

              <div className="rb-matrix-scroll">
                <table className="rb-matrix-table">
                  <thead>
                    <tr>
                      <th className="rb-th-module">Module</th>
                      {ALL_ACTIONS.map(a => {
                        const c = ACTION_CFG[a];
                        return (
                          <th key={a} className="rb-th-action-col">
                            <span className="rb-th-dot" style={{ background: c?.color }} />
                            <span style={{ color: c?.color }}>{c?.label}</span>
                          </th>
                        );
                      })}
                      <th className="rb-th-summary">Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((mod, idx) => {
                      const granted      = activePerms[mod.name] || [];
                      const avail        = mod.available_actions || ALL_ACTIONS;
                      const grantedCount = ALL_ACTIONS.filter(a => avail.includes(a) && granted.includes(a)).length;
                      const availCount   = ALL_ACTIONS.filter(a => avail.includes(a)).length;
                      const pct          = availCount > 0 ? Math.round((grantedCount / availCount) * 100) : 0;
                      const rowChanged   = editMode && ALL_ACTIONS.some(a => isChanged(mod.name, a));
                      return (
                        <tr key={mod.name} className={[idx % 2 !== 0 ? 'rb-row-odd' : '', rowChanged ? 'rb-row-changed' : ''].filter(Boolean).join(' ')}>
                          <td className="rb-td-module">
                            <div className="rb-module-name">
                              {mod.display_name || mod.name}
                              {rowChanged && <span className="rb-changed-dot" />}
                            </div>
                            <div className="rb-module-key">{mod.name}</div>
                          </td>
                          {ALL_ACTIONS.map(action => (
                            <td key={action} className="rb-td-perm">
                              <PermDot
                                action={action}
                                active={granted.includes(action)}
                                available={avail.includes(action)}
                                editMode={editMode}
                                onChange={() => togglePerm(mod.name, action)}
                              />
                            </td>
                          ))}
                          <td className="rb-td-summary">
                            <div className="rb-access-bar-wrap">
                              <div className="rb-access-bar">
                                <div className="rb-access-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="rb-access-pct">{grantedCount}/{availCount}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && <div className="rb-empty"><LockIcon /><span>No modules defined.</span></div>}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Users view ── */}
      {view === 'users' && (
        <div className="rb-users-view">
          {/* Column labels */}
          <div className="rb-ucols-head rb-ucols-head-inline">
            <span className="rb-ucol rb-ucol-user">User</span>
            <span className="rb-ucol rb-ucol-email">Email</span>
            <span className="rb-ucol rb-ucol-status">Status</span>
            <span className="rb-ucol rb-ucol-action" />
          </div>

          {detailError ? (
            <div className="rb-users-error">⚠ Could not load users.</div>
          ) : detailLoading ? (
            <div className="rb-users-body">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className={`rb-user-row${i % 2 !== 0 ? ' rb-user-row-alt' : ''}`}>
                  <div className="rb-ucol rb-ucol-user">
                    <div className="rb-sk" style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="rb-sk rb-sk-title" style={{ width: '50%' }} />
                      <div className="rb-sk rb-sk-sub"   style={{ width: '70%' }} />
                    </div>
                  </div>
                  <div className="rb-ucol rb-ucol-email"><div className="rb-sk rb-sk-sub" style={{ width: '55%' }} /></div>
                  <div className="rb-ucol rb-ucol-status"><div className="rb-sk" style={{ width: 54, height: 22, borderRadius: 20 }} /></div>
                  <div className="rb-ucol rb-ucol-action" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="rb-users-empty rb-users-empty-inline">
              <UsersIcon />
              <span>No users assigned to <strong>{role.name}</strong>.</span>
            </div>
          ) : (
            <div className="rb-users-body">
              {users.map((u, idx) => {
                const c    = roleColor(u.full_name || u.email || '');
                const name = u.full_name || '';
                const email= u.email || '';
                return (
                  <div key={u.id} className={`rb-user-row${idx % 2 !== 0 ? ' rb-user-row-alt' : ''}`}>
                    <div className="rb-ucol rb-ucol-user">
                      <div className="rb-user-av" style={{ background: `${c}20`, color: c, border: `1px solid ${c}40` }}>
                        {getInitials(name || email || '?')}
                      </div>
                      <div className="rb-user-av-info">
                        <span className="rb-user-av-name">{name || email}</span>
                        {name && <span className="rb-user-av-sub">{email}</span>}
                      </div>
                    </div>
                    <div className="rb-ucol rb-ucol-email">
                      <span className="rb-user-email-val">{email}</span>
                    </div>
                    <div className="rb-ucol rb-ucol-status">
                      <span className={u.status === 'active' ? 'rb-status-active' : 'rb-status-inactive'}>
                        {u.status || 'active'}
                      </span>
                    </div>
                    <div className="rb-ucol rb-ucol-action">
                      <button
                        className="rb-user-assign-btn"
                        title={`Assign ${name || email} to ${role.name}`}
                        onClick={() => onAssign(u)}
                      >
                        <AssignIcon /> Assign
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Delete module confirm modal ─────────────────────────
function DeleteModuleModal({ module: mod, deletingModule, deleteModuleError, onClose, onConfirm }) {
  return createPortal(
    <div className="rb-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rb-modal rb-confirm-modal">
        <div className="rb-modal-header">
          <div className="rb-modal-title">
            <div className="rb-modal-icon rb-modal-icon-danger"><TrashIcon /></div>
            Delete Module
          </div>
          <button className="rb-modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="rb-modal-body">
          <div className="rb-confirm-body">
            <div className="rb-confirm-warn-icon"><WarningIcon /></div>
            <div className="rb-confirm-text">
              <p>
                Delete module <strong>{mod.display_name || mod.name}</strong>
                {' '}<span className="rb-mod-key-inline">{mod.name}</span>?
              </p>
              <div className="rb-confirm-block rb-confirm-warn">
                This action is permanent. The module will be purged from all role permission maps and the RBAC cache will be invalidated globally.
              </div>
              <div className="rb-confirm-block" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Blocked if:</strong> module is a built-in system module (400) or any role currently has permissions on it (409).
              </div>
            </div>
          </div>
          {deleteModuleError && <div className="rb-save-error">⚠ {deleteModuleError}</div>}
        </div>
        <div className="rb-modal-footer">
          <button className="rb-cancel-btn" onClick={onClose} disabled={deletingModule}>Cancel</button>
          <button
            className="rb-delete-btn"
            onClick={() => onConfirm(mod.id || mod.name)}
            disabled={deletingModule}
          >
            {deletingModule
              ? <><span className="rb-spinner rb-spinner-danger" /> Deleting…</>
              : <><TrashIcon /> Delete Module</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Modules view ────────────────────────────────────────
function ModulesView({ modules, loading, error, onBack, onRegister, onDelete }) {
  return (
    <div className="rb-detail-wrap rb-modules-wrap">
      {/* Header */}
      <div className="rb-detail-header">
        <button className="rb-back-btn" onClick={onBack}>
          <ArrowLeftIcon /> Back to Roles
        </button>
        <div className="rb-detail-role-info" style={{ flex: 1 }}>
          <div className="rb-detail-avatar" style={{ background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)' }}>
            <LayersIcon />
          </div>
          <div>
            <div className="rb-detail-role-name">All Modules</div>
            <div className="rb-detail-role-sub">
              {loading ? 'Loading…' : `${modules.length} module${modules.length !== 1 ? 's' : ''} registered`}
            </div>
          </div>
        </div>
        <div className="rb-detail-actions">
          <button className="rb-create-btn" onClick={onRegister}>
            <CubeIcon /> Register Module
          </button>
        </div>
      </div>

      {error && <div className="rb-save-error">⚠ {error}</div>}

      {loading ? (
        <div className="rb-modules-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rb-mod-card">
              <div className="rb-sk" style={{ width: '55%', height: 14, marginBottom: 8, borderRadius: 4 }} />
              <div className="rb-sk" style={{ width: '40%', height: 10, marginBottom: 14, borderRadius: 4 }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[1,2,3].map(j => <div key={j} className="rb-sk" style={{ width: 62, height: 22, borderRadius: 20 }} />)}
              </div>
            </div>
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="rb-empty" style={{ padding: '52px 20px' }}>
          <LayersIcon />
          <span>No modules registered yet.</span>
          <button className="rb-create-btn" onClick={onRegister} style={{ marginTop: 10 }}>
            <CubeIcon /> Register First Module
          </button>
        </div>
      ) : (
        <div className="rb-modules-grid">
          {modules.map(mod => {
            const avail = mod.available_actions || [];
            return (
              <div key={mod.id || mod.name} className="rb-mod-card">
                <button
                  className="rb-mod-delete-btn"
                  title={`Delete ${mod.display_name || mod.name}`}
                  onClick={() => onDelete(mod)}
                >
                  <TrashIcon />
                </button>
                <div className="rb-mod-card-top">
                  <div className="rb-mod-name">{mod.display_name || mod.name}</div>
                  <span className="rb-mod-key">{mod.name}</span>
                </div>
                <div className="rb-mod-actions">
                  {ALL_ACTIONS.map(a => {
                    const c      = ACTION_CFG[a];
                    const active = avail.includes(a);
                    return (
                      <span
                        key={a}
                        className={`rb-mod-action-pill ${active ? 'rb-mod-pill-on' : 'rb-mod-pill-off'}`}
                        style={active ? { '--ac': c.color, '--ab': c.bg } : {}}
                      >
                        <span className="rb-mod-pill-dot" />
                        {c.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────
function SkeletonTable() {
  return (
    <div className="rb-table-wrap">
      <table className="rb-roles-table">
        <thead>
          <tr>
            <th className="rb-rth-role">Role</th>
            <th className="rb-rth-center">Users</th>
            <th className="rb-rth-center">Modules</th>
            <th className="rb-rth-center">Perms</th>
            <th className="rb-rth-center">Status</th>
            <th className="rb-rth-actions" />
            <th className="rb-rth-arrow" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, i) => (
            <tr key={i} className={i % 2 !== 0 ? 'rb-rt-odd' : ''}>
              <td className="rb-rtd-role">
                <div className="rb-sk rb-sk-avatar" />
                <div style={{ flex: 1 }}>
                  <div className="rb-sk rb-sk-title" />
                  <div className="rb-sk rb-sk-sub" style={{ width: '60%' }} />
                </div>
              </td>
              {[1,2,3,4].map(j => (
                <td key={j} className="rb-rtd-center">
                  <div className="rb-sk" style={{ width: 40, height: 20, margin: '0 auto', borderRadius: 20 }} />
                </td>
              ))}
              <td /><td />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────
export default function RbacPage() {
  const dispatch = useDispatch();
  const {
    roles, modules,
    rolesLoading, rolesError,
    modulesLoading, modulesError,
    roleDetail, roleDetailLoading, roleDetailError,
    saving, saveError,
    creating, createError,
    updating, updateError,
    deleting, deleteError,
    assigning, assignError,
    creatingModule, createModuleError,
    deletingModule, deleteModuleError,
  } = useSelector(s => s.rbac);

  const [selectedRole,         setSelectedRole]         = useState(null);
  const [pageView,             setPageView]             = useState('roles'); // 'roles' | 'modules'
  const [showCreateModal,      setShowCreateModal]      = useState(false);
  const [editingRole,          setEditingRole]          = useState(null);
  const [deletingRole,         setDeletingRole]         = useState(null);
  const [assigningUser,        setAssigningUser]        = useState(null);
  const [showCreateModuleModal,setShowCreateModuleModal]= useState(false);
  const [deletingModuleItem,   setDeletingModuleItem]   = useState(null);

  // Only fetch roles on mount — modules are loaded on demand
  useEffect(() => {
    dispatch(fetchRbacRoles());
  }, [dispatch]);

  useEffect(() => {
    if (selectedRole) {
      const updated = roles.find(r => r.id === selectedRole.id);
      if (updated) setSelectedRole(updated);
    }
  }, [roles]);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    dispatch(clearRoleDetail());
    dispatch(fetchRoleDetail(role.id));
    // Modules are needed for PermMatrix — fetch lazily if not yet loaded
    if (modules.length === 0) dispatch(fetchRbacModules());
  };

  const handleBack = () => {
    setSelectedRole(null);
    dispatch(clearRoleDetail());
  };

  const handleViewModules = () => {
    dispatch(fetchRbacModules());
    setPageView('modules');
  };
  const handleBackToRoles = () => setPageView('roles');

  const handleSave = (roleId, add, remove) =>
    dispatch(patchRolePermissions({ roleId, add, remove }));

  const handleCreate = async (payload) => {
    const result = await dispatch(createRbacRole(payload));
    if (!result.error) setShowCreateModal(false);
  };

  const handleEditOpen  = (role) => { dispatch(clearUpdateError()); setEditingRole(role); };
  const handleEditClose = ()     => setEditingRole(null);
  const handleEditSubmit = async (roleId, updates) => {
    const result = await dispatch(updateRbacRole({ roleId, ...updates }));
    if (!result.error) setEditingRole(null);
  };

  const handleDeleteOpen  = (role) => { dispatch(clearDeleteError()); setDeletingRole(role); };
  const handleDeleteClose = ()     => setDeletingRole(null);
  const handleDeleteConfirm = async (roleId) => {
    const result = await dispatch(deleteRbacRole(roleId));
    if (!result.error) {
      setDeletingRole(null);
      if (selectedRole?.id === roleId) handleBack();
    }
  };

  const handleAssignOpen  = (user) => { dispatch(clearAssignError()); setAssigningUser(user); };
  const handleAssignClose = ()     => setAssigningUser(null);
  const handleAssignSubmit = async (roleId, payload) => {
    const result = await dispatch(assignRbacRole({ roleId, ...payload }));
    if (!result.error) {
      setAssigningUser(null);
      dispatch(fetchRoleDetail(roleId));
    }
  };

  const handleCreateModuleOpen  = () => { dispatch(clearCreateModuleError()); setShowCreateModuleModal(true); };
  const handleCreateModuleClose = () => setShowCreateModuleModal(false);
  const handleCreateModuleSubmit = async (payload) => {
    const result = await dispatch(createRbacModule(payload));
    if (!result.error) setShowCreateModuleModal(false);
  };

  const handleDeleteModuleOpen  = (mod) => { dispatch(clearDeleteModuleError()); setDeletingModuleItem(mod); };
  const handleDeleteModuleClose = ()    => setDeletingModuleItem(null);
  const handleDeleteModuleConfirm = async (moduleId) => {
    const result = await dispatch(deleteRbacModule(moduleId));
    if (!result.error) setDeletingModuleItem(null);
  };

  const systemRoles = roles.filter(r => r.is_system);
  const totalUsers  = roles.reduce((acc, r) => acc + (r.user_count ?? 0), 0);

  return (
    <div className="rbac-page">

      {/* ── Hero ── */}
      <div className="rb-hero">
        <div className="rb-hero-glow" />
        <div className="rb-hero-left">
          <div className="rb-hero-icon"><ShieldIcon /></div>
          <div>
            <h1 className="rb-hero-title">RBAC</h1>
            <p className="rb-hero-sub">Manage roles, permissions, and module access controls across the platform.</p>
          </div>
        </div>
        <div className="rb-hero-right">
          <button className="rb-refresh-btn" onClick={() => {
            dispatch(fetchRbacRoles());
            if (pageView === 'modules' || modules.length > 0) dispatch(fetchRbacModules());
          }}>
            <RefreshIcon /> Refresh
          </button>
          {roles.length > 0 && (
            <ExportButton
              onExportPDF={() => exportRbacToPDF(roles)}
              onExportExcel={() => exportRbacToExcel(roles)}
            />
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="rb-stats">
        <div className="rb-stat-card" style={{ '--sc': '#6366f1' }}>
          <div className="rb-stat-icon" style={{ color:'#818cf8', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)' }}><ShieldIcon /></div>
          <div><div className="rb-stat-val">{roles.length}</div><div className="rb-stat-lbl">Total Roles</div></div>
        </div>
        <div className="rb-stat-card" style={{ '--sc': '#f59e0b' }}>
          <div className="rb-stat-icon" style={{ color:'#fbbf24', background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.25)' }}><StarIcon /></div>
          <div><div className="rb-stat-val">{systemRoles.length}</div><div className="rb-stat-lbl">System Roles</div></div>
        </div>
        <div className="rb-stat-card" style={{ '--sc': '#06b6d4' }}>
          <div className="rb-stat-icon" style={{ color:'#22d3ee', background:'rgba(6,182,212,0.12)', border:'1px solid rgba(6,182,212,0.25)' }}><UsersIcon /></div>
          <div><div className="rb-stat-val">{totalUsers}</div><div className="rb-stat-lbl">Total Users</div></div>
        </div>
        <div className="rb-stat-card" style={{ '--sc': '#10b981' }}>
          <div className="rb-stat-icon" style={{ color:'#34d399', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)' }}><LayersIcon /></div>
          <div><div className="rb-stat-val">{modules.length}</div><div className="rb-stat-lbl">Modules</div></div>
        </div>
      </div>

      {/* ── Main panel ── */}
      {rolesError ? (
        <div className="rb-error">⚠ {rolesError}</div>
      ) : (
        <div className="rb-main-panel">
          {selectedRole ? (
            /* ── Permission matrix / assigned users view ── */
            <PermMatrix
              role={selectedRole}
              modules={modules}
              saving={saving}
              saveError={saveError}
              onBack={handleBack}
              onSave={handleSave}
              detail={roleDetail}
              detailLoading={roleDetailLoading}
              detailError={roleDetailError}
              onAssign={handleAssignOpen}
            />
          ) : pageView === 'modules' ? (
            /* ── Modules view — GET /admin/rbac/modules ── */
            <ModulesView
              modules={modules}
              loading={modulesLoading}
              error={modulesError}
              onBack={handleBackToRoles}
              onRegister={handleCreateModuleOpen}
              onDelete={handleDeleteModuleOpen}
            />
          ) : (
            /* ── Roles list view ── */
            <>
              <div className="rb-panel-head">
                <div className="rb-panel-head-left">
                  <span className="rb-panel-title">All Roles</span>
                  <span className="rb-panel-count">{roles.length}</span>
                </div>
                <div className="rb-panel-head-actions">
                  <button className="rb-module-btn" onClick={handleViewModules}>
                    <LayersIcon /> View Modules
                  </button>
                  <button className="rb-create-btn" onClick={() => { dispatch(clearCreateError()); setShowCreateModal(true); }}>
                    <PlusIcon /> Create Role
                  </button>
                </div>
              </div>
              <RolesTable
                roles={roles}
                loading={rolesLoading}
                onSelect={handleSelectRole}
                onEdit={handleEditOpen}
                onDelete={handleDeleteOpen}
              />
            </>
          )}
        </div>
      )}


      {/* ── Create role modal ── */}
      {showCreateModal && (
        <CreateRoleModal
          modules={modules}
          creating={creating}
          createError={createError}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* ── Edit role modal ── */}
      {editingRole && (
        <EditRoleModal
          role={editingRole}
          updating={updating}
          updateError={updateError}
          onClose={handleEditClose}
          onSubmit={handleEditSubmit}
        />
      )}

      {/* ── Delete confirm modal ── */}
      {deletingRole && (
        <DeleteConfirmModal
          role={deletingRole}
          deleting={deleting}
          deleteError={deleteError}
          onClose={handleDeleteClose}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {/* ── Change role modal ── */}
      {assigningUser && selectedRole && (
        <AssignUserModal
          currentRole={selectedRole}
          user={assigningUser}
          assigning={assigning}
          assignError={assignError}
          onClose={handleAssignClose}
          onSubmit={handleAssignSubmit}
        />
      )}

      {/* ── Register module modal ── */}
      {showCreateModuleModal && (
        <CreateModuleModal
          creatingModule={creatingModule}
          createModuleError={createModuleError}
          onClose={handleCreateModuleClose}
          onSubmit={handleCreateModuleSubmit}
        />
      )}

      {/* ── Delete module confirm modal ── */}
      {deletingModuleItem && (
        <DeleteModuleModal
          module={deletingModuleItem}
          deletingModule={deletingModule}
          deleteModuleError={deleteModuleError}
          onClose={handleDeleteModuleClose}
          onConfirm={handleDeleteModuleConfirm}
        />
      )}
    </div>
  );
}
