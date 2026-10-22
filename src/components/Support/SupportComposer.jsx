// Get Help — reply / internal-note composer with templates, attachments and @mentions.
import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  apiAddSupportNote, apiFetchTicketCannedResponses, apiReplySupportTicket, apiUploadSupportAttachment,
} from '../../services/api';
import {
  ATTACHMENT_EXTS, ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_FILES,
  actionErrorMessage, escapeHtml, fileExt, fmtBytes, humanize, isConflict, newIdempotencyKey,
  sanitizeHtml, textToHtml,
} from './supportUtils';
import { ResolveDialog } from './SupportDialogs';
import { Avatar, Menu, MenuDivider, MenuItem, MenuLabel, Spinner } from './SupportUi';
import {
  AtIcon, BoldIcon, ChevronDownIcon, FileIcon, ImageIcon, InfoIcon, ItalicIcon, LinkIcon, ListIcon,
  ListOrderedIcon, LockIcon, MailIcon, PaperclipIcon, SearchIcon, SendIcon, TemplateIcon, XIcon,
} from './SupportIcons';

const SEND_OPTIONS = [
  { status: 'awaiting_user', label: 'Send & set Awaiting user', hint: 'Default — pauses the SLA clock' },
  { status: 'keep',          label: 'Send & keep status',       hint: 'Status stays as it is' },
  { status: 'in_progress',   label: 'Send & mark In progress',  hint: 'You are still working on it' },
  { status: 'on_hold',       label: 'Send & put On hold',       hint: 'Blocked internally — SLA paused' },
  { status: 'resolved',      label: 'Send & Resolve…',          hint: 'Asks for a resolution code' },
];

const ACCEPT = ATTACHMENT_EXTS.map((e) => `.${e}`).join(',');

const placeCaretAtEnd = (el) => {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
};

