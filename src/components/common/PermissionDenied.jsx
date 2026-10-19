import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PERMISSION_DENIED_EVENT } from '../../services/permissionErrors';
import './PermissionDenied.css';

const LockIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const FALLBACK_MESSAGE = "You don't have permission to do this.";

/*
 * The one app-wide "no permission" pop-up (Roles & Permissions build guide B2). Mounted once in
 * App.jsx; request() raises it for every refused action. Fixed title, the backend's message, a
 * fixed second line, one OK button — nothing else. A burst of refused calls shows one pop-up.
 */
export function PermissionDeniedDialog() {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const onDenied = (e) => setMessage((cur) => cur ?? (e.detail?.message || FALLBACK_MESSAGE));
    window.addEventListener(PERMISSION_DENIED_EVENT, onDenied);
    return () => window.removeEventListener(PERMISSION_DENIED_EVENT, onDenied);
  }, []);

  useEffect(() => {
    if (!message) return;
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') setMessage(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [message]);

  if (!message) return null;

  return createPortal(
    <div className="pd-overlay" role="presentation">
      <div className="pd-modal" role="alertdialog" aria-modal="true" aria-labelledby="pd-title" aria-describedby="pd-body">
        <div className="pd-title" id="pd-title"><span className="pd-lock"><LockIcon /></span> You don't have permission</div>
        <div className="pd-body" id="pd-body">
          <p>{message}</p>
          <p>Ask a superadmin to update your role.</p>
        </div>
        <div className="pd-actions">
          <button type="button" className="pd-ok" onClick={() => setMessage(null)} autoFocus>OK</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/*
 * Inline locked empty state for a page or panel whose GET was refused (guide B2/B3). No pop-up,
 * no redirect — the sidebar entry stays and the content area explains why it's empty.
 */
export function AccessDenied({ message, compact = false }) {
  return (
    <div className={`pd-empty${compact ? ' compact' : ''}`} role="status">
      <span className="pd-empty-icon"><LockIcon size={compact ? 18 : 26} /></span>
      <div className="pd-empty-msg">{message || "You don't have permission to view this."}</div>
      <div className="pd-empty-hint">Ask a superadmin to update your role.</div>
    </div>
  );
}
