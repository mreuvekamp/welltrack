import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

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

import api, { hasAccessToken } from '@/services/api';

const mockedApi = vi.mocked(api);
const mockedHasAccessToken = vi.mocked(hasAccessToken);

function renderWithRouter(initialEntries: string[] = ['/protected']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('redirects to /login when user is not authenticated', async () => {
    mockedHasAccessToken.mockReturnValue(false);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('renders children when user is authenticated', async () => {
    mockedHasAccessToken.mockReturnValue(true);
    mockedApi.get.mockResolvedValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          display_name: 'Test',
          timezone: 'UTC',
        },
      },
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('shows loading spinner while auth state is being determined', () => {
    mockedHasAccessToken.mockReturnValue(true);
    // Never resolve the API call to keep loading state
    mockedApi.get.mockReturnValue(new Promise(() => {}));

    renderWithRouter();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
