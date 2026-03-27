import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import Layout from './Layout';

// Mock the api module
vi.mock('@/services/api', () => {
  return {
    default: {
      get: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            display_name: 'Test User',
            timezone: 'UTC',
          },
        },
      }),
      post: vi.fn(),
    },
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    hasAccessToken: vi.fn().mockReturnValue(true),
  };
});

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Layout>
          <div>Page Content</div>
        </Layout>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header with WellTrack branding', async () => {
    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('WellTrack')).toBeInTheDocument();
    });
  });

  it('renders navigation items in both sidebar and bottom nav', async () => {
    renderLayout();

    await waitFor(() => {
      // Both sidebar and bottom nav render items, so each appears twice
      expect(screen.getAllByText('Dashboard')).toHaveLength(2);
      expect(screen.getAllByText('History')).toHaveLength(2);
      expect(screen.getAllByText('Trends')).toHaveLength(2);
      expect(screen.getAllByText('Settings')).toHaveLength(2);
    });
  });

  it('renders children content', async () => {
    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('Page Content')).toBeInTheDocument();
    });
  });

  it('renders navigation landmarks for sidebar and bottom nav', async () => {
    renderLayout();

    await waitFor(() => {
      const navElements = screen.getAllByRole('navigation', {
        name: 'Main navigation',
      });
      // Sidebar and BottomNav both render as nav with aria-label
      expect(navElements).toHaveLength(2);
    });
  });

  it('renders sign out button in header', async () => {
    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
  });

  it('shows active state for current route', async () => {
    renderLayout();

    await waitFor(() => {
      // Dashboard links should be present (active route is /dashboard)
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks).toHaveLength(2);
    });
  });
});
