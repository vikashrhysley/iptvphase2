import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSecurityAnalytics, setSecurityFilters, clearSecurityFilters } from '../../store/slices/analyticsSlice';
import './SecurityEventsPage.css';

/* ── Icons ──────────────────────────────────────────────── */
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const LoginIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
    <polyline points="10 17 15 12 10 7"/>
    <line x1="15" y1="12" x2="3" y2="12"/>
  </svg>
);
const KeyIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);
const RepeatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
);
const BlockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);
const HashIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="4" y1="9" x2="20" y2="9"/>
    <line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/>
    <line x1="16" y1="3" x2="14" y2="21"/>
  </svg>
);
const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const TrendUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

/* ── Event type definitions ────────────────────────────── */
const EVENT_TYPES = [
  {
    key:        'failed_login',
    dataKey:    'failed_logins',
    label:      'Failed Login Attempts',
    icon:       <LoginIcon />,
    severity:   'critical',
    color:      '#ef4444',
    glow:       'rgba(239,68,68,0.4)',
    description: 'User login attempts that failed due to incorrect credentials, locked accounts, or brute-force protection triggers.',
    source:     'UserLoginHistory',
    recommendation: 'Review accounts with repeated failures. Consider enforcing account lockout policies and enabling geofencing.',
  },
  {
    key:        'otp_failure',
    dataKey:    'otp_failures',
    label:      'OTP Verification Failures',
    icon:       <KeyIcon />,
    severity:   'high',
    color:      '#f59e0b',
    glow:       'rgba(245,158,11,0.4)',
    description: 'One-time password verification failures — expired codes, incorrect entries, or replay attempts on OTP tokens.',
    source:     'UserLoginHistory, RiskEvent',
    recommendation: 'Shorten OTP TTL, limit retry attempts per session, and alert on burst OTP failures from a single IP.',
  },
  {
    key:        'totp_failure',
    dataKey:    'totp_failures',
    label:      'TOTP Verification Failures',
    icon:       <ClockIcon />,
    severity:   'high',
    color:      '#fbbf24',
    glow:       'rgba(251,191,36,0.4)',
    description: 'Time-based OTP failures — clock-skew issues, expired windows, or attempts to use already-consumed TOTP codes.',
    source:     'RiskEvent',
    recommendation: 'Allow ±1 window tolerance for clock skew. Flag devices with repeated TOTP failures for manual review.',
  },
  {
    key:        'token_replay',
    dataKey:    'token_replays',
    label:      'Token Replay Attacks',
    icon:       <RepeatIcon />,
    severity:   'critical',
    color:      '#a78bfa',
    glow:       'rgba(167,139,250,0.4)',
    description: 'Attempts to reuse previously invalidated or expired access/refresh tokens, which may indicate session hijacking.',
    source:     'TokenBlacklist, RiskEvent',
    recommendation: 'Immediately revoke all tokens for affected users. Investigate the IP source and check for credential compromise.',
  },
  {
    key:        'blacklist_hit',
    dataKey:    'blacklist_hits',
    label:      'Token Blacklist Hits',
    icon:       <BlockIcon />,
    severity:   'high',
    color:      '#ec4899',
    glow:       'rgba(236,72,153,0.4)',
    description: 'Requests using tokens that have been explicitly blacklisted — typically from logged-out sessions or revoked access.',
    source:     'TokenBlacklist',
    recommendation: 'Ensure client-side token invalidation on logout. Monitor for patterns suggesting stolen token reuse.',
  },
  {
    key:        'hmac_failure',
    dataKey:    'hmac_failures',
    label:      'HMAC Signature Failures',
    icon:       <HashIcon />,
    severity:   'medium',
    color:      '#f43f5e',
    glow:       'rgba(244,63,94,0.4)',
    description: 'Request signature validation failures — tampered payloads, incorrect secrets, or man-in-the-middle interference.',
    source:     'RiskEvent',
    recommendation: 'Audit the signing secret rotation schedule. HMAC failures that cluster around a time window may indicate a secret leak.',
  },
];

const SEVERITY_META = {
  critical: { label: 'Critical', bg: 'rgba(239,68,68,0.15)',  text: '#ef4444', border: 'rgba(239,68,68,0.35)' },
  high:     { label: 'High',     bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.35)' },
  medium:   { label: 'Medium',   bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
  low:      { label: 'Low',      bg: 'rgba(16,185,129,0.12)', text: '#10b981', border: 'rgba(16,185,129,0.35)' },
};

const fmtDay = (iso) => {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return iso; }
};

