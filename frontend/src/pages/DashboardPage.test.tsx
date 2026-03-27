import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import DashboardPage from './DashboardPage';

// Mock the api module
vi.mock('@/services/api', () => {
  return {
    default: {
      get: vi.fn().mockImplementation((url: string) => {
        if (url === '/symptom-logs') {
          return Promise.resolve({ data: { symptom_logs: [], pagination: { total: 0, limit: 50, offset: 0 } } });
        }
        if (url === '/mood-logs') {
          return Promise.resolve({ data: { mood_logs: [] } });
        }
        if (url === '/medication-logs') {
          return Promise.resolve({ data: { medication_logs: [] } });
        }
        if (url === '/habit-logs') {
          return Promise.resolve({ data: { habit_logs: [] } });
        }
        return Promise.resolve({ data: {} });
      }),
      post: vi.fn(),
    },
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    hasAccessToken: vi.fn().mockReturnValue(true),
  };
});

// Mock AuthContext to provide a user
vi.mock('@/context/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('@/context/AuthContext')>('@/context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { id: '1', email: 'test@example.com', display_name: 'Test User', timezone: 'UTC' },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the greeting with user display name', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Test User/)).toBeInTheDocument();
    });
  });

  it('renders quick-add buttons for all log types', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Symptoms')).toBeInTheDocument();
      expect(screen.getByText('Mood')).toBeInTheDocument();
      expect(screen.getByText('Meds')).toBeInTheDocument();
      expect(screen.getByText('Habits')).toBeInTheDocument();
    });
  });

  it('renders the today summary section', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Today's Summary")).toBeInTheDocument();
    });
  });

  it('shows empty state messages when no logs exist', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No symptoms logged yet')).toBeInTheDocument();
      expect(screen.getByText('No mood logged yet')).toBeInTheDocument();
      expect(screen.getByText('No medications logged yet')).toBeInTheDocument();
      expect(screen.getByText('No habits logged yet')).toBeInTheDocument();
    });
  });

  it('shows the days logged this week indicator', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/days logged this week/)).toBeInTheDocument();
    });
  });

  it('opens symptom log modal when quick-add button is clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText('Symptoms').length).toBeGreaterThanOrEqual(1);
    });

    // Click the quick-add button (which is a <button> element)
    const buttons = screen.getAllByText('Symptoms');
    const quickAddBtn = buttons.find((el) => el.closest('button'));
    expect(quickAddBtn).toBeTruthy();
    await user.click(quickAddBtn!.closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Log Symptom')).toBeInTheDocument();
    });
  });

  it('opens mood log modal when quick-add button is clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText('Mood').length).toBeGreaterThanOrEqual(1);
    });

    // Click the quick-add button (which is a <button> element)
    const buttons = screen.getAllByText('Mood');
    const quickAddBtn = buttons.find((el) => el.closest('button'));
    expect(quickAddBtn).toBeTruthy();
    await user.click(quickAddBtn!.closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Log Mood')).toBeInTheDocument();
    });
  });
});
