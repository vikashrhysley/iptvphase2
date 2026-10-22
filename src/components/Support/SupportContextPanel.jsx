// Get Help — the 360° context panel next to the conversation, plus the ticket activity timeline.
import { useEffect, useState } from 'react';
import { apiFetchSupportTicketAudit } from '../../services/api';
import { isPermissionDenied } from '../../services/permissionErrors';
import { AccessDenied } from '../common/PermissionDenied';
import {
  auditActionLabel, copyText, fmtDate, fmtDateTime, humanize, navigateTo, priorityLabel, relTime,
  resolutionLabel, statusLabel,
} from './supportUtils';
import { Avatar, Badge, EmptyState, ErrorBanner, SkeletonLines, StatusBadge } from './SupportUi';
import {
  CardIcon, ClockIcon, CopyIcon, ExternalIcon, HistoryIcon, InfoIcon, KeyIcon, LinkedIcon, MessageIcon,
  MonitorIcon, UserIcon,
} from './SupportIcons';

const accountTone = (s) => ({ active: 'green', blocked: 'red', suspended: 'red', disabled: 'slate', deleted: 'slate', pending: 'amber' }[s] || 'muted');
const licenseTone = (s, isActive) => (isActive || s === 'active' ? 'green' : ({ blocked: 'red', revoked: 'red', expired: 'amber', grace: 'amber', trial: 'blue' }[s] || 'muted'));
const deviceTone = (s) => ({ normal: 'green', active: 'green', blocked: 'red', lost: 'amber', replaced: 'slate', revoked: 'red' }[s] || 'muted');
const requestTone = (s) => ({ pending: 'amber', completed: 'green', approved: 'green', rejected: 'red', failed: 'red' }[s] || 'muted');

const hasData = (obj) => !!obj && typeof obj === 'object' && Object.keys(obj).length > 0;

function Section({ icon, title, extra, children }) {
  return (
    <section className="gh-ctx-section">
      <header>
        <span className="gh-ctx-icon">{icon}</span>
        <h4>{title}</h4>
        {extra && <span className="gh-ctx-extra">{extra}</span>}
      </header>
      {children}
    </section>
  );
}

function KV({ label, children, mono = false }) {
  const empty = children == null || children === '' || children === '—';
  return (
    <div className="gh-kv">
      <span>{label}</span>
      <strong className={`${mono ? 'gh-mono' : ''}${empty ? ' gh-muted' : ''}`}>{empty ? '—' : children}</strong>
    </div>
  );
}

const openDevice = (deviceId) => {
  try { sessionStorage.setItem('deviceDetailId', deviceId); } catch { /* storage unavailable */ }
  navigateTo({ page: 'device' });
};

