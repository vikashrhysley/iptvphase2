import './LicenceStatusBars.css';

/*
 * One full-width licence status breakdown, shared by the Dashboard licences card and the top
 * of the Licenses page. Feed it the `total_licenses_ever`-shaped object (count / by_status /
 * presently_held_count / by_plan) plus the `expiring_soon` object — the same four keys arrive
 * from /admin/dashboard/stats, /admin/licenses/stats and /admin/analytics/licenses, so the
 * three surfaces can never disagree.
 *
 * The six by_status buckets sum exactly to `count` — that reconciliation is the whole point,
 * so every bucket is drawn (including zero rows and Cancelled), scaled against the total.
 */

// bucket key → display label · bar tone · the ?status= value the licence list expects.
// The dashboard bucket keys and the list's ?status= vocabulary differ — passing the label
// straight through would 422. `status: null` means the bucket is not filterable at all.
const STATUS_ROWS = [
  { key: 'active_licenses',         label: 'Active',         tone: 'good',  status: 'active' },
  { key: 'blocked_licenses',        label: 'Blocked',        tone: 'bad',   status: 'revoked' },
  { key: 'plan_expired_licenses',   label: 'Plan Expired',   tone: 'muted', status: 'expired' },
  { key: 'payment_failed_licenses', label: 'Payment Failed', tone: 'warn',  status: 'inactive_due_to_payment' },
  { key: 'cancelled_licenses',      label: 'Cancelled',      tone: 'muted', status: 'cancelled' },
  { key: 'deleted_licenses',        label: 'Deleted',        tone: 'muted', status: null,
    tooltip: "Deleted licences aren't listed here — the owning account was deleted." },
];

const num = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// value 0 → empty track; value > 0 → scaled width with a small floor so 1-of-96 stays visible.
function BarRow({ label, value, scale, tone, tooltip, clickable, active, onClick }) {
  const pct = scale > 0 && value > 0 ? (value / scale) * 100 : 0;
  const fill = (
    <div className="lsb-track">
      <div
        className={`lsb-fill lsb-tone-${tone}`}
        style={{ width: `${pct}%`, minWidth: value > 0 ? 3 : 0 }}
      />
    </div>
  );
  const body = (
    <>
      <span className="lsb-label">{label}</span>
      {fill}
      <span className="lsb-value">{value.toLocaleString()}</span>
    </>
  );
  if (clickable) {
    return (
      <button
        type="button"
        className={`lsb-row lsb-row-click${active ? ' active' : ''}`}
        onClick={onClick}
        title={`Filter the list to ${label} licences`}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={`lsb-row${tooltip ? ' lsb-row-muted' : ''}`} title={tooltip || undefined}>
      {body}
    </div>
  );
}

export default function LicenceStatusBars({ stats, expiring, activeStatus, onStatusFilter, showFootnote, showExpiring = true }) {
  const count = num(stats?.count);
  const by    = stats?.by_status || {};
  const exp   = expiring || {};

  const statusRows = STATUS_ROWS.map((r) => ({ ...r, value: num(by[r.key]) }));

  const expiringRows = [
    { label: 'Expiring 48h', value: num(exp.expiring_48h) },
    { label: 'Expiring 7d',  value: num(exp.expiring_7d) },
    { label: 'Expiring 30d', value: num(exp.expiring_30d) },
  ];
  // 48h ⊂ 7d ⊂ 30d — overlapping windows that don't sum to anything, so scale to their own peak.
  const expScale = Math.max(...expiringRows.map((r) => r.value), 0);

  return (
    <div className="lsb-wrap">
      <section className="lsb-card">
        {/* Left rail — label, big total, expiring chips */}
        <aside className="lsb-aside">
          <div className="lsb-aside-title"><span className="lsb-dot" /> Licenses</div>
          <div className="lsb-aside-hero-label">Total Licenses Ever</div>
          <div className="lsb-aside-hero">{count.toLocaleString()}</div>
          <div className="lsb-chips">
            <div className="lsb-chip"><span>48h</span><strong>{num(exp.expiring_48h).toLocaleString()}</strong></div>
            <div className="lsb-chip"><span>7d</span><strong>{num(exp.expiring_7d).toLocaleString()}</strong></div>
            <div className="lsb-chip"><span>30d</span><strong>{num(exp.expiring_30d).toLocaleString()}</strong></div>
            {exp.auto_renew_enabled != null && (
              <div className="lsb-chip"><span>Auto-Renew</span><strong>{num(exp.auto_renew_enabled).toLocaleString()}</strong></div>
            )}
          </div>
        </aside>

        {/* Right body — one full-width status list, then a separated expiring section */}
        <div className="lsb-body">
          <div className="lsb-section-head">
            <span className="lsb-section-label">Total Licenses Ever</span>
            <span className="lsb-section-scale">{count.toLocaleString()}</span>
          </div>
          {statusRows.map((r) => (
            <BarRow
              key={r.key}
              label={r.label}
              value={r.value}
              scale={count}
              tone={r.tone}
              tooltip={r.tooltip}
              clickable={!!onStatusFilter && r.status != null}
              active={activeStatus != null && activeStatus === r.status}
              onClick={() => onStatusFilter && r.status != null && onStatusFilter(r.status)}
            />
          ))}

          {showExpiring && (
            <>
              <div className="lsb-divider" />
              <div className="lsb-section-head">
                <span className="lsb-section-label">Licenses Expiring Soon</span>
                <span className="lsb-section-scale">{expScale.toLocaleString()}</span>
              </div>
              {expiringRows.map((r) => (
                <BarRow key={r.label} label={r.label} value={r.value} scale={expScale} tone="warn" />
              ))}
            </>
          )}
        </div>
      </section>

      {showFootnote && (
        <p className="lsb-footnote">Totals include deleted licences. The list below shows live licences only.</p>
      )}
    </div>
  );
}
