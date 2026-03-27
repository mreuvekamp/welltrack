import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HabitLogModal from './HabitLogModal';

const mockGetHabits = vi.fn();
const mockCreateHabitLog = vi.fn();

vi.mock('@/services/habit-service', () => ({
  getHabits: (...args: unknown[]) => mockGetHabits(...args),
  createHabitLog: (...args: unknown[]) => mockCreateHabitLog(...args),
}));

const defaultHabits = {
  habits: [
    { id: 'h1', user_id: null, name: 'Exercise', tracking_type: 'boolean', unit: null, is_active: true },
    { id: 'h2', user_id: null, name: 'Water Intake', tracking_type: 'numeric', unit: 'glasses', is_active: true },
    { id: 'h3', user_id: null, name: 'Sleep Duration', tracking_type: 'duration', unit: null, is_active: true },
    { id: 'h4', user_id: null, name: 'Inactive Habit', tracking_type: 'boolean', unit: null, is_active: false },
  ],
};

function renderModal(props?: Partial<{ onClose: () => void; onSuccess: () => void }>) {
  const onClose = props?.onClose ?? vi.fn();
  const onSuccess = props?.onSuccess ?? vi.fn();
  return {
    onClose,
    onSuccess,
    ...render(<HabitLogModal onClose={onClose} onSuccess={onSuccess} />),
  };
}

describe('HabitLogModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHabits.mockResolvedValue(defaultHabits);
    mockCreateHabitLog.mockResolvedValue({ habit_log: { id: 'log1' } });
  });

  it('renders the modal with title', async () => {
    renderModal();

    expect(screen.getByText('Log Habits')).toBeInTheDocument();
  });

  it('loads and displays only active habits', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Exercise')).toBeInTheDocument();
      expect(screen.getByText('Water Intake')).toBeInTheDocument();
      expect(screen.getByText('Sleep Duration')).toBeInTheDocument();
    });

    expect(screen.queryByText('Inactive Habit')).not.toBeInTheDocument();
  });

  it('displays habits grouped by tracking type', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Yes / No')).toBeInTheDocument();
      expect(screen.getByText('Numeric')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
    });
  });

  it('renders boolean habit with yes/no buttons', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Exercise: Yes')).toBeInTheDocument();
      expect(screen.getByLabelText('Exercise: No')).toBeInTheDocument();
    });
  });

  it('renders numeric habit with input and unit', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Water Intake value')).toBeInTheDocument();
      expect(screen.getByText('glasses')).toBeInTheDocument();
    });
  });

  it('renders duration habit with hours/minutes inputs', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Sleep Duration hours')).toBeInTheDocument();
      expect(screen.getByLabelText('Sleep Duration minutes')).toBeInTheDocument();
    });
  });

  it('toggles boolean habit value', async () => {
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Exercise: Yes')).toBeInTheDocument();
    });

    const yesBtn = screen.getByLabelText('Exercise: Yes');
    await user.click(yesBtn);
    expect(yesBtn).toHaveAttribute('aria-pressed', 'true');

    // Toggle off
    await user.click(yesBtn);
    expect(yesBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error when no habits are filled in', async () => {
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Exercise')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Please log at least one habit')).toBeInTheDocument();
    });
  });

  it('submits boolean habit log', async () => {
    const user = userEvent.setup();
    const { onSuccess } = renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Exercise: Yes')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Exercise: Yes'));
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateHabitLog).toHaveBeenCalledWith(
        expect.objectContaining({
          habit_id: 'h1',
          value_boolean: true,
        }),
      );
    });

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
  });

  it('submits numeric habit log', async () => {
    const user = userEvent.setup();
    const { onSuccess } = renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Water Intake value')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Water Intake value'), '8');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateHabitLog).toHaveBeenCalledWith(
        expect.objectContaining({
          habit_id: 'h2',
          value_numeric: 8,
        }),
      );
    });

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
  });

  it('submits duration habit log converting hours and minutes', async () => {
    const user = userEvent.setup();
    const { onSuccess } = renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Sleep Duration hours')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Sleep Duration hours'), '7');
    await user.type(screen.getByLabelText('Sleep Duration minutes'), '30');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateHabitLog).toHaveBeenCalledWith(
        expect.objectContaining({
          habit_id: 'h3',
          value_duration: 450, // 7*60 + 30
        }),
      );
    });

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
  });

  it('shows empty state when no active habits exist', async () => {
    mockGetHabits.mockResolvedValue({ habits: [] });
    renderModal();

    await waitFor(() => {
      expect(screen.getByText(/No active habits found/)).toBeInTheDocument();
    });
  });

  it('shows error message when API call fails', async () => {
    mockCreateHabitLog.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Exercise: Yes')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Exercise: Yes'));
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save habit logs. Please try again.')).toBeInTheDocument();
    });
  });
});
