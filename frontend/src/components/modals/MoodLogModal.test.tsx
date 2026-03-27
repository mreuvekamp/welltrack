import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoodLogModal from './MoodLogModal';

const mockCreateMoodLog = vi.fn();

vi.mock('@/services/mood-log-service', () => ({
  createMoodLog: (...args: unknown[]) => mockCreateMoodLog(...args),
}));

function renderModal(props?: Partial<{ onClose: () => void; onSuccess: () => void }>) {
  const onClose = props?.onClose ?? vi.fn();
  const onSuccess = props?.onSuccess ?? vi.fn();
  return {
    onClose,
    onSuccess,
    ...render(<MoodLogModal onClose={onClose} onSuccess={onSuccess} />),
  };
}

describe('MoodLogModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMoodLog.mockResolvedValue({ mood_log: { id: 'log1' } });
  });

  it('renders the modal with title and mood scale', () => {
    renderModal();

    expect(screen.getByText('Log Mood')).toBeInTheDocument();
    expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
  });

  it('renders all 5 mood options', () => {
    renderModal();

    // Use aria-labels on the mood buttons to verify all 5 are present
    expect(screen.getByLabelText('Mood: Very Low')).toBeInTheDocument();
    expect(screen.getByLabelText('Mood: Low')).toBeInTheDocument();
    expect(screen.getByLabelText('Mood: Okay')).toBeInTheDocument();
    expect(screen.getByLabelText('Mood: Good')).toBeInTheDocument();
    expect(screen.getByLabelText('Mood: Great')).toBeInTheDocument();
  });

  it('renders energy and stress level sections', () => {
    renderModal();

    expect(screen.getByText('Energy level (optional)')).toBeInTheDocument();
    expect(screen.getByText('Stress level (optional)')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('selects a mood value when clicking a mood button', async () => {
    const user = userEvent.setup();
    renderModal();

    const goodButton = screen.getByLabelText('Mood: Good');
    await user.click(goodButton);

    expect(goodButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('submits the form with selected mood and shows success', async () => {
    const user = userEvent.setup();
    const { onSuccess } = renderModal();

    // Select "Great" mood
    await user.click(screen.getByLabelText('Mood: Great'));
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateMoodLog).toHaveBeenCalledWith(
        expect.objectContaining({
          mood_score: 5,
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

  it('toggles energy level on/off when clicking', async () => {
    const user = userEvent.setup();
    renderModal();

    const energyButton = screen.getByLabelText('Energy: High');
    await user.click(energyButton);
    expect(energyButton).toHaveAttribute('aria-pressed', 'true');

    // Click again to deselect
    await user.click(energyButton);
    expect(energyButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows error message when API call fails', async () => {
    mockCreateMoodLog.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save mood log. Please try again.')).toBeInTheDocument();
    });
  });
});
