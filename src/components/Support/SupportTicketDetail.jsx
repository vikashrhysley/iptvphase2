// Get Help — ticket detail: header controls, conversation + composer, 360° context.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  fetchSupportAssignees, fetchSupportSummary, fetchSupportTickets, patchSupportTicketRow,
  setActiveSupportTicket,
} from '../../store/slices/supportSlice';
import {
  apiApproveSupportTicket, apiAssignSupportTicket, apiFetchSupportMessages, apiFetchSupportTicket,
  apiRejectSupportTicket, apiRetrySupportMessage, apiUpdateSupportPriority, apiUpdateSupportStatus,
  supportAttachmentHref,
} from '../../services/api';
import { isPermissionDenied } from '../../services/permissionErrors';
import { AccessDenied } from '../common/PermissionDenied';
import {
  ATTACHMENT_LINK_TTL_MS, DECIDABLE_TYPES, PRIORITY_META, PRIORITY_ORDER, STATUS_META,
  actionErrorMessage, copyText, fmtDateTime, humanize, isConflict, priorityLabel, relTime, resolutionLabel,
  statusLabel, typeLabel, useNow, useVisibleInterval,
} from './supportUtils';
import SupportThread from './SupportThread';
import SupportComposer from './SupportComposer';
import SupportContextPanel from './SupportContextPanel';
import { ApproveDialog, RejectDialog, ResolveDialog } from './SupportDialogs';
import {
  Avatar, Badge, EmptyState, Menu, MenuDivider, MenuItem, MenuLabel, PriorityBadge, PriorityBars,
  SkeletonLines, SlaChip, Spinner, StatusBadge, TypeBadge,
} from './SupportUi';
import {
  BanIcon, ChevronDownIcon, ChevronLeftIcon, CopyIcon, InfoIcon, LinkedIcon, RefreshIcon, ThumbUpIcon,
  UserIcon,
} from './SupportIcons';

const DECISION_HINTS = {
  device_recovery: 'The user asked us to unblock a device. Approve unblocks it and completes the recovery request; Reject keeps the block.',
  account_recovery: 'Account recovery request. Approve completes the linked request (no automatic account change); Reject marks it failed.',
  device_limit_increase: 'The user asked for a higher device limit. Approve lets you choose the new limit; Reject changes nothing.',
};

function ControlMenu({ label, value, disabled, busy, width = 230, children }) {
  return (
    <Menu
      width={width}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={`gh-control${open ? ' open' : ''}`}
          onClick={toggle}
          disabled={disabled || busy}
          aria-haspopup="menu"
        >
          <span className="gh-control-label">{label}</span>
          <span className="gh-control-value">
            {value}
            {busy ? <Spinner size={11} /> : <ChevronDownIcon size={11} />}
          </span>
        </button>
      )}
    >
      {children}
    </Menu>
  );
}

const approveToast = (type, res) => {
  if (type === 'device_recovery') {
    const base = res?.device_status ? `Approved — device ${res.device_status === 'normal' ? 'unblocked' : humanize(res.device_status).toLowerCase()}` : 'Approved — device unblocked';
    return res?.seat_available === false ? `${base}. No free device seat right now.` : base;
  }
  if (type === 'device_limit_increase') {
    return res?.max_devices != null
      ? `Approved — device limit ${res.previous_max_devices ?? '?'} → ${res.max_devices}`
      : 'Approved — device limit raised';
  }
  return 'Approved — recovery request completed';
};

