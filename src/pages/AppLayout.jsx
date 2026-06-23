// src/pages/AppLayout.js
import React, { useState } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import Header from '../components/Layout/Header';
import DashboardTable from '../components/Dashboard/DashboardTable';
import DevicePage from '../components/Device/DevicePage';
import HeartbeatPage from '../components/Heartbeat/HeartbeatPage';
import LicensePage from '../components/License/LicensePage';
import ProfilePage from '../components/Profile/ProfilePage';
import TrialPage from '../components/Trial/TrialPage';
import AdminUsersPage from '../components/AdminUser/AdminUsersPage';
import AppUsersPage   from '../components/AppUsers/AppUsersPage';
import AuditPage      from '../components/Audit/AuditPage';
import RbacPage       from '../components/Rbac/RbacPage';
import SubscriptionsPage from '../components/Subscriptions/SubscriptionsPage';
import PlansPage         from '../components/Plans/PlansPage';
import AnalyticsPage         from '../components/Analytics/AnalyticsPage';
import SecurityEventsPage   from '../components/Security/SecurityEventsPage';

import './AppLayout.css';

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[PageErrorBoundary]', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#f87171', fontFamily: 'monospace' }}>
          <h2 style={{ marginBottom: 12 }}>Page crashed — check the browser console (F12) for details.</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, opacity: 0.6, marginTop: 8 }}>{this.state.error.stack}</pre>
          <button
            style={{ marginTop: 16, padding: '6px 16px', cursor: 'pointer' }}
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [dashboardTab, setDashboardTab] = useState('liveStats');
  const [analyticsTab, setAnalyticsTab] = useState('revenue');

  const mainLeft = collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';

  const handleNavigate = (page) => {
    setActivePage(page);
    setMobileNavOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'home':    return <DashboardTable activeDashboardTab={dashboardTab} />;
      case 'device':  return <DevicePage />;
      case 'heartbeat': return <HeartbeatPage />;
      case 'license': return <LicensePage />;
      case 'profile': return <ProfilePage />;
      case 'trial':   return <TrialPage />;
      case 'admin_users': return <AdminUsersPage />;
      case 'app_users':   return <AppUsersPage />;
      case 'audit':       return <AuditPage />;
      case 'rbac':        return <RbacPage />;
      case 'subscriptions': return <SubscriptionsPage />;
      case 'plans':         return <PlansPage />;
      case 'analytics':        return <AnalyticsPage activeTab={analyticsTab} />;
      case 'security_events':  return <SecurityEventsPage />;
      default:        return <DashboardTable />;

    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        activePage={activePage}
        dashboardTab={dashboardTab}
        onDashboardTabChange={setDashboardTab}
        analyticsTab={analyticsTab}
        onAnalyticsTabChange={setAnalyticsTab}
        onNavigate={handleNavigate}
      />
      <Header
        activePage={activePage}
        dashboardTab={dashboardTab}
        analyticsTab={analyticsTab}
        sidebarCollapsed={collapsed}
        onMenuToggle={() => setMobileNavOpen(o => !o)}
      />
      <main className="app-main" style={{ marginLeft: mainLeft }}>
        <PageErrorBoundary key={activePage}>
          {renderPage()}
        </PageErrorBoundary>
      </main>
    </div>
  );
}
