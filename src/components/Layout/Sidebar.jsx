// src/components/Layout/Sidebar.js
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../store/slices/authSlice';
import { canAccessPage } from '../../utils/pageAccess';
import { useTheme } from '../../context/ThemeContext';
import logoDark from '../../assets/vodeonai-logo-trimmed-dark.png';
import logoLight from '../../assets/vodeonai-logo-trimmed-light.png';
import logoMark from '../../assets/logo.png';
import './Sidebar.css';

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const DeviceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const HeartbeatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 12h-4l-3 8-6-16-3 8H2" />
  </svg>
);

const TrialIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const AppUsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const NotificationsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const LockIconForSidebar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const LicenseIcon = () => (

  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const AuditIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const RbacIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const SecurityEventsIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const RiskEngineIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const HealthIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 12h-4l-3 8-6-16-3 8H2" />
  </svg>
);

const InfraIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="8" rx="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const MonitoringIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 12h-4l-3 8-6-16-3 8H2" />
    <circle cx="12" cy="12" r="10" strokeDasharray="3 3" opacity="0.4" />
  </svg>
);

const PlansIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const DASHBOARD_SUB_ITEMS = [
  { id: 'liveStats', label: 'Live Stats' },
  { id: 'overview', label: 'Overview' },
  { id: 'revenue', label: 'Revenue' },
];

const ANALYTICS_SUB_ITEMS = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'users', label: 'Users' },
  { id: 'devices', label: 'Devices' },
  { id: 'licenses', label: 'Licenses' },
  { id: 'funnel', label: 'Funnel' },
  { id: 'churn', label: 'Churn' },
  { id: 'geo', label: 'Geo' },
  { id: 'system', label: 'System' },
];

const INFRA_SUB_ITEMS = [
  { id: 'db_performance', label: 'Database Performance' },
  { id: 'queue_health', label: 'Queue Health' },
  { id: 'performance_benchmarks', label: 'Performance Benchmarks' },
];

const MONITORING_SUB_ITEMS = [
  { id: 'system_health', label: 'System Health' },
  { id: 'infra_metrics', label: 'Infra Metrics' },
  { id: 'error_tracking', label: 'Error Tracking' },
  { id: 'alerts', label: 'Alerts' },
];

const NAV_ITEMS = [
  { id: 'home', label: 'Dashboard', icon: <HomeIcon />, page: 'home', subItems: DASHBOARD_SUB_ITEMS },
  { id: 'admin_users', label: 'Admin Users', icon: <LockIconForSidebar />, page: 'admin_users' },
  { id: 'app_users', label: 'App Users', icon: <AppUsersIcon />, page: 'app_users' },
  { id: 'license', label: 'Licenses', icon: <LicenseIcon />, page: 'license' },
  { id: 'device', label: 'Devices', icon: <DeviceIcon />, page: 'device' },
  { id: 'notifications', label: 'Notifications', icon: <NotificationsIcon />, page: 'notifications' },
  { id: 'heartbeat', label: 'Heartbeats', icon: <HeartbeatIcon />, page: 'heartbeat' },
  { id: 'plans', label: 'Plans', icon: <PlansIcon />, page: 'plans' },
  { id: 'trial', label: 'System Configuration', icon: <TrialIcon />, page: 'trial' },
  { id: 'security_events', label: 'Security Events', icon: <SecurityEventsIcon />, page: 'security_events' },
  { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon />, page: 'analytics', subItems: ANALYTICS_SUB_ITEMS },
  { id: 'risk', label: 'Risk Engine', icon: <RiskEngineIcon />, page: 'risk' },
  { id: 'health', label: 'Health', icon: <HealthIcon />, page: 'health' },
  { id: 'monitoring', label: 'Monitoring', icon: <MonitoringIcon />, page: 'monitoring', subItems: MONITORING_SUB_ITEMS },
  { id: 'infra', label: 'Infra', icon: <InfraIcon />, page: 'infra', subItems: INFRA_SUB_ITEMS },
  { id: 'audit', label: 'Audit Logs', icon: <AuditIcon />, page: 'audit', superadminOnly: true },
  { id: 'rbac', label: 'RBAC', icon: <RbacIcon />, page: 'rbac', superadminOnly: true },
];

