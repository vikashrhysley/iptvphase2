import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInfraStatus, fetchInfraDbPerf, fetchInfraQueues, fetchInfraPerformance } from '../../store/slices/infraSlice';
import './InfraPage.css';

/* ── Icons ──────────────────────────────────────────────── */
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
  </svg>
);
const AlertTriangleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const DatabaseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
  </svg>
);
const ReplicaIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <path d="M3 13v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" strokeDasharray="3 3" />
  </svg>
);
const RedisIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const PoolIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" />
    <line x1="8.1" y1="7.9" x2="15.9" y2="16.1" /><line x1="15.9" y1="7.9" x2="8.1" y2="16.1" />
  </svg>
);
const CeleryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
const QdrantIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="8.5" x2="22" y2="8.5" />
    <line x1="2" y1="15.5" x2="22" y2="15.5" />
  </svg>
);
const QueueIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const GaugeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2a10 10 0 0 1 10 10" /><path d="M12 2a10 10 0 0 0-10 10" />
    <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
    <path d="M12 10V6" /><path d="M19.07 7.93l-2.12 2.12" />
  </svg>
);

/* ── Status helpers ─────────────────────────────────────── */
const statusMeta = (label, cls) => ({ label, cls });

const deriveStatus = (check) => {
  if (!check) return statusMeta('UNKNOWN', 'inf-gray');
  if (check.status === 'not_configured') return statusMeta('NOT CONFIGURED', 'inf-gray');
  if ('healthy' in check) return check.healthy ? statusMeta('HEALTHY', 'inf-green') : statusMeta('DOWN', 'inf-red');
  if ('available' in check) return check.available ? statusMeta('AVAILABLE', 'inf-green') : statusMeta('UNAVAILABLE', 'inf-red');
  if ('enabled' in check) {
    if (!check.configured) return statusMeta('NOT CONFIGURED', 'inf-gray');
    return check.enabled ? statusMeta('ENABLED', 'inf-green') : statusMeta('DISABLED', 'inf-amber');
  }
  if ('workers_online' in check) {
    return check.workers_online > 0 ? statusMeta('ONLINE', 'inf-green') : statusMeta('OFFLINE', 'inf-red');
  }
  return statusMeta('UNKNOWN', 'inf-gray');
};

const latencyMeta = (ms) => {
  if (ms === null || ms === undefined) return null;
  if (ms < 10) return 'inf-green';
  if (ms < 50) return 'inf-amber';
  return 'inf-red';
};

const fmtChecked = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return null; }
};

/* ── Infra card ──────────────────────────────────────────── */
function InfraCard({ icon, name, desc, check, children }) {
  const meta = deriveStatus(check);
  const latCls = latencyMeta(check?.latency_ms);
  return (
    <div className={`inf-card ${meta.cls}`}>
      <div className="inf-card-top">
        <span className="inf-card-icon">{icon}</span>
        <div className="inf-card-heading">
          <div className="inf-card-name-row">
            <div className="inf-card-name">{name}</div>
            <span className={`inf-status-pill ${meta.cls}`}>
              <span className="inf-status-dot" />
              {meta.label}
            </span>
          </div>
          <div className="inf-card-desc">{desc}</div>
        </div>
      </div>

      {check?.latency_ms != null && (
        <div className="inf-metric-row">
          <span className="inf-metric-key">Latency</span>
          <span className={`inf-metric-val ${latCls}`}>{check.latency_ms.toFixed(1)} ms</span>
        </div>
      )}

      {children}
    </div>
  );
}

/* ── Latency sparkline ───────────────────────────────────── */
function Sparkline({ points }) {
  if (!points?.length) return <div className="inf-spark-empty">No trend data</div>;

  const vals = points.map(p => p.db_latency_ms ?? 0);
  const times = points.map(p => p.created_at);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const W = 400, H = 56, PX = 4, PY = 6;
  const coords = vals.map((v, i) => {
    const x = PX + (i / Math.max(vals.length - 1, 1)) * (W - PX * 2);
    const y = PY + (1 - (v - min) / range) * (H - PY * 2);
    return [x, y];
  });

  const polyPts = coords.map(([x, y]) => `${x},${y}`).join(' ');
  const areaPath = `M${coords[0][0]},${H} ` +
    coords.map(([x, y]) => `L${x},${y}`).join(' ') +
    ` L${coords[coords.length - 1][0]},${H} Z`;

  const fmtTime = (iso) => {
    try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  return (
    <div className="inf-spark-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="inf-spark-svg">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--accent-primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkGrad)" />
        <polyline points={polyPts} fill="none" stroke="var(--accent-primary)" strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round" />
        {coords.length > 0 && (
          <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]}
            r="3" fill="var(--accent-primary)" />
        )}
      </svg>
      <div className="inf-spark-axis">
        <span>{fmtTime(times[0])}</span>
        <span>{fmtTime(times[times.length - 1])}</span>
      </div>
    </div>
  );
}

