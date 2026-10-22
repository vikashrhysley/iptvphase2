import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { refreshCurrentUser } from '../../store/slices/authSlice';
import {
  fetchRbacRoles,
  fetchRbacModules,
  createRbacRole,
  fetchRoleDetail,
  updateRbacRole,
  deleteRbacRole,
  putRolePermissions,
  assignRbacRole,
  updateRbacModule,
  deleteRbacModule,
  clearCreateError,
  clearUpdateError,
  clearSaveError,
  clearDeleteError,
  clearAssignError,
  clearUpdateModuleError,
  clearDeleteModuleError,
  clearRoleDetail,
} from '../../store/slices/rbacSlice';
import { apiFetchAdminUsers } from '../../services/api';
import { isPermissionDenied } from '../../services/permissionErrors';
import { AccessDenied } from '../common/PermissionDenied';
import {
  VIEW, ACT, BUILT_IN_MODULES, isActOnly, isSuperadminRole, visibleRoles, templateRoles,
  normalizeGrid, hasView, hasAct, setView, setAct, accessCounts, accessLabel,
  validateRoleName, groupModules, fullGrid, gridsEqual,
} from './rbacRules';
import './RbacPage.css';

/*
 * Roles & Permissions — Roles & Permissions build guide, Part C.
 * The grid IS the access model: a role can do exactly what is ticked (View = GET, Act = writes),
 * superadmin always passes. Nothing on this page is hidden or disabled by the viewer's own role;
 * a refused call comes back as 403 and the global pop-up / inline locked state explains it.
 */

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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
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
const AssignIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <polyline points="16 11 18 13 22 9"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

