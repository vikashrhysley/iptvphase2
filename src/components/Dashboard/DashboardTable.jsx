// src/components/Dashboard/DashboardTable.js
import { useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDashboardOverview,
  fetchDashboardRevenue,
  fetchDashboardStats,
} from '../../store/slices/dashboardSlice';
import './DashboardTable.css';
import { ChevronRight, ChevronDown } from "lucide-react"

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
  // device type breakdown
  streaming_stick: 'Streaming Stick',
  phone: 'Phone',
  smart_tv: 'Smart TV',
  android_tv: 'Android TV',
  // plan distribution
  free: 'Free',
  premium: 'Premium',
  trial: 'Trial',
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



// ─── Live Stats sections ──────────────────────────────────────────────────────
// One full-width card per domain. Each card leads with a hero figure (the single
// number that domain is about), a row of context chips, and horizontal bar charts
// for the breakdown. Bars carry the section's own hue — magnitude is encoded by
// length, so one hue is enough — and the status palette (bad/warn) is reserved for
// states that are genuinely negative. Every bar is direct-labelled, so identity and
// value are never carried by color alone.
//
// Bars are scaled per group rather than to the section total: a group like
// "Risk & Blocking" is usually all small numbers, and scaling those against a
// 191-device total would flatten every bar to nothing.
const LIVE_SECTIONS = [
  {
    key: 'app_users',
    label: 'App Users',
    accent: 'var(--accent-secondary)',
    source: 'app_users',
    hero: { label: 'Verified Users', path: 'total_users_ever.verified_users.count' },
    chips: [
      { label: 'Signup 24h', path: 'growth.new_signups_24h' },
      { label: 'Signup 7d', path: 'growth.new_signups_7d' },
    ],
    groups: [
      {
        label: 'Total Traffic Till Date',
        // Part-to-whole: verified + never-verified sum to the lifetime total.
        totalPath: 'total_users_ever.count',
        bars: [
          { label: 'Verified Users', path: 'total_users_ever.verified_users.count', tone: 'good' },
          { label: 'Never Verified', path: 'total_users_ever.never_verified', tone: 'warn' },
        ],
      },
      {
        label: 'Verified Users',
        // Part-to-whole: issued-a-plan + not-issued-a-plan sum to the verified total.
        totalPath: 'total_users_ever.verified_users.count',
        bars: [
          { label: 'Issued A Plan', path: 'total_users_ever.verified_users.issued_a_plan', tone: 'good' },
          { label: 'Not Issued A Plan', path: 'total_users_ever.verified_users.not_issued_a_plan', tone: 'warn' },
        ],
      },
      {
        label: 'Issued A Plan',
        // Part-to-whole: enabled + blocked make up the presently-using users, and adding
        // stopped gives the issued-a-plan total.
        totalPath: 'total_users_ever.verified_users.issued_a_plan.count',
        bars: [
          { label: 'Enabled Users', path: 'total_users_ever.verified_users.issued_a_plan.presently_using.by_account_state.enabled_users', tone: 'good' },
          { label: 'Blocked Users', path: 'total_users_ever.verified_users.issued_a_plan.presently_using.by_account_state.blocked_users', tone: 'bad' },
          { label: 'Stopped Users', path: 'total_users_ever.verified_users.issued_a_plan.stopped_using.count', tone: 'warn' },
        ],
      },
      {
        label: 'Stopped Using',
        // Part-to-whole: plan-expired + payment-failed + deleted sum to the stopped count.
        totalPath: 'total_users_ever.verified_users.issued_a_plan.stopped_using.count',
        bars: [
          { label: 'Plan Expired', path: 'total_users_ever.verified_users.issued_a_plan.stopped_using.plan_expired_users', tone: 'warn' },
          { label: 'Payment Failed', path: 'total_users_ever.verified_users.issued_a_plan.stopped_using.payment_failed_users', tone: 'bad' },
          { label: 'Deleted Users', path: 'total_users_ever.verified_users.issued_a_plan.stopped_using.deleted_users', tone: 'muted' },
        ],
      },
    ],
  },

  {
    key: 'licenses',
    label: 'Licenses',
    accent: 'var(--accent-success)',
    source: 'licenses',
    hero: { label: 'Total Licenses Ever', path: 'total_licenses_ever.count' },
    chips: [
      { label: 'Expiring 48h', path: 'expiring_soon.expiring_48h' },
      { label: 'Expiring 7d', path: 'expiring_soon.expiring_7d' },
      { label: 'Expiring 30d', path: 'expiring_soon.expiring_30d' },
    ],
    groups: [
      {
        label: 'Total Licenses Ever',
        // Part-to-whole: presently held + stopped working sum to the lifetime total.
        totalPath: 'total_licenses_ever.count',
        bars: [
          { label: 'Present Licenses', path: 'total_licenses_ever.presently_held.count', tone: 'good' },
          { label: 'Stopped Working', path: 'total_licenses_ever.stopped_working.count', tone: 'warn' },
        ],
      },
      {
        label: 'Present Licenses',
        // Header shows the present-licenses count; working + blocked sum to it.
        totalPath: 'total_licenses_ever.presently_held.count',
        bars: [
          { label: 'Working Licenses', path: 'total_licenses_ever.presently_held.by_state.working_licenses', tone: 'good' },
          { label: 'Blocked Licenses', path: 'total_licenses_ever.presently_held.by_state.blocked_licenses', tone: 'bad' },
        ],
      },
      {
        label: 'Stopped Working',
        totalPath: 'total_licenses_ever.stopped_working.count',
        bars: [
          { label: 'Plan Expired Licenses', path: 'total_licenses_ever.stopped_working.plan_expired_licenses', tone: 'warn' },
          { label: 'Payment Failed', path: 'total_licenses_ever.stopped_working.payment_failed_licenses', tone: 'bad' },
          { label: 'Deleted Licenses', path: 'total_licenses_ever.deleted_licenses', tone: 'muted' },
        ],
      },
      {
        label: 'Licenses Expiring Soon',
        bars: [
          { label: 'Expiring 48h', path: 'expiring_soon.expiring_48h', tone: 'bad' },
          { label: 'Expiring 7d', path: 'expiring_soon.expiring_7d', tone: 'warn' },
          { label: 'Expiring 30d', path: 'expiring_soon.expiring_30d', tone: 'warn' },
        ],
      },
    ],
  },

  {
    key: 'devices',
    label: 'Devices',
    accent: 'var(--accent-primary)',
    source: 'devices',
    hero: { label: 'Total Devices', path: 'total_devices' },
    chips: [
      { label: 'New 24h', path: 'new_enrollments_24h' },
      { label: 'New 7d', path: 'new_enrollments_7d' },
    ],
    groups: [
      {
        label: 'Connectivity',
        bars: [
          { label: 'Active', path: 'active_devices', tone: 'good' },
          { label: 'Inactive', path: 'inactive_devices', tone: 'muted' },
          { label: 'Never Heartbeat', path: 'never_heartbeat', tone: 'warn' },
          { label: 'Push Enabled', path: 'push_enabled' },
        ],
      },
      {
        label: 'Risk & Blocking',
        bars: [
          { label: 'Blocked (Total)', path: 'total_blocked_devices', tone: 'bad' },
          { label: 'Auto Blocked', path: 'auto_blocked_devices', tone: 'bad' },
          { label: 'Admin Blocked', path: 'admin_blocked_devices', tone: 'bad' },
          { label: 'High Risk', path: 'high_risk_devices', tone: 'warn' },
        ],
      },
    ],
  },

  {
    key: 'admins',
    label: 'Admins',
    accent: 'var(--accent-success)',
    source: 'admins',
    hero: { label: 'Total Admins', path: 'total_admins' },
    groups: [
      {
        label: 'By Role',
        bars: [
          { label: 'Superadmin', path: 'superadmin' },
          { label: 'Admin', path: 'admin' },
          { label: 'Viewer', path: 'viewer' },
        ],
      },
    ],
  },

  {
    key: 'heartbeat',
    label: 'Heartbeat',
    accent: 'var(--accent-warning)',
    source: 'heartbeat',
    hero: { label: 'Success Rate 24h', path: 'success_rate_pct', suffix: '%' },
    chips: [
      { label: 'Total 24h', path: 'total_24h' },
      { label: 'Beats Last Hour', path: 'beats_last_hour' },
      { label: 'Failed Last Hour', path: 'failed_last_hour' },
    ],
    groups: [
      {
        label: 'Last 24 Hours',
        bars: [
          { label: 'Success', path: 'success_24h', tone: 'good' },
          { label: 'Failed', path: 'failed_24h', tone: 'bad' },
          { label: 'Blocked', path: 'blocked_24h', tone: 'bad' },
          { label: 'Expired', path: 'expired_24h', tone: 'warn' },
          { label: 'Risky Active Devices', path: 'risky_active_devices', tone: 'warn' },
        ],
      },
    ],
  },

  {
    key: 'billing',
    // Reads `payments`, which is a strict superset of `billing` in this API — same
    // six fields plus all-time revenue and all-time failed payments. Falls back to
    // `billing` so the card still fills if only that block is returned.
    label: 'Billing',
    accent: 'var(--accent-secondary)',
    source: 'payments',
    fallbackSource: 'billing',
    hero: { label: 'Revenue 30d', path: 'revenue_30d_display' },
    chips: [
      { label: 'Revenue All Time', path: 'total_revenue_display' },
      { label: 'Active Subscriptions', path: 'active_subscriptions' },
    ],
    groups: [
      {
        label: 'Subscription Health',
        bars: [
          { label: 'Active Subscriptions', path: 'active_subscriptions', tone: 'good' },
          { label: 'Past Due', path: 'past_due_subscriptions', tone: 'warn' },
          { label: 'Cancelled 30d', path: 'cancelled_30d', tone: 'muted' },
        ],
      },
      {
        label: 'Payment Failures',
        bars: [
          { label: 'Failed 7d', path: 'failed_payments_7d', tone: 'bad' },
          { label: 'Failed All Time', path: 'failed_payments', tone: 'bad' },
        ],
      },
    ],
  },

  {
    key: 'audit',
    label: 'Audit',
    accent: '#94a3b8',
    source: 'audit',
    hero: { label: 'Warning Events 24h', path: 'warning_events_24h' },
    groups: [
      {
        label: 'Events (24h)',
        bars: [
          { label: 'Critical', path: 'critical_events_24h', tone: 'bad' },
          { label: 'Warning', path: 'warning_events_24h', tone: 'warn' },
        ],
      },
    ],
  },
];

