import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchHealthSystem } from '../../store/slices/healthSlice';
import { fetchAdminMetrics, fetchAdminErrors, fetchAdminAlerts, setAlertFilters, resetAlertFilters, acknowledgeAlert, resolveAlert, archiveAlert } from '../../store/slices/monitoringSlice';
import './MonitoringPage.css';

/* ── Icons ──────────────────────────────────────────────── */
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" />
  </svg>
);
const DatabaseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
  </svg>
);
const RedisIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const CeleryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
const ApiIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const UptimeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const CpuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
  </svg>
);
const MemIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <line x1="6" y1="10" x2="6" y2="14" /><line x1="10" y1="10" x2="10" y2="14" />
    <line x1="14" y1="10" x2="14" y2="14" /><line x1="18" y1="10" x2="18" y2="14" />
  </svg>
);
const DiskIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <ellipse cx="12" cy="12" rx="10" ry="6" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <circle cx="16" cy="12" r="1" fill="currentColor" />
  </svg>
);
const QueueDepthIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const DbConnIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <circle cx="12" cy="17" r="3" />
  </svg>
);
const AlertBellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* ── Helpers ─────────────────────────────────────────────── */
const statusMeta = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'healthy' || s === 'ok') return { cls: 'mon-green', label: 'Healthy' };
  if (s === 'degraded')              return { cls: 'mon-amber', label: 'Degraded' };
  if (s === 'error' || s === 'down') return { cls: 'mon-red',   label: 'Down' };
  return { cls: 'mon-gray', label: s || 'Unknown' };
};

const latencyMeta = (ms) => {
  if (ms == null) return null;
  if (ms < 10) return 'mon-green';
  if (ms < 50) return 'mon-amber';
  return 'mon-red';
};

const pctCls = (val, lo, hi) => {
  if (val == null) return 'mon-gray';
  if (val < lo) return 'mon-green';
  if (val < hi) return 'mon-amber';
  return 'mon-red';
};

const severityCls = (sev) => {
  const s = (sev || '').toLowerCase();
  if (s === 'critical') return 'mon-red';
  if (s === 'high' || s === 'warning') return 'mon-amber';
  if (s === 'medium') return 'mon-yellow';
  return 'mon-gray';
};

const alertStatusCls = (st) => {
  const s = (st || '').toLowerCase();
  if (s === 'open')         return 'mon-red';
  if (s === 'acknowledged') return 'mon-amber';
  if (s === 'resolved')     return 'mon-green';
  return 'mon-gray';
};

