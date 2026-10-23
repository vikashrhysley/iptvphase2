// Get Help — canned responses (reply templates) manager.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  apiCreateCannedResponse, apiDeleteCannedResponse, apiFetchCannedResponses, apiUpdateCannedResponse,
} from '../../services/api';
import { isPermissionDenied } from '../../services/permissionErrors';
import { AccessDenied } from '../common/PermissionDenied';
import {
  CATEGORY_SUGGESTIONS, PLACEHOLDERS, PLACEHOLDER_SAMPLES, TYPE_ORDER,
  actionErrorMessage, fmtNum, humanize, relTime, sanitizeHtml, textToHtml, typeLabel, useNow,
} from './supportUtils';
import { Badge, EmptyState, ErrorBanner, Field, Modal, SkeletonLines, Spinner, Switch } from './SupportUi';
import { EditIcon, PlusIcon, RefreshIcon, SearchIcon, TemplateIcon, TrashIcon, XIcon, ZapIcon } from './SupportIcons';

const fillSamples = (body) => PLACEHOLDERS.reduce((s, ph) => s.split(ph).join(PLACEHOLDER_SAMPLES[ph]), String(body || ''));

function TemplateEditor({ initial, busy, onCancel, onSave }) {
  const isNew = !initial?.id;
  const [form, setForm] = useState(() => ({
    title: initial?.title || '',
    body: initial?.body || '',
    ticket_type: initial?.ticket_type || '',
    category: initial?.category || '',
    is_active: initial?.is_active ?? true,
  }));
  const bodyRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const insertPlaceholder = (ph) => {
    const ta = bodyRef.current;
    const start = ta?.selectionStart ?? form.body.length;
    const end = ta?.selectionEnd ?? form.body.length;
    const next = form.body.slice(0, start) + ph + form.body.slice(end);
    if (next.length > 20000) return;
    set('body', next);
    requestAnimationFrame(() => { ta?.focus(); ta?.setSelectionRange(start + ph.length, start + ph.length); });
  };

  const preview = useMemo(() => sanitizeHtml(textToHtml(fillSamples(form.body))), [form.body]);
  const titleError = form.title.trim() ? '' : 'A title is required.';
  const bodyError = form.body.trim() ? '' : 'The template body is required.';

  const submit = () => {
    if (titleError || bodyError) return;
    const data = {
      title: form.title.trim(),
      body: form.body,
      ticket_type: form.ticket_type || null,
      category: form.category.trim() || null,
      is_active: form.is_active,
    };
    onSave(data);
  };

  return (
    <Modal
      title={isNew ? 'New reply template' : 'Edit reply template'}
      subtitle="Insert it from the composer, then edit before sending."
      icon={<TemplateIcon size={18} />}
      tone="violet"
      width={820}
      onClose={onCancel}
      busy={busy}
      footer={(
        <>
          <button type="button" className="gh-btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="gh-btn primary" onClick={submit} disabled={busy || !!titleError || !!bodyError}>
            {busy && <Spinner />} {isNew ? 'Create template' : 'Save changes'}
          </button>
        </>
      )}
    >
      <div className="gh-tpl-editor">
        <div className="gh-tpl-form">
          <Field label="Title" required counter={`${form.title.length}/120`}>
            <input className="gh-input" maxLength={120} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Device unblocked — all set" autoFocus />
          </Field>
          <div className="gh-field-row">
            <Field label="Ticket type" hint="Leave as Any to offer it on every ticket.">
              <select className="gh-input" value={form.ticket_type} onChange={(e) => set('ticket_type', e.target.value)}>
                <option value="">Any type</option>
                {TYPE_ORDER.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <input className="gh-input" list="gh-tpl-categories" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Optional" />
              <datalist id="gh-tpl-categories">{CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
          </div>
          <Field label="Body" required counter={`${fmtNum(form.body.length)}/20,000`}>
            <div className="gh-ph-row">
              <span className="gh-ph-label"><ZapIcon size={12} /> Insert</span>
              {PLACEHOLDERS.map((ph) => (
                <button key={ph} type="button" className="gh-ph-chip" onClick={() => insertPlaceholder(ph)}>{ph}</button>
              ))}
            </div>
            <textarea
              ref={bodyRef}
              className="gh-input gh-tpl-body"
              rows={11}
              maxLength={20000}
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder={'Hi {{user_name}},\n\nGood news — we\'ve unblocked {{device_name}}. You can sign in again now.\n\nThanks,\nSupport'}
            />
          </Field>
          <Switch checked={form.is_active} onChange={(v) => set('is_active', v)} label="Active" hint="Inactive templates are hidden from the composer." />
        </div>
        <div className="gh-tpl-preview-pane">
          <div className="gh-tpl-preview-title">Preview <span>with sample values</span></div>
          {form.body.trim()
            ? <div className="gh-msg-body is-html" dangerouslySetInnerHTML={{ __html: preview }} />
            : <div className="gh-muted">Start typing to see how the reply will read.</div>}
        </div>
      </div>
    </Modal>
  );
}

export default function SupportTemplates() {
  const accessToken = useSelector((s) => s.auth.accessToken);
  const now = useNow(60_000);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);   // {} for new, item for edit
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(() => apiFetchCannedResponses(accessToken, {
    ticket_type: typeFilter || undefined,
    include_inactive: includeInactive ? 'true' : undefined,
  })
    .then((list) => { setItems(list); setError(null); })
    .catch((err) => setError(err))
    .finally(() => setLoading(false)), [accessToken, typeFilter, includeInactive]);

  useEffect(() => { load(); }, [load]);

  const reload = () => {
    setLoading(true);
    load();
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((t) => `${t.title} ${t.body} ${t.category || ''}`.toLowerCase().includes(q));
  }, [items, query]);

  const save = async (data) => {
    setBusy(true);
    try {
      if (editing?.id) {
        await apiUpdateCannedResponse(accessToken, editing.id, data);
        toast.success('Template updated');
      } else {
        await apiCreateCannedResponse(accessToken, data);
        toast.success('Template created');
      }
      setEditing(null);
      load();
    } catch (err) {
      const msg = actionErrorMessage(err, 'Could not save the template');
      if (msg) toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (t, next) => {
    setTogglingId(t.id);
    setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: next } : x)));
    try {
      await apiUpdateCannedResponse(accessToken, t.id, { is_active: next });
      toast.success(next ? 'Template activated' : 'Template deactivated');
      if (!includeInactive && !next) load();
    } catch (err) {
      setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: !next } : x)));
      const msg = actionErrorMessage(err, 'Could not update the template');
      if (msg) toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await apiDeleteCannedResponse(accessToken, deleting.id);
      toast.success('Template deleted');
      setDeleting(null);
      load();
    } catch (err) {
      const msg = actionErrorMessage(err, 'Could not delete the template');
      if (msg) toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (error && isPermissionDenied(error)) return <AccessDenied message={error.message} />;

  return (
    <div className="gh-templates">
      <div className="gh-card gh-tpl-toolbar">
        <div className="gh-search">
          <SearchIcon size={15} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates" aria-label="Search templates" />
          {query && <button type="button" className="gh-search-clear" onClick={() => setQuery('')} aria-label="Clear search"><XIcon size={13} /></button>}
        </div>
        <select className="gh-input gh-w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by ticket type">
          <option value="">All ticket types</option>
          {TYPE_ORDER.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
        </select>
        <Switch checked={includeInactive} onChange={setIncludeInactive} label="Show inactive" />
        <span className="gh-spacer" />
        <button type="button" className="gh-icon-btn bordered" onClick={reload} title="Refresh" aria-label="Refresh templates">
          <RefreshIcon size={15} className={loading ? 'gh-spin' : ''} />
        </button>
        <button type="button" className="gh-btn primary" onClick={() => setEditing({})}>
          <PlusIcon size={14} /> New template
        </button>
      </div>

      {error && <ErrorBanner message={error.message || 'Could not load templates.'} onRetry={reload} />}

      {loading && !items.length ? (
        <div className="gh-tpl-grid">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="gh-card"><SkeletonLines rows={3} height={22} /></div>)}
        </div>
      ) : !visible.length ? (
        <div className="gh-card">
          <EmptyState
            icon={<TemplateIcon size={26} />}
            title={query ? 'No templates match your search' : 'No reply templates yet'}
            hint={query ? 'Try another word.' : 'Templates save time on the replies you send most. Placeholders like {{user_name}} fill in automatically.'}
            action={!query && (
              <button type="button" className="gh-btn primary" onClick={() => setEditing({})}><PlusIcon size={14} /> Create your first template</button>
            )}
          />
        </div>
      ) : (
        <div className="gh-tpl-grid">
          {visible.map((t) => (
            <article key={t.id} className={`gh-card gh-tpl-card${t.is_active === false ? ' inactive' : ''}`}>
              <header>
                <h4 title={t.title}>{t.title}</h4>
                <Switch
                  checked={t.is_active !== false}
                  disabled={togglingId === t.id}
                  onChange={(v) => toggleActive(t, v)}
                />
              </header>
              <div className="gh-tpl-tags">
                <Badge tone={t.ticket_type ? 'blue' : 'muted'}>{t.ticket_type ? typeLabel(t.ticket_type) : 'Any type'}</Badge>
                {t.category && <Badge tone="violet">{humanize(t.category)}</Badge>}
                {t.is_active === false && <Badge tone="slate">Inactive</Badge>}
              </div>
              <p className="gh-tpl-body-preview">{String(t.body || '').replace(/<[^>]+>/g, ' ')}</p>
              <footer>
                <span className="gh-sub">Used {fmtNum(t.usage_count ?? 0)}× · updated {relTime(t.updated_at || t.created_at, now)}</span>
                <span className="gh-tpl-actions">
                  <button type="button" className="gh-icon-btn" onClick={() => setEditing(t)} title="Edit" aria-label={`Edit ${t.title}`}><EditIcon size={14} /></button>
                  <button type="button" className="gh-icon-btn danger" onClick={() => setDeleting(t)} title="Delete" aria-label={`Delete ${t.title}`}><TrashIcon size={14} /></button>
                </span>
              </footer>
            </article>
          ))}
        </div>
      )}

      {editing && <TemplateEditor initial={editing} busy={busy} onCancel={() => setEditing(null)} onSave={save} />}
      {deleting && (
        <Modal
          title="Delete template?"
          subtitle={deleting.title}
          icon={<TrashIcon size={18} />}
          tone="red"
          onClose={() => setDeleting(null)}
          busy={busy}
          footer={(
            <>
              <button type="button" className="gh-btn ghost" onClick={() => setDeleting(null)} disabled={busy}>Cancel</button>
              <button type="button" className="gh-btn danger" onClick={remove} disabled={busy}>{busy && <Spinner />} Delete</button>
            </>
          )}
        >
          <p className="gh-dialog-text">
            It will no longer be offered in the composer. Replies already sent with it are not affected.
            {deleting.is_active !== false && ' To keep it for later, deactivate it instead.'}
          </p>
        </Modal>
      )}
    </div>
  );
}
