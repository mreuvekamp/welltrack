import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import RegisterPage from './RegisterPage';

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

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the registration form with all fields', async () => {
    renderRegisterPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Create account' }),
      ).toBeInTheDocument();
    });
  });

  it('renders link to login page', async () => {
    renderRegisterPage();

    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });
  });

  it('shows validation error for short password', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create account' }),
      ).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.type(screen.getByLabelText('Confirm password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(
        screen.getByText('Password must be at least 8 characters'),
      ).toBeInTheDocument();
    });
  });

  it('shows validation error for password mismatch', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create account' }),
      ).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'different456');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Create account' }),
      ).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Email'), 'not-valid');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid email address'),
      ).toBeInTheDocument();
    });
  });

  it('displays the WellTrack branding', async () => {
    renderRegisterPage();

    await waitFor(() => {
      expect(screen.getByText('WellTrack')).toBeInTheDocument();
      expect(screen.getByText('Create your account')).toBeInTheDocument();
    });
  });
});
