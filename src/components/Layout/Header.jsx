// src/components/Layout/Header.js
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUsers } from '../../store/slices/dashboardSlice';
import { useTheme } from '../../context/ThemeContext';
import './Header.css';

const PAGE_TITLES = {
  home:    'Dashboard',
  device:  'Device Management',
  license: 'License Center',
  profile: 'My Profile',
  trial:   'Trial & Grace Policies',
};

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
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

export default function Header({ activePage, sidebarCollapsed }) {
  const { user }   = useSelector(s => s.auth);
  const dispatch   = useDispatch();
  const { theme, toggleTheme } = useTheme();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';

  return (
    <header className="app-header" style={{ left }}>
      <div className="header-left">
        <span className="header-page-title">{PAGE_TITLES[activePage] || 'Dashboard'}</span>
        <span className="header-breadcrumb">/ Overview</span>
      </div>
      <div className="header-right">
        <span className="header-time">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
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

        <button className="refresh-btn" onClick={() => dispatch(fetchUsers())} title="Refresh data">
          <RefreshIcon />
        </button>
      </div>
    </header>
  );
}