const fmtAlertType = (t) =>
  (t || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const fmtUptime = (sec) => {
  if (sec == null) return '—';
  if (sec < 60)   return `${Math.floor(sec)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
};

const fmtTime = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return null; }
};

const fmtTimeShort = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return '—'; }
};

const VIEW_META = {
  system_health:  { title: 'System Health',               subtitle: 'Live probe — database, Redis, Celery and API status.' },
  infra_metrics:  { title: 'Infra Metrics',               subtitle: 'CPU / memory / disk usage, queue depth and DB pool stats. 60s cache.' },
  error_tracking: { title: 'Error Tracking',              subtitle: '24-hour error counts by severity and 20 most recent errors.' },
  alerts:         { title: 'Infrastructure Alerts',       subtitle: 'Paginated, filterable infra alert list — live, no cache.' },
};

/* ── Gauge bar ───────────────────────────────────────────── */
function GaugeBar({ pct, cls }) {
  return (
    <div className="mon-gauge-wrap">
      <div className={`mon-gauge-fill ${cls}`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
    </div>
  );
}

/* ── Resource metric card ────────────────────────────────── */
function ResourceCard({ icon, label, value, lo = 60, hi = 85 }) {
  const cls = pctCls(value, lo, hi);
  return (
    <div className={`mon-res-card ${cls}`}>
      <div className="mon-res-icon">{icon}</div>
      <div className="mon-res-body">
        <div className="mon-res-label">{label}</div>
        <div className={`mon-res-val ${cls}`}>{value != null ? `${value.toFixed(1)}%` : '—'}</div>
      </div>
      <GaugeBar pct={value} cls={cls} />
    </div>
  );
}

/* ── Service health card ─────────────────────────────────── */
function ServiceCard({ icon, name, status, latency, extra }) {
  const sm = statusMeta(status);
  const lCls = latencyMeta(latency);
  return (
    <div className={`mon-card ${sm.cls}`}>
      <div className="mon-card-icon">{icon}</div>
      <div className="mon-card-body">
        <div className="mon-card-name">{name}</div>
        <span className={`mon-pill ${sm.cls}`}><span className="mon-dot" />{sm.label}</span>
      </div>
      {latency != null && <div className={`mon-latency ${lCls}`}>{latency.toFixed(1)} ms</div>}
      {extra && <div className="mon-extra">{extra}</div>}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function MonitoringPage({ view }) {
  const dispatch = useDispatch();

  const { system, systemLoading, systemError, systemLastChecked } = useSelector(s => s.health);
  const {
    metrics, metricsLoading, metricsError, metricsLastChecked,
    errors,  errorsLoading,  errorsError,  errorsLastChecked,
    alerts,  alertsLoading,  alertsError,  alertsMeta, alertFilters,
    alertActioning, alertActionError,
  } = useSelector(s => s.monitoring);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    dispatch(fetchHealthSystem());
    dispatch(fetchAdminMetrics());
    dispatch(fetchAdminErrors());
    dispatch(fetchAdminAlerts(alertFilters));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchAdminAlerts(alertFilters));
  }, [dispatch, alertFilters]);

  useEffect(() => {
    const id = setInterval(() => {
      dispatch(fetchHealthSystem());
      dispatch(fetchAdminMetrics());
      dispatch(fetchAdminErrors());
      dispatch(fetchAdminAlerts(alertFilters));
    }, 15_000);
    return () => clearInterval(id);
  }, [dispatch, alertFilters]);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5_000);
    return () => clearInterval(id);
  }, []);

  /* derived */
  const checkedIso = system?.checked_at || systemLastChecked;
  const secAgo = checkedIso
    ? Math.max(0, Math.floor((Date.now() - new Date(checkedIso).getTime()) / 1000))
    : null;

  const allHealthy = system && ['database', 'redis', 'celery', 'api'].every(
    k => (system[k]?.status || '').toLowerCase() === 'healthy'
  );
  const anyDown = system && ['database', 'redis', 'celery', 'api'].some(
    k => ['error', 'down'].includes((system[k]?.status || '').toLowerCase())
  );
  const overallCls   = !system ? 'mon-gray' : anyDown ? 'mon-red' : allHealthy ? 'mon-green' : 'mon-amber';
  const overallLabel = !system ? 'Checking…' : anyDown ? 'Degraded' : allHealthy ? 'All Systems Healthy' : 'Partially Degraded';

  const dbConn    = metrics?.db_connections;
  const dbPct     = dbConn?.pool_size ? Math.round((dbConn.checked_out / dbConn.pool_size) * 100) : null;
  const dbConnCls = pctCls(dbPct, 50, 80);
  const recentErrors = errors?.recent_errors ?? [];
  const totalErrors  = (errors?.critical_count ?? 0) + (errors?.high_count ?? 0) + (errors?.medium_count ?? 0);

  const isLoading = view === 'system_health'  ? systemLoading
    : view === 'infra_metrics'  ? metricsLoading
    : view === 'error_tracking' ? errorsLoading
    : view === 'alerts'         ? alertsLoading
    : systemLoading || metricsLoading || errorsLoading || alertsLoading;

  const meta    = view ? VIEW_META[view] : null;
  const title   = meta?.title    ?? 'Monitoring & Observability';
  const subtitle = meta?.subtitle ?? 'Live system health, metrics, error tracking and infrastructure alerts.';

  const handleRefresh = () => {
    dispatch(fetchHealthSystem());
    dispatch(fetchAdminMetrics());
    dispatch(fetchAdminErrors());
    dispatch(fetchAdminAlerts(alertFilters));
  };

  return (
    <div className="mon-page">

      {/* Header */}
      <div className="mon-header">
        <div>
          <div className="mon-title">{title}</div>
          <div className="mon-subtitle">{subtitle}</div>
        </div>
        <div className="mon-header-right">
          <div className="mon-refresh-info">
            <span className={`mon-refresh-dot${isLoading ? ' spinning' : ''}`} />
            {secAgo === null ? 'Auto-refresh every 15s'
              : secAgo < 3 ? 'Updated just now'
              : `Updated ${secAgo}s ago`}
          </div>
          <button className="mon-refresh-btn" onClick={handleRefresh} disabled={isLoading}>
            <RefreshIcon />{isLoading ? 'Checking…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Overview (no view selected) ─────────────────────── */}
      {!view && (
        <>
          <div className={`mon-banner ${overallCls}`}>
            <span className={`mon-banner-dot ${overallCls}`} />
            <div>
              <div className="mon-banner-label">{overallLabel}</div>
              <div className="mon-banner-desc">
                {!system ? 'Fetching system health…'
                  : allHealthy ? 'All core services are responding normally.'
                  : 'One or more services are not healthy.'}
              </div>
            </div>
            {checkedIso && <div className="mon-banner-time">Checked at {fmtTime(checkedIso)}</div>}
          </div>

          <div className="mon-overview-grid">
            {[
              { label: 'System Health', sub: allHealthy ? 'All healthy' : anyDown ? 'Issues detected' : 'Checking…', cls: overallCls },
              { label: 'CPU Usage',     sub: metrics ? `${metrics.cpu_pct?.toFixed(1)}%` : '—',    cls: pctCls(metrics?.cpu_pct, 60, 85) },
              { label: 'Memory Usage',  sub: metrics ? `${metrics.memory_pct?.toFixed(1)}%` : '—', cls: pctCls(metrics?.memory_pct, 70, 90) },
              { label: 'Queue Depth',   sub: metrics ? `${metrics.queue_depth} tasks` : '—',       cls: metrics?.queue_depth > 50 ? 'mon-red' : metrics?.queue_depth > 10 ? 'mon-amber' : 'mon-green' },
              { label: 'Critical Errors', sub: errors ? `${errors.critical_count ?? 0} in 24h` : '—', cls: errors?.critical_count > 0 ? 'mon-red' : 'mon-green' },
              { label: 'Open Alerts',   sub: alertsMeta?.total != null ? `${alertsMeta.total} open` : '—', cls: alertsMeta?.total > 0 ? 'mon-amber' : 'mon-green' },
            ].map(({ label, sub, cls }) => (
              <div className={`mon-overview-card ${cls}`} key={label}>
                <div className="mon-overview-label">{label}</div>
                <div className={`mon-overview-val ${cls}`}>{sub}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── System Health ───────────────────────────────────── */}
      {view === 'system_health' && (
        <>
          {systemError && <div className="mon-error">{systemError}</div>}

          <div className={`mon-banner ${overallCls}`}>
            <span className={`mon-banner-dot ${overallCls}`} />
            <div>
              <div className="mon-banner-label">{overallLabel}</div>
              <div className="mon-banner-desc">
                {!system ? 'Fetching…' : allHealthy ? 'All core services are operational.' : 'One or more services are not healthy.'}
              </div>
            </div>
            {checkedIso && <div className="mon-banner-time">Checked at {fmtTime(checkedIso)}</div>}
          </div>

          {systemLoading && !system && (
            <div className="mon-skeleton-grid">
              {[1,2,3,4].map(i => <div className="mon-skeleton-card" key={i} />)}
            </div>
          )}

          {system && (
            <>
              <div className="mon-grid">
                <ServiceCard icon={<DatabaseIcon />} name="Database"
                  status={system.database?.status} latency={system.database?.latency_ms} />
                <ServiceCard icon={<RedisIcon />} name="Redis"
                  status={system.redis?.status} latency={system.redis?.latency_ms} />
                <ServiceCard icon={<CeleryIcon />} name="Celery"
                  status={system.celery?.status}
                  extra={system.celery?.workers_online != null
                    ? `${system.celery.workers_online} worker${system.celery.workers_online !== 1 ? 's' : ''} online`
                    : null} />
                <ServiceCard icon={<ApiIcon />} name="API" status={system.api?.status} />
              </div>

              {system.uptime_seconds != null && (
                <div className="mon-uptime-row">
                  <div className="mon-uptime-card">
                    <span className="mon-uptime-icon"><UptimeIcon /></span>
                    <div>
                      <div className="mon-uptime-label">Process Uptime</div>
                      <div className="mon-uptime-val">{fmtUptime(system.uptime_seconds)}</div>
                    </div>
                    <div className="mon-uptime-note">Resets on worker / pod restart</div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Infra Metrics ───────────────────────────────────── */}
      {view === 'infra_metrics' && (
        <>
          {metricsError && <div className="mon-error">{metricsError}</div>}

          {metricsLoading && !metrics && (
            <div className="mon-skeleton-grid">
              {[1,2,3].map(i => <div className="mon-skeleton-card" style={{ height: 100 }} key={i} />)}
            </div>
          )}

          {metrics && (
            <>
              <div className="mon-res-grid">
                <ResourceCard icon={<CpuIcon />}  label="CPU Usage"    value={metrics.cpu_pct}   lo={60} hi={85} />
                <ResourceCard icon={<MemIcon />}  label="Memory Usage" value={metrics.memory_pct} lo={70} hi={90} />
                <ResourceCard icon={<DiskIcon />} label="Disk Usage"   value={metrics.disk_pct}   lo={70} hi={90} />
              </div>

              <div className="mon-stat-row">
                <div className="mon-stat-card">
                  <span className="mon-stat-icon"><QueueDepthIcon /></span>
                  <div className="mon-stat-body">
                    <div className="mon-stat-label">Total Queue Depth</div>
                    <div className={`mon-stat-val ${metrics.queue_depth > 50 ? 'mon-red' : metrics.queue_depth > 10 ? 'mon-amber' : 'mon-green'}`}>
                      {metrics.queue_depth ?? '—'}
                    </div>
                    <div className="mon-stat-sub">pending tasks across all queues</div>
                  </div>
                </div>

                {dbConn && (
                  <div className="mon-stat-card">
                    <span className="mon-stat-icon"><DbConnIcon /></span>
                    <div className="mon-stat-body">
                      <div className="mon-stat-label">DB Connections</div>
                      <div className={`mon-stat-val ${dbConnCls}`}>
                        {dbConn.checked_out} <span className="mon-stat-denom">/ {dbConn.pool_size}</span>
                      </div>
                      <GaugeBar pct={dbPct} cls={dbConnCls} />
                      <div className="mon-stat-sub">{dbPct ?? '—'}% pool utilisation</div>
                    </div>
                  </div>
                )}
              </div>

              {metricsLastChecked && (
                <div className="mon-footer-ts">Measured at {fmtTime(metricsLastChecked)} · 60s Redis cache</div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Error Tracking ──────────────────────────────────── */}
      {view === 'error_tracking' && (
        <>
          {errorsError && <div className="mon-error">{errorsError}</div>}

          {errorsLoading && !errors && (
            <div className="mon-skeleton-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {[1,2,3].map(i => <div className="mon-skeleton-card" style={{ height: 88 }} key={i} />)}
            </div>
          )}

          {errors && (
            <>
              <div className="mon-err-counts">
                {[
                  { label: 'Critical', count: errors.critical_count, cls: 'mon-red' },
                  { label: 'High',     count: errors.high_count,     cls: 'mon-amber' },
                  { label: 'Medium',   count: errors.medium_count,   cls: 'mon-yellow' },
                ].map(({ label, count, cls }) => (
                  <div className={`mon-err-count-card ${cls}`} key={label}>
                    <div className="mon-err-count-label">{label}</div>
                    <div className={`mon-err-count-val ${cls}`}>{count ?? 0}</div>
                    <div className="mon-err-count-sub">errors in {errors.window_hours ?? 24}h</div>
                  </div>
                ))}
              </div>

              {recentErrors.length === 0 ? (
                <div className="mon-err-empty">No recent errors — system is clean.</div>
              ) : (
                <div className="mon-err-table-wrap">
                  <table className="mon-err-table">
                    <colgroup>
                      <col style={{ width: '14%' }} /><col style={{ width: '9%' }} />
                      <col style={{ width: '31%' }} /><col style={{ width: '10%' }} />
                      <col style={{ width: '20%' }} /><col style={{ width: '16%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Error Code</th><th>Severity</th>
                        <th>Message</th><th>Service</th>
                        <th>Path</th><th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentErrors.map(e => (
                        <tr key={e.id}>
                          <td><span className="mon-err-code">{e.error_code || '—'}</span></td>
                          <td>
                            <span className={`mon-sev-pill ${severityCls(e.severity)}`}>
                              <span className="mon-dot" />{e.severity || '—'}
                            </span>
                          </td>
                          <td className="mon-err-msg" title={e.message}>{e.message || '—'}</td>
                          <td><span className="mon-err-service">{e.service || '—'}</span></td>
                          <td className="mon-err-path" title={e.path}>{e.path || '—'}</td>
                          <td className="mon-err-time">{fmtTimeShort(e.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mon-err-footer">
                    {recentErrors.length} most recent · {totalErrors} total in {errors.window_hours ?? 24}h
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Alerts ──────────────────────────────────────────── */}
      {view === 'alerts' && (
        <>
          {/* Filters */}
          <div className="mon-alert-filters">
            <select className="mon-filter-select" value={alertFilters.status}
              onChange={e => dispatch(setAlertFilters({ status: e.target.value, page: 1 }))}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>

            <select className="mon-filter-select" value={alertFilters.severity}
              onChange={e => dispatch(setAlertFilters({ severity: e.target.value, page: 1 }))}>
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
            </select>

            <input type="date" className="mon-filter-date" value={alertFilters.start_date}
              onChange={e => dispatch(setAlertFilters({ start_date: e.target.value, page: 1 }))} />
            <input type="date" className="mon-filter-date" value={alertFilters.end_date}
              onChange={e => dispatch(setAlertFilters({ end_date: e.target.value, page: 1 }))} />

            {(alertFilters.severity || alertFilters.start_date || alertFilters.end_date) && (
              <button className="mon-filter-reset" onClick={() => dispatch(resetAlertFilters())}>Clear</button>
            )}
            {alertsLoading && <span className="mon-alerts-loading">Loading…</span>}
          </div>

          {alertsError      && <div className="mon-error">{alertsError}</div>}
          {alertActionError && <div className="mon-error">Action failed: {alertActionError}</div>}

          {!alertsLoading && alerts.length === 0 ? (
            <div className="mon-err-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <AlertBellIcon /> No alerts match the current filters.
            </div>
          ) : (
            <div className="mon-err-table-wrap">
              <table className="mon-err-table">
                <colgroup>
                  <col style={{ width: '15%' }} /><col style={{ width: '9%' }} />
                  <col style={{ width: '11%' }} /><col style={{ width: '24%' }} />
                  <col style={{ width: '12%' }} /><col style={{ width: '10%' }} />
                  <col style={{ width: '9%' }} /><col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Alert Type</th><th>Severity</th><th>Status</th>
                    <th>Message</th><th>Source</th><th>Created</th>
                    <th>Resolved By</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(a => {
                    const busy = alertActioning.includes(a.id);
                    const st = (a.status || '').toLowerCase();
                    return (
                      <tr key={a.id}>
                        <td><span className="mon-err-code">{fmtAlertType(a.alert_type)}</span></td>
                        <td>
                          <span className={`mon-sev-pill ${severityCls(a.severity)}`}>
                            <span className="mon-dot" />{a.severity || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`mon-sev-pill ${alertStatusCls(a.status)}`}>
                            <span className="mon-dot" />{a.status || '—'}
                          </span>
                        </td>
                        <td className="mon-err-msg" title={a.message}>{a.message || '—'}</td>
                        <td><span className="mon-err-service">{a.source || '—'}</span></td>
                        <td className="mon-err-time">{fmtTimeShort(a.created_at)}</td>
                        <td className="mon-err-time">{a.resolved_by || a.acknowledged_by || '—'}</td>
                        <td className="mon-alert-actions">
                          {st === 'open' && (
                            <>
                              <button className="mon-act-btn mon-act-ack" disabled={busy}
                                title="Acknowledge"
                                onClick={() => dispatch(acknowledgeAlert(a.id))}>
                                {busy ? '…' : 'Ack'}
                              </button>
                              <button className="mon-act-btn mon-act-resolve" disabled={busy}
                                title="Resolve"
                                onClick={() => dispatch(resolveAlert(a.id))}>
                                {busy ? '…' : 'Resolve'}
                              </button>
                            </>
                          )}
                          {st === 'acknowledged' && (
                            <button className="mon-act-btn mon-act-resolve" disabled={busy}
                              title="Resolve"
                              onClick={() => dispatch(resolveAlert(a.id))}>
                              {busy ? '…' : 'Resolve'}
                            </button>
                          )}
                          {st === 'resolved' && (
                            <button className="mon-act-btn mon-act-archive" disabled={busy}
                              title="Archive"
                              onClick={() => dispatch(archiveAlert(a.id))}>
                              {busy ? '…' : 'Archive'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {alertsMeta?.total_pages > 1 && (
                <div className="mon-alert-pagination">
                  <button className="mon-page-btn"
                    disabled={alertFilters.page <= 1}
                    onClick={() => dispatch(setAlertFilters({ page: alertFilters.page - 1 }))}>
                    <ChevronLeftIcon />
                  </button>
                  <span className="mon-page-info">
                    Page {alertsMeta.page} of {alertsMeta.total_pages}
                    <span className="mon-page-total"> · {alertsMeta.total} alert{alertsMeta.total !== 1 ? 's' : ''}</span>
                  </span>
                  <button className="mon-page-btn"
                    disabled={alertFilters.page >= alertsMeta.total_pages}
                    onClick={() => dispatch(setAlertFilters({ page: alertFilters.page + 1 }))}>
                    <ChevronRightIcon />
                  </button>
                </div>
              )}

              {alertsMeta?.total != null && (alertsMeta.total_pages ?? 1) <= 1 && (
                <div className="mon-err-footer">
                  {alertsMeta.total} alert{alertsMeta.total !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}
