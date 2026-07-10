// src/pages/AppLayout.js
import React, { Suspense, useState } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import Header from '../components/Layout/Header';

const DashboardTable     = React.lazy(() => import('../components/Dashboard/DashboardTable'));
const DevicePage         = React.lazy(() => import('../components/Device/DevicePage'));
const HeartbeatPage      = React.lazy(() => import('../components/Heartbeat/HeartbeatPage'));
const LicensePage        = React.lazy(() => import('../components/License/LicensePage'));
const ProfilePage        = React.lazy(() => import('../components/Profile/ProfilePage'));
const TrialPage          = React.lazy(() => import('../components/Trial/TrialPage'));
const AdminUsersPage     = React.lazy(() => import('../components/AdminUser/AdminUsersPage'));
const AppUsersPage       = React.lazy(() => import('../components/AppUsers/AppUsersPage'));
const AuditPage          = React.lazy(() => import('../components/Audit/AuditPage'));
const RbacPage           = React.lazy(() => import('../components/Rbac/RbacPage'));
const SubscriptionsPage  = React.lazy(() => import('../components/Subscriptions/SubscriptionsPage'));
const PlansPage          = React.lazy(() => import('../components/Plans/PlansPage'));
const AnalyticsPage      = React.lazy(() => import('../components/Analytics/AnalyticsPage'));
const SecurityEventsPage = React.lazy(() => import('../components/Security/SecurityEventsPage'));
const HealthPage         = React.lazy(() => import('../components/Health/HealthPage'));
const RiskPage           = React.lazy(() => import('../components/Risk/RiskPage'));
const InfraPage          = React.lazy(() => import('../components/Infra/InfraPage'));

import './AppLayout.css';

function PageLoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.08)',
        borderTopColor: 'var(--accent-primary, #00d4ff)',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );
}

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
  const [activePage, setActivePage] = useState(
    () => sessionStorage.getItem('activePage') || 'home'
  );
  const [dashboardTab, setDashboardTab] = useState(
    () => sessionStorage.getItem('dashboardTab') || 'liveStats'
  );
  const [analyticsTab, setAnalyticsTab] = useState(
    () => sessionStorage.getItem('analyticsTab') || 'revenue'
  );

  const mainLeft = collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';

  const handleNavigate = (page) => {
    setActivePage(page);
    sessionStorage.setItem('activePage', page);
    setMobileNavOpen(false);
  };

  const handleDashboardTabChange = (tab) => {
    setDashboardTab(tab);
    sessionStorage.setItem('dashboardTab', tab);
  };

  const handleAnalyticsTabChange = (tab) => {
    setAnalyticsTab(tab);
    sessionStorage.setItem('analyticsTab', tab);
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
      case 'health':           return <HealthPage />;
      case 'risk':             return <RiskPage />;
      case 'infra':            return <InfraPage />;
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
        onDashboardTabChange={handleDashboardTabChange}
        analyticsTab={analyticsTab}
        onAnalyticsTabChange={handleAnalyticsTabChange}
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
          <Suspense fallback={<PageLoadingFallback />}>
            {renderPage()}
          </Suspense>
        </PageErrorBoundary>
      </main>
    </div>
  );
}