// Resolves every configured path against the API payload once, so the render layer
// only deals with plain numbers and never re-walks the response.
export const buildLiveSections = (stats, overview) => (
  LIVE_SECTIONS.map(section => {
    const source = getNestedValue(stats, section.source)
      || (section.fallbackSource && getNestedValue(stats, section.fallbackSource))
      || getNestedValue(overview, section.source)
      || {};

    const read = (path) => metricValue(getNestedValue(source, path));

    const groups = (section.groups || []).map(group => {
      const bars = group.bars.map(bar => ({
        label: bar.label,
        tone: bar.tone || 'accent',
        value: numericValue(read(bar.path)) ?? 0,
      }));
      // A group with a totalPath is part-to-whole: bars scale against that total and
      // the header states it plainly. Without one, bars scale to the largest bar and
      // the header says "peak N", so a scale max is never mistaken for a total.
      const total = group.totalPath ? numericValue(read(group.totalPath)) : null;

      return { ...group, bars, total, max: total ?? Math.max(...bars.map(b => b.value), 0) };
    });

    return {
      ...section,
      hero: { ...section.hero, value: read(section.hero.path) },
      chips: (section.chips || []).map(chip => ({ ...chip, value: read(chip.path) })),
      groups,
    };
  })
);

// Flattens sections back into the { label, rows } shape the PDF/Excel exporters expect.
const sectionsToExportCards = (sections) => (
  sections.map(section => ({
    label: section.label,
    rows: [
      { label: section.hero.label, value: section.hero.value, suffix: section.hero.suffix },
      ...section.chips.map(chip => ({ label: chip.label, value: chip.value })),
      ...section.groups.flatMap(group =>
        group.bars.map(bar => ({ label: `${group.label} — ${bar.label}`, value: bar.value }))
      ),
    ],
  }))
);

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

