import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { projects } from '../data/mock';
import { useApp } from '../state';
import { CaptureSheet } from './CaptureSheet';
import { EntryDrawer } from './Entries';
import { Icon } from './Icon';

const nav = [
  { to: '/', label: 'Today', icon: 'today', end: true },
  { to: '/tracker', label: 'Tracker', icon: 'tracker' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/timeline', label: 'Timeline', icon: 'timeline' },
  { to: '/projects', label: 'Projects', icon: 'projects' },
  { to: '/tasks', label: 'Tasks', icon: 'tasks' },
  { to: '/stats', label: 'Statistics', icon: 'stats' },
  { to: '/review', label: 'Review', icon: 'review' },
  { to: '/habits', label: 'Habits', icon: 'tracker' },
];

// Pages reached from the phone's "More" menu (the rest are in the tab bar).
const more = [...nav.slice(3), { to: '/habits', label: 'Habits', icon: 'tracker' }, { to: '/settings', label: 'Settings', icon: 'settings' }];

export function Layout() {
  const { capture, openCapture, toast } = useApp();
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  const inMore = more.some((m) => pathname.startsWith(m.to)) || pathname.startsWith('/formats');

  useEffect(() => setMenu(false), [pathname]);

  return (
    <div className="shell">
      <aside className="rail" aria-label="Main">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="timeline" size={16} />
          </span>
          Logbook
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="rail-projects">
          <div className="rail-heading">Projects</div>
          {projects
            .filter((p) => !p.archived)
            .map((p) => (
              <NavLink key={p.id} to={`/projects/${p.id}`} className={`rail-project pc-${p.color}`}>
                <span className="dot" />
                {p.name}
              </NavLink>
            ))}
        </div>

        <div className="rail-foot">
          <button className="log-btn block" onClick={() => openCapture()}>
            <Icon name="plus" size={18} /> Log entry
          </button>
          <NavLink to="/settings" className="nav-link">
            <Icon name="settings" /> Settings
          </NavLink>
          <div className="sync-state">
            <span className="led" /> Saved on this device
          </div>
        </div>
      </aside>

      <header className="mobile-head">
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark">
            <Icon name="timeline" size={16} />
          </span>
          Logbook
        </div>
        <span className="sync-state" style={{ padding: 0 }}>
          <span className="led" /> Saved
        </span>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Main">
        <NavLink to="/" end>
          <Icon name="today" />
          Today
        </NavLink>
        <NavLink to="/tracker">
          <Icon name="tracker" />
          Tracker
        </NavLink>
        <button className="tab-log" onClick={() => openCapture()} aria-label="Log entry">
          <span className="fab">
            <Icon name="plus" size={24} />
          </span>
          Log
        </button>
        <NavLink to="/calendar">
          <Icon name="calendar" />
          Calendar
        </NavLink>
        <button className={inMore ? 'active' : ''} onClick={() => setMenu(true)} aria-expanded={menu}>
          <Icon name="menu" />
          More
        </button>
      </nav>

      {menu && (
        <>
          <div className="scrim" onClick={() => setMenu(false)} />
          <div className="sheet more-sheet" role="dialog" aria-modal="true" aria-label="More pages">
            <div className="sheet-head-row" style={{ padding: '16px 20px 8px' }}>
              <h2>More</h2>
              <button className="btn ghost small" onClick={() => setMenu(false)} aria-label="Close">
                <Icon name="close" size={18} />
              </button>
            </div>
            <nav className="more-list">
              {more.map((m) => (
                <NavLink key={m.to} to={m.to} className="nav-link">
                  <Icon name={m.icon} />
                  {m.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </>
      )}

      {capture.open && <CaptureSheet key={`${capture.projectId}-${capture.formatId}`} />}
      <EntryDrawer />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
