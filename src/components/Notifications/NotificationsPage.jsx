import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotifications,
  fetchNotificationDetail,
  markNotificationRead,
  markVisibleNotificationsRead,
  fetchNotificationUnreadCount,
  fetchNotificationSummary,
  setNotificationFilters,
  clearNotificationDetail,
  dropReadFromCount,
  removeNotification,
} from '../../store/slices/notificationsSlice';
import './NotificationsPage.css';

const CATEGORIES = ['USER', 'DEVICE', 'LICENSING', 'SUBSCRIPTION', 'RECOVERY', 'SECURITY', 'SYSTEM', 'PAYMENT'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const catLabel = (c) => (c ? c.charAt(0) + c.slice(1).toLowerCase() : c);

const relTime = (iso) => {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtFull = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
};

/* ── Detail modal ────────────────────────────────────────── */
function NotificationDetailModal({ onClose }) {
  const { detail, detailLoading, detailError } = useSelector((s) => s.notifications);
  return (
    <div className="nt-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="nt-modal">
        <div className="nt-modal-head">
          <span>Notification</span>
          <button className="nt-modal-close" onClick={onClose}>✕</button>
        </div>
        {detailLoading ? (
          <div className="nt-empty">Loading…</div>
        ) : detailError ? (
          <div className="nt-error">{detailError}</div>
        ) : !detail ? (
          <div className="nt-empty">No detail.</div>
        ) : (
          <div className="nt-modal-body">
            <div className="nt-modal-badges">
              <span className={`nt-cat cat-${detail.category?.toLowerCase()}`}>{catLabel(detail.category)}</span>
              <span className={`nt-pri pri-${detail.priority?.toLowerCase()}`}>{detail.priority}</span>
            </div>
            <h3 className="nt-modal-title">{detail.title}</h3>
            <p className="nt-modal-msg">{detail.message}</p>
            <div className="nt-modal-meta">
              <div><span>Event</span><strong>{detail.event_type || '—'}</strong></div>
              <div><span>Created</span><strong>{fmtFull(detail.created_at)}</strong></div>
              {detail.related_entity_type && <div><span>Entity</span><strong>{detail.related_entity_type}</strong></div>}
              {detail.related_entity_id && <div><span>Entity ID</span><strong className="nt-mono">{detail.related_entity_id}</strong></div>}
              {detail.target_user_id && <div><span>Target User</span><strong className="nt-mono">{detail.target_user_id}</strong></div>}
            </div>
            {detail.meta && (
              <pre className="nt-modal-json">{JSON.stringify(detail.meta, null, 2)}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const { items, loading, error, page, totalPages, total, filters, unreadCount } = useSelector((s) => s.notifications);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchNotifications(filters));
  }, [dispatch, filters]);

  const setF = (patch) => dispatch(setNotificationFilters({ page: 1, ...patch }));

  const openNotif = (n) => {
    if (!n.is_read) {
      dispatch(markNotificationRead({ id: n.id }));
      // Badge drops after 5s, then the row leaves the list after 10s.
      setTimeout(() => dispatch(dropReadFromCount({ id: n.id, category: n.category })), 5000);
      setTimeout(() => dispatch(removeNotification(n.id)), 10000);
    }
    dispatch(fetchNotificationDetail(n.id));
    setDetailOpen(true);
  };

  const closeDetail = () => { setDetailOpen(false); dispatch(clearNotificationDetail()); };

  // "Mark all read" here = mark only the notifications on THIS page, then refresh the
  // badge/summary from the server so the bell count reflects exactly what was read.
  const markPageRead = async () => {
    try { await dispatch(markVisibleNotificationsRead()).unwrap(); } catch { /* surfaced via error state */ }
    dispatch(fetchNotificationUnreadCount());
    dispatch(fetchNotificationSummary());
  };

  const hasUnreadOnPage = items.some((n) => !n.is_read);

  return (
    <div className="nt-page">
      <div className="nt-header">
        <div>
          <h1 className="nt-title">Notifications</h1>
          <div className="nt-subtitle">
            {total.toLocaleString()} total{unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
          </div>
        </div>
        {hasUnreadOnPage && (
          <button className="nt-markall-btn" onClick={markPageRead}>
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="nt-toolbar">
        <div className="nt-filter">
          <label>Status</label>
          <select className="nt-select" value={filters.is_read} onChange={(e) => setF({ is_read: e.target.value })}>
            <option value="all">All</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
        </div>
        <div className="nt-filter">
          <label>Category</label>
          <select className="nt-select" value={filters.category} onChange={(e) => setF({ category: e.target.value })}>
            <option value="">All</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
          </select>
        </div>
        <div className="nt-filter">
          <label>Priority</label>
          <select className="nt-select" value={filters.priority} onChange={(e) => setF({ priority: e.target.value })}>
            <option value="">All</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      {loading && !items.length ? (
        <div className="nt-empty">Loading notifications…</div>
      ) : error ? (
        <div className="nt-error">{error}</div>
      ) : items.length === 0 ? (
        <div className="nt-empty">No notifications match these filters.</div>
      ) : (
        <div className="nt-list">
          {items.map((n) => (
            <button className={`nt-row${n.is_read ? '' : ' unread'}`} key={n.id} onClick={() => openNotif(n)}>
              <span className={`nt-dot${n.is_read ? ' read' : ''}`} />
              <div className="nt-row-main">
                <div className="nt-row-top">
                  <span className={`nt-cat cat-${n.category?.toLowerCase()}`}>{catLabel(n.category)}</span>
                  <span className={`nt-pri pri-${n.priority?.toLowerCase()}`}>{n.priority}</span>
                  {n.is_archived && <span className="nt-archived">Archived</span>}
                  <span className="nt-time">{relTime(n.created_at)}</span>
                </div>
                <div className="nt-row-title">{n.title}</div>
                <div className="nt-row-msg">{n.message}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="nt-pagination">
          <button disabled={page <= 1} onClick={() => setF({ page: page - 1 })}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setF({ page: page + 1 })}>Next</button>
        </div>
      )}

      {detailOpen && <NotificationDetailModal onClose={closeDetail} />}
    </div>
  );
}