// Some backends nest the user/license tree under an `existing_users` / `existing_licenses`
// wrapper and some flatten it away. Config paths are written without the wrapper; when a
// segment isn't found directly, auto-descend through a wrapper that does contain it, so the
// same paths resolve against both the nested and flattened shapes.
const OPTIONAL_WRAPPERS = ['existing_users', 'existing_licenses'];

const getNestedValue = (source, path) => {
  let value = source;
  for (const key of path.split('.')) {
    if (value == null) return undefined;
    if (value[key] === undefined) {
      const wrapper = OPTIONAL_WRAPPERS.find(w => value[w] && value[w][key] !== undefined);
      if (wrapper) value = value[wrapper];
    }
    value = value?.[key];
  }
  return value;
};

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

// const buildLiveStats = (stats, revenue, overview) => (
//   LIVE_STATS.map(card => {
//     // Platform-style cards: read an entire sub-object as rows
//     if (card.sourceKey) {
//       const source = getNestedValue(stats, card.sourceKey)
//         || getNestedValue(overview, card.sourceKey)
//         || {};

//       const entries = Object.entries(source);
//       const total = entries.reduce((sum, [, v]) => sum + Number(v || 0), 0);

//       const rows = [
//         { label: 'Total', value: total || undefined },
//         ...entries.map(([key, value]) => ({
//           label: formatLabel(key),
//           value: numericValue(value) ?? value,
//         })),
//       ];

