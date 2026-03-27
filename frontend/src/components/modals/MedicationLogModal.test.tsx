import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MedicationLogModal from './MedicationLogModal';

const mockGetMedications = vi.fn();
const mockCreateMedicationLog = vi.fn();

vi.mock('@/services/medication-service', () => ({
  getMedications: (...args: unknown[]) => mockGetMedications(...args),
  createMedicationLog: (...args: unknown[]) => mockCreateMedicationLog(...args),
}));

const defaultMedications = {
  medications: [
    {
      id: 'm1',
      user_id: 'u1',
      name: 'Ibuprofen',
      dosage: '200mg',
      frequency: 'Twice daily',
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'm2',
      user_id: 'u1',
      name: 'Vitamin D',
      dosage: '1000 IU',
      frequency: null,
      is_active: true,
      created_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: 'm3',
      user_id: 'u1',
      name: 'Inactive Med',
      dosage: null,
      frequency: null,
      is_active: false,
      created_at: '2025-01-01T00:00:00.000Z',
    },
  ],
};

function renderModal(props?: Partial<{ onClose: () => void; onSuccess: () => void }>) {
  const onClose = props?.onClose ?? vi.fn();
  const onSuccess = props?.onSuccess ?? vi.fn();
  return {
    onClose,
    onSuccess,
    ...render(<MedicationLogModal onClose={onClose} onSuccess={onSuccess} />),
  };
}

describe('MedicationLogModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMedications.mockResolvedValue(defaultMedications);
    mockCreateMedicationLog.mockResolvedValue({ medication_log: { id: 'log1' } });
  });

  it('renders the modal with title', async () => {
    renderModal();

    expect(screen.getByText('Log Medications')).toBeInTheDocument();
    expect(screen.getByText('Which medications did you take?')).toBeInTheDocument();
  });

  it('loads and displays only active medications', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Ibuprofen')).toBeInTheDocument();
      expect(screen.getByText('Vitamin D')).toBeInTheDocument();
    });

    // Inactive medication should not be shown
    expect(screen.queryByText('Inactive Med')).not.toBeInTheDocument();
  });

  it('displays medication dosage and frequency', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('200mg - Twice daily')).toBeInTheDocument();
      expect(screen.getByText('1000 IU')).toBeInTheDocument();
    });
  });

  it('toggles medication selection when clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Ibuprofen')).toBeInTheDocument();
    });

    const ibuprofenBtn = screen.getByLabelText('Ibuprofen 200mg');
    expect(ibuprofenBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(ibuprofenBtn);
    expect(ibuprofenBtn).toHaveAttribute('aria-pressed', 'true');

    // Toggle off
    await user.click(ibuprofenBtn);
    expect(ibuprofenBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error when submitting without selecting any medication', async () => {
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Ibuprofen')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Please select at least one medication')).toBeInTheDocument();
    });
  });

  it('submits logs for each checked medication', async () => {
    const user = userEvent.setup();
    const { onSuccess } = renderModal();

    await waitFor(() => {
      expect(screen.getByText('Ibuprofen')).toBeInTheDocument();
    });

    // Check both medications
    await user.click(screen.getByLabelText('Ibuprofen 200mg'));
    await user.click(screen.getByLabelText('Vitamin D 1000 IU'));
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateMedicationLog).toHaveBeenCalledTimes(2);
      expect(mockCreateMedicationLog).toHaveBeenCalledWith(
        expect.objectContaining({
          medication_id: 'm1',
          taken: true,
        }),
      );
      expect(mockCreateMedicationLog).toHaveBeenCalledWith(
        expect.objectContaining({
          medication_id: 'm2',
          taken: true,
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

  it('shows empty state when no active medications exist', async () => {
    mockGetMedications.mockResolvedValue({ medications: [] });
    renderModal();

    await waitFor(() => {
      expect(screen.getByText(/No active medications found/)).toBeInTheDocument();
    });
  });

  it('shows error message when API call fails', async () => {
    mockCreateMedicationLog.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    renderModal();

    await waitFor(() => {
      expect(screen.getByText('Ibuprofen')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Ibuprofen 200mg'));
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save medication logs. Please try again.')).toBeInTheDocument();
    });
  });
});
