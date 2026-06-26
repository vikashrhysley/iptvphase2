import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchHealth,
  fetchHealthDb,
  fetchHealthRedis,
  fetchHealthQdrant,
  fetchMetrics,
  fetchVersion,
} from '../../store/slices/healthSlice';
import './HealthPage.css';

/* ── Icons ─────────────────────────────────────────────── */
const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const ProbeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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
const QdrantIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="8.5" x2="22" y2="8.5" />
    <line x1="2" y1="15.5" x2="22" y2="15.5" />
  </svg>
);
const AppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
const VersionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
  </svg>
);
const EnvIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const SERVICE_ICONS = { database: <DatabaseIcon />, redis: <RedisIcon /> };

/* ── Helpers ────────────────────────────────────────────── */
const statusMeta = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'healthy' || s === 'ok')       return { cls: 'health-green', label: 'HEALTHY' };
  if (s === 'degraded' || s === 'warning') return { cls: 'health-amber', label: 'DEGRADED' };
  if (s === 'not_configured')              return { cls: 'health-gray',  label: 'NOT CONFIGURED' };
  if (s === 'error')                       return { cls: 'health-red',   label: 'ERROR' };
  return { cls: 'health-red', label: s.toUpperCase() || 'UNKNOWN' };
};

const latencyMeta = (ms) => {
  if (ms === null || ms === undefined) return null;
  if (ms < 10)  return { cls: 'health-green', tier: 'Fast' };
  if (ms < 50)  return { cls: 'health-amber', tier: 'Acceptable' };
  return { cls: 'health-red', tier: 'Slow' };
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

/* ── Prometheus text parser ─────────────────────────────── */
const parsePrometheus = (text) => {
  if (!text) return [];
  const map = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('# HELP ')) {
      const [name, ...rest] = line.slice(7).split(' ');
      (map[name] = map[name] || {}).help = rest.join(' ');
    } else if (line.startsWith('# TYPE ')) {
      const [name, type] = line.slice(7).split(' ');
      (map[name] = map[name] || {}).type = type;
    } else if (!line.startsWith('#')) {
      // Match metric lines with or without label sets: metric_name{labels} value [timestamp]
      const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{[^}]*\})?\s+([\d.e+\-NaInf]+)/);
      if (m) {
        const name = m[1];
        const val  = parseFloat(m[2]);
        if (map[name] && map[name].value !== undefined) {
          // Same base metric with multiple label sets — accumulate
          map[name].value += val;
        } else {
          (map[name] = map[name] || {}).value = val;
        }
      }
    }
  }
  return Object.entries(map)
    .filter(([, v]) => v.value !== undefined)
    .map(([name, v]) => ({ name, ...v }));
};

const METRIC_META = {
  aiiptv_users_total:              { label: 'Total Users',           accent: 'var(--accent-primary)', suffix: '' },
  aiiptv_devices_active:           { label: 'Active Devices',        accent: '#10b981', suffix: '' },
  aiiptv_devices_blocked:          { label: 'Blocked Devices',       accent: '#f87171', suffix: '' },
  aiiptv_devices_high_risk:        { label: 'High Risk Devices',     accent: '#ef4444', suffix: '' },
  aiiptv_licenses_active:          { label: 'Active Licenses',       accent: '#a78bfa', suffix: '' },
  aiiptv_subscriptions_active:     { label: 'Active Subscriptions',  accent: '#7c3aed', suffix: '' },
  aiiptv_heartbeats_last_hour:     { label: 'Heartbeats / Hour',     accent: '#00d4ff', suffix: '' },
  aiiptv_heartbeat_avg_latency_ms: { label: 'Avg Heartbeat Latency', accent: '#f59e0b', suffix: 'ms' },
  aiiptv_db_latency_ms:            { label: 'DB Latency',            accent: '#34d399', suffix: 'ms' },
  aiiptv_redis_latency_ms:         { label: 'Redis Latency',         accent: '#34d399', suffix: 'ms' },
};

const fmtMetricVal = (v, suffix) => {
  if (v === null || v === undefined) return '—';
  const n = suffix === 'ms' ? v.toFixed(1) : v.toLocaleString();
  return suffix ? `${n} ${suffix}` : n;
};

