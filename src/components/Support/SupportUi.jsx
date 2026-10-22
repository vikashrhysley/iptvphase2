// Small building blocks shared by every Get Help view (badges, menus, dialogs, empty states).
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PRIORITY_META, STATUS_META, TYPE_META,
  priorityLabel, statusLabel, typeLabel, slaInfo, initialsFor, useDismiss,
} from './supportUtils';
import {
  AlertOctagonIcon, CheckIcon, ClockIcon, KeyIcon, MailIcon, MonitorIcon, PauseIcon, PhoneIcon, XIcon,
} from './SupportIcons';

export function Badge({ tone = 'muted', dot = false, icon, children, className = '', title }) {
  return (
    <span className={`gh-badge tone-${tone}${className ? ` ${className}` : ''}`} title={title}>
      {dot && <span className="gh-badge-dot" />}
      {icon}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_META[status]?.tone || 'muted'} dot>{statusLabel(status)}</Badge>;
}

// Signal-strength bars read faster than colour alone (urgent = 4 bars … low = 1).
const PRIORITY_LEVEL = { urgent: 4, high: 3, medium: 2, low: 1 };
export function PriorityBars({ priority }) {
  const level = PRIORITY_LEVEL[priority] || 0;
  return (
    <svg className="gh-pri-bars" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 3} y={9 - i * 3} width="2" height={3 + i * 3} rx="0.8"
          fill="currentColor" opacity={i < level ? 1 : 0.22} />
      ))}
    </svg>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <Badge tone={PRIORITY_META[priority]?.tone || 'muted'} icon={<PriorityBars priority={priority} />}>
      {priorityLabel(priority)}
    </Badge>
  );
}

const TYPE_ICONS = {
  contact_us: MailIcon,
  device_recovery: MonitorIcon,
  account_recovery: KeyIcon,
  device_limit_increase: PhoneIcon,
};
export function TypeBadge({ type }) {
  const Icon = TYPE_ICONS[type];
  return (
    <span className="gh-type" title={TYPE_META[type]?.label || type}>
      {Icon && <Icon size={13} />}
      {typeLabel(type)}
    </span>
  );
}

export function SlaChip({ sla, now, compact = false }) {
  const info = slaInfo(sla, now);
  if (info.label === '—') return <span className="gh-muted">—</span>;
  const Icon = info.state === 'paused' ? PauseIcon
    : info.state === 'met' ? CheckIcon
    : info.state === 'breached' ? AlertOctagonIcon
    : ClockIcon;
  return (
    <span className={`gh-sla tone-${info.tone}${compact ? ' compact' : ''}`} title={info.title}>
      <Icon size={12} strokeWidth={2.4} />
      {info.label}
    </span>
  );
}

const AVATAR_TONES = ['blue', 'violet', 'cyan', 'green', 'orange', 'amber'];
export function Avatar({ name, size = 28, tone, className = '' }) {
  const label = initialsFor(name);
  const hash = String(name || '').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const t = tone || AVATAR_TONES[hash % AVATAR_TONES.length];
  return (
    <span
      className={`gh-avatar tone-${t}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

export function Spinner({ size = 14 }) {
  return <span className="gh-spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}

/* ── Popover menu ───────────────────────────────────────── */
export function Menu({ trigger, children, align = 'left', placement = 'bottom', width, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));
  const close = () => setOpen(false);
  return (
    <div className={`gh-menu${className ? ` ${className}` : ''}`} ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o), close })}
      {open && (
        <div className={`gh-menu-pop align-${align} place-${placement}`} style={width ? { width } : undefined} role="menu">
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ onSelect, children, icon, hint, active = false, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`gh-menu-item${active ? ' active' : ''}${danger ? ' danger' : ''}`}
      onClick={onSelect}
      disabled={disabled}
    >
      {icon && <span className="gh-menu-icon">{icon}</span>}
      <span className="gh-menu-text">
        <span>{children}</span>
        {hint && <small>{hint}</small>}
      </span>
      {active && <CheckIcon size={13} className="gh-menu-check" />}
    </button>
  );
}

export const MenuLabel = ({ children }) => <div className="gh-menu-label">{children}</div>;
export const MenuDivider = () => <div className="gh-menu-divider" />;

/* ── Dialog ─────────────────────────────────────────────── */
export function Modal({ title, subtitle, icon, tone = 'blue', onClose, children, footer, width = 520, busy = false }) {
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) closeRef.current?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy]);

  return createPortal(
    <div className="gh-scope gh-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="gh-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ maxWidth: width }}>
        <div className="gh-modal-head">
          {icon && <span className={`gh-modal-icon tone-${tone}`}>{icon}</span>}
          <div className="gh-modal-titles">
            <h3 id={titleId}>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="gh-icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
            <XIcon size={15} />
          </button>
        </div>
        <div className="gh-modal-body">{children}</div>
        {footer && <div className="gh-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Field({ label, hint, error, required = false, counter, children, htmlFor }) {
  return (
    <div className={`gh-field${error ? ' has-error' : ''}`}>
      {(label || counter) && (
        <div className="gh-field-top">
          {label && <label htmlFor={htmlFor}>{label}{required && <span className="gh-req"> *</span>}</label>}
          {counter && <span className="gh-counter">{counter}</span>}
        </div>
      )}
      {children}
      {error ? <div className="gh-field-error">{error}</div> : hint ? <div className="gh-field-hint">{hint}</div> : null}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled = false, hint }) {
  return (
    <label className={`gh-switch${disabled ? ' disabled' : ''}`}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="gh-switch-track"><span className="gh-switch-thumb" /></span>
      {(label || hint) && (
        <span className="gh-switch-text">
          {label && <span>{label}</span>}
          {hint && <small>{hint}</small>}
        </span>
      )}
    </label>
  );
}

export function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="gh-empty">
      {icon && <span className="gh-empty-icon">{icon}</span>}
      <div className="gh-empty-title">{title}</div>
      {hint && <div className="gh-empty-hint">{hint}</div>}
      {action}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="gh-error-banner" role="alert">
      <AlertOctagonIcon size={16} />
      <span>{message}</span>
      {onRetry && <button type="button" className="gh-link-btn" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function SkeletonLines({ rows = 6, height = 44 }) {
  return (
    <div className="gh-skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="gh-skeleton" style={{ height, animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}
