// src/components/Dashboard/DashboardTable.js
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDashboardOverview,
  fetchDashboardRevenue,
  fetchDashboardStats,
} from '../../store/slices/dashboardSlice';
import './DashboardTable.css';

const LABELS = {
  active_devices: 'Active Devices',
  active_licenses: 'Active Licenses',
  admin_users: 'Admin Users',
  blocked_devices: 'Blocked Devices',
  expired_licenses: 'Expired Licenses',
  expiring_soon: 'Expiring Soon',
  inactive_devices: 'Inactive Devices',
  revoked_licenses: 'Revoked Licenses',
  superadmin_users: 'Super Admins',
  total_devices: 'Total Devices',
  total_licenses: 'Total Licenses',
  total_users: 'Total Users',
  trial_licenses: 'Trial Licenses',
};

const LIVE_STATS = [
  {
    key: 'devices',
    label: 'Devices',
    accent: 'var(--accent-primary)',
    rows: [
      { label: 'Total', fields: ['total_devices', 'devices_total', 'device_count', 'devices'] },
      { label: 'Active', fields: ['active_devices', 'devices.active', 'device_status.active'] },
      { label: 'Inactive', fields: ['inactive_devices', 'devices.inactive', 'device_status.inactive'] },
      { label: 'Blocked', fields: ['blocked_devices', 'devices.blocked', 'device_status.blocked'] },
    ],
    includes: ['device'],
    excludes: ['heartbeat', 'miss', 'risk', 'playback'],
  },
  {
    key: 'licenses',
    label: 'Licenses',
    accent: 'var(--accent-success)',
    rows: [
      { label: 'Total', fields: ['total_licenses', 'licenses_total', 'license_count', 'licenses'] },
      { label: 'Active', fields: ['active_licenses', 'licenses.active', 'license_status.active'] },
      { label: 'Trial', fields: ['trial_licenses', 'licenses.trial', 'license_status.trial'] },
      { label: 'Expired', fields: ['expired_licenses', 'licenses.expired', 'license_status.expired'] },
      { label: 'Revoked', fields: ['revoked_licenses', 'licenses.revoked', 'license_status.revoked'] },
    ],
    includes: ['license'],
  },
  {
    key: 'users',
    label: 'Users',
    accent: 'var(--accent-secondary)',
    rows: [
      { label: 'Total', fields: ['total_users', 'users_total', 'user_count', 'users'] },
      { label: 'Admin', fields: ['admin_users', 'users.admin', 'roles.admin'] },
      { label: 'Super Admin', fields: ['superadmin_users', 'super_admin_users', 'users.superadmin', 'roles.superadmin'] },
      { label: 'Viewer', fields: ['viewer_users', 'users.viewer', 'roles.viewer'] },
    ],
    includes: ['user', 'admin', 'viewer'],
    excludes: ['device_user'],
  },
  {
    key: 'heartbeat',
    label: 'Heartbeat',
    accent: '#f59e0b',
    rows: [
      { label: 'Total', fields: ['total_heartbeats', 'heartbeat_total', 'heartbeat_count'] },
      { label: 'Last Hour', fields: ['heartbeats_last_hour', 'heartbeat.last_hour'] },
      { label: 'Success Rate', fields: ['success_rate_pct', 'heartbeat.success_rate_pct'], suffix: '%' },
      { label: 'Miss Rate', fields: ['miss_rate_percent', 'heartbeat.miss_rate_percent'], suffix: '%' },
    ],
    includes: ['heartbeat', 'miss', 'risk', 'playback', 'response', 'success_rate', 'failed_last_hour'],
  },
  {
    key: 'billing',
    label: 'Billing',
    accent: '#7c3aed',
    rows: [
      { label: 'Revenue 30d', revenueFields: ['revenue_30d_display'], fields: ['revenue_30d_display'] },
      { label: 'MRR', revenueFields: ['mrr_estimate_display'], fields: ['mrr_estimate_display'] },
      { label: 'Failed', revenueFields: ['failed_payments_7d'], fields: ['failed_payments_7d'] },
      { label: 'Refunds', revenueFields: ['refunds_30d_display'], fields: ['refunds_30d_display'] },
    ],
    includes: ['billing', 'revenue', 'payment', 'refund', 'subscription', 'mrr', 'churn', 'retry', 'plan'],
  },
  {
    key: 'audit',
    label: 'Audit',
    accent: '#94a3b8',
    rows: [
      { label: 'Total', fields: ['total_audit_events', 'audit_events', 'audit_logs', 'audit_count'] },
      { label: 'Last 24h', fields: ['audit_events_24h', 'audit_last_24h', 'audit.24h'] },
      { label: 'Failed', fields: ['failed_audit_events', 'audit_failed', 'audit.failed'] },
      { label: 'Users', fields: ['audit_users', 'audit.user_count', 'audited_users'] },
    ],
    includes: ['audit', 'event', 'log'],
  },
];

