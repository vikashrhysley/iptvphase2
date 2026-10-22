// Shared labels, formatters and hooks for the Get Help Support Console (§24).
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { isPermissionDenied } from '../../services/permissionErrors';

export const SUPPORT_TABS = [
  { id: 'queue',     label: 'Inbox' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'templates', label: 'Templates' },
  { id: 'settings',  label: 'Settings' },
];

/* ── Vocabulary ─────────────────────────────────────────── */
export const STATUS_META = {
  new:           { label: 'New',           tone: 'blue' },
  open:          { label: 'Open',          tone: 'cyan' },
  in_progress:   { label: 'In progress',   tone: 'violet' },
  awaiting_user: { label: 'Awaiting user', tone: 'amber' },
  on_hold:       { label: 'On hold',       tone: 'slate' },
  resolved:      { label: 'Resolved',      tone: 'green' },
  closed:        { label: 'Closed',        tone: 'muted' },
  reopened:      { label: 'Reopened',      tone: 'orange' },
};
export const STATUS_ORDER = ['new', 'open', 'in_progress', 'awaiting_user', 'on_hold', 'resolved', 'closed', 'reopened'];
// Statuses an admin can pick in bulk (the backend validates each ticket's own transition).
export const BULK_STATUSES = ['open', 'in_progress', 'awaiting_user', 'on_hold', 'resolved'];

export const PRIORITY_META = {
  urgent: { label: 'Urgent', tone: 'red' },
  high:   { label: 'High',   tone: 'orange' },
  medium: { label: 'Medium', tone: 'blue' },
  low:    { label: 'Low',    tone: 'slate' },
};
export const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

export const TYPE_META = {
  contact_us:            { label: 'Contact us' },
  device_recovery:       { label: 'Device recovery' },
  account_recovery:      { label: 'Account recovery' },
  device_limit_increase: { label: 'Device limit' },
};
export const TYPE_ORDER = ['contact_us', 'device_recovery', 'account_recovery', 'device_limit_increase'];
export const DECIDABLE_TYPES = new Set(['device_recovery', 'account_recovery', 'device_limit_increase']);

// Admin-settable codes; approved / rejected are set only by Approve / Reject.
export const RESOLUTION_CODES = [
  { value: 'fixed',        label: 'Fixed',        hint: 'The issue was solved.' },
  { value: 'duplicate',    label: 'Duplicate',    hint: 'Already handled in another ticket.' },
  { value: 'no_response',  label: 'No response',  hint: 'The user never got back to us.' },
  { value: 'not_an_issue', label: 'Not an issue', hint: 'Working as intended.' },
  { value: 'other',        label: 'Other',        hint: 'Anything else.' },
];
export const RESOLUTION_LABELS = {
  ...Object.fromEntries(RESOLUTION_CODES.map((r) => [r.value, r.label])),
  approved: 'Approved',
  rejected: 'Rejected',
};

export const SLA_META = {
  on_track: { label: 'On track', tone: 'green' },
  at_risk:  { label: 'At risk',  tone: 'amber' },
  breached: { label: 'Breached', tone: 'red' },
  paused:   { label: 'Paused',   tone: 'slate' },
  met:      { label: 'Met',      tone: 'green' },
};

export const SAVED_VIEWS = [
  { id: 'all_open',       label: 'All open',          countKey: 'open',           icon: 'inbox' },
  { id: 'mine',           label: 'My tickets',        countKey: 'mine',           icon: 'user' },
  { id: 'unassigned',     label: 'Unassigned',        countKey: 'unassigned',     icon: 'userPlus' },
  { id: 'awaiting_user',  label: 'Awaiting user',     countKey: 'awaiting_user',  icon: 'hourglass' },
  { id: 'on_hold',        label: 'On hold',           countKey: 'on_hold',        icon: 'pause' },
  { id: 'sla_breached',   label: 'SLA breached',      countKey: 'sla_breached',   icon: 'alert', alert: true },
  { id: 'recovery',       label: 'Recovery requests', icon: 'shield' },
  { id: 'resolved_today', label: 'Resolved today',    countKey: 'resolved_today', icon: 'check' },
  { id: 'resolved',       label: 'Resolved',          icon: 'checkCircle' },
  { id: 'closed',         label: 'Closed',            icon: 'archive' },
];

export const SORT_OPTIONS = [
  { value: 'last_activity', label: 'Last activity' },
  { value: 'created_at',    label: 'Newest first' },
  { value: 'oldest',        label: 'Oldest first' },
  { value: 'priority',      label: 'Priority' },
  { value: 'sla_due',       label: 'SLA due soonest' },
];

