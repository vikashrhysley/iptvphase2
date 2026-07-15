import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRevenueAnalytics, setRevenueFilters, clearRevenueFilters, fetchUserAnalytics, setUsersFilters, clearUsersFilters, fetchDeviceAnalytics, fetchLicenseAnalytics, fetchFunnelAnalytics, setFunnelFilters, clearFunnelFilters, fetchChurnAnalytics, setChurnFilters, clearChurnFilters, fetchRiskAnalytics, setRiskFilters, clearRiskFilters, fetchSecurityAnalytics, setSecurityFilters, clearSecurityFilters, fetchGeoAnalytics, setGeoLimit, fetchSystemAnalytics } from '../../store/slices/analyticsSlice';
import SecurityEventsPage from '../Security/SecurityEventsPage';
import './AnalyticsPage.css';

/* ── Export helpers ─────────────────────────────────────── */
const fmtCentsRaw = (cents) =>
  `$${((cents ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const buildRevenueAnalyticsRows = (revenue) => {
  const summary = [
    ['Total Revenue',    revenue?.total_revenue_display ?? fmtCentsRaw(revenue?.total_revenue_cents)],
    ['MRR',             revenue?.mrr_display ?? fmtCentsRaw(revenue?.mrr_cents)],
    ['Revenue Growth',  `${revenue?.revenue_growth_pct ?? 0}%`],
    ['Total Refunds',   fmtCentsRaw(revenue?.total_refunds_cents)],
  ];
  const daily = (revenue?.daily || []).map(d => [
    d.date,
    fmtCentsRaw(d.revenue_cents),
    fmtCentsRaw(d.refunds_cents),
    (d.successful_transactions ?? 0).toString(),
    (d.failed_transactions ?? 0).toString(),
  ]);
  return { summary, daily };
};

const exportRevenueAnalyticsToPDF = async (revenue) => {
  const { default: jsPDF }     = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const { summary, daily } = buildRevenueAnalyticsRows(revenue);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFontSize(16); doc.setTextColor(30, 30, 60);
  doc.text('Revenue Analytics Report', pageW / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(9); doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, y + 3, { align: 'center' });
  y += 12;

  doc.setFontSize(11); doc.setTextColor(40, 40, 80);
  doc.text('Summary', 14, y); y += 4;
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: summary,
    theme: 'striped',
    headStyles: { fillColor: [30, 30, 60], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 80] },
    alternateRowStyles: { fillColor: [245, 246, 250] },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  if (daily.length > 0) {
    if (y > 220) { doc.addPage(); y = 14; }
    doc.setFontSize(11); doc.setTextColor(40, 40, 80);
    doc.text('Daily Revenue Breakdown', 14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Revenue', 'Refunds', 'Successful', 'Failed']],
      body: daily,
      theme: 'striped',
      headStyles: { fillColor: [30, 30, 60], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [40, 40, 80] },
      alternateRowStyles: { fillColor: [245, 246, 250] },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 30 }, 4: { cellWidth: 28 } },
      margin: { left: 14, right: 14 },
    });
  }

  doc.save(`revenue-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
};

