import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAppUsers, fetchAppUsersStats, setFilters, clearFilters } from '../../store/slices/appUsersSlice';
import AppUserDetail from './AppUserDetail';
import './AppUsersPage.css';
import { Button } from 'react-bootstrap';
import { SquareArrowRightExit } from 'lucide-react';
/* ── Export helpers ─────────────────────────────────────── */
const EXPORT_COLS = ['Name', 'Email', 'Phone', 'Country', 'Status', 'Email Verified', 'Trial Used', 'Active Devices', 'Subscriptions', 'Last Login', 'Registered'];

const buildUserRows = (users) =>
  users.map(u => [
    u.full_name || '—',
    u.email || '—',
    u.phone_number || '—',
    u.country_code || '—',
    u.status || '—',
    u.email_verified ? 'Verified' : 'No',
    u.trial_used ? 'Yes' : 'No',
    u.active_device_count ?? '—',
    u.active_subscriptions_count ?? '—',
    u.last_login_at && u.last_login_at !== 'null'
      ? new Date(u.last_login_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—',
    u.created_at
      ? new Date(u.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—',
  ]);

const exportUsersToExcel = (users) => {
  import('xlsx').then(({ utils, writeFile }) => {
    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet([EXPORT_COLS, ...buildUserRows(users)]);
    ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 22 }];
    utils.book_append_sheet(wb, ws, 'App Users');
    writeFile(wb, `app-users-${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
};

const exportUsersToPDF = async (users) => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(15); doc.setTextColor(30, 30, 60);
  doc.text('App Users Report', pageW / 2, 14, { align: 'center' });
  doc.setFontSize(9); doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()} · ${users.length} users`, pageW / 2, 20, { align: 'center' });

  autoTable(doc, {
    startY: 26,
    head: [EXPORT_COLS],
    body: buildUserRows(users),
    theme: 'striped',
    headStyles: { fillColor: [30, 30, 60], textColor: 255, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7, textColor: [40, 40, 80] },
    alternateRowStyles: { fillColor: [245, 246, 250] },
    columnStyles: {
      0: { cellWidth: 24 }, 1: { cellWidth: 34 }, 2: { cellWidth: 22 },
      3: { cellWidth: 14 }, 4: { cellWidth: 18 }, 5: { cellWidth: 20 },
      6: { cellWidth: 16 }, 7: { cellWidth: 20 }, 8: { cellWidth: 20 },
      9: { cellWidth: 28 }, 10: { cellWidth: 28 },
    },
    margin: { left: 8, right: 8 },
  });

  doc.save(`app-users-${new Date().toISOString().slice(0, 10)}.pdf`);
};

function ExportButton({ onExportPDF, onExportExcel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="su-export-wrap" ref={ref}>
      <button className="su-export-btn" onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div className="su-export-menu">
          <button onClick={() => { onExportPDF(); setOpen(false); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            Export as PDF
          </button>
          <button onClick={() => { onExportExcel(); setOpen(false); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
            Export as Excel
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────── */
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const ChevLeft = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const SortAsc = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
  </svg>
);
const SortDesc = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
  </svg>
);
const SortNeutral = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="5 10 12 5 19 10" /><polyline points="5 14 12 19 19 14" />
  </svg>
);

/* ── Helpers ────────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso || iso === 'null') return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

const relativeTime = (iso) => {
  if (!iso || iso === 'null') return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const diff = Date.now() - date.getTime();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const unit = mins < 60 ? 'min' : hours < 24 ? 'hour' : 'day';
  const val = unit === 'min' ? mins : unit === 'hour' ? hours : days;
  return `${val} ${unit}${val !== 1 ? 's' : ''} ago`;
};

// Plan type collapses to free / paid: 'free' stays free, any other non-empty plan
// (monthly, annual, premium, …) is shown as paid; missing plan shows a dash.
const planTypeLabel = (type) => {
  if (type == null || type === '') return '—';
  return String(type).toLowerCase() === 'free' ? 'Free' : 'Paid';
};

const statusClass = (s) => {
  if (s === 'active') return 'active';
  if (s === 'blocked') return 'blocked';
  if (s === 'suspended') return 'suspended';
  if (s === 'inactive') return 'inactive';
  if (s === 'pending') return 'pending';
  if (s === 'deleted') return 'deleted';
  return 'unknown';
};

/* ── Sub-components ─────────────────────────────────────── */
function BoolPill({ value, yesLabel = 'Yes', noLabel = 'No' }) {
  return (
    <span className={`su-bool-pill ${value ? 'yes' : 'no'}`}>
      {value ? <CheckIcon /> : <XIcon />}
      <span>{value ? yesLabel : noLabel}</span>
    </span>
  );
}

function SortIcon({ field, sortBy, sortOrder }) {
  if (sortBy !== field) return <span className="su-sort-neutral"><SortNeutral /></span>;
  return (
    <span className="su-sort-active">
      {sortOrder === 'asc' ? <SortAsc /> : <SortDesc />}
    </span>
  );
}

function Pagination({ current, totalPages, totalItems, pageSize, onPage }) {
  if (!totalItems) return null;
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, totalItems);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - current) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push(`e${p}`);
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="su-pagination">
      <span className="su-dp-info">
        Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{totalItems}</strong> users
      </span>
      <div className="su-dp-controls">
        <button className="su-dp-nav" onClick={() => onPage(Math.max(1, current - 1))} disabled={current === 1}>
          <ChevLeft /> Previous
        </button>
        <div className="su-dp-pages">
          {pages.map((p) =>
            typeof p === 'string'
              ? <span key={p} className="su-dp-ellipsis">…</span>
              : (
                <button key={p} className={`su-dp-page${p === current ? ' active' : ''}`} onClick={() => onPage(p)}>
                  {p}
                </button>
              )
          )}
        </div>
        <button className="su-dp-nav" onClick={() => onPage(Math.min(totalPages, current + 1))} disabled={current === totalPages}>
          Next <ChevRight />
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
const SORTABLE = ['active_device_count', 'last_login_at', 'created_at', 'email', 'full_name'];

// The plan card — data.breakdown, 8 flat rows in exactly the declared API order (build guide
// §4.1). These do NOT sum to anything: issued_a_plan already contains the six state rows
// after it, which is exactly why the card renders no heading and no total (§3.1, §9).
const BREAKDOWN_ROWS = [
  { key: 'issued_a_plan',     label: 'Issued a plan Users' },
  { key: 'not_issued_a_plan', label: 'Not issued a plan Users' },
  { key: 'enabled',           label: 'Enabled Users' },
  { key: 'blocked',           label: 'Blocked Users' },
  { key: 'payment_failed',    label: 'Payment failed Users' },
  { key: 'plan_expired',      label: 'Plan expired Users' },
  { key: 'cancelled',         label: 'Cancelled Users' },
  { key: 'deleted',           label: 'Deleted Users' },
];
// The hero's verified / never-verified split lives on total_traffic_till_date, not in
// breakdown — it moved up to the context bar (build guide §2.2).
const HERO_STATE_LABELS = { verified: 'Verified', never_verified: 'Unverified' };
const ACCOUNT_STATE_LABELS = {
  ...HERO_STATE_LABELS,
  ...BREAKDOWN_ROWS.reduce((m, r) => ({ ...m, [r.key]: r.label }), {}),
};

// USAGE card — present-tense rows over live, verified accounts whose plan is still on the books.
const USAGE_ROWS = [
  { key: 'signed_out', label: 'Logout',     level: 0 },
  { key: 'signed_in',  label: 'Login',      level: 0 },
  { key: 'online_now', label: 'Online now', level: 1 },
  { key: 'idle',       label: 'Idle',       level: 1 },
];
// USAGE card's `segment` click-through → human label (for the active-filter chip).
const SEGMENT_LABELS = {
  presently_using: 'Presently using',
  signed_out: 'Logout',
  signed_in: 'Login',
  online_now: 'Online now',
  idle: 'Idle',
};
const PLAN_STATE_LABELS = { expired: 'Plan expired', payment_hold: 'Payment failed', cancelled: 'Cancelled' };

// One stat row: label + proportional bar + number. `alert` flags the not_issued_a_plan tripwire.
function StatRow({ label, value, level = 0, onClick, active, alert, barPct }) {
  const cls = `su-stat-row lvl-${level}${active ? ' active' : ''}${alert ? ' alert' : ''}`;
  return (
    <button type="button" className={cls} onClick={onClick} title="Filter the list by this">
      <span className="su-stat-label">{label}</span>
      {barPct != null && (
        <span className="su-stat-bar-track">
          <span className="su-stat-bar-fill" style={{ width: `${Math.min(100, Math.max(0, barPct))}%` }} />
        </span>
      )}
      <span className="su-stat-val">{(value ?? 0).toLocaleString()}</span>
    </button>
  );
}


export default function AppUsersPage() {
  const dispatch = useDispatch();
  const { users, total, page, pageSize, loading, error, filters, stats, statsLoading, statsError } = useSelector((s) => s.appUsers);

  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debounceRef = useRef(null);
  const tableRef = useRef(null);
  // Open a specific user when navigated here with intent (e.g. from the Device Detail page's
  // Current Owner card) — same sessionStorage pending-open pattern as the Plans page.
  const [detailUserId, setDetailUserId] = useState(() => {
    const pending = sessionStorage.getItem('openUserId');
    if (pending) { sessionStorage.removeItem('openUserId'); return pending; }
    return null;
  });

  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 1)));

  useEffect(() => { dispatch(fetchAppUsersStats()); }, [dispatch]);

  /* Debounce search → setFilters */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch(setFilters({ search: searchInput.trim(), page: 1 }));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput, dispatch]);

  /* Fetch on filter change */
  useEffect(() => {
    const p = {};
    if (filters.search) p.search = filters.search;
    if (filters.status !== 'all') p.status = filters.status;
    if (filters.plan_type && filters.plan_type !== 'all') p.plan_type = filters.plan_type;
    if (filters.plan_status && filters.plan_status !== 'all') p.plan_status = filters.plan_status;
    if (filters.account_state) p.account_state = filters.account_state;
    if (filters.segment) p.segment = filters.segment;
    if (filters.sort_by) p.sort_by = filters.sort_by;
    if (filters.sort_order) p.sort_order = filters.sort_order;
    p.page = filters.page;
    p.page_size = filters.page_size;
    dispatch(fetchAppUsers(p));
  }, [dispatch, filters.search, filters.status, filters.plan_type, filters.plan_status, filters.account_state,
    filters.segment, filters.sort_by, filters.sort_order, filters.page, filters.page_size]);

  /* All hooks above — conditional render AFTER */
  if (detailUserId) {
    return (
      <AppUserDetail
        userId={detailUserId}
        onBack={() => { setDetailUserId(null); dispatch(fetchAppUsersStats()); }}
      />
    );
  }

  // A stat-tile click resets the filter set to exactly this tile's filter, so the list's
  // meta.total matches the number shown (the tile→count contract from the guide).
  const applyStat = (patch) => {
    setSearchInput('');
    dispatch(setFilters({
      status: 'all', plan_type: 'all', plan_status: 'all', account_state: '', segment: '', search: '', page: 1,
      ...patch,
    }));
    // Filtering happens above the fold; jump the reader down to the table so the filtered
    // rows are actually visible instead of silently changing off-screen.
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  // Whether the current filters equal a given tile's filter (drives the highlight + chip).
  const isActive = (patch) => {
    if (patch.account_state !== undefined) return filters.account_state === patch.account_state;
    if (patch.segment)     return filters.segment === patch.segment;
    if (patch.plan_type)   return !filters.segment && !filters.account_state && filters.plan_type === patch.plan_type && filters.plan_status === 'all';
    if (patch.plan_status) return !filters.segment && !filters.account_state && filters.plan_status === patch.plan_status && filters.plan_type === 'all';
    return false;
  };
  const clearAllFilters = () => { setSearchInput(''); dispatch(clearFilters()); };

  // Human label for the active worklist filter (shown as a removable chip by the search bar).
  const activeFilterLabel = (() => {
    if (filters.account_state) return ACCOUNT_STATE_LABELS[filters.account_state] || filters.account_state;
    if (filters.segment) return SEGMENT_LABELS[filters.segment] || filters.segment;
    if (filters.plan_type === 'free') return 'Trial';
    if (filters.plan_type === 'paid') return 'Paid';
    if (filters.plan_status && filters.plan_status !== 'all') return PLAN_STATE_LABELS[filters.plan_status] || filters.plan_status;
    return null;
  })();

  const handleSort = (field) => {
    if (!SORTABLE.includes(field)) return;
    if (filters.sort_by === field) {
      dispatch(setFilters({ sort_order: filters.sort_order === 'asc' ? 'desc' : 'asc', page: 1 }));
    } else {
      dispatch(setFilters({ sort_by: field, sort_order: 'desc', page: 1 }));
    }
  };

  const thProps = (field) => ({
    className: `${SORTABLE.includes(field) ? 'su-th-sort' : ''}${filters.sort_by === field ? ' su-th-active' : ''}`,
    onClick: SORTABLE.includes(field) ? () => handleSort(field) : undefined,
  });

  return (
    <div className="su-page">
      <div className="su-header">
        <div>
          <h1 className="su-title">App Users</h1>
        </div>
        {users.length > 0 && (
          <ExportButton
            onExportPDF={() => exportUsersToPDF(users)}
            onExportExcel={() => exportUsersToExcel(users)}
          />
        )}
      </div>

      {/* ── Stat header: context bar + PLAN FUNNEL / USAGE, 70/30 ── */}
      {statsError ? (
        <div className="su-stats-error">Failed to load stats: {statsError}</div>
      ) : statsLoading && !stats ? (
        <div className="su-stat-skel-wrap">
          <div className="su-context-bar su-skel" />
          <div className="su-cards-app-row">
            <div className="su-statcard su-skel su-statcard-funnel" />
            <div className="su-statcard su-skel su-statcard-usage" />
          </div>
        </div>
      ) : stats && (() => {
        // total_traffic_till_date is an OBJECT now — {count, verified, never_verified} —
        // not a plain number (build guide §2.2, §10 migration checklist).
        const hero = stats.total_traffic_till_date || {};
        const count = hero.count ?? 0;
        const verified = hero.verified ?? 0;
        const neverVerified = hero.never_verified ?? 0;
        const bd = stats.breakdown || {};
        const usage = stats.usage || {};
        const signals = stats.signals || {};
        const notIssuedAlert = (bd.not_issued_a_plan ?? 0) > 0;

        // Tripwires, free of charge (build guide §2.1). Only the hero split and the usage
        // identities hold unconditionally — DO NOT assert the breakdown rows against each
        // other or against the hero: issued_a_plan contains the six state rows after it
        // (they total 165, not 95), and verified vs. issued_a_plan+not_issued_a_plan can
        // legitimately drift (an account blocked before it ever activated).
        if (import.meta.env.DEV) {
          const heroSum = verified + neverVerified;
          console.assert(heroSum === count, `[AppUsers] verified+never_verified (${heroSum}) != total_traffic_till_date.count (${count})`);
          const usageSum = (usage.signed_out ?? 0) + (usage.signed_in ?? 0);
          console.assert(usageSum === (usage.total ?? 0), `[AppUsers] usage signed_out+signed_in (${usageSum}) != usage.total (${usage.total})`);
          const signedInSum = (usage.online_now ?? 0) + (usage.idle ?? 0);
          console.assert(signedInSum === (usage.signed_in ?? 0), `[AppUsers] usage online_now+idle (${signedInSum}) != usage.signed_in (${usage.signed_in})`);
          if ((signals.licensed_no_device ?? 0) > 0) {
            console.warn(`[AppUsers] licensed_no_device tripwire is non-zero: ${signals.licensed_no_device}`);
          }
        }

        return (
          <>
            {/* Row 1 — context line (not a card). Hero + its verified/never-verified split —
                all three are independently clickable (build guide §3.3, §4). */}
            <div className="su-context-bar">
              <div className="su-ctx-text">
                <button type="button" className="su-ctx-hero" onClick={() => applyStat({ account_state: '' })} title="Filter: all">
                  <strong>{count.toLocaleString()}</strong> total traffic till date
                </button>
                <span className="su-ctx-sep">·</span>
                <button
                  type="button"
                  className={`su-ctx-split-btn${isActive({ account_state: 'verified' }) ? ' active' : ''}`}
                  onClick={() => applyStat({ account_state: 'verified' })}
                >
                  {verified.toLocaleString()} verified
                </button>
                <span className="su-ctx-sep">·</span>
                <button
                  type="button"
                  className={`su-ctx-split-btn${isActive({ account_state: 'never_verified' }) ? ' active' : ''}`}
                  onClick={() => applyStat({ account_state: 'never_verified' })}
                >
                  {neverVerified.toLocaleString()} Unverified
                </button>
              </div>
            </div>

            {/* Row 2 — two cards, 70/30; every number filters the table below */}
            <div className="su-cards-app-row">
              {/* Card A · the plan card — data.breakdown, 8 flat rows. Deliberately NO heading
                  and NO total (build guide §3.1, §9): the rows overlap (issued_a_plan contains
                  the six after it), so any number placed above them would be wrong. Bars scale
                  to `verified`, not `count` — never-verified accounts aren't in this population. */}
              <div className="su-statcard su-statcard-funnel">
                {BREAKDOWN_ROWS.map((row) => (
                  <StatRow
                    key={row.key}
                    label={row.label}
                    value={bd[row.key]}
                    alert={row.key === 'not_issued_a_plan' ? notIssuedAlert : undefined}
                    barPct={verified > 0 ? ((bd[row.key] ?? 0) / verified) * 100 : 0}
                    onClick={() => applyStat({ account_state: row.key })}
                    active={isActive({ account_state: row.key })}
                  />
                ))}
              </div>

              {/* Card B · Usage — data.usage, live verified accounts whose plan is still on the books */}
              <div className="su-statcard su-statcard-usage">
                <div className="su-statcard-head">
                  <span className="su-statcard-title">Usage</span>
                  <button type="button" className="su-statcard-total" onClick={() => applyStat({ segment: 'presently_using' })} title="Filter: presently using">
                    {(usage.total ?? 0).toLocaleString()}
                  </button>
                </div>
                {USAGE_ROWS.map((row) => (
                  <StatRow
                    key={row.key}
                    label={row.label}
                    value={usage[row.key]}
                    level={row.level}
                    barPct={usage.total > 0 ? ((usage[row.key] ?? 0) / usage.total) * 100 : 0}
                    onClick={() => applyStat({ segment: row.key })}
                    active={isActive({ segment: row.key })}
                  />
                ))}
              </div>
            </div>
          </>
        );
      })()}
      {/* Toolbar */}
      <div className="su-toolbar">
        <div className="su-search-wrap">
          <label>Search</label>
          <div className="su-search-input-wrap">
            <SearchIcon />
            <input
              className="su-search-input"
              type="text"
              placeholder="Search by email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          {activeFilterLabel && (
            <div className="su-filter-chip" title="Active filter — click ✕ to clear">
              <span className="su-filter-chip-label">{activeFilterLabel}</span>
              <button type="button" className="su-filter-chip-x" onClick={clearAllFilters} aria-label="Clear filter">✕</button>
            </div>
          )}
        </div>

        <div className="su-toolbar-filters">
          <div className="su-filter">
            <label>Account State</label>
            <select className="su-select" value={filters.account_state || 'all'}
              onChange={(e) => dispatch(setFilters({ account_state: e.target.value === 'all' ? '' : e.target.value, segment: '', page: 1 }))}>
              <option value="all">All</option>
              {BREAKDOWN_ROWS.map((row) => <option key={row.key} value={row.key}>{row.label}</option>)}
            </select>
          </div>

          <div className="su-filter">
            <label>Plan Type</label>
            <select className="su-select" value={filters.segment ? 'all' : (filters.plan_type || 'all')}
              onChange={(e) => dispatch(setFilters({ plan_type: e.target.value, segment: '', page: 1 }))}>
              <option value="all">All</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="su-filter">
            <label>Plan Status</label>
            <select className="su-select" value={filters.segment ? 'all' : (filters.plan_status || 'all')}
              onChange={(e) => dispatch(setFilters({ plan_status: e.target.value, segment: '', page: 1 }))}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="payment_hold">Payment Hold</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="su-table-wrap" ref={tableRef}>
        {loading && !users.length ? (
          <div className="su-loading-wrap">Loading subscribers…</div>
        ) : error ? (
          <div className="su-error-wrap">{error}</div>
        ) : (
          <div className="su-table-scroll">
            <table className="su-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th {...thProps('email')}>
                    Email <SortIcon field="email" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                  </th>
                  <th>User Status</th>
                  <th>Plan Type</th>
                  <th>Plan Name</th>
                  <th {...thProps('active_device_count')}>
                    Device Active/Max <SortIcon field="active_device_count" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                  </th>
                  <th {...thProps('last_login_at')}>
                    Last Login <SortIcon field="last_login_at" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                  </th>
                  <th {...thProps('created_at')}>
                    Created <SortIcon field="created_at" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length ? (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => setDetailUserId(u.id)}
                          style={{ fontSize: "11px" }}
                          className="d-flex align-items-center gap-1 text-light py-1 fw-bold"
                        >
                          View
                          <SquareArrowRightExit size={15} />
                        </Button>
                      </td>
                      <td className="su-email su-clickable">
                        <div className="su-email-cell">
                          <span className="su-email-addr">{u.email || '—'}</span>
                          <BoolPill value={u.email_verified} yesLabel="Verified" noLabel="Unverified" />
                        </div>
                      </td>
                      <td>
                        <span className={`su-status-pill ${statusClass(u.status)}`}>
                          {u.status || '—'}
                        </span>
                      </td>
                      <td>{planTypeLabel(u.plan?.type)}</td>
                      <td>
                        <div className="su-plan-cell">
                          <span>{u.plan?.name || '—'}</span>
                          {u.plan?.state && u.plan.state !== 'none' && (
                            <span className={`su-plan-state ${statusClass(u.plan.state)}`}>{u.plan.state}</span>
                          )}
                        </div>
                      </td>
                      <td className="su-num">
                        {u.devices?.active ?? '—'}{u.devices?.max != null ? ` / ${u.devices.max}` : ''}
                      </td>
                      <td>
                        <div>{relativeTime(u.last_login_at)}</div>
                        {u.last_login_at && u.last_login_at !== 'null' && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {fmtDate(u.last_login_at)}
                          </div>
                        )}
                      </td>
                      <td title={fmtDate(u.created_at)}>{fmtDate(u.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="su-empty">No subscribers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <Pagination
            current={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={pageSize}
            onPage={(p) => dispatch(setFilters({ page: p }))}
          />
        )}
      </div>
    </div>
  );
}
