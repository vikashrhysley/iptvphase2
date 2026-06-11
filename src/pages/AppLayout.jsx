// src/pages/AppLayout.js
import { useState } from 'react';
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

import './AppLayout.css';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [dashboardTab, setDashboardTab] = useState('liveStats');

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
        onNavigate={handleNavigate}
      />
      <Header
        activePage={activePage}
        dashboardTab={dashboardTab}
        sidebarCollapsed={collapsed}
        onMenuToggle={() => setMobileNavOpen(o => !o)}
      />
      <main className="app-main" style={{ marginLeft: mainLeft }}>
        {renderPage()}
      </main>
    </div>
  );
}
