// src/pages/AppLayout.js
import React, { useState } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import Header from '../components/Layout/Header';
import DashboardTable from '../components/Dashboard/DashboardTable';
import DevicePage from '../components/Device/DevicePage';
import LicensePage from '../components/License/LicensePage';
import ProfilePage from '../components/Profile/ProfilePage';
import TrialPage from '../components/Trial/TrialPage';
import './AppLayout.css';

function PlaceholderPage({ title, icon }) {
  return (
    <div className="dashboard-content">
      <div className="placeholder-page">
        <div className="placeholder-icon">{icon}</div>
        <div className="placeholder-title">{title}</div>
        <div className="placeholder-text">This section is under construction.</div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [activePage, setActivePage] = useState('home');

  const mainLeft = collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';

  const renderPage = () => {
    switch (activePage) {
      case 'home':    return <DashboardTable />;
      case 'device':  return <DevicePage />;
      case 'license': return <LicensePage />;
      case 'profile': return <ProfilePage />;
      case 'trial':   return <TrialPage />;
      default:        return <DashboardTable />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        activePage={activePage}
        onNavigate={setActivePage}
      />
      <Header activePage={activePage} sidebarCollapsed={collapsed} />
      <main className="app-main" style={{ marginLeft: mainLeft }}>
        {renderPage()}
      </main>
    </div>
  );
}