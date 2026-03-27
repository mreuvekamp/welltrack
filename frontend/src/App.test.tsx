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
 * Note: App includes its own AuthProvider, but we must provide the router
 * externally since main.tsx wraps App in BrowserRouter.
 */
function renderApp(initialEntries: string[] = ['/']) {
  // Remove existing BrowserRouter from main.tsx by rendering with MemoryRouter
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
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });

  it('renders login page at /login', async () => {
    mockedHasAccessToken.mockReturnValue(false);

    renderApp(['/login']);

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });

  it('renders register page at /register', async () => {
    mockedHasAccessToken.mockReturnValue(false);

    renderApp(['/register']);

    await waitFor(() => {
      expect(screen.getByText('Register')).toBeInTheDocument();
    });
  });
});