/* ── Mini spark-line for the detail panel ──────────────── */
function SparkLine({ daily, color }) {
  if (!daily?.length) return null;
  const max = Math.max(...daily.map(d => d.count ?? 0), 1);
  const n = daily.length;
  const pts = daily.map((d, i) => ({
    x: n > 1 ? (i / (n - 1)) * 100 : 50,
    y: 4 + (1 - (d.count ?? 0) / max) * 52,
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${d} L ${pts[n-1].x} 60 L ${pts[0].x} 60 Z`;
  return (
    <div className="se-spark-wrap">
      <svg viewBox="0 0 100 60" className="se-spark-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#sg-${color.replace('#','')})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="se-spark-labels">
        <span>{fmtDay(daily[0].date)}</span>
        <span>{fmtDay(daily[n-1].date)}</span>
      </div>
    </div>
  );
}

/* ── Detail slide-over panel ────────────────────────────── */
function EventDetailPanel({ event, data, daily, onClose }) {
  const panelRef = useRef(null);
  const count    = data?.[event.dataKey] ?? 0;
  const total    = data ? EVENT_TYPES.reduce((s, e) => s + (data[e.dataKey] ?? 0), 0) : 0;
  const pct      = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  const sev      = SEVERITY_META[event.severity];

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="se-overlay">
      <div className="se-panel" ref={panelRef}>
        <div className="se-panel-header">
          <div className="se-panel-icon" style={{ color: event.color, background: `${event.color}18`, boxShadow:`0 0 16px ${event.glow}` }}>
            {event.icon}
          </div>
          <div className="se-panel-title-wrap">
            <h2 className="se-panel-title">{event.label}</h2>
            <span className="se-panel-source">Source: {event.source}</span>
          </div>
          <button className="se-panel-close" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="se-panel-body">
          {/* Severity + count */}
          <div className="se-panel-badges">
            <span className="se-sev-badge" style={{ background: sev.bg, color: sev.text, border:`1px solid ${sev.border}` }}>
              <AlertIcon /> {sev.label}
            </span>
            <span className="se-count-badge" style={{ color: event.color }}>
              {count.toLocaleString()} events
            </span>
            <span className="se-pct-badge">{pct}% of total</span>
          </div>

          {/* Big count display */}
          <div className="se-panel-count-display" style={{ '--evt-color': event.color }}>
            <div className="se-panel-count-num" style={{ color: event.color, textShadow:`0 0 30px ${event.glow}` }}>
              {count.toLocaleString()}
            </div>
            <div className="se-panel-count-label">total events in period</div>
          </div>

          {/* Spark trend (only for failed_login which has daily data) */}
          {daily?.length > 0 && (
            <div className="se-panel-section">
              <div className="se-panel-section-title">
                <TrendUpIcon /> Daily Trend
              </div>
              <SparkLine daily={daily} color={event.color} />
              <div className="se-spark-stats">
                <div className="se-spark-stat">
                  <span>Peak day</span>
                  <strong style={{ color: event.color }}>
                    {daily.reduce((m, d) => d.count > m.count ? d : m, daily[0]).count.toLocaleString()}
                  </strong>
                </div>
                <div className="se-spark-stat">
                  <span>Daily avg</span>
                  <strong>
                    {Math.round(daily.reduce((s, d) => s + (d.count ?? 0), 0) / daily.length).toLocaleString()}
                  </strong>
                </div>
                <div className="se-spark-stat">
                  <span>Days tracked</span>
                  <strong>{daily.length}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="se-panel-section">
            <div className="se-panel-section-title">
              <ShieldIcon /> What is this event?
            </div>
            <p className="se-panel-desc">{event.description}</p>
          </div>

          {/* Recommendation */}
          <div className="se-panel-section se-panel-section-rec">
            <div className="se-panel-section-title">Recommendation</div>
            <p className="se-panel-rec">{event.recommendation}</p>
          </div>

          {/* Daily table if data exists */}
          {daily?.length > 0 && (
            <div className="se-panel-section">
              <div className="se-panel-section-title"><CalendarIcon /> Daily Breakdown</div>
              <div className="se-daily-table-wrap">
                <table className="se-daily-table">
                  <thead><tr><th>Date</th><th>Count</th></tr></thead>
                  <tbody>
                    {[...daily].reverse().map(d => (
                      <tr key={d.date}>
                        <td>{fmtDay(d.date)}</td>
                        <td style={{ color: event.color, fontWeight:700 }}>{(d.count ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────── */
export default function SecurityEventsPage() {
  const dispatch = useDispatch();
  const { securityEvents, securityEventsLoading, securityEventsError, securityFilters } = useSelector(s => s.analytics);
  const [startDate, setStartDate] = useState(securityFilters?.start_date ?? '');
  const [endDate,   setEndDate]   = useState(securityFilters?.end_date   ?? '');
  const [selected,  setSelected]  = useState(null);

  useEffect(() => {
    dispatch(fetchSecurityAnalytics(securityFilters ?? {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const applyFilters = () => {
    const next = { start_date: startDate, end_date: endDate };
    dispatch(setSecurityFilters(next));
    dispatch(fetchSecurityAnalytics(next));
  };

  const resetFilters = () => {
    setStartDate(''); setEndDate('');
    dispatch(clearSecurityFilters());
    dispatch(fetchSecurityAnalytics({}));
  };

  const hasFilters = !!(securityFilters?.start_date || securityFilters?.end_date);
  const total = securityEvents ? EVENT_TYPES.reduce((s, e) => s + (securityEvents[e.dataKey] ?? 0), 0) : 0;
  const daily = securityEvents?.daily_failed_logins ?? [];

  return (
    <div className="se-page">
      {/* Header */}
      <div className="se-header">
        <div className="se-header-left">
          <div className="se-header-icon"><ShieldIcon /></div>
          <div>
            <h1 className="se-title">Security Events</h1>
            <p className="se-subtitle">Failed logins, OTP/TOTP failures, token replays &amp; HMAC violations</p>
          </div>
        </div>
        {securityEvents && (
          <div className="se-header-total">
            <span className="se-total-num">{total.toLocaleString()}</span>
            <span className="se-total-label">Total Events</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="se-toolbar">
        <div className="se-filter">
          <label>Start Date</label>
          <input type="date" className="se-date-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="se-filter">
          <label>End Date</label>
          <input type="date" className="se-date-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <button className="se-apply-btn" onClick={applyFilters}>Apply</button>
        {hasFilters && <button className="se-reset-btn" onClick={resetFilters}>Reset</button>}
      </div>

      {/* Content */}
      {securityEventsLoading ? (
        <div className="se-loading">Loading security events…</div>
      ) : securityEventsError ? (
        <div className="se-error">{securityEventsError}</div>
      ) : !securityEvents ? (
        <div className="se-empty">No security event data available.</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="se-summary-grid">
            {EVENT_TYPES.map(evt => {
              const count = securityEvents[evt.dataKey] ?? 0;
              const pct   = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
              const sev   = SEVERITY_META[evt.severity];
              return (
                <button key={evt.key} className="se-summary-card" onClick={() => setSelected(evt)}
                  style={{ '--evt-color': evt.color, '--evt-glow': evt.glow }}>
                  <div className="se-card-top">
                    <div className="se-card-icon" style={{ color: evt.color }}>{evt.icon}</div>
                    <span className="se-card-sev" style={{ background: sev.bg, color: sev.text, border:`1px solid ${sev.border}` }}>
                      {sev.label}
                    </span>
                  </div>
                  <div className="se-card-count" style={{ color: evt.color }}>{count.toLocaleString()}</div>
                  <div className="se-card-label">{evt.label}</div>
                  <div className="se-card-pct">{pct}% of total events</div>
                  <div className="se-card-cta">
                    View Details <ChevronRightIcon />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Events table */}
          <div className="se-table-card">
            <div className="se-table-head">
              <span className="se-table-title">All Security Events</span>
              <span className="se-table-count">{total.toLocaleString()} total</span>
            </div>
            <div className="se-table-wrap">
              <table className="se-table">
                <thead>
                  <tr>
                    <th>Event Type</th>
                    <th>Severity</th>
                    <th>Source</th>
                    <th>Count</th>
                    <th>Share</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...EVENT_TYPES].sort((a, b) => (securityEvents[b.dataKey] ?? 0) - (securityEvents[a.dataKey] ?? 0))
                    .map(evt => {
                      const count = securityEvents[evt.dataKey] ?? 0;
                      const pct   = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                      const sev   = SEVERITY_META[evt.severity];
                      return (
                        <tr key={evt.key} className="se-table-row" onClick={() => setSelected(evt)}>
                          <td>
                            <div className="se-table-event-cell">
                              <span className="se-table-event-icon" style={{ color: evt.color }}>{evt.icon}</span>
                              <span className="se-table-event-label">{evt.label}</span>
                            </div>
                          </td>
                          <td>
                            <span className="se-sev-pill" style={{ background: sev.bg, color: sev.text, border:`1px solid ${sev.border}` }}>
                              {sev.label}
                            </span>
                          </td>
                          <td className="se-table-source">{evt.source}</td>
                          <td>
                            <span className="se-table-count-cell" style={{ color: evt.color }}>{count.toLocaleString()}</span>
                          </td>
                          <td>
                            <div className="se-share-cell">
                              <div className="se-share-bar-track">
                                <div className="se-share-bar-fill"
                                  style={{ width:`${pct}%`, background: evt.color, boxShadow:`0 0 8px ${evt.glow}` }} />
                              </div>
                              <span className="se-share-pct">{pct}%</span>
                            </div>
                          </td>
                          <td>
                            <button className="se-detail-btn" onClick={e => { e.stopPropagation(); setSelected(evt); }}>
                              Details <ChevronRightIcon />
                            </button>
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

      {/* Detail panel */}
      {selected && (
        <EventDetailPanel
          event={selected}
          data={securityEvents}
          daily={selected.key === 'failed_login' ? daily : null}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