const exportRevenueAnalyticsToExcel = (revenue) => {
  import('xlsx').then(({ utils, writeFile }) => {
    const { summary, daily } = buildRevenueAnalyticsRows(revenue);
    const wb = utils.book_new();

    const wsSummary = utils.aoa_to_sheet([['Metric', 'Value'], ...summary]);
    wsSummary['!cols'] = [{ wch: 26 }, { wch: 22 }];
    utils.book_append_sheet(wb, wsSummary, 'Summary');

    if (daily.length > 0) {
      const wsDaily = utils.aoa_to_sheet([
        ['Date', 'Revenue', 'Refunds', 'Successful Txns', 'Failed Txns'],
        ...daily,
      ]);
      wsDaily['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 14 }];
      utils.book_append_sheet(wb, wsDaily, 'Daily Breakdown');
    }

    writeFile(wb, `revenue-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
};

function AnExportButton({ onExportPDF, onExportExcel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="an-export-wrap" ref={ref}>
      <button className="an-export-btn" onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="an-export-menu">
          <button onClick={() => { onExportPDF(); setOpen(false); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Export as PDF
          </button>
          <button onClick={() => { onExportExcel(); setOpen(false); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            Export as Excel
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────── */
const fmtCents = (cents) =>
  `$${((cents ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDay = (iso) => {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return iso; }
};

const fmtCompact = (cents) => {
  const v = (cents ?? 0) / 100;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
};

// Round up to a "nice" axis ceiling (1/2/5 × 10^n)
const niceCeil = (value) => {
  if (value <= 0) return 1;
  const exp  = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const frac = value / base;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return niceFrac * base;
};

const LABEL_OVERRIDES = { ios: 'iOS', tv: 'TV' };
const formatLabel = (key) =>
  LABEL_OVERRIDES[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

const SEGMENT_PALETTE = [
  { color: '#00d4ff', glow: 'rgba(0,212,255,0.5)' },
  { color: '#10b981', glow: 'rgba(16,185,129,0.5)' },
  { color: '#a78bfa', glow: 'rgba(167,139,250,0.5)' },
  { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
  { color: '#ef4444', glow: 'rgba(239,68,68,0.5)' },
  { color: '#fb7185', glow: 'rgba(251,113,133,0.5)' },
];

const STATUS_COLORS = {
  active:    { color: '#10b981', glow: 'rgba(16,185,129,0.5)' },
  inactive:  { color: '#64748b', glow: 'rgba(100,116,139,0.5)' },
  blocked:   { color: '#ef4444', glow: 'rgba(239,68,68,0.5)' },
  revoked:   { color: '#a78bfa', glow: 'rgba(167,139,250,0.5)' },
};

const PLAN_COLORS = {
  trial:  { color: '#00d4ff', glow: 'rgba(0,212,255,0.5)' },
  paid:   { color: '#10b981', glow: 'rgba(16,185,129,0.5)' },
  annual: { color: '#a78bfa', glow: 'rgba(167,139,250,0.5)' },
  grace:  { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
};

// Convert a { key: value } breakdown object into colored chart segments
const toSegments = (obj, colorMap) =>
  Object.entries(obj || {}).map(([key, value], i) => ({
    key,
    label: formatLabel(key),
    value: value ?? 0,
    ...((colorMap && colorMap[key]) || SEGMENT_PALETTE[i % SEGMENT_PALETTE.length]),
  }));

// Hex color interpolation (used for the funnel gradient)
const hexToRgb = (hex) => {
  const v = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(v.substr(i, 2), 16));
};
const lerpColor = (a, b, t) => {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  const rgb = ca.map((c, i) => Math.round(c + (cb[i] - c) * t));
  return `rgb(${rgb.join(',')})`;
};

// Smooth Catmull-Rom → Bezier spline through points
const smoothPath = (points) => {
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(3)} ${cp1y.toFixed(3)}, ${cp2x.toFixed(3)} ${cp2y.toFixed(3)}, ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`;
  }
  return d;
};

/* ── Revenue chart ──────────────────────────────────────── */
function RevenueChart({ daily }) {
  const [active, setActive] = useState(null);

  if (daily.length === 0) return null;

  const maxRaw  = Math.max(...daily.map(d => d.revenue_cents ?? 0), 0);
  const niceMax = niceCeil(maxRaw || 1);
  const gridSteps = [1, 0.75, 0.5, 0.25, 0];
  const peakIdx = daily.reduce((best, d, i) =>
    (d.revenue_cents ?? 0) > (daily[best]?.revenue_cents ?? -1) ? i : best, 0);
  const labelStep = Math.max(1, Math.ceil(daily.length / 7));

  const padTop = 14;
  const n = daily.length;
  const points = daily.map((d, i) => {
    const x = n > 1 ? (i / (n - 1)) * 100 : 50;
    const ratio = (d.revenue_cents ?? 0) / niceMax;
    const y = padTop + (1 - ratio) * (100 - padTop);
    return { x, y, d, i };
  });

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[n - 1].x} 100 L ${points[0].x} 100 Z`;
  const chartKey = `${n}-${daily[0].date}-${daily[n - 1].date}`;

  return (
    <div className="an-chart">
      <div className="an-chart-yaxis">
        {gridSteps.map(t => (
          <span key={t} style={{ top: `${padTop + (1 - t) * (100 - padTop)}%` }}>{fmtCompact(niceMax * t)}</span>
        ))}
      </div>
      <div className="an-chart-plot">
        <div className="an-chart-area" key={chartKey}>
          <div className="an-chart-gridlines">
            {gridSteps.map(t => (
              <div key={t} className="an-chart-gridline" style={{ top: `${padTop + (1 - t) * (100 - padTop)}%` }} />
            ))}
          </div>

          <svg className="an-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#00d4ff" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#00d4ff" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="revLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#22dfff" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#revAreaGrad)" />
            <path
              className="an-chart-line"
              d={linePath}
              fill="none"
              stroke="url(#revLineGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {active !== null && (
            <div className="an-chart-crosshair" style={{ left: `${points[active].x}%` }} />
          )}

          {points.map(p => (
            <div
              key={p.d.date}
              className={`an-chart-dot${p.i === peakIdx ? ' is-peak' : ''}${active === p.i ? ' is-active' : ''}`}
              style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${0.25 + p.i * 0.02}s` }}
            >
              {p.i === peakIdx && <span className="an-chart-peak-badge">Peak</span>}
              {(p.d.refunds_cents ?? 0) > 0 && <span className="an-chart-refund-dot" title="Refund issued" />}
            </div>
          ))}

          <div className="an-chart-hitcols">
            {points.map(p => (
              <div
                key={p.d.date}
                className="an-chart-hitcol"
                onMouseEnter={() => setActive(p.i)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </div>

          {active !== null && (
            <div
              className={`an-chart-tooltip${active === 0 ? ' align-start' : active === n - 1 ? ' align-end' : ''}`}
              style={{ left: `${points[active].x}%`, top: `${points[active].y}%` }}
            >
              <div className="an-tt-date">{fmtDay(points[active].d.date)}</div>
              <div className="an-tt-row"><span>Revenue</span><strong className="pos">{fmtCents(points[active].d.revenue_cents)}</strong></div>
              <div className="an-tt-row"><span>Refunds</span><strong className="neg">{fmtCents(points[active].d.refunds_cents)}</strong></div>
              <div className="an-tt-row"><span>Successful</span><strong>{(points[active].d.successful_transactions ?? 0).toLocaleString()}</strong></div>
              <div className="an-tt-row"><span>Failed</span><strong>{(points[active].d.failed_transactions ?? 0).toLocaleString()}</strong></div>
            </div>
          )}
        </div>

        <div className="an-chart-xlabels">
          {daily.map((d, i) => (
            <span key={d.date} className="an-chart-xlabel">
              {i % labelStep === 0 ? fmtDay(d.date) : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Revenue tab ────────────────────────────────────────── */
const REV_PAGE_SIZE = 10;

function SortIcon({ field, active, dir }) {
  return (
    <span className={`an-sort-icon${active ? ' active' : ''}`}>
      <span className={active && dir === 'asc'  ? 'on' : ''}>▲</span>
      <span className={active && dir === 'desc' ? 'on' : ''}>▼</span>
    </span>
  );
}

function RevenueAnalytics() {
  const dispatch = useDispatch();
  const { revenue, loading, error, revenueFilters } = useSelector(s => s.analytics);
  const [startDate, setStartDate] = useState(revenueFilters.start_date);
  const [endDate, setEndDate]     = useState(revenueFilters.end_date);

  const [groupBy,   setGroupBy]   = useState('day');
  const [sortField, setSortField] = useState('date');
  const [sortDir,   setSortDir]   = useState('asc');
  const [page,      setPage]      = useState(1);

  useEffect(() => {
    dispatch(fetchRevenueAnalytics(revenueFilters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const applyFilters = () => {
    const next = { start_date: startDate, end_date: endDate };
    dispatch(setRevenueFilters(next));
    dispatch(fetchRevenueAnalytics(next));
    setPage(1);
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    dispatch(clearRevenueFilters());
    dispatch(fetchRevenueAnalytics({}));
    setPage(1);
  };

  const raw    = revenue?.daily || [];
  const growth = revenue?.revenue_growth_pct ?? 0;
  const hasFilters = !!(revenueFilters.start_date || revenueFilters.end_date);

  /* group rows by day / week / month */
  const grouped = useMemo(() => {
    if (groupBy === 'day') return raw.map(d => ({ ...d, _label: fmtDay(d.date) }));

    const map = new Map();
    raw.forEach(d => {
      const dt = new Date(d.date + 'T00:00:00');
      let key, label;
      if (groupBy === 'month') {
        key   = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        label = dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      } else {
        const dow     = (dt.getDay() + 6) % 7;
        const monday  = new Date(dt); monday.setDate(dt.getDate() - dow);
        const sunday  = new Date(monday); sunday.setDate(monday.getDate() + 6);
        key   = monday.toISOString().slice(0, 10);
        const s = (x) => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        label = `${s(monday)} – ${s(sunday)}`;
      }
      if (!map.has(key)) {
        map.set(key, { date: key, _label: label, revenue_cents: 0, refunds_cents: 0, successful_transactions: 0, failed_transactions: 0 });
      }
      const r = map.get(key);
      r.revenue_cents            += d.revenue_cents            ?? 0;
      r.refunds_cents            += d.refunds_cents            ?? 0;
      r.successful_transactions  += d.successful_transactions  ?? 0;
      r.failed_transactions      += d.failed_transactions      ?? 0;
    });
    return [...map.values()];
  }, [raw, groupBy]);

  /* sort */
  const sorted = useMemo(() => {
    const fieldMap = { date: 'date', revenue: 'revenue_cents', refunds: 'refunds_cents', successful: 'successful_transactions', failed: 'failed_transactions' };
    const key = fieldMap[sortField] || 'date';
    return [...grouped].sort((a, b) => {
      const va = a[key], vb = b[key];
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [grouped, sortField, sortDir]);

  /* paginate */
  const totalRows  = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / REV_PAGE_SIZE));
  const pageRows   = sorted.slice((page - 1) * REV_PAGE_SIZE, page * REV_PAGE_SIZE);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const handleGroup = (g) => { setGroupBy(g); setPage(1); };

  return (
    <div className="an-section">
      <div className="an-toolbar">
        <div className="an-filter">
          <label>Start Date</label>
          <input type="date" className="an-date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="an-filter">
          <label>End Date</label>
          <input type="date" className="an-date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <button className="an-apply-btn" onClick={applyFilters}>Apply</button>
        {hasFilters && <button className="an-reset-btn" onClick={resetFilters}>Reset</button>}
      </div>

      {loading ? (
        <div className="an-loading">Loading revenue analytics…</div>
      ) : error ? (
        <div className="an-error">{error}</div>
      ) : !revenue ? (
        <div className="an-empty">No data available.</div>
      ) : (
        <>
          <div className="an-stats-row">
            <div className="an-stat-card" style={{ '--asc': '#00d4ff' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Total Revenue</div>
              <div className="an-stat-value">{revenue.total_revenue_display ?? fmtCents(revenue.total_revenue_cents)}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#10b981' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">MRR</div>
              <div className="an-stat-value">{revenue.mrr_display ?? fmtCents(revenue.mrr_cents)}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': growth >= 0 ? '#10b981' : '#ef4444' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Revenue Growth</div>
              <div className={`an-stat-value ${growth >= 0 ? 'pos' : 'neg'}`}>
                {growth >= 0 ? '▲' : '▼'} {Math.abs(growth)}%
              </div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#ef4444' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Total Refunds</div>
              <div className="an-stat-value">{fmtCents(revenue.total_refunds_cents)}</div>
            </div>
          </div>

          <div className="an-card">
            <div className="an-card-head">
              <span className="an-card-title">Daily Revenue Breakdown</span>
            </div>

            {raw.length === 0 ? (
              <div className="an-empty">No daily data for this period.</div>
            ) : (
              <>
                <div className="an-chart-legend">
                  <span className="an-legend-item"><i className="an-legend-swatch revenue" /> Daily revenue</span>
                  <span className="an-legend-item"><i className="an-legend-swatch peak" /> Peak day</span>
                  <span className="an-legend-item"><i className="an-legend-swatch refund" /> Refund issued</span>
                </div>

                <RevenueChart daily={raw} />

                {/* Group + row-count controls */}
                <div className="an-table-controls">
                  <div className="an-group-btns">
                    {['day','week','month'].map(g => (
                      <button key={g} className={`an-group-btn${groupBy === g ? ' active' : ''}`} onClick={() => handleGroup(g)}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </button>
                    ))}
                  </div>
                  <span className="an-row-count">
                    {totalRows === 0 ? 'No results' : `${(page-1)*REV_PAGE_SIZE+1}–${Math.min(page*REV_PAGE_SIZE, totalRows)} of ${totalRows}`}
                  </span>
                </div>

                <div className="an-table-scroll">
                  <table className="an-table">
                    <thead>
                      <tr>
                        {[['date','Date'],['revenue','Revenue'],['refunds','Refunds'],['successful','Successful'],['failed','Failed']].map(([f,label]) => (
                          <th key={f} className="an-th-sort" onClick={() => handleSort(f)}>
                            {label}
                            <SortIcon field={f} active={sortField === f} dir={sortDir} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.length === 0 ? (
                        <tr><td colSpan={5} className="an-empty">No data for this period.</td></tr>
                      ) : pageRows.map(d => (
                        <tr key={d.date}>
                          <td>{d._label}</td>
                          <td className="an-cell-revenue">{fmtCents(d.revenue_cents)}</td>
                          <td className="an-cell-refund">{fmtCents(d.refunds_cents)}</td>
                          <td>{(d.successful_transactions ?? 0).toLocaleString()}</td>
                          <td className="an-cell-failed">{(d.failed_transactions ?? 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="an-pagination">
                    <button className="an-pg-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
                    <button className="an-pg-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce((acc, p, i, arr) => {
                        if (i > 0 && p - arr[i-1] > 1) acc.push('…');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) => typeof p === 'string'
                        ? <span key={`e${i}`} className="an-pg-ellipsis">{p}</span>
                        : <button key={p} className={`an-pg-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                      )}
                    <button className="an-pg-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>›</button>
                    <button className="an-pg-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Engagement rings (DAU/WAU/MAU) ────────────────────────── */
function EngagementRings({ total, metrics }) {
  const SIZE = 200;
  const CENTER = SIZE / 2;
  const STROKE = 14;

  return (
    <div className="an-rings-wrap">
      <div className="an-rings">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="an-rings-svg">
          {metrics.map((m, i) => {
            const c = 2 * Math.PI * m.r;
            const pct = total > 0 ? Math.min(m.value / total, 1) : 0;
            const offset = c * (1 - pct);
            return (
              <g key={m.key}>
                <circle cx={CENTER} cy={CENTER} r={m.r} className="an-ring-track" strokeWidth={STROKE} />
                <circle
                  cx={CENTER} cy={CENTER} r={m.r}
                  className="an-ring-fill"
                  strokeWidth={STROKE}
                  transform={`rotate(-90 ${CENTER} ${CENTER})`}
                  style={{
                    stroke: m.color,
                    filter: `drop-shadow(0 0 6px ${m.glow})`,
                    '--circ': c,
                    '--ring-offset': offset,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              </g>
            );
          })}
        </svg>
        <div className="an-rings-center">
          <span className="an-rings-total">{total.toLocaleString()}</span>
          <span className="an-rings-total-label">Total Users</span>
        </div>
      </div>

      <div className="an-rings-legend">
        {metrics.map(m => {
          const pct = total > 0 ? ((m.value / total) * 100).toFixed(1) : '0.0';
          return (
            <div className="an-rings-legend-item" key={m.key}>
              <span className="an-rings-dot" style={{ background: m.color, boxShadow: `0 0 8px ${m.glow}` }} />
              <div className="an-rings-legend-text">
                <span className="an-rings-legend-label">{m.label}</span>
                <span className="an-rings-legend-value">{m.value.toLocaleString()} <em>· {pct}% of total</em></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Breakdown bars (status / platform / device-type) ──── */
function BreakdownBars({ title, segments }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const sorted = [...segments].sort((a, b) => b.value - a.value);

  return (
    <div className="an-card an-bd-card">
      <div className="an-card-head">
        <span className="an-card-title">{title}</span>
        <span className="an-bd-total">{total.toLocaleString()} total</span>
      </div>

      {total === 0 ? (
        <div className="an-empty">No data available.</div>
      ) : (
        <div className="an-bd-list">
          {sorted.map((s, i) => {
            const pct = (s.value / total) * 100;
            return (
              <div className="an-bd-row" key={s.key}>
                <div className="an-bd-row-head">
                  <span className="an-bd-label">
                    <i className="an-bd-dot" style={{ background: s.color, boxShadow: `0 0 8px ${s.glow}` }} />
                    {s.label}
                  </span>
                  <span className="an-bd-value">{s.value.toLocaleString()} <em>· {pct.toFixed(1)}%</em></span>
                </div>
                <div className="an-bd-track">
                  <div
                    className="an-bd-fill"
                    style={{
                      '--bd-pct': `${pct}%`,
                      background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`,
                      boxShadow: `0 0 10px ${s.glow}`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Users tab ──────────────────────────────────────────── */
function UserAnalytics() {
  const dispatch = useDispatch();
  const { users, usersLoading, usersError, usersFilters } = useSelector(s => s.analytics);
  const [startDate, setStartDate] = useState(usersFilters.start_date);
  const [endDate, setEndDate]     = useState(usersFilters.end_date);

  useEffect(() => {
    dispatch(fetchUserAnalytics(usersFilters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const applyFilters = () => {
    const next = { start_date: startDate, end_date: endDate };
    dispatch(setUsersFilters(next));
    dispatch(fetchUserAnalytics(next));
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    dispatch(clearUsersFilters());
    dispatch(fetchUserAnalytics({}));
  };

  const hasFilters = !!(usersFilters.start_date || usersFilters.end_date);

  const total = users?.total_users ?? 0;
  const retention = users?.retention_rate_pct ?? 0;
  const retentionColor = retention >= 50 ? '#10b981' : retention >= 25 ? '#fbbf24' : '#ef4444';

  const engagement = [
    { key: 'mau', label: 'Monthly Active Users', value: users?.mau ?? 0, r: 80, color: '#10b981', glow: 'rgba(16,185,129,0.5)' },
    { key: 'wau', label: 'Weekly Active Users',  value: users?.wau ?? 0, r: 58, color: '#a78bfa', glow: 'rgba(167,139,250,0.5)' },
    { key: 'dau', label: 'Daily Active Users',   value: users?.dau ?? 0, r: 36, color: '#00d4ff', glow: 'rgba(0,212,255,0.5)' },
  ];

  return (
    <div className="an-section">
      <div className="an-toolbar">
        <div className="an-filter">
          <label>Start Date</label>
          <input
            type="date"
            className="an-date-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="an-filter">
          <label>End Date</label>
          <input
            type="date"
            className="an-date-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button className="an-apply-btn" onClick={applyFilters}>Apply</button>
        {hasFilters && (
          <button className="an-reset-btn" onClick={resetFilters}>Reset</button>
        )}
      </div>

      {usersLoading ? (
        <div className="an-loading">Loading user analytics…</div>
      ) : usersError ? (
        <div className="an-error">{usersError}</div>
      ) : !users ? (
        <div className="an-empty">No data available.</div>
      ) : (
        <>
          <div className="an-stats-row an-stats-row-3">
            <div className="an-stat-card" style={{ '--asc': '#00d4ff' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Total Users</div>
              <div className="an-stat-value">{total.toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#10b981' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">New Users (Period)</div>
              <div className="an-stat-value pos">+{(users.new_users_in_period ?? 0).toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': retentionColor }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Retention Rate</div>
              <div className="an-stat-value">{retention}%</div>
            </div>
          </div>

          <div className="an-card">
            <div className="an-card-head">
              <span className="an-card-title">Active Users — DAU / WAU / MAU</span>
            </div>

            <EngagementRings total={total} metrics={engagement} />

            <p className="an-note">DAU / WAU / MAU are computed from device heartbeat activity as an active-device proxy.</p>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Devices tab ────────────────────────────────────────── */
function DeviceAnalytics() {
  const dispatch = useDispatch();
  const { devices, devicesLoading, devicesError } = useSelector(s => s.analytics);

  useEffect(() => {
    dispatch(fetchDeviceAnalytics());
  }, [dispatch]);

  if (devicesLoading) return <div className="an-loading">Loading device analytics…</div>;
  if (devicesError)   return <div className="an-error">{devicesError}</div>;
  if (!devices)       return <div className="an-empty">No data available.</div>;

  const total = devices.total_devices ?? 0;

  const statusSegments   = toSegments(devices.by_status, STATUS_COLORS);
  const platformSegments = toSegments(devices.by_platform);
  const typeSegments     = toSegments(devices.by_device_type);

  return (
    <div className="an-section">
      <div className="an-stats-row">
        <div className="an-stat-card" style={{ '--asc': '#00d4ff' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Total Devices</div>
          <div className="an-stat-value">{total.toLocaleString()}</div>
        </div>
        <div className="an-stat-card" style={{ '--asc': '#10b981' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Active</div>
          <div className="an-stat-value pos">{(devices.active_devices ?? 0).toLocaleString()}</div>
        </div>
        <div className="an-stat-card" style={{ '--asc': '#64748b' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Inactive</div>
          <div className="an-stat-value">{(devices.inactive_devices ?? 0).toLocaleString()}</div>
        </div>
        <div className="an-stat-card" style={{ '--asc': '#ef4444' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Blocked</div>
          <div className="an-stat-value neg">{(devices.blocked_devices ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="an-stats-row">
        <div className="an-stat-card" style={{ '--asc': '#ef4444' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">High Risk</div>
          <div className="an-stat-value neg">{(devices.high_risk_devices ?? 0).toLocaleString()}</div>
        </div>
        <div className="an-stat-card" style={{ '--asc': '#a78bfa' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Never Heartbeat</div>
          <div className="an-stat-value">{(devices.never_heartbeat ?? 0).toLocaleString()}</div>
        </div>
        <div className="an-stat-card" style={{ '--asc': '#fbbf24' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Stale Heartbeat (24h)</div>
          <div className="an-stat-value">{(devices.stale_heartbeat_24h ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="an-bd-grid">
        <BreakdownBars title="By Status" segments={statusSegments} />
        <BreakdownBars title="By Platform" segments={platformSegments} />
        <BreakdownBars title="By Device Type" segments={typeSegments} />
      </div>
    </div>
  );
}

/* ── Licenses tab ───────────────────────────────────────── */
function LicenseAnalytics() {
  const dispatch = useDispatch();
  const { licenses, licensesLoading, licensesError } = useSelector(s => s.analytics);

  useEffect(() => {
    dispatch(fetchLicenseAnalytics());
  }, [dispatch]);

  if (licensesLoading) return <div className="an-loading">Loading license analytics…</div>;
  if (licensesError)   return <div className="an-error">{licensesError}</div>;
  if (!licenses)       return <div className="an-empty">No data available.</div>;

  const total = licenses.total_licenses ?? 0;
  const planSegments = toSegments(licenses.by_plan_type, PLAN_COLORS);

  const licenseMetrics = [
    { label: 'Total',   value: total,                          color: '#00d4ff' },
    { label: 'Active',  value: licenses.active_licenses  ?? 0, color: '#10b981' },
    { label: 'Expired', value: licenses.expired_licenses ?? 0, color: '#ef4444' },
    { label: 'Revoked', value: licenses.revoked_licenses ?? 0, color: '#f59e0b' },
  ];

  return (
    <div className="an-section">
      <div className="an-license-row">
        <div className="an-stat-card an-license-card" style={{ '--asc': '#00d4ff' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Licenses</div>
          <div className="an-license-grid">
            {licenseMetrics.map(m => (
              <div className="an-license-item" key={m.label} style={{ '--lic': m.color }}>
                <span className="an-license-value">{m.value.toLocaleString()}</span>
                <span className="an-license-label">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="an-stat-card" style={{ '--asc': '#fbbf24' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Expiry Overview</div>
          <div className="an-stat-split">
            <div className="an-stat-split-item">
              <span className="an-stat-split-value">{(licenses.expiring_7d ?? 0).toLocaleString()}</span>
              <span className="an-stat-split-label">Expiring 7 days</span>
            </div>
            <div className="an-stat-split-divider" />
            <div className="an-stat-split-item">
              <span className="an-stat-split-value">{(licenses.expiring_30d ?? 0).toLocaleString()}</span>
              <span className="an-stat-split-label">Expiring 30 days</span>
            </div>
          </div>
        </div>
      </div>

      <BreakdownBars title="By Plan Type" segments={planSegments} />
    </div>
  );
}

/* ── Conversion funnel chart ────────────────────────────── */
const FUNNEL_FROM = '#22dfff';
const FUNNEL_TO   = '#7c3aed';

function FunnelChart({ steps }) {
  if (steps.length === 0) return <div className="an-empty">No funnel data available.</div>;
  const maxCount = steps[0]?.count || 1;

  return (
    <div className="an-funnel">
      {steps.map((s, i) => {
        const widthPct = maxCount > 0 ? Math.max((s.count / maxCount) * 100, 4) : 0;
        const color = lerpColor(FUNNEL_FROM, FUNNEL_TO, steps.length > 1 ? i / (steps.length - 1) : 0);
        const next = steps[i + 1];

        return (
          <div className="an-funnel-step-wrap" key={s.step}>
            <div className="an-funnel-step">
              <div className="an-funnel-step-head">
                <span className="an-funnel-step-name">
                  <span className="an-funnel-step-num">{i + 1}</span> {s.step}
                </span>
                <span className="an-funnel-step-count">
                  {(s.count ?? 0).toLocaleString()} <em>· {s.conversion_rate_pct}%</em>
                </span>
              </div>
              <div className="an-funnel-bar-track">
                <div
                  className="an-funnel-bar-fill"
                  style={{
                    '--fw': `${widthPct}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}99)`,
                    boxShadow: `0 0 14px ${color}66`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              </div>
            </div>

            {next && (
              <div className="an-funnel-connector">
                <span className="an-funnel-connector-arrow">↓</span>
                <span className="an-funnel-connector-text">
                  <strong>{next.conversion_rate_pct}%</strong> continued
                  <span className="an-funnel-connector-drop"> · {(100 - next.conversion_rate_pct).toFixed(1)}% drop-off</span>
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Conversion funnel tab ──────────────────────────────── */
function FunnelAnalytics() {
  const dispatch = useDispatch();
  const { funnel, funnelLoading, funnelError, funnelFilters } = useSelector(s => s.analytics);
  const [startDate, setStartDate] = useState(funnelFilters.start_date);
  const [endDate, setEndDate]     = useState(funnelFilters.end_date);

  useEffect(() => {
    dispatch(fetchFunnelAnalytics(funnelFilters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const applyFilters = () => {
    const next = { start_date: startDate, end_date: endDate };
    dispatch(setFunnelFilters(next));
    dispatch(fetchFunnelAnalytics(next));
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    dispatch(clearFunnelFilters());
    dispatch(fetchFunnelAnalytics({}));
  };

  const hasFilters = !!(funnelFilters.start_date || funnelFilters.end_date);

  const overall = funnel?.overall_conversion_pct ?? 0;
  const overallColor = overall >= 50 ? '#10b981' : overall >= 25 ? '#fbbf24' : '#ef4444';
  const steps = funnel?.steps || [];

  return (
    <div className="an-section">
      <div className="an-toolbar">
        <div className="an-filter">
          <label>Start Date</label>
          <input
            type="date"
            className="an-date-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="an-filter">
          <label>End Date</label>
          <input
            type="date"
            className="an-date-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button className="an-apply-btn" onClick={applyFilters}>Apply</button>
        {hasFilters && (
          <button className="an-reset-btn" onClick={resetFilters}>Reset</button>
        )}
      </div>

      {funnelLoading ? (
        <div className="an-loading">Loading funnel analytics…</div>
      ) : funnelError ? (
        <div className="an-error">{funnelError}</div>
      ) : !funnel ? (
        <div className="an-empty">No data available.</div>
      ) : (
        <>
          <div className="an-stats-row">
            <div className="an-stat-card" style={{ '--asc': '#00d4ff' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">OTP Verified</div>
              <div className="an-stat-value">{(funnel.otp_verified ?? 0).toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#10b981' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Trial Started</div>
              <div className="an-stat-value">{(funnel.trial_started ?? 0).toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#a78bfa' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Subscriptions Created</div>
              <div className="an-stat-value">{(funnel.subscriptions_created ?? 0).toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#f59e0b' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Successful Payments</div>
              <div className="an-stat-value pos">{(funnel.successful_payments ?? 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="an-card">
            <div className="an-card-head">
              <span className="an-card-title">Conversion Funnel</span>
              <span className="an-funnel-overall" style={{ color: overallColor }}>
                Overall {overall}%
              </span>
            </div>

            <FunnelChart steps={steps} />
          </div>
        </>
      )}
    </div>
  );
}

/* ── Churn chart ────────────────────────────────────────── */
function ChurnChart({ daily }) {
  const [active, setActive] = useState(null);

  if (daily.length === 0) return null;

  const maxRaw  = Math.max(...daily.map(d => Math.max(d.cancellations ?? 0, d.non_renewals ?? 0)), 0);
  const niceMax = niceCeil(maxRaw || 1);
  const gridSteps = [1, 0.75, 0.5, 0.25, 0];
  const labelStep = Math.max(1, Math.ceil(daily.length / 7));

  const padTop = 14;
  const n = daily.length;
  const toPoints = (key) => daily.map((d, i) => {
    const x = n > 1 ? (i / (n - 1)) * 100 : 50;
    const ratio = (d[key] ?? 0) / niceMax;
    const y = padTop + (1 - ratio) * (100 - padTop);
    return { x, y, d, i };
  });

  const cancelPoints   = toPoints('cancellations');
  const nonRenewPoints = toPoints('non_renewals');

  const cancelLine   = smoothPath(cancelPoints);
  const nonRenewLine = smoothPath(nonRenewPoints);
  const cancelArea   = `${cancelLine} L ${cancelPoints[n - 1].x} 100 L ${cancelPoints[0].x} 100 Z`;
  const chartKey = `${n}-${daily[0].date}-${daily[n - 1].date}`;

  return (
    <div className="an-chart">
      <div className="an-chart-yaxis">
        {gridSteps.map(t => (
          <span key={t} style={{ top: `${padTop + (1 - t) * (100 - padTop)}%` }}>{Math.round(niceMax * t).toLocaleString()}</span>
        ))}
      </div>
      <div className="an-chart-plot">
        <div className="an-chart-area" key={chartKey}>
          <div className="an-chart-gridlines">
            {gridSteps.map(t => (
              <div key={t} className="an-chart-gridline" style={{ top: `${padTop + (1 - t) * (100 - padTop)}%` }} />
            ))}
          </div>

          <svg className="an-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="churnAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#ef4444" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#ef4444" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={cancelArea} fill="url(#churnAreaGrad)" />
            <path
              className="an-chart-line"
              d={cancelLine}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={nonRenewLine}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {active !== null && (
            <div className="an-chart-crosshair" style={{ left: `${cancelPoints[active].x}%` }} />
          )}

          {cancelPoints.map(p => (
            <div
              key={`c-${p.d.date}`}
              className={`an-chart-dot${active === p.i ? ' is-active' : ''}`}
              style={{ left: `${p.x}%`, top: `${p.y}%`, background: '#ef4444', animationDelay: `${0.25 + p.i * 0.02}s` }}
            />
          ))}
          {nonRenewPoints.map(p => (
            <div
              key={`r-${p.d.date}`}
              className={`an-chart-dot${active === p.i ? ' is-active' : ''}`}
              style={{ left: `${p.x}%`, top: `${p.y}%`, background: '#f59e0b', animationDelay: `${0.25 + p.i * 0.02}s` }}
            />
          ))}

          <div className="an-chart-hitcols">
            {cancelPoints.map(p => (
              <div
                key={p.d.date}
                className="an-chart-hitcol"
                onMouseEnter={() => setActive(p.i)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </div>

          {active !== null && (
            <div
              className={`an-chart-tooltip${active === 0 ? ' align-start' : active === n - 1 ? ' align-end' : ''}`}
              style={{ left: `${cancelPoints[active].x}%`, top: `${Math.min(cancelPoints[active].y, nonRenewPoints[active].y)}%` }}
            >
              <div className="an-tt-date">{fmtDay(daily[active].date)}</div>
              <div className="an-tt-row"><span>Cancellations</span><strong className="neg">{(daily[active].cancellations ?? 0).toLocaleString()}</strong></div>
              <div className="an-tt-row"><span>Non-renewals</span><strong>{(daily[active].non_renewals ?? 0).toLocaleString()}</strong></div>
              <div className="an-tt-row"><span>Churn Rate</span><strong>{((daily[active].churn_rate ?? 0) * 100).toFixed(2)}%</strong></div>
            </div>
          )}
        </div>

        <div className="an-chart-xlabels">
          {daily.map((d, i) => (
            <span key={d.date} className="an-chart-xlabel">
              {i % labelStep === 0 ? fmtDay(d.date) : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Churn tab ──────────────────────────────────────────── */
function ChurnAnalytics() {
  const dispatch = useDispatch();
  const { churn, churnLoading, churnError, churnFilters } = useSelector(s => s.analytics);
  const [startDate, setStartDate] = useState(churnFilters.start_date);
  const [endDate, setEndDate]     = useState(churnFilters.end_date);

  useEffect(() => {
    dispatch(fetchChurnAnalytics(churnFilters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const applyFilters = () => {
    const next = { start_date: startDate, end_date: endDate };
    dispatch(setChurnFilters(next));
    dispatch(fetchChurnAnalytics(next));
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    dispatch(clearChurnFilters());
    dispatch(fetchChurnAnalytics({}));
  };

  const hasFilters = !!(churnFilters.start_date || churnFilters.end_date);
  const daily = churn?.daily || [];
  const churnRate = (churn?.avg_churn_rate_pct ?? 0) * 100;
  const churnColor = churnRate <= 2 ? '#10b981' : churnRate <= 5 ? '#fbbf24' : '#ef4444';

  return (
    <div className="an-section">
      <div className="an-toolbar">
        <div className="an-filter">
          <label>Start Date</label>
          <input
            type="date"
            className="an-date-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="an-filter">
          <label>End Date</label>
          <input
            type="date"
            className="an-date-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button className="an-apply-btn" onClick={applyFilters}>Apply</button>
        {hasFilters && (
          <button className="an-reset-btn" onClick={resetFilters}>Reset</button>
        )}
      </div>

      {churnLoading ? (
        <div className="an-loading">Loading churn analytics…</div>
      ) : churnError ? (
        <div className="an-error">{churnError}</div>
      ) : !churn ? (
        <div className="an-empty">No data available.</div>
      ) : (
        <>
          <div className="an-stats-row">
            <div className="an-stat-card" style={{ '--asc': '#ef4444' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Total Cancellations</div>
              <div className="an-stat-value">{(churn.total_cancellations ?? 0).toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#f59e0b' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Total Non-Renewals</div>
              <div className="an-stat-value">{(churn.total_non_renewals ?? 0).toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': churnColor }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Avg Churn Rate</div>
              <div className="an-stat-value" style={{ color: churnColor }}>{churnRate.toFixed(2)}%</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#00d4ff' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Active Subscriptions Baseline</div>
              <div className="an-stat-value">{(churn.active_subscriptions_baseline ?? 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="an-card">
            <div className="an-card-head">
              <span className="an-card-title">Daily Churn Breakdown</span>
            </div>

            {daily.length === 0 ? (
              <div className="an-empty">No daily data for this period.</div>
            ) : (
              <>
                <div className="an-chart-legend">
                  <span className="an-legend-item"><i className="an-legend-swatch cancel" /> Cancellations</span>
                  <span className="an-legend-item"><i className="an-legend-swatch nonrenew" /> Non-renewals</span>
                </div>

                <ChurnChart daily={daily} />

                <div className="an-table-scroll">
                  <table className="an-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Cancellations</th>
                        <th>Non-Renewals</th>
                        <th>Churn Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.map(d => (
                        <tr key={d.date}>
                          <td>{fmtDay(d.date)}</td>
                          <td className="an-cell-refund">{(d.cancellations ?? 0).toLocaleString()}</td>
                          <td className="an-cell-failed">{(d.non_renewals ?? 0).toLocaleString()}</td>
                          <td>{((d.churn_rate ?? 0) * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Risk Score Gauge ────────────────────────────────────── */
function RiskGauge({ score }) {
  const clamped = Math.min(100, Math.max(0, score ?? 0));
  const color   = clamped >= 70 ? '#ef4444' : clamped >= 40 ? '#fbbf24' : '#10b981';
  const label   = clamped >= 70 ? 'High' : clamped >= 40 ? 'Medium' : 'Low';
  const R = 48, CX = 60, CY = 60, SW = 10;
  const circ   = 2 * Math.PI * R;
  const arc    = circ * 0.75;
  const offset = arc * (1 - clamped / 100);
  return (
    <div className="an-risk-gauge-wrap">
      <svg viewBox="0 0 120 120" className="an-risk-gauge-svg">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border-subtle)" strokeWidth={SW}
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={SW}
          strokeDasharray={`${arc - offset} ${circ - (arc - offset)}`}
          strokeDashoffset={circ * 0.125}
          strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 8px ${color}88)`, transition:'stroke-dasharray 0.8s ease' }} />
        <text x={CX} y={CY - 4} textAnchor="middle" fill="var(--text-primary)"
          fontSize="22" fontWeight="700" fontFamily="var(--font-display)">{clamped.toFixed(0)}</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fill={color}
          fontSize="9" fontWeight="800" letterSpacing="0.08em">{label.toUpperCase()} RISK</text>
      </svg>
      <div className="an-risk-gauge-label">Avg Risk Score</div>
    </div>
  );
}

/* ── Risk Trend Chart ────────────────────────────────────── */
function RiskTrendChart({ trends }) {
  const [active, setActive] = useState(null);
  if (!trends?.length) return <div className="an-empty">No trend data for this period.</div>;

  const maxRaw  = Math.max(...trends.map(d => Math.max(d.high_risk_devices ?? 0, d.replay_attacks ?? 0)), 0);
  const niceMax = niceCeil(maxRaw || 1);
  const gridSteps = [1, 0.75, 0.5, 0.25, 0];
  const labelStep = Math.max(1, Math.ceil(trends.length / 7));
  const padTop = 14, n = trends.length;

  const toPoints = (key) => trends.map((d, i) => ({
    x: n > 1 ? (i / (n - 1)) * 100 : 50,
    y: padTop + (1 - (d[key] ?? 0) / niceMax) * (100 - padTop),
    d, i,
  }));

  const riskPts    = toPoints('high_risk_devices');
  const replayPts  = toPoints('replay_attacks');
  const riskLine   = smoothPath(riskPts);
  const replayLine = smoothPath(replayPts);
  const riskArea   = `${riskLine} L ${riskPts[n-1].x} 100 L ${riskPts[0].x} 100 Z`;
  const chartKey   = `${n}-${trends[0].date}-${trends[n-1].date}`;

  return (
    <div className="an-chart">
      <div className="an-chart-yaxis">
        {gridSteps.map(t => (
          <span key={t} style={{ top:`${padTop + (1-t) * (100-padTop)}%` }}>{Math.round(niceMax * t).toLocaleString()}</span>
        ))}
      </div>
      <div className="an-chart-plot">
        <div className="an-chart-area" key={chartKey}>
          <div className="an-chart-gridlines">
            {gridSteps.map(t => (
              <div key={t} className="an-chart-gridline" style={{ top:`${padTop + (1-t) * (100-padTop)}%` }} />
            ))}
          </div>
          <svg className="an-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="riskAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ef4444" stopOpacity="0.30" />
                <stop offset="70%"  stopColor="#ef4444" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={riskArea} fill="url(#riskAreaGrad)" />
            <path d={riskLine} fill="none" stroke="#ef4444" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={replayLine} fill="none" stroke="#a78bfa" strokeWidth="2"
              strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {active !== null && <div className="an-chart-crosshair" style={{ left:`${riskPts[active].x}%` }} />}

          {riskPts.map(p => (
            <div key={`hr-${p.d.date}`} className={`an-chart-dot${active === p.i ? ' is-active' : ''}`}
              style={{ left:`${p.x}%`, top:`${p.y}%`, background:'#ef4444', animationDelay:`${0.25 + p.i * 0.02}s` }} />
          ))}
          {replayPts.map(p => (
            <div key={`rp-${p.d.date}`} className={`an-chart-dot${active === p.i ? ' is-active' : ''}`}
              style={{ left:`${p.x}%`, top:`${p.y}%`, background:'#a78bfa', animationDelay:`${0.25 + p.i * 0.02}s` }} />
          ))}

          <div className="an-chart-hitcols">
            {riskPts.map(p => (
              <div key={p.d.date} className="an-chart-hitcol"
                onMouseEnter={() => setActive(p.i)} onMouseLeave={() => setActive(null)} />
            ))}
          </div>

          {active !== null && (
            <div className={`an-chart-tooltip${active === 0 ? ' align-start' : active === n-1 ? ' align-end' : ''}`}
              style={{ left:`${riskPts[active].x}%`, top:`${Math.min(riskPts[active].y, replayPts[active].y)}%` }}>
              <div className="an-tt-date">{fmtDay(trends[active].date)}</div>
              <div className="an-tt-row"><span>High Risk Devices</span><strong className="neg">{(trends[active].high_risk_devices ?? 0).toLocaleString()}</strong></div>
              <div className="an-tt-row"><span>Replay Attacks</span><strong style={{color:'#a78bfa'}}>{(trends[active].replay_attacks ?? 0).toLocaleString()}</strong></div>
            </div>
          )}
        </div>
        <div className="an-chart-xlabels">
          {trends.map((d, i) => (
            <span key={d.date} className="an-chart-xlabel">{i % labelStep === 0 ? fmtDay(d.date) : ''}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Failed Login Daily Chart ────────────────────────────── */
function FailedLoginChart({ daily }) {
  const [active, setActive] = useState(null);
  if (!daily?.length) return <div className="an-empty">No daily data for this period.</div>;

  const maxRaw  = Math.max(...daily.map(d => d.count ?? 0), 0);
  const niceMax = niceCeil(maxRaw || 1);
  const gridSteps  = [1, 0.75, 0.5, 0.25, 0];
  const labelStep  = Math.max(1, Math.ceil(daily.length / 7));
  const padTop = 14, n = daily.length;

  const pts = daily.map((d, i) => ({
    x: n > 1 ? (i / (n - 1)) * 100 : 50,
    y: padTop + (1 - (d.count ?? 0) / niceMax) * (100 - padTop),
    d, i,
  }));
  const linePath = smoothPath(pts);
  const areaPath = `${linePath} L ${pts[n-1].x} 100 L ${pts[0].x} 100 Z`;

  return (
    <div className="an-chart">
      <div className="an-chart-yaxis">
        {gridSteps.map(t => (
          <span key={t} style={{ top:`${padTop + (1-t) * (100-padTop)}%` }}>{Math.round(niceMax * t).toLocaleString()}</span>
        ))}
      </div>
      <div className="an-chart-plot">
        <div className="an-chart-area">
          <div className="an-chart-gridlines">
            {gridSteps.map(t => (
              <div key={t} className="an-chart-gridline" style={{ top:`${padTop + (1-t) * (100-padTop)}%` }} />
            ))}
          </div>
          <svg className="an-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="failedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ef4444" stopOpacity="0.28" />
                <stop offset="70%"  stopColor="#ef4444" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#failedAreaGrad)" />
            <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {active !== null && <div className="an-chart-crosshair" style={{ left:`${pts[active].x}%` }} />}
          {pts.map(p => (
            <div key={p.d.date} className={`an-chart-dot${active === p.i ? ' is-active' : ''}`}
              style={{ left:`${p.x}%`, top:`${p.y}%`, background:'#ef4444', animationDelay:`${0.25 + p.i * 0.02}s` }} />
          ))}
          <div className="an-chart-hitcols">
            {pts.map(p => (
              <div key={p.d.date} className="an-chart-hitcol"
                onMouseEnter={() => setActive(p.i)} onMouseLeave={() => setActive(null)} />
            ))}
          </div>
          {active !== null && (
            <div className={`an-chart-tooltip${active === 0 ? ' align-start' : active === n-1 ? ' align-end' : ''}`}
              style={{ left:`${pts[active].x}%`, top:`${pts[active].y}%` }}>
              <div className="an-tt-date">{fmtDay(daily[active].date)}</div>
              <div className="an-tt-row"><span>Failed Logins</span><strong className="neg">{(daily[active].count ?? 0).toLocaleString()}</strong></div>
            </div>
          )}
        </div>
        <div className="an-chart-xlabels">
          {daily.map((d, i) => (
            <span key={d.date} className="an-chart-xlabel">{i % labelStep === 0 ? fmtDay(d.date) : ''}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Security & Risk Analytics tab ──────────────────────── */
const RISK_EVENT_COLORS = {
  replay_attack:                  { color: '#ef4444', glow: 'rgba(239,68,68,0.5)' },
  geo_anomaly:                    { color: '#a78bfa', glow: 'rgba(167,139,250,0.5)' },
  concurrent_session_violation:   { color: '#fbbf24', glow: 'rgba(251,191,36,0.5)' },
  device_sharing_violation:       { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
};

const SEC_EVENT_COLORS = {
  failed_login:   { color: '#ef4444', glow: 'rgba(239,68,68,0.5)' },
  otp_failure:    { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
  totp_failure:   { color: '#fbbf24', glow: 'rgba(251,191,36,0.5)' },
  token_replay:   { color: '#a78bfa', glow: 'rgba(167,139,250,0.5)' },
  blacklist_hit:  { color: '#ec4899', glow: 'rgba(236,72,153,0.5)' },
  hmac_failure:   { color: '#f43f5e', glow: 'rgba(244,63,94,0.5)'  },
};

function SecurityAnalytics() {
  const dispatch = useDispatch();
  const { risk, riskLoading, riskError, riskFilters,
          securityEvents, securityEventsLoading, securityEventsError } = useSelector(s => s.analytics);
  const [startDate, setStartDate]       = useState(riskFilters.start_date);
  const [endDate, setEndDate]           = useState(riskFilters.end_date);
  const [showEventsModal, setShowEventsModal] = useState(false);

  useEffect(() => {
    dispatch(fetchRiskAnalytics(riskFilters));
    dispatch(fetchSecurityAnalytics(riskFilters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const applyFilters = () => {
    const next = { start_date: startDate, end_date: endDate };
    dispatch(setRiskFilters(next));
    dispatch(setSecurityFilters(next));
    dispatch(fetchRiskAnalytics(next));
    dispatch(fetchSecurityAnalytics(next));
  };

  const resetFilters = () => {
    setStartDate(''); setEndDate('');
    dispatch(clearRiskFilters());
    dispatch(clearSecurityFilters());
    dispatch(fetchRiskAnalytics({}));
    dispatch(fetchSecurityAnalytics({}));
  };

  const hasFilters = !!(riskFilters.start_date || riskFilters.end_date);
  const avgScore   = risk?.avg_risk_score ?? 0;
  const scoreColor = avgScore >= 70 ? '#ef4444' : avgScore >= 40 ? '#fbbf24' : '#10b981';

  const eventSegments = toSegments(risk?.event_breakdown || {}, RISK_EVENT_COLORS);
  const trends        = risk?.trends || [];

  return (
    <div className="an-section">
      <div className="an-toolbar">
        <div className="an-filter">
          <label>Start Date</label>
          <input type="date" className="an-date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="an-filter">
          <label>End Date</label>
          <input type="date" className="an-date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <button className="an-apply-btn" onClick={applyFilters}>Apply</button>
        {hasFilters && <button className="an-reset-btn" onClick={resetFilters}>Reset</button>}
        <button className="an-sec-view-btn" style={{ marginLeft:'auto' }} onClick={() => setShowEventsModal(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Security Events
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {riskLoading ? (
        <div className="an-loading">Loading security analytics…</div>
      ) : riskError ? (
        <div className="an-error">{riskError}</div>
      ) : !risk ? (
        <div className="an-empty">No data available.</div>
      ) : (
        <>
          {/* Row 1 — Device risk */}
          <div className="an-stats-row">
            <div className="an-stat-card" style={{ '--asc': '#ef4444' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">High Risk Devices</div>
              <div className="an-stat-value neg">{(risk.high_risk_devices ?? 0).toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#f87171' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Blocked Devices</div>
              <div className="an-stat-value neg">{(risk.blocked_devices ?? 0).toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#f59e0b' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Device Sharing Violations</div>
              <div className="an-stat-value">{(risk.device_sharing_violations ?? 0).toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#fbbf24' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Concurrent Session Violations</div>
              <div className="an-stat-value">{(risk.concurrent_session_violations ?? 0).toLocaleString()}</div>
            </div>
          </div>

          {/* Row 2 — Threat events */}
          <div className="an-stats-row an-stats-row-3">
            <div className="an-stat-card" style={{ '--asc': '#a78bfa' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Geo Anomalies</div>
              <div className="an-stat-value" style={{ color:'#a78bfa' }}>{(risk.geo_anomalies ?? 0).toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#dc2626' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Replay Attacks</div>
              <div className="an-stat-value neg">{(risk.replay_attacks ?? 0).toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': scoreColor }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Avg Risk Score</div>
              <div className="an-stat-value" style={{ color: scoreColor }}>{avgScore.toFixed(1)}</div>
            </div>
          </div>

          {/* Gauge + Event Breakdown */}
          <div className="an-risk-row">
            <div className="an-card an-risk-gauge-card">
              <div className="an-card-head">
                <span className="an-card-title">Risk Score</span>
              </div>
              <RiskGauge score={avgScore} />
              <div className="an-risk-scale">
                <span style={{ color:'#10b981' }}>0 — Low</span>
                <span style={{ color:'#fbbf24' }}>40 — Med</span>
                <span style={{ color:'#ef4444' }}>70 — High</span>
              </div>
            </div>

            <div className="an-card an-risk-events-card">
              <div className="an-card-head">
                <span className="an-card-title">Event Breakdown</span>
                <span className="an-bd-total">{eventSegments.reduce((s, e) => s + e.value, 0).toLocaleString()} events</span>
              </div>
              {eventSegments.length === 0 ? (
                <div className="an-empty">No events recorded in this period.</div>
              ) : (
                <div className="an-bd-list">
                  {[...eventSegments].sort((a, b) => b.value - a.value).map((s, i) => {
                    const total = eventSegments.reduce((sum, e) => sum + e.value, 0);
                    const pct   = total > 0 ? (s.value / total) * 100 : 0;
                    return (
                      <div className="an-bd-row" key={s.key}>
                        <div className="an-bd-row-head">
                          <span className="an-bd-label">
                            <i className="an-bd-dot" style={{ background: s.color, boxShadow:`0 0 8px ${s.glow}` }} />
                            {s.label}
                          </span>
                          <span className="an-bd-value">{s.value.toLocaleString()} <em>· {pct.toFixed(1)}%</em></span>
                        </div>
                        <div className="an-bd-track">
                          <div className="an-bd-fill" style={{
                            '--bd-pct': `${pct}%`,
                            background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`,
                            boxShadow: `0 0 10px ${s.glow}`,
                            animationDelay: `${i * 0.08}s`,
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Trend Chart */}
          <div className="an-card" style={{ marginTop: 16 }}>
            <div className="an-card-head">
              <span className="an-card-title">Risk Trend Over Time</span>
            </div>
            <div className="an-chart-legend">
              <span className="an-legend-item"><i className="an-legend-swatch" style={{ background:'#ef4444' }} /> High Risk Devices</span>
              <span className="an-legend-item"><i className="an-legend-swatch" style={{ background:'#a78bfa', borderStyle:'dashed' }} /> Replay Attacks</span>
            </div>
            <RiskTrendChart trends={trends} />

            {trends.length > 0 && (
              <div className="an-table-scroll" style={{ marginTop:18 }}>
                <table className="an-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>High Risk Devices</th>
                      <th>Replay Attacks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map(d => (
                      <tr key={d.date}>
                        <td>{fmtDay(d.date)}</td>
                        <td className="an-cell-failed">{(d.high_risk_devices ?? 0).toLocaleString()}</td>
                        <td className="an-cell-failed">{(d.replay_attacks ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </>
      )}

      {/* ── Security Events full-screen modal ── */}
      {showEventsModal && (
        <div className="an-sec-modal-overlay" onClick={() => setShowEventsModal(false)}>
          <div className="an-sec-modal" onClick={e => e.stopPropagation()}>
            <div className="an-sec-modal-topbar">
              <button className="an-sec-modal-back" onClick={() => setShowEventsModal(false)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back
              </button>
              <span className="an-sec-modal-heading">Security Events</span>
            </div>
            <div className="an-sec-modal-body">
              <SecurityEventsPage />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
/* ── Country flag emoji helper ───────────────────────────── */
const countryFlag = (code) => {
  try {
    return code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
  } catch { return '🌐'; }
};

const fmtRevenue = (cents) =>
  `$${((cents ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ── Geo bar helper ──────────────────────────────────────── */
function GeoBar({ label, value, max, color, flag, sub }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="geo-bar-row">
      <div className="geo-bar-meta">
        <span className="geo-bar-flag">{flag}</span>
        <span className="geo-bar-label">{label}</span>
        {sub && <span className="geo-bar-sub">{sub}</span>}
      </div>
      <div className="geo-bar-track">
        <div className="geo-bar-fill" style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}bb)`,
          boxShadow: `0 0 10px ${color}55`,
        }} />
      </div>
      <span className="geo-bar-value" style={{ color }}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
  );
}

/* ── Geo Analytics tab ───────────────────────────────────── */
function GeoAnalytics() {
  const dispatch = useDispatch();
  const { geo, geoLoading, geoError, geoLimit } = useSelector(s => s.analytics);
  const [limitInput, setLimitInput] = useState(String(geoLimit));

  useEffect(() => {
    dispatch(fetchGeoAnalytics({ limit: geoLimit }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const applyLimit = () => {
    const n = Math.max(1, Math.min(200, parseInt(limitInput, 10) || 10));
    setLimitInput(String(n));
    dispatch(setGeoLimit(n));
    dispatch(fetchGeoAnalytics({ limit: n }));
  };

  const countries   = geo?.countries  || [];
  const topUsers    = geo?.top_by_users   || [];
  const topRevenue  = geo?.top_by_revenue || [];
  const maxUsers    = Math.max(...countries.map(c => c.users ?? 0), 1);
  const maxRevenue  = Math.max(...countries.map(c => c.revenue_cents ?? 0), 1);
  const maxDevices  = Math.max(...countries.map(c => c.devices ?? 0), 1);
  const maxSubs     = Math.max(...countries.map(c => c.subscriptions ?? 0), 1);

  const totalUsers   = countries.reduce((s, c) => s + (c.users ?? 0), 0);
  const totalDevices = countries.reduce((s, c) => s + (c.devices ?? 0), 0);
  const totalSubs    = countries.reduce((s, c) => s + (c.subscriptions ?? 0), 0);
  const totalRev     = countries.reduce((s, c) => s + (c.revenue_cents ?? 0), 0);

  return (
    <div className="an-section">
      {/* Toolbar */}
      <div className="an-toolbar">
        <div className="an-filter">
          <label>Countries to Show</label>
          <input
            type="number" min="1" max="200"
            className="an-date-input geo-limit-input"
            value={limitInput}
            onChange={e => setLimitInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyLimit()}
            style={{ width: 90 }}
          />
        </div>
        <button className="an-apply-btn" onClick={applyLimit}>Apply</button>
      </div>

      {geoLoading ? (
        <div className="an-loading">Loading geographic analytics…</div>
      ) : geoError ? (
        <div className="an-error">{geoError}</div>
      ) : !geo ? (
        <div className="an-empty">No geographic data available.</div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="an-stats-row">
            <div className="an-stat-card" style={{ '--asc': '#00d4ff' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Total Countries</div>
              <div className="an-stat-value">{(geo.total_countries ?? 0).toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#10b981' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Total Users</div>
              <div className="an-stat-value pos">{totalUsers.toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#a78bfa' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Total Devices</div>
              <div className="an-stat-value">{totalDevices.toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#fbbf24' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Total Subscriptions</div>
              <div className="an-stat-value">{totalSubs.toLocaleString()}</div>
            </div>
            <div className="an-stat-card" style={{ '--asc': '#34d399' }}>
              <div className="an-stat-accent" />
              <div className="an-stat-label">Total Revenue</div>
              <div className="an-stat-value pos">{fmtRevenue(totalRev)}</div>
            </div>
          </div>

          {/* Top charts row */}
          <div className="geo-charts-row">
            {/* Top by Users */}
            <div className="an-card">
              <div className="an-card-head">
                <span className="an-card-title">Top Countries by Users</span>
              </div>
              <div className="geo-bars">
                {(topUsers.length ? topUsers : countries.slice(0, 5)).map(c => (
                  <GeoBar
                    key={c.country_code}
                    flag={countryFlag(c.country_code)}
                    label={c.country_code}
                    value={c.users ?? 0}
                    max={Math.max(...(topUsers.length ? topUsers : countries.slice(0, 5)).map(x => x.users ?? 0), 1)}
                    color="#10b981"
                  />
                ))}
              </div>
            </div>

            {/* Top by Revenue */}
            <div className="an-card">
              <div className="an-card-head">
                <span className="an-card-title">Top Countries by Revenue</span>
              </div>
              <div className="geo-bars">
                {(topRevenue.length ? topRevenue : countries.slice(0, 5)).map(c => (
                  <GeoBar
                    key={c.country_code}
                    flag={countryFlag(c.country_code)}
                    label={c.country_code}
                    value={fmtRevenue(c.revenue_cents)}
                    max={Math.max(...(topRevenue.length ? topRevenue : countries.slice(0, 5)).map(x => x.revenue_cents ?? 0), 1)}
                    color="#fbbf24"
                    sub={c.revenue_display}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Full country table */}
          <div className="an-card" style={{ marginTop: 16 }}>
            <div className="an-card-head">
              <span className="an-card-title">All Countries</span>
              <span className="an-bd-total">{countries.length} countries shown</span>
            </div>
            <div className="an-table-scroll">
              <table className="an-table geo-table">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Users</th>
                    <th>Devices</th>
                    <th>Subscriptions</th>
                    <th>Revenue</th>
                    <th>User share</th>
                    <th>Revenue share</th>
                  </tr>
                </thead>
                <tbody>
                  {[...countries].sort((a, b) => (b.users ?? 0) - (a.users ?? 0)).map(c => {
                    const uPct  = totalUsers   > 0 ? ((c.users ?? 0) / totalUsers * 100).toFixed(1) : '0.0';
                    const rPct  = totalRev     > 0 ? ((c.revenue_cents ?? 0) / totalRev * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={c.country_code} className="geo-table-row">
                        <td>
                          <div className="geo-country-cell">
                            <span className="geo-flag">{countryFlag(c.country_code)}</span>
                            <span className="geo-code">{c.country_code}</span>
                          </div>
                        </td>
                        <td>
                          <div className="geo-inline-bar-wrap">
                            <div className="geo-inline-bar-track">
                              <div className="geo-inline-bar-fill" style={{ width:`${(c.users ?? 0)/maxUsers*100}%`, background:'#10b981' }} />
                            </div>
                            <span className="geo-inline-val">{(c.users ?? 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td>
                          <div className="geo-inline-bar-wrap">
                            <div className="geo-inline-bar-track">
                              <div className="geo-inline-bar-fill" style={{ width:`${(c.devices ?? 0)/maxDevices*100}%`, background:'#a78bfa' }} />
                            </div>
                            <span className="geo-inline-val">{(c.devices ?? 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td>
                          <div className="geo-inline-bar-wrap">
                            <div className="geo-inline-bar-track">
                              <div className="geo-inline-bar-fill" style={{ width:`${(c.subscriptions ?? 0)/maxSubs*100}%`, background:'#fbbf24' }} />
                            </div>
                            <span className="geo-inline-val">{(c.subscriptions ?? 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="geo-rev-cell">{c.revenue_display || fmtRevenue(c.revenue_cents)}</td>
                        <td>
                          <div className="geo-share-wrap">
                            <div className="geo-share-track">
                              <div className="geo-share-fill" style={{ width:`${uPct}%`, background:'#10b981' }} />
                            </div>
                            <span className="geo-share-pct">{uPct}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="geo-share-wrap">
                            <div className="geo-share-track">
                              <div className="geo-share-fill" style={{ width:`${rPct}%`, background:'#fbbf24' }} />
                            </div>
                            <span className="geo-share-pct">{rPct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── System latency history chart ───────────────────────── */
function LatencyHistoryChart({ historical }) {
  const [active, setActive] = useState(null);
  if (!historical?.length) return <div className="an-empty">No historical data available.</div>;

  const n = historical.length;
  const maxDb    = Math.max(...historical.map(d => d.avg_db_latency_ms ?? 0), 0);
  const maxRedis = Math.max(...historical.map(d => d.avg_redis_latency_ms ?? 0), 0);
  const niceMax  = niceCeil(Math.max(maxDb, maxRedis) || 1);
  const gridSteps = [1, 0.75, 0.5, 0.25, 0];
  const padTop = 14;

  const toPoints = (key) => historical.map((d, i) => ({
    x: n > 1 ? (i / (n - 1)) * 100 : 50,
    y: padTop + (1 - (d[key] ?? 0) / niceMax) * (100 - padTop),
    d, i,
  }));

  const dbPts    = toPoints('avg_db_latency_ms');
  const redisPts = toPoints('avg_redis_latency_ms');
  const dbLine   = smoothPath(dbPts);
  const redisLine = smoothPath(redisPts);
  const dbArea   = `${dbLine} L ${dbPts[n-1].x} 100 L ${dbPts[0].x} 100 Z`;

  return (
    <div className="an-chart">
      <div className="an-chart-yaxis">
        {gridSteps.map(t => (
          <span key={t} style={{ top:`${padTop + (1-t)*(100-padTop)}%` }}>{(niceMax * t).toFixed(1)}ms</span>
        ))}
      </div>
      <div className="an-chart-plot">
        <div className="an-chart-area">
          <div className="an-chart-gridlines">
            {gridSteps.map(t => <div key={t} className="an-chart-gridline" style={{ top:`${padTop + (1-t)*(100-padTop)}%` }} />)}
          </div>
          <svg className="an-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="dbAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#00d4ff" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={dbArea}   fill="url(#dbAreaGrad)" />
            <path d={dbLine}   fill="none" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={redisLine} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {active !== null && <div className="an-chart-crosshair" style={{ left:`${dbPts[active].x}%` }} />}
          {dbPts.map(p => (
            <div key={`db-${p.d.date}`} className={`an-chart-dot${active === p.i ? ' is-active' : ''}`}
              style={{ left:`${p.x}%`, top:`${p.y}%`, background:'#00d4ff', animationDelay:`${0.25+p.i*0.02}s` }} />
          ))}
          {redisPts.map(p => (
            <div key={`rd-${p.d.date}`} className={`an-chart-dot${active === p.i ? ' is-active' : ''}`}
              style={{ left:`${p.x}%`, top:`${p.y}%`, background:'#10b981', animationDelay:`${0.25+p.i*0.02}s` }} />
          ))}
          <div className="an-chart-hitcols">
            {dbPts.map(p => (
              <div key={p.d.date} className="an-chart-hitcol"
                onMouseEnter={() => setActive(p.i)} onMouseLeave={() => setActive(null)} />
            ))}
          </div>
          {active !== null && (
            <div className={`an-chart-tooltip${active===0?' align-start':active===n-1?' align-end':''}`}
              style={{ left:`${dbPts[active].x}%`, top:`${Math.min(dbPts[active].y, redisPts[active].y)}%` }}>
              <div className="an-tt-date">{fmtDay(historical[active].date)}</div>
              <div className="an-tt-row"><span>DB Latency</span><strong style={{color:'#00d4ff'}}>{(historical[active].avg_db_latency_ms ?? 0).toFixed(2)}ms</strong></div>
              <div className="an-tt-row"><span>Redis Latency</span><strong style={{color:'#10b981'}}>{(historical[active].avg_redis_latency_ms ?? 0).toFixed(2)}ms</strong></div>
              <div className="an-tt-row"><span>Error Rate</span><strong className="neg">{((historical[active].error_rate ?? 0)*100).toFixed(2)}%</strong></div>
            </div>
          )}
        </div>
        <div className="an-chart-xlabels">
          {historical.map((d, i) => (
            <span key={d.date} className="an-chart-xlabel">{i === 0 || i === n-1 || i === Math.floor(n/2) ? fmtDay(d.date) : ''}</span>
          ))}
        </div>
      </div>
    </div>
  );
}


function SystemAnalytics() {
  const dispatch = useDispatch();
  const { system, systemLoading, systemError } = useSelector(s => s.analytics);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing, setRefreshing]   = useState(false);

  const doFetch = () => {
    dispatch(fetchSystemAnalytics()).then(() => {
      setLastRefresh(new Date());
      setRefreshing(false);
    });
  };

  useEffect(() => { doFetch(); }, [dispatch]);

  const handleRefresh = () => { setRefreshing(true); doFetch(); };

  const dbColor    = (ms) => ms < 5 ? '#10b981' : ms < 20 ? '#fbbf24' : '#ef4444';
  const redisColor = (ms) => ms < 1 ? '#10b981' : ms < 5  ? '#fbbf24' : '#ef4444';
  const hbColor    = (ms) => ms < 200 ? '#10b981' : ms < 500 ? '#fbbf24' : '#ef4444';
  const errColor   = (pct) => pct < 1 ? '#10b981' : pct < 5 ? '#fbbf24' : '#ef4444';

  const historical = system?.historical || [];

  const fmtTs = (iso) => {
    try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    catch { return iso; }
  };

  return (
    <div className="an-section">
      {/* Toolbar */}
      <div className="an-toolbar">
        <div className="sys-refresh-info">
          {lastRefresh && <span className="sys-last-refresh">Last refreshed: {fmtTs(lastRefresh.toISOString())}</span>}
          <span className="sys-cache-note">Live probe — cached 60 s</span>
        </div>
        <button className={`an-apply-btn sys-refresh-btn${refreshing ? ' sys-refreshing' : ''}`}
          onClick={handleRefresh} disabled={refreshing} style={{ marginLeft:'auto' }}>
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {systemLoading && !system ? (
        <div className="an-loading">Loading system metrics…</div>
      ) : systemError ? (
        <div className="an-error">{systemError}</div>
      ) : !system ? (
        <div className="an-empty">No system data available.</div>
      ) : (
        <>
          {/* Measured-at banner */}
          {system.measured_at && (
            <div className="sys-measured-at">
              <span className="sys-live-dot" />
              Live probe at {fmtTs(system.measured_at)}
            </div>
          )}

          {/* Live metric cards */}
          <div className="an-stats-row sys-stats-row">
            {/* DB Latency */}
            <div className="an-stat-card sys-stat-card" style={{ '--asc': dbColor(system.db_latency_ms ?? 0) }}>
              <div className="an-stat-accent" />
              <div className="sys-stat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                </svg>
              </div>
              <div className="an-stat-label">DB Latency</div>
              <div className="an-stat-value" style={{ color: dbColor(system.db_latency_ms ?? 0) }}>
                {(system.db_latency_ms ?? 0).toFixed(2)}<span className="sys-unit">ms</span>
              </div>
              <div className="sys-status-chip" style={{ background: `${dbColor(system.db_latency_ms ?? 0)}20`, color: dbColor(system.db_latency_ms ?? 0) }}>
                {(system.db_latency_ms ?? 0) < 5 ? 'Healthy' : (system.db_latency_ms ?? 0) < 20 ? 'Degraded' : 'Critical'}
              </div>
            </div>

            {/* Redis Latency */}
            <div className="an-stat-card sys-stat-card" style={{ '--asc': redisColor(system.redis_latency_ms ?? 0) }}>
              <div className="an-stat-accent" />
              <div className="sys-stat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div className="an-stat-label">Redis Latency</div>
              <div className="an-stat-value" style={{ color: redisColor(system.redis_latency_ms ?? 0) }}>
                {(system.redis_latency_ms ?? 0).toFixed(2)}<span className="sys-unit">ms</span>
              </div>
              <div className="sys-status-chip" style={{ background: `${redisColor(system.redis_latency_ms ?? 0)}20`, color: redisColor(system.redis_latency_ms ?? 0) }}>
                {(system.redis_latency_ms ?? 0) < 1 ? 'Healthy' : (system.redis_latency_ms ?? 0) < 5 ? 'Degraded' : 'Critical'}
              </div>
            </div>

            {/* Qdrant */}
            <div className="an-stat-card sys-stat-card" style={{ '--asc': system.qdrant_available ? '#10b981' : '#ef4444' }}>
              <div className="an-stat-accent" />
              <div className="sys-stat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10"/>
                  {system.qdrant_available
                    ? <polyline points="9 12 11 14 15 10"/>
                    : <><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
                </svg>
              </div>
              <div className="an-stat-label">Qdrant</div>
              <div className="an-stat-value" style={{ color: system.qdrant_available ? '#10b981' : '#ef4444', fontSize:'1.1rem' }}>
                {system.qdrant_available ? 'Available' : 'Unavailable'}
              </div>
              <div className="sys-status-chip" style={{ background: system.qdrant_available ? '#10b98120' : '#ef444420', color: system.qdrant_available ? '#10b981' : '#ef4444' }}>
                {system.qdrant_available ? 'Online' : 'Offline'}
              </div>
            </div>

            {/* Heartbeat Avg Latency */}
            <div className="an-stat-card sys-stat-card" style={{ '--asc': hbColor(system.heartbeat_avg_latency_ms ?? 0) }}>
              <div className="an-stat-accent" />
              <div className="sys-stat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <div className="an-stat-label">Heartbeat Avg</div>
              <div className="an-stat-value" style={{ color: hbColor(system.heartbeat_avg_latency_ms ?? 0) }}>
                {(system.heartbeat_avg_latency_ms ?? 0).toFixed(1)}<span className="sys-unit">ms</span>
              </div>
              <div className="sys-status-chip" style={{ background: `${hbColor(system.heartbeat_avg_latency_ms ?? 0)}20`, color: hbColor(system.heartbeat_avg_latency_ms ?? 0) }}>
                {(system.heartbeat_avg_latency_ms ?? 0) < 200 ? 'Healthy' : (system.heartbeat_avg_latency_ms ?? 0) < 500 ? 'Degraded' : 'Critical'}
              </div>
            </div>

            {/* Error Rate */}
            <div className="an-stat-card sys-stat-card" style={{ '--asc': errColor(system.error_rate_pct ?? 0) }}>
              <div className="an-stat-accent" />
              <div className="sys-stat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div className="an-stat-label">Error Rate</div>
              <div className="an-stat-value" style={{ color: errColor(system.error_rate_pct ?? 0) }}>
                {(system.error_rate_pct ?? 0).toFixed(2)}<span className="sys-unit">%</span>
              </div>
              <div className="sys-status-chip" style={{ background: `${errColor(system.error_rate_pct ?? 0)}20`, color: errColor(system.error_rate_pct ?? 0) }}>
                {(system.error_rate_pct ?? 0) < 1 ? 'Healthy' : (system.error_rate_pct ?? 0) < 5 ? 'Elevated' : 'Critical'}
              </div>
            </div>
          </div>

          {/* Latency history chart */}
          {historical.length > 0 && (
            <div className="an-card" style={{ marginTop: 16 }}>
              <div className="an-card-head">
                <span className="an-card-title">7-Day Latency History</span>
              </div>
              <div className="an-chart-legend">
                <span className="an-legend-item"><i className="an-legend-swatch" style={{ background:'#00d4ff' }} /> DB Latency</span>
                <span className="an-legend-item"><i className="an-legend-swatch" style={{ background:'#10b981', borderStyle:'dashed' }} /> Redis Latency</span>
              </div>
              <LatencyHistoryChart historical={historical} />

              {/* Error rate mini bars */}
              <div className="sys-err-section">
                <div className="sys-err-title">Daily Error Rate</div>
                <div className="sys-err-bars">
                  {historical.map((d) => {
                    const pct = (d.error_rate ?? 0) * 100;
                    const col = errColor(pct);
                    const barH = Math.max(4, (pct / Math.max(...historical.map(h => (h.error_rate ?? 0) * 100), 0.01)) * 60);
                    return (
                      <div key={d.date} className="sys-err-bar-wrap" title={`${fmtDay(d.date)}: ${pct.toFixed(2)}%`}>
                        <span className="sys-err-val" style={{ color: col }}>{pct.toFixed(1)}%</span>
                        <div className="sys-err-bar-col">
                          <div className="sys-err-bar-fill" style={{ height: barH, background: col, boxShadow:`0 0 6px ${col}66` }} />
                        </div>
                        <span className="sys-err-date">{fmtDay(d.date)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Historical table */}
              <div className="an-table-scroll" style={{ marginTop: 18 }}>
                <table className="an-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>DB Latency</th>
                      <th>Redis Latency</th>
                      <th>Error Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...historical].reverse().map(d => (
                      <tr key={d.date}>
                        <td>{fmtDay(d.date)}</td>
                        <td style={{ color: dbColor(d.avg_db_latency_ms ?? 0), fontWeight: 700 }}>{(d.avg_db_latency_ms ?? 0).toFixed(2)} ms</td>
                        <td style={{ color: redisColor(d.avg_redis_latency_ms ?? 0), fontWeight: 700 }}>{(d.avg_redis_latency_ms ?? 0).toFixed(2)} ms</td>
                        <td style={{ color: errColor((d.error_rate ?? 0)*100), fontWeight: 700 }}>{((d.error_rate ?? 0)*100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const TAB_META = {
  revenue:  { title: 'Analytics',  subtitle: 'Revenue, growth and transaction insights.' },
  users:    { title: 'Analytics',  subtitle: 'User growth, registrations and activity trends.' },
  devices:  { title: 'Analytics',  subtitle: 'Device usage, status distribution and activity.' },
  licenses: { title: 'Analytics',  subtitle: 'License allocation, usage and expiry overview.' },
  funnel:   { title: 'Analytics',  subtitle: 'Conversion funnel from registration to payment.' },
  churn:    { title: 'Analytics',  subtitle: 'Subscription cancellations, non-renewals and churn rate.' },
  security: { title: 'Security Analytics', subtitle: 'Risk scores, fraud signals, geo anomalies and threat trends.' },
  geo:      { title: 'Geo Analytics',      subtitle: 'User, device, subscription and revenue distribution by country.' },
  system:   { title: 'System Health',      subtitle: 'Live infrastructure latency, error rate and 7-day performance history.' },
};

export default function AnalyticsPage({ activeTab = 'revenue' }) {
  const meta = TAB_META[activeTab] || TAB_META.revenue;
  const revenue = useSelector(s => s.analytics.revenue);

  return (
    <div className="an-page">
      <div className="an-header">
        <div>
          <h1 className="an-title">{meta.title}</h1>
          <div className="an-subtitle">{meta.subtitle}</div>
        </div>
        {activeTab === 'revenue' && revenue && (
          <AnExportButton
            onExportPDF={() => exportRevenueAnalyticsToPDF(revenue)}
            onExportExcel={() => exportRevenueAnalyticsToExcel(revenue)}
          />
        )}
      </div>

      {activeTab === 'revenue' && <RevenueAnalytics />}
      {activeTab === 'users' && <UserAnalytics />}
      {activeTab === 'devices' && <DeviceAnalytics />}
      {activeTab === 'licenses' && <LicenseAnalytics />}
      {activeTab === 'funnel' && <FunnelAnalytics />}
      {activeTab === 'churn' && <ChurnAnalytics />}
      {activeTab === 'security' && <SecurityAnalytics />}
      {activeTab === 'geo'      && <GeoAnalytics />}
      {activeTab === 'system'   && <SystemAnalytics />}
    </div>
  );
}
