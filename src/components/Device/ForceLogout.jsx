import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  apiPreviewDeviceLogout, apiLogoutDevices, apiLogoutDevice,
  apiFetchUserLoggedInDevices, apiFetchAppUsers,
} from '../../services/api';
import { isPermissionDenied } from '../../services/permissionErrors';
import { AccessDenied } from '../common/PermissionDenied';
import './ForceLogout.css';

/*
 * Force logout (remote sign-out) — Remote Device Logout build guide.
 * Signing a device out is NOT blocking it: the device keeps its status, the account, licence and
 * subscription are untouched, and the user can sign straight back in with an email code. Every
 * label here keeps that distinction clear (guide "READ THIS FIRST" + Part F).
 */

const MAX_IDS = 100;
const MAX_REASON = 500;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Middle-truncated device ID: 3f2a9c1e..77d1
const shortId = (id) => {
  const s = String(id || '');
  return s.length > 14 ? `${s.slice(0, 8)}..${s.slice(-4)}` : s;
};

// Split on new lines, commas, semicolons and spaces; trim; drop empties; de-duplicate
// case-insensitively (guide B3 — keeps the count under the box honest).
const parseDeviceIds = (text) => {
  const seen = new Set();
  const out = [];
  for (const part of text.split(/[\s,;]+/)) {
    const id = part.trim();
    if (!id || seen.has(id.toLowerCase())) continue;
    seen.add(id.toLowerCase());
    out.push(id);
  }
  return out;
};

const PREVIEW_META = {
  will_logout:        { icon: '✓', tone: 'ok',    label: 'Will be signed out' },
  already_logged_out: { icon: '–', tone: 'muted', label: 'Already signed out · skipped' },
  not_found:          { icon: '✗', tone: 'bad',   label: 'Not found · skipped' },
  invalid_id:         { icon: '✗', tone: 'bad',   label: 'Not a valid device ID · skipped' },
};

const USAGE_CHIP = {
  online_now:     { label: 'Online now', tone: 'ok' },
  logged_in_idle: { label: 'Idle',       tone: 'warn' },
};

const PLATFORM_ICONS = { android: '🤖', roku: '📺', samsung: '📺', lg: '📺', ios: '🍎', firetv: '🔥' };

const copyId = (id) => {
  if (!id || !navigator.clipboard) return;
  navigator.clipboard.writeText(id).then(() => toast.success('Device ID copied')).catch(() => {});
};

function DeviceIdChip({ id }) {
  return (
    <span className="fl-id" title={id}>
      <span className="fl-mono">{shortId(id)}</span>
      <button type="button" className="fl-copy" onClick={() => copyId(id)} title="Copy device ID" aria-label="Copy device ID">⧉</button>
    </span>
  );
}

const Spinner = () => <span className="fl-spin" aria-hidden="true" />;

// Close on Esc unless a request is in flight.
function useEscape(onEscape, disabled) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && !disabled) onEscape(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onEscape, disabled]);
}

/* ── Shared: confirm step (guide B5) ─────────────────────── */
function ConfirmStep({ devices, reason, setReason, busy, error, onBack, onSubmit }) {
  const n = devices.length;
  return (
    <>
      <div className="fl-title">Sign out {plural(n, 'device')}?</div>

      <ul className="fl-rows fl-rows-plain">
        {devices.map((d) => (
          <li key={d.device_id} className="fl-row">
            <span className="fl-name">{d.device_name || 'Device'}</span>
            <DeviceIdChip id={d.device_id} />
            <span className="fl-email">{d.user_email || '—'}</span>
          </li>
        ))}
      </ul>

      <div className="fl-explain">
        <div className="fl-explain-head">What happens</div>
        <ul>
          <li className="ok">Each device is signed out straight away and stops playing.</li>
          <li className="ok">Its MAC seat is freed for another device to use.</li>
          <li className="ok">The user gets an email saying they were signed out.</li>
        </ul>
        <div className="fl-explain-head">What does not happen</div>
        <ul>
          <li className="no">The devices are <strong>NOT blocked</strong>. The user can sign back in with an email code at any time.</li>
          <li className="no">The account, licence and subscription are untouched.</li>
        </ul>
      </div>

      <ReasonField reason={reason} setReason={setReason} busy={busy}
        label="Reason (optional · saved in the audit log, never shown to the user)" />

      {error && <div className="fl-error">{error.message}</div>}

      <div className="fl-actions">
        <button type="button" className="fl-btn" onClick={onBack} disabled={busy}>Back</button>
        <button type="button" className="fl-btn fl-btn-danger" onClick={onSubmit} disabled={busy || n === 0}>
          {busy && <Spinner />} Sign out {plural(n, 'device')}
        </button>
      </div>
    </>
  );
}

