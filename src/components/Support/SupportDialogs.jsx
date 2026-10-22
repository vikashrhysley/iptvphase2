// Get Help — Resolve / Approve / Reject dialogs used by the ticket detail view.
import { useState } from 'react';
import { RESOLUTION_CODES, humanize } from './supportUtils';
import { Badge, Field, Modal, Spinner } from './SupportUi';
import { BanIcon, CheckCircleIcon, InfoIcon, ThumbUpIcon } from './SupportIcons';

// withMessage=false is the "Send & Resolve" case — the reply itself is the message to the user.
export function ResolveDialog({ ticketNumber, withMessage = true, busy, onCancel, onConfirm }) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  return (
    <Modal
      title="Resolve ticket"
      subtitle={`${ticketNumber} · choose how it was resolved`}
      icon={<CheckCircleIcon size={18} />}
      tone="green"
      onClose={onCancel}
      busy={busy}
      footer={(
        <>
          <button type="button" className="gh-btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button
            type="button"
            className="gh-btn primary"
            disabled={!code || busy}
            onClick={() => onConfirm({ code, message: message.trim() })}
          >
            {busy && <Spinner />} {withMessage ? 'Resolve ticket' : 'Send & resolve'}
          </button>
        </>
      )}
    >
      <Field label="Resolution" required>
        <div className="gh-choice-list">
          {RESOLUTION_CODES.map((r) => (
            <label key={r.value} className={`gh-choice${code === r.value ? ' active' : ''}`}>
              <input type="radio" name="resolution" value={r.value} checked={code === r.value} onChange={() => setCode(r.value)} />
              <span><strong>{r.label}</strong><small>{r.hint}</small></span>
            </label>
          ))}
        </div>
      </Field>
      {withMessage && (
        <Field label="Final message to the user" hint="Optional — emailed to the user along with the resolution." counter={`${message.length}/2000`}>
          <textarea
            className="gh-input"
            rows={4}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="All set — enjoy!"
          />
        </Field>
      )}
      <p className="gh-dialog-note">
        <InfoIcon size={13} /> If the user replies within the reopen window the ticket reopens automatically.
      </p>
    </Modal>
  );
}

const APPROVE_EFFECTS = {
  device_recovery: [
    'Unblocks the device — status back to normal, signed out, risk score reset.',
    'Closes the linked recovery request as completed.',
    'Resolves this ticket as Approved and emails the user your notes.',
  ],
  account_recovery: [
    'No automatic account change — do any manual steps first.',
    'Closes the linked recovery request as completed.',
    'Resolves this ticket as Approved and emails the user your notes.',
  ],
  device_limit_increase: [
    'Sets the subscription + licence device limit and tops up MAC seats.',
    'Writes subscription and licence history plus an audit row.',
    'Resolves this ticket as Approved and emails the user your notes.',
  ],
};

const REJECT_EFFECTS = {
  device_recovery: 'The device stays blocked and the recovery request is closed as rejected.',
  account_recovery: 'The linked recovery request is closed as failed.',
  device_limit_increase: 'The device limit is not changed.',
};

const deviceStatusTone = (s) => ({ normal: 'green', active: 'green', blocked: 'red', lost: 'amber', replaced: 'slate' }[s] || 'muted');

