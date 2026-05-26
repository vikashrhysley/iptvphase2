// src/components/Dashboard/DashboardTable.js
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats } from '../../store/slices/dashboardSlice';
import './DashboardTable.css';

const STAT_ACCENTS = [
  'var(--accent-primary)',
  'var(--accent-success)',
  'var(--accent-secondary)',
  'var(--accent-danger)',
  '#f59e0b',
  '#7c3aed',
  '#10b981',
  '#94a3b8',
];

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

const formatLabel = (key) => (
  LABELS[key] ||
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
);

const formatValue = (value) => {
  if (typeof value === 'number') return value.toLocaleString();
  return value;
};

const flattenStats = (value, prefix = '') => {
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, item]) => {
    const statKey = prefix ? `${prefix}_${key}` : key;
    if (typeof item === 'number') return [{ key: statKey, value: item }];
    if (typeof item === 'string' && item.trim() !== '' && !Number.isNaN(Number(item))) {
      return [{ key: statKey, value: Number(item) }];
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return flattenStats(item, statKey);
    }
    return [];
  });
};

export default function DashboardTable() {
  const dispatch = useDispatch();
  const { stats, loading, error } = useSelector(s => s.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  const cards = flattenStats(stats);

  return (
    <div className="dashboard-content">
      {loading ? (
        <div className="table-loading">
          <span className="loading-spinner" style={{ width: 28, height: 28 }} />
          <span>Loading dashboard stats...</span>
        </div>
      ) : error ? (
        <div className="table-empty">{error}</div>
      ) : cards.length === 0 ? (
        <div className="table-empty">No dashboard stats returned from API.</div>
      ) : (
        <div className="dashboard-stats">
          {cards.map((card, index) => (
            <div
              key={card.key}
              className="stat-card"
              style={{ '--stat-accent': STAT_ACCENTS[index % STAT_ACCENTS.length] }}
            >
              <div className="stat-label">{formatLabel(card.key)}</div>
              <div className="stat-value">{formatValue(card.value)}</div>
              <div className="stat-sub">Live dashboard metric</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
