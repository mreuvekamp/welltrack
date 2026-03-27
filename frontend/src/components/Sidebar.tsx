import { NavLink } from 'react-router-dom';
import {
  DashboardIcon,
  LogIcon,
  HistoryIcon,
  TrendsIcon,
  SettingsIcon,
} from './NavIcons';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/log', label: 'Log Entry', icon: LogIcon },
  { to: '/history', label: 'History', icon: HistoryIcon },
  { to: '/trends', label: 'Trends', icon: TrendsIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

/**
 * Sidebar navigation for desktop (md+ breakpoints).
 * Hidden on mobile where the bottom nav is used instead.
 * Teal accent for the active navigation item.
 */
export default function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-warm-200 bg-white md:block">
      <nav className="flex flex-col gap-1 p-3" aria-label="Main navigation">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-[48px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-warm-600 hover:bg-warm-50 hover:text-warm-800'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