const roleLabel = (role) => {
  if (!role) return 'Admin';
  return role === 'superadmin'
    ? 'Super Admin'
    : role.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

const initialsFor = (name) => {
  if (!name) return 'AD';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`
    : parts[0].slice(0, 2);
  return initials.toUpperCase();
};

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  activePage,
  dashboardTab,
  onDashboardTabChange,
  analyticsTab,
  onAnalyticsTabChange,
  infraSection,
  onInfraSectionChange,
  monitoringSection,
  onMonitoringSectionChange,
  onNavigate,
  
}) {
  const dispatch = useDispatch();
  const { user, loading: logoutLoading } = useSelector(s => s.auth);
  // Wordmark comes in two cuts — light artwork for the dark theme, dark artwork for light.
  const { theme } = useTheme();
  const vodeonaiLogo = theme === 'dark' ? logoDark : logoLight;
  // Restore open submenu on page refresh based on which page is active
  const [openSubmenu, setOpenSubmenu] = useState(() => {
    const pagesWithSubmenu = new Set(['home', 'analytics', 'infra', 'monitoring']);
    return pagesWithSubmenu.has(activePage) ? activePage : null;
  });

  useEffect(() => {
    const pagesWithSubmenu = new Set(['home', 'analytics', 'infra', 'monitoring']);
    setOpenSubmenu(pagesWithSubmenu.has(activePage) ? activePage : null);
  }, [activePage]);

  const profileUser = user || {};

  // Page-level access control lives in ../../utils/pageAccess (shared with the app layout so
  // the sidebar and the rendered page can never disagree). It maps each page key to the RBAC
  // module name(s) that grant it, and fails CLOSED while the profile is still loading so a
  // reload never briefly shows a gated user the full admin nav.
  const profileLoaded = !!user;
  const canSeePage = (item) => canAccessPage(user, item.page);

  // Until the profile lands, show a neutral loading identity instead of the null-user fallbacks
  // (which resolve to "AD" / "Admin" and read as if an admin is signed in).
  const displayRole = profileLoaded ? (profileUser.role_display || roleLabel(profileUser.role)) : '';
  const displayName = profileLoaded
    ? (profileUser.full_name || profileUser.fullName || profileUser.name || profileUser.username || profileUser.email || displayRole)
    : 'Loading…';
  const avatarUrl = profileUser.avatar_url || profileUser.avatarUrl;
  const initials = profileLoaded ? initialsFor(displayName) : '…';
  const effectiveCollapsed = collapsed && !mobileOpen;




  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onMobileClose} />}
      <aside className={`sidebar${effectiveCollapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-header">
          <a className="sidebar-brand" href="#!">
            {effectiveCollapsed
              ? <img className="sidebar-brand-mark" src={logoMark} alt="Vodeon.ai" />
              : <img className="sidebar-brand-logo" src={vodeonaiLogo} alt="Vodeon.ai" />}
          </a>
          <button
            className="sidebar-toggle"
            onClick={mobileOpen ? onMobileClose : onToggle}
            title={mobileOpen ? 'Close menu' : (effectiveCollapsed ? 'Expand' : 'Collapse')}
          >
            {mobileOpen ? <CloseIcon /> : (effectiveCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />)}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.filter(canSeePage).map(item => (
            <div className="nav-group" key={item.id}>
              <button
                className={`nav-item${activePage === item.page ? ' active' : ''}`}
                onClick={() => {
                  if (item.subItems) {
                    if (activePage !== item.page) {
                      onNavigate(item.page);

                    }
                    if (item.id === 'infra') { onInfraSectionChange(null); }
                    if (item.id === 'monitoring') { onMonitoringSectionChange(null); }
                    setOpenSubmenu(open => (open === item.id ? null : item.id));
                    return;
                  }
                  setOpenSubmenu(null);
                  onNavigate(item.page);
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.subItems && !effectiveCollapsed && (
                  <span className={`nav-caret${openSubmenu === item.id ? ' open' : ''}`}>
                    {openSubmenu === item.id ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  </span>
                )}
                {effectiveCollapsed && <span className="nav-tooltip">{item.label}</span>}
              </button>
              {item.subItems && openSubmenu === item.id && !effectiveCollapsed && (
                <div className="nav-submenu">
                  {item.subItems.map(subItem => {
                    const activeSub = item.id === 'home' ? dashboardTab : item.id === 'analytics' ? analyticsTab : item.id === 'infra' ? infraSection : item.id === 'monitoring' ? monitoringSection : null;
                    return (
                      <button
                        key={subItem.id}
                        className={`nav-subitem${activeSub === subItem.id ? ' active' : ''}`}
                        onClick={() => {
                          if (item.id === 'home') { onNavigate(item.page); onDashboardTabChange(subItem.id); }
                          else if (item.id === 'analytics') { onNavigate(item.page); onAnalyticsTabChange(subItem.id); }
                          else if (item.id === 'infra') { onInfraSectionChange(subItem.id); }
                          else if (item.id === 'monitoring') { onMonitoringSectionChange(subItem.id); }
                        }}
                      >
                        {subItem.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="user-avatar-btn"
            onClick={() => onNavigate('profile')}
            title="View profile"
          >
            {avatarUrl ? (
              <img className="user-avatar user-avatar-img" src={avatarUrl} alt={displayName} />
            ) : (
              <div className="user-avatar">{initials}</div>
            )}
          </button>
          <div className="user-info" style={{ cursor: 'pointer' }} onClick={() => onNavigate('profile')}>
            <div className="user-name">{displayName}</div>
            <div className="user-role">{displayRole}</div>
          </div>
          <button
            className="logout-btn"
            onClick={() => dispatch(logoutUser())}
            title="Sign out"
            disabled={logoutLoading}
            style={{ opacity: logoutLoading ? 0.5 : 1 }}
          >
            {logoutLoading
              ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#f87171', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.65s linear infinite' }} />
              : <LogoutIcon />
            }
          </button>
        </div>
      </aside>
    </>
  );
}
