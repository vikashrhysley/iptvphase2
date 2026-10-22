// Get Help — support analytics (volume, timing, SLA quality, backlog, workload).
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { apiFetchSupportAnalytics } from '../../services/api';
import { fetchSupportAssignees } from '../../store/slices/supportSlice';
import { isPermissionDenied } from '../../services/permissionErrors';
import { AccessDenied } from '../common/PermissionDenied';
import {
  CATEGORY_SUGGESTIONS, PRIORITY_ORDER, STATUS_ORDER, TYPE_ORDER,
  fmtMinutes, fmtNum, fmtPct, humanize, normalizeBreakdown, priorityLabel, resolutionLabel, statusLabel,
  typeLabel, useElementWidth,
} from './supportUtils';
import { Avatar, EmptyState, ErrorBanner, SkeletonLines } from './SupportUi';
import {
  ChartIcon, CheckCircleIcon, ClockIcon, InboxIcon, RefreshIcon, RetryIcon, TableIcon, TemplateIcon, UserIcon,
} from './SupportIcons';

const RANGES = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: 'custom', label: 'Custom' },
];

const isoDay = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return z.toISOString().slice(0, 10);
};

// Round the axis top up to 4 × a 1 / 2 / 5 step so every gridline is a whole number.
const niceScale = (rawMax) => {
  const target = Math.max(1, rawMax) / 4;
  const pow = 10 ** Math.floor(Math.log10(target));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= target) || 10 * pow);
  return { step, max: step * 4 };
};