/* ── Page titles per view ────────────────────────────────── */
const VIEW_META = {
  db_performance:        { title: 'Database Performance', subtitle: 'Primary pool metrics and latency trend.' },
  queue_health:          { title: 'Queue Health',          subtitle: 'Celery queue status and backlog snapshot.' },
  performance_benchmarks:{ title: 'Performance Benchmarks', subtitle: 'Operation latency vs. targets · 60s cache.' },
};

/* ── Page ───────────────────────────────────────────────── */
export default function InfraPage({ view }) {
  const dispatch = useDispatch();
  const {
    data, loading, error, lastChecked,
    dbPerf, dbPerfLoading, dbPerfError,
    queues, queuesLoading, queuesError,
    perf, perfLoading, perfError,
  } = useSelector(s => s.infra);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    dispatch(fetchInfraStatus());
    dispatch(fetchInfraDbPerf());
    dispatch(fetchInfraQueues());
    dispatch(fetchInfraPerformance());
  }, [dispatch]);

  useEffect(() => {
    const id = setInterval(() => {
      dispatch(fetchInfraStatus());
      dispatch(fetchInfraDbPerf());
      dispatch(fetchInfraQueues());
      dispatch(fetchInfraPerformance());
    }, 15_000);
    return () => clearInterval(id);
  }, [dispatch]);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5_000);
    return () => clearInterval(id);
  }, []);

  const coreHealthy = !!(data?.database?.healthy && data?.redis?.healthy);
  const celeryOk = (data?.celery?.workers_online ?? 0) > 0;
  const qdrantOk = data?.qdrant?.available !== false;

  const overall = !data
    ? statusMeta('CHECKING…', 'inf-gray')
    : !coreHealthy
    ? statusMeta('CRITICAL', 'inf-red')
    : (!celeryOk || !qdrantOk)
    ? statusMeta('DEGRADED', 'inf-amber')
    : statusMeta('HEALTHY', 'inf-green');

  const checkedIso = data?.checked_at || lastChecked;
  const secAgo = checkedIso ? Math.max(0, Math.floor((Date.now() - new Date(checkedIso).getTime()) / 1000)) : null;

  const poolPct = data?.database?.pool_size
    ? Math.min(100, Math.round((data.database.checked_out / data.database.pool_size) * 100))
    : null;

  const dbPrimary  = dbPerf?.primary;
  const dbReplica  = dbPerf?.replica;
  const dbBouncer  = dbPerf?.pgbouncer;
  const dbHistory  = dbPerf?.historical ?? [];
  const perfPoolPct = dbPrimary?.pool_size
    ? Math.min(100, Math.round(((dbPrimary.checked_out ?? 0) / dbPrimary.pool_size) * 100))
    : null;
  const latCls = latencyMeta(dbPrimary?.latency_ms);

  const viewMeta = view ? VIEW_META[view] : null;
  const pageTitle    = viewMeta ? viewMeta.title    : 'Infrastructure';
  const pageSubtitle = viewMeta ? viewMeta.subtitle : 'Live infrastructure health snapshot — always reflects current state.';
  const isRefreshing = view === 'db_performance' ? dbPerfLoading
    : view === 'queue_health' ? queuesLoading
    : view === 'performance_benchmarks' ? perfLoading
    : loading;

  return (
    <div className="inf-page">
      <div className="inf-header">
        <div>
          <div className="inf-title">{pageTitle}</div>
          <div className="inf-subtitle">{pageSubtitle}</div>
        </div>
        <div className="inf-header-right">
          <div className="inf-auto-refresh-info">
            <span className={`inf-refresh-dot${isRefreshing ? ' spinning' : ''}`} />
            {secAgo === null ? 'Auto-refresh every 15s' : secAgo < 3 ? 'Updated just now' : `Updated ${secAgo}s ago`}
          </div>
          <button className="inf-refresh-btn" onClick={() => dispatch(fetchInfraStatus())} disabled={loading}>
            <RefreshIcon />
            {loading ? 'Checking…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Overview (no sub-view selected) ─────────────────── */}
      {!view && (
        <>
          {error && <div className="inf-error"><AlertTriangleIcon /><span>{error}</span></div>}

          {overall.cls !== 'inf-amber' && (
            <div className={`inf-status-banner ${overall.cls}`}>
              <span className={`inf-status-dot-lg ${overall.cls}`} />
              <div>
                <div className="inf-status-label">{overall.label}</div>
                <div className="inf-status-desc">
                  {!data ? 'Fetching infrastructure status…'
                    : overall.cls === 'inf-green' ? 'All core services are fully operational.'
                    : 'One or more core services are down.'}
                </div>
              </div>
            </div>
          )}

          {loading && !data && (
            <div className="inf-skeleton-grid">
              {Array.from({ length: 6 }, (_, i) => <div className="inf-skeleton-card" key={i} />)}
            </div>
          )}

          {data && (
            <div className="inf-grid">
              <InfraCard icon={<DatabaseIcon />} name="Database" desc="Primary PostgreSQL connection pool" check={data.database}>
                {data.database?.pool_size != null && (
                  <>
                    <div className="inf-metric-row">
                      <span className="inf-metric-key">Pool</span>
                      <span className="inf-metric-val">{data.database.checked_out} / {data.database.pool_size} in use</span>
                    </div>
                    <div className="inf-pool-bar-wrap">
                      <div className="inf-pool-bar" style={{ width: `${poolPct}%` }} />
                    </div>
                  </>
                )}
              </InfraCard>

              <InfraCard icon={<ReplicaIcon />} name="Database Replica" desc="Read replica connection" check={data.database_replica} />

              <InfraCard icon={<RedisIcon />} name="Redis" desc="Cache &amp; session store" check={data.redis}>
                {data.redis?.used_memory_mb != null && (
                  <div className="inf-metric-row">
                    <span className="inf-metric-key">Memory</span>
                    <span className="inf-metric-val">{data.redis.used_memory_mb.toFixed(1)} MB</span>
                  </div>
                )}
                {data.redis?.maxmemory_policy && (
                  <div className="inf-metric-row">
                    <span className="inf-metric-key">Eviction Policy</span>
                    <span className="inf-metric-val inf-mono">{data.redis.maxmemory_policy}</span>
                  </div>
                )}
                {data.redis?.hit_ratio_pct != null && (
                  <div className="inf-metric-row">
                    <span className="inf-metric-key">Hit Ratio</span>
                    <span className="inf-metric-val">{data.redis.hit_ratio_pct.toFixed(1)}%</span>
                  </div>
                )}
                {data.redis?.evicted_keys != null && (
                  <div className="inf-metric-row">
                    <span className="inf-metric-key">Evicted Keys</span>
                    <span className="inf-metric-val">{data.redis.evicted_keys.toLocaleString()}</span>
                  </div>
                )}
              </InfraCard>

              <InfraCard icon={<PoolIcon />} name="PgBouncer" desc="Connection pooler" check={data.pgbouncer} />

              <InfraCard icon={<CeleryIcon />} name="Celery" desc="Background task workers" check={data.celery}>
                <div className="inf-metric-row">
                  <span className="inf-metric-key">Workers Online</span>
                  <span className="inf-metric-val">{data.celery?.workers_online ?? 0}</span>
                </div>
                {data.celery?.queues?.length > 0 && (
                  <div className="inf-queue-chips">
                    {data.celery.queues.map(q => <span key={q} className="inf-queue-chip">{q}</span>)}
                  </div>
                )}
              </InfraCard>

              <InfraCard icon={<QdrantIcon />} name="Qdrant" desc="Vector database" check={data.qdrant} />
            </div>
          )}
        </>
      )}

      {/* ── Database Performance ─────────────────────────────── */}
      {view === 'db_performance' && (
        <>
          {dbPerfError && (
            <div className="inf-error"><AlertTriangleIcon /><span>{dbPerfError}</span></div>
          )}

          {dbPerfLoading && !dbPerf && (
            <div className="inf-skeleton-grid" style={{ gridTemplateColumns: '1fr', marginBottom: 0 }}>
              <div className="inf-skeleton-card" style={{ height: 180 }} />
            </div>
          )}

          {dbPerf && (
            <div className="inf-dbperf-wrap">
              <div className="inf-dbperf-tiles">
                <div className="inf-dbperf-tile">
                  <div className="inf-dbperf-tile-label">Latency</div>
                  <div className={`inf-dbperf-tile-val ${latCls || ''}`}>
                    {dbPrimary?.latency_ms != null ? `${dbPrimary.latency_ms.toFixed(1)} ms` : '—'}
                  </div>
                </div>
                <div className="inf-dbperf-tile">
                  <div className="inf-dbperf-tile-label">Pool Used</div>
                  <div className="inf-dbperf-tile-val">
                    {dbPrimary?.checked_out ?? '—'} / {dbPrimary?.pool_size ?? '—'}
                  </div>
                  {perfPoolPct !== null && (
                    <div className="inf-pool-bar-wrap" style={{ marginTop: 6 }}>
                      <div className="inf-pool-bar" style={{ width: `${perfPoolPct}%` }} />
                    </div>
                  )}
                </div>
                <div className="inf-dbperf-tile">
                  <div className="inf-dbperf-tile-label">Checked In</div>
                  <div className="inf-dbperf-tile-val">{dbPrimary?.checked_in ?? '—'}</div>
                </div>
                <div className="inf-dbperf-tile">
                  <div className="inf-dbperf-tile-label">Overflow</div>
                  <div className={`inf-dbperf-tile-val ${(dbPrimary?.overflow ?? 0) > 0 ? 'inf-red-txt' : ''}`}>
                    {dbPrimary?.overflow ?? '—'}
                  </div>
                </div>
                <div className="inf-dbperf-tile">
                  <div className="inf-dbperf-tile-label">Replica</div>
                  <div className="inf-dbperf-tile-val inf-dbperf-pill-wrap">
                    {dbReplica?.status === 'not_configured'
                      ? <span className="inf-status-pill inf-gray"><span className="inf-status-dot" />Not Configured</span>
                      : dbReplica?.latency_ms != null
                        ? <span className={`inf-status-pill ${latencyMeta(dbReplica.latency_ms) || 'inf-green'}`}><span className="inf-status-dot" />{dbReplica.latency_ms.toFixed(1)} ms</span>
                        : <span className="inf-status-pill inf-gray"><span className="inf-status-dot" />Unknown</span>
                    }
                  </div>
                </div>
                <div className="inf-dbperf-tile">
                  <div className="inf-dbperf-tile-label">PgBouncer</div>
                  <div className="inf-dbperf-tile-val inf-dbperf-pill-wrap">
                    {!dbBouncer?.configured
                      ? <span className="inf-status-pill inf-gray"><span className="inf-status-dot" />Not Configured</span>
                      : dbBouncer?.enabled
                        ? <span className="inf-status-pill inf-green"><span className="inf-status-dot" />Enabled</span>
                        : <span className="inf-status-pill inf-amber"><span className="inf-status-dot" />Disabled</span>
                    }
                  </div>
                </div>
              </div>

              <div className="inf-dbperf-chart">
                <div className="inf-dbperf-chart-title">
                  Latency Trend
                  <span className="inf-dbperf-chart-range">Last hour · {dbHistory.length} samples</span>
                </div>
                {dbHistory.length > 0
                  ? <Sparkline points={dbHistory} />
                  : <div className="inf-spark-empty">No historical data available</div>
                }
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Queue Health ──────────────────────────────────────── */}
      {view === 'queue_health' && (
        <>
          {queuesError && (
            <div className="inf-error"><AlertTriangleIcon /><span>{queuesError}</span></div>
          )}

          {queuesLoading && !queues && (
            <div className="inf-skeleton-grid" style={{ gridTemplateColumns: '1fr', marginBottom: 0 }}>
              <div className="inf-skeleton-card" style={{ height: 220 }} />
            </div>
          )}

          {(() => {
            const qList = queues?.queues ?? [];
            if (!queues) return null;
            return (
              <div className="inf-queue-table-wrap">
                {qList.length === 0 ? (
                  <div className="inf-qt-empty">No queue data available — snapshot may still be populating.</div>
                ) : (
                  <table className="inf-queue-table">
                    <colgroup>
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '14%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Queue</th>
                        <th>Status</th>
                        <th className="inf-qt-num">Pending</th>
                        <th className="inf-qt-num">Active</th>
                        <th className="inf-qt-num">Workers</th>
                        <th className="inf-qt-num">Oldest Task</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qList.map(q => {
                        const qMeta = q.status === 'healthy'
                          ? { cls: 'inf-green', label: 'Healthy' }
                          : q.status === 'backlogged'
                          ? { cls: 'inf-amber', label: 'Backlogged' }
                          : q.status === 'no_workers'
                          ? { cls: 'inf-red', label: 'No Workers' }
                          : { cls: 'inf-gray', label: q.status || 'Unknown' };

                        const ageSec = q.oldest_pending_task_age_s;
                        const ageLabel = ageSec == null ? '—'
                          : ageSec < 60 ? `${ageSec}s`
                          : ageSec < 3600 ? `${Math.floor(ageSec / 60)}m`
                          : `${Math.floor(ageSec / 3600)}h`;

                        return (
                          <tr key={q.name} className={q.status !== 'healthy' ? 'inf-qt-row-warn' : ''}>
                            <td><span className="inf-qt-name">{q.name}</span></td>
                            <td>
                              <span className={`inf-status-pill ${qMeta.cls}`}>
                                <span className="inf-status-dot" />{qMeta.label}
                              </span>
                            </td>
                            <td className="inf-qt-num">
                              <span className={q.pending_count > 0 ? 'inf-qt-nonzero' : ''}>{q.pending_count ?? '—'}</span>
                            </td>
                            <td className="inf-qt-num">{q.active_count ?? '—'}</td>
                            <td className="inf-qt-num">
                              <span className={q.worker_count === 0 && q.pending_count > 0 ? 'inf-qt-warn' : ''}>{q.worker_count ?? '—'}</span>
                            </td>
                            <td className="inf-qt-num">
                              <span className={ageSec != null && ageSec > 60 ? 'inf-qt-warn' : ''}>{ageLabel}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {queues.measured_at && (
                  <div className="inf-qt-footer">
                    Snapshot at {new Date(queues.measured_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* ── Performance Benchmarks ────────────────────────────── */}
      {view === 'performance_benchmarks' && (
        <>
          {perfError && (
            <div className="inf-error"><AlertTriangleIcon /><span>{perfError}</span></div>
          )}

          {perfLoading && !perf && (
            <div className="inf-skeleton-grid" style={{ gridTemplateColumns: '1fr', marginBottom: 0 }}>
              <div className="inf-skeleton-card" style={{ height: 200 }} />
            </div>
          )}

          {perf && (
            <>
              <div className="inf-perf-stats">
                {[
                  { label: 'Redis Hit Ratio',  val: perf.redis_hit_ratio_pct,  hi: 90, lo: 70 },
                  { label: 'DB Availability',  val: perf.db_availability_pct,  hi: 99.9, lo: 99 },
                  { label: 'API Availability', val: perf.api_availability_pct, hi: 99.9, lo: 99 },
                ].map(({ label, val, hi, lo }) => (
                  <div className="inf-perf-stat" key={label}>
                    <div className="inf-perf-stat-label">{label}</div>
                    <div className={`inf-perf-stat-val ${val == null ? '' : val >= hi ? 'inf-green' : val >= lo ? 'inf-amber' : 'inf-red'}`}>
                      {val != null ? `${val.toFixed(1)}%` : '—'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="inf-queue-table-wrap">
                {perf.benchmarks.length === 0 ? (
                  <div className="inf-qt-empty">No benchmark data available.</div>
                ) : (
                  <table className="inf-queue-table inf-perf-table">
                    <colgroup>
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '14%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Operation</th>
                        <th>Target</th>
                        <th>P50</th>
                        <th>P99</th>
                        <th>Status</th>
                        <th>Samples</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perf.benchmarks.map(b => {
                        const sMeta = b.within_target === true
                          ? { cls: 'inf-green', label: 'Within Target' }
                          : b.within_target === false
                          ? { cls: 'inf-red',   label: 'Over Target' }
                          : { cls: 'inf-gray',  label: 'No Data' };
                        const opLabel = (b.operation || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        const fmtMs = (v) => v != null ? `${v} ms` : '—';
                        return (
                          <tr key={b.operation}>
                            <td style={{ textAlign: 'left' }}>
                              <span className="inf-qt-name">{opLabel}</span>
                            </td>
                            <td className="inf-qt-num">{fmtMs(b.target_ms)}</td>
                            <td className={`inf-qt-num ${b.measured_p50_ms != null ? (b.measured_p50_ms <= b.target_ms ? 'inf-perf-good' : 'inf-perf-over') : ''}`}>
                              {fmtMs(b.measured_p50_ms)}
                            </td>
                            <td className={`inf-qt-num ${b.measured_p99_ms != null ? (b.measured_p99_ms <= b.target_ms ? 'inf-perf-good' : 'inf-perf-over') : ''}`}>
                              {fmtMs(b.measured_p99_ms)}
                            </td>
                            <td>
                              <span className={`inf-status-pill ${sMeta.cls}`}>
                                <span className="inf-status-dot" />{sMeta.label}
                              </span>
                            </td>
                            <td className="inf-qt-num">
                              {b.sample_size > 0 ? b.sample_size.toLocaleString() : <span className="inf-perf-nodata">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {perf.measured_at && (
                  <div className="inf-qt-footer">
                    Measured at {new Date(perf.measured_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
