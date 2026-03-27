import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SymptomLogModal from './SymptomLogModal';

const mockGetSymptoms = vi.fn();
const mockCreateSymptomLog = vi.fn();

vi.mock('@/services/symptom-service', () => ({
  getSymptoms: (...args: unknown[]) => mockGetSymptoms(...args),
  createSymptomLog: (...args: unknown[]) => mockCreateSymptomLog(...args),
}));

const defaultSymptoms = {
  symptoms: [
    { id: 's1', user_id: null, name: 'Headache', category: 'pain', is_active: true },
    { id: 's2', user_id: null, name: 'Fatigue', category: 'general', is_active: true },
    { id: 's3', user_id: null, name: 'Hidden', category: 'other', is_active: false },
  ],
};

function renderModal(props?: Partial<{ onClose: () => void; onSuccess: () => void }>) {
  const onClose = props?.onClose ?? vi.fn();
  const onSuccess = props?.onSuccess ?? vi.fn();
  return {
    onClose,
    onSuccess,
    ...render(<SymptomLogModal onClose={onClose} onSuccess={onSuccess} />),
  };
}

describe('SymptomLogModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSymptoms.mockResolvedValue(defaultSymptoms);
    mockCreateSymptomLog.mockResolvedValue({ symptom_log: { id: 'log1' } });
  });

  it('renders the modal with title and form fields', async () => {
    renderModal();

    expect(screen.getByText('Log Symptom')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText('Symptom')).toBeInTheDocument();
    });

    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Date & Time')).toBeInTheDocument();
  });

  it('loads and displays only active symptoms in dropdown', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Headache (pain)')).toBeInTheDocument();
      expect(screen.getByText('Fatigue (general)')).toBeInTheDocument();
    });

    // Inactive symptom should not be shown
    expect(screen.queryByText('Hidden (other)')).not.toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation error when no symptom is selected', async () => {
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Please select a symptom')).toBeInTheDocument();
    });
  });

  it('submits the form and shows success message', async () => {
    const user = userEvent.setup();
    const { onSuccess } = renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Symptom')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Symptom'), 's1');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateSymptomLog).toHaveBeenCalledWith(
        expect.objectContaining({
          symptom_id: 's1',
          severity: 5,
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

  it('shows error message when API call fails', async () => {
    mockCreateSymptomLog.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByLabelText('Symptom')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Symptom'), 's1');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save symptom log. Please try again.')).toBeInTheDocument();
    });
  });
});