/* ── Syntax-highlighted Prometheus view ─────────────────── */
function HighlightedMetrics({ text }) {
  const lines = (text || '').split('\n');
  return (
    <div className="hp-raw-metrics">
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) return <div className="hp-raw-line hp-raw-blank" key={i} />;

        if (t.startsWith('# HELP ')) {
          const m = t.match(/^# HELP (\S+)(.*)$/);
          return (
            <div className="hp-raw-line" key={i}>
              <span className="hp-raw-kw"># HELP </span>
              <span className="hp-raw-name">{m?.[1]}</span>
              <span className="hp-raw-help">{m?.[2]}</span>
            </div>
          );
        }
        if (t.startsWith('# TYPE ')) {
          const m = t.match(/^# TYPE (\S+)(.*)$/);
          return (
            <div className="hp-raw-line" key={i}>
              <span className="hp-raw-kw"># TYPE </span>
              <span className="hp-raw-name">{m?.[1]}</span>
              <span className="hp-raw-type">{m?.[2]}</span>
            </div>
          );
        }
        if (t.startsWith('#')) {
          return <div className="hp-raw-line hp-raw-kw" key={i}>{line}</div>;
        }

        // metric_name{labels} value [timestamp]
        const m = t.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+([\d.e+\-NaInf]+)(.*)?$/);
        return (
          <div className="hp-raw-line" key={i}>
            <span className="hp-raw-metric">{m?.[1] ?? t}</span>
            {m?.[2] && <span className="hp-raw-help">{m[2]}</span>}
            {m && <><span className="hp-raw-sep"> </span><span className="hp-raw-val">{m[3]}</span></>}
            {m?.[4]?.trim() && <span className="hp-raw-help"> {m[4].trim()}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Probe card sub-component ───────────────────────────── */
function ProbeCard({ icon, name, desc, data, loading, error, lastChecked, onProbe, renderExtra }) {
  const sm = statusMeta(data?.status);
  const lm = latencyMeta(data?.latency_ms);

  return (
    <div className="hp-probe-card">
      <div className="hp-probe-left">
        <span className="hp-probe-icon">{icon}</span>
        <div>
          <div className="hp-probe-name">{name}</div>
          <div className="hp-probe-desc">{desc}</div>
        </div>
      </div>

      <div className="hp-probe-right">
        {loading ? (
          <span className="hp-probe-probing">Probing…</span>
        ) : error ? (
          <span className="hp-probe-status health-red">ERROR</span>
        ) : data ? (
          <>
            <span className={`hp-probe-status ${sm.cls}`}>
              <span className="hp-probe-dot" />
              {sm.label}
            </span>
            {lm && (
              <div className="hp-latency-block">
                <span className={`hp-latency-val ${lm.cls}`}>
                  {data.latency_ms.toFixed(1)} ms
                </span>
                <span className={`hp-latency-tier ${lm.cls}`}>{lm.tier}</span>
              </div>
            )}
            {renderExtra?.(data)}
            {data.error && <div className="hp-probe-err">{data.error}</div>}
          </>
        ) : (
          <span className="hp-probe-probing">Not yet probed</span>
        )}
      </div>

      <div className="hp-probe-footer">
        <span className="hp-probe-time">
          {lastChecked ? `Probed at ${fmtChecked(lastChecked)}` : 'Not probed yet'}
        </span>
        <button className="hp-probe-btn" onClick={onProbe} disabled={loading}>
          <ProbeIcon />
          {loading ? 'Probing…' : 'Run Probe'}
        </button>
      </div>

      {error && <div className="hp-probe-err hp-probe-err-full">{error}</div>}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */
export default function HealthPage() {
  const dispatch = useDispatch();
  const {
    data, loading, error, lastChecked,
    db,      dbLoading,      dbError,      dbLastChecked,
    redis,   redisLoading,   redisError,   redisLastChecked,
    qdrant,  qdrantLoading,  qdrantError,  qdrantLastChecked,
    metrics, metricsLoading, metricsError, metricsLastChecked,
    version, versionLoading, versionError,
  } = useSelector(s => s.health);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    dispatch(fetchHealth());
    dispatch(fetchHealthDb());
    dispatch(fetchHealthRedis());
    dispatch(fetchHealthQdrant());
    dispatch(fetchMetrics());
    dispatch(fetchVersion());
  }, [dispatch]);

  const runAll = () => {
    dispatch(fetchHealth());
    dispatch(fetchHealthDb());
    dispatch(fetchHealthRedis());
    dispatch(fetchHealthQdrant());
    dispatch(fetchMetrics());
    dispatch(fetchVersion());
  };

  const overall     = statusMeta(data?.status);
  const services    = data?.services ? Object.entries(data.services) : [];
  const anyLoading  = loading || dbLoading || redisLoading || qdrantLoading || metricsLoading || versionLoading;
  const parsedMetrics = parsePrometheus(metrics);

  return (
    <div className="hp-page">
      {/* Header */}
      <div className="hp-header">
        <div>
          <div className="hp-title">Health &amp; Observability</div>
          <div className="hp-subtitle">Real-time system health status for all services.</div>
          {lastChecked && (
            <div className="hp-checked">Last checked: {fmtChecked(lastChecked)}</div>
          )}
        </div>
        <button className="hp-refresh" onClick={runAll} disabled={anyLoading}>
          <RefreshIcon />
          {anyLoading ? 'Checking…' : 'Refresh All'}
        </button>
      </div>

      {error && <div className="hp-error">{error}</div>}

      {/* Overall status banner */}
      <div className={`hp-status-banner ${overall.cls}`}>
        <span className={`hp-status-dot ${overall.cls}`} />
        <div className="hp-status-info">
          <div className="hp-status-label">{overall.label || 'CHECKING…'}</div>
          <div className="hp-status-desc">
            {!data && loading ? 'Fetching health status…' :
             overall.cls === 'health-green' ? 'All systems are fully operational.' :
             overall.cls === 'health-amber' ? 'Some services are degraded.' :
             'One or more services are down.'}
          </div>
        </div>
      </div>

      {/* App info cards */}
      {data && (
        <div className="hp-info-row">
          <div className="hp-info-card">
            <span className="hp-info-icon"><AppIcon /></span>
            <div>
              <div className="hp-info-key">Application</div>
              <div className="hp-info-val">{data.app || '—'}</div>
            </div>
          </div>
          <div className="hp-info-card">
            <span className="hp-info-icon"><VersionIcon /></span>
            <div>
              <div className="hp-info-key">Version</div>
              <div className="hp-info-val">{data.version || '—'}</div>
            </div>
          </div>
          <div className="hp-info-card">
            <span className="hp-info-icon"><EnvIcon /></span>
            <div>
              <div className="hp-info-key">Environment</div>
              <div className="hp-info-val hp-env">{data.environment || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Version & Build */}
      {(version || versionLoading || versionError) && (
        <div className="hp-section">
          <div className="hp-section-title">Version &amp; Build</div>
          {versionError && <div className="hp-error">{versionError}</div>}
          {versionLoading && !version && (
            <div className="hp-skeleton-row">
              {[1,2,3,4,5].map(i => <div className="hp-skeleton-card" style={{ height: 72 }} key={i} />)}
            </div>
          )}
          {version && (
            <div className="hp-version-card">
              {[
                { key: 'app',         label: 'Application'  },
                { key: 'version',     label: 'Version'      },
                { key: 'build',       label: 'Build Date'   },
                { key: 'environment', label: 'Environment'  },
                { key: 'api_version', label: 'API Version'  },
              ].map(({ key, label }) => (
                <div className="hp-version-field" key={key}>
                  <div className="hp-version-label">{label}</div>
                  <div className="hp-version-val">{version[key] || '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Services */}
      {services.length > 0 && (
        <div className="hp-section">
          <div className="hp-section-title">Services</div>
          <div className="hp-services-grid">
            {services.map(([name, status]) => {
              const m = statusMeta(status);
              return (
                <div className={`hp-service-card ${m.cls}`} key={name}>
                  <div className="hp-svc-icon">{SERVICE_ICONS[name] || <DatabaseIcon />}</div>
                  <div className="hp-svc-name">{name.charAt(0).toUpperCase() + name.slice(1)}</div>
                  <div className="hp-svc-status">
                    <span className={`hp-svc-dot ${m.cls}`} />
                    <span className="hp-svc-label">{m.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Latency probes */}
      <div className="hp-section">
        <div className="hp-section-title">Latency Probes</div>
        <div className="hp-probes-list">

          <ProbeCard
            icon={<DatabaseIcon />}
            name="PostgreSQL"
            desc="SELECT 1 round-trip latency"
            data={db}
            loading={dbLoading}
            error={dbError}
            lastChecked={dbLastChecked}
            onProbe={() => dispatch(fetchHealthDb())}
          />

          <ProbeCard
            icon={<RedisIcon />}
            name="Redis"
            desc="PING round-trip latency"
            data={redis}
            loading={redisLoading}
            error={redisError}
            lastChecked={redisLastChecked}
            onProbe={() => dispatch(fetchHealthRedis())}
          />

          <ProbeCard
            icon={<QdrantIcon />}
            name="Qdrant"
            desc="Vector DB availability check"
            data={qdrant}
            loading={qdrantLoading}
            error={qdrantError}
            lastChecked={qdrantLastChecked}
            onProbe={() => dispatch(fetchHealthQdrant())}
            renderExtra={(d) =>
              d.collections !== undefined && (
                <span className="hp-qdrant-collections">
                  {d.collections} collection{d.collections !== 1 ? 's' : ''}
                </span>
              )
            }
          />

        </div>
      </div>

      {/* Prometheus metrics */}
      <div className="hp-section">
        <div className="hp-metrics-header">
          <div className="hp-section-title" style={{ marginBottom: 0 }}>Prometheus Metrics</div>
          <div className="hp-metrics-actions">
            {metricsLastChecked && (
              <span className="hp-checked" style={{ margin: 0 }}>
                {fmtChecked(metricsLastChecked)}
              </span>
            )}
            <button
              className="hp-probe-btn"
              onClick={() => setShowRaw(r => !r)}
              disabled={!metrics}
            >
              {showRaw ? 'Show Cards' : 'View Raw'}
            </button>
            <button
              className="hp-probe-btn"
              onClick={() => dispatch(fetchMetrics())}
              disabled={metricsLoading}
            >
              <ProbeIcon />
              {metricsLoading ? 'Fetching…' : 'Refresh'}
            </button>
          </div>
        </div>

        {metricsError && <div className="hp-error" style={{ marginTop: 12 }}>{metricsError}</div>}

        {metricsLoading && !metrics && (
          <div className="hp-skeleton-row" style={{ marginTop: 12 }}>
            {[1,2,3,4,5].map(i => <div className="hp-skeleton-card hp-skeleton-metric" key={i} />)}
          </div>
        )}

        {!metricsLoading && metrics && (
          showRaw ? (
            <HighlightedMetrics text={metrics} />
          ) : (
            <div className="hp-metrics-grid">
              {parsedMetrics.map(({ name, value, help }) => {
                const meta = METRIC_META[name] || { label: name.replace(/^aiiptv_/, '').replace(/_/g, ' '), accent: 'var(--accent-primary)', suffix: '' };
                return (
                  <div className="hp-metric-card" style={{ '--m-accent': meta.accent }} key={name}>
                    <div className="hp-metric-label">{meta.label}</div>
                    <div className="hp-metric-value">{fmtMetricVal(value, meta.suffix)}</div>
                    {help && <div className="hp-metric-help" title={help}>{help}</div>}
                  </div>
                );
              })}
              {parsedMetrics.length === 0 && (
                <div className="hp-sec-empty" style={{ gridColumn: '1/-1' }}>No metrics received.</div>
              )}
            </div>
          )
        )}
      </div>

      {/* Loading skeleton when no data yet */}
      {loading && !data && (
        <div className="hp-skeleton-row">
          {[1, 2].map(i => <div className="hp-skeleton-card" key={i} />)}
        </div>
      )}
    </div>
  );
}
