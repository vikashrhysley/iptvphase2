// src/components/Heartbeat/HeartbeatPage.jsx
import { useEffect } from 'react';
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

const STAT_CARDS = [
  { key: 'total_heartbeats', label: 'Total Heartbeats', suffix: '', accent: 'var(--accent-primary)' },
  { key: 'total_active_devices', label: 'Active Devices', suffix: '', accent: '#10b981' },
  { key: 'heartbeats_last_hour', label: 'Last Hour', suffix: '', accent: '#7c3aed' },
  { key: 'success_rate_pct', label: 'Success Rate', suffix: '%', accent: '#34d399' },
  { key: 'miss_rate_percent', label: 'Miss Rate', suffix: '%', accent: '#f59e0b' },
  { key: 'failed_last_hour', label: 'Failed Last Hour', suffix: '', accent: '#f87171' },
  { key: 'avg_response_ms', label: 'Avg Response', suffix: 'ms', accent: '#00d4ff' },
  { key: 'high_risk_devices', label: 'High Risk Devices', suffix: '', accent: '#ef4444' },
];

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

  useEffect(() => {
    dispatch(fetchHeartbeatStats());
    dispatch(fetchHeartbeatLogs(DEFAULT_LOG_FILTERS));
    dispatch(fetchRiskyHeartbeatDevices(DEFAULT_RISKY_FILTERS));
  }, [dispatch]);

  const fetchLogs = (filters = logFilters) => {
    dispatch(fetchHeartbeatLogs({ ...filters, page_size: 8 }));
  };

  return (
    <div className="heartbeat-page">
      <section className="hb-section">
        <div className="hb-section-head">
          <div>
            <div className="hb-title">Heartbeat Monitoring</div>
            <div className="hb-subtitle">
              {stats?.window ? `Window ${stats.window}` : 'Real-time device heartbeat health'}
              {stats?.generated_at ? ` · Generated ${fmtDateTime(stats.generated_at)}` : ''}
            </div>
          </div>
          <button className="hb-refresh" onClick={() => dispatch(fetchHeartbeatStats())} disabled={statsLoading}>
            {statsLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {statsError ? (
          <div className="hb-error">{statsError}</div>
        ) : (
          <div className="hb-stats">
            {STAT_CARDS.map(card => (
              <div className="hb-stat-card" style={{ '--hb-accent': card.accent }} key={card.key}>
                <div className="hb-stat-label">{card.label}</div>
                <div className="hb-stat-value">{statsLoading ? '...' : fmtNum(stats?.[card.key], card.suffix)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="hb-insights">
          <div className="hb-panel">
            <div className="hb-panel-title">Status Distribution</div>
            <div className="hb-status-grid">
              {Object.entries(stats?.by_status || {}).map(([status, count]) => (
                <div className="hb-status-item" key={status}>
                  <span className={statusClass(status)}>{status}</span>
                  <strong>{fmtNum(count)}</strong>
                </div>
              ))}
              {!Object.keys(stats?.by_status || {}).length && <div className="hb-empty-small">No status data</div>}
            </div>
          </div>
          <SmallList title="Top Portals" items={stats?.top_portals} primaryKey="portal_url" secondaryKey="count" />
          <SmallList title="By Country" items={stats?.by_country} primaryKey="country_code" secondaryKey="count" />
        </div>
      </section>

      <section className="hb-section">
        <div className="hb-section-head">
          <div>
            <div className="hb-title">Heartbeat Logs</div>
            <div className="hb-subtitle">Latest heartbeat activity across devices.</div>
          </div>
          <button className="hb-refresh" onClick={() => dispatch(fetchHeartbeatLogs({ page: 1, page_size: 8 }))} disabled={logsLoading}>
            {logsLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="hb-filter-bar">
          <div className="hb-search-wrap">
            <SearchIcon />
            <input
              className="hb-search"
              value={logFilters.device_id}
              placeholder="Search device, user, location."
              onChange={e => dispatch(setLogFilters({ device_id: e.target.value, page: 1 }))}
              onKeyDown={e => {
                if (e.key === 'Enter') fetchLogs({ ...logFilters, page: 1 });
              }}
            />
          </div>
          <select
            className="hb-status-filter"
            value={logFilters.status}
            onChange={e => {
              const next = { ...logFilters, status: e.target.value, page: 1 };
              dispatch(setLogFilters(next));
              fetchLogs(next);
            }}
          >
            {STATUS_OPTIONS.map(status => (
              <option value={status} key={status}>{status || 'All Status'}</option>
            ))}
          </select>
          <button className="hb-refresh" onClick={() => fetchLogs({ ...logFilters, page: 1 })} disabled={logsLoading}>
            Search
          </button>
        </div>

        {logsError ? (
          <div className="hb-error">{logsError}</div>
        ) : (
          <div className="hb-table-wrap">
            <table className="hb-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Device</th>
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
                  <tr><td colSpan="10" className="hb-table-state">Loading heartbeat logs...</td></tr>
                ) : logs.length ? logs.map(log => (
                  <tr key={log.id || `${log.device_id}-${log.created_at}`}>
                    <td>{fmtDateTime(log.created_at)}</td>
                    <td><code>{log.device_id || '—'}</code></td>
                    <td>{log.user_email || '—'}</td>
                    <td><span className={statusClass(log.status)}>{log.status || 'unknown'}</span></td>
                    <td>{log.ip_address || '—'}</td>
                    <td>{[log.city, log.country_code].filter(Boolean).join(', ') || '—'}</td>
                    <td>{log.playback_active ? 'Active' : 'Idle'}</td>
                    <td>{log.active_screen || '—'}</td>
                    <td>{log.app_version || '—'}</td>
                    <td>{fmtNum(log.response_ms, 'ms')}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="10" className="hb-table-state">No heartbeat logs found.</td></tr>
                )}
              </tbody>
            </table>
            <Pager
              page={Number(logFilters.page)}
              disabled={logsLoading}
              hasNext={hasNextPage(logs, logsTotal, logFilters)}
              onPage={page => dispatch(fetchHeartbeatLogs({ ...logFilters, page }))}
            />
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
                        <code>{device.device_id}</code>
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