function CustomerContext({ ticket, now, onOpenTicket }) {
  const ctx = ticket.context || {};
  const user = hasData(ctx.user) ? ctx.user : null;
  const license = hasData(ctx.license) ? ctx.license : null;
  const sub = hasData(ctx.subscription) ? ctx.subscription : null;
  const devices = Array.isArray(ctx.devices) ? ctx.devices : [];
  const linked = hasData(ctx.linked_request) ? ctx.linked_request : null;
  const previous = ctx.previous_tickets || {};
  const prevItems = Array.isArray(previous.items) ? previous.items : [];
  const activity = Array.isArray(ctx.recent_activity) ? ctx.recent_activity : [];
  const sla = ticket.sla_targets || {};

  const name = user?.name || ticket.user?.name || ticket.contact_email || 'Unknown requester';
  const email = user?.email || ticket.user?.email || ticket.contact_email;
  const phone = user?.phone || ticket.phone;
  const used = Number(license?.devices_used ?? 0);
  const max = Number(license?.max_devices ?? 0);
  const usagePct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const linkedDevice = linked?.old_device_id ? devices.find((d) => String(d.id) === String(linked.old_device_id)) : null;

  return (
    <div className="gh-ctx">
      <Section
        icon={<UserIcon size={14} />}
        title="Requester"
        extra={user?.id && (
          <button type="button" className="gh-link-btn" onClick={() => navigateTo({ page: 'app_users', userId: user.id })}>
            View user <ExternalIcon size={11} />
          </button>
        )}
      >
        <div className="gh-ctx-person">
          <Avatar name={name} size={40} />
          <div className="gh-ctx-person-text">
            <div className="gh-ctx-name">{name}</div>
            {email && (
              <button type="button" className="gh-copy" onClick={() => copyText(email, 'Email copied')} title="Copy email">
                <span>{email}</span><CopyIcon size={11} />
              </button>
            )}
          </div>
        </div>
        {user ? (
          <div className="gh-kv-grid">
            <KV label="Account">{user.status && <Badge tone={accountTone(user.status)} dot>{humanize(user.status)}</Badge>}</KV>
            <KV label="Risk score">{user.risk_score != null ? String(user.risk_score) : null}</KV>
            <KV label="Registered">{user.registered_at ? fmtDate(user.registered_at) : null}</KV>
            <KV label="Last login">{user.last_login_at ? relTime(user.last_login_at, now) : null}</KV>
            {phone && <KV label="Phone">{phone}</KV>}
          </div>
        ) : (
          <div className="gh-ctx-note">
            <InfoIcon size={13} />
            <span>No linked account — raised before login and matched by contact email.{phone ? ` Phone: ${phone}` : ''}</span>
          </div>
        )}
      </Section>

      <Section icon={<ClockIcon size={14} />} title="Ticket & SLA">
        <div className="gh-kv-grid">
          <KV label="Opened">{fmtDateTime(ticket.created_at)}</KV>
          <KV label="Priority">{priorityLabel(ticket.priority)}</KV>
          {sla.first_response_at
            ? <KV label="First response">{fmtDateTime(sla.first_response_at)}</KV>
            : <KV label="First response due">{sla.first_response_due_at ? fmtDateTime(sla.first_response_due_at) : null}</KV>}
          <KV label="Resolution due">{sla.resolution_due_at ? fmtDateTime(sla.resolution_due_at) : null}</KV>
          {sla.paused_since && <KV label="SLA paused since">{fmtDateTime(sla.paused_since)}</KV>}
          {ticket.reopened_count > 0 && <KV label="Reopened">{`${ticket.reopened_count}×`}</KV>}
          {ticket.resolved_at && <KV label="Resolved">{fmtDateTime(ticket.resolved_at)}</KV>}
          {ticket.resolution_code && <KV label="Resolution">{resolutionLabel(ticket.resolution_code)}</KV>}
          {ticket.closed_at && <KV label="Closed">{fmtDateTime(ticket.closed_at)}</KV>}
        </div>
        {ticket.parent_ticket_number && (
          <button type="button" className="gh-ctx-link" onClick={() => onOpenTicket(ticket.parent_ticket_number)}>
            <LinkedIcon size={13} /> Follow-up of <span className="gh-mono">{ticket.parent_ticket_number}</span>
          </button>
        )}
      </Section>

      {license && (
        <Section
          icon={<KeyIcon size={14} />}
          title="License"
          extra={license.status && <Badge tone={licenseTone(license.status, license.is_active)} dot>{humanize(license.status)}</Badge>}
        >
          <div className="gh-ctx-plan">
            <strong>{license.plan_name || 'Plan'}</strong>
            <span>{[humanize(license.plan_type), humanize(license.billing_cycle)].filter(Boolean).join(' · ')}</span>
          </div>
          {max > 0 && (
            <div className="gh-meter" title={`${used} of ${max} devices in use`}>
              <div className="gh-meter-top">
                <span>Devices</span>
                <strong>{used} / {max}</strong>
              </div>
              <div className="gh-meter-track">
                <div className={`gh-meter-fill${usagePct >= 100 ? ' full' : ''}`} style={{ width: `${usagePct}%` }} />
              </div>
            </div>
          )}
          <div className="gh-kv-grid">
            <KV label="Expires">{license.expires_at ? fmtDate(license.expires_at) : null}</KV>
          </div>
        </Section>
      )}

      {sub && (
        <Section
          icon={<CardIcon size={14} />}
          title="Subscription"
          extra={sub.status && <Badge tone={accountTone(sub.status)} dot>{humanize(sub.status)}</Badge>}
        >
          <div className="gh-kv-grid">
            <KV label="Plan">{[humanize(sub.plan_type), humanize(sub.billing_cycle)].filter(Boolean).join(' · ')}</KV>
            <KV label="Renews">{sub.current_period_end ? fmtDate(sub.current_period_end) : null}</KV>
            <KV label="Auto-renew">{sub.auto_renew == null ? null : (sub.auto_renew ? 'On' : 'Off')}</KV>
            <KV label="Last payment">{sub.last_payment_at ? fmtDate(sub.last_payment_at) : null}</KV>
          </div>
        </Section>
      )}

      {devices.length > 0 && (
        <Section icon={<MonitorIcon size={14} />} title={`Devices (${devices.length})`}>
          <ul className="gh-ctx-list">
            {devices.map((d) => (
              <li key={d.id}>
                <button type="button" className="gh-ctx-row" onClick={() => openDevice(d.id)} title="Open in Devices">
                  <span className={`gh-online${d.is_logged_in ? ' on' : ''}`} title={d.is_logged_in ? 'Signed in' : 'Signed out'} />
                  <span className="gh-ctx-row-main">
                    <span className="gh-ctx-row-title">{d.name || d.id}</span>
                    <span className="gh-sub">{humanize(d.platform) || 'Device'} · seen {relTime(d.last_seen_at, now)}</span>
                  </span>
                  <Badge tone={deviceTone(d.status)}>{humanize(d.status)}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {linked && (
        <Section
          icon={<LinkedIcon size={14} />}
          title="Linked request"
          extra={linked.status && <Badge tone={requestTone(linked.status)} dot>{humanize(linked.status)}</Badge>}
        >
          <div className="gh-kv-grid">
            <KV label="Kind">{humanize(linked.kind)}</KV>
            <KV label="Request" mono>{linked.id}</KV>
            <KV label="Reason">{humanize(linked.reason)}</KV>
            {linked.old_device_id && (
              <KV label="Device">{linkedDevice?.name || <span className="gh-mono">{linked.old_device_id}</span>}</KV>
            )}
          </div>
        </Section>
      )}

      <Section icon={<MessageIcon size={14} />} title={`Previous tickets (${previous.total ?? prevItems.length})`}>
        {prevItems.length ? (
          <ul className="gh-ctx-list">
            {prevItems.map((p) => (
              <li key={p.ticket_number}>
                <button type="button" className="gh-ctx-row" onClick={() => onOpenTicket(p.ticket_number)}>
                  <span className="gh-ctx-row-main">
                    <span className="gh-ctx-row-title"><span className="gh-mono">{p.ticket_number}</span></span>
                    <span className="gh-sub">{p.subject || '(no subject)'} · {fmtDate(p.created_at)}</span>
                  </span>
                  <StatusBadge status={p.status} />
                </button>
              </li>
            ))}
          </ul>
        ) : <div className="gh-ctx-empty">No earlier tickets from this requester.</div>}
      </Section>

      {activity.length > 0 && (
        <Section icon={<HistoryIcon size={14} />} title="Recent account activity">
          <ul className="gh-mini-timeline">
            {activity.map((a, i) => (
              <li key={a.id || i}>
                <span className="gh-mini-dot" />
                <div>
                  <div className="gh-mini-title">{humanize(a.action)}</div>
                  {a.notes && <div className="gh-sub">{a.notes}</div>}
                  <div className="gh-sub" title={fmtDateTime(a.created_at)}>{humanize(a.entity_type)} · {relTime(a.created_at, now)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

const formatAuditValue = (key, v) => {
  if (v == null || v === '') return '—';
  if (key === 'status') return statusLabel(v);
  if (key === 'priority') return priorityLabel(v);
  if (key === 'resolution_code') return resolutionLabel(v);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const auditTone = (action = '') => {
  if (/approved|reply_sent|resolved/.test(action)) return 'green';
  if (/rejected|failed|unverified/.test(action)) return 'red';
  if (/note|mention/.test(action)) return 'amber';
  if (/assigned/.test(action)) return 'violet';
  return 'blue';
};

function TicketActivity({ accessToken, ticketNumber, version, now }) {
  const [state, setState] = useState({ items: [], loading: true, error: null });

  useEffect(() => {
    let alive = true;
    apiFetchSupportTicketAudit(accessToken, ticketNumber)
      .then((items) => { if (alive) setState({ items, loading: false, error: null }); })
      .catch((error) => { if (alive) setState((s) => ({ ...s, loading: false, error })); });
    return () => { alive = false; };
  }, [accessToken, ticketNumber, version]);

  if (state.loading && !state.items.length) return <SkeletonLines rows={5} height={54} />;
  if (state.error && isPermissionDenied(state.error)) return <AccessDenied message={state.error.message} compact />;
  if (state.error) return <ErrorBanner message={state.error.message || 'Could not load the activity log.'} />;
  if (!state.items.length) return <EmptyState icon={<HistoryIcon size={22} />} title="No activity yet" />;

  return (
    <ol className="gh-timeline">
      {state.items.map((a, i) => {
        const after = a.after && typeof a.after === 'object' ? a.after : {};
        const before = a.before && typeof a.before === 'object' ? a.before : {};
        const keys = Object.keys(after).filter((k) => k !== 'version');
        return (
          <li key={a.id || i} className={`tone-${auditTone(a.action)}`}>
            <span className="gh-timeline-dot" />
            <div className="gh-timeline-body">
              <div className="gh-timeline-head">
                <strong>{auditActionLabel(a.action)}</strong>
                <span title={fmtDateTime(a.created_at)}>{relTime(a.created_at, now)}</span>
              </div>
              <div className="gh-sub">by {a.acted_by_name || 'System'}{a.ip_address ? ` · ${a.ip_address}` : ''}</div>
              {keys.length > 0 && (
                <div className="gh-diff">
                  {keys.map((k) => (
                    <div key={k}>
                      <span className="gh-diff-key">{humanize(k)}</span>
                      {k in before && <><span className="gh-diff-old">{formatAuditValue(k, before[k])}</span><span className="gh-diff-arrow">→</span></>}
                      <span className="gh-diff-new">{formatAuditValue(k, after[k])}</span>
                    </div>
                  ))}
                </div>
              )}
              {a.notes && <div className="gh-timeline-notes">{a.notes}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function SupportContextPanel({ ticket, accessToken, now, onOpenTicket }) {
  const [tab, setTab] = useState('customer');
  return (
    <aside className="gh-card gh-context" aria-label="Ticket context">
      <div className="gh-seg gh-context-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'customer'} className={tab === 'customer' ? 'active' : ''} onClick={() => setTab('customer')}>
          <UserIcon size={13} /> Customer
        </button>
        <button type="button" role="tab" aria-selected={tab === 'activity'} className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>
          <HistoryIcon size={13} /> Activity
        </button>
      </div>
      <div className="gh-context-body">
        {tab === 'customer'
          ? <CustomerContext ticket={ticket} now={now} onOpenTicket={onOpenTicket} />
          : <TicketActivity accessToken={accessToken} ticketNumber={ticket.ticket_number} version={ticket.version} now={now} />}
      </div>
    </aside>
  );
}