export default function SupportTicketDetail({ ticketNumber }) {
  const dispatch = useDispatch();
  const accessToken = useSelector((s) => s.auth.accessToken);
  const assignees = useSelector((s) => s.support.assignees);
  const now = useNow(30_000);

  const [ticket, setTicket] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);            // which control is mid-request
  const [dialog, setDialog] = useState(null);        // 'resolve' | 'approve' | 'reject'
  const [threadFilter, setThreadFilter] = useState('all');
  const [retryingId, setRetryingId] = useState(null);

  const ticketRef = useRef(null);
  const fetchedAt = useRef(0);
  const messageCount = useRef(0);

  // State is only set in the promise callbacks, so the initial load from the effect below
  // never updates state synchronously.
  const load = useCallback(() => apiFetchSupportTicket(accessToken, ticketNumber)
    .then((data) => {
      ticketRef.current = data;
      fetchedAt.current = Date.now();
      messageCount.current = (data.messages || []).length;
      setTicket(data);
      setLoadError(null);
      dispatch(patchSupportTicketRow({
        ticket_number: ticketNumber,
        status: data.status,
        priority: data.priority,
        assignee: data.assignee ?? null,
        sla: data.sla,
        resolution_code: data.resolution_code,
        version: data.version,
      }));
      return data;
    })
    .catch((err) => {
      if (ticketRef.current) {
        const msg = actionErrorMessage(err, 'Could not refresh the ticket');
        if (msg && !isPermissionDenied(err)) toast.error(msg);
      } else {
        setLoadError(err);
      }
      return null;
    })
    .finally(() => setRefreshing(false)), [accessToken, ticketNumber, dispatch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { dispatch(fetchSupportAssignees()); }, [dispatch]);

  const refresh = () => {
    setRefreshing(true);
    if (!ticketRef.current) setLoadError(null);   // back to the skeleton while retrying
    load();
  };

  // Pick up user replies (in-app or email) while the ticket is open. The thread endpoint is
  // read-only; the full detail is re-fetched only when the thread actually grew.
  useVisibleInterval(async () => {
    if (!ticketRef.current) return;
    try {
      const messages = await apiFetchSupportMessages(accessToken, ticketNumber);
      if (messages.length !== messageCount.current) {
        await load();
        toast('New activity on this ticket — thread updated');
      } else {
        fetchedAt.current = Date.now();
        setTicket((t) => (t ? { ...t, messages } : t));
      }
    } catch { /* background refresh — the next tick retries */ }
  }, 45_000, !!ticket);

  const backToInbox = () => {
    dispatch(setActiveSupportTicket(null));
    dispatch(fetchSupportTickets());
    dispatch(fetchSupportSummary());
  };

  const openTicket = (no) => {
    if (!no || no === ticketNumber) return;
    dispatch(setActiveSupportTicket(no));
    window.scrollTo({ top: 0 });
  };

  // Every mutation: run → toast → reload the ticket + KPI counts. A 409 reloads so the admin
  // sees what changed before trying again.
  const mutate = async (key, fn, success) => {
    setBusy(key);
    try {
      const res = await fn();
      if (success) toast.success(typeof success === 'function' ? success(res) : success);
      await load();
      dispatch(fetchSupportSummary());
      return res ?? true;
    } catch (err) {
      const msg = actionErrorMessage(err);
      if (msg) toast.error(msg);
      if (isConflict(err)) await load();
      return null;
    } finally {
      setBusy(null);
    }
  };

  // Signed links last 10 minutes — refresh the thread first when the one clicked may have expired.
  const openAttachment = async (e, messageId, attachmentId) => {
    if (Date.now() - fetchedAt.current < ATTACHMENT_LINK_TTL_MS) return;
    e.preventDefault();
    const win = window.open('', '_blank');
    try {
      const messages = await apiFetchSupportMessages(accessToken, ticketNumber);
      fetchedAt.current = Date.now();
      setTicket((t) => (t ? { ...t, messages } : t));
      const att = messages.find((m) => m.id === messageId)?.attachments?.find((a) => a.id === attachmentId);
      if (att?.url && win) {
        win.opener = null;
        win.location.href = supportAttachmentHref(att.url);
      } else {
        win?.close();
        toast.error('That attachment is no longer available');
      }
    } catch (err) {
      win?.close();
      const msg = actionErrorMessage(err, 'Could not refresh the download link');
      if (msg) toast.error(msg);
    }
  };

  /* ── Loading / error states ── */
  if (!ticket) {
    if (loadError) {
      return (
        <div className="gh-detail">
          <button type="button" className="gh-back" onClick={backToInbox}><ChevronLeftIcon size={14} /> Inbox</button>
          {isPermissionDenied(loadError) ? (
            <AccessDenied message={loadError.message} />
          ) : (
            <div className="gh-card">
              <EmptyState
                icon={<InfoIcon size={24} />}
                title={loadError.status === 404 ? `Ticket ${ticketNumber} was not found` : 'Could not load this ticket'}
                hint={loadError.status === 404 ? 'It may have been merged or you may not have access to it.' : loadError.message}
                action={(
                  <div className="gh-row-gap">
                    <button type="button" className="gh-btn subtle" onClick={backToInbox}>Back to inbox</button>
                    {loadError.status !== 404 && <button type="button" className="gh-btn primary" onClick={refresh}>Try again</button>}
                  </div>
                )}
              />
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="gh-detail">
        <button type="button" className="gh-back" onClick={backToInbox}><ChevronLeftIcon size={14} /> Inbox</button>
        <div className="gh-card gh-detail-loading"><SkeletonLines rows={3} height={28} /></div>
        <div className="gh-detail-grid">
          <div className="gh-card"><SkeletonLines rows={6} height={64} /></div>
          <div className="gh-card"><SkeletonLines rows={6} height={40} /></div>
        </div>
      </div>
    );
  }

  const no = ticket.ticket_number || ticketNumber;
  const allowed = Array.isArray(ticket.allowed_transitions) ? ticket.allowed_transitions : [];
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  const noteCount = messages.filter((m) => m.visibility === 'internal').length;
  const decided = ticket.resolution_code === 'approved' || ticket.resolution_code === 'rejected';
  const mentionNames = assignees.map((a) => a.name).filter(Boolean);

  const changeStatus = (status) => {
    if (status === ticket.status) return;
    if (status === 'resolved') { setDialog('resolve'); return; }
    mutate('status', () => apiUpdateSupportStatus(accessToken, no, { status, expected_version: ticket.version }), `Status → ${statusLabel(status)}`);
  };

  const changePriority = (priority) => {
    if (priority === ticket.priority) return;
    mutate('priority', () => apiUpdateSupportPriority(accessToken, no, { priority, expected_version: ticket.version }),
      `Priority → ${priorityLabel(priority)} · SLA deadlines re-timed`);
  };

  const assign = (assigneeId, label) => {
    mutate('assign', () => apiAssignSupportTicket(accessToken, no, { assignee_id: assigneeId, expected_version: ticket.version }), label);
  };

  const resolve = async ({ code, message }) => {
    const ok = await mutate('status', () => apiUpdateSupportStatus(accessToken, no, {
      status: 'resolved',
      resolution_code: code,
      ...(message ? { message } : {}),
      expected_version: ticket.version,
    }), `Resolved as ${resolutionLabel(code)}${message ? ' · the user has been emailed' : ''}`);
    if (ok) setDialog(null);
  };

  const approve = async (body) => {
    const res = await mutate('approve', () => apiApproveSupportTicket(accessToken, no, body), (r) => approveToast(ticket.ticket_type, r));
    if (res) setDialog(null);
  };

  const reject = async (notes) => {
    const res = await mutate('reject', () => apiRejectSupportTicket(accessToken, no, { notes, expected_version: ticket.version }),
      'Rejected — the user has been emailed your reason');
    if (res) setDialog(null);
  };

  const retryEmail = async (message) => {
    setRetryingId(message.id);
    await mutate('retry', () => apiRetrySupportMessage(accessToken, no, message.id), 'Email queued again');
    setRetryingId(null);
  };

  const requester = ticket.user?.name || ticket.contact_email;
  const assigneeLabel = ticket.assignee?.name;

  return (
    <div className="gh-detail">
      {/* ── Header ── */}
      <div className="gh-card gh-detail-top">
        <div className="gh-detail-crumbs">
          <button type="button" className="gh-back" onClick={backToInbox}><ChevronLeftIcon size={14} /> Inbox</button>
          <button type="button" className="gh-ticket-pill" onClick={() => copyText(no, 'Ticket number copied')} title="Copy ticket number">
            <span className="gh-mono">{no}</span><CopyIcon size={11} />
          </button>
          <TypeBadge type={ticket.ticket_type} />
          {ticket.is_unread && <Badge tone="blue" dot>Unread</Badge>}
          {ticket.reopened_count > 0 && <Badge tone="orange">Reopened ×{ticket.reopened_count}</Badge>}
          {ticket.parent_ticket_number && (
            <button type="button" className="gh-link-btn" onClick={() => openTicket(ticket.parent_ticket_number)}>
              <LinkedIcon size={12} /> Follow-up of {ticket.parent_ticket_number}
            </button>
          )}
          <span className="gh-spacer" />
          <span className="gh-sub gh-hide-sm">Updated {relTime(ticket.last_activity_at, now)}</span>
          <button type="button" className="gh-icon-btn bordered" onClick={refresh} title="Refresh" aria-label="Refresh ticket">
            <RefreshIcon size={14} className={refreshing ? 'gh-spin' : ''} />
          </button>
        </div>

        <h2 className="gh-detail-subject">{ticket.subject || '(no subject)'}</h2>
        <div className="gh-detail-meta">
          {(ticket.reason_label || ticket.reason) && <span>{ticket.reason_label || humanize(ticket.reason)}</span>}
          {ticket.category && <span>{humanize(ticket.category)}</span>}
          {requester && <span>{requester}</span>}
          <span title={fmtDateTime(ticket.created_at)}>Opened {relTime(ticket.created_at, now)}</span>
        </div>

        <div className="gh-detail-controls">
          <ControlMenu
            label="Status"
            value={<StatusBadge status={ticket.status} />}
            disabled={!allowed.length}
            busy={busy === 'status'}
          >
            {({ close }) => (
              <>
                <MenuLabel>Move to</MenuLabel>
                {allowed.map((s) => (
                  <MenuItem
                    key={s}
                    icon={<span className={`gh-dot tone-${STATUS_META[s]?.tone || 'muted'}`} />}
                    hint={s === 'resolved' ? 'Needs a resolution code' : s === 'awaiting_user' || s === 'on_hold' ? 'Pauses the SLA clock' : undefined}
                    onSelect={() => { close(); changeStatus(s); }}
                  >
                    {statusLabel(s)}{s === 'resolved' ? '…' : ''}
                  </MenuItem>
                ))}
              </>
            )}
          </ControlMenu>

          <ControlMenu label="Priority" value={<PriorityBadge priority={ticket.priority} />} busy={busy === 'priority'} width={200}>
            {({ close }) => (
              <>
                <MenuLabel>Priority · re-times the SLA</MenuLabel>
                {PRIORITY_ORDER.map((p) => (
                  <MenuItem
                    key={p}
                    active={p === ticket.priority}
                    icon={<span className={`gh-tone-text tone-${PRIORITY_META[p].tone}`}><PriorityBars priority={p} /></span>}
                    onSelect={() => { close(); changePriority(p); }}
                  >
                    {priorityLabel(p)}
                  </MenuItem>
                ))}
              </>
            )}
          </ControlMenu>

          <ControlMenu
            label="Assignee"
            width={260}
            busy={busy === 'assign'}
            value={assigneeLabel
              ? <span className="gh-assignee"><Avatar name={assigneeLabel} size={16} />{assigneeLabel}</span>
              : <span className="gh-muted">Unassigned</span>}
          >
            {({ close }) => (
              <div className="gh-menu-scroll">
                <MenuItem icon={<UserIcon size={14} />} onSelect={() => { close(); assign('me', 'Assigned to you'); }}>Assign to me</MenuItem>
                {ticket.assignee && <MenuItem onSelect={() => { close(); assign(null, 'Ticket unassigned'); }}>Unassign</MenuItem>}
                {assignees.length > 0 && <MenuDivider />}
                {assignees.length > 0 && <MenuLabel>Team</MenuLabel>}
                {assignees.map((a) => (
                  <MenuItem
                    key={a.id}
                    active={String(a.id) === String(ticket.assignee?.id)}
                    icon={<Avatar name={a.name || a.email} size={20} />}
                    hint={a.email}
                    onSelect={() => { close(); assign(a.id, `Assigned to ${a.name || a.email}`); }}
                  >
                    {a.name || a.email}
                  </MenuItem>
                ))}
              </div>
            )}
          </ControlMenu>

          <div className="gh-control static">
            <span className="gh-control-label">SLA</span>
            <span className="gh-control-value"><SlaChip sla={ticket.sla} now={now} /></span>
          </div>

          <span className="gh-spacer" />

          {ticket.can_decide && (
            <div className="gh-decide">
              <button type="button" className="gh-btn success" onClick={() => setDialog('approve')} disabled={!!busy}>
                <ThumbUpIcon size={14} /> Approve
              </button>
              <button type="button" className="gh-btn danger-outline" onClick={() => setDialog('reject')} disabled={!!busy}>
                <BanIcon size={14} /> Reject
              </button>
            </div>
          )}
          {!ticket.can_decide && DECIDABLE_TYPES.has(ticket.ticket_type) && decided && (
            <Badge tone={ticket.resolution_code === 'approved' ? 'green' : 'red'} dot>
              {resolutionLabel(ticket.resolution_code)}
            </Badge>
          )}
        </div>

        {ticket.can_decide && DECISION_HINTS[ticket.ticket_type] && (
          <div className="gh-callout">
            <InfoIcon size={14} />
            <span><strong>{typeLabel(ticket.ticket_type)} — decision needed.</strong> {DECISION_HINTS[ticket.ticket_type]}</span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="gh-detail-grid">
        <section className="gh-card gh-convo" aria-label="Conversation">
          <div className="gh-convo-head">
            <h3>Conversation</h3>
            <div className="gh-seg small" role="tablist">
              {[
                { id: 'all', label: `All ${messages.length}` },
                { id: 'public', label: 'Replies' },
                { id: 'notes', label: `Notes ${noteCount}` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={threadFilter === f.id}
                  className={threadFilter === f.id ? 'active' : ''}
                  onClick={() => setThreadFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <SupportThread
            messages={messages}
            filter={threadFilter}
            mentionNames={mentionNames}
            onRetry={retryEmail}
            retryingId={retryingId}
            onOpenAttachment={openAttachment}
          />
          <SupportComposer
            ticket={ticket}
            accessToken={accessToken}
            assignees={assignees}
            onDone={() => { load(); dispatch(fetchSupportSummary()); }}
          />
        </section>

        <SupportContextPanel ticket={ticket} accessToken={accessToken} now={now} onOpenTicket={openTicket} />
      </div>

      {dialog === 'resolve' && (
        <ResolveDialog ticketNumber={no} busy={busy === 'status'} onCancel={() => setDialog(null)} onConfirm={resolve} />
      )}
      {dialog === 'approve' && (
        <ApproveDialog ticket={ticket} busy={busy === 'approve'} onCancel={() => setDialog(null)} onConfirm={approve} />
      )}
      {dialog === 'reject' && (
        <RejectDialog ticket={ticket} busy={busy === 'reject'} onCancel={() => setDialog(null)} onConfirm={reject} />
      )}
    </div>
  );
}
