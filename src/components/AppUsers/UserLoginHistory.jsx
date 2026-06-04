import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserLoginHistory, setLoginHistoryFilters, clearLoginHistoryState } from '../../store/slices/appUsersSlice';
import './UserLoginHistory.css';

/* ── Icons ─────────────────────────────────────────────── */
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevLeft = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ChevRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* ── Helpers ────────────────────────────────────────────── */
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

const fmtEvent = (type) =>
  (type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const statusClass = (s) => {
  if (s === 'success') return 'success';
  if (s === 'failure' || s === 'failed') return 'failure';
  if (s === 'blocked') return 'blocked';
  return 'unknown';
};

const eventClass = (type) => {
  if (!type) return 'other';
  if (type.includes('otp'))      return 'otp';
  if (type.includes('password')) return 'password';
  if (type.includes('refresh'))  return 'refresh';
  if (type.includes('logout'))   return 'logout';
  return 'other';
};

/* ── Pagination ─────────────────────────────────────────── */
function Pagination({ current, totalPages, totalItems, pageSize, onPage }) {
  if (!totalItems) return null;
  const start = (current - 1) * pageSize + 1;
  const end   = Math.min(current * pageSize, totalItems);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - current) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push(`e${p}`);
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="lh-pagination">
      <span className="lh-dp-info">
        Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{totalItems}</strong> events
      </span>
      <div className="lh-dp-controls">
        <button className="lh-dp-nav" onClick={() => onPage(Math.max(1, current - 1))} disabled={current === 1}>
          <ChevLeft /> Prev
        </button>
        <div className="lh-dp-pages">
          {pages.map(p =>
            typeof p === 'string'
              ? <span key={p} className="lh-dp-ellipsis">…</span>
              : <button key={p} className={`lh-dp-page${p === current ? ' active' : ''}`} onClick={() => onPage(p)}>{p}</button>
          )}
        </div>
        <button className="lh-dp-nav" onClick={() => onPage(Math.min(totalPages, current + 1))} disabled={current === totalPages}>
          Next <ChevRight />
        </button>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────── */
export default function UserLoginHistory({ userId, userName, userEmail, onBack }) {
  const dispatch = useDispatch();
  const {
    loginHistoryItems, loginHistoryTotal, loginHistoryPage, loginHistoryPageSize,
    loginHistoryLoading, loginHistoryError, loginHistoryFilters,
  } = useSelector((s) => s.appUsers);

  const totalPages = Math.max(1, Math.ceil(loginHistoryTotal / (loginHistoryPageSize || 1)));

  useEffect(() => {
    const params = {};
    if (loginHistoryFilters.status !== 'all') params.status = loginHistoryFilters.status;
    params.page      = loginHistoryFilters.page;
    params.page_size = loginHistoryFilters.page_size;
    dispatch(fetchUserLoginHistory({ userId, params }));
  }, [dispatch, userId, loginHistoryFilters.status, loginHistoryFilters.page, loginHistoryFilters.page_size]);

  useEffect(() => () => dispatch(clearLoginHistoryState()), [dispatch]);

  return (
    <div className="lh-page">
      {/* Top bar */}
      <div className="lh-topbar">
        <button className="lh-back-btn" onClick={onBack}>
          <BackIcon /> Back to Profile
        </button>
        <div className="lh-breadcrumb">
          <span>{userName || userEmail}</span>
          <span className="lh-bc-sep">/</span>
          <span className="lh-bc-active">Login History</span>
        </div>
      </div>

      <div className="lh-header">
        <h1 className="lh-title">Login History</h1>
        <div className="lh-subtitle">Paginated login event history including OTP attempts, failures, and locations.</div>
      </div>

      {/* Toolbar */}
      <div className="lh-toolbar">
        <div className="lh-filter">
          <label>Status</label>
          <select className="lh-select" value={loginHistoryFilters.status}
            onChange={(e) => dispatch(setLoginHistoryFilters({ status: e.target.value, page: 1 }))}>
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        {loginHistoryFilters.status !== 'all' && (
          <button className="lh-clear-btn" onClick={() => dispatch(clearLoginHistoryState())}>
            Clear Filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="lh-table-wrap">
        {loginHistoryLoading ? (
          <div className="lh-loading">Loading login history…</div>
        ) : loginHistoryError ? (
          <div className="lh-error">{loginHistoryError}</div>
        ) : (
          <div className="lh-table-scroll">
            <table className="lh-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>Country</th>
                  <th>Device</th>
                  <th>Failure Reason</th>
                </tr>
              </thead>
              <tbody>
                {loginHistoryItems.length ? (
                  loginHistoryItems.map((row) => (
                    <tr key={row.id}>
                      <td className="lh-date">{fmtDateTime(row.created_at)}</td>
                      <td>
                        <span className={`lh-event-pill ${eventClass(row.event_type)}`}>
                          {fmtEvent(row.event_type)}
                        </span>
                      </td>
                      <td>
                        <span className={`lh-status-pill ${statusClass(row.status)}`}>
                          {row.status || '—'}
                        </span>
                      </td>
                      <td className="lh-ip">{row.ip_address || '—'}</td>
                      <td>
                        {row.country
                          ? <span className="lh-country">{row.country}</span>
                          : '—'}
                      </td>
                      <td className="lh-agent" title={row.user_agent}>
                        {row.user_agent || '—'}
                      </td>
                      <td className="lh-failure">
                        {row.failure_reason
                          ? <span className="lh-failure-text">{row.failure_reason}</span>
                          : <span className="lh-none">—</span>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="lh-empty">No login history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loginHistoryLoading && !loginHistoryError && (
          <Pagination
            current={loginHistoryPage}
            totalPages={totalPages}
            totalItems={loginHistoryTotal}
            pageSize={loginHistoryPageSize}
            onPage={(p) => dispatch(setLoginHistoryFilters({ page: p }))}
          />
        )}
      </div>
    </div>
  );
}
