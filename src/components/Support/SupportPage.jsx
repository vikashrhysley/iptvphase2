// Get Help — Support Console (§24). One inbox for every user help request: Contact Us,
// device / account recovery and device-limit requests. Tabs: Inbox · Analytics · Templates · Settings.
import { useSelector } from 'react-redux';
import SupportQueue from './SupportQueue';
import SupportTicketDetail from './SupportTicketDetail';
import SupportAnalytics from './SupportAnalytics';
import SupportTemplates from './SupportTemplates';
import SupportSettings from './SupportSettings';
import { SUPPORT_TABS, fmtNum } from './supportUtils';
import { ChartIcon, InboxIcon, LifeBuoyIcon, SettingsIcon, TemplateIcon } from './SupportIcons';
import './SupportPage.css';

const TAB_ICONS = { queue: InboxIcon, analytics: ChartIcon, templates: TemplateIcon, settings: SettingsIcon };

const TAB_COPY = {
  queue:     'Every user help request in one inbox — reply from the support address, track SLAs and resolve.',
  analytics: 'Volume, response times, SLA compliance and team workload.',
  templates: 'Reusable replies with placeholders that fill in per ticket.',
  settings:  'SLA targets, default priorities and automation for the console.',
};

export default function SupportPage({ tab = 'queue', onTabChange }) {
  const activeTicket = useSelector((s) => s.support.activeTicket);
  const unread = useSelector((s) => s.support.summary?.unread);
  const current = SUPPORT_TABS.some((t) => t.id === tab) ? tab : 'queue';
  const showDetail = current === 'queue' && !!activeTicket;

  return (
    <div className="gh-scope gh-page">
      {!showDetail && (
        <header className="gh-hero">
          <div className="gh-hero-left">
            <span className="gh-hero-icon"><LifeBuoyIcon size={22} /></span>
            <div>
              <h1 className="gh-title">Support Ticket</h1>
              <p className="gh-subtitle">{TAB_COPY[current]}</p>
            </div>
          </div>
          <nav className="gh-tabs" role="tablist" aria-label="Support Ticket sections">
            {SUPPORT_TABS.map((t) => {
              const Icon = TAB_ICONS[t.id];
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={current === t.id}
                  className={current === t.id ? 'active' : ''}
                  onClick={() => onTabChange?.(t.id)}
                >
                  <Icon size={14} />
                  <span>{t.label}</span>
                  {t.id === 'queue' && unread > 0 && <span className="gh-tab-badge">{fmtNum(unread)}</span>}
                </button>
              );
            })}
          </nav>
        </header>
      )}

      {showDetail && <SupportTicketDetail key={activeTicket} ticketNumber={activeTicket} />}
      {!showDetail && current === 'queue' && <SupportQueue />}
      {current === 'analytics' && <SupportAnalytics />}
      {current === 'templates' && <SupportTemplates />}
      {current === 'settings' && <SupportSettings />}
    </div>
  );
}