const REVENUE_CARDS = [
  { label: 'Revenue 30d', value: 'revenue_30d_display', sub: 'Last 30 days', accent: 'var(--accent-primary)' },
  { label: 'Revenue MTD', value: 'revenue_mtd_display', sub: 'Month to date', accent: '#10b981' },
  { label: 'MRR Estimate', value: 'mrr_estimate_display', sub: 'Estimated recurring', accent: '#7c3aed' },
  { label: 'Refunds 30d', value: 'refunds_30d_display', sub: 'Returned payments', accent: '#f87171' },
  { label: 'Failed Payments', value: 'failed_payments_7d', sub: 'Last 7 days', accent: '#f59e0b' },
  { label: 'Pending Retries', value: 'pending_retries', sub: 'Retry queue', accent: '#94a3b8' },
  { label: 'New Paid Subs', value: 'new_paid_subscriptions_30d', sub: 'Last 30 days', accent: '#00d4ff' },
  { label: 'Churned Subs', value: 'churned_subscriptions_30d', sub: 'Last 30 days', accent: '#ef4444' },
];

const formatLabel = (key) => (
  LABELS[key] ||
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
);

const formatValue = (value) => {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'number') return value.toLocaleString();
  return value;
};

const formatMetricValue = (value, suffix) => {
  const formatted = formatValue(value);
  if (formatted === '-' || !suffix) return formatted;
  return String(formatted).includes(suffix) ? formatted : `${formatted}${suffix}`;
};

const flattenStats = (value, prefix = '') => {
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, item]) => {
    const statKey = prefix ? `${prefix}_${key}` : key;
    if (typeof item === 'number') return [{ key: statKey, value: item }];
    if (typeof item === 'string' && item.trim() !== '') {
      return [{ key: statKey, value: !Number.isNaN(Number(item)) ? Number(item) : item }];
    }
    if (typeof item === 'boolean') return [{ key: statKey, value: item ? 'Yes' : 'No' }];
    if (Array.isArray(item)) {
      return item.length && item.every(entry => entry && typeof entry === 'object')
        ? [{ key: statKey, value: item.length }]
        : [{ key: statKey, value: item.length }];
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return flattenStats(item, statKey);
    }
    return [];
  });
};

const getNestedValue = (source, path) => (
  path.split('.').reduce((value, key) => value?.[key], source)
);

const firstPresent = (...values) => (
  values.find(value => value !== undefined && value !== null && value !== '')
);

const numericValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
};

const metricValue = (value) => {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== 'object') return value;
  return firstPresent(value.total, value.total_count, value.count, value.value);
};

const normalizeKey = (key = '') => key.toLowerCase().replace(/\./g, '_');

const matchesCard = (key, card) => {
  const normalized = normalizeKey(key);
  const includes = (card.includes || []).map(word => word.toLowerCase());
  const excludes = (card.excludes || []).map(word => word.toLowerCase());
  if (excludes.some(word => normalized.includes(word))) return false;
  return includes.some(word => normalized.includes(word));
};

const sumMatchingStats = (stats, includes = []) => {
  const includeWords = includes.map(word => word.toLowerCase());
  const total = flattenStats(stats).reduce((sum, item) => {
    const key = item.key.toLowerCase();
    if (!includeWords.some(word => key.includes(word))) return sum;
    return sum + Number(item.value || 0);
  }, 0);

  return total > 0 ? total : undefined;
};

