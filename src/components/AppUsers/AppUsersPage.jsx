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

// Worklist segment → human label (for the active-filter chip).
const SEGMENT_LABELS = {
  issued_a_plan: 'Issued a plan',
  presently_using: 'Presently using',
  on_a_plan: 'Enabled',
  revoked: 'Blocked (licence)',
  stopped_using: 'Stopped using',
  never_had_a_plan: 'Not issued a plan',
  licensed_no_device: 'Licensed, no device',
  signed_out: 'Signed out',
  signed_in: 'Signed in',
  online_now: 'Online now',
  idle: 'Idle',
  expiring_7d: 'Expiring ≤7 days',
  at_device_limit: 'At device limit',
  quiet_90d: 'Quiet 90d+ review',
};
// Segments whose COUNTER includes deleted accounts the LIST can't show (short by `deleted`).
const PARTIAL_SEGMENTS = new Set(['issued_a_plan', 'stopped_using']);
const PLAN_STATE_LABELS = { expired: 'Plan expired', payment_hold: 'Payment failed', cancelled: 'Cancelled' };

// One stat row: label + number. Clickable ones filter the table; `disabled` renders the
// (deleted) row muted with no interaction; `alert` flags a tripwire (licensed_no_device > 0).
function StatRow({ label, value, level = 0, onClick, active, disabled, alert }) {
  const cls = `su-stat-row lvl-${level}${active ? ' active' : ''}${disabled ? ' disabled' : ''}${alert ? ' alert' : ''}`;
  const body = (
    <>
      <span className="su-stat-label">{label}</span>
      <span className="su-stat-val">{(value ?? 0).toLocaleString()}</span>
    </>
  );
  if (disabled) {
    return <div className={cls} title="Deleted accounts are hidden from the list by design">{body}</div>;
  }
  return (
    <button type="button" className={cls} onClick={onClick} title="Filter the list by this">{body}</button>
  );
}

// A small sub-heading for a grouped cut inside Card 1 (keeps the two 67-cuts from flattening).
function StatGroup({ children, level = 2 }) {
  return <div className={`su-stat-grouplabel lvl-${level}`}>{children}</div>;
}

