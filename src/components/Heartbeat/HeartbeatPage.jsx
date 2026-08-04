// src/components/Heartbeat/HeartbeatPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  DEFAULT_LOG_FILTERS,
  DEFAULT_RISKY_FILTERS,
  fetchHeartbeatLogs,
  fetchHeartbeatStats,
  fetchRiskyHeartbeatDevices,
  setLogFilters,
} from '../../store/slices/heartbeatSlice';
import './HeartbeatPage.css';

/* ── Export helpers ─────────────────────────────────────── */
const LOG_COLS   = ['Date', 'User', 'Status', 'IP Address', 'Location', 'Streaming', 'Screen', 'App Ver', 'Response (ms)'];
const RISKY_COLS = ['Device', 'User', 'Risk Score', 'Risk Flags', 'Misses', 'Last Heartbeat', 'Last IP', 'Country', 'Status', 'Action'];

const buildLogRows = (logs) =>
  logs.map(l => [
    fmtDateTime(l.created_at),
    l.user_email || '—',
    l.status     || '—',
    l.ip_address || '—',
    [l.city, l.country_code].filter(Boolean).join(', ') || '—',
    l.playback_active ? 'Active' : 'Idle',
    l.active_screen  || '—',
    l.app_version    || '—',
    l.response_ms != null ? l.response_ms : '—',
  ]);

const buildRiskyRows = (risky) =>
  risky.map(d => [
    [d.device_brand, d.device_model].filter(Boolean).join(' ') || 'Unknown Device',
    d.user_email || '—',
    d.risk_score ?? '—',
    Object.entries(d.risk_flags || {}).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' ')).join(', ') || 'none',
    d.heartbeat_miss_count ?? '—',
    fmtDateTime(d.last_heartbeat_at),
    d.last_ip_address   || '—',
    d.last_country_code || '—',
    d.status            || '—',
    d.recommended_action || 'none',
  ]);

