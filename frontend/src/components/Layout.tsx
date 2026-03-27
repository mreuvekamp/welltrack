import type { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

/**
 * Main layout wrapper for all authenticated pages.
 * Includes header, responsive sidebar (desktop) / bottom nav (mobile),
 * and a scrollable content area with proper padding.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <div className="flex flex-1">
        <Sidebar />

        {/* Main content area with bottom padding for mobile nav */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
