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
  { to: '/log', label: 'Log', icon: LogIcon },
  { to: '/history', label: 'History', icon: HistoryIcon },
  { to: '/trends', label: 'Trends', icon: TrendsIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

/**
 * Fixed bottom navigation bar for mobile devices.
 * Hidden on md+ breakpoints where the sidebar is used instead.
 * Each item has a minimum 48px touch target for accessibility.
 */
export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-warm-200 bg-white md:hidden"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors ${
                isActive
                  ? 'text-teal-600'
                  : 'text-warm-500 hover:text-warm-700'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