export function ApproveDialog({ ticket, busy, onCancel, onConfirm }) {
  const type = ticket.ticket_type;
  const ctx = ticket.context || {};
  const devices = Array.isArray(ctx.devices) ? ctx.devices : [];
  const requested = ctx.linked_request?.old_device_id;
  const requestedDevice = devices.find((d) => String(d.id) === String(requested));
  const currentMax = ctx.license?.max_devices;
  const used = ctx.license?.devices_used;

  const [notes, setNotes] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [maxDevices, setMaxDevices] = useState(currentMax != null ? String(Number(currentMax) + 1) : '');

  let limitError = '';
  if (type === 'device_limit_increase' && maxDevices !== '') {
    const n = Number(maxDevices);
    if (!Number.isInteger(n) || n < 1) limitError = 'Enter a whole number.';
    else if (currentMax != null && n <= Number(currentMax)) limitError = `Must be above the current limit (${currentMax}).`;
  }

  const submit = () => {
    const body = { expected_version: ticket.version };
    if (notes.trim()) body.notes = notes.trim();
    if (type === 'device_recovery' && deviceId) body.device_id = deviceId;
    if (type === 'device_limit_increase' && maxDevices !== '') body.max_devices = Number(maxDevices);
    onConfirm(body);
  };

  return (
    <Modal
      title="Approve request"
      subtitle={`${ticket.ticket_number} · ${humanize(type)}`}
      icon={<ThumbUpIcon size={18} />}
      tone="green"
      width={560}
      onClose={onCancel}
      busy={busy}
      footer={(
        <>
          <button type="button" className="gh-btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="gh-btn success" disabled={busy || !!limitError} onClick={submit}>
            {busy && <Spinner />} Approve
          </button>
        </>
      )}
    >
      {type === 'device_recovery' && (
        <Field
          label="Device to unblock"
          hint="Defaults to the device in the user's request. Must belong to this user."
        >
          <select className="gh-input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            <option value="">
              Device in the request{requestedDevice ? ` — ${requestedDevice.name || requestedDevice.id}` : ''}
            </option>
            {devices.filter((d) => String(d.id) !== String(requested)).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name || d.id} · {humanize(d.platform)} · {humanize(d.status)}
              </option>
            ))}
          </select>
          {requestedDevice && (
            <div className="gh-inline-meta">
              Requested device status: <Badge tone={deviceStatusTone(requestedDevice.status)}>{humanize(requestedDevice.status)}</Badge>
            </div>
          )}
        </Field>
      )}

      {type === 'device_limit_increase' && (
        <Field
          label="New device limit"
          required
          error={limitError}
          hint={currentMax != null
            ? `Current limit ${currentMax}${used != null ? ` · ${used} in use` : ''}. Defaults to current + 1; no upper cap.`
            : 'Defaults to the current limit + 1.'}
        >
          <div className="gh-stepper">
            <button
              type="button" className="gh-icon-btn bordered" aria-label="Decrease"
              onClick={() => setMaxDevices((v) => String(Math.max(1, (Number(v) || 1) - 1)))}
            >−</button>
            <input
              type="number"
              className="gh-input"
              min={currentMax != null ? Number(currentMax) + 1 : 1}
              step={1}
              value={maxDevices}
              onChange={(e) => setMaxDevices(e.target.value)}
            />
            <button
              type="button" className="gh-icon-btn bordered" aria-label="Increase"
              onClick={() => setMaxDevices((v) => String((Number(v) || 0) + 1))}
            >+</button>
          </div>
        </Field>
      )}

      <Field label="Notes" hint="Optional — included in the email to the user." counter={`${notes.length}/1000`}>
        <textarea
          className="gh-input"
          rows={3}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Verified via billing receipt"
        />
      </Field>

      <div className="gh-effects">
        <div className="gh-effects-title">What happens</div>
        <ul>
          {(APPROVE_EFFECTS[type] || ['Resolves this ticket as Approved and emails the user.']).map((t) => <li key={t}>{t}</li>)}
        </ul>
        <div className="gh-effects-foot">A decided ticket can’t be decided again, even after a reopen.</div>
      </div>
    </Modal>
  );
}

export function RejectDialog({ ticket, busy, onCancel, onConfirm }) {
  const [notes, setNotes] = useState('');
  const tooShort = notes.trim().length < 3;
  return (
    <Modal
      title="Reject request"
      subtitle={`${ticket.ticket_number} · ${humanize(ticket.ticket_type)}`}
      icon={<BanIcon size={18} />}
      tone="red"
      onClose={onCancel}
      busy={busy}
      footer={(
        <>
          <button type="button" className="gh-btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="gh-btn danger" disabled={busy || tooShort} onClick={() => onConfirm(notes.trim())}>
            {busy && <Spinner />} Reject
          </button>
        </>
      )}
    >
      <Field
        label="Reason"
        required
        hint="Required — this is included in the email to the user, so keep it clear and polite."
        counter={`${notes.length}/1000`}
      >
        <textarea
          className="gh-input"
          rows={4}
          maxLength={1000}
          autoFocus
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="We could not verify ownership of this account."
        />
      </Field>
      <div className="gh-effects danger">
        <div className="gh-effects-title">What happens</div>
        <ul>
          <li>{REJECT_EFFECTS[ticket.ticket_type] || 'Nothing on the account changes.'}</li>
          <li>The ticket is resolved as Rejected and the user is emailed your reason.</li>
        </ul>
      </div>
    </Modal>
  );
}
