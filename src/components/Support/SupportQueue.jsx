// Get Help — ticket queue: saved views (with KPI counts), search / filters, table, bulk actions.
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  fetchSupportTickets, fetchSupportSummary, fetchSupportAssignees,
  setSupportFilters, resetSupportFilters, setActiveSupportTicket,
} from '../../store/slices/supportSlice';
import { apiBulkSupportTickets } from '../../services/api';
import { isPermissionDenied } from '../../services/permissionErrors';
import { AccessDenied } from '../common/PermissionDenied';
import {
  BULK_STATUSES, CATEGORY_SUGGESTIONS, PRIORITY_META, PRIORITY_ORDER, RESOLUTION_CODES, SAVED_VIEWS,
  SORT_OPTIONS, STATUS_META, STATUS_ORDER, TYPE_ORDER,
  actionErrorMessage, fmtDate, fmtDateTime, fmtNum, humanize, priorityLabel, relTime, statusLabel,
  typeLabel, useNow, useVisibleInterval,
} from './supportUtils';
import {
  Avatar, EmptyState, ErrorBanner, Field, Menu, MenuDivider, MenuItem, MenuLabel, Modal,
  PriorityBadge, PriorityBars, SkeletonLines, SlaChip, Spinner, StatusBadge,
} from './SupportUi';
import {
  AlertOctagonIcon, ArchiveIcon, CheckCircleIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon,
  ChevronRightIcon, ClockIcon, FilterIcon, HourglassIcon, InboxIcon, PauseIcon, RefreshIcon, SearchIcon,
  ShieldIcon, UserIcon, UserPlusIcon, XIcon,
} from './SupportIcons';

// Saved-view rail icon lookup (SAVED_VIEWS[].icon).
const VIEW_ICONS = {
  inbox: InboxIcon,
  user: UserIcon,
  userPlus: UserPlusIcon,
  hourglass: HourglassIcon,
  pause: PauseIcon,
  clock: ClockIcon,
  alert: AlertOctagonIcon,
  shield: ShieldIcon,
  check: CheckIcon,
  checkCircle: CheckCircleIcon,
  archive: ArchiveIcon,
};

const FILTER_KEYS = ['status', 'priority', 'ticket_type', 'category', 'assignee', 'sla_state', 'date_from', 'date_to'];
const activeFilterCount = (f) => FILTER_KEYS.filter((k) => !!f[k]).length;

