import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getMedications } from '@/services/medication-service';
import { createMedicationLog } from '@/services/medication-service';
import type { Medication } from '@/types';
import { isAxiosError } from 'axios';

const medicationLogSchema = z.object({
  taken_at: z.string().optional(),
  notes: z.string().optional(),
});

type MedicationLogFormData = z.infer<typeof medicationLogSchema>;

/**
 * Modal for logging medications taken/not taken.
 * Displays a checklist of the user's active medications.
 */
export default function MedicationLogModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loadingMeds, setLoadingMeds] = useState(true);
  const [checkedMeds, setCheckedMeds] = useState<Set<string>>(new Set());
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const localISOString = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const { register, handleSubmit } = useForm<MedicationLogFormData>({
    resolver: zodResolver(medicationLogSchema),
    defaultValues: {
      taken_at: localISOString,
      notes: '',
    },
  });

  useEffect(() => {
    async function fetchMeds() {
      try {
        const data = await getMedications();
        const activeMeds = data.medications.filter((m) => m.is_active);
        setMedications(activeMeds);
      } catch {
        setApiError('Failed to load medications');
      } finally {
        setLoadingMeds(false);
      }
    }
    fetchMeds();
  }, []);

  function toggleMed(medId: string) {
    setCheckedMeds((prev) => {
      const next = new Set(prev);
      if (next.has(medId)) {
        next.delete(medId);
      } else {
        next.add(medId);
      }
      return next;
    });
  }

  async function onSubmit(data: MedicationLogFormData) {
    if (checkedMeds.size === 0) {
      setApiError('Please select at least one medication');
      return;
    }

    setApiError(null);
    setSubmitting(true);

    try {
      const takenAt = data.taken_at
        ? new Date(data.taken_at).toISOString()
        : undefined;

      // Create a log for each checked medication
      const promises = Array.from(checkedMeds).map((medId) =>
        createMedicationLog({
          medication_id: medId,
          taken: true,
          taken_at: takenAt,
          notes: data.notes || undefined,
        }),
      );

      await Promise.all(promises);

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 800);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setApiError(err.response.data.error);
      } else {
        setApiError('Failed to save medication logs. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) {
      onClose();
    }
  }

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mb-3 text-4xl">&#10003;</div>
          <p className="text-lg font-semibold text-teal-700">Medications logged!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-warm-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-warm-900">Log Medications</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-warm-500 hover:bg-warm-100 hover:text-warm-700"
            aria-label="Close"
          >
            &#10005;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
          {apiError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              {apiError}
            </div>
          )}

          {/* Medication checklist */}
          <div>
            <label className="mb-2 block text-sm font-medium text-warm-800">
              Which medications did you take?
            </label>

            {loadingMeds ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-warm-100"
                  />
                ))}
              </div>
            ) : medications.length === 0 ? (
              <div className="rounded-lg bg-warm-50 p-4 text-center text-sm text-text-muted">
                No active medications found. Add medications in Settings first.
              </div>
            ) : (
              <div className="space-y-2">
                {medications.map((med) => {
                  const isChecked = checkedMeds.has(med.id);
                  return (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => toggleMed(med.id)}
                      className={`flex w-full min-h-[56px] items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all ${
                        isChecked
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-warm-200 hover:border-warm-300'
                      }`}
                      aria-pressed={isChecked}
                      aria-label={`${med.name}${med.dosage ? ` ${med.dosage}` : ''}`}
                    >
                      {/* Checkbox indicator */}
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                          isChecked
                            ? 'border-teal-600 bg-teal-600 text-white'
                            : 'border-warm-300 bg-white'
                        }`}
                      >
                        {isChecked && (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-medium text-warm-900">
                          {med.name}
                        </p>
                        {(med.dosage || med.frequency) && (
                          <p className="text-xs text-text-muted">
                            {[med.dosage, med.frequency].filter(Boolean).join(' - ')}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Taken at time */}
          <div>
            <label
              htmlFor="med-taken-at"
              className="mb-1.5 block text-sm font-medium text-warm-800"
            >
              Taken at
            </label>
            <input
              id="med-taken-at"
              type="datetime-local"
              className="w-full rounded-lg border border-warm-200 bg-warm-50 px-4 py-3 text-warm-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              {...register('taken_at')}
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="med-notes"
              className="mb-1.5 block text-sm font-medium text-warm-800"
            >
              Notes (optional)
            </label>
            <textarea
              id="med-notes"
              rows={2}
              placeholder="Any side effects or notes..."
              className="w-full rounded-lg border border-warm-200 bg-warm-50 px-4 py-3 text-warm-900 transition-colors placeholder:text-warm-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              {...register('notes')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-warm-200 px-4 py-3 text-sm font-medium text-warm-700 transition-colors hover:bg-warm-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingMeds}
              className="flex-1 rounded-lg bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
