import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getSymptoms } from '@/services/symptom-service';
import { createSymptomLog } from '@/services/symptom-service';
import type { Symptom } from '@/types';
import { isAxiosError } from 'axios';

const symptomLogSchema = z.object({
  symptom_id: z.string().min(1, 'Please select a symptom'),
  severity: z.number().min(1).max(10),
  notes: z.string().optional(),
  logged_at: z.string().min(1, 'Date/time is required'),
});

type SymptomLogFormData = z.infer<typeof symptomLogSchema>;

/** Color for severity value (1-10) using the theme scale */
function severityColor(value: number): string {
  if (value <= 3) return 'bg-severity-low';
  if (value <= 6) return 'bg-severity-medium';
  return 'bg-severity-high';
}

function severityTextColor(value: number): string {
  if (value <= 3) return 'text-green-700';
  if (value <= 6) return 'text-amber-700';
  return 'text-red-700';
}

function severityLabel(value: number): string {
  if (value <= 2) return 'Mild';
  if (value <= 4) return 'Moderate';
  if (value <= 6) return 'Noticeable';
  if (value <= 8) return 'Severe';
  return 'Very severe';
}

/**
 * Modal for logging a symptom with severity scale and optional notes.
 * Uses react-hook-form with Zod validation.
 */
export default function SymptomLogModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loadingSymptoms, setLoadingSymptoms] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const localISOString = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SymptomLogFormData>({
    resolver: zodResolver(symptomLogSchema),
    defaultValues: {
      symptom_id: '',
      severity: 5,
      notes: '',
      logged_at: localISOString,
    },
  });

  // Watch severity to keep it reactive in the Controller
  watch('severity');

  useEffect(() => {
    async function fetchSymptoms() {
      try {
        const data = await getSymptoms();
        setSymptoms(data.symptoms.filter((s) => s.is_active));
      } catch {
        setApiError('Failed to load symptoms');
      } finally {
        setLoadingSymptoms(false);
      }
    }
    fetchSymptoms();
  }, []);

  async function onSubmit(data: SymptomLogFormData) {
    setApiError(null);
    try {
      await createSymptomLog({
        symptom_id: data.symptom_id,
        severity: data.severity,
        notes: data.notes || undefined,
        logged_at: new Date(data.logged_at).toISOString(),
      });
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 800);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setApiError(err.response.data.error);
      } else {
        setApiError('Failed to save symptom log. Please try again.');
      }
    }
  }

  /** Close modal when clicking the overlay backdrop */
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
          <p className="text-lg font-semibold text-teal-700">Symptom logged!</p>
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
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-warm-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-warm-900">Log Symptom</h2>
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
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700\" role="alert">
              {apiError}
            </div>
          )}

          {/* Symptom selector */}
          <div>
            <label
              htmlFor="symptom_id"
              className="mb-1.5 block text-sm font-medium text-warm-800"
            >
              Symptom
            </label>
            {loadingSymptoms ? (
              <div className="h-12 animate-pulse rounded-lg bg-warm-100" />
            ) : (
              <select
                id="symptom_id"
                className="w-full rounded-lg border border-warm-200 bg-warm-50 px-4 py-3 text-warm-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                {...register('symptom_id')}
              >
                <option value="">Select a symptom...</option>
                {symptoms.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            )}
            {errors.symptom_id && (
              <p className="mt-1.5 text-sm text-red-600">
                {errors.symptom_id.message}
              </p>
            )}
          </div>

          {/* Severity slider */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-warm-800">
              Severity
            </label>
            <Controller
              name="severity"
              control={control}
              render={({ field }) => (
                <div>
                  {/* Visual severity indicator */}
                  <div className="mb-2 flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full ${severityColor(field.value)}`}
                    >
                      <span className="text-lg font-bold text-white">
                        {field.value}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${severityTextColor(field.value)}`}>
                      {severityLabel(field.value)}
                    </span>
                  </div>
                  {/* Slider */}
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="severity-slider w-full cursor-pointer"
                    aria-label={`Severity: ${field.value} out of 10`}
                  />
                  {/* Scale labels */}
                  <div className="mt-1 flex justify-between text-xs text-text-muted">
                    <span>1 - Mild</span>
                    <span>10 - Severe</span>
                  </div>
                </div>
              )}
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="symptom-notes"
              className="mb-1.5 block text-sm font-medium text-warm-800"
            >
              Notes (optional)
            </label>
            <textarea
              id="symptom-notes"
              rows={3}
              placeholder="How does it feel? Any triggers?"
              className="w-full rounded-lg border border-warm-200 bg-warm-50 px-4 py-3 text-warm-900 transition-colors placeholder:text-warm-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              {...register('notes')}
            />
          </div>

          {/* Date/time */}
          <div>
            <label
              htmlFor="symptom-logged-at"
              className="mb-1.5 block text-sm font-medium text-warm-800"
            >
              Date & Time
            </label>
            <input
              id="symptom-logged-at"
              type="datetime-local"
              className="w-full rounded-lg border border-warm-200 bg-warm-50 px-4 py-3 text-warm-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              {...register('logged_at')}
            />
            {errors.logged_at && (
              <p className="mt-1.5 text-sm text-red-600">
                {errors.logged_at.message}
              </p>
            )}
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
              disabled={isSubmitting || loadingSymptoms}
              className="flex-1 rounded-lg bg-teal-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
