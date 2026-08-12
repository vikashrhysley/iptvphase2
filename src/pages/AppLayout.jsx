// src/pages/AppLayout.js
import React, { Suspense, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from '../components/Layout/Sidebar';
import Header from '../components/Layout/Header';
import useNotificationPolling from '../hooks/useNotificationPolling';
import useProfileRefresh from '../hooks/useProfileRefresh';
import { refreshCurrentUser } from '../store/slices/authSlice';
import { setDeviceFilters } from '../store/slices/deviceSlice';
import { canAccessPage, firstAccessiblePage } from '../utils/pageAccess';

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
const PlansPage          = React.lazy(() => import('../components/Plans/PlansPage'));
const AnalyticsPage      = React.lazy(() => import('../components/Analytics/AnalyticsPage'));
const SecurityEventsPage = React.lazy(() => import('../components/Security/SecurityEventsPage'));
const HealthPage         = React.lazy(() => import('../components/Health/HealthPage'));
const RiskPage           = React.lazy(() => import('../components/Risk/RiskPage'));
const InfraPage          = React.lazy(() => import('../components/Infra/InfraPage'));
const MonitoringPage     = React.lazy(() => import('../components/Monitoring/MonitoringPage'));
const NotificationsPage  = React.lazy(() => import('../components/Notifications/NotificationsPage'));

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
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
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
  const [infraSection, setInfraSection] = useState(
    () => sessionStorage.getItem('infraSection') || null
  );
  const [monitoringSection, setMonitoringSection] = useState(
    () => sessionStorage.getItem('monitoringSection') || null
  );

  // Client-side polling for the notification bell (unread-count + summary), paused on hidden tabs.
  useNotificationPolling();
  // Keep role + permissions fresh (on focus + interval) so page gating reflects permission
  // edits without a manual reload.
  useProfileRefresh();

  const mainLeft = collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';

  const applyPage = (page) => {
    setActivePage(page);
    sessionStorage.setItem('activePage', page);
    setMobileNavOpen(false);
    // Navigating is a natural checkpoint to re-sync this admin's permissions, so a page they
    // were just granted/removed appears or disappears immediately as they move around.
    dispatch(refreshCurrentUser());
  };

  // Page-level enforcement: once the profile has loaded, if the active page isn't permitted for
  // this user (e.g. a Manager whose sessionStorage still points at RBAC from a prior superadmin
  // session, or a page they've lost access to), redirect them to their first accessible page.
  // Skipped while the profile is loading (user null) so the reload window doesn't misfire.
  useEffect(() => {
    if (!user) return;
    if (canAccessPage(user, activePage)) return;
    const target = firstAccessiblePage(user);
    setActivePage(target);
    sessionStorage.setItem('activePage', target);
  }, [user, activePage]);

  // ── Browser back/forward integration ──────────────────────────────
  // Navigation is state-based (activePage), so without this the URL never changes and
  // the back button leaves the app entirely (blank tab). We build a history stack whose
  // base is Home behind a "root" guard: back walks through visited pages down to Home,
  // and pressing back AT Home bounces back to Home instead of exiting the app.
  // The URL is kept clean (no #/page hash) — every entry keeps the current pathname.
  useEffect(() => {
    const url = window.location.pathname + window.location.search; // clean URL, strips any hash
    // StrictMode/logout remounts must not rebuild the stack twice.
    if (!window.__appHistoryInit) {
      window.__appHistoryInit = true;
      const initial = activePage;
      window.history.replaceState({ root: true }, '', url);       // guard = "outside the app"
      window.history.pushState({ appPage: 'home' }, '', url);     // Home is always the base
      if (initial && initial !== 'home') {
        window.history.pushState({ appPage: initial }, '', url);
      }
    }
    const onPopState = (e) => {
      const st = e.state;
      if (!st || st.root) {
        // Reached the guard — re-push Home so back can't leave the app. pushState here
        // also clears any forward entries, so Forward can't land on a stale page either.
        window.history.pushState({ appPage: 'home' }, '', window.location.pathname);
        applyPage('home');
      } else if (st.appPage) {
        applyPage(st.appPage);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cross-page navigation intents ─────────────────────────────────
  // Lets deeply-nested components (e.g. the license popup) jump to another page,
  // optionally targeting a record (planId → open that plan on the Plans page).
  useEffect(() => {
    const onNavIntent = (e) => {
      const { page, planId, deviceStatus } = e.detail || {};
      if (!page) return;
      if (planId) sessionStorage.setItem('openPlanId', planId);
      // A device-status filter carried from the dashboard cards → seed the Devices list filter.
      if (deviceStatus) dispatch(setDeviceFilters({ status: deviceStatus, current_session: false, page: 1 }));
      applyPage(page);
      window.history.pushState({ appPage: page }, '', window.location.pathname);
    };
    window.addEventListener('app:navigate', onNavIntent);
    return () => window.removeEventListener('app:navigate', onNavIntent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNavigate = (page) => {
    if (page === activePage) return;
    applyPage(page);
    // Add a history entry (clean URL) so the browser back button returns here.
    window.history.pushState({ appPage: page }, '', window.location.pathname);
  };

  const handleDashboardTabChange = (tab) => {
    setDashboardTab(tab);
    sessionStorage.setItem('dashboardTab', tab);
  };

  const handleAnalyticsTabChange = (tab) => {
    setAnalyticsTab(tab);
    sessionStorage.setItem('analyticsTab', tab);
  };

  const handleInfraSectionChange = (sec) => {
    if (sec !== null) handleNavigate('infra');
    setInfraSection(sec);
    if (sec === null) sessionStorage.removeItem('infraSection');
    else sessionStorage.setItem('infraSection', sec);
  };

  const handleMonitoringSectionChange = (sec) => {
    if (sec !== null) handleNavigate('monitoring');
    setMonitoringSection(sec);
    if (sec === null) sessionStorage.removeItem('monitoringSection');
    else sessionStorage.setItem('monitoringSection', sec);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'home':    return <DashboardTable activeDashboardTab={dashboardTab}  setActivePage={setActivePage} setCollapsed={setCollapsed}/>;
      case 'device':  return <DevicePage />;
      case 'heartbeat': return <HeartbeatPage />;
      case 'license': return <LicensePage />;
      case 'profile': return <ProfilePage />;
      case 'trial':   return <TrialPage />;
      case 'admin_users': return <AdminUsersPage />;
      case 'app_users':   return <AppUsersPage />;
      case 'audit':       return <AuditPage />;
      case 'rbac':        return <RbacPage />;
      case 'plans':         return <PlansPage />;
      case 'analytics':        return <AnalyticsPage activeTab={analyticsTab} />;
      case 'security_events':  return <SecurityEventsPage />;
      case 'health':           return <HealthPage />;
      case 'risk':             return <RiskPage />;
      case 'monitoring':       return <MonitoringPage view={monitoringSection} />;
      case 'notifications':    return <NotificationsPage />;
      case 'infra':            return <InfraPage view={infraSection} />;
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
        infraSection={infraSection}
        onInfraSectionChange={handleInfraSectionChange}
        monitoringSection={monitoringSection}
        onMonitoringSectionChange={handleMonitoringSectionChange}
        onNavigate={handleNavigate}
      />
      <Header
        activePage={activePage}
        dashboardTab={dashboardTab}
        analyticsTab={analyticsTab}
        sidebarCollapsed={collapsed}
        onMenuToggle={() => setMobileNavOpen(o => !o)}
        onNavigate={handleNavigate}
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
