import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotificationUserGroups,
  fetchNotificationUserHistory,
  fetchNotificationDetail,
  markNotificationRead,
  markUserNotificationsRead,
  fetchNotificationUnreadCount,
  fetchNotificationSummaryByUser,
  setActiveNotificationUser,
  setUserHistoryFilters,
  setUserGroupsIncludeArchived,
  clearNotificationDetail,
  dropReadFromCount,
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

const avatarChar = (u) => {
  const s = (u?.full_name || u?.email || '').trim();
  return s ? s.charAt(0).toUpperCase() : '?';
};

const BackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

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

/* ── Level 1: user-grouped list ──────────────────────────── */
function UserGroupsView() {
  const dispatch = useDispatch();
  const {
    userGroups, userGroupsLoading, userGroupsError,
    userGroupsTotal, userGroupsTotalPages, userGroupsIncludeArchived,
  } = useSelector((s) => s.notifications);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchNotificationUserGroups({ page, page_size: 20, include_archived: userGroupsIncludeArchived }));
  }, [dispatch, page, userGroupsIncludeArchived]);

  const openUser = (g) => dispatch(setActiveNotificationUser({
    user_id: g.user_id, email: g.email, full_name: g.full_name,
  }));

  return (
    <div className="nt-page">
      <div className="nt-header">
        <div>
          <h1 className="nt-title">Notifications</h1>
          <div className="nt-subtitle">
            {userGroupsTotal.toLocaleString()} {userGroupsTotal === 1 ? 'user' : 'users'} with activity
          </div>
        </div>
      </div>

      {userGroupsLoading && !userGroups.length ? (
        <div className="nt-empty">Loading…</div>
      ) : userGroupsError ? (
        <div className="nt-error">{userGroupsError}</div>
      ) : userGroups.length === 0 ? (
        <div className="nt-empty">No notification activity yet.</div>
      ) : (
        <div className="nt-list">
          {userGroups.map((g) => (
            <button
              className={`nt-row${(g.unread_count ?? 0) > 0 ? ' unread' : ''}`}
              key={g.user_id}
              onClick={() => openUser(g)}
            >
              <span className="nt-user-avatar">{avatarChar(g)}</span>
              <div className="nt-row-main">
                <div className="nt-row-top">
                  <span className="nt-user-name">{g.full_name || g.email}</span>
                  {g.last_category && <span className={`nt-cat cat-${g.last_category?.toLowerCase()}`}>{catLabel(g.last_category)}</span>}
                  {g.last_priority && <span className={`nt-pri pri-${g.last_priority?.toLowerCase()}`}>{g.last_priority}</span>}
                  <span className="nt-time">{relTime(g.last_created_at)}</span>
                </div>
                <div className="nt-row-title">{g.last_title || '—'}</div>
                <div className="nt-row-msg">{g.last_message || ''}</div>
              </div>
              <div className="nt-user-counts">
                {(g.unread_count ?? 0) > 0 && <span className="nt-user-unread">{g.unread_count} unread</span>}
                <span className="nt-user-total">{g.total_count ?? 0} total</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {userGroupsTotalPages > 1 && (
        <div className="nt-pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span>Page {page} of {userGroupsTotalPages}</span>
          <button disabled={page >= userGroupsTotalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

/* ── Level 2: one user's history ─────────────────────────── */
function UserHistoryView() {
  const dispatch = useDispatch();
  const {
    activeUser, userHistory, userHistoryLoading, userHistoryError,
    userHistoryFilters, userHistoryPage, userHistoryTotalPages, userHistoryTotal,
  } = useSelector((s) => s.notifications);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchNotificationUserHistory({ userId: activeUser.user_id, params: userHistoryFilters }));
  }, [dispatch, activeUser.user_id, userHistoryFilters]);

  const setHF = (patch) => dispatch(setUserHistoryFilters({ page: 1, ...patch }));

  const openNotif = (n) => {
    if (!n.is_read) {
      dispatch(markNotificationRead({ id: n.id }));
      // Badge drops after 5s (row stays visible in the history view).
      setTimeout(() => dispatch(dropReadFromCount({ id: n.id, category: n.category })), 5000);
    }
    dispatch(fetchNotificationDetail(n.id));
    setDetailOpen(true);
  };

  const closeDetail = () => { setDetailOpen(false); dispatch(clearNotificationDetail()); };

  // Per-user "Mark all read" → users/{id}/read-all (scoped to the active category filter if any),
  // then refetch this user's history + the badge + the bell so everything matches server truth.
  const markUserRead = async () => {
    const category = userHistoryFilters.category || undefined;
    try {
      await dispatch(markUserNotificationsRead({ userId: activeUser.user_id, category })).unwrap();
    } catch { /* surfaced via error state */ }
    dispatch(fetchNotificationUserHistory({ userId: activeUser.user_id, params: userHistoryFilters }));
    dispatch(fetchNotificationUnreadCount());
    dispatch(fetchNotificationSummaryByUser());
  };

  const hasUnread = userHistory.some((n) => !n.is_read);

  return (
    <div className="nt-page">
      <div className="nt-header">
        <div className="nt-head-user">
          <button className="nt-back" onClick={() => dispatch(setActiveNotificationUser(null))}>
            <BackIcon /> All users
          </button>
          <div>
            <h1 className="nt-title">{activeUser.full_name || activeUser.email}</h1>
            <div className="nt-subtitle">
              {activeUser.email}
              {userHistoryTotal ? ` · ${userHistoryTotal.toLocaleString()} notification${userHistoryTotal === 1 ? '' : 's'}` : ''}
            </div>
          </div>
        </div>
        {hasUnread && (
          <button className="nt-markall-btn" onClick={markUserRead}>
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {userHistoryLoading && !userHistory.length ? (
        <div className="nt-empty">Loading notifications…</div>
      ) : userHistoryError ? (
        <div className="nt-error">{userHistoryError}</div>
      ) : userHistory.length === 0 ? (
        <div className="nt-empty">No notifications for this user.</div>
      ) : (
        <div className="nt-list">
          {userHistory.map((n) => (
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
      {userHistoryTotalPages > 1 && (
        <div className="nt-pagination">
          <button disabled={userHistoryPage <= 1} onClick={() => dispatch(setUserHistoryFilters({ page: userHistoryPage - 1 }))}>Prev</button>
          <span>Page {userHistoryPage} of {userHistoryTotalPages}</span>
          <button disabled={userHistoryPage >= userHistoryTotalPages} onClick={() => dispatch(setUserHistoryFilters({ page: userHistoryPage + 1 }))}>Next</button>
        </div>
      )}

      {detailOpen && <NotificationDetailModal onClose={closeDetail} />}
    </div>
  );
}

export default function NotificationsPage() {
  const activeUser = useSelector((s) => s.notifications.activeUser);
  return activeUser ? <UserHistoryView /> : <UserGroupsView />;
}
