import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ForgotPasswordPage from './ForgotPasswordPage';

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

function renderForgotPasswordPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <AuthProvider>
        <ForgotPasswordPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the forgot password form', async () => {
    renderForgotPasswordPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Send reset link' }),
      ).toBeInTheDocument();
    });
  });

  it('renders link back to login', async () => {
    renderForgotPasswordPage();

    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });
  });

  it('displays the WellTrack branding and instructions', async () => {
    renderForgotPasswordPage();

    await waitFor(() => {
      expect(screen.getByText('WellTrack')).toBeInTheDocument();
      expect(screen.getByText('Reset your password')).toBeInTheDocument();
    });
  });
});
