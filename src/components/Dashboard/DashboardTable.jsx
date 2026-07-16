// src/components/Dashboard/DashboardTable.js
import { useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDashboardOverview,
  fetchDashboardRevenue,
  fetchDashboardStats,
} from '../../store/slices/dashboardSlice';
import './DashboardTable.css';

// ─── Export helpers ───────────────────────────────────────────────────────────
const buildRevenueExportRows = (revenueCards, topPlan) => {
  const rows = revenueCards.map(c => [c.label, c.value !== undefined && c.value !== null ? String(c.value) : '-', c.sub || '']);
  if (topPlan) rows.push(['Top Plan by Revenue', String(topPlan), '']);
  return rows;
};

const exportRevenueToExcel = (revenueCards, topPlan) => {
  import('xlsx').then(({ utils, writeFile }) => {
    const wb = utils.book_new();
    const rows = [['Metric', 'Value', 'Period'], ...buildRevenueExportRows(revenueCards, topPlan)];
    const ws = utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 20 }];
    utils.book_append_sheet(wb, ws, 'Revenue Analytics');
    writeFile(wb, `revenue-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
};

const exportRevenueToPDF = async (revenueCards, topPlan) => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFontSize(16);
  doc.setTextColor(30, 30, 60);
  doc.text('Revenue Analytics Report', pageW / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, y + 3, { align: 'center' });
  y += 12;

  const rows = buildRevenueExportRows(revenueCards, topPlan);

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value', 'Period']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [30, 30, 60], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 80] },
    alternateRowStyles: { fillColor: [245, 246, 250] },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 55 }, 2: { cellWidth: 45 } },
    margin: { left: 14, right: 14 },
  });

  doc.save(`revenue-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
};

const exportToExcel = (statCards) => {
  import('xlsx').then(({ utils, writeFile }) => {
    const wb = utils.book_new();
    statCards.forEach(card => {
      const rows = [['Metric', 'Value']];
      (card.rows || []).forEach(row => {
        const val = row.value !== undefined && row.value !== null ? row.value : '-';
        rows.push([row.label, val]);
      });
      const ws = utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 28 }, { wch: 18 }];
      utils.book_append_sheet(wb, ws, card.label.slice(0, 31));
    });
    writeFile(wb, `live-stats-${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
};

const exportToPDF = async (statCards) => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFontSize(16);
  doc.setTextColor(30, 30, 60);
  doc.text('Live Stats Report', pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, y + 4, { align: 'center' });
  y += 14;

  statCards.forEach((card, idx) => {
    if (y > 240) { doc.addPage(); y = 14; }
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 80);
    doc.text(card.label, 14, y);
    y += 4;

    const rows = (card.rows || []).map(row => [
      row.label,
      row.value !== undefined && row.value !== null ? String(row.value) : '-',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [30, 30, 60], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 80] },
      alternateRowStyles: { fillColor: [245, 246, 250] },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 50 } },
      margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + (idx < statCards.length - 1 ? 8 : 4);
  });

  doc.save(`live-stats-${new Date().toISOString().slice(0, 10)}.pdf`);
};

const LABELS = {
  // device stats
  total: 'Total',
  active: 'Active',
  inactive: 'Inactive',
  blocked: 'Blocked',
  // auxiliary stats
  current_sessions: 'Current Sessions',
  high_risk: 'High Risk',
  expiring_licenses_7d: 'Expiring Licenses (7d)',
  push_enabled: 'Push Enabled',
  // platform breakdown
  roku: 'Roku',
  android: 'Android',
  tizen: 'Tizen',
  ios: 'iOS',
  windows: 'Windows',
  web: 'Web',
  // licenses
  active_licenses: 'Active Licenses',
  expired_licenses: 'Expired Licenses',
  expiring_soon: 'Expiring Soon',
  revoked_licenses: 'Revoked Licenses',
  total_licenses: 'Total Licenses',
  trial_licenses: 'Trial Licenses',
  // users
  admin_users: 'Admin Users',
  superadmin_users: 'Super Admins',
  total_users: 'Total Users',
};

const LIVE_STATS = [
   {
    key: 'app_users',
    label: 'App Users',
    accent: 'var(--accent-secondary)',
    rows: [
      {
        label: 'Registered Users (Till Now)',
        fields: ['app_users.registered_users']
      },
      {
        label: 'Present Users',
        fields: ['app_users.total_present_users.count']
      },
      {
        label: 'Enabled / Blocked',
        fields: [
          'app_users.total_present_users.enabled_users',
          'app_users.total_present_users.blocked_users'
        ],
        combine: true
      },
      {
        label: 'Trial Users',
        fields: ['app_users.trial_users']
      },
       {
        label: 'Paid Users',
        fields: ['app_users.paid_users']
      },
       {
        label: 'Inactive Due To Payment Users',
        fields: ['app_users.inactive_due_to_payment_users']
      },
       {
        label: 'Unsubscribed Users',
        fields: ['app_users.unsubscribed_users']
      },
       {
        label: 'Never Subscribed Users',
        fields: ['app_users.never_subscribed_users']
      },
      {
        label: 'New Signups 24h',
        fields: ['app_users.new_signups_24h']
      },
      {
        label: 'New Signups 7d',
        fields: ['app_users.new_signups_7d']
      },
    ],
  },
  {
    key: 'licenses',
    label: 'Licenses',
    accent: 'var(--accent-success)',
    noDynamic: true,
    rows: [
      { label: 'Total', fields: ['licenses.total_licenses', 'total_licenses'] },
      { label: 'Active', fields: ['licenses.active_licenses', 'active_licenses'] },
      { label: 'Expired', fields: ['licenses.expired_licenses', 'expired_licenses'] },
      { label: 'Revoked', fields: ['licenses.revoked_licenses', 'revoked_licenses'] },
      { label: 'Expiring 48h', fields: ['licenses.expiring_48h', 'expiring_48h'] },
      { label: 'Expiring 7d', fields: ['licenses.expiring_7d', 'expiring_7d'] },
      { label: 'Expiring 30d', fields: ['licenses.expiring_30d', 'expiring_30d'] },
    ],
  },
  {
    key: 'device_stats',
    label: 'Device Stats',
    accent: 'var(--accent-primary)',
    noDynamic: true,
    rows: [
      { label: 'Total', fields: ['devices.total_devices', 'stats.total', 'total_devices'] },
      { label: 'Active', fields: ['devices.active_devices', 'stats.active', 'active_devices'] },
      { label: 'Inactive', fields: ['devices.inactive_devices', 'stats.inactive', 'inactive_devices'] },
      { label: 'Total Blocked Devices (Auto+Admin)', fields: ['devices.total_blocked_devices', 'stats.blocked', 'total_blocked_devices', 'blocked_devices'] },
      { label: 'Auto Blocked', fields: ['devices.auto_blocked_devices', 'auto_blocked_devices'] },
      { label: 'Admin Blocked', fields: ['devices.admin_blocked_devices', 'admin_blocked_devices'] },
      { label: 'High Risk', fields: ['devices.high_risk_devices', 'high_risk_devices'] },
      { label: 'New (24h)', fields: ['devices.new_enrollments_24h', 'new_enrollments_24h'] },
      { label: 'New (7d)', fields: ['devices.new_enrollments_7d', 'new_enrollments_7d'] },
      { label: 'Never Heartbeat', fields: ['devices.never_heartbeat', 'never_heartbeat'] },
      { label: 'Push Enabled', fields: ['devices.push_enabled', 'push_enabled'] },
    ],
  },
  {
    key: 'admins',
    label: 'Admin',
    accent: 'var(--accent-success)',
    noDynamic: true,
    rows: [
      { label: 'Total Admin', fields: ['admins.total_admins', 'total_admins'] },
      { label: 'Viewer', fields: ['admins.viewer', 'viewer'] },
      { label: 'Admin', fields: ['admins.admin', 'admin'] },
      { label: 'Superadmin', fields: ['admins.superadmin', 'superadmin'] },
    ],
  },
  // {
  //   key: 'users',
  //   label: 'Users',
  //   accent: 'var(--accent-secondary)',
  //   rows: [
  //     { label: 'Total', fields: ['total_users', 'users_total', 'user_count', 'users'] },
  //     { label: 'Admin', fields: ['admin_users', 'users.admin', 'roles.admin'] },
  //     { label: 'Super Admin', fields: ['superadmin_users', 'super_admin_users', 'users.superadmin', 'roles.superadmin'] },
  //     { label: 'Viewer', fields: ['viewer_users', 'users.viewer', 'roles.viewer'] },
  //   ],
  //   includes: ['user', 'admin', 'viewer'],
  //   excludes: ['device_user'],
  // },
 
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

const buildLiveStats = (stats, revenue, overview) => (
  LIVE_STATS.map(card => {
    // Platform-style cards: read an entire sub-object as rows
    if (card.sourceKey) {
      const source = getNestedValue(stats, card.sourceKey)
        || getNestedValue(overview, card.sourceKey)
        || {};

      const entries = Object.entries(source);
      const total = entries.reduce((sum, [, v]) => sum + Number(v || 0), 0);

      const rows = [
        { label: 'Total', value: total || undefined },
        ...entries.map(([key, value]) => ({
          label: formatLabel(key),
          value: numericValue(value) ?? value,
        })),
      ];

      return { ...card, rows };
    }

    const usedKeys = new Set();

    const rows = card.rows.map((row, index) => {

      // Handle combined values (example: Enabled / Blocked)
      if (row.combine) {
        const values = row.fields.map(field =>
          metricValue(getNestedValue(stats, field))
        );

        row.fields.forEach(field => usedKeys.add(normalizeKey(field)));

        return {
          ...row,
          value: `${values[0] ?? 0} Enabled | ${values[1] ?? 0} Blocked`,
        };
      }


      const statsMatches = row.fields.map(field => ({
        key: field,
        value: metricValue(getNestedValue(stats, field)),
      }));

      const revenueMatches = (row.revenueFields || []).map(field => ({
        key: field,
        value: metricValue(getNestedValue(revenue, field)),
      }));

      const fallbackSum = index === 0
        ? sumMatchingStats(stats, card.includes)
        : undefined;

      const matched = [
        ...revenueMatches,
        ...statsMatches
      ].find(
        item =>
          item.value !== undefined &&
          item.value !== null &&
          item.value !== ''
      );

      const value = firstPresent(
        matched?.value,
        fallbackSum
      );

      [...row.fields, ...(row.revenueFields || [])]
        .forEach(field => usedKeys.add(normalizeKey(field)));

      if (matched?.key) {
        usedKeys.add(normalizeKey(matched.key));
      }

      const numeric = numericValue(value);

      return {
        ...row,
        value: numeric !== null && !String(value).includes('$')
          ? numeric
          : value,
      };
    });


    if (card.noDynamic) {
      return { ...card, rows };
    }


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
          value: numeric !== null && !String(item.value).includes('$')
            ? numeric
            : item.value,
        };
      });


    return {
      ...card,
      rows: [...rows, ...dynamicRows],
    };
  })
);

const sumValues = (items) => Object.values(items || {}).reduce((sum, value) => sum + Number(value || 0), 0);
const entriesFromObject = (items) => Object.entries(items || {}).map(([label, value]) => ({ label, value }));

function StatCard({ label, rows, accent }) {
  const primary = rows?.[0];
  console.log(8777, rows, label, accent)
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

function ExportButton({ onExportPDF, onExportExcel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="dash-export-wrap" ref={ref}>
      <button className="dash-export-btn" onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="dash-export-menu">
          <button onClick={() => { onExportPDF(); setOpen(false); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            Export as PDF
          </button>
          <button onClick={() => { onExportExcel(); setOpen(false); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
            Export as Excel
          </button>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle, loading, error, onExportPDF, onExportExcel }) {
  return (
    <div className="dash-section-head">
      <div>
        <div className="dash-section-title">{title}</div>
        <div className="dash-section-subtitle">{loading ? 'Loading...' : error || subtitle}</div>
      </div>
      {onExportPDF && <ExportButton onExportPDF={onExportPDF} onExportExcel={onExportExcel} />}
    </div>
  );
}

function BreakdownCard({ title, items, labelSuffix = '' }) {
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
                <span>{formatLabel(item.label)}{labelSuffix}</span>
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
    dispatch(fetchDashboardRevenue());
    dispatch(fetchDashboardOverview());
  }, [dispatch]);

  useEffect(() => {
    if (activeDashboardTab === 'overview') {
      dispatch(fetchDashboardOverview());
    }
  }, [activeDashboardTab, dispatch]);

  const statCards = useMemo(() => buildLiveStats(stats, revenue, overview), [stats, revenue, overview]);
  const revenueCards = REVENUE_CARDS.map(card => ({
    ...card,
    value: revenue?.[card.value],
  }));

  return (
    <div className="dashboard-content">
      {activeDashboardTab === 'liveStats' && (
        <div className="dash-tab-panel">
          <SectionHeader
            title="Live Stats"
            subtitle="Core operational counts from dashboard stats."
            loading={loading}
            error={error}
            onExportPDF={() => exportToPDF(statCards)}
            onExportExcel={() => exportToExcel(statCards)}
          />
          {loading && !stats ? (
            <div className="dashboard-stats">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="stat-card dash-skel-card">
                  <div className="dash-skel-label" />
                  <div className="dash-skel-val" />
                  <div className="dash-skel-row" />
                  <div className="dash-skel-row short" />
                </div>
              ))}
            </div>
          ) : (
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
                <BreakdownCard title="Platform Breakdown By Device" items={entriesFromObject(overview?.platform_breakdown)} labelSuffix=" Device" />
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
          <SectionHeader
            title="Revenue Analytics"
            subtitle="30-day revenue, MRR, refunds, failures, and subscription movement."
            loading={revenueLoading}
            error={revenueError}
            onExportPDF={() => exportRevenueToPDF(revenueCards, revenue?.top_plan_by_revenue)}
            onExportExcel={() => exportRevenueToExcel(revenueCards, revenue?.top_plan_by_revenue)}
          />
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