// View / Act tick colours (match the old Read / Write dots).
const COL = {
  [VIEW]: { label: 'View', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
  [ACT]:  { label: 'Act',  color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
};

const roleColor = (name = '') => {
  const palette = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
};
const getInitials = (name = '') =>
  name.trim().split(/[\s_]+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  || name.slice(0, 2).toUpperCase();
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const adminRoleLabel = (u) => u?.role_display || u?.role || u?.role_name || 'no role';

// An action error string → inline message, unless it was a 403 (the global pop-up explained it).
function ActionError({ error }) {
  if (!error || isPermissionDenied(error)) return null;
  return <div className="rb-save-error">⚠ {error}</div>;
}

// A read (GET) error → inline locked state for a 403, else the normal error line.
function ReadError({ error, compact }) {
  if (!error) return null;
  if (isPermissionDenied(error)) return <AccessDenied message={error} compact={compact} />;
  return <div className="rb-save-error">⚠ {error}</div>;
}

// ─── Export (View / Act only — no Delete / Execute columns) ──
const ROLE_COLS = ['Role', 'Description', 'Type', 'Status', 'Admins', 'Access'];
const PERM_COLS = ['Role', 'Module', 'View', 'Act'];

const buildRoleRows = (roles) => roles.map(r => [
  r.name,
  r.description || '',
  r.is_system ? 'System' : 'Custom',
  r.is_active !== false ? 'Active' : 'Inactive',
  r.user_count ?? 0,
  accessLabel(r),
]);

const buildPermRows = (roles) => {
  const rows = [];
  for (const r of roles) {
    if (isSuperadminRole(r)) { rows.push([r.name, 'All modules', '✓', '✓']); continue; }
    for (const [mod, actions] of Object.entries(normalizeGrid(r.permissions))) {
      rows.push([r.name, mod, isActOnly(mod) ? '--' : (actions.includes(VIEW) ? '✓' : '✗'), actions.includes(ACT) ? '✓' : '✗']);
    }
  }
  return rows;
};

const exportRbacToExcel = async (roles) => {
  const { utils, writeFile } = await import('xlsx');
  const wb = utils.book_new();
  utils.book_append_sheet(wb, utils.aoa_to_sheet([ROLE_COLS, ...buildRoleRows(roles)]), 'Roles');
  const permRows = buildPermRows(roles);
  if (permRows.length) utils.book_append_sheet(wb, utils.aoa_to_sheet([PERM_COLS, ...permRows]), 'Permissions');
  writeFile(wb, `roles-permissions-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

const exportRbacToPDF = async (roles) => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const tableStyle = {
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 35, 60], textColor: [200, 210, 230], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  };
  doc.setFontSize(13);
  doc.text('Roles & Permissions — Roles', 40, 36);
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`Exported ${new Date().toLocaleString()}`, 40, 52);
  doc.setTextColor(0, 0, 0);
  autoTable(doc, { startY: 64, head: [ROLE_COLS], body: buildRoleRows(roles), ...tableStyle });
  const permRows = buildPermRows(roles);
  if (permRows.length) {
    doc.addPage();
    doc.setFontSize(13);
    doc.text('Roles & Permissions — View / Act grid', 40, 36);
    autoTable(doc, { startY: 52, head: [PERM_COLS], body: permRows, ...tableStyle });
  }
  doc.save(`roles-permissions-${new Date().toISOString().slice(0, 10)}.pdf`);
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
          <button onClick={() => { setOpen(false); onExportPDF(); }}>PDF</button>
          <button onClick={() => { setOpen(false); onExportExcel(); }}>Excel</button>
        </div>
      )}
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────
function Modal({ title, icon, danger, onClose, busy, width, children, footer }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, busy]);
  return createPortal(
    <div className="rb-modal-overlay" onClick={e => e.target === e.currentTarget && !busy && onClose()}>
      <div className="rb-modal" style={width ? { maxWidth: width } : undefined} role="dialog" aria-modal="true">
        <div className="rb-modal-header">
          <div className="rb-modal-title">
            <div className={`rb-modal-icon${danger ? ' rb-modal-icon-danger' : ''}`}>{icon}</div>
            {title}
          </div>
          <button className="rb-modal-close" onClick={onClose} disabled={busy} aria-label="Close"><CloseIcon /></button>
        </div>
        <div className="rb-modal-body">{children}</div>
        {footer && <div className="rb-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ─── The grid (C5) ────────────────────────────────────────
function Tick({ on, column, editable, locked, onToggle, label }) {
  const c = COL[column];
  const style = on ? { '--ac': c.color, '--ab': c.bg } : undefined;
  if (editable) {
    return (
      <button
        type="button"
        className={`rb-perm-btn ${on ? 'rb-perm-on' : 'rb-perm-off'}`}
        style={style}
        onClick={onToggle}
        aria-pressed={on}
        aria-label={`${c.label} — ${label}`}
        title={`${on ? 'Remove' : 'Grant'} ${c.label} on ${label}`}
      >
        {on ? <CheckIcon /> : <MinusIcon />}
      </button>
    );
  }
  return (
    <span className={`${on ? 'rb-perm-on' : 'rb-perm-off'}${locked ? ' rb-tick-locked' : ''}`} style={style}
      aria-label={`${c.label} ${on ? 'granted' : 'not granted'} — ${label}`}>
      {on ? <CheckIcon /> : <MinusIcon />}
    </span>
  );
}

function PermGrid({ modules, grid, onChange, readOnly, locked, baseline }) {
  const groups = useMemo(() => groupModules(modules), [modules]);
  if (!groups.length) return <div className="rb-empty"><LockIcon /><span>No modules returned.</span></div>;
  const changed = (mod) => baseline && (grid[mod] || []).join() !== (baseline[mod] || []).join();
  return (
    <div className="rb-matrix-scroll">
      <table className="rb-matrix-table rb-va-table">
        <thead>
          <tr>
            <th className="rb-th-module">Module</th>
            {[VIEW, ACT].map(col => (
              <th key={col} className="rb-th-action-col">
                <span className="rb-th-dot" style={{ background: COL[col].color }} />
                <span style={{ color: COL[col].color }}>{COL[col].label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(g => [
            <tr key={`g-${g.key}`} className="rb-grid-group"><td colSpan={3}>{g.label}</td></tr>,
            ...g.rows.map((mod, idx) => {
              const label = mod.display_name || mod.name;
              const actOnly = isActOnly(mod.name);
              const rowChanged = changed(mod.name);
              return (
                <tr key={mod.name} className={[idx % 2 ? 'rb-row-odd' : '', rowChanged ? 'rb-row-changed' : ''].filter(Boolean).join(' ')}>
                  <td className="rb-td-module" title={mod.description || undefined}>
                    <div className="rb-module-name">
                      {label}
                      {rowChanged && <span className="rb-changed-dot" />}
                    </div>
                    <div className="rb-module-key">{mod.name}</div>
                  </td>
                  <td className="rb-td-perm">
                    {actOnly
                      ? <span className="rb-perm-na" title="No page — Act only">--</span>
                      : <Tick on={hasView(grid, mod.name)} column={VIEW} editable={!readOnly} locked={locked} label={label}
                          onToggle={() => onChange(setView(grid, mod.name, !hasView(grid, mod.name)))} />}
                  </td>
                  <td className="rb-td-perm">
                    <Tick on={hasAct(grid, mod.name)} column={ACT} editable={!readOnly} locked={locked} label={label}
                      onToggle={() => onChange(setAct(grid, mod.name, !hasAct(grid, mod.name)))} />
                  </td>
                </tr>
              );
            }),
          ])}
        </tbody>
      </table>
    </div>
  );
}

// ─── Roles tab (C1 / C2) ──────────────────────────────────
function RolesTab({ roles, loading, error, onOpen, onDelete }) {
  if (error) return <ReadError error={error} />;
  if (loading && !roles.length) {
    return <div className="rb-empty"><span className="rb-spinner" /><span>Loading roles…</span></div>;
  }
  if (!roles.length) return <div className="rb-empty"><LockIcon /><span>No roles found.</span></div>;
  return (
    <div className="rb-table-wrap">
      <table className="rb-roles-table">
        <thead>
          <tr>
            <th className="rb-rth-role">Role</th>
            <th className="rb-rth-center">Type</th>
            <th className="rb-rth-center">Status</th>
            <th className="rb-rth-center">Admins</th>
            <th className="rb-rth-center">Access</th>
            <th className="rb-rth-actions" />
          </tr>
        </thead>
        <tbody>
          {roles.map((role, idx) => {
            const color = roleColor(role.name);
            const superadmin = isSuperadminRole(role);
            return (
              <tr key={role.id} className={`rb-rt-row${idx % 2 ? ' rb-rt-odd' : ''}`} onClick={() => onOpen(role)}>
                <td className="rb-rtd-role">
                  <div className="rb-rt-avatar" style={{ background: `${color}20`, color, border: `1px solid ${color}35` }}>
                    {getInitials(role.name)}
                  </div>
                  <div className="rb-rt-info">
                    <div className="rb-rt-name">{role.name}</div>
                    {role.description && <div className="rb-rt-desc">{role.description}</div>}
                  </div>
                </td>
                <td className="rb-rtd-center">
                  {role.is_system
                    ? <span className="rb-system-badge"><StarIcon /> System</span>
                    : <span className="rb-type-custom">Custom</span>}
                </td>
                <td className="rb-rtd-center">
                  {role.is_active !== false
                    ? <span className="rb-status-active">Active</span>
                    : <span className="rb-status-inactive">Inactive</span>}
                </td>
                <td className="rb-rtd-center"><span className="rb-rt-num">{role.user_count ?? 0}</span></td>
                <td className="rb-rtd-center"><span className="rb-access-text">{accessLabel(role)}</span></td>
                <td className="rb-rtd-actions" onClick={e => e.stopPropagation()}>
                  <div className="rb-row-actions">
                    <button className="rb-row-text-btn" onClick={() => onOpen(role)}>
                      {superadmin ? <><EyeIcon /> View</> : <><EditIcon /> Edit</>}
                    </button>
                    {!role.is_system && (
                      <button className="rb-row-text-btn rb-row-text-danger" onClick={() => onDelete(role)}>
                        <TrashIcon /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── New role (C3) ────────────────────────────────────────
function CreateRoleModal({ roles, modules, modulesLoading, modulesError, creating, createError, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [desc, setDesc] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [grid, setGrid] = useState({});
  const nameErr = validateRoleName(name);
  const templates = templateRoles(roles);

  // Picking a template pre-fills the grid from that role; ticks are then added on top. Only
  // `permissions` is sent (no template_role_id) — the guide's simplest path.
  const pickTemplate = (id) => {
    setTemplateId(id);
    const t = templates.find(r => r.id === id);
    setGrid(t ? normalizeGrid(t.permissions) : {});
  };

  const submit = () => {
    setTouched(true);
    if (nameErr) return;
    onSubmit({ name, description: desc.trim() || undefined, permissions: normalizeGrid(grid) });
  };

  return (
    <Modal title="New role" icon={<PlusIcon />} onClose={onClose} busy={creating} width={760}
      footer={<>
        <button className="rb-cancel-btn" onClick={onClose} disabled={creating}>Cancel</button>
        <button className="rb-save-btn" onClick={submit} disabled={creating || (touched && !!nameErr)}>
          {creating ? <><span className="rb-spinner" /> Creating…</> : <><PlusIcon /> Create role</>}
        </button>
      </>}>
      <div className="rb-form-group">
        <label className="rb-form-label" htmlFor="rb-new-name">Name <span className="rb-required">*</span></label>
        <input id="rb-new-name" className={`rb-form-input${touched && nameErr ? ' rb-input-error' : ''}`} type="text"
          placeholder="e.g. support_team" value={name} autoFocus
          onChange={e => { setName(e.target.value); setTouched(true); }} />
        {touched && nameErr
          ? <span className="rb-form-hint rb-hint-err">{nameErr}</span>
          : <span className="rb-form-hint">Lowercase letters, digits and underscores. Not viewer, admin or superadmin.</span>}
      </div>
      <div className="rb-form-group">
        <label className="rb-form-label" htmlFor="rb-new-desc">Description <span className="rb-form-optional">optional</span></label>
        <textarea id="rb-new-desc" className="rb-form-textarea" rows={2} value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="e.g. Front-line support" />
      </div>
      <div className="rb-form-group">
        <label className="rb-form-label" htmlFor="rb-new-template">Start from</label>
        <select id="rb-new-template" className="rb-form-select" value={templateId} onChange={e => pickTemplate(e.target.value)}>
          <option value="">None — start empty</option>
          {templates.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <span className="rb-form-hint">Copies that role's grid below; tick more on top. A new role is active straight away and nobody has it until you add admins.</span>
      </div>
      <div className="rb-form-group">
        <label className="rb-form-label">Access</label>
        {modulesLoading && !modules.length
          ? <div className="rb-empty"><span className="rb-spinner" /><span>Loading modules…</span></div>
          : modulesError ? <ReadError error={modulesError} compact />
          : <PermGrid modules={modules} grid={grid} onChange={setGrid} />}
      </div>
      <ActionError error={createError} />
    </Modal>
  );
}

// ─── Confirm: turn a role off (C4) ────────────────────────
function DeactivateModal({ role, count, busy, onClose, onConfirm }) {
  return (
    <Modal title="Turn this role off?" icon={<WarningIcon />} danger onClose={onClose} busy={busy} width={460}
      footer={<>
        <button className="rb-cancel-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="rb-delete-btn" onClick={onConfirm} disabled={busy}>
          {busy ? <><span className="rb-spinner rb-spinner-danger" /> Saving…</> : 'Turn off'}
        </button>
      </>}>
      <div className="rb-confirm-block rb-confirm-err">
        <strong>{plural(count, 'admin')}</strong> on <strong>{role.name}</strong> will lose all access.
      </div>
      <p className="rb-confirm-p">They can still log in, but every page is refused on their next click until the role is turned back on.</p>
    </Modal>
  );
}

// ─── Delete role (C7) ─────────────────────────────────────
function DeleteRoleModal({ role, deleting, deleteError, onClose, onConfirm, onShowAdmins }) {
  const blockedByAdmins = !!deleteError && /reassign|user\(s\)/i.test(deleteError);
  return (
    <Modal title="Delete role" icon={<TrashIcon />} danger onClose={onClose} busy={deleting} width={460}
      footer={<>
        <button className="rb-cancel-btn" onClick={onClose} disabled={deleting}>Cancel</button>
        <button className="rb-delete-btn" onClick={() => onConfirm(role.id)} disabled={deleting}>
          {deleting ? <><span className="rb-spinner rb-spinner-danger" /> Deleting…</> : <><TrashIcon /> Delete role</>}
        </button>
      </>}>
      <p className="rb-confirm-p">Delete <strong>{role.name}</strong>? This can't be undone (it is recorded in the audit log).</p>
      <ActionError error={deleteError} />
      {blockedByAdmins && (
        <button className="rb-link-btn" onClick={() => onShowAdmins(role)}>
          <UsersIcon /> Show the admins on {role.name}
        </button>
      )}
    </Modal>
  );
}

// ─── Add admin → move them to this role (C6) ──────────────
function AddAdminModal({ role, accessToken, existingIds, assigning, assignError, onClose, onSubmit }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [picked, setPicked] = useState(null);
  const [reason, setReason] = useState('');
  const q = query.trim().toLowerCase();

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const r = await apiFetchAdminUsers(accessToken, { search: q || undefined, page_size: 50 });
        const list = Array.isArray(r?.users) ? r.users : Array.isArray(r) ? r : [];
        // The search param is a hint; filter by email/name here too so results always match.
        const filtered = q ? list.filter(u => `${u.email || ''} ${u.full_name || ''}`.toLowerCase().includes(q)) : list;
        if (!cancelled) setResults(filtered.slice(0, 20));
      } catch (err) {
        if (!cancelled) setSearchError(err.message);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, accessToken]);

  const name = (u) => u.full_name || u.email;

  return (
    <Modal title={picked ? `Move ${name(picked)}?` : `Add admin to ${role.name}`} icon={<AssignIcon />} onClose={onClose}
      busy={assigning} width={520}
      footer={picked ? <>
        <button className="rb-cancel-btn" onClick={() => setPicked(null)} disabled={assigning}>Back</button>
        <button className="rb-save-btn" onClick={() => onSubmit(picked, reason)} disabled={assigning}>
          {assigning ? <><span className="rb-spinner" /> Moving…</> : <><AssignIcon /> Move to {role.name}</>}
        </button>
      </> : <button className="rb-cancel-btn" onClick={onClose}>Cancel</button>}>
      {!picked ? (
        <>
          <div className="rb-search-wrap">
            <SearchIcon />
            <input className="rb-form-input rb-search-input" placeholder="Search admins by email…" value={query}
              onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          {searching ? <div className="rb-empty"><span className="rb-spinner" /><span>Searching…</span></div>
            : searchError ? <ReadError error={searchError} compact />
            : results.length === 0 ? <div className="rb-empty"><UsersIcon /><span>No matching admins.</span></div>
            : (
              <ul className="rb-pick-list">
                {results.map(u => {
                  const already = existingIds.has(u.id);
                  return (
                    <li key={u.id} className="rb-pick-row">
                      <div className="rb-pick-who">
                        <span className="rb-user-av-name">{name(u)}</span>
                        {u.full_name && <span className="rb-user-av-sub">{u.email}</span>}
                      </div>
                      <span className="rb-pick-role">{adminRoleLabel(u)}</span>
                      <button className="rb-user-assign-btn" disabled={already} onClick={() => setPicked(u)}
                        title={already ? `Already on ${role.name}` : `Move to ${role.name}`}>
                        {already ? 'On this role' : 'Select'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
        </>
      ) : (
        <>
          <p className="rb-confirm-p">
            Each admin has exactly one role, so this <strong>moves</strong> {name(picked)} off their current role.
          </p>
          <div className="rb-assign-flow">
            <span className="rb-assign-flow-from">{adminRoleLabel(picked)}</span>
            <span className="rb-assign-flow-arrow">→</span>
            <span className="rb-assign-flow-to">{role.name}</span>
          </div>
          <div className="rb-form-group" style={{ marginTop: 14 }}>
            <label className="rb-form-label" htmlFor="rb-assign-reason">Reason <span className="rb-form-optional">optional · saved in the audit log</span></label>
            <textarea id="rb-assign-reason" className="rb-form-textarea" rows={2} value={reason} maxLength={500}
              placeholder="e.g. Joined support team" onChange={e => setReason(e.target.value)} />
          </div>
          <ActionError error={assignError} />
        </>
      )}
    </Modal>
  );
}

// ─── Role editor (C4 + C5 + admins) ───────────────────────
function RoleEditor({ roleSummary, modules, modulesLoading, modulesError, onBack, onDelete, focusAdmins }) {
  const dispatch = useDispatch();
  const accessToken = useSelector(s => s.auth.accessToken);
  const {
    roleDetail, roleDetailLoading, roleDetailError,
    saving, saveError, updating, updateError, assigning, assignError,
  } = useSelector(s => s.rbac);

  const role = roleDetail?.id === roleSummary.id ? roleDetail : roleSummary;
  const superadmin = isSuperadminRole(role);
  const active = role.is_active !== false;
  const userCount = role.user_count ?? 0;
  const users = roleDetail?.id === roleSummary.id ? (roleDetail.users || []) : [];

  // Header drafts (name + description) — PATCH sends only what changed.
  const [nameDraft, setNameDraft] = useState(null);
  const [descDraft, setDescDraft] = useState(null);
  const name = nameDraft ?? role.name ?? '';
  const desc = descDraft ?? role.description ?? '';
  const nameErr = !role.is_system && nameDraft !== null ? validateRoleName(nameDraft) : '';
  const headerDirty = (nameDraft !== null && nameDraft !== role.name) || (descDraft !== null && descDraft !== (role.description || ''));

  // Grid draft — null means "showing what's saved". The saved grid always comes from the
  // server (detail or save response), never from what was sent.
  const saved = useMemo(() => normalizeGrid(role.permissions), [role.permissions]);
  const [draft, setDraft] = useState(null);
  const grid = superadmin ? fullGrid(modules) : (draft ?? saved);
  const gridDirty = !superadmin && draft !== null && !gridsEqual(draft, saved);

  const [confirmOff, setConfirmOff] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const adminsRef = useRef(null);

  useEffect(() => {
    if (focusAdmins && adminsRef.current) adminsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusAdmins, roleDetail]);

  const saveHeader = async () => {
    if (nameErr) return;
    const updates = {};
    if (!role.is_system && nameDraft !== null && nameDraft !== role.name) updates.name = nameDraft;
    if (descDraft !== null && descDraft !== (role.description || '')) updates.description = descDraft;
    if (!Object.keys(updates).length) return;
    dispatch(clearUpdateError());
    const res = await dispatch(updateRbacRole({ roleId: role.id, ...updates }));
    if (updateRbacRole.fulfilled.match(res)) {
      setNameDraft(null);
      setDescDraft(null);
      toast.success('Role saved');
      dispatch(fetchRbacRoles({ force: true }));
    }
  };

  const setActive = async (next) => {
    dispatch(clearUpdateError());
    const res = await dispatch(updateRbacRole({ roleId: role.id, is_active: next }));
    setConfirmOff(false);
    if (updateRbacRole.fulfilled.match(res)) {
      toast.success(next ? 'Role turned on' : 'Role turned off');
      dispatch(fetchRoleDetail(role.id));
      dispatch(fetchRbacRoles({ force: true }));
    }
  };

  const saveGrid = async () => {
    dispatch(clearSaveError());
    const res = await dispatch(putRolePermissions({ roleId: role.id, permissions: normalizeGrid(draft) }));
    if (putRolePermissions.fulfilled.match(res)) {
      setDraft(null);   // redraw from the saved response
      toast.success('Access saved — applies on their next request');
      // Their own access may have changed if this is the signed-in admin's role.
      dispatch(refreshCurrentUser());
    }
  };

  const assign = async (user, reason) => {
    dispatch(clearAssignError());
    const res = await dispatch(assignRbacRole({ roleId: role.id, user_id: user.id, reason: reason.trim() || undefined }));
    if (assignRbacRole.fulfilled.match(res)) {
      setShowAdd(false);
      toast.success(`${user.full_name || user.email} moved to ${role.name}`);
      dispatch(fetchRoleDetail(role.id));
      dispatch(fetchRbacRoles({ force: true }));
      dispatch(refreshCurrentUser());
    } else if (!isPermissionDenied(res.payload)) {
      // 400 inactive role / 404 unknown admin → ordinary error toast (C6).
      toast.error(res.payload || 'Could not assign the role.');
    }
  };

  const color = roleColor(role.name || '');

  return (
    <div className="rb-detail-wrap">
      {/* ── Header: < Roles  name  [Active]  [Delete] ── */}
      <div className="rb-detail-header">
        <button className="rb-back-btn" onClick={onBack} disabled={saving || updating}>
          <ArrowLeftIcon /> Roles
        </button>
        <div className="rb-detail-role-info">
          <div className="rb-detail-avatar" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
            {getInitials(role.name || '')}
          </div>
          <div>
            <div className="rb-detail-role-name">
              {role.name}
              {role.is_system && <span className="rb-system-badge"><StarIcon /> System</span>}
            </div>
            <div className="rb-detail-role-sub">{accessLabel(role)} · {plural(userCount, 'admin')}</div>
          </div>
        </div>
        <div className="rb-detail-actions">
          <div className={`rb-toggle-row${superadmin ? ' rb-toggle-disabled' : ''}`}
            onClick={() => { if (superadmin || updating) return; if (active) setConfirmOff(true); else setActive(true); }}
            role="switch" aria-checked={active} tabIndex={superadmin ? -1 : 0}
            title={superadmin ? 'The superadmin role cannot be turned off' : active ? 'Turn this role off' : 'Turn this role on'}
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !superadmin) { e.preventDefault(); if (active) setConfirmOff(true); else setActive(true); } }}>
            <div className={`rb-toggle ${active ? 'rb-toggle-on' : ''}`}><div className="rb-toggle-thumb" /></div>
            <span className={`rb-toggle-label ${active ? 'rb-toggle-label-on' : ''}`}>{active ? 'Active' : 'Inactive'}</span>
          </div>
          {!role.is_system && (
            <button className="rb-delete-btn" onClick={() => onDelete(role)}><TrashIcon /> Delete</button>
          )}
        </div>
      </div>

      {roleDetailError && <ReadError error={roleDetailError} compact />}

      {/* ── Name + description ── */}
      <div className="rb-editor-card">
        <div className="rb-editor-fields">
          <div className="rb-form-group">
            <label className="rb-form-label" htmlFor="rb-edit-name">Name</label>
            <input id="rb-edit-name" className={`rb-form-input${nameErr ? ' rb-input-error' : ''}`} value={name}
              disabled={role.is_system} onChange={e => setNameDraft(e.target.value)} />
            {role.is_system
              ? <span className="rb-form-hint">System role names can't be changed.</span>
              : nameErr && <span className="rb-form-hint rb-hint-err">{nameErr}</span>}
          </div>
          <div className="rb-form-group rb-grow">
            <label className="rb-form-label" htmlFor="rb-edit-desc">Description</label>
            <input id="rb-edit-desc" className="rb-form-input" value={desc} disabled={superadmin}
              onChange={e => setDescDraft(e.target.value)} />
          </div>
          {!superadmin && (
            <button className="rb-save-btn rb-editor-save" onClick={saveHeader} disabled={!headerDirty || !!nameErr || updating}>
              {updating ? <><span className="rb-spinner" /> Saving…</> : <><SaveIcon /> Save</>}
            </button>
          )}
        </div>
        <ActionError error={updateError} />
      </div>

      {/* ── Access grid ── */}
      <div className="rb-editor-card">
        <div className="rb-editor-card-head">
          <span className="rb-panel-title">Access</span>
          {!superadmin && (
            <div className="rb-detail-actions">
              {gridDirty && <button className="rb-cancel-btn" onClick={() => setDraft(null)} disabled={saving}>Reset</button>}
              <button className="rb-save-btn" onClick={saveGrid} disabled={!gridDirty || saving}>
                {saving ? <><span className="rb-spinner" /> Saving…</> : <><SaveIcon /> Save access</>}
              </button>
            </div>
          )}
        </div>
        {superadmin ? (
          <div className="rb-readonly-note"><LockIcon /> Always has full access. This grid can't be edited.</div>
        ) : (
          <div className="rb-edit-notice">
            View opens a page (GET). Act changes things (POST / PUT / PATCH / DELETE) — ticking Act also ticks View.
            Changes apply to this role's admins on their next request; they don't need to log out.
          </div>
        )}
        <ActionError error={saveError} />
        {roleDetailLoading && !roleDetail
          ? <div className="rb-empty"><span className="rb-spinner" /><span>Loading access…</span></div>
          : modulesLoading && !modules.length
            ? <div className="rb-empty"><span className="rb-spinner" /><span>Loading modules…</span></div>
            : modulesError ? <ReadError error={modulesError} compact />
            : <PermGrid modules={modules} grid={grid} readOnly={superadmin} locked={superadmin}
                baseline={gridDirty ? saved : null} onChange={setDraft} />}
      </div>

      {/* ── Admins on this role ── */}
      <div className="rb-editor-card" ref={adminsRef}>
        <div className="rb-editor-card-head">
          <span className="rb-panel-title">Admins on this role <span className="rb-panel-count">{userCount}</span></span>
          {active
            ? <button className="rb-create-btn" onClick={() => { dispatch(clearAssignError()); setShowAdd(true); }}><PlusIcon /> Add admin</button>
            : <span className="rb-form-hint">Turn the role on to add admins.</span>}
        </div>
        {userCount > users.length && users.length > 0 && (
          <div className="rb-form-hint" style={{ marginBottom: 8 }}>Showing {users.length} of {userCount}.</div>
        )}
        {roleDetailLoading && !users.length ? (
          <div className="rb-empty"><span className="rb-spinner" /><span>Loading admins…</span></div>
        ) : users.length === 0 ? (
          <div className="rb-users-empty rb-users-empty-inline"><UsersIcon /><span>Nobody has <strong>{role.name}</strong> yet.</span></div>
        ) : (
          <div className="rb-users-body">
            {users.map((u, idx) => {
              const c = roleColor(u.full_name || u.email || '');
              return (
                <div key={u.id} className={`rb-user-row${idx % 2 ? ' rb-user-row-alt' : ''}`}>
                  <div className="rb-ucol rb-ucol-user">
                    <div className="rb-user-av" style={{ background: `${c}20`, color: c, border: `1px solid ${c}40` }}>
                      {getInitials(u.full_name || u.email || '?')}
                    </div>
                    <div className="rb-user-av-info">
                      <span className="rb-user-av-name">{u.full_name || u.email}</span>
                      {u.full_name && <span className="rb-user-av-sub">{u.email}</span>}
                    </div>
                  </div>
                  <div className="rb-ucol rb-ucol-status">
                    <span className={u.status === 'active' ? 'rb-status-active' : 'rb-status-inactive'}>{u.status || '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmOff && (
        <DeactivateModal role={role} count={userCount} busy={updating}
          onClose={() => setConfirmOff(false)} onConfirm={() => setActive(false)} />
      )}
      {showAdd && (
        <AddAdminModal role={role} accessToken={accessToken} existingIds={new Set(users.map(u => u.id))}
          assigning={assigning} assignError={assignError} onClose={() => setShowAdd(false)} onSubmit={assign} />
      )}
    </div>
  );
}

// ─── Modules tab (C8) ─────────────────────────────────────
function EditModuleModal({ module: mod, busy, error, onClose, onSubmit }) {
  const [label, setLabel] = useState(mod.display_name || '');
  const [desc, setDesc] = useState(mod.description || '');
  const changes = {};
  if (label.trim() !== (mod.display_name || '')) changes.display_name = label.trim();
  if (desc !== (mod.description || '')) changes.description = desc;
  const dirty = Object.keys(changes).length > 0;
  return (
    <Modal title={`Edit ${mod.name}`} icon={<EditIcon />} onClose={onClose} busy={busy} width={480}
      footer={<>
        <button className="rb-cancel-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="rb-save-btn" onClick={() => onSubmit(mod.id, changes)} disabled={busy || !dirty || !label.trim()}>
          {busy ? <><span className="rb-spinner" /> Saving…</> : <><SaveIcon /> Save</>}
        </button>
      </>}>
      <div className="rb-form-group">
        <label className="rb-form-label" htmlFor="rb-mod-label">Label</label>
        <input id="rb-mod-label" className="rb-form-input" value={label} onChange={e => setLabel(e.target.value)} />
        <span className="rb-form-hint">Shown as the row label in every role's grid.</span>
      </div>
      <div className="rb-form-group">
        <label className="rb-form-label" htmlFor="rb-mod-desc">Description</label>
        <textarea id="rb-mod-desc" className="rb-form-textarea" rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
        <span className="rb-form-hint">Shown as the row's tooltip.</span>
      </div>
      <ActionError error={error} />
    </Modal>
  );
}

function DeleteModuleModal({ module: mod, busy, error, onClose, onConfirm }) {
  return (
    <Modal title="Delete module" icon={<TrashIcon />} danger onClose={onClose} busy={busy} width={460}
      footer={<>
        <button className="rb-cancel-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="rb-delete-btn" onClick={() => onConfirm(mod.id)} disabled={busy}>
          {busy ? <><span className="rb-spinner rb-spinner-danger" /> Deleting…</> : <><TrashIcon /> Delete module</>}
        </button>
      </>}>
      <p className="rb-confirm-p">
        Delete <strong>{mod.display_name || mod.name}</strong>? It is not a built-in module, so no API route maps to it.
        If a role still ticks it, untick it on those roles first.
      </p>
      <ActionError error={error} />
    </Modal>
  );
}

function ModulesTab({ modules, loading, error, onEdit, onDelete }) {
  if (error) return <ReadError error={error} />;
  if (loading && !modules.length) return <div className="rb-empty"><span className="rb-spinner" /><span>Loading modules…</span></div>;
  if (!modules.length) return <div className="rb-empty"><LayersIcon /><span>No modules returned.</span></div>;
  return (
    <div className="rb-table-wrap">
      <table className="rb-roles-table">
        <thead>
          <tr>
            <th className="rb-rth-role">Module</th>
            <th>Description</th>
            <th className="rb-rth-center">Type</th>
            <th className="rb-rth-actions" />
          </tr>
        </thead>
        <tbody>
          {modules.map((m, idx) => {
            const builtIn = BUILT_IN_MODULES.has(m.name);
            return (
              <tr key={m.id || m.name} className={`rb-mod-row${idx % 2 ? ' rb-rt-odd' : ''}`}>
                <td className="rb-rtd-role">
                  <div className="rb-rt-info">
                    <div className="rb-rt-name">{m.display_name || m.name}</div>
                    <div className="rb-rt-desc rb-mono">{m.name}{isActOnly(m.name) ? ' · Act only' : ''}</div>
                  </div>
                </td>
                <td className="rb-mod-desc">{m.description || '—'}</td>
                <td className="rb-rtd-center">
                  {builtIn
                    ? <span className="rb-system-badge"><StarIcon /> Built-in</span>
                    : <span className="rb-type-leftover" title="No API route maps to this module — it gates nothing">Leftover</span>}
                </td>
                <td className="rb-rtd-actions">
                  <div className="rb-row-actions">
                    <button className="rb-row-text-btn" onClick={() => onEdit(m)}><EditIcon /> Edit</button>
                    {!builtIn && (
                      <button className="rb-row-text-btn rb-row-text-danger" onClick={() => onDelete(m)}><TrashIcon /> Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────
export default function RbacPage() {
  const dispatch = useDispatch();
  const {
    roles: allRoles, modules,
    rolesLoading, rolesError, modulesLoading, modulesError,
    creating, createError, deleting, deleteError,
    updatingModule, updateModuleError, deletingModule, deleteModuleError,
  } = useSelector(s => s.rbac);

  const roles = useMemo(() => visibleRoles(allRoles), [allRoles]);
  const [tab, setTab] = useState('roles');            // roles | modules
  const [openRole, setOpenRole] = useState(null);     // role summary being edited
  const [focusAdmins, setFocusAdmins] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingRole, setDeletingRole] = useState(null);
  const [editingModule, setEditingModule] = useState(null);
  const [deletingModuleItem, setDeletingModuleItem] = useState(null);

  useEffect(() => {
    dispatch(fetchRbacRoles());
    dispatch(fetchRbacModules());
  }, [dispatch]);

  // Grid rows are the API's ACTIVE modules (C5); the Modules tab lists all of them.
  const gridModules = useMemo(() => modules.filter(m => m.is_active !== false), [modules]);

  const openEditor = (role, { admins = false } = {}) => {
    dispatch(clearRoleDetail());
    dispatch(clearSaveError());
    dispatch(clearUpdateError());
    setFocusAdmins(admins);
    setOpenRole(role);
    dispatch(fetchRoleDetail(role.id));
  };
  const closeEditor = () => {
    setOpenRole(null);
    dispatch(clearRoleDetail());
  };

  const refresh = () => {
    dispatch(fetchRbacRoles({ force: true }));
    dispatch(fetchRbacModules({ force: true }));
    if (openRole) dispatch(fetchRoleDetail(openRole.id));
  };

  const handleCreate = async (payload) => {
    const res = await dispatch(createRbacRole(payload));
    if (createRbacRole.fulfilled.match(res)) {
      setShowCreate(false);
      toast.success(`Role ${payload.name} created`);
      dispatch(fetchRbacRoles({ force: true }));
    }
  };

  const handleDelete = async (roleId) => {
    const res = await dispatch(deleteRbacRole(roleId));
    if (deleteRbacRole.fulfilled.match(res)) {
      setDeletingRole(null);
      toast.success('Role deleted');
      if (openRole?.id === roleId) closeEditor();
    }
  };

  const handleUpdateModule = async (moduleId, changes) => {
    const res = await dispatch(updateRbacModule({ moduleId, ...changes }));
    if (updateRbacModule.fulfilled.match(res)) {
      setEditingModule(null);
      toast.success('Module updated');
      dispatch(fetchRbacModules({ force: true }));
    }
  };

  const handleDeleteModule = async (moduleId) => {
    const res = await dispatch(deleteRbacModule(moduleId));
    if (deleteRbacModule.fulfilled.match(res)) {
      setDeletingModuleItem(null);
      toast.success('Module deleted');
    }
  };

  const systemCount = roles.filter(r => r.is_system).length;
  const totalAdmins = roles.reduce((n, r) => n + (r.user_count ?? 0), 0);
  const counts = useMemo(() => roles.reduce((acc, r) => {
    if (r.is_active === false) acc.inactive += 1;
    const c = accessCounts(r.permissions);
    acc.act += c.act;
    return acc;
  }, { inactive: 0, act: 0 }), [roles]);

  return (
    <div className="rbac-page">
      {/* ── Hero ── */}
      <div className="rb-hero">
        <div className="rb-hero-glow" />
        <div className="rb-hero-left">
          <div className="rb-hero-icon"><ShieldIcon /></div>
          <div>
            <h1 className="rb-hero-title">Roles & Permissions</h1>
            <p className="rb-hero-sub">A role can do exactly what is ticked: View opens a page, Act changes things. Superadmin always has full access.</p>
          </div>
        </div>
        <div className="rb-hero-right">
          <button className="rb-refresh-btn" onClick={refresh}><RefreshIcon /> Refresh</button>
          {roles.length > 0 && (
            <ExportButton onExportPDF={() => exportRbacToPDF(roles)} onExportExcel={() => exportRbacToExcel(roles)} />
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="rb-stats">
        <div className="rb-stat-card" style={{ '--sc': '#6366f1' }}>
          <div className="rb-stat-icon" style={{ color: '#818cf8', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}><ShieldIcon /></div>
          <div><div className="rb-stat-val">{roles.length}</div><div className="rb-stat-lbl">Roles ({systemCount} system)</div></div>
        </div>
        <div className="rb-stat-card" style={{ '--sc': '#06b6d4' }}>
          <div className="rb-stat-icon" style={{ color: '#22d3ee', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)' }}><UsersIcon /></div>
          <div><div className="rb-stat-val">{totalAdmins}</div><div className="rb-stat-lbl">Admins on roles</div></div>
        </div>
        <div className="rb-stat-card" style={{ '--sc': '#f59e0b' }}>
          <div className="rb-stat-icon" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' }}><WarningIcon /></div>
          <div><div className="rb-stat-val">{counts.inactive}</div><div className="rb-stat-lbl">Inactive roles</div></div>
        </div>
        <div className="rb-stat-card" style={{ '--sc': '#10b981' }}>
          <div className="rb-stat-icon" style={{ color: '#34d399', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}><LayersIcon /></div>
          <div><div className="rb-stat-val">{gridModules.length}</div><div className="rb-stat-lbl">Modules</div></div>
        </div>
      </div>

      {/* ── Main panel ── */}
      <div className="rb-main-panel">
        {openRole ? (
          <RoleEditor
            key={openRole.id}
            roleSummary={roles.find(r => r.id === openRole.id) || openRole}
            modules={gridModules}
            modulesLoading={modulesLoading}
            modulesError={modulesError}
            focusAdmins={focusAdmins}
            onBack={closeEditor}
            onDelete={(r) => { dispatch(clearDeleteError()); setDeletingRole(r); }}
          />
        ) : (
          <>
            <div className="rb-panel-head">
              <div className="rb-tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'roles'} className={`rb-tab${tab === 'roles' ? ' active' : ''}`} onClick={() => setTab('roles')}>
                  Roles <span className="rb-panel-count">{roles.length}</span>
                </button>
                <button role="tab" aria-selected={tab === 'modules'} className={`rb-tab${tab === 'modules' ? ' active' : ''}`} onClick={() => setTab('modules')}>
                  Modules <span className="rb-panel-count">{modules.length}</span>
                </button>
              </div>
              <div className="rb-panel-head-actions">
                <button className="rb-create-btn" onClick={() => { dispatch(clearCreateError()); setShowCreate(true); }}>
                  <PlusIcon /> New role
                </button>
              </div>
            </div>
            {tab === 'roles' ? (
              <RolesTab roles={roles} loading={rolesLoading} error={rolesError}
                onOpen={(r) => openEditor(r)}
                onDelete={(r) => { dispatch(clearDeleteError()); setDeletingRole(r); }} />
            ) : (
              <ModulesTab modules={modules} loading={modulesLoading} error={modulesError}
                onEdit={(m) => { dispatch(clearUpdateModuleError()); setEditingModule(m); }}
                onDelete={(m) => { dispatch(clearDeleteModuleError()); setDeletingModuleItem(m); }} />
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateRoleModal roles={roles} modules={gridModules} modulesLoading={modulesLoading} modulesError={modulesError}
          creating={creating} createError={createError}
          onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}
      {deletingRole && (
        <DeleteRoleModal role={deletingRole} deleting={deleting} deleteError={deleteError}
          onClose={() => setDeletingRole(null)} onConfirm={handleDelete}
          onShowAdmins={(r) => { setDeletingRole(null); openEditor(r, { admins: true }); }} />
      )}
      {editingModule && (
        <EditModuleModal module={editingModule} busy={updatingModule} error={updateModuleError}
          onClose={() => setEditingModule(null)} onSubmit={handleUpdateModule} />
      )}
      {deletingModuleItem && (
        <DeleteModuleModal module={deletingModuleItem} busy={deletingModule} error={deleteModuleError}
          onClose={() => setDeletingModuleItem(null)} onConfirm={handleDeleteModule} />
      )}
    </div>
  );
}