const exportHeartbeatToExcel = (logs, risky) => {
  import('xlsx').then(({ utils, writeFile }) => {
    const wb = utils.book_new();

    const wsLogs = utils.aoa_to_sheet([LOG_COLS, ...buildLogRows(logs)]);
    wsLogs['!cols'] = [{ wch: 22 }, { wch: 36 }, { wch: 28 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 14 }];
    utils.book_append_sheet(wb, wsLogs, 'Heartbeat Logs');

    const wsRisky = utils.aoa_to_sheet([RISKY_COLS, ...buildRiskyRows(risky)]);
    wsRisky['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 18 }];
    utils.book_append_sheet(wb, wsRisky, 'Risky Devices');

    writeFile(wb, `heartbeat-${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
};

const exportHeartbeatToPDF = async (logs, risky) => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const HEAD  = { fillColor: [30, 30, 60], textColor: 255, fontSize: 7, fontStyle: 'bold' };
  const BODY  = { fontSize: 7, textColor: [40, 40, 80] };
  const ALT   = { fillColor: [245, 246, 250] };

  doc.setFontSize(15); doc.setTextColor(30, 30, 60);
  doc.text('Heartbeat Monitoring Report', pageW / 2, 14, { align: 'center' });
  doc.setFontSize(9); doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, 20, { align: 'center' });

  // ── Heartbeat Logs ──
  let y = 26;
  doc.setFontSize(11); doc.setTextColor(40, 40, 80);
  doc.text(`Heartbeat Logs  (${logs.length} records)`, 8, y); y += 4;

  autoTable(doc, {
    startY: y,
    head: [LOG_COLS],
    body: buildLogRows(logs),
    theme: 'striped',
    headStyles: HEAD, bodyStyles: BODY, alternateRowStyles: ALT,
    columnStyles: {
      0: { cellWidth: 28 }, 1: { cellWidth: 36 }, 2: { cellWidth: 28 },
      3: { cellWidth: 18 }, 4: { cellWidth: 22 }, 5: { cellWidth: 22 },
      6: { cellWidth: 16 }, 7: { cellWidth: 22 }, 8: { cellWidth: 14 }, 9: { cellWidth: 16 },
    },
    margin: { left: 8, right: 8 },
  });

  // ── Risky Devices ──
  y = doc.lastAutoTable.finalY + 12;
  if (y > 170) { doc.addPage(); y = 14; }
  doc.setFontSize(11); doc.setTextColor(40, 40, 80);
  doc.text(`Risky Devices  (${risky.length} records)`, 8, y); y += 4;

  autoTable(doc, {
    startY: y,
    head: [RISKY_COLS],
    body: buildRiskyRows(risky),
    theme: 'striped',
    headStyles: HEAD, bodyStyles: BODY, alternateRowStyles: ALT,
    columnStyles: {
      0: { cellWidth: 28 }, 1: { cellWidth: 30 }, 2: { cellWidth: 18 },
      3: { cellWidth: 38 }, 4: { cellWidth: 14 }, 5: { cellWidth: 28 },
      6: { cellWidth: 22 }, 7: { cellWidth: 14 }, 8: { cellWidth: 16 }, 9: { cellWidth: 20 },
    },
    margin: { left: 8, right: 8 },
  });

  doc.save(`heartbeat-${new Date().toISOString().slice(0, 10)}.pdf`);
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
    <div className="hb-export-wrap" ref={ref}>
      <button className="hb-export-btn" onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="hb-export-menu">
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

// Each card declares where its data lives and how to render it
const SECTION_CARDS = [
  {
    key: 'overview',
    label: 'Overview',
    accent: 'var(--accent-primary)',
    type: 'metrics',
    getData: s => s?.overview,
  },
  {
    key: 'risk_health',
    label: 'Risk Health',
    accent: '#ef4444',
    type: 'metrics',
    getData: s => s?.risk_health,
    skip: ['by_status'], // by_status gets its own card below
  },
  {
    key: 'status',
    label: 'Device Status (24Hours)',
    accent: '#10b981',
    type: 'status',
    getData: s => s?.risk_health?.by_status,
  },
  {
    key: 'country',
    label: 'By Country',
    accent: '#a78bfa',
    type: 'country',
    getData: s => s?.breakdown?.by_country,
  },
];

const fmtKey = k => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const fmtMetricValue = (key, val) => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string' && /\d{4}-\d{2}-\d{2}T/.test(val)) return fmtDateTime(val);
  const sfx = /_ms$/.test(key) ? 'ms' : /pct$|percent$/.test(key) ? '%' : '';
  return fmtNum(val, sfx);
};

const countryFlag = (code) => {
  if (!code || code.length !== 2) return '🌐';
  return code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
};

const STATUS_OPTIONS = ['', 'success', 'failed', 'blocked', 'expired'];

const SearchIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
    <circle cx="11" cy="11" r="7" />
    <line x1="20" y1="20" x2="16.2" y2="16.2" />
  </svg>
);

const fmtNum = (value, suffix = '') => {
  if (value === undefined || value === null || value === '') return '—';
  const text = typeof value === 'number' ? value.toLocaleString() : value;
  return `${text}${suffix}`;
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const hasNextPage = (items, total, filters) => {
  const shown = Number(filters.page) * Number(filters.page_size);
  return total ? shown < total : items.length >= Number(filters.page_size);
};

const statusClass = (status) => `hb-badge ${status || 'unknown'}`;
const riskClass = (score) => {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

function SmallList({ title, items, primaryKey, secondaryKey }) {
  return (
    <div className="hb-panel">
      <div className="hb-panel-title">{title}</div>
      {items?.length ? (
        <div className="hb-mini-list">
          {items.slice(0, 6).map((item, index) => (
            <div className="hb-mini-row" key={`${item[primaryKey]}-${index}`}>
              <span title={item[primaryKey]}>{item[primaryKey] || 'Unknown'}</span>
              <strong>{fmtNum(item[secondaryKey])}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className="hb-empty-small">No data</div>
      )}
    </div>
  );
}

function Pager({ page, disabled, hasNext, onPage }) {
  return (
    <div className="hb-pager">
      <button disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page}</span>
      <button disabled={disabled || !hasNext} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

export default function HeartbeatPage() {
  const dispatch = useDispatch();
  const {
    stats,
    statsLoading,
    statsError,
    logs,
    logsTotal,
    logsLoading,
    logsError,
    logFilters,
    risky,
    riskyTotal,
    riskyLoading,
    riskyError,
    riskyFilters,
  } = useSelector(s => s.heartbeat);
  const didMountLogSearch = useRef(false);
  const { user_email: logSearch, status: logStatus } = logFilters;

  useEffect(() => {
    dispatch(fetchHeartbeatStats());
    dispatch(fetchHeartbeatLogs(DEFAULT_LOG_FILTERS));
    dispatch(fetchRiskyHeartbeatDevices(DEFAULT_RISKY_FILTERS));
  }, [dispatch]);

  // Auto-refresh the stat sections (Overview / Risk Health / Status / By Country) so
  // end-user-driven changes appear without a manual reload. Silent = numbers swap in place
  // with no flicker; paused while the tab is hidden.
  useEffect(() => {
    const REFRESH_MS = 2000;
    let timer = null;
    const poll = () => dispatch(fetchHeartbeatStats({ silent: true }));
    const start = () => { if (!timer) timer = setInterval(poll, REFRESH_MS); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVisibility = () => {
      if (document.hidden) stop();
      else { poll(); start(); }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [dispatch]);

  useEffect(() => {
    if (!didMountLogSearch.current) {
      didMountLogSearch.current = true;
      return undefined;
    }

    const timer = setTimeout(() => {
      dispatch(fetchHeartbeatLogs({
        user_email: logSearch,
        status: logStatus,
        page: 1,
        // When searching by email, pull a wider window so the client-side email filter
        // (below) has data to match against — the logs endpoint doesn't filter by email.
        page_size: logSearch.trim() ? 200 : 8,
      }));
    }, 350);

    return () => clearTimeout(timer);
  }, [dispatch, logSearch, logStatus]);

  // The heartbeat logs endpoint ignores the user_email param, so filter by email on the
  // client over the fetched window. Case-insensitive substring match.
  const emailTerm = (logFilters.user_email || '').trim().toLowerCase();
  const visibleLogs = emailTerm
    ? logs.filter((l) => (l.user_email || '').toLowerCase().includes(emailTerm))
    : logs;

  return (
    <div className="heartbeat-page">
      <section className="hb-section">
        <div className="hb-section-head">
          <div>
            <div className="hb-title">Heartbeat Monitoring</div>
            <p className="hb-subtitle">Monitor live device status and detect offline or idle connections in real time.</p>
          </div>
          <div className="hb-head-actions">
            <ExportButton
              onExportPDF={() => exportHeartbeatToPDF(logs, risky)}
              onExportExcel={() => exportHeartbeatToExcel(logs, risky)}
            />
          </div>
        </div>

        {statsError ? (
          <div className="hb-error">{statsError}</div>
        ) : (
          <div className="hb-stats-4">
            {SECTION_CARDS.map(card => {
              const data = card.getData(stats);
              return (
                <div className="hb-sec-card" style={{ '--hb-accent': card.accent }} key={card.key}>
                  <div className="hb-sec-card-head">
                    <span className="hb-sec-title">{card.label}</span>
                  </div>
                  <div className="hb-sec-divider" />
                  {statsLoading ? (
                    <div className="hb-sec-empty">Loading...</div>
                  ) : !data ? (
                    <div className="hb-sec-empty">No data</div>
                  ) : card.type === 'metrics' ? (
                    <div className="hb-sec-metrics">
                      {Object.entries(data)
                        .filter(([k]) => !card.skip?.includes(k))
                        .map(([k, v]) => (
                          <div className="hb-sec-metric-row" key={k}>
                            <span className="hb-sec-key">{fmtKey(k)}</span>
                            <span className="hb-sec-val">{fmtMetricValue(k, v)}</span>
                          </div>
                        ))}
                    </div>
                  ) : card.type === 'status' ? (
                    <div className="hb-sec-status-grid">
                      {(Array.isArray(data)
                        ? data.map(item => [item.status ?? item.name, item.count ?? item.value])
                        : Object.entries(data)
                      ).map(([status, count]) => (
                        <div className="hb-sec-status-item" key={status}>
                          <span className={statusClass(status)}>{status}</span>
                          <strong>{fmtNum(count)}</strong>
                        </div>
                      ))}
                      {(Array.isArray(data) ? !data.length : !Object.keys(data).length) && (
                        <div className="hb-sec-empty">No status data</div>
                      )}
                    </div>
                  ) : card.type === 'country' ? (
                    <div className="hb-sec-country-list">
                      {(Array.isArray(data)
                        ? data
                        : Object.entries(data).map(([k, v]) => ({ country_code: k, count: v }))
                      ).slice(0, 8).map((item, i) => (
                        <div className="hb-sec-country-row" key={item.country_code ?? i}>
                          <span className="hb-sec-flag">{countryFlag(item.country_code)}</span>
                          <span className="hb-sec-cc">{item.country_name || item.country_code || '—'}</span>
                          <span className="hb-sec-count">{fmtNum(item.count)}</span>
                        </div>
                      ))}
                      {(Array.isArray(data) ? !data.length : !Object.keys(data).length) && (
                        <div className="hb-sec-empty">No country data</div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="hb-section">
        <div className="hb-section-head">
          <div>
            <div className="hb-title">Heartbeat Logs</div>
            <div className="hb-subtitle">Latest heartbeat activity across devices.</div>
          </div>
          <button className="hb-refresh" onClick={() => dispatch(fetchHeartbeatLogs({ user_email: logFilters.user_email, status: logFilters.status, page: 1, page_size: emailTerm ? 200 : 8 }))} disabled={logsLoading}>
            {logsLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="hb-filter-bar">
          <div className="hb-search-wrap">
            <SearchIcon />
            <input
              className="hb-search"
              value={logFilters.user_email}
              placeholder="Search by user email..."
              onChange={e => dispatch(setLogFilters({ user_email: e.target.value, page: 1 }))}
            />
          </div>
          <select
            className="hb-status-filter"
            value={logFilters.status}
            onChange={e => dispatch(setLogFilters({ status: e.target.value, page: 1 }))}
          >
            {STATUS_OPTIONS.map(status => (
              <option value={status} key={status}>{status || 'All Status'}</option>
            ))}
          </select>
        </div>

        {logsError ? (
          <div className="hb-error">{logsError}</div>
        ) : (
          <div className="hb-table-wrap">
            <table className="hb-table hb-log-table">
              <colgroup>
                <col className="hb-col-date" />
                <col className="hb-col-user" />
                <col className="hb-col-status" />
                <col className="hb-col-ip" />
                <col className="hb-col-location" />
                <col className="hb-col-streaming" />
                <col className="hb-col-screen" />
                <col className="hb-col-app" />
                <col className="hb-col-response" />
              </colgroup>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>Location</th>
                  <th>Streaming</th>
                  <th>Screen</th>
                  <th>App Ver</th>
                  <th>Response</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr><td colSpan="9" className="hb-table-state">Loading heartbeat logs...</td></tr>
                ) : visibleLogs.length ? visibleLogs.map(log => (
                  <tr key={log.id || `${log.user_email}-${log.created_at}`}>
                    <td><span className="hb-date-text">{fmtDateTime(log.created_at)}</span></td>
                    <td><span className="hb-ellipsis" title={log.user_email || ''}>{log.user_email || '—'}</span></td>
                    <td><span className={statusClass(log.status)}>{log.status || 'unknown'}</span></td>
                    <td><span className="hb-nowrap">{log.ip_address || '—'}</span></td>
                    <td><span className="hb-ellipsis" title={[log.city, log.country_code].filter(Boolean).join(', ')}>{[log.city, log.country_code].filter(Boolean).join(', ') || '—'}</span></td>
                    <td>{log.playback_active ? 'Active' : 'Idle'}</td>
                    <td><span className="hb-ellipsis" title={log.active_screen || ''}>{log.active_screen || '—'}</span></td>
                    <td><span className="hb-nowrap">{log.app_version || '—'}</span></td>
                    <td><span className="hb-response">{fmtNum(log.response_ms, 'ms')}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan="9" className="hb-table-state">
                    {emailTerm ? `No heartbeat logs found for "${logFilters.user_email.trim()}".` : 'No heartbeat logs found.'}
                  </td></tr>
                )}
              </tbody>
            </table>
            {/* Server pager only when not email-searching (search is filtered client-side). */}
            {!emailTerm && (
              <Pager
                page={Number(logFilters.page)}
                disabled={logsLoading}
                hasNext={hasNextPage(logs, logsTotal, logFilters)}
                onPage={page => dispatch(fetchHeartbeatLogs({ ...logFilters, page }))}
              />
            )}
          </div>
        )}
      </section>

      <section className="hb-section">
        <div className="hb-section-head">
          <div>
            <div className="hb-title">Risky Devices</div>
            <div className="hb-subtitle">Devices ranked by risk score and heartbeat miss behavior.</div>
          </div>
          <button className="hb-refresh" onClick={() => dispatch(fetchRiskyHeartbeatDevices({ page: 1, page_size: 8 }))} disabled={riskyLoading}>
            {riskyLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {riskyError ? (
          <div className="hb-error">{riskyError}</div>
        ) : (
          <div className="hb-table-wrap">
            <table className="hb-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>User</th>
                  <th>Risk Score</th>
                  <th>Risk Flags</th>
                  <th>Misses</th>
                  <th>Last Heartbeat</th>
                  <th>Last IP</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {riskyLoading ? (
                  <tr><td colSpan="10" className="hb-table-state">Loading risky devices...</td></tr>
                ) : risky.length ? risky.map(device => (
                  <tr key={device.device_id}>
                    <td>
                      <div className="hb-device-cell">
                        <strong>{[device.device_brand, device.device_model].filter(Boolean).join(' ') || 'Unknown Device'}</strong>
                      </div>
                    </td>
                    <td>{device.user_email || '—'}</td>
                    <td><span className={`hb-risk ${riskClass(device.risk_score)}`}>{fmtNum(device.risk_score)}</span></td>
                    <td>
                      <div className="hb-tags">
                        {Object.entries(device.risk_flags || {}).filter(([, active]) => active).map(([flag]) => (
                          <span key={flag}>{flag.replace(/_/g, ' ')}</span>
                        ))}
                        {!Object.values(device.risk_flags || {}).some(Boolean) && <em>none</em>}
                      </div>
                    </td>
                    <td>{fmtNum(device.heartbeat_miss_count)}</td>
                    <td>{fmtDateTime(device.last_heartbeat_at)}</td>
                    <td>{device.last_ip_address || '—'}</td>
                    <td>{device.last_country_code || '—'}</td>
                    <td><span className={statusClass(device.status)}>{device.status || 'unknown'}</span></td>
                    <td><span className="hb-action">{device.recommended_action || 'none'}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan="10" className="hb-table-state">No risky devices found.</td></tr>
                )}
              </tbody>
            </table>
            <Pager
              page={Number(riskyFilters.page)}
              disabled={riskyLoading}
              hasNext={hasNextPage(risky, riskyTotal, riskyFilters)}
              onPage={page => dispatch(fetchRiskyHeartbeatDevices({ ...riskyFilters, page }))}
            />
          </div>
        )}
      </section>
    </div>
  );
}