//       return { ...card, rows };
//     }

//     const usedKeys = new Set();

//     const rows = card.rows.map((row, index) => {

//       // Handle combined values (example: Enabled / Blocked)
//       if (row.combine) {
//         const values = row.fields.map(field =>
//           metricValue(getNestedValue(stats, field))
//         );

//         row.fields.forEach(field => usedKeys.add(normalizeKey(field)));

//         return {
//           ...row,
//           value: `${values[0] ?? 0} Enabled | ${values[1] ?? 0} Blocked`,
//         };
//       }


//       const statsMatches = row.fields.map(field => ({
//         key: field,
//         value: metricValue(getNestedValue(stats, field)),
//       }));

//       const revenueMatches = (row.revenueFields || []).map(field => ({
//         key: field,
//         value: metricValue(getNestedValue(revenue, field)),
//       }));

//       const fallbackSum = index === 0
//         ? sumMatchingStats(stats, card.includes)
//         : undefined;

//       const matched = [
//         ...revenueMatches,
//         ...statsMatches
//       ].find(
//         item =>
//           item.value !== undefined &&
//           item.value !== null &&
//           item.value !== ''
//       );

//       const value = firstPresent(
//         matched?.value,
//         fallbackSum
//       );

//       [...row.fields, ...(row.revenueFields || [])]
//         .forEach(field => usedKeys.add(normalizeKey(field)));

//       if (matched?.key) {
//         usedKeys.add(normalizeKey(matched.key));
//       }

//       const numeric = numericValue(value);

//       return {
//         ...row,
//         value: numeric !== null && !String(value).includes('$')
//           ? numeric
//           : value,
//       };
//     });


//     if (card.noDynamic) {
//       return { ...card, rows };
//     }


//     const dynamicRows = [
//       ...flattenStats(stats),
//       ...(card.key === 'billing' ? flattenStats(revenue) : []),
//     ]
//       .filter(item => matchesCard(item.key, card))
//       .filter(item => !usedKeys.has(normalizeKey(item.key)))
//       .map(item => {
//         usedKeys.add(normalizeKey(item.key));

//         const numeric = numericValue(item.value);

//         return {
//           label: formatLabel(item.key),
//           value: numeric !== null && !String(item.value).includes('$')
//             ? numeric
//             : item.value,
//         };
//       });


//     return {
//       ...card,
//       rows: [...rows, ...dynamicRows],
//     };
//   })
// );
// live stats, buildLiveStats , statcards

const sumValues = (items) => Object.values(items || {}).reduce((sum, value) => sum + Number(value || 0), 0);
const entriesFromObject = (items) => Object.entries(items || {}).map(([label, value]) => ({ label, value }));