function ReasonField({ reason, setReason, busy, label }) {
  return (
    <div className="fl-field">
      <label htmlFor="fl-reason">{label}</label>
      <textarea
        id="fl-reason"
        rows={3}
        value={reason}
        maxLength={MAX_REASON}
        onChange={(e) => setReason(e.target.value)}
        disabled={busy}
      />
      {reason.length >= MAX_REASON - 100 && (
        <span className={`fl-counter${reason.length >= MAX_REASON ? ' max' : ''}`}>{reason.length} / {MAX_REASON}</span>
      )}
    </div>
  );
}

/* ── Shared: result step (guide B7) ──────────────────────── */
function ResultStep({ data, onDone }) {
  const results = Array.isArray(data?.results) ? data.results : [];
  const loggedOut = data?.devices_logged_out ?? results.filter((r) => r.result === 'logged_out').length;
  const nothing = data?.logout_status === 'none';
  const warnings = Array.isArray(data?.warnings) ? data.warnings : [];
  const emailsSent = data?.notifications?.emails_sent ?? 0;
  const emailed = [...new Set(results.filter((r) => r.result === 'logged_out' && r.user_email).map((r) => r.user_email))];

  return (
    <>
      <div className={`fl-banner ${nothing ? 'info' : 'ok'}`}>
        <span className="fl-banner-icon">{nothing ? 'ⓘ' : '✓'}</span>
        <div>
          <div className="fl-banner-title">
            {nothing ? 'Nothing to do. Every device was already signed out.' : `${plural(loggedOut, 'device')} signed out`}
          </div>
          {data?.message && <div className="fl-banner-sub">{data.message}</div>}
        </div>
      </div>

      {results.length > 0 && (
        <ul className="fl-rows fl-rows-plain">
          {results.map((r) => (
            <li key={r.device_id} className="fl-row">
              <span className="fl-name">{r.device_name || shortId(r.device_id)}</span>
              <span className={`fl-result ${r.result === 'logged_out' ? 'ok' : 'muted'}`}>
                {r.result === 'logged_out'
                  ? `Signed out${r.virtual_mac ? ` · seat ${r.virtual_mac} freed` : ''}`
                  : 'Was already signed out'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {data?.fully_enforced === false && (
        <div className="fl-note-warn">
          Signed out, but some background clean-up didn't finish. The device can no longer use the service; no action needed.
          {warnings.length > 0 && (
            <details>
              <summary>Details</summary>
              <ul>{warnings.map((w, i) => <li key={i}>{typeof w === 'string' ? w : JSON.stringify(w)}</li>)}</ul>
            </details>
          )}
        </div>
      )}

      {emailsSent >= 1 && (
        <p className="fl-muted">
          {emailed.length
            ? `${emailed.join(', ')} ${emailed.length === 1 ? 'has' : 'have'} been emailed.`
            : `${plural(emailsSent, 'user')} emailed.`}
        </p>
      )}

      <div className="fl-actions">
        <button type="button" className="fl-btn fl-btn-primary" onClick={onDone} autoFocus>Done</button>
      </div>
    </>
  );
}

/* ── The Force logout pop-up (guide Part B) ──────────────── */
export function ForceLogoutModal({ accessToken, onClose, onDone }) {
  const [step, setStep] = useState('choose'); // choose | ids | user | confirm | result
  const [mode, setMode] = useState(null);     // ids | user

  // By device ID
  const [idText, setIdText] = useState('');
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(null);
  const checkSeq = useRef(0);
  const parsedIds = useMemo(() => parseDeviceIds(idText), [idText]);
  const tooMany = parsedIds.length > MAX_IDS;

  // By user
  const [query, setQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDevices, setUserDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState(null);
  const [ticked, setTicked] = useState(() => new Set());
  const pickSeq = useRef(0);
  const searchReady = query.trim().length >= 3;

  // Confirm + result
  const [pending, setPending] = useState([]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [result, setResult] = useState(null);
  const inFlight = useRef(false);

  // Once anything was signed out, closing by any route still refreshes the page.
  const close = () => {
    if (busy) return;
    if (result) onDone();
    onClose();
  };
  useEscape(close, busy);

  /* By device ID ─ check */
  const runCheck = async () => {
    if (!parsedIds.length || tooMany) return;
    const seq = ++checkSeq.current;
    setChecking(true);
    setCheckError(null);
    try {
      const data = await apiPreviewDeviceLogout(accessToken, parsedIds);
      if (seq === checkSeq.current) setPreview(data);
    } catch (err) {
      if (seq === checkSeq.current) {
        // 403 → the global pop-up already explained it (devices · Act).
        if (!isPermissionDenied(err)) setCheckError(err.message);
      }
    } finally {
      if (seq === checkSeq.current) setChecking(false);
    }
  };

  // Editing the box invalidates the previous check — the list must always match the box.
  const onIdTextChange = (v) => {
    checkSeq.current++;
    setIdText(v);
    setPreview(null);
    setCheckError(null);
    setChecking(false);
  };

  /* By user ─ find user (300 ms debounce, ≥ 3 chars, up to 10 matches) */
  useEffect(() => {
    if (step !== 'user' || !searchReady) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const r = await apiFetchAppUsers(accessToken, { search: query.trim(), account_state: 'live', page_size: 10 });
        if (!cancelled) setUserResults(r.users.slice(0, 10));
      } catch (err) {
        if (!cancelled) setSearchError(err.message);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, step, searchReady, accessToken]);

  const onQueryChange = (v) => {
    setQuery(v);
    // Changing the search after picking a user clears the device list and the ticks.
    if (selectedUser) {
      pickSeq.current++;
      setSelectedUser(null);
      setUserDevices([]);
      setTicked(new Set());
      setDevicesError(null);
      setDevicesLoading(false);
    }
  };

  const pickUser = async (u) => {
    const seq = ++pickSeq.current;
    setSelectedUser(u);
    setUserDevices([]);
    setTicked(new Set());
    setDevicesError(null);
    setDevicesLoading(true);
    try {
      const r = await apiFetchUserLoggedInDevices(accessToken, u.id);
      if (seq === pickSeq.current) setUserDevices(r.devices);
    } catch (err) {
      if (seq !== pickSeq.current) return;
      // A refused GET has no pop-up — the list area shows the locked state instead.
      if (isPermissionDenied(err)) { setDevicesError({ denied: true, message: err.message }); return; }
      if (err.status === 404) { setSelectedUser(null); setDevicesError('That user no longer exists. Search again.'); }
      else setDevicesError(err.message);
    } finally {
      if (seq === pickSeq.current) setDevicesLoading(false);
    }
  };

  const toggleTick = (id) => setTicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allTicked = userDevices.length > 0 && ticked.size === userDevices.length;
  const toggleAll = () => setTicked(allTicked ? new Set() : new Set(userDevices.map((d) => d.device_id)));

  /* Continue → confirm */
  const willLogout = (preview?.items || []).filter((i) => i.result === 'will_logout');
  const continueFromIds = () => {
    setPending(willLogout.map((i) => ({ device_id: i.device_id, device_name: i.device_name, user_email: i.user_email })));
    setConfirmError(null);
    setStep('confirm');
  };
  const continueFromUser = () => {
    setPending(userDevices.filter((d) => ticked.has(d.device_id))
      .map((d) => ({ device_id: d.device_id, device_name: d.device_name, user_email: selectedUser?.email })));
    setConfirmError(null);
    setStep('confirm');
  };

  const backFromConfirm = () => {
    const stale = confirmError?.stale;
    setConfirmError(null);
    setStep(mode);
    // A device vanished or changed owner since the list loaded — reload what the admin picks from.
    if (stale) {
      if (mode === 'ids') runCheck();
      else if (selectedUser) pickUser(selectedUser);
    }
  };

  /* Confirm → logout (guide B6) */
  const submit = async () => {
    if (inFlight.current || !pending.length) return;
    inFlight.current = true;
    setBusy(true);
    setConfirmError(null);
    try {
      const data = await apiLogoutDevices(accessToken, pending.map((d) => d.device_id), {
        // user_id only in "By user" mode — device-ID mode may span several users.
        userId: mode === 'user' ? selectedUser?.id : undefined,
        reason,
      });
      setResult(data);
      setStep('result');
    } catch (err) {
      // 403 → the global pop-up; leave the pop-up as it was.
      if (isPermissionDenied(err)) return;
      // 400 / 404: nothing was signed out — safe to go Back, re-check and retry.
      setConfirmError({ message: err.message, stale: err.status === 400 || err.status === 404 });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const done = () => { onDone(); onClose(); };

  /* ── Render ── */
  let body;
  if (step === 'choose') {
    body = (
      <>
        <div className="fl-head">
          <div className="fl-title">Force logout</div>
          <button type="button" className="fl-x" onClick={close} aria-label="Close">×</button>
        </div>
        <p className="fl-q">How do you want to choose the devices?</p>
        <label className={`fl-option${mode === 'ids' ? ' selected' : ''}`}>
          <input type="radio" name="fl-mode" checked={mode === 'ids'} onChange={() => setMode('ids')} />
          <span>
            <strong>By device ID</strong>
            <span className="fl-muted">Paste one or more device IDs. They can belong to different users.</span>
          </span>
        </label>
        <label className={`fl-option${mode === 'user' ? ' selected' : ''}`}>
          <input type="radio" name="fl-mode" checked={mode === 'user'} onChange={() => setMode('user')} />
          <span>
            <strong>By user</strong>
            <span className="fl-muted">Find a user by email and choose which of their signed-in devices to sign out.</span>
          </span>
        </label>
        <div className="fl-actions">
          <button type="button" className="fl-btn" onClick={close}>Cancel</button>
          <button type="button" className="fl-btn fl-btn-primary" disabled={!mode} onClick={() => setStep(mode)}>Continue</button>
        </div>
      </>
    );
  } else if (step === 'ids') {
    const s = preview?.summary || {};
    const willCount = s.will_logout ?? willLogout.length;
    body = (
      <>
        <div className="fl-head">
          <div className="fl-title">Force logout · By device ID</div>
          <button type="button" className="fl-back" onClick={() => setStep('choose')}>‹ Back</button>
        </div>
        <div className="fl-field">
          <label htmlFor="fl-ids">Device IDs (one per line, or separated by commas)</label>
          <textarea id="fl-ids" className="fl-mono" rows={5} value={idText}
            onChange={(e) => onIdTextChange(e.target.value)} autoFocus />
        </div>
        <div className="fl-inline">
          <span className={`fl-muted${tooMany ? ' fl-bad' : ''}`}>
            {tooMany ? `${parsedIds.length} IDs · At most ${MAX_IDS} devices at a time` : plural(parsedIds.length, 'ID')}
          </span>
          <button type="button" className="fl-btn" onClick={runCheck} disabled={!parsedIds.length || tooMany || checking}>
            {checking && <Spinner />} Check devices
          </button>
        </div>

        {checkError && <div className="fl-error">{checkError}</div>}

        {preview && (
          <ul className="fl-rows">
            {preview.items.map((it) => {
              const m = PREVIEW_META[it.result] || PREVIEW_META.not_found;
              return (
                <li key={it.device_id} className="fl-row fl-row-stack">
                  <span className={`fl-mark ${m.tone}`}>{m.icon}</span>
                  <div className="fl-row-main">
                    <div className="fl-row-line">
                      {it.device_name && <span className="fl-name">{it.device_name}</span>}
                      <DeviceIdChip id={it.device_id} />
                      {it.user_email && <span className="fl-email">{it.user_email}</span>}
                      {it.last_active_display && <span className="fl-muted">{it.last_active_display}</span>}
                    </div>
                    <div className={`fl-status ${m.tone}`}>{m.label}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="fl-actions fl-actions-split">
          <span className="fl-muted">{preview ? `${willCount} of ${s.requested ?? preview.items.length} will be signed out` : ''}</span>
          <span className="fl-actions">
            <button type="button" className="fl-btn" onClick={close}>Cancel</button>
            <button type="button" className="fl-btn fl-btn-primary" disabled={!preview || willCount < 1} onClick={continueFromIds}>
              Continue{preview ? ` (${willCount})` : ''}
            </button>
          </span>
        </div>
      </>
    );
  } else if (step === 'user') {
    body = (
      <>
        <div className="fl-head">
          <div className="fl-title">Force logout · By user</div>
          <button type="button" className="fl-back" onClick={() => setStep('choose')}>‹ Back</button>
        </div>
        <div className="fl-field">
          <label htmlFor="fl-user">Find user</label>
          <input id="fl-user" className="fl-input" value={query} placeholder="Type at least 3 characters of the email…"
            onChange={(e) => onQueryChange(e.target.value)} autoFocus />
        </div>

        {!selectedUser && searchReady && (
          searching ? <div className="fl-muted fl-pad"><Spinner /> Searching…</div>
          : searchError ? <div className="fl-error">{searchError}</div>
          : userResults.length === 0 ? <div className="fl-muted fl-pad">No matching users.</div>
          : (
            <ul className="fl-rows">
              {userResults.map((u) => (
                <li key={u.id} className="fl-row">
                  <span className="fl-email fl-grow">{u.email}</span>
                  <span className="fl-muted">
                    {u.status ? `${u.status.charAt(0).toUpperCase()}${u.status.slice(1)} · ` : ''}
                    {u.devices?.active ?? 0} signed in
                  </span>
                  <button type="button" className="fl-btn fl-btn-sm" onClick={() => pickUser(u)}>Select</button>
                </li>
              ))}
            </ul>
          )
        )}

        {devicesError && (devicesError.denied
          ? <AccessDenied message={devicesError.message} compact />
          : <div className="fl-error">{devicesError.message ?? devicesError}</div>)}

        {selectedUser && (
          devicesLoading ? <div className="fl-muted fl-pad"><Spinner /> Loading {selectedUser.email}'s devices…</div>
          : userDevices.length === 0 && !devicesError ? (
            <div className="fl-empty">{selectedUser.email} isn't signed in on any device.</div>
          ) : userDevices.length > 0 && (
            <>
              <div className="fl-subhead">{selectedUser.email} is signed in on {plural(userDevices.length, 'device')}</div>
              <label className="fl-check fl-check-all">
                <input type="checkbox" checked={allTicked} onChange={toggleAll} /> Select all
              </label>
              <ul className="fl-rows">
                {userDevices.map((d) => {
                  const chip = USAGE_CHIP[d.usage_state];
                  return (
                    <li key={d.device_id} className="fl-row">
                      <label className="fl-check fl-grow">
                        <input type="checkbox" checked={ticked.has(d.device_id)} onChange={() => toggleTick(d.device_id)} />
                        <span className="fl-platform">{PLATFORM_ICONS[d.platform] || '📱'}</span>
                        <span className="fl-name">{d.device_name || 'Device'}</span>
                      </label>
                      <DeviceIdChip id={d.device_id} />
                      {chip
                        ? <span className={`fl-chip ${chip.tone}`}>{chip.label}</span>
                        : <span className="fl-chip muted">{d.status || '—'}</span>}
                      {d.last_active_display && <span className="fl-muted">{d.last_active_display}</span>}
                    </li>
                  );
                })}
              </ul>
            </>
          )
        )}

        <div className="fl-actions">
          <button type="button" className="fl-btn" onClick={close}>Cancel</button>
          {!(selectedUser && !devicesLoading && userDevices.length === 0) && (
            <button type="button" className="fl-btn fl-btn-primary" disabled={ticked.size < 1} onClick={continueFromUser}>
              Continue{ticked.size ? ` (${ticked.size})` : ''}
            </button>
          )}
        </div>
      </>
    );
  } else if (step === 'confirm') {
    body = (
      <ConfirmStep devices={pending} reason={reason} setReason={setReason} busy={busy}
        error={confirmError} onBack={backFromConfirm} onSubmit={submit} />
    );
  } else {
    body = <ResultStep data={result} onDone={done} />;
  }

  return createPortal(
    <div className="fl-overlay" role="presentation">
      <div className="fl-modal" role="dialog" aria-modal="true" aria-label="Force logout">{body}</div>
    </div>,
    document.body
  );
}

/* ── Single device: row action + device detail (guide Part C) ── */
// device: { device_id, device_name, user_email }
export function SingleLogoutDialog({ accessToken, device, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);
  const name = device.device_name || 'Device';

  const close = () => { if (!busy) onClose(); };
  useEscape(close, busy);

  const submit = async (e) => {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const data = await apiLogoutDevice(accessToken, device.device_id, reason);
      if (data?.logout_status === 'none') {
        toast('This device was already signed out', { icon: 'ℹ️' });
      } else {
        toast.success(`${name} signed out`);
      }
      if (data?.fully_enforced === false) {
        toast("Signed out, but some background clean-up didn't finish. The device can no longer use the service; no action needed.",
          { icon: '⚠️', duration: 9000 });
      }
      onDone();
      onClose();
    } catch (err) {
      if (isPermissionDenied(err)) {
        // The global pop-up already explained it; nothing else to show.
      } else if (err.status === 404) {
        toast(err.message || 'Device not found — refreshing.', { icon: 'ℹ️' });
        onDone();
        onClose();
      } else {
        setError(err.message || 'Sign-out failed.');
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fl-overlay" role="presentation" onClick={(e) => e.target === e.currentTarget && close()}>
      <form className="fl-modal fl-modal-sm" role="dialog" aria-modal="true" aria-label="Sign out this device" onSubmit={submit}>
        <div className="fl-title">Sign out this device?</div>
        <div className="fl-row fl-row-plain">
          <span className="fl-name">{name}</span>
          <DeviceIdChip id={device.device_id} />
          {device.user_email && <span className="fl-email">{device.user_email}</span>}
        </div>
        <p className="fl-text">
          It is signed out straight away and its MAC seat is freed.
          It is <strong>NOT blocked</strong>: the user can sign back in with an email code.
        </p>
        <ReasonField reason={reason} setReason={setReason} busy={busy} label="Reason (optional · audit log only)" />
        {error && <div className="fl-error">{error}</div>}
        <div className="fl-actions">
          <button type="button" className="fl-btn" onClick={close} disabled={busy}>Cancel</button>
          <button type="submit" className="fl-btn fl-btn-danger" disabled={busy}>
            {busy && <Spinner />} Sign out device
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
