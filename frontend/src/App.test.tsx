import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Mock the api module
vi.mock('@/services/api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
    },
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    hasAccessToken: vi.fn(),
  };
});

import { hasAccessToken } from '@/services/api';

const mockedHasAccessToken = vi.mocked(hasAccessToken);

/**
 * Wraps App in MemoryRouter for testing.
 * App includes its own AuthProvider but needs an external router.
 */
function renderApp(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('redirects / to /login when not authenticated', async () => {
    mockedHasAccessToken.mockReturnValue(false);

    renderApp(['/']);

    await waitFor(() => {
      // LoginPage renders "Welcome back" subtitle
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });
  });

  it('renders login page at /login', async () => {
    mockedHasAccessToken.mockReturnValue(false);

    renderApp(['/login']);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });
  });

  it('renders register page at /register', async () => {
    mockedHasAccessToken.mockReturnValue(false);

    renderApp(['/register']);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create account' }),
      ).toBeInTheDocument();
    });
  });
});
