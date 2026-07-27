// src/components/Layout/Header.js
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import './Header.css';

const PAGE_TITLES = {
  home:            'Dashboard',
  analytics:       'Analytics',
  admin_users:     'Admin Users',
  app_users:       'Subscriber',
  subscriptions:   'Subscriptions',
  plans:           'Plans',
  device:          'Device Management',
  heartbeat:       'Heartbeat Monitoring',
  license:         'License Center',
  trial:           'System Configuration',
  security_events: 'Security Events',
  risk:            'Risk Engine',
  health:          'Health',
  infra:           'Infrastructure',
  profile:         'My Profile',
  audit:           'Audit Logs',
  rbac:            'RBAC',
};

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1"  x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1"  y1="12" x2="3"  y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export default function Header({ activePage, dashboardTab, analyticsTab, sidebarCollapsed, onMenuToggle }) {
  const { user }   = useSelector(s => s.auth);
  const { theme, toggleTheme } = useTheme();

  // Notifications — no feed wired yet, so this shows an empty state. `notifications`
  // is ready to be populated from a real source (audit/security events) later.
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const notifications = [];
  const unreadCount = notifications.length;

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [notifOpen]);

  const left = sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';
  const breadcrumb = activePage === 'home'
    ? `/${dashboardTab === 'revenue' ? ' Revenue' : dashboardTab === 'overview' ? ' Overview' : ' Live Stats'}`
    : activePage === 'analytics'
    ? `/${analyticsTab === 'revenue' ? ' Revenue' : analyticsTab === 'users' ? ' Users' : analyticsTab === 'devices' ? ' Devices' : analyticsTab === 'licenses' ? ' Licenses' : analyticsTab === 'funnel' ? ' Funnel' : analyticsTab === 'churn' ? ' Churn' : ' Overview'}`
    : '';

  return (
    <header className="app-header" style={{ left }}>
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={onMenuToggle} aria-label="Toggle navigation menu" title="Menu">
          <MenuIcon />
        </button>
        <span className="header-page-title">{PAGE_TITLES[activePage] || 'Dashboard'}</span>
        <span className="header-breadcrumb">{breadcrumb}</span>
      </div>
      <div className="header-right">
<span className={`role-badge ${user?.role}`}>
          {user?.role === 'superadmin' ? 'Super Admin' : user?.role}
        </span>

        {/* Theme toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          <span className="theme-toggle-track">
            <span className="theme-toggle-thumb">
              {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
            </span>
          </span>
        </button>

        {/* Notifications */}
        <div className="notif-wrap" ref={notifRef}>
          <button
            className="notif-btn"
            onClick={() => setNotifOpen(o => !o)}
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={notifOpen}
          >
            <BellIcon />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="notif-panel" role="menu">
              <div className="notif-panel-head">
                <span>Notifications</span>
                {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
              </div>
              <div className="notif-panel-body">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <BellIcon />
                    <span>You're all caught up</span>
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div className="notif-item" key={i}>
                      <span className="notif-item-title">{n.title}</span>
                      <span className="notif-item-time">{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