const buildLiveStats = (stats, revenue) => (
  LIVE_STATS.map(card => {
    const usedKeys = new Set();
    const rows = card.rows.map((row, index) => {
      const statsMatches = row.fields.map(field => ({
        key: field,
        value: metricValue(getNestedValue(stats, field)),
      }));
      const revenueMatches = (row.revenueFields || []).map(field => ({
        key: field,
        value: metricValue(getNestedValue(revenue, field)),
      }));
      const fallbackSum = index === 0 ? sumMatchingStats(stats, card.includes) : undefined;
      const matched = [...revenueMatches, ...statsMatches].find(item => item.value !== undefined && item.value !== null && item.value !== '');
      const value = firstPresent(matched?.value, fallbackSum);
      const numeric = numericValue(value);
      [...row.fields, ...(row.revenueFields || [])].forEach(field => usedKeys.add(normalizeKey(field)));
      if (matched?.key) usedKeys.add(normalizeKey(matched.key));

      return {
        ...row,
        value: numeric !== null && !String(value).includes('$') ? numeric : value,
      };
    });

    const dynamicRows = [
      ...flattenStats(stats),
      ...(card.key === 'billing' ? flattenStats(revenue) : []),
    ]
      .filter(item => matchesCard(item.key, card))
      .filter(item => !usedKeys.has(normalizeKey(item.key)))
      .map(item => {
        usedKeys.add(normalizeKey(item.key));
        const numeric = numericValue(item.value);
        return {
          label: formatLabel(item.key),
          value: numeric !== null && !String(item.value).includes('$') ? numeric : item.value,
        };
      });

    return { ...card, rows: [...rows, ...dynamicRows] };
  })
);

const sumValues = (items) => Object.values(items || {}).reduce((sum, value) => sum + Number(value || 0), 0);
const entriesFromObject = (items) => Object.entries(items || {}).map(([label, value]) => ({ label, value }));

