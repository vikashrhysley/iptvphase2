// src/components/Layout/Sidebar.js
import { useDispatch, useSelector } from 'react-redux';
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

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const NAV_ITEMS = [
  { id: 'home', label: 'Dashboard', icon: <HomeIcon />, page: 'home' },
  { id: 'device', label: 'Device', icon: <DeviceIcon />, page: 'device' },
  { id: 'heartbeat', label: 'Heartbeat', icon: <HeartbeatIcon />, page: 'heartbeat' },
  { id: 'license', label: 'License', icon: <LicenseIcon />, page: 'license' },
  { id: 'trial', label: 'Trial & Grace', icon: <TrialIcon />, page: 'trial' },
];

export default function Sidebar({ collapsed, onToggle, activePage, onNavigate }) {
  const dispatch = useDispatch();
  const { user, loading: logoutLoading } = useSelector(s => s.auth);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

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
          <button
            key={item.id}
            className={`nav-item${activePage === item.page ? ' active' : ''}`}
            onClick={() => onNavigate(item.page)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {collapsed && <span className="nav-tooltip">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="user-avatar-btn"
          onClick={() => onNavigate('profile')}
          title="View profile"
        >
          <div className="user-avatar">{initials}</div>
        </button>
        <div className="user-info" style={{ cursor:'pointer' }} onClick={() => onNavigate('profile')}>
          <div className="user-name">{user?.name}</div>
          <div className="user-role" style={{ textTransform:'capitalize' }}>
            {user?.role === 'superadmin' ? 'Super Admin' : user?.role}
          </div>
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