// One horizontal bar. Length is the encoding, the value is always printed, and the
// tone class only ever *reinforces* a label that is already there in text.
function MetricBar({ label, value, max, tone }) {
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="ls-bar-row" title={`${label}: ${value.toLocaleString()}`}>
      <span className="ls-bar-label">{label}</span>
      <div className="ls-bar-track">
        <div className={`ls-bar-fill ls-tone-${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <strong className="ls-bar-value">{value.toLocaleString()}</strong>
    </div>
  );
}

// A full-width Live Stats row: hero figure and chips on the left, bar charts on the right.
export function MetricSectionCard({ section }) {
  const { label, accent, hero, chips, groups } = section;

  return (
    <section className="ls-card" style={{ '--stat-accent': accent }}>
      <header className="ls-card-aside">
        <div className="ls-card-title">
          <span className="ls-dot" />
          {label}
        </div>

        <div className="ls-hero-label">{hero.label}</div>
        <div className="ls-hero-value">{formatMetricValue(hero.value, hero.suffix)}</div>

        {chips.length > 0 && (
          <div className="ls-chips">
            {chips.map(chip => (
              <div className="ls-chip" key={chip.label}>
                <span>{chip.label}</span>
                <strong>{formatValue(chip.value)}</strong>
              </div>
            ))}
          </div>
        )}
      </header>

      <div className="ls-card-charts">
        {groups.map(group => (
          <div className="ls-group" key={group.label}>
            <div className="ls-group-head">
              <span className="ls-group-label">{group.label}</span>
              <span className="ls-group-scale">
                {(group.total != null ? group.total : group.max).toLocaleString()}
              </span>
            </div>

            {group.bars.map(bar => (
              <MetricBar
                key={bar.label}
                label={bar.label}
                value={bar.value}
                max={group.max}
                tone={bar.tone}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
function StatCard({
  label,
  rows,
  accent
}) {


  const primary = rows?.[0];


  return (

    <div

      className="stat-card"

      style={{
        "--stat-accent":
          accent || "var(--accent-primary)"
      }}

    >



      <div className="stat-card-head">


        <div>

          <div className="stat-label">
            {label}
          </div>


          <div className="stat-primary-label">
            {primary?.label || "Total"}
          </div>


        </div>


        <span className="stat-dot" />


      </div>





      <div className="stat-value">

        {
          primary?.value !== undefined
            ?
            formatMetricValue(
              primary.value,
              primary.suffix
            )
            :
            "-"
        }

      </div>

      <div className="stat-fields"  style={{
    maxHeight: "220px",
    overflowY: "auto",
    paddingRight: "6px",
  }}>

  {
    rows?.slice(1).map((row, index) => (

      <div
        key={`${row.label}-${index}`}
        className="stat-field-row"
      >

        <span>
          {row.label}
        </span>


        <strong>
          {
            formatMetricValue(
              row.value,
              row.suffix
            )
          }
        </strong>


      </div>

    ))
  }

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

  // Auto-refresh so changes driven from the end-user side appear without a manual reload.
  // Silent polling (no loading flags) swaps the numbers in place without flicker, and it
  // pauses while the tab is hidden so backgrounded tabs don't keep hitting the API.
  useEffect(() => {
    const REFRESH_MS = 2000;
    let timer = null;
    const poll = () => {
      dispatch(fetchDashboardStats({ silent: true }));
      dispatch(fetchDashboardRevenue({ silent: true }));
      dispatch(fetchDashboardOverview({ silent: true }));
    };
    const start = () => { if (!timer) timer = setInterval(poll, REFRESH_MS); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVisibility = () => {
      if (document.hidden) stop();
      else { poll(); start(); } // refresh immediately on return, then resume
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [dispatch]);

  const liveSections = useMemo(() => buildLiveSections(stats, overview), [stats, overview]);
  const statCards = useMemo(() => sectionsToExportCards(liveSections), [liveSections]);
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
            subtitle={stats?.generated_at
              ? `Core operational counts — generated ${new Date(stats.generated_at).toLocaleString()}`
              : 'Core operational counts from dashboard stats.'}
            loading={loading}
            error={error}
            onExportPDF={() => exportToPDF(statCards)}
            onExportExcel={() => exportToExcel(statCards)}
          />
          {loading && !stats ? (
            <div className="ls-stack">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="ls-card dash-skel-card">
                  <div className="dash-skel-label" />
                  <div className="dash-skel-val" />
                  <div className="dash-skel-row" />
                  <div className="dash-skel-row short" />
                </div>
              ))}
            </div>
          ) : (
            <div className="ls-stack">
              {liveSections.map(section => (
                <MetricSectionCard key={section.key} section={section} />
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