export const CATEGORY_SUGGESTIONS = ['billing', 'technical', 'account', 'general', 'feedback', 'other'];
export const PLACEHOLDERS = ['{{user_name}}', '{{ticket_number}}', '{{device_name}}', '{{license_plan}}'];
export const PLACEHOLDER_SAMPLES = {
  '{{user_name}}': 'Jane Doe',
  '{{ticket_number}}': 'HLP-2026-000123',
  '{{device_name}}': 'Living Room TV',
  '{{license_plan}}': 'Premium',
};

export const ATTACHMENT_EXTS = ['png', 'jpg', 'jpeg', 'pdf', 'txt', 'log'];
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_FILES = 5;
// Signed attachment links expire after 10 minutes — refresh the thread a little before that.
export const ATTACHMENT_LINK_TTL_MS = 9 * 60 * 1000;

/* ── Labels ─────────────────────────────────────────────── */
export const humanize = (s) => {
  if (!s) return '';
  return String(s).replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^\w/, (c) => c.toUpperCase());
};
export const statusLabel   = (s) => STATUS_META[s]?.label || humanize(s) || '—';
export const priorityLabel = (p) => PRIORITY_META[p]?.label || humanize(p) || '—';
export const typeLabel     = (t) => TYPE_META[t]?.label || humanize(t) || '—';
export const resolutionLabel = (c) => RESOLUTION_LABELS[c] || humanize(c) || '—';

// "support.status_changed" → "Status changed"
export const auditActionLabel = (action) => humanize(String(action || '').replace(/^support\./, ''));

export const initialsFor = (name) => {
  const parts = String(name || '').trim().split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
};

/* ── Time ───────────────────────────────────────────────── */
export const toMs = (iso) => {
  if (!iso) return NaN;
  return new Date(iso).getTime();
};

