import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ResetPasswordPage from './ResetPasswordPage';

// Mock the api module
vi.mock('@/services/api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
    },
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    hasAccessToken: vi.fn().mockReturnValue(false),
  };
});

function renderResetPasswordPage(search = '?token=test-token') {
  return render(
    <MemoryRouter initialEntries={[`/reset-password${search}`]}>
      <AuthProvider>
        <ResetPasswordPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the reset password form when token is present', async () => {
    renderResetPasswordPage();

    await waitFor(() => {
      expect(screen.getByLabelText('New password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Reset password' }),
      ).toBeInTheDocument();
    });
  });

  it('shows invalid link message when no token is provided', async () => {
    renderResetPasswordPage('');

    await waitFor(() => {
      expect(screen.getByText('Invalid link')).toBeInTheDocument();
      expect(screen.getByText('Request a new link')).toBeInTheDocument();
    });
  });

  it('displays the WellTrack branding', async () => {
    renderResetPasswordPage();

    await waitFor(() => {
      expect(screen.getByText('WellTrack')).toBeInTheDocument();
      expect(screen.getByText('Set a new password')).toBeInTheDocument();
    });
  });
});
