import { useAuth } from '@/context/AuthContext';

/**
 * App header with branding on the left and user greeting on the right.
 * Clean, minimal design with teal accent.
 */
export default function Header() {
  const { user, logout } = useAuth();

  const displayName = user?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="border-b border-warm-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <h1 className="text-xl font-bold text-teal-700">WellTrack</h1>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-text-muted sm:inline">
            Hi, {displayName}
          </span>
          <button
            onClick={logout}
            className="rounded-lg px-3 py-2 text-sm text-warm-600 transition-colors hover:bg-warm-100 hover:text-warm-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