const shortDate = (s) => {
  const t = new Date(`${String(s).slice(0, 10)}T00:00:00`);
  return Number.isNaN(t.getTime()) ? String(s) : t.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/* ── Volume trend (created vs resolved) ─────────────────── */
function VolumeChart({ points }) {
  const [wrapRef, width] = useElementWidth();
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);

  const H = 250;
  const pad = { l: 40, r: 18, t: 14, b: 30 };
  const n = points.length;
  const totals = points.reduce((acc, p) => ({ created: acc.created + p.created, resolved: acc.resolved + p.resolved }), { created: 0, resolved: 0 });
  const { step, max } = niceScale(Math.max(0, ...points.flatMap((p) => [p.created, p.resolved])));
  const innerW = Math.max(1, width - pad.l - pad.r);
  const innerH = H - pad.t - pad.b;
  const x = (i) => pad.l + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v) => pad.t + innerH * (1 - v / max);
  const line = (key) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const area = (key) => (n ? `${line(key)} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : '');
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 80))));

  const onMove = (e) => {
    if (!n) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left - pad.l;
    const idx = n <= 1 ? 0 : Math.round((mx / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, idx)));
  };

  const hp = hover != null ? points[hover] : null;
  const tipLeft = hover != null ? Math.min(Math.max(x(hover) + 12, 8), Math.max(8, width - 180)) : 0;

  return (
    <div className="gh-chart">
      <div className="gh-chart-head">
        <div className="gh-legend">
          <span className="gh-legend-item"><span className="gh-swatch s1" /> Created <strong>{fmtNum(totals.created)}</strong></span>
          <span className="gh-legend-item"><span className="gh-swatch s2" /> Resolved <strong>{fmtNum(totals.resolved)}</strong></span>
        </div>
        <button type="button" className="gh-btn tiny subtle" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? <ChartIcon size={12} /> : <TableIcon size={12} />} {asTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {asTable ? (
        <div className="gh-chart-table">
          <table className="gh-table compact">
            <thead><tr><th>Date</th><th className="gh-col-right">Created</th><th className="gh-col-right">Resolved</th></tr></thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date}><td>{shortDate(p.date)}</td><td className="gh-col-right">{fmtNum(p.created)}</td><td className="gh-col-right">{fmtNum(p.resolved)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="gh-chart-plot" ref={wrapRef} style={{ height: H }}>
          {width > 0 && (
            <svg
              width={width} height={H} role="img"
              aria-label={`Tickets created (${totals.created}) and resolved (${totals.resolved}) per day`}
              onMouseMove={onMove} onMouseLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id="gh-area-s1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gh-s1)" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="var(--gh-s1)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4].map((i) => {
                const v = i * step;
                return (
                  <g key={i}>
                    <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} className={`gh-grid${i === 0 ? ' base' : ''}`} />
                    <text x={pad.l - 8} y={y(v)} className="gh-axis" textAnchor="end" dominantBaseline="middle">{fmtNum(v)}</text>
                  </g>
                );
              })}
              {points.map((p, i) => (i % labelEvery === 0 || i === n - 1) && (
                <text key={p.date} x={x(i)} y={H - 8} className="gh-axis" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
                  {shortDate(p.date)}
                </text>
              ))}
              <path d={area('created')} fill="url(#gh-area-s1)" />
              <path d={line('created')} className="gh-line s1" />
              <path d={line('resolved')} className="gh-line s2" />
              {hp && (
                <g>
                  <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} className="gh-crosshair" />
                  <circle cx={x(hover)} cy={y(hp.created)} r="4.5" className="gh-point s1" />
                  <circle cx={x(hover)} cy={y(hp.resolved)} r="4.5" className="gh-point s2" />
                </g>
              )}
              <rect x={pad.l} y={pad.t} width={innerW} height={innerH} fill="transparent" />
            </svg>
          )}
          {hp && (
            <div className="gh-tooltip" style={{ left: tipLeft, top: 10 }}>
              <div className="gh-tooltip-title">{shortDate(hp.date)}</div>
              <div className="gh-tooltip-row"><span className="gh-swatch s1" /> Created <strong>{fmtNum(hp.created)}</strong></div>
              <div className="gh-tooltip-row"><span className="gh-swatch s2" /> Resolved <strong>{fmtNum(hp.resolved)}</strong></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Horizontal bar list (single hue = magnitude) ───────── */
function BarList({ rows, emptyText = 'No data for this period.', order }) {
  if (!rows.length) return <div className="gh-ctx-empty">{emptyText}</div>;
  const sorted = order
    ? [...rows].sort((a, b) => (order.indexOf(a.key) === -1 ? 99 : order.indexOf(a.key)) - (order.indexOf(b.key) === -1 ? 99 : order.indexOf(b.key)))
    : [...rows].sort((a, b) => b.count - a.count);
  const top = Math.max(1, ...sorted.map((r) => r.count));
  return (
    <ul className="gh-barlist">
      {sorted.map((r) => (
        <li key={r.key} title={`${r.label}: ${fmtNum(r.count)}`}>
          <div className="gh-barlist-top"><span>{r.label}</span><strong>{fmtNum(r.count)}</strong></div>
          <div className="gh-barlist-track"><div className="gh-barlist-fill" style={{ width: `${Math.max(r.count ? 2 : 0, (r.count / top) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function StatTile({ icon, label, value, sub, tone = 'blue' }) {
  return (
    <div className={`gh-stat tone-${tone}`}>
      <span className="gh-stat-icon">{icon}</span>
      <div>
        <div className="gh-stat-label">{label}</div>
        <div className="gh-stat-value">{value}</div>
        {sub && <div className="gh-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function ComplianceTile({ label, pct, hint }) {
  const n = pct == null || Number.isNaN(Number(pct)) ? null : Number(pct);
  const tone = n == null ? 'muted' : n >= 90 ? 'green' : n >= 75 ? 'amber' : 'red';
  const verdict = n == null ? 'No data' : n >= 90 ? 'Healthy' : n >= 75 ? 'Watch' : 'Needs attention';
  return (
    <div className={`gh-stat compliance tone-${tone}`}>
      <div className="gh-stat-label">{label}</div>
      <div className="gh-stat-value">{n == null ? '—' : fmtPct(n)}</div>
      <div className="gh-meter-track"><div className="gh-meter-fill tone" style={{ width: `${Math.min(100, n ?? 0)}%` }} /></div>
      <div className="gh-stat-sub"><span className={`gh-dot tone-${tone}`} /> {verdict}{hint ? ` · ${hint}` : ''}</div>
    </div>
  );
}

export default function SupportAnalytics() {
  const dispatch = useDispatch();
  const accessToken = useSelector((s) => s.auth.accessToken);
  const assignees = useSelector((s) => s.support.assignees);

  const [range, setRange] = useState('30');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [filters, setFilters] = useState({ ticket_type: '', priority: '', assignee_id: '', category: '' });
  const [state, setState] = useState({ data: null, error: null, key: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { dispatch(fetchSupportAssignees()); }, [dispatch]);

  const params = useMemo(() => {
    const p = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; });
    if (range === 'custom') {
      if (custom.from) p.date_from = custom.from;
      if (custom.to) p.date_to = custom.to;
    } else {
      const to = new Date();
      const from = new Date(to.getTime() - (Number(range) - 1) * 86_400_000);
      p.date_from = isoDay(from);
      p.date_to = isoDay(to);
    }
    return p;
  }, [filters, range, custom]);

  // Loading = the latest request (filters + manual refresh) hasn't answered yet; the previous
  // numbers stay on screen, dimmed, until it does.
  const requestKey = `${JSON.stringify(params)}#${reloadKey}`;
  useEffect(() => {
    let alive = true;
    apiFetchSupportAnalytics(accessToken, params)
      .then((data) => { if (alive) setState({ data, error: null, key: requestKey }); })
      .catch((error) => { if (alive) setState((s) => ({ ...s, error, key: requestKey })); });
    return () => { alive = false; };
  }, [accessToken, params, requestKey]);
  const loading = state.key !== requestKey;

  const d = state.data || {};
  const trend = useMemo(() => (Array.isArray(d.volume_trend) ? d.volume_trend : []).map((p) => ({
    date: p.date,
    created: Number(p.created) || 0,
    resolved: Number(p.resolved) || 0,
  })), [d.volume_trend]);

  const backlog = d.backlog || {};
  const byStatus = normalizeBreakdown(backlog.by_status, statusLabel);
  const byPriority = normalizeBreakdown(backlog.by_priority, priorityLabel);
  const byType = normalizeBreakdown(backlog.by_type, typeLabel);
  const resolutionCodes = normalizeBreakdown(d.resolution_codes, resolutionLabel);
  const topReasons = normalizeBreakdown(d.top_reasons);
  const cannedUsage = normalizeBreakdown(d.canned_response_usage);
  const workload = Array.isArray(d.admin_workload) ? d.admin_workload : [];
  const workloadMax = Math.max(1, ...workload.map((w) => Number(w.open_assigned) || 0));
  const backlogTotal = backlog.total ?? byStatus.reduce((s, r) => s + r.count, 0);

  if (state.error && isPermissionDenied(state.error)) return <AccessDenied message={state.error.message} />;

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="gh-analytics">
      {/* Filters — one row above the charts */}
      <div className="gh-card gh-an-filters">
        <div className="gh-seg" role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r.id} type="button" role="tab" aria-selected={range === r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="gh-an-dates">
            <input type="date" className="gh-input" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} aria-label="From date" />
            <span className="gh-muted">to</span>
            <input type="date" className="gh-input" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} aria-label="To date" />
          </div>
        )}
        <select className="gh-input" value={filters.ticket_type} onChange={(e) => setFilter('ticket_type', e.target.value)} aria-label="Ticket type">
          <option value="">All types</option>
          {TYPE_ORDER.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
        </select>
        <select className="gh-input" value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} aria-label="Priority">
          <option value="">All priorities</option>
          {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{priorityLabel(p)}</option>)}
        </select>
        <select className="gh-input" value={filters.category} onChange={(e) => setFilter('category', e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
        </select>
        <select className="gh-input" value={filters.assignee_id} onChange={(e) => setFilter('assignee_id', e.target.value)} aria-label="Assignee">
          <option value="">Whole team</option>
          {assignees.map((a) => <option key={a.id} value={a.id}>{a.name || a.email}</option>)}
        </select>
        <span className="gh-spacer" />
        <button type="button" className="gh-icon-btn bordered" onClick={() => setReloadKey((k) => k + 1)} title="Refresh" aria-label="Refresh analytics">
          <RefreshIcon size={15} className={loading ? 'gh-spin' : ''} />
        </button>
      </div>

      {state.error && <ErrorBanner message={state.error.message || 'Could not load analytics.'} onRetry={() => setReloadKey((k) => k + 1)} />}

      {loading && !state.data ? (
        <div className="gh-card"><SkeletonLines rows={6} height={56} /></div>
      ) : !state.data ? null : (
        <div className={loading ? 'gh-dim' : ''}>
          {/* Headline stats */}
          <section className="gh-stats">
            <StatTile icon={<InboxIcon size={16} />} tone="blue" label="Created" value={fmtNum(d.created)} sub="New tickets in range" />
            <StatTile icon={<CheckCircleIcon size={16} />} tone="green" label="Resolved" value={fmtNum(d.resolved)} sub="Resolved in range" />
            <StatTile
              icon={<ClockIcon size={16} />} tone="violet" label="First response · avg"
              value={fmtMinutes(d.first_response?.avg_minutes)}
              sub={`Median ${fmtMinutes(d.first_response?.median_minutes)} · ${fmtNum(d.first_response?.count ?? 0)} tickets`}
            />
            <StatTile
              icon={<ClockIcon size={16} />} tone="cyan" label="Resolution · avg"
              value={fmtMinutes(d.resolution?.avg_minutes)}
              sub={`Median ${fmtMinutes(d.resolution?.median_minutes)} · excludes time waiting on the user`}
            />
            <ComplianceTile label="First-response SLA" pct={d.sla?.first_response_compliance_pct} />
            <ComplianceTile label="Resolution SLA" pct={d.sla?.resolution_compliance_pct} />
            <StatTile icon={<RetryIcon size={16} />} tone="orange" label="Reopen rate" value={fmtPct(d.reopen_rate_pct)} sub="Resolved tickets the user reopened" />
          </section>

          <div className="gh-an-grid two">
            <section className="gh-card gh-an-card">
              <header className="gh-an-head"><h3>Volume trend</h3><span className="gh-sub">Created vs resolved per day</span></header>
              {trend.length ? <VolumeChart points={trend} /> : <EmptyState icon={<ChartIcon size={22} />} title="No tickets in this period" />}
            </section>
            <section className="gh-card gh-an-card">
              <header className="gh-an-head"><h3>Open backlog</h3><span className="gh-sub">Right now, by status</span></header>
              <div className="gh-big-number">{fmtNum(backlogTotal)}<span>open tickets</span></div>
              <BarList rows={byStatus} order={STATUS_ORDER} emptyText="No open backlog." />
            </section>
          </div>

          <div className="gh-an-grid three">
            <section className="gh-card gh-an-card">
              <header className="gh-an-head"><h3>Backlog by priority</h3></header>
              <BarList rows={byPriority} order={PRIORITY_ORDER} />
            </section>
            <section className="gh-card gh-an-card">
              <header className="gh-an-head"><h3>Backlog by type</h3></header>
              <BarList rows={byType} order={TYPE_ORDER} />
            </section>
            <section className="gh-card gh-an-card">
              <header className="gh-an-head"><h3>Resolution codes</h3></header>
              <BarList rows={resolutionCodes} />
            </section>
          </div>

          <div className="gh-an-grid three">
            <section className="gh-card gh-an-card span-2">
              <header className="gh-an-head"><h3>Team workload</h3><span className="gh-sub">Open tickets assigned · resolved in range</span></header>
              {workload.length ? (
                <div className="gh-table-wrap flat">
                  <table className="gh-table compact">
                    <thead>
                      <tr><th>Admin</th><th>Open assigned</th><th className="gh-col-right">Resolved</th></tr>
                    </thead>
                    <tbody>
                      {[...workload].sort((a, b) => (b.open_assigned || 0) - (a.open_assigned || 0)).map((w) => (
                        <tr key={w.admin_id || w.name}>
                          <td><span className="gh-assignee"><Avatar name={w.name} size={24} />{w.name || '—'}</span></td>
                          <td>
                            <div className="gh-inline-bar">
                              <div className="gh-barlist-track"><div className="gh-barlist-fill" style={{ width: `${((Number(w.open_assigned) || 0) / workloadMax) * 100}%` }} /></div>
                              <strong>{fmtNum(w.open_assigned ?? 0)}</strong>
                            </div>
                          </td>
                          <td className="gh-col-right"><strong>{fmtNum(w.resolved ?? 0)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState icon={<UserIcon size={22} />} title="No assigned work in this period" />}
            </section>
            <section className="gh-card gh-an-card">
              <header className="gh-an-head"><h3>Top reasons</h3></header>
              <BarList rows={topReasons.slice(0, 8)} />
            </section>
          </div>

          <section className="gh-card gh-an-card">
            <header className="gh-an-head"><h3><TemplateIcon size={15} /> Template usage</h3><span className="gh-sub">Replies sent with a canned response</span></header>
            <BarList rows={cannedUsage.slice(0, 10)} emptyText="No templates used in this period." />
          </section>
        </div>
      )}
    </div>
  );
}