export default function SupportComposer({ ticket, accessToken, assignees, onDone }) {
  const ticketNumber = ticket.ticket_number;
  const isClosed = ticket.status === 'closed';
  const [mode, setMode] = useState(isClosed ? 'note' : 'reply');

  /* Reply */
  const editorRef = useRef(null);
  const fileRef = useRef(null);
  const savedRange = useRef(null);
  const idemKey = useRef(newIdempotencyKey());
  const [isEmpty, setIsEmpty] = useState(true);
  const [attachments, setAttachments] = useState([]);   // { key, id?, name, size, status: uploading|done|error, error? }
  const [cannedId, setCannedId] = useState(null);
  const [sending, setSending] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [dragging, setDragging] = useState(false);

  /* Templates (loaded on first open) */
  const [templates, setTemplates] = useState(null);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplError, setTplError] = useState('');
  const [tplQuery, setTplQuery] = useState('');

  /* Note */
  const noteRef = useRef(null);
  const [note, setNote] = useState('');
  const [mentions, setMentions] = useState([]);           // { id, name }
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const syncEmpty = () => {
    const el = editorRef.current;
    setIsEmpty(!el || (!el.textContent.trim() && !el.querySelector('li')));
  };

  const exec = (cmd, value) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    syncEmpty();
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    } else {
      savedRange.current = null;
    }
  };

  const applyLink = () => {
    let url = linkUrl.trim();
    if (!url) { setLinkOpen(false); return; }
    if (!/^(https?:|mailto:)/i.test(url)) url = url.includes('@') && !url.includes('/') ? `mailto:${url}` : `https://${url}`;
    const el = editorRef.current;
    el.focus();
    const sel = window.getSelection();
    if (savedRange.current) { sel.removeAllRanges(); sel.addRange(savedRange.current); } else placeCaretAtEnd(el);
    if (sel.isCollapsed) {
      document.execCommand('insertHTML', false, `<a href="${escapeHtml(url)}">${escapeHtml(url.replace(/^mailto:/, ''))}</a>&nbsp;`);
    } else {
      document.execCommand('createLink', false, url);
    }
    setLinkOpen(false);
    setLinkUrl('');
    syncEmpty();
  };

  // Pasted mail/web content is reduced to the same safe subset the thread renders.
  const onPaste = (e) => {
    const html = e.clipboardData?.getData('text/html');
    const text = e.clipboardData?.getData('text/plain');
    if (!html && !text) return;
    e.preventDefault();
    document.execCommand('insertHTML', false, html ? sanitizeHtml(html) : textToHtml(text));
    syncEmpty();
  };

  const loadTemplates = async () => {
    if (templates || tplLoading) return;
    setTplLoading(true);
    setTplError('');
    try {
      setTemplates(await apiFetchTicketCannedResponses(accessToken, ticketNumber));
    } catch (err) {
      setTplError(actionErrorMessage(err, 'Could not load templates') || 'You don’t have access to templates.');
    } finally {
      setTplLoading(false);
    }
  };

  const insertTemplate = (tpl) => {
    const el = editorRef.current;
    if (!el) return;
    const html = textToHtml(tpl.body || '');
    if (!el.textContent.trim()) el.innerHTML = html;
    else el.innerHTML += `<p><br></p>${html}`;
    setCannedId(tpl.id);
    syncEmpty();
    el.focus();
    placeCaretAtEnd(el);
  };

  const filteredTemplates = useMemo(() => {
    const q = tplQuery.trim().toLowerCase();
    const list = templates || [];
    if (!q) return list;
    return list.filter((t) => `${t.title} ${t.category || ''} ${t.body || ''}`.toLowerCase().includes(q));
  }, [templates, tplQuery]);

  /* Attachments */
  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const room = ATTACHMENT_MAX_FILES - attachments.filter((a) => a.status !== 'error').length;
    if (files.length > room) toast.error(`Up to ${ATTACHMENT_MAX_FILES} files per message`);
    files.slice(0, Math.max(0, room)).forEach((file) => {
      if (!ATTACHMENT_EXTS.includes(fileExt(file.name))) {
        toast.error(`${file.name}: only PNG, JPG, PDF, TXT or LOG files`);
        return;
      }
      if (file.size > ATTACHMENT_MAX_BYTES) {
        toast.error(`${file.name} is larger than 10 MB`);
        return;
      }
      const key = newIdempotencyKey();
      setAttachments((prev) => [...prev, { key, name: file.name, size: file.size, status: 'uploading' }]);
      apiUploadSupportAttachment(accessToken, file)
        .then((res) => setAttachments((prev) => prev.map((a) => (a.key === key
          ? { ...a, status: 'done', id: res.id, name: res.file_name || a.name, size: res.size_bytes ?? a.size }
          : a))))
        .catch((err) => {
          const msg = actionErrorMessage(err, 'Upload failed') || 'Not allowed';
          setAttachments((prev) => prev.map((a) => (a.key === key ? { ...a, status: 'error', error: msg } : a)));
        });
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (mode === 'reply' && !isClosed) addFiles(e.dataTransfer?.files);
  };

  /* Send reply */
  const sendReply = async (setStatus = 'awaiting_user', resolutionCode = null) => {
    const el = editorRef.current;
    const text = (el?.innerText || '').trim();
    if (!text) { toast.error('Write a reply first'); el?.focus(); return; }
    if (attachments.some((a) => a.status === 'uploading')) { toast.error('Wait for the attachments to finish uploading'); return; }
    const body = {
      body_html: sanitizeHtml(el.innerHTML),
      body_text: text,
      set_status: setStatus,
      attachment_ids: attachments.filter((a) => a.status === 'done').map((a) => a.id),
      expected_version: ticket.version,
    };
    if (resolutionCode) body.resolution_code = resolutionCode;
    if (cannedId) body.canned_response_id = cannedId;

    setSending(true);
    try {
      const res = await apiReplySupportTicket(accessToken, ticketNumber, body, idemKey.current);
      toast.success(res?.duplicate
        ? 'Already sent — no duplicate email'
        : `Reply sent to ${ticket.contact_email || ticket.user?.email || 'the user'}`);
      el.innerHTML = '';
      setIsEmpty(true);
      setAttachments([]);
      setCannedId(null);
      setResolveOpen(false);
      idemKey.current = newIdempotencyKey();
      onDone?.();
    } catch (err) {
      const msg = actionErrorMessage(err, 'Could not send the reply');
      if (msg) toast.error(msg);
      // A 4xx means nothing was stored — a fresh key keeps the next attempt from matching it.
      if (err?.status && err.status < 500) idemKey.current = newIdempotencyKey();
      if (isConflict(err)) onDone?.();
    } finally {
      setSending(false);
    }
  };

  const onEditorKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!sending) sendReply();
    }
  };

  /* Notes + @mentions */
  const mentionMatches = useMemo(() => {
    if (mentionQuery == null) return [];
    const q = mentionQuery.toLowerCase();
    return assignees
      .filter((a) => (a.name || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().startsWith(q))
      .slice(0, 6);
  }, [mentionQuery, assignees]);

  const onNoteChange = (e) => {
    const value = e.target.value;
    setNote(value);
    const before = value.slice(0, e.target.selectionStart);
    const m = /(^|\s)@([^\s@]{0,30})$/.exec(before);
    setMentionQuery(m ? m[2] : null);
    setMentionIndex(0);
  };

  const pickMention = (a) => {
    const ta = noteRef.current;
    const caret = ta?.selectionStart ?? note.length;
    const name = a.name || a.email;
    const before = note.slice(0, caret).replace(/@([^\s@]{0,30})$/, `@${name} `);
    const next = before + note.slice(caret);
    setNote(next);
    setMentions((prev) => (prev.some((p) => p.id === a.id) ? prev : [...prev, { id: a.id, name }]));
    setMentionQuery(null);
    requestAnimationFrame(() => { ta?.focus(); ta?.setSelectionRange(before.length, before.length); });
  };

  const startMention = () => {
    const ta = noteRef.current;
    const caret = ta?.selectionStart ?? note.length;
    const pad = caret > 0 && !/\s$/.test(note.slice(0, caret)) ? ' @' : '@';
    const next = note.slice(0, caret) + pad + note.slice(caret);
    setNote(next);
    setMentionQuery('');
    requestAnimationFrame(() => { ta?.focus(); ta?.setSelectionRange(caret + pad.length, caret + pad.length); });
  };

  const sendNote = async () => {
    const body = note.trim();
    if (!body) { toast.error('Write a note first'); noteRef.current?.focus(); return; }
    const ids = [...new Set(mentions.filter((m) => body.includes(`@${m.name}`)).map((m) => m.id))];
    setSending(true);
    try {
      await apiAddSupportNote(accessToken, ticketNumber, { body, mentions: ids });
      toast.success(ids.length ? `Note added · ${ids.length} teammate${ids.length === 1 ? '' : 's'} notified` : 'Internal note added');
      setNote('');
      setMentions([]);
      onDone?.();
    } catch (err) {
      const msg = actionErrorMessage(err, 'Could not add the note');
      if (msg) toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const onNoteKeyDown = (e) => {
    if (mentionMatches.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionMatches.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(mentionMatches[mentionIndex]); return; }
      if (e.key === 'Escape') { setMentionQuery(null); return; }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (!sending) sendNote(); }
  };

  const uploading = attachments.some((a) => a.status === 'uploading');
  const recipient = ticket.contact_email || ticket.user?.email;

  return (
    <div
      className={`gh-composer mode-${mode}${dragging ? ' dragging' : ''}`}
      onDragOver={(e) => { if (mode === 'reply' && !isClosed) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
      onDrop={onDrop}
    >
      <div className="gh-composer-tabs" role="tablist">
        <button
          type="button" role="tab" aria-selected={mode === 'reply'}
          className={mode === 'reply' ? 'active' : ''} onClick={() => setMode('reply')}
        >
          <MailIcon size={14} /> Reply to user
        </button>
        <button
          type="button" role="tab" aria-selected={mode === 'note'}
          className={`is-note${mode === 'note' ? ' active' : ''}`} onClick={() => setMode('note')}
        >
          <LockIcon size={14} /> Internal note
        </button>
        <span className="gh-composer-to">
          {mode === 'reply'
            ? (recipient ? <>To <strong>{recipient}</strong> · from the support address</> : 'From the support address')
            : 'Visible to admins only · never emailed'}
        </span>
      </div>

      {/* ── Reply ── */}
      <div hidden={mode !== 'reply'}>
        {isClosed ? (
          <div className="gh-composer-closed">
            <InfoIcon size={15} />
            <span>This ticket is closed. Replies are disabled — if the user replies, a follow-up ticket opens automatically. You can still add internal notes.</span>
          </div>
        ) : (
          <>
            <div className="gh-editor-toolbar">
              <button type="button" className="gh-tool" title="Bold (Ctrl+B)" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}><BoldIcon size={14} /></button>
              <button type="button" className="gh-tool" title="Italic (Ctrl+I)" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}><ItalicIcon size={14} /></button>
              <button type="button" className="gh-tool" title="Bulleted list" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }}><ListIcon size={14} /></button>
              <button type="button" className="gh-tool" title="Numbered list" onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList'); }}><ListOrderedIcon size={14} /></button>
              <button
                type="button" className={`gh-tool${linkOpen ? ' on' : ''}`} title="Insert link"
                onMouseDown={(e) => { e.preventDefault(); saveSelection(); setLinkOpen((o) => !o); }}
              >
                <LinkIcon size={14} />
              </button>
              <span className="gh-tool-sep" />
              <Menu
                width={340}
                placement="top"
                trigger={({ toggle }) => (
                  <button type="button" className="gh-tool wide" onClick={() => { loadTemplates(); toggle(); }}>
                    <TemplateIcon size={14} /> Templates <ChevronDownIcon size={11} />
                  </button>
                )}
              >
                {({ close }) => (
                  <div className="gh-tpl-menu">
                    <div className="gh-tpl-search">
                      <SearchIcon size={13} />
                      <input autoFocus value={tplQuery} onChange={(e) => setTplQuery(e.target.value)} placeholder="Search templates" />
                    </div>
                    <div className="gh-menu-scroll">
                      {tplLoading && <div className="gh-menu-empty"><Spinner /> Loading templates…</div>}
                      {tplError && <div className="gh-menu-empty">{tplError}</div>}
                      {!tplLoading && !tplError && templates && !filteredTemplates.length && (
                        <div className="gh-menu-empty">No templates for this ticket type yet.</div>
                      )}
                      {filteredTemplates.map((t) => (
                        <button key={t.id} type="button" className="gh-tpl-item" onClick={() => { insertTemplate(t); close(); }}>
                          <span className="gh-tpl-title">{t.title}{t.category && <em>{humanize(t.category)}</em>}</span>
                          <span className="gh-tpl-preview">{String(t.body || '').replace(/<[^>]+>/g, ' ').slice(0, 140)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Menu>
              <button type="button" className="gh-tool wide" title="Attach files" onClick={() => fileRef.current?.click()}>
                <PaperclipIcon size={14} /> Attach
              </button>
              <input ref={fileRef} type="file" multiple accept={ACCEPT} hidden onChange={(e) => addFiles(e.target.files)} />
              {cannedId && <span className="gh-tpl-used"><TemplateIcon size={12} /> Template inserted</span>}
            </div>

            {linkOpen && (
              <div className="gh-link-row">
                <LinkIcon size={13} />
                <input
                  autoFocus
                  value={linkUrl}
                  placeholder="https://example.com or name@example.com"
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                    if (e.key === 'Escape') setLinkOpen(false);
                  }}
                />
                <button type="button" className="gh-btn tiny primary" onClick={applyLink}>Insert</button>
                <button type="button" className="gh-icon-btn" onClick={() => setLinkOpen(false)} aria-label="Cancel"><XIcon size={12} /></button>
              </div>
            )}

            <div
              ref={editorRef}
              className={`gh-editor${isEmpty ? ' is-empty' : ''}`}
              contentEditable={!sending}
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Reply to the user"
              data-placeholder="Write your reply… (Ctrl + Enter to send)"
              onInput={syncEmpty}
              onPaste={onPaste}
              onKeyDown={onEditorKeyDown}
            />

            {attachments.length > 0 && (
              <div className="gh-upload-list">
                {attachments.map((a) => (
                  <span key={a.key} className={`gh-upload is-${a.status}`} title={a.error || a.name}>
                    {a.status === 'uploading' ? <Spinner size={12} /> : ['png', 'jpg', 'jpeg'].includes(fileExt(a.name)) ? <ImageIcon size={13} /> : <FileIcon size={13} />}
                    <span className="gh-upload-name">{a.name}</span>
                    <span className="gh-upload-size">{a.status === 'error' ? a.error : fmtBytes(a.size)}</span>
                    <button type="button" onClick={() => setAttachments((prev) => prev.filter((x) => x.key !== a.key))} aria-label={`Remove ${a.name}`}>
                      <XIcon size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="gh-composer-foot">
              <span className="gh-composer-hint">
                PNG, JPG, PDF, TXT or LOG · 10 MB each · up to {ATTACHMENT_MAX_FILES} files. Drop files here to attach.
              </span>
              <div className="gh-split">
                <button
                  type="button"
                  className="gh-btn primary gh-split-main"
                  disabled={sending || uploading || isEmpty}
                  onClick={() => sendReply('awaiting_user')}
                  title="Send and set the ticket to Awaiting user"
                >
                  {sending ? <Spinner /> : <SendIcon size={14} />} Send
                </button>
                <Menu
                  align="right"
                  placement="top"
                  width={270}
                  trigger={({ toggle }) => (
                    <button
                      type="button"
                      className="gh-btn primary gh-split-caret"
                      onClick={toggle}
                      disabled={sending || uploading || isEmpty}
                      aria-label="More send options"
                    >
                      <ChevronDownIcon size={13} />
                    </button>
                  )}
                >
                  {({ close }) => (
                    <>
                      <MenuLabel>After sending</MenuLabel>
                      {SEND_OPTIONS.map((o, i) => (
                        <div key={o.status}>
                          {i === SEND_OPTIONS.length - 1 && <MenuDivider />}
                          <MenuItem
                            hint={o.hint}
                            onSelect={() => {
                              close();
                              if (o.status === 'resolved') setResolveOpen(true);
                              else sendReply(o.status);
                            }}
                          >
                            {o.label}
                          </MenuItem>
                        </div>
                      ))}
                    </>
                  )}
                </Menu>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Internal note ── */}
      <div hidden={mode !== 'note'}>
        <div className="gh-note-wrap">
          <textarea
            ref={noteRef}
            className="gh-note-input"
            rows={4}
            value={note}
            onChange={onNoteChange}
            onKeyDown={onNoteKeyDown}
            onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
            placeholder="Add an internal note… type @ to mention a teammate (Ctrl + Enter to save)"
            aria-label="Internal note"
          />
          {mentionMatches.length > 0 && (
            <div className="gh-mention-pop" role="listbox">
              {mentionMatches.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  role="option"
                  aria-selected={i === mentionIndex}
                  className={i === mentionIndex ? 'active' : ''}
                  onMouseDown={(e) => { e.preventDefault(); pickMention(a); }}
                >
                  <Avatar name={a.name || a.email} size={22} />
                  <span><strong>{a.name || a.email}</strong><small>{a.email}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="gh-composer-foot">
          <div className="gh-note-tools">
            <button type="button" className="gh-tool wide" onClick={startMention}><AtIcon size={14} /> Mention</button>
            {mentions.filter((m) => note.includes(`@${m.name}`)).map((m) => (
              <span key={m.id} className="gh-mention-chip"><AtIcon size={11} />{m.name}</span>
            ))}
          </div>
          <button type="button" className="gh-btn note" disabled={sending || !note.trim()} onClick={sendNote}>
            {sending ? <Spinner /> : <LockIcon size={14} />} Add note
          </button>
        </div>
      </div>

      {resolveOpen && (
        <ResolveDialog
          ticketNumber={ticketNumber}
          withMessage={false}
          busy={sending}
          onCancel={() => setResolveOpen(false)}
          onConfirm={({ code }) => sendReply('resolved', code)}
        />
      )}
    </div>
  );
}