// Free-text category with suggestions — commits on pick / Enter / blur, not on every keystroke.
function CategoryFilter({ value, onCommit }) {
  const [draft, setDraft] = useState(value || '');
  const commit = (v) => {
    const next = v.trim().toLowerCase();
    if (next !== (value || '')) onCommit(next);
  };
  return (
    <>
      <input
        className="gh-input"
        list="gh-category-options"
        value={draft}
        placeholder="Any category"
        onChange={(e) => {
          setDraft(e.target.value);
          if (CATEGORY_SUGGESTIONS.includes(e.target.value)) commit(e.target.value);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(draft); }}
        onBlur={() => commit(draft)}
      />
      <datalist id="gh-category-options">
        {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
      </datalist>
    </>
  );
}

/* ── Bulk dialogs ───────────────────────────────────────── */
function BulkResolveDialog({ mode, count, busy, onCancel, onConfirm }) {
  const isClose = mode === 'close';
  const [code, setCode] = useState(isClose ? 'other' : '');
  return (
    <Modal
      title={isClose ? `Close ${count} ticket${count === 1 ? '' : 's'}` : `Resolve ${count} ticket${count === 1 ? '' : 's'}`}
      subtitle={isClose
        ? 'Active tickets are resolved first, then closed. Closed is final.'
        : 'A resolution code is required to resolve a ticket.'}
      icon={isClose ? <ArchiveIcon size={18} /> : <CheckCircleIcon size={18} />}
      tone={isClose ? 'slate' : 'green'}
      onClose={onCancel}
      busy={busy}
      footer={(
        <>
          <button type="button" className="gh-btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="gh-btn primary" disabled={!code || busy} onClick={() => onConfirm(code)}>
            {busy && <Spinner />} {isClose ? 'Close tickets' : 'Resolve tickets'}
          </button>
        </>
      )}
    >
      <div className="gh-choice-list">
        {RESOLUTION_CODES.map((r) => (
          <label key={r.value} className={`gh-choice${code === r.value ? ' active' : ''}`}>
            <input type="radio" name="bulk-resolution" value={r.value} checked={code === r.value} onChange={() => setCode(r.value)} />
            <span><strong>{r.label}</strong><small>{r.hint}</small></span>
          </label>
        ))}
      </div>
    </Modal>
  );
}

function BulkResultsDialog({ result, onClose }) {
  const failed = result.results.filter((r) => !r.ok);
  return (
    <Modal
      title={`${result.label}: ${result.okCount} updated, ${failed.length} failed`}
      subtitle="Each ticket is processed on its own — the ones below were left unchanged."
      icon={<AlertOctagonIcon size={18} />}
      tone="amber"
      onClose={onClose}
      footer={<button type="button" className="gh-btn primary" onClick={onClose}>Done</button>}
    >
      <ul className="gh-result-list">
        {failed.map((r) => (
          <li key={r.ticket_number}>
            <span className="gh-mono">{r.ticket_number}</span>
            <span>{r.error || 'Could not be updated.'}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/* ── Queue ──────────────────────────────────────────────── */
export default function SupportQueue() {
  const dispatch = useDispatch();
  const accessToken = useSelector((s) => s.auth.accessToken);
  const {
    filters, tickets, total, totalPages, loading, error, summary, assignees,
  } = useSelector((s) => s.support);
  const now = useNow(30_000);

  const [searchInput, setSearchInput] = useState(filters.q || '');
  const [filtersOpen, setFiltersOpen] = useState(() => activeFilterCount(filters) > 0);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkDialog, setBulkDialog] = useState(null);     // 'resolve' | 'close'
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => { dispatch(fetchSupportTickets()); }, [dispatch, filters]);
  useEffect(() => {
    dispatch(fetchSupportSummary());
    dispatch(fetchSupportAssignees());
  }, [dispatch]);
  // Live-ish queue: refresh the list + KPI counts every minute while the tab is visible.
  useVisibleInterval(() => {
    dispatch(fetchSupportTickets());
    dispatch(fetchSupportSummary());
  }, 60_000);

  // Debounced search → filters.q
  useEffect(() => {
    if ((searchInput || '') === (filters.q || '')) return undefined;
    const t = setTimeout(() => {
      setSelected(new Set());
      dispatch(setSupportFilters({ q: searchInput.slice(0, 200), page: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput, filters.q, dispatch]);

  const updateFilters = (patch) => {
    setSelected(new Set());
    dispatch(setSupportFilters({ page: 1, ...patch }));
  };

  // Tiles and saved views are presets: they reset the filter panel so their counts line up.
  const applyPreset = (preset, { keepSearch = false } = {}) => {
    setSelected(new Set());
    if (!keepSearch) setSearchInput('');
    dispatch(resetSupportFilters({
      sort: filters.sort,
      page_size: filters.page_size,
      q: keepSearch ? filters.q : '',
      ...preset,
    }));
  };

  const clearFilters = () => updateFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])));

  const refresh = () => {
    dispatch(fetchSupportTickets());
    dispatch(fetchSupportSummary());
  };

  const openTicket = (ticketNumber) => {
    dispatch(setActiveSupportTicket(ticketNumber));
    window.scrollTo({ top: 0 });
  };

  /* Selection */
  const pageNumbers = tickets.map((t) => t.ticket_number);
  const allSelected = pageNumbers.length > 0 && pageNumbers.every((n) => selected.has(n));
  const someSelected = !allSelected && pageNumbers.some((n) => selected.has(n));
  const toggleOne = (n) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(n)) next.delete(n); else next.add(n);
    return next;
  });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(pageNumbers));

  /* Bulk */
  const runBulk = async (body, label) => {
    const numbers = [...selected].slice(0, 100);
    if (!numbers.length) return;
    setBulkBusy(true);
    try {
      const results = await apiBulkSupportTickets(accessToken, { ticket_numbers: numbers, ...body });
      const failed = results.filter((r) => !r.ok);
      const okCount = results.length ? results.length - failed.length : numbers.length;
      if (failed.length) setBulkResult({ label, results, okCount });
      else toast.success(`${label} · ${okCount} ticket${okCount === 1 ? '' : 's'} updated`);
      setSelected(new Set());
      setBulkDialog(null);
    } catch (err) {
      const msg = actionErrorMessage(err);
      if (msg) toast.error(msg);
    } finally {
      setBulkBusy(false);
      dispatch(fetchSupportTickets());
      dispatch(fetchSupportSummary());
    }
  };

  const filterCount = activeFilterCount(filters);
  const assigneeName = (id) => {
    if (id === 'me') return 'Me';
    if (id === 'unassigned') return 'Unassigned';
    return assignees.find((a) => String(a.id) === String(id))?.name || 'Admin';
  };
  const chips = [
    filters.status      && { key: 'status',      label: 'Status',   value: statusLabel(filters.status) },
    filters.priority    && { key: 'priority',    label: 'Priority', value: priorityLabel(filters.priority) },
    filters.ticket_type && { key: 'ticket_type', label: 'Type',     value: typeLabel(filters.ticket_type) },
    filters.category    && { key: 'category',    label: 'Category', value: humanize(filters.category) },
    filters.assignee    && { key: 'assignee',    label: 'Assignee', value: assigneeName(filters.assignee) },
    filters.sla_state   && { key: 'sla_state',   label: 'SLA',      value: humanize(filters.sla_state) },
    filters.date_from   && { key: 'date_from',   label: 'From',     value: fmtDate(filters.date_from) },
    filters.date_to     && { key: 'date_to',     label: 'To',       value: fmtDate(filters.date_to) },
  ].filter(Boolean);

  const page = filters.page || 1;
  const from = total ? (page - 1) * filters.page_size + 1 : 0;
  const to = Math.min(total, page * filters.page_size);

  if (error && isPermissionDenied(error)) {
    return <AccessDenied message={error} />;
  }

  // A view is a preset of { view, sla_state }; "SLA at risk" is All open narrowed to at-risk.
  const presetOf = (v) => v.preset || { view: v.id };
  const isActiveView = (v) => {
    const p = presetOf(v);
    return filters.view === p.view && (filters.sla_state || '') === (p.sla_state || '');
  };

  return (
    <div className="gh-queue">
      <div className="gh-queue-layout">
        {/* Saved views — the counts here are the KPI summary */}
        <nav className="gh-rail" aria-label="Saved views">
          <div className="gh-rail-title">Views</div>
          {SAVED_VIEWS.map((v) => {
            const Icon = VIEW_ICONS[v.icon] || InboxIcon;
            const count = v.countKey ? summary?.[v.countKey] : null;
            const active = isActiveView(v);
            return (
              <button
                key={v.id}
                type="button"
                className={`gh-rail-item${active ? ' active' : ''}${v.alert && count > 0 ? ' alert' : ''}${v.warn && count > 0 ? ' warn' : ''}`}
                onClick={() => applyPreset(presetOf(v), { keepSearch: true })}
                title={v.hint}
              >
                <Icon size={13} />
                <span className="gh-rail-label">{v.label}</span>
                {count != null && <span className="gh-rail-count">{fmtNum(count)}</span>}
              </button>
            );
          })}
          {summary?.unread > 0 && (
            <button
              type="button"
              className={`gh-rail-unread${filters.unread_only ? ' active' : ''}`}
              onClick={() => updateFilters({ unread_only: !filters.unread_only })}
            >
              <span className="gh-unread-dot" /> {fmtNum(summary.unread)} unread
            </button>
          )}
        </nav>

        <section className="gh-card gh-queue-main">
          {/* Toolbar */}
          <div className="gh-toolbar">
            <div className="gh-search">
              <SearchIcon size={13} />
              <input
                type="search"
                value={searchInput}
                maxLength={200}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search ticket no., email, name or subject"
                aria-label="Search tickets"
              />
              {searchInput && (
                <button type="button" className="gh-search-clear" onClick={() => setSearchInput('')} aria-label="Clear search">
                  <XIcon size={13} />
                </button>
              )}
            </div>
            <div className="gh-toolbar-right">
              <button
                type="button"
                className={`gh-btn subtle${filters.unread_only ? ' on' : ''}`}
                onClick={() => updateFilters({ unread_only: !filters.unread_only })}
                aria-pressed={filters.unread_only}
                title="Only tickets that are new, or where the user replied since the team last opened them"
              >
                <span className="gh-unread-dot" /> Unread
              </button>
              <button
                type="button"
                className={`gh-btn subtle${filtersOpen || filterCount ? ' on' : ''}`}
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
              >
                <FilterIcon size={12} /> Filters
                {filterCount > 0 && <span className="gh-count-pill">{filterCount}</span>}
              </button>
              <label className="gh-sort">
                <span>Sort</span>
                <select value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value })}>
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <button type="button" className="gh-icon-btn bordered" onClick={refresh} title="Refresh" aria-label="Refresh">
                <RefreshIcon size={15} className={loading ? 'gh-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {filtersOpen && (
            <div className="gh-filter-panel">
              <Field label="Status">
                <select className="gh-input" value={filters.status} onChange={(e) => updateFilters({ status: e.target.value })}>
                  <option value="">Any status</option>
                  {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select className="gh-input" value={filters.priority} onChange={(e) => updateFilters({ priority: e.target.value })}>
                  <option value="">Any priority</option>
                  {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                </select>
              </Field>
              <Field label="Type">
                <select className="gh-input" value={filters.ticket_type} onChange={(e) => updateFilters({ ticket_type: e.target.value })}>
                  <option value="">Any type</option>
                  {TYPE_ORDER.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <CategoryFilter
                  key={filters.category}
                  value={filters.category}
                  onCommit={(category) => updateFilters({ category })}
                />
              </Field>
              <Field label="Assignee">
                <select className="gh-input" value={filters.assignee} onChange={(e) => updateFilters({ assignee: e.target.value })}>
                  <option value="">Anyone</option>
                  <option value="me">Assigned to me</option>
                  <option value="unassigned">Unassigned</option>
                  {assignees.map((a) => <option key={a.id} value={a.id}>{a.name || a.email}</option>)}
                </select>
              </Field>
              <Field label="SLA">
                <select className="gh-input" value={filters.sla_state} onChange={(e) => updateFilters({ sla_state: e.target.value })}>
                  <option value="">Any SLA state</option>
                  <option value="at_risk">At risk</option>
                  <option value="breached">Breached</option>
                </select>
              </Field>
              <Field label="Created from">
                <input type="date" className="gh-input" value={filters.date_from} max={filters.date_to || undefined}
                  onChange={(e) => updateFilters({ date_from: e.target.value })} />
              </Field>
              <Field label="Created to">
                <input type="date" className="gh-input" value={filters.date_to} min={filters.date_from || undefined}
                  onChange={(e) => updateFilters({ date_to: e.target.value })} />
              </Field>
            </div>
          )}

          {chips.length > 0 && (
            <div className="gh-chips">
              {chips.map((c) => (
                <span key={c.key} className="gh-chip">
                  <span className="gh-chip-key">{c.label}:</span> {c.value}
                  <button type="button" onClick={() => updateFilters({ [c.key]: '' })} aria-label={`Remove ${c.label} filter`}>
                    <XIcon size={11} />
                  </button>
                </span>
              ))}
              <button type="button" className="gh-link-btn" onClick={clearFilters}>Clear all</button>
            </div>
          )}

          {/* Bulk bar */}
          {selected.size > 0 && (
            <div className="gh-bulkbar" role="toolbar" aria-label="Bulk actions">
              <span className="gh-bulk-count">{selected.size} selected</span>
              <Menu
                width={240}
                trigger={({ toggle }) => (
                  <button type="button" className="gh-btn subtle" onClick={toggle} disabled={bulkBusy}>
                    <UserIcon size={14} /> Assign <ChevronDownIcon size={12} />
                  </button>
                )}
              >
                {({ close }) => (
                  <div className="gh-menu-scroll">
                    <MenuItem onSelect={() => { close(); runBulk({ action: 'assign', assignee_id: 'me' }, 'Assigned to you'); }}>Assign to me</MenuItem>
                    <MenuItem onSelect={() => { close(); runBulk({ action: 'assign', assignee_id: null }, 'Unassigned'); }}>Unassign</MenuItem>
                    {assignees.length > 0 && <MenuDivider />}
                    {assignees.length > 0 && <MenuLabel>Team</MenuLabel>}
                    {assignees.map((a) => (
                      <MenuItem
                        key={a.id}
                        icon={<Avatar name={a.name || a.email} size={20} />}
                        hint={a.email}
                        onSelect={() => { close(); runBulk({ action: 'assign', assignee_id: a.id }, `Assigned to ${a.name || a.email}`); }}
                      >
                        {a.name || a.email}
                      </MenuItem>
                    ))}
                  </div>
                )}
              </Menu>
              <Menu
                width={210}
                trigger={({ toggle }) => (
                  <button type="button" className="gh-btn subtle" onClick={toggle} disabled={bulkBusy}>
                    Status <ChevronDownIcon size={12} />
                  </button>
                )}
              >
                {({ close }) => BULK_STATUSES.map((s) => (
                  <MenuItem
                    key={s}
                    icon={<span className={`gh-dot tone-${STATUS_META[s].tone}`} />}
                    onSelect={() => {
                      close();
                      if (s === 'resolved') setBulkDialog('resolve');
                      else runBulk({ action: 'status', status: s }, `Moved to ${statusLabel(s)}`);
                    }}
                  >
                    {statusLabel(s)}{s === 'resolved' ? '…' : ''}
                  </MenuItem>
                ))}
              </Menu>
              <Menu
                width={180}
                trigger={({ toggle }) => (
                  <button type="button" className="gh-btn subtle" onClick={toggle} disabled={bulkBusy}>
                    Priority <ChevronDownIcon size={12} />
                  </button>
                )}
              >
                {({ close }) => PRIORITY_ORDER.map((p) => (
                  <MenuItem
                    key={p}
                    icon={<span className={`gh-tone-text tone-${PRIORITY_META[p].tone}`}><PriorityBars priority={p} /></span>}
                    onSelect={() => { close(); runBulk({ action: 'priority', priority: p }, `Priority set to ${priorityLabel(p)}`); }}
                  >
                    {priorityLabel(p)}
                  </MenuItem>
                ))}
              </Menu>
              <button type="button" className="gh-btn subtle" onClick={() => setBulkDialog('close')} disabled={bulkBusy}>
                <ArchiveIcon size={14} /> Close…
              </button>
              {bulkBusy && <Spinner />}
              <button type="button" className="gh-link-btn gh-bulk-clear" onClick={() => setSelected(new Set())}>
                Clear selection
              </button>
            </div>
          )}

          {error && !isPermissionDenied(error) && <ErrorBanner message={error} onRetry={refresh} />}

          {/* Table */}
          <div className={`gh-table-wrap${loading && tickets.length ? ' is-refreshing' : ''}`}>
            {loading && <div className="gh-progress" />}
            {loading && !tickets.length ? (
              <SkeletonLines rows={8} height={52} />
            ) : !tickets.length ? (
              <EmptyState
                icon={<InboxIcon size={26} />}
                title={filters.q || filterCount ? 'No tickets match these filters' : 'Nothing here — inbox zero'}
                hint={filters.q || filterCount
                  ? 'Try a different search or clear the filters.'
                  : 'New help requests from Contact Us, recovery and device-limit flows land here.'}
                action={(filters.q || filterCount > 0) ? (
                  <button type="button" className="gh-btn subtle" onClick={() => { setSearchInput(''); applyPreset({ view: filters.view }); }}>
                    Clear search & filters
                  </button>
                ) : null}
              />
            ) : (
              // The ticket type sits under the subject; on narrower screens Priority folds into small
              // bars beside the ticket number, and below 760px every row becomes a stacked card.
              <table className="gh-table gh-queue-table">
                <thead>
                  <tr>
                    <th className="gh-col-check">
                      <input
                        type="checkbox"
                        className="gh-check"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={toggleAll}
                        aria-label="Select all on this page"
                      />
                    </th>
                    <th className="gh-c-ticket" title="Ticket number and when it last changed">Ticket</th>
                    <th className="gh-c-subject">Subject</th>
                    <th className="gh-c-user" title="The app user who asked for help">User</th>
                    <th className="gh-c-pri">Priority</th>
                    <th className="gh-c-status">Status</th>
                    <th className="gh-c-assignee" title="Admin handling the ticket">Assigned to</th>
                    <th className="gh-c-sla" title="Time left before the SLA deadline. Green = on track, amber = at risk, red = overdue, grey = paused while waiting on the user / on hold">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => {
                    const isSel = selected.has(t.ticket_number);
                    const requester = t.user?.name || t.contact_email || '—';
                    // "Device recovery · Device Blocked" — type first, duplicates (reason = category) dropped.
                    const about = [typeLabel(t.ticket_type), t.reason_label || humanize(t.reason), t.category && humanize(t.category)]
                      .filter((v, i, all) => v && all.findIndex((x) => x && x.toLowerCase() === v.toLowerCase()) === i)
                      .join(' · ');
                    return (
                      <tr
                        key={t.ticket_number}
                        className={`${t.is_unread ? 'is-unread' : ''}${isSel ? ' is-selected' : ''}`}
                        onClick={() => openTicket(t.ticket_number)}
                        onKeyDown={(e) => { if (e.key === 'Enter') openTicket(t.ticket_number); }}
                        tabIndex={0}
                        title={t.is_unread ? 'Unread — new, or the user replied' : undefined}
                      >
                        <td className="gh-col-check" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="gh-check"
                            checked={isSel}
                            onChange={() => toggleOne(t.ticket_number)}
                            aria-label={`Select ${t.ticket_number}`}
                          />
                        </td>
                        <td className="gh-c-ticket">
                          <div className="gh-ticket-no">
                            {t.is_unread && <span className="gh-unread-dot" />}
                            <span className="gh-mono">{t.ticket_number}</span>
                            <span
                              className={`gh-pri-inline gh-tone-text tone-${PRIORITY_META[t.priority]?.tone || 'muted'}`}
                              title={`${priorityLabel(t.priority)} priority`}
                            >
                              <PriorityBars priority={t.priority} />
                            </span>
                          </div>
                          <div className="gh-sub" title={`Opened ${fmtDateTime(t.created_at)} · last activity ${fmtDateTime(t.last_activity_at)}`}>
                            {relTime(t.last_activity_at || t.created_at, now)}
                          </div>
                        </td>
                        <td className="gh-c-subject">
                          <div className="gh-subject" title={t.subject || ''}>{t.subject || '(no subject)'}</div>
                          <div className="gh-sub" title={about}>{about || '—'}</div>
                        </td>
                        <td className="gh-c-user">
                          <div className="gh-person">
                            <Avatar name={requester} size={22} />
                            <div className="gh-person-text">
                              <div className="gh-person-name">{requester}</div>
                              <div className="gh-sub">{t.user ? (t.user.email || t.contact_email) : 'No account'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="gh-c-pri"><PriorityBadge priority={t.priority} /></td>
                        <td className="gh-c-status">
                          <StatusBadge status={t.status} />
                          {t.resolution_code && <div className="gh-sub">{humanize(t.resolution_code)}</div>}
                        </td>
                        <td className="gh-c-assignee">
                          {t.assignee
                            ? <span className="gh-assignee"><Avatar name={t.assignee.name} size={18} />{t.assignee.name}</span>
                            : <span className="gh-unassigned">Unassigned</span>}
                        </td>
                        <td className="gh-c-sla"><SlaChip sla={t.sla} now={now} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <footer className="gh-pager">
            <span className="gh-pager-info">
              {total ? <>Showing <strong>{from}–{to}</strong> of <strong>{fmtNum(total)}</strong></> : 'No tickets'}
            </span>
            <span className="gh-legend-inline" aria-label="Colour key">
              <span><span className="gh-unread-dot" /> Unread</span>
              <span><span className="gh-dot tone-green" /> On track</span>
              <span><span className="gh-dot tone-amber" /> At risk</span>
              <span><span className="gh-dot tone-red" /> Overdue</span>
              <span><span className="gh-dot tone-slate" /> Paused</span>
            </span>
            <div className="gh-pager-right">
              <label className="gh-sort">
                <span>Rows</span>
                <select value={filters.page_size} onChange={(e) => updateFilters({ page_size: Number(e.target.value) })}>
                  {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <button
                type="button" className="gh-icon-btn bordered" aria-label="Previous page"
                disabled={page <= 1 || loading}
                onClick={() => updateFilters({ page: page - 1 })}
              >
                <ChevronLeftIcon size={12} />
              </button>
              <span className="gh-pager-page">Page {page} of {totalPages}</span>
              <button
                type="button" className="gh-icon-btn bordered" aria-label="Next page"
                disabled={page >= totalPages || loading}
                onClick={() => updateFilters({ page: page + 1 })}
              >
                <ChevronRightIcon size={12} />
              </button>
            </div>
          </footer>
        </section>
      </div>

      {bulkDialog && (
        <BulkResolveDialog
          mode={bulkDialog}
          count={selected.size}
          busy={bulkBusy}
          onCancel={() => setBulkDialog(null)}
          onConfirm={(code) => (bulkDialog === 'close'
            ? runBulk({ action: 'close', resolution_code: code }, 'Closed')
            : runBulk({ action: 'status', status: 'resolved', resolution_code: code }, 'Resolved'))}
        />
      )}
      {bulkResult && <BulkResultsDialog result={bulkResult} onClose={() => setBulkResult(null)} />}
    </div>
  );
}
