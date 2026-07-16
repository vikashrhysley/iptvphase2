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

function FixedTooltip({ label, children }) {
  const [pos, setPos] = useState(null);
  if (!label) return <>{children}</>;
  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <span style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y - 8,
          transform: 'translate(-50%, -100%)',
          background: 'var(--bg-raised, #1e293b)',
          color: 'var(--text-primary, #e2e8f0)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: '0.75rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          {label}
        </span>
      )}
    </span>
  );
}

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
    if (filters.trial_used !== 'all') p.trial_used = filters.trial_used === 'yes';
    if (filters.sort_by) p.sort_by = filters.sort_by;
    if (filters.sort_order) p.sort_order = filters.sort_order;
    p.page = filters.page;
    p.page_size = filters.page_size;
    dispatch(fetchAppUsers(p));
  }, [dispatch, filters.search, filters.status,
    filters.trial_used, filters.sort_by, filters.sort_order, filters.page, filters.page_size]);

  /* All hooks above — conditional render AFTER */
  if (detailUserId) {
    return <AppUserDetail userId={detailUserId} onBack={() => setDetailUserId(null)} />;
  }

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

      {/* Stats */}
      {statsLoading && <div className="su-stats-loading" />}
      {statsError && <div className="su-stats-error">Failed to load stats: {statsError}</div>}
      {stats && !statsLoading && (() => {
        const S = stats.stats || {};
        const V = stats.verification || {};
        const L = stats.license || {};
        const N = stats.new_users || {};
        const by = S;
        const total = S.total || 1;
        const countries = stats.top_countries || [];
        const maxC = Math.max(...countries.map(c => c.count), 1);
        const max30d = Math.max(N.new_30d ?? 1, 1);
        const pct = (n) => Math.min(100, Math.round(((n ?? 0) / total) * 100));

        // SVG ring helper
        const Ring = ({ value, color, size = 68, sw = 6 }) => {
          const r = (size - sw) / 2;
          const circ = 2 * Math.PI * r;
          const p = pct(value);
          return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                style={{ stroke: 'var(--border-subtle)' }} strokeWidth={sw} />
              <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={sw}
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - p / 100)}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset 0.9s ease' }}
              />
              <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize={size < 72 ? '11' : '13'} fontWeight="800" fill={color}>{p}%</text>
            </svg>
          );
        };

        return (
          <>
            {/* ── Row 1: 2 cards ── */}
            <div className="su-cards-row-2">

              {/* Card 1 · Total */}
              <div className="su-card">
                <div className="su-card-top">
                  <span className="su-card-label">Total Subscribers</span>
                  <span className="su-card-accent cyan" />
                </div>

                <div className="su-card-big">{total.toLocaleString()}</div>

                <div className="su-seg-bar">
                  <div className="su-seg c-active" style={{ flex: by.active ?? 0 }} />
                  <div className="su-seg c-blocked" style={{ flex: by.blocked ?? 0 }} />
                  <div className="su-seg c-suspended" style={{ flex: by.suspended ?? 0 }} />
                  <div className="su-seg c-inactive" style={{ flex: by.inactive ?? 0 }} />
                </div>

                <div className="su-status-chips">
                  {[
                    { cls: 'c-active', clr: '#10b981', label: 'Active', val: by.active },
                    { cls: 'c-blocked', clr: '#ef4444', label: 'Blocked', val: by.blocked },
                    { cls: 'c-suspended', clr: '#f59e0b', label: 'Suspended', val: by.suspended },
                    { cls: 'c-inactive', clr: '#64748b', label: 'Inactive', val: by.inactive },
                  ].map(({ cls, clr, label, val }) => (
                    <div className="su-chip" key={label} style={{ '--cc': clr }}>
                      <span className={`su-chip-dot ${cls}`} />
                      <div className="su-chip-body">
                        <span className="su-chip-label">{label}</span>
                        <strong className="su-chip-val">{(val ?? 0).toLocaleString()}</strong>
                      </div>
                      <span className="su-chip-pct">{pct(val)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2 · Verification */}
              <div className="su-card">
                <div className="su-card-top">
                  <span className="su-card-label">Verification</span>
                  <span className="su-card-accent violet" />
                </div>
                <div className="su-rings-row">
                  {[
                    { label: 'Email Verified', val: V.email_verified, color: '#7c3aed' },
                    { label: 'Phone Verified', val: V.phone_verified, color: '#0284c7' },
                    { label: 'Trial Used', val: L.trial_used, color: '#f59e0b' },
                  ].map(({ label, val, color }) => (
                    <div className="su-ring-item" key={label}>
                      <Ring value={val} color={color} />
                      <strong className="su-ring-val" style={{ color }}>
                        {(val ?? 0).toLocaleString()}
                      </strong>
                      <span className="su-ring-label">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ── Row 2: 3 cards ── */}
            <div className="su-cards-row-3">

              {/* Card 3 · License */}
              <div className="su-card">
                <div className="su-card-top">
                  <span className="su-card-label">License Coverage</span>
                  <span className="su-card-accent blue" />
                </div>
                <div className="su-rings-row">
                  {[
                    { label: 'Licensed', val: L.with_active_license, color: '#00d4ff', size: 80, sw: 7 },
                    { label: 'w/ Device', val: L.with_active_device, color: '#10b981', size: 80, sw: 7 },
                  ].map(({ label, val, color, size, sw }) => (
                    <div className="su-ring-item" key={label}>
                      <Ring value={val} color={color} size={size} sw={sw} />
                      <strong className="su-ring-val" style={{ color }}>
                        {(val ?? 0).toLocaleString()}
                      </strong>
                      <span className="su-ring-label">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="su-no-license">
                  <span className="su-no-license-dot" />
                  No License
                  <strong>{(L.without_license ?? 0).toLocaleString()}</strong>
                  <span className="su-no-license-pct">{pct(L.without_license)}%</span>
                </div>
              </div>

              {/* Card 4 · New Users */}
              <div className="su-card">
                <div className="su-card-top">
                  <span className="su-card-label">New Users</span>
                  <span className="su-card-accent green" />
                </div>
                <div className="su-new-hero">
                  <div>
                    <div className="su-new-big">{(N.new_24h ?? 0).toLocaleString()}</div>
                    <div className="su-new-hero-sub">registered today</div>
                  </div>
                  <div className="su-new-aside">
                    <div className="su-new-aside-item">
                      <strong>{(N.new_7d ?? 0).toLocaleString()}</strong>
                      <span>7 days</span>
                    </div>
                    <div className="su-new-aside-divider" />
                    <div className="su-new-aside-item">
                      <strong>{(N.new_30d ?? 0).toLocaleString()}</strong>
                      <span>30 days</span>
                    </div>
                  </div>
                </div>
                <div className="su-new-bars">
                  {[
                    { label: 'Today', val: N.new_24h, cls: 'today' },
                    { label: '7 Days', val: N.new_7d, cls: 'week' },
                    { label: '30 Days', val: N.new_30d, cls: 'month' },
                  ].map(({ label, val, cls }) => (
                    <div className="su-new-row" key={label}>
                      <span className="su-new-period">{label}</span>
                      <div className="su-new-track">
                        <div className={`su-new-bar ${cls}`}
                          style={{ width: `${Math.max(2, ((val ?? 0) / max30d) * 100)}%` }} />
                      </div>
                      <strong className="su-new-val">{(val ?? 0).toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 5 · Top Countries */}
              {countries.length > 0 && (
                <div className="su-card">
                  <div className="su-card-top">
                    <span className="su-card-label">Top Countries</span>
                    <span className="su-card-accent cyan" />
                  </div>
                  <div className="su-countries-bars">
                    {countries.slice(0, 6).map((c, i) => (
                      <div className="su-cty-row" key={c.country_code}>
                        <span className="su-cty-rank">#{i + 1}</span>
                        <span className="su-cty-code">{c.country_code}</span>
                        <div className="su-cty-track">
                          <div className="su-cty-fill" style={{ width: `${(c.count / maxC) * 100}%` }} />
                        </div>
                        <strong className="su-cty-count">{c.count.toLocaleString()}</strong>
                        <span className="su-cty-pct">{Math.round((c.count / total) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
        </div>

        <div className="su-toolbar-filters">
          <div className="su-filter">
            <label>Status</label>
            <select className="su-select" value={filters.status}
              onChange={(e) => dispatch(setFilters({ status: e.target.value, page: 1 }))}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="su-filter">
            <label>Trial Used</label>
            <select className="su-select" value={filters.trial_used}
              onChange={(e) => dispatch(setFilters({ trial_used: e.target.value, page: 1 }))}>
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className="su-filter">
            <label>Sort By</label>
            <select className="su-select" value={filters.sort_by}
              onChange={(e) => dispatch(setFilters({ sort_by: e.target.value, page: 1 }))}>
              <option value="created_at">Registered</option>
              <option value="last_login_at">Last Login</option>
              <option value="email">Email</option>
              <option value="full_name">Name</option>
            </select>
          </div>

          <div className="su-filter">
            <label>Order</label>
            <select className="su-select" value={filters.sort_order}
              onChange={(e) => dispatch(setFilters({ sort_order: e.target.value, page: 1 }))}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
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
                  <th {...thProps('full_name')}>
                    Name <SortIcon field="full_name" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                  </th>
                  <th {...thProps('email')}>
                    Email <SortIcon field="email" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                  </th>
                  <th>Phone</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Email Verified</th>
                  <th>Trial Used</th>
                  <th {...thProps('active_device_count')}>
                    Active Devices <SortIcon field="active_device_count" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                  </th>
                  <th>Subscriptions</th>
                  <th {...thProps('last_login_at')}>
                    Last Login <SortIcon field="last_login_at" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
                  </th>
                  <th {...thProps('created_at')}>
                    Registered <SortIcon field="created_at" sortBy={filters.sort_by} sortOrder={filters.sort_order} />
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
                      <td className="su-name su-clickable" >{u.full_name || '—'}</td>
                      <td className="su-email su-clickable" >{u.email || '—'}</td>
                      <td className="su-phone">{u.phone_number || '—'}</td>
                      <td>
                        {u.country_code
                          ? <span className="su-country">{u.country_code}</span>
                          : '—'}
                      </td>
                      <td>
                        <span className={`su-status-pill ${statusClass(u.status)}`}>
                          {u.status || '—'}
                        </span>
                      </td>
                      <td><BoolPill value={u.email_verified} yesLabel="Verified" noLabel="No" /></td>
                      <td><BoolPill value={u.trial_used} yesLabel="Yes" noLabel="No" /></td>
                      <td className="su-num">{u.active_device_count ?? '—'}</td>
                      <td className="su-num">{u.active_subscriptions_count ?? '—'}</td>
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
                    <td colSpan={11} className="su-empty">No subscribers found.</td>
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
