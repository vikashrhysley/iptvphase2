// Get Help — the conversation thread (user messages, support replies, internal notes, system emails).
import { Fragment, useEffect, useMemo, useRef } from 'react';
import { supportAttachmentHref } from '../../services/api';
import {
  dayLabel, fileExt, fmtBytes, fmtDateTime, fmtTime, humanize, sanitizeHtml,
} from './supportUtils';
import { Avatar, Badge, EmptyState, Spinner } from './SupportUi';
import {
  AlertOctagonIcon, CheckIcon, ClockIcon, FileIcon, GlobeIcon, ImageIcon, InfoIcon, LockIcon, MailIcon,
  MessageIcon, PhoneIcon, RetryIcon,
} from './SupportIcons';

const CHANNELS = {
  email:  { label: 'Email',  Icon: MailIcon },
  in_app: { label: 'In-app', Icon: PhoneIcon },
  portal: { label: 'Portal', Icon: GlobeIcon },
};

const DELIVERY = {
  queued:  { label: 'Queued',  tone: 'slate', Icon: ClockIcon },
  sending: { label: 'Sending', tone: 'blue',  Icon: null },
  sent:    { label: 'Sent',    tone: 'green', Icon: CheckIcon },
  failed:  { label: 'Failed',  tone: 'red',   Icon: AlertOctagonIcon },
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Bold the @Name tokens of known admins in a note body.
function HighlightMentions({ text, names }) {
  if (!text) return null;
  if (!names.length) return text;
  const re = new RegExp(`(@(?:${names.map(escapeRegex).join('|')}))`, 'g');
  return String(text).split(re).map((part, i) => (
    names.some((n) => part === `@${n}`)
      ? <span key={i} className="gh-mention">{part}</span>
      : <Fragment key={i}>{part}</Fragment>
  ));
}

function DeliveryStatus({ message, onRetry, retrying }) {
  const meta = DELIVERY[message.delivery_status];
  if (!meta) return null;
  const Icon = meta.Icon;
  const title = message.delivery_status === 'sent' && message.sent_at
    ? `Emailed ${fmtDateTime(message.sent_at)}`
    : message.delivery_error || meta.label;
  return (
    <div className="gh-delivery">
      <Badge tone={meta.tone} title={title} icon={Icon ? <Icon size={11} strokeWidth={2.6} /> : <Spinner size={10} />}>
        Email {meta.label.toLowerCase()}
      </Badge>
      {message.delivery_status === 'failed' && (
        <>
          {message.delivery_error && <span className="gh-delivery-error" title={message.delivery_error}>{message.delivery_error}</span>}
          <button type="button" className="gh-btn tiny danger-outline" onClick={() => onRetry(message)} disabled={retrying}>
            {retrying ? <Spinner size={11} /> : <RetryIcon size={12} />} Retry
          </button>
        </>
      )}
    </div>
  );
}

function Attachments({ message, onOpen }) {
  const list = message.attachments || [];
  if (!list.length) return null;
  return (
    <div className="gh-attachments">
      {list.map((a) => {
        const isImage = (a.mime_type || '').startsWith('image/') || ['png', 'jpg', 'jpeg'].includes(fileExt(a.file_name));
        return (
          <a
            key={a.id}
            className="gh-attach"
            href={supportAttachmentHref(a.url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => onOpen(e, message.id, a.id)}
            title={`Download ${a.file_name}`}
          >
            {isImage ? <ImageIcon size={14} /> : <FileIcon size={14} />}
            <span className="gh-attach-name">{a.file_name}</span>
            {a.size_bytes != null && <span className="gh-attach-size">{fmtBytes(a.size_bytes)}</span>}
          </a>
        );
      })}
    </div>
  );
}

function MessageBody({ message, mentionNames }) {
  const html = useMemo(() => (message.body_html ? sanitizeHtml(message.body_html) : ''), [message.body_html]);
  // Notes render as text so @mentions can be highlighted — unless only an HTML body exists.
  if (html && (message.visibility !== 'internal' || !message.body_text)) {
    return <div className="gh-msg-body is-html" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <div className="gh-msg-body is-text">
      <HighlightMentions text={message.body_text || ''} names={message.visibility === 'internal' ? mentionNames : []} />
    </div>
  );
}

function MessageItem({ message: m, mentionNames, onRetry, retrying, onOpenAttachment }) {
  const internal = m.visibility === 'internal';
  const kind = internal ? 'note' : (m.author_type || 'user');
  const channel = CHANNELS[m.channel];
  const ChannelIcon = channel?.Icon;

  if (kind === 'system') {
    return (
      <div className="gh-msg-system">
        <div className="gh-msg-system-card">
          <div className="gh-msg-system-head">
            <InfoIcon size={13} />
            <strong>{m.author_name || 'System'}</strong>
            <span title={fmtDateTime(m.created_at)}>{fmtTime(m.created_at)}</span>
          </div>
          <MessageBody message={m} mentionNames={mentionNames} />
          <Attachments message={m} onOpen={onOpenAttachment} />
          <DeliveryStatus message={m} onRetry={onRetry} retrying={retrying} />
        </div>
      </div>
    );
  }

  const name = m.author_name || (kind === 'user' ? 'User' : 'Support');
  return (
    <div className={`gh-msg gh-msg-${kind}`}>
      <Avatar name={name} size={24} tone={kind === 'note' ? 'amber' : kind === 'admin' ? 'blue' : undefined} className="gh-msg-avatar" />
      <div className="gh-msg-main">
        <div className="gh-msg-head">
          {kind === 'note' && <span className="gh-note-tag"><LockIcon size={11} /> Internal note</span>}
          <strong className="gh-msg-author">{name}</strong>
          {kind === 'admin' && <span className="gh-msg-role">Support</span>}
          {kind === 'user' && <span className="gh-msg-role user">User</span>}
          {channel && !internal && (
            <span className="gh-msg-channel"><ChannelIcon size={11} /> {channel.label}</span>
          )}
          {!channel && m.channel && !internal && <span className="gh-msg-channel">{humanize(m.channel)}</span>}
          <span className="gh-msg-time" title={fmtDateTime(m.created_at)}>{fmtTime(m.created_at)}</span>
        </div>
        <div className="gh-msg-bubble">
          <MessageBody message={m} mentionNames={mentionNames} />
          <Attachments message={m} onOpen={onOpenAttachment} />
        </div>
        {kind === 'admin' && <DeliveryStatus message={m} onRetry={onRetry} retrying={retrying} />}
      </div>
    </div>
  );
}

export default function SupportThread({ messages, filter, mentionNames, onRetry, retryingId, onOpenAttachment }) {
  const scrollRef = useRef(null);
  const visible = useMemo(() => (messages || []).filter((m) => {
    if (filter === 'notes') return m.visibility === 'internal';
    if (filter === 'public') return m.visibility !== 'internal';
    return true;
  }), [messages, filter]);

  // A day separator goes above the first message of each calendar day.
  const rows = useMemo(() => {
    const out = [];
    let lastDay = '';
    for (const m of visible) {
      const day = dayLabel(m.created_at);
      out.push({ m, day, showDay: !!day && day !== lastDay });
      if (day) lastDay = day;
    }
    return out;
  }, [visible]);

  // Keep the newest message in view when the thread loads or grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible.length, filter]);

  if (!visible.length) {
    return (
      <div className="gh-thread" ref={scrollRef}>
        <EmptyState
          icon={filter === 'notes' ? <LockIcon size={24} /> : <MessageIcon size={24} />}
          title={filter === 'notes' ? 'No internal notes yet' : 'No messages yet'}
          hint={filter === 'notes' ? 'Notes are only visible to admins — never emailed to the user.' : undefined}
        />
      </div>
    );
  }

  return (
    <div className="gh-thread" ref={scrollRef}>
      {rows.map(({ m, day, showDay }) => (
        <Fragment key={m.id}>
          {showDay && <div className="gh-day"><span>{day}</span></div>}
          <MessageItem
            message={m}
            mentionNames={mentionNames}
            onRetry={onRetry}
            retrying={retryingId === m.id}
            onOpenAttachment={onOpenAttachment}
          />
        </Fragment>
      ))}
    </div>
  );
}
