import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRevenueAnalytics, setRevenueFilters, clearRevenueFilters, fetchUserAnalytics, setUsersFilters, clearUsersFilters, fetchDeviceAnalytics, fetchLicenseAnalytics, fetchFunnelAnalytics, setFunnelFilters, clearFunnelFilters, fetchChurnAnalytics, setChurnFilters, clearChurnFilters } from '../../store/slices/analyticsSlice';
import './AnalyticsPage.css';

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
  suspended: { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
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
function RevenueAnalytics() {
  const dispatch = useDispatch();
  const { revenue, loading, error, revenueFilters } = useSelector(s => s.analytics);
  const [startDate, setStartDate] = useState(revenueFilters.start_date);
  const [endDate, setEndDate]     = useState(revenueFilters.end_date);

  useEffect(() => {
    dispatch(fetchRevenueAnalytics(revenueFilters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const applyFilters = () => {
    const next = { start_date: startDate, end_date: endDate };
    dispatch(setRevenueFilters(next));
    dispatch(fetchRevenueAnalytics(next));
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    dispatch(clearRevenueFilters());
    dispatch(fetchRevenueAnalytics({}));
  };

  const daily = revenue?.daily || [];
  const growth = revenue?.revenue_growth_pct ?? 0;
  const hasFilters = !!(revenueFilters.start_date || revenueFilters.end_date);

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

      {loading ? (
        <div className="an-loading">Loading revenue analytics…</div>
      ) : error ? (
        <div className="an-error">{error}</div>
      ) : !revenue ? (
        <div className="an-empty">No data available.</div>
      ) : (
        <>
          {(revenue.start_date || revenue.end_date) && (
            <div className="an-period">{revenue.start_date} → {revenue.end_date}</div>
          )}

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

            {daily.length === 0 ? (
              <div className="an-empty">No daily data for this period.</div>
            ) : (
              <>
                <div className="an-chart-legend">
                  <span className="an-legend-item"><i className="an-legend-swatch revenue" /> Daily revenue</span>
                  <span className="an-legend-item"><i className="an-legend-swatch peak" /> Peak day</span>
                  <span className="an-legend-item"><i className="an-legend-swatch refund" /> Refund issued</span>
                </div>

                <RevenueChart daily={daily} />

                <div className="an-table-scroll">
                  <table className="an-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Revenue</th>
                        <th>Refunds</th>
                        <th>Successful</th>
                        <th>Failed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.map(d => (
                        <tr key={d.date}>
                          <td>{fmtDay(d.date)}</td>
                          <td className="an-cell-revenue">{fmtCents(d.revenue_cents)}</td>
                          <td className="an-cell-refund">{fmtCents(d.refunds_cents)}</td>
                          <td>{(d.successful_transactions ?? 0).toLocaleString()}</td>
                          <td className="an-cell-failed">{(d.failed_transactions ?? 0).toLocaleString()}</td>
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
        <div className="an-stat-card" style={{ '--asc': '#f59e0b' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Suspended</div>
          <div className="an-stat-value">{(devices.suspended_devices ?? 0).toLocaleString()}</div>
        </div>
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
  const conversionRate = licenses.trial_to_paid_rate_pct ?? 0;
  const conversionColor = conversionRate >= 70 ? '#10b981' : conversionRate >= 40 ? '#fbbf24' : '#ef4444';

  const planSegments = toSegments(licenses.by_plan_type, PLAN_COLORS);

  return (
    <div className="an-section">
      <div className="an-stats-row">
        <div className="an-stat-card" style={{ '--asc': '#00d4ff' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Total Licenses</div>
          <div className="an-stat-value">{total.toLocaleString()}</div>
        </div>
        <div className="an-stat-card" style={{ '--asc': '#10b981' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Active</div>
          <div className="an-stat-value pos">{(licenses.active_licenses ?? 0).toLocaleString()}</div>
        </div>
        <div className="an-stat-card" style={{ '--asc': '#ef4444' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Expired</div>
          <div className="an-stat-value neg">{(licenses.expired_licenses ?? 0).toLocaleString()}</div>
        </div>
        <div className="an-stat-card" style={{ '--asc': conversionColor }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Trial → Paid Rate</div>
          <div className="an-stat-value">{conversionRate}%</div>
        </div>
      </div>

      <div className="an-stats-row">
        <div className="an-stat-card" style={{ '--asc': '#00d4ff' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Trial Licenses</div>
          <div className="an-stat-value">{(licenses.trial_licenses ?? 0).toLocaleString()}</div>
        </div>
        <div className="an-stat-card" style={{ '--asc': '#f59e0b' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Grace Period</div>
          <div className="an-stat-value">{(licenses.grace_licenses ?? 0).toLocaleString()}</div>
        </div>
        <div className="an-stat-card" style={{ '--asc': '#10b981' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Converted to Paid</div>
          <div className="an-stat-value pos">{(licenses.converted_paid ?? 0).toLocaleString()}</div>
        </div>
        <div className="an-stat-card" style={{ '--asc': '#fbbf24' }}>
          <div className="an-stat-accent" />
          <div className="an-stat-label">Expiring Soon</div>
          <div className="an-stat-split">
            <div className="an-stat-split-item">
              <span className="an-stat-split-value">{(licenses.expiring_7d ?? 0).toLocaleString()}</span>
              <span className="an-stat-split-label">Next 7 days</span>
            </div>
            <div className="an-stat-split-divider" />
            <div className="an-stat-split-item">
              <span className="an-stat-split-value">{(licenses.expiring_30d ?? 0).toLocaleString()}</span>
              <span className="an-stat-split-label">Next 30 days</span>
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

/* ── Main Page ──────────────────────────────────────────── */
export default function AnalyticsPage({ activeTab = 'revenue' }) {
  return (
    <div className="an-page">
      <div className="an-header">
        <div>
          <h1 className="an-title">Analytics</h1>
          <div className="an-subtitle">Revenue, growth and transaction insights.</div>
        </div>
      </div>

      {activeTab === 'revenue' && <RevenueAnalytics />}
      {activeTab === 'users' && <UserAnalytics />}
      {activeTab === 'devices' && <DeviceAnalytics />}
      {activeTab === 'licenses' && <LicenseAnalytics />}
      {activeTab === 'funnel' && <FunnelAnalytics />}
      {activeTab === 'churn' && <ChurnAnalytics />}
    </div>
  );
}
