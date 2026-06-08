// src/components/Layout/Sidebar.js
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { apiGetProfile } from '../../services/api';
import { logoutUser } from '../../store/slices/authSlice';
import './Sidebar.css';

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
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
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
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

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const NAV_ITEMS = [
  { id: 'home', label: 'Dashboard', icon: <HomeIcon />, page: 'home' },
  { id: 'admin_users', label: 'Admin Users', icon: <LockIconForSidebar />, page: 'admin_users' },
  { id: 'app_users',   label: 'Subscriber',  icon: <AppUsersIcon />,      page: 'app_users' },
  { id: 'device', label: 'Device', icon: <DeviceIcon />, page: 'device' },
  { id: 'heartbeat', label: 'Heartbeat', icon: <HeartbeatIcon />, page: 'heartbeat' },
  { id: 'license', label: 'License', icon: <LicenseIcon />, page: 'license' },
  { id: 'trial', label: 'System Configuration', icon: <TrialIcon />, page: 'trial' },
];


const DASHBOARD_SUB_ITEMS = [
  { id: 'liveStats', label: 'Live Stats' },
  { id: 'overview', label: 'Overview' },
  { id: 'revenue', label: 'Revenue' },
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
  activePage,
  dashboardTab,
  onDashboardTabChange,
  onNavigate,
}) {
  const dispatch = useDispatch();
  const { accessToken, user, loading: logoutLoading } = useSelector(s => s.auth);
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(activePage === 'home');
  const [sidebarProfile, setSidebarProfile] = useState(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!accessToken) {
        if (active) setSidebarProfile(null);
        return;
      }

      try {
        const data = await apiGetProfile(accessToken);
        if (active) setSidebarProfile(data);
      } catch {
        if (active) setSidebarProfile(null);
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [accessToken]);

  const profileUser = sidebarProfile || user || {};
  const displayRole = profileUser.role_display || roleLabel(profileUser.role);
  const displayName = profileUser.full_name || profileUser.fullName || profileUser.name || profileUser.username || profileUser.email || displayRole;
  const avatarUrl = profileUser.avatar_url || profileUser.avatarUrl;
  const initials = initialsFor(displayName);

  return (
    <>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <a className="sidebar-brand" href="#!">
            <div className="sidebar-brand-icon">
              <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                <path d="M6 4h10a6 6 0 0 1 0 12H6V4z" fill="white" opacity="0.95"/>
                <path d="M6 16h5l7 8H11L6 16z" fill="white" opacity="0.85"/>
                <rect x="6" y="4" width="2.5" height="20" fill="white"/>
              </svg>
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">Rhysley</span>
              <span className="sidebar-brand-tag">GROUP</span>
            </div>
          </a>
        )}
        {collapsed && <div style={{ flex: 1 }} />}
        <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map(item => (
          <div className="nav-group" key={item.id}>
            <button
              className={`nav-item${activePage === item.page ? ' active' : ''}`}
              onClick={() => {
                if (item.id === 'home') {
                  if (activePage !== 'home') {
                    onNavigate('home');
                    onDashboardTabChange('liveStats');
                  }
                  setDashboardMenuOpen(open => !open);
                  return;
                }
                setDashboardMenuOpen(false);
                onNavigate(item.page);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.id === 'home' && !collapsed && (
                <span className={`nav-caret${dashboardMenuOpen ? ' open' : ''}`}>
                  {dashboardMenuOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                </span>
              )}
              {collapsed && <span className="nav-tooltip">{item.label}</span>}
            </button>
            {item.id === 'home' && dashboardMenuOpen && !collapsed && (
              <div className="nav-submenu">
                {DASHBOARD_SUB_ITEMS.map(subItem => (
                  <button
                    key={subItem.id}
                    className={`nav-subitem${dashboardTab === subItem.id ? ' active' : ''}`}
                    onClick={() => {
                      onNavigate('home');
                      onDashboardTabChange(subItem.id);
                    }}
                  >
                    {subItem.label}
                  </button>
                ))}
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
        <div className="user-info" style={{ cursor:'pointer' }} onClick={() => onNavigate('profile')}>
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
            ? <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'#f87171', borderRadius:'50%', display:'inline-block', animation:'spin 0.65s linear infinite' }} />
            : <LogoutIcon />
          }
        </button>
      </div>
    </aside>
    </>
  );
}
