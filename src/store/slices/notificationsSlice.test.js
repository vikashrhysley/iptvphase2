import { describe, it, expect } from 'vitest';
import reducer, {
  setNotificationFilters,
  clearNotificationDetail,
  dropReadFromCount,
  removeNotification,
  fetchNotifications,
  fetchNotificationSummary,
  fetchNotificationUnreadCount,
  fetchNotificationDetail,
  markNotificationRead,
  markVisibleNotificationsRead,
  markAllNotificationsRead,
  setActiveNotificationUser,
  setUserHistoryFilters,
  fetchNotificationSummaryByUser,
  fetchNotificationUserGroups,
  fetchNotificationUserHistory,
  markUserNotificationsRead,
} from './notificationsSlice';

// Fresh initial state from the reducer, seeded for a test.
const seed = (over = {}) => ({ ...reducer(undefined, { type: '@@INIT' }), ...over });
const act = (thunk, phase, payload, arg) => ({
  type: thunk[phase].type, payload, meta: { arg },
});

describe('notificationsSlice — functionality (15 cases)', () => {
  // ── read + deferred badge drop ──────────────────────────
  it('1. markNotificationRead sets is_read + queues pending, badge unchanged', () => {
    let s = seed({ unreadCount: 5, items: [{ id: 'a', category: 'DEVICE', is_read: false }] });
    s = reducer(s, act(markNotificationRead, 'fulfilled', { id: 'a', already_read: false }, { id: 'a' }));
    expect(s.items[0].is_read).toBe(true);
    expect(s.pendingReadIds).toContain('a');
    expect(s.unreadCount).toBe(5);
  });

  it('2. markNotificationRead does NOT queue pending when already_read (idempotent)', () => {
    let s = seed({ unreadCount: 5, items: [{ id: 'a', category: 'DEVICE', is_read: false }] });
    s = reducer(s, act(markNotificationRead, 'fulfilled', { id: 'a', already_read: true }, { id: 'a' }));
    expect(s.items[0].is_read).toBe(true);
    expect(s.pendingReadIds).not.toContain('a');
  });

  it('3. dropReadFromCount decrements badge + category summary exactly once', () => {
    let s = seed({ unreadCount: 5, pendingReadIds: ['a'], summary: { totalUnread: 5, byCategory: [{ category: 'DEVICE', unread_count: 3 }] } });
    s = reducer(s, dropReadFromCount({ id: 'a', category: 'DEVICE' }));
    expect(s.unreadCount).toBe(4);
    expect(s.summary.totalUnread).toBe(4);
    expect(s.summary.byCategory[0].unread_count).toBe(2);
  });

  it('4. dropReadFromCount is a no-op when the id is not pending', () => {
    let s = seed({ unreadCount: 4, pendingReadIds: [] });
    s = reducer(s, dropReadFromCount({ id: 'a', category: 'DEVICE' }));
    expect(s.unreadCount).toBe(4);
  });

  it('5. poll (unread-count) sets badge + clears pending → prevents double-count', () => {
    let s = seed({ unreadCount: 5, pendingReadIds: ['a'] });
    s = reducer(s, act(fetchNotificationUnreadCount, 'fulfilled', 4));
    expect(s.unreadCount).toBe(4);
    expect(s.pendingReadIds).toEqual([]);
    s = reducer(s, dropReadFromCount({ id: 'a', category: 'DEVICE' }));
    expect(s.unreadCount).toBe(4);
  });

  // ── list ────────────────────────────────────────────────
  it('6. fetchNotifications.pending sets loading + clears error', () => {
    let s = seed({ error: 'boom' });
    s = reducer(s, act(fetchNotifications, 'pending'));
    expect(s.loading).toBe(true);
    expect(s.error).toBeNull();
  });

  it('7. fetchNotifications.fulfilled stores items + pagination', () => {
    let s = seed();
    s = reducer(s, act(fetchNotifications, 'fulfilled', { items: [{ id: 'a' }, { id: 'b' }], page: 2, pageSize: 20, total: 41, totalPages: 3 }));
    expect(s.loading).toBe(false);
    expect(s.items).toHaveLength(2);
    expect(s.page).toBe(2);
    expect(s.total).toBe(41);
    expect(s.totalPages).toBe(3);
  });

  it('8. fetchNotifications.rejected surfaces the error', () => {
    let s = seed({ loading: true });
    s = reducer(s, act(fetchNotifications, 'rejected', undefined, undefined));
    s = reducer(s, { type: fetchNotifications.rejected.type, payload: 'Server error' });
    expect(s.loading).toBe(false);
    expect(s.error).toBe('Server error');
  });

  // ── summary ─────────────────────────────────────────────
  it('9. fetchNotificationSummary toggles loading and stores the breakdown', () => {
    let s = seed();
    s = reducer(s, act(fetchNotificationSummary, 'pending'));
    expect(s.summaryLoading).toBe(true);
    s = reducer(s, act(fetchNotificationSummary, 'fulfilled', { totalUnread: 7, byCategory: [{ category: 'USER', unread_count: 7 }] }));
    expect(s.summaryLoading).toBe(false);
    expect(s.summary.totalUnread).toBe(7);
    expect(s.summary.byCategory[0].category).toBe('USER');
  });

  // ── detail ──────────────────────────────────────────────
  it('10. fetchNotificationDetail.fulfilled stores the detail object', () => {
    let s = seed();
    s = reducer(s, act(fetchNotificationDetail, 'fulfilled', { id: 'a', title: 'License Expired' }));
    expect(s.detailLoading).toBe(false);
    expect(s.detail.title).toBe('License Expired');
  });

  it('11. fetchNotificationDetail.rejected sets detailError', () => {
    let s = seed({ detailLoading: true });
    s = reducer(s, { type: fetchNotificationDetail.rejected.type, payload: 'Not authenticated' });
    expect(s.detailLoading).toBe(false);
    expect(s.detailError).toBe('Not authenticated');
  });

  it('12. clearNotificationDetail resets detail + detailError', () => {
    let s = seed({ detail: { id: 'a' }, detailError: 'x' });
    s = reducer(s, clearNotificationDetail());
    expect(s.detail).toBeNull();
    expect(s.detailError).toBeNull();
  });

  // ── filters + bulk actions ──────────────────────────────
  it('13. setNotificationFilters merges into existing filters', () => {
    let s = seed();
    s = reducer(s, setNotificationFilters({ category: 'SECURITY', is_read: 'false', page: 3 }));
    expect(s.filters.category).toBe('SECURITY');
    expect(s.filters.is_read).toBe('false');
    expect(s.filters.page).toBe(3);
    expect(s.filters.page_size).toBe(20); // untouched
  });

  it('14. markVisibleNotificationsRead marks only the listed page ids', () => {
    let s = seed({ items: [
      { id: 'a', is_read: false }, { id: 'b', is_read: false }, { id: 'c', is_read: true },
    ] });
    s = reducer(s, act(markVisibleNotificationsRead, 'fulfilled', ['a', 'b']));
    expect(s.items.map((n) => n.is_read)).toEqual([true, true, true]);
  });

  it('15. category read-all zeroes only that category; removeNotification drops a row', () => {
    let s = seed({
      unreadCount: 9,
      summary: { totalUnread: 9, byCategory: [{ category: 'DEVICE', unread_count: 5 }, { category: 'USER', unread_count: 4 }] },
      items: [{ id: 'a', category: 'DEVICE', is_read: false }, { id: 'b', category: 'USER', is_read: false }],
    });
    s = reducer(s, act(markAllNotificationsRead, 'fulfilled', { marked_count: 5, category: 'DEVICE' }, { category: 'DEVICE' }));
    expect(s.summary.byCategory.find((c) => c.category === 'DEVICE').unread_count).toBe(0);
    expect(s.summary.byCategory.find((c) => c.category === 'USER').unread_count).toBe(4);
    expect(s.unreadCount).toBe(4);

    s = reducer(s, removeNotification('a'));
    expect(s.items.map((n) => n.id)).toEqual(['b']);
  });
});