function StatCard({ label, rows, accent }) {
  const primary = rows?.[0];

  return (
    <div className="stat-card" style={{ '--stat-accent': accent || 'var(--accent-primary)' }}>
      <div className="stat-card-head">
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-primary-label">{primary?.label || 'Total'}</div>
        </div>
        <span className="stat-dot" />
      </div>
      <div className="stat-value">{formatMetricValue(primary?.value, primary?.suffix)}</div>
      <div className="stat-fields">
        {rows?.slice(1).map(row => (
          <div className="stat-field-row" key={row.label}>
            <span>{row.label}</span>
            <strong>{formatMetricValue(row.value, row.suffix)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, loading, error }) {
  return (
    <div className="dash-section-head">
      <div>
        <div className="dash-section-title">{title}</div>
        <div className="dash-section-subtitle">{loading ? 'Loading...' : error || subtitle}</div>
      </div>
    </div>
  );
}

function BreakdownCard({ title, items }) {
  const total = sumValues(Object.fromEntries(items.map(item => [item.label, item.value])));

  return (
    <div className="dash-panel">
      <div className="dash-panel-title">{title}</div>
      <div className="dash-breakdown">
        {items.length ? items.map(item => {
          const pct = total ? Math.round((Number(item.value || 0) / total) * 100) : 0;
          return (
            <div className="dash-break-row" key={item.label}>
              <div className="dash-break-top">
                <span>{formatLabel(item.label)}</span>
                <strong>{formatValue(item.value)}</strong>
              </div>
              <div className="dash-bar">
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        }) : <div className="table-empty compact">No data</div>}
      </div>
    </div>
  );
}

function RankedList({ title, items, labelKey, valueKey, extraKey }) {
  return (
    <div className="dash-panel">
      <div className="dash-panel-title">{title}</div>
      <div className="dash-ranked-list">
        {items?.length ? items.slice(0, 6).map((item, index) => (
          <div className="dash-ranked-row" key={`${item[labelKey]}-${index}`}>
            <span className="dash-rank">{index + 1}</span>
            <span className="dash-ranked-label">{item[labelKey] || 'Unknown'}</span>
            <strong>{formatValue(item[valueKey])}</strong>
            {extraKey && item[extraKey] !== undefined && <em>{item[extraKey]}%</em>}
          </div>
        )) : <div className="table-empty compact">No data</div>}
      </div>
    </div>
  );
}

function TrendCard({ items }) {
  const max = Math.max(...(items || []).map(item => Number(item.enrollments || 0)), 1);

  return (
    <div className="dash-panel wide">
      <div className="dash-panel-title">Enrollment Trend 7d</div>
      <div className="dash-trend">
        {items?.length ? items.map(item => (
          <div className="dash-trend-item" key={item.date}>
            <div className="dash-trend-bar" style={{ height: `${Math.max(8, (Number(item.enrollments || 0) / max) * 88)}px` }} />
            <span>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <strong>{formatValue(item.enrollments)}</strong>
          </div>
        )) : <div className="table-empty compact">No trend data</div>}
      </div>
    </div>
  );
}

export default function DashboardTable({ activeDashboardTab = 'liveStats' }) {
  const dispatch = useDispatch();
  const {
    stats,
    overview,
    revenue,
    loading,
    overviewLoading,
    revenueLoading,
    error,
    overviewError,
    revenueError,
  } = useSelector(s => s.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchDashboardOverview());
    dispatch(fetchDashboardRevenue());
  }, [dispatch]);

  const statCards = useMemo(() => buildLiveStats(stats, revenue), [stats, revenue]);
  const revenueCards = REVENUE_CARDS.map(card => ({
    ...card,
    value: revenue?.[card.value],
  }));

  return (
    <div className="dashboard-content">
      {activeDashboardTab === 'liveStats' && (
        <div className="dash-tab-panel">
          <SectionHeader title="Live Stats" subtitle="Core operational counts from dashboard stats." loading={loading} error={error} />
          {loading ? (
            <div className="table-loading">
              <span className="loading-spinner" style={{ width: 28, height: 28 }} />
              <span>Loading dashboard stats...</span>
            </div>
          ) : error ? null : (
            <div className="dashboard-stats">
              {statCards.map(card => (
                <StatCard
                  key={card.key}
                  label={card.label}
                  rows={card.rows}
                  accent={card.accent}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeDashboardTab === 'overview' && (
        <div className="dash-tab-panel">
          <SectionHeader title="Overview" subtitle="Platform, geography, versions, plans, and enrollment movement." loading={overviewLoading} error={overviewError} />
          {!overviewError && (
            <>
              <div className="dash-grid">
                <BreakdownCard title="Platform Breakdown" items={entriesFromObject(overview?.platform_breakdown)} />
                <BreakdownCard title="Device Types" items={entriesFromObject(overview?.device_type_breakdown)} />
                <BreakdownCard title="Plan Distribution" items={entriesFromObject(overview?.plan_distribution)} />
              </div>
              <div className="dash-grid">
                <RankedList title="Top Countries" items={overview?.top_countries} labelKey="country" valueKey="count" />
                <RankedList title="App Version Spread" items={overview?.app_version_spread} labelKey="version" valueKey="count" extraKey="pct" />
                <TrendCard items={overview?.enrollment_trend_7d} />
              </div>
            </>
          )}
        </div>
      )}

      {activeDashboardTab === 'revenue' && (
        <div className="dash-tab-panel">
          <SectionHeader title="Revenue Analytics" subtitle="30-day revenue, MRR, refunds, failures, and subscription movement." loading={revenueLoading} error={revenueError} />
          {!revenueError && (
            <div className="dashboard-stats">
              {revenueCards.map(card => (
                <StatCard
                  key={card.label}
                  label={card.label}
                  rows={[
                    { label: 'Value', value: revenueLoading ? '...' : card.value },
                    { label: 'Period', value: card.sub },
                  ]}
                  accent={card.accent}
                />
              ))}
            </div>
          )}
          {!revenueError && (
            <div className="dash-feature-card">
              <span>Top Plan by Revenue</span>
              <strong>{revenueLoading ? '...' : formatValue(revenue?.top_plan_by_revenue)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
