import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInfraStatus } from '../../store/slices/infraSlice';
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
          <div className="inf-card-name">{name}</div>
          <div className="inf-card-desc">{desc}</div>
        </div>
        <span className={`inf-status-pill ${meta.cls}`}>
          <span className="inf-status-dot" />
          {meta.label}
        </span>
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

/* ── Page ───────────────────────────────────────────────── */
export default function InfraPage() {
  const dispatch = useDispatch();
  const { data, loading, error, lastChecked } = useSelector(s => s.infra);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    dispatch(fetchInfraStatus());
  }, [dispatch]);

  // Auto-refresh every 15s — this page reflects live state, not a trend.
  useEffect(() => {
    const id = setInterval(() => dispatch(fetchInfraStatus()), 15_000);
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

  return (
    <div className="inf-page">
      <div className="inf-header">
        <div>
          <div className="inf-title">Infrastructure</div>
          <div className="inf-subtitle">Live infrastructure health snapshot — always reflects current state.</div>
        </div>
        <div className="inf-header-right">
          <div className="inf-auto-refresh-info">
            <span className={`inf-refresh-dot${loading ? ' spinning' : ''}`} />
            {secAgo === null ? 'Auto-refresh every 15s' : secAgo < 3 ? 'Updated just now' : `Updated ${secAgo}s ago`}
          </div>
          <button className="inf-refresh-btn" onClick={() => dispatch(fetchInfraStatus())} disabled={loading}>
            <RefreshIcon />
            {loading ? 'Checking…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="inf-error"><AlertTriangleIcon /><span>{error}</span></div>}

      <div className={`inf-status-banner ${overall.cls}`}>
        <span className={`inf-status-dot-lg ${overall.cls}`} />
        <div>
          <div className="inf-status-label">{overall.label}</div>
          <div className="inf-status-desc">
            {!data ? 'Fetching infrastructure status…'
              : overall.cls === 'inf-green' ? 'All core services are fully operational.'
              : overall.cls === 'inf-amber' ? 'Core services are healthy; some auxiliary services need attention.'
              : 'One or more core services are down.'}
          </div>
        </div>
      </div>

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
    </div>
  );
}