describe('notificationsSlice — user-grouped views', () => {
  it('16. summary-by-user fulfilled stores the users + total', () => {
    let s = seed();
    s = reducer(s, act(fetchNotificationSummaryByUser, 'fulfilled', { totalUnreadUsers: 2, users: [{ user_id: 'u1', unread_count: 1 }] }));
    expect(s.summaryByUserLoading).toBe(false);
    expect(s.summaryByUser.totalUnreadUsers).toBe(2);
    expect(s.summaryByUser.users).toHaveLength(1);
  });

  it('17. user groups fulfilled stores rows + pagination', () => {
    let s = seed();
    s = reducer(s, act(fetchNotificationUserGroups, 'fulfilled', { items: [{ user_id: 'u1' }], page: 1, pageSize: 20, total: 1, totalPages: 1 }));
    expect(s.userGroups).toHaveLength(1);
    expect(s.userGroupsTotal).toBe(1);
  });

  it('18. setActiveNotificationUser sets the user and resets history filters', () => {
    let s = seed({ userHistoryFilters: { category: 'DEVICE', priority: 'HIGH', include_archived: true, date_from: 'x', date_to: 'y', page: 3, page_size: 20 } });
    s = reducer(s, setActiveNotificationUser({ user_id: 'u1', email: 'a@b.com', full_name: 'A' }));
    expect(s.activeUser.user_id).toBe('u1');
    expect(s.userHistoryFilters.category).toBe('');
    expect(s.userHistoryFilters.page).toBe(1);
    expect(s.userHistory).toEqual([]);
  });

  it('19. setUserHistoryFilters merges into the existing history filters', () => {
    let s = seed();
    s = reducer(s, setUserHistoryFilters({ category: 'LICENSING', page: 2 }));
    expect(s.userHistoryFilters.category).toBe('LICENSING');
    expect(s.userHistoryFilters.page).toBe(2);
    expect(s.userHistoryFilters.page_size).toBe(20);
  });

  it('20. user history fulfilled stores items + pagination', () => {
    let s = seed();
    s = reducer(s, act(fetchNotificationUserHistory, 'fulfilled', { items: [{ id: 'n1', is_read: false }], page: 1, pageSize: 20, total: 1, totalPages: 1 }));
    expect(s.userHistory).toHaveLength(1);
    expect(s.userHistoryTotal).toBe(1);
  });

  it('21. per-user read-all (no category) drops the user from the bell + trims badge/group/history', () => {
    let s = seed({
      unreadCount: 5,
      activeUser: { user_id: 'u1' },
      summaryByUser: { totalUnreadUsers: 2, users: [{ user_id: 'u1', unread_count: 2 }, { user_id: 'u2', unread_count: 1 }] },
      userGroups: [{ user_id: 'u1', unread_count: 2 }],
      userHistory: [{ id: 'n1', category: 'DEVICE', is_read: false }, { id: 'n2', category: 'USER', is_read: false }],
    });
    s = reducer(s, act(markUserNotificationsRead, 'fulfilled', { marked_count: 2, category: null, target_user_id: 'u1' }, { userId: 'u1' }));
    expect(s.unreadCount).toBe(3);
    expect(s.summaryByUser.users.map((u) => u.user_id)).toEqual(['u2']);
    expect(s.summaryByUser.totalUnreadUsers).toBe(1);
    expect(s.userGroups[0].unread_count).toBe(0);
    expect(s.userHistory.every((n) => n.is_read)).toBe(true);
  });

  it('22. per-user read-all scoped to a category only flips that category in history', () => {
    let s = seed({
      unreadCount: 3,
      activeUser: { user_id: 'u1' },
      summaryByUser: { totalUnreadUsers: 1, users: [{ user_id: 'u1', unread_count: 2 }] },
      userHistory: [{ id: 'n1', category: 'DEVICE', is_read: false }, { id: 'n2', category: 'USER', is_read: false }],
    });
    s = reducer(s, act(markUserNotificationsRead, 'fulfilled', { marked_count: 1, category: 'DEVICE', target_user_id: 'u1' }, { userId: 'u1', category: 'DEVICE' }));
    expect(s.userHistory.find((n) => n.id === 'n1').is_read).toBe(true);
    expect(s.userHistory.find((n) => n.id === 'n2').is_read).toBe(false);
    expect(s.summaryByUser.users[0].unread_count).toBe(1);
  });

  it('23. global read-all also empties the bell and zeroes group rows', () => {
    let s = seed({
      unreadCount: 4,
      summaryByUser: { totalUnreadUsers: 2, users: [{ user_id: 'u1', unread_count: 2 }, { user_id: 'u2', unread_count: 2 }] },
      userGroups: [{ user_id: 'u1', unread_count: 2 }, { user_id: 'u2', unread_count: 2 }],
    });
    s = reducer(s, act(markAllNotificationsRead, 'fulfilled', { marked_count: 4, category: null, target_user_id: null }, {}));
    expect(s.unreadCount).toBe(0);
    expect(s.summaryByUser.users).toEqual([]);
    expect(s.summaryByUser.totalUnreadUsers).toBe(0);
    expect(s.userGroups.every((g) => g.unread_count === 0)).toBe(true);
  });
});