export const relTime = (iso, now = Date.now()) => {
  const then = toMs(iso);
  if (Number.isNaN(then)) return '—';
  const s = Math.floor((now - then) / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
};

export const fmtDate = (iso) => {
  const t = toMs(iso);
  if (Number.isNaN(t)) return '—';
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (iso) => {
  const t = toMs(iso);
  if (Number.isNaN(t)) return '—';
  return new Date(t).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const fmtTime = (iso) => {
  const t = toMs(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

// Day separator label for the conversation thread.
export const dayLabel = (iso, now = Date.now()) => {
  const t = toMs(iso);
  if (Number.isNaN(t)) return '';
  const d = new Date(t); d.setHours(0, 0, 0, 0);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

// 135 min → "2h 15m"; 3000 min → "2d 2h"
export const fmtDuration = (ms) => {
  if (ms == null || Number.isNaN(ms)) return '—';
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  if (totalMin < 1) return '<1m';
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
};
export const fmtMinutes = (min) => (min == null || Number.isNaN(Number(min)) ? '—' : fmtDuration(Number(min) * 60_000));

export const fmtBytes = (n) => {
  const b = Number(n);
  if (!b && b !== 0) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(b < 10 * 1024 ? 1 : 0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

export const fmtPct = (v) => {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return `${n % 1 === 0 ? n : n.toFixed(1)}%`;
};

export const fmtNum = (v) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString());

// SLA chip: state comes from the server; the countdown is computed against `now`.
export const slaInfo = (sla, now = Date.now()) => {
  const state = sla?.state;
  if (!state) return { tone: 'muted', label: '—', title: 'No SLA' };
  const due = toMs(sla.due_at);
  const dueText = Number.isNaN(due) ? '' : `Due ${fmtDateTime(sla.due_at)}`;
  if (state === 'paused') return { tone: 'slate', label: 'Paused', title: `SLA clock paused (awaiting user / on hold). ${dueText}`.trim(), state };
  if (state === 'met') return { tone: 'green', label: 'Met', title: 'SLA met', state };
  if (Number.isNaN(due)) return { tone: SLA_META[state]?.tone || 'muted', label: SLA_META[state]?.label || humanize(state), title: '', state };
  const diff = due - now;
  if (state === 'breached' || diff < 0) {
    return { tone: 'red', label: `Overdue ${fmtDuration(Math.abs(diff))}`, title: `SLA breached. ${dueText}`, state: 'breached' };
  }
  return {
    tone: state === 'at_risk' ? 'amber' : 'green',
    label: `${fmtDuration(diff)} left`,
    title: `${SLA_META[state]?.label || humanize(state)}. ${dueText}`,
    state,
  };
};

/* ── Errors ─────────────────────────────────────────────── */
export const isConflict = (err) => err?.status === 409 || err?.code === 'SUPPORT_TICKET_CONFLICT';

// The generic 409 text from request() reads "already exists" — wrong for a stale ticket.
export const conflictMessage = (err) => {
  const msg = err?.message || '';
  if (msg && !/^Conflict —/.test(msg)) return msg;
  return 'This ticket changed since you opened it.';
};

// Returns the message to toast, or null when the global permission pop-up already handled it.
export const actionErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (isPermissionDenied(err)) return null;
  if (isConflict(err)) return `${conflictMessage(err)} Showing the latest version.`;
  return err?.message || fallback;
};

/* ── HTML ───────────────────────────────────────────────── */
export const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const looksLikeHtml = (s) => /<\/?(p|br|div|ul|ol|li|strong|b|em|i|a|span)\b/i.test(String(s || ''));

// Plain text (templates, notes) → minimal HTML for the reply editor.
export const textToHtml = (s) => (looksLikeHtml(s)
  ? String(s)
  : escapeHtml(s).split(/\n{2,}/).map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`).join(''));

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE',
  'CODE', 'PRE', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH',
]);
const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH', 'HEAD', 'TITLE', 'META', 'LINK', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT']);

// The backend sanitizes message HTML; this allow-list pass is defense in depth before rendering.
export const sanitizeHtml = (html) => {
  if (!html || typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const out = document.createElement('div');
  const walk = (src, dest) => {
    src.childNodes.forEach((node) => {
      if (node.nodeType === 3) { dest.appendChild(document.createTextNode(node.textContent)); return; }
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toUpperCase();
      if (DROP_WITH_CONTENT.has(tag)) return;
      if (!ALLOWED_TAGS.has(tag)) { walk(node, dest); return; }
      const el = document.createElement(tag.toLowerCase());
      if (tag === 'A') {
        const href = (node.getAttribute('href') || '').trim();
        if (/^(https?:|mailto:)/i.test(href)) {
          el.setAttribute('href', href);
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer nofollow');
        }
      }
      walk(node, el);
      dest.appendChild(el);
    });
  };
  walk(doc.body.firstChild || doc.body, out);
  return out.innerHTML;
};

/* ── Misc ───────────────────────────────────────────────── */
export const newIdempotencyKey = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* fall through */ }
  return `gh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

export const fileExt = (name) => String(name || '').split('.').pop().toLowerCase();

// Analytics breakdowns arrive either as { key: count } maps or [{ key|status|…, count|value }] rows.
export const normalizeBreakdown = (val, labeler = humanize) => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((r) => {
      if (r == null || typeof r !== 'object') return null;
      const key = r.key ?? r.status ?? r.priority ?? r.ticket_type ?? r.type ?? r.reason ?? r.code
        ?? r.resolution_code ?? r.category ?? r.name ?? r.title ?? r.id ?? '';
      const count = Number(r.count ?? r.value ?? r.total ?? r.usage_count ?? r.uses ?? 0);
      const label = r.label ?? r.reason_label ?? r.title ?? r.name ?? labeler(key);
      return { key: String(key), label: label || '—', count: Number.isNaN(count) ? 0 : count };
    }).filter(Boolean);
  }
  if (typeof val === 'object') {
    return Object.entries(val).map(([key, count]) => ({
      key, label: labeler(key), count: Number(typeof count === 'object' ? (count?.count ?? 0) : count) || 0,
    }));
  }
  return [];
};

export const copyText = (text, what = 'Copied') => {
  if (!text) return;
  navigator.clipboard?.writeText(String(text))
    .then(() => toast.success(what))
    .catch(() => toast.error('Could not copy to the clipboard'));
};

// Open another portal page (optionally a record) through AppLayout's navigation intent.
export const navigateTo = (detail) => {
  window.dispatchEvent(new CustomEvent('app:navigate', { detail }));
};

/* ── Hooks ──────────────────────────────────────────────── */
// A clock that re-renders the caller every `intervalMs` (SLA countdowns, relative times).
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// Runs `callback` every `ms` while the tab is visible (paused on hidden tabs, like the bell polling).
export function useVisibleInterval(callback, ms, enabled = true) {
  const saved = useRef(callback);
  useEffect(() => { saved.current = callback; }, [callback]);
  useEffect(() => {
    if (!enabled) return undefined;
    let id = null;
    const start = () => { if (!id) id = setInterval(() => saved.current?.(), ms); };
    const stop = () => { clearInterval(id); id = null; };
    const onVis = () => {
      if (document.visibilityState === 'hidden') stop();
      else { saved.current?.(); start(); }
    };
    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); stop(); };
  }, [ms, enabled]);
}

// Closes a popover on outside click / Escape.
export function useDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, onClose]);
}

// Tracks an element's width (charts render at real pixel size so text never stretches).
// Returns a callback ref, so an element that re-mounts (chart ↔ table toggle) is re-observed.
export function useElementWidth() {
  const [node, setNode] = useState(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0]?.contentRect?.width || 0);
      setWidth((prev) => (prev === w ? prev : w));
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  return [setNode, width];
}