export default function AppUsersPage() {
  const dispatch = useDispatch();
  const { users, total, page, pageSize, loading, error, filters, stats, statsLoading, statsError } = useSelector((s) => s.appUsers);

  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debounceRef = useRef(null);
  const [detailUserId, setDetailUserId] = useState(null);

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
    if (filters.segment) p.segment = filters.segment;
    if (filters.sort_by) p.sort_by = filters.sort_by;
    if (filters.sort_order) p.sort_order = filters.sort_order;
    p.page = filters.page;
    p.page_size = filters.page_size;
    dispatch(fetchAppUsers(p));
  }, [dispatch, filters.search, filters.status, filters.plan_type, filters.plan_status, filters.segment,
    filters.sort_by, filters.sort_order, filters.page, filters.page_size]);

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
      status: 'all', plan_type: 'all', plan_status: 'all', segment: '', search: '', page: 1,
      ...patch,
    }));
  };
  // Whether the current filters equal a given tile's filter (drives the highlight + chip).
  const isActive = (patch) => {
    if (patch.segment)     return filters.segment === patch.segment;
    if (patch.status)      return !filters.segment && filters.status === patch.status;
    if (patch.plan_type)   return !filters.segment && filters.plan_type === patch.plan_type && filters.plan_status === 'all';
    if (patch.plan_status) return !filters.segment && filters.plan_status === patch.plan_status && filters.plan_type === 'all';
    return false;
  };
  const clearAllFilters = () => { setSearchInput(''); dispatch(clearFilters()); };
  const goLiveStats = () => window.dispatchEvent(new CustomEvent('app:navigate', { detail: { page: 'home' } }));

  // Human label for the active worklist filter (shown as a removable chip by the search bar).
  const activeFilterLabel = (() => {
    if (filters.segment) return SEGMENT_LABELS[filters.segment] || filters.segment;
    if (filters.status === 'blocked') return 'Blocked';
    if (filters.plan_type === 'free') return 'Trial';
    if (filters.plan_type === 'paid') return 'Paid';
    if (filters.plan_status && filters.plan_status !== 'all') return PLAN_STATE_LABELS[filters.plan_status] || filters.plan_status;
    return null;
  })();
  // The two partial segments show fewer rows than their tile (deleted excluded) — note it on the chip.
  const deletedCount = stats?.plan_funnel?.issued_a_plan?.stopped_using?.deleted ?? 0;
  const chipNote = (PARTIAL_SEGMENTS.has(filters.segment) && deletedCount > 0)
    ? `${deletedCount} deleted not shown` : null;

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
          <div className="su-subtitle">End-user (subscriber) accounts — paginated list with filtering and sorting.</div>
        </div>
        {users.length > 0 && (
          <ExportButton
            onExportPDF={() => exportUsersToPDF(users)}
            onExportExcel={() => exportUsersToExcel(users)}
          />
        )}
      </div>

      {/* ── Stat header: context bar + three worklist cards ── */}
      {statsError ? (
        <div className="su-stats-error">Failed to load stats: {statsError}</div>
      ) : statsLoading && !stats ? (
        <div className="su-stat-skel-wrap">
          <div className="su-context-bar su-skel" />
          <div className="su-cards-row-3">
            <div className="su-statcard su-skel" />
            <div className="su-statcard su-skel" />
            <div className="su-statcard su-skel" />
          </div>
        </div>
      ) : stats && (() => {
        const pf = stats.plan_funnel || {};
        const ip = pf.issued_a_plan || {};
        const pu = ip.presently_using || {};
        const bas = pu.by_account_state || {};
        const bp = pu.by_plan || {};
        const su = ip.stopped_using || {};
        const usage = stats.usage || {};
        const at = stats.attention || {};
        const listable = pf.listable ?? 0;
        const verified = pf.verified_users ?? 0;
        const deleted = su.deleted ?? 0;
        const newWeek = stats.new_signups_7d ?? 0;
        const lndAlert = (at.licensed_no_device ?? 0) > 0;

        return (
          <>
            {/* Row 1 — context line (not a card) */}
            <div className="su-context-bar">
              <div className="su-ctx-text">
                <strong>{listable.toLocaleString()}</strong> verified users
                <span className="su-ctx-sep">·</span>
                <span className="su-ctx-new">+{newWeek.toLocaleString()} this week</span>
                {deleted > 0 && <span className="su-ctx-deleted">{deleted.toLocaleString()} deleted</span>}
              </div>
              <button type="button" className="su-ctx-link" onClick={goLiveStats}>
                View full funnel →
              </button>
            </div>

            {/* Row 2 — three cards; every number filters the table below */}
            <div className="su-cards-row-3">
              {/* Card 1 · Plan Funnel */}
              <div className="su-statcard su-statcard-funnel">
                <div className="su-statcard-head">
                  <span className="su-statcard-title">Plan Funnel</span>
                  {/* verified_users includes deleted → not clickable */}
                  <span className="su-statcard-total static" title="Includes deleted accounts — not filterable">{verified.toLocaleString()}</span>
                </div>
                <StatRow label="Not issued a plan" value={pf.not_issued_a_plan} onClick={() => applyStat({ segment: 'never_had_a_plan' })} active={isActive({ segment: 'never_had_a_plan' })} />
                <StatRow label="Issued a plan" value={ip.count} onClick={() => applyStat({ segment: 'issued_a_plan' })} active={isActive({ segment: 'issued_a_plan' })} />
                <StatRow label="Presently using" value={pu.count} level={1} onClick={() => applyStat({ segment: 'presently_using' })} active={isActive({ segment: 'presently_using' })} />
                <div className="su-stat-subgroup">
                  <StatGroup>by account state</StatGroup>
                  <StatRow label="Enabled" value={bas.enabled} level={3} onClick={() => applyStat({ segment: 'on_a_plan' })} active={isActive({ segment: 'on_a_plan' })} />
                  <StatRow label="Blocked" value={bas.blocked} level={3} onClick={() => applyStat({ segment: 'revoked' })} active={isActive({ segment: 'revoked' })} />
                  <StatGroup>by plan</StatGroup>
                  <StatRow label="Trial" value={bp.trial} level={3} onClick={() => applyStat({ plan_type: 'free' })} active={isActive({ plan_type: 'free' })} />
                  <StatRow label="Paid" value={bp.paid} level={3} onClick={() => applyStat({ plan_type: 'paid' })} active={isActive({ plan_type: 'paid' })} />
                </div>
                <StatRow label="Stopped using" value={su.count} level={1} onClick={() => applyStat({ segment: 'stopped_using' })} active={isActive({ segment: 'stopped_using' })} />
                <StatRow label="Plan expired" value={su.plan_expired} level={2} onClick={() => applyStat({ plan_status: 'expired' })} active={isActive({ plan_status: 'expired' })} />
                <StatRow label="Payment failed" value={su.payment_failed} level={2} onClick={() => applyStat({ plan_status: 'payment_hold' })} active={isActive({ plan_status: 'payment_hold' })} />
                <StatRow label="Cancelled" value={su.cancelled} level={2} onClick={() => applyStat({ plan_status: 'cancelled' })} active={isActive({ plan_status: 'cancelled' })} />
                <StatRow label="Deleted" value={su.deleted} level={2} disabled />
              </div>

              {/* Card 2 · Usage (this IS presently_using expanded) */}
              <div className="su-statcard">
                <div className="su-statcard-head">
                  <span className="su-statcard-title">Usage</span>
                  <button type="button" className="su-statcard-total" onClick={() => applyStat({ segment: 'presently_using' })} title="Filter: presently using">
                    {(usage.total ?? 0).toLocaleString()}
                  </button>
                </div>
                <StatRow label="Signed out" value={usage.signed_out} onClick={() => applyStat({ segment: 'signed_out' })} active={isActive({ segment: 'signed_out' })} />
                <StatRow label="Signed in" value={usage.signed_in} onClick={() => applyStat({ segment: 'signed_in' })} active={isActive({ segment: 'signed_in' })} />
                <StatRow label="Online now" value={usage.online_now} level={1} onClick={() => applyStat({ segment: 'online_now' })} active={isActive({ segment: 'online_now' })} />
                <StatRow label="Idle" value={usage.idle} level={1} onClick={() => applyStat({ segment: 'idle' })} active={isActive({ segment: 'idle' })} />
              </div>

              {/* Card 3 · Needs Attention (queues — rows overlap, no total) */}
              <div className="su-statcard">
                <div className="su-statcard-head">
                  <span className="su-statcard-title">Needs Attention</span>
                </div>
                <StatRow label="Expiring ≤7 days" value={at.expiring_in_7_days} onClick={() => applyStat({ segment: 'expiring_7d' })} active={isActive({ segment: 'expiring_7d' })} />
                <StatRow label="Blocked" value={at.blocked} onClick={() => applyStat({ status: 'blocked' })} active={isActive({ status: 'blocked' })} />
                <StatRow label="At device limit" value={at.at_device_limit} onClick={() => applyStat({ segment: 'at_device_limit' })} active={isActive({ segment: 'at_device_limit' })} />
                <StatRow label="Quiet 90d+ review" value={at.quiet_90d_review} onClick={() => applyStat({ segment: 'quiet_90d' })} active={isActive({ segment: 'quiet_90d' })} />
                <StatRow label="Licensed, no device" value={at.licensed_no_device} alert={lndAlert} onClick={() => applyStat({ segment: 'licensed_no_device' })} active={isActive({ segment: 'licensed_no_device' })} />
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
              {chipNote && <span className="su-filter-chip-note">{chipNote}</span>}
              <button type="button" className="su-filter-chip-x" onClick={clearAllFilters} aria-label="Clear filter">✕</button>
            </div>
          )}
        </div>

        <div className="su-toolbar-filters">
          <div className="su-filter">
            <label>Account Status</label>
            <select className="su-select" value={filters.segment ? 'all' : filters.status}
              onChange={(e) => dispatch(setFilters({ status: e.target.value, segment: '', page: 1 }))}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
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
      <div className="su-table-wrap">
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
