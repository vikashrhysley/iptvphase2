import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  apiFetchNotifications,
  apiFetchNotificationSummary,
  apiFetchNotificationUnreadCount,
  apiFetchNotificationDetail,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
} from './api';

const TOKEN = 'test-token';
let lastUrl;
let lastOptions;
let nextBody;

// Mock the global fetch the `request` helper uses. Records the URL/options and
// returns whatever `nextBody` is set to for that test.
beforeEach(() => {
  lastUrl = undefined;
  lastOptions = undefined;
  nextBody = { success: true, data: null };
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    lastUrl = url;
    lastOptions = options;
    return { ok: true, status: 200, text: async () => JSON.stringify(nextBody) };
  }));
});

describe('notifications API — list query building', () => {
  it('sends is_read, category, priority and pagination as query params (collection has trailing slash)', async () => {
    nextBody = { success: true, data: [], meta: { page: 2, page_size: 20, total: 0, total_pages: 0 } };
    await apiFetchNotifications(TOKEN, { is_read: 'false', category: 'DEVICE', priority: 'HIGH', page: 2, page_size: 20 });
    expect(lastUrl).toContain('/admin/notifications/?');
    expect(lastUrl).toContain('is_read=false');
    expect(lastUrl).toContain('category=DEVICE');
    expect(lastUrl).toContain('priority=HIGH');
    expect(lastUrl).toContain('page=2');
    expect(lastOptions.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("omits is_read when set to 'all'", async () => {
    nextBody = { success: true, data: [], meta: {} };
    await apiFetchNotifications(TOKEN, { is_read: 'all', category: 'USER' });
    expect(lastUrl).not.toContain('is_read=');
    expect(lastUrl).toContain('category=USER');
  });

  it('normalizes the response into { items, page, pageSize, total, totalPages }', async () => {
    nextBody = {
      success: true,
      data: [{ id: 'a' }, { id: 'b' }],
      meta: { page: 1, page_size: 20, total: 41, total_pages: 3 },
    };
    const out = await apiFetchNotifications(TOKEN, {});
    expect(out.items).toHaveLength(2);
    expect(out.total).toBe(41);
    expect(out.totalPages).toBe(3);
    expect(out.pageSize).toBe(20);
  });
});

describe('notifications API — summary & unread-count', () => {
  it('summary returns { totalUnread, byCategory }', async () => {
    nextBody = { success: true, data: { total_unread: 7, by_category: [{ category: 'DEVICE', unread_count: 5 }] } };
    const out = await apiFetchNotificationSummary(TOKEN);
    expect(out.totalUnread).toBe(7);
    expect(out.byCategory).toEqual([{ category: 'DEVICE', unread_count: 5 }]);
    expect(lastUrl).toContain('/admin/notifications/summary');
  });

  it('unread-count extracts the numeric unread_count', async () => {
    nextBody = { success: true, data: { unread_count: 12 } };
    const out = await apiFetchNotificationUnreadCount(TOKEN);
    expect(out).toBe(12);
    expect(lastUrl).toContain('/admin/notifications/unread-count');
  });
});

describe('notifications API — detail & mutations', () => {
  // Regression test for the "Not authenticated" bug: the detail URL must NOT have a
  // trailing slash (a slash 307-redirects and the browser drops the auth header).
  it('detail uses NO trailing slash and sends the auth header', async () => {
    nextBody = { success: true, data: { id: 'abc', title: 'Hi' } };
    await apiFetchNotificationDetail(TOKEN, 'abc');
    expect(lastUrl).toMatch(/\/admin\/notifications\/abc$/);
    expect(lastUrl.endsWith('/')).toBe(false);
    expect(lastOptions.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('markRead PATCHes /{id}/read', async () => {
    nextBody = { success: true, data: { id: 'abc', is_read: true, already_read: false } };
    const out = await apiMarkNotificationRead(TOKEN, 'abc');
    expect(lastOptions.method).toBe('PATCH');
    expect(lastUrl).toMatch(/\/admin\/notifications\/abc\/read$/);
    expect(out.is_read).toBe(true);
  });

  it('markAll PATCHes /read-all with an optional category', async () => {
    nextBody = { success: true, data: { marked_count: 5, category: 'DEVICE' } };
    await apiMarkAllNotificationsRead(TOKEN, 'DEVICE');
    expect(lastOptions.method).toBe('PATCH');
    expect(lastUrl).toContain('/admin/notifications/read-all?category=DEVICE');

    await apiMarkAllNotificationsRead(TOKEN);
    expect(lastUrl).toMatch(/\/admin\/notifications\/read-all$/);
  });

  it('throws Unauthorized when no token is provided', async () => {
    await expect(apiFetchNotificationUnreadCount('')).rejects.toThrow(/Unauthorized/);
  });
});
