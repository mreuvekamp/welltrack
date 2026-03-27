import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';

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

import api, { hasAccessToken, clearTokens } from '@/services/api';

const mockedApi = vi.mocked(api);
const mockedHasAccessToken = vi.mocked(hasAccessToken);
const mockedClearTokens = vi.mocked(clearTokens);

/** Test component that displays auth state */
function AuthConsumer() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (user) return <div>Logged in as {user.email}</div>;
  return <div>Not logged in</div>;
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>,
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows loading state initially, then resolves when no token exists', async () => {
    mockedHasAccessToken.mockReturnValue(false);

    renderWithProviders(<AuthConsumer />);

    // Should quickly resolve to not logged in since there is no token
    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });
  });

  it('fetches user profile when access token exists', async () => {
    mockedHasAccessToken.mockReturnValue(true);
    mockedApi.get.mockResolvedValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          display_name: 'Test User',
          timezone: 'UTC',
        },
      },
    });

    renderWithProviders(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByText('Logged in as test@example.com')).toBeInTheDocument();
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/users/me');
  });

  it('clears tokens and sets user to null when profile fetch fails', async () => {
    mockedHasAccessToken.mockReturnValue(true);
    mockedApi.get.mockRejectedValue(new Error('Unauthorized'));

    renderWithProviders(<AuthConsumer />);

    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument();
    });

    expect(mockedClearTokens).toHaveBeenCalled();
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test since React will log the error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <BrowserRouter>
          <AuthConsumer />
        </BrowserRouter>,
      );
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
