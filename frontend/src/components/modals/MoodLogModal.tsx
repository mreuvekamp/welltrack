import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createMoodLog } from '@/services/mood-log-service';
import { isAxiosError } from 'axios';

const moodLogSchema = z.object({
  mood_score: z.number().min(1).max(5),
  energy_level: z.number().min(1).max(5).optional(),
  stress_level: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  logged_at: z.string().min(1, 'Date/time is required'),
});

type MoodLogFormData = z.infer<typeof moodLogSchema>;

/** Mood descriptor labels for 1-5 scale */
const moodLabels: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
};

/** Mood visual indicators for the 5-point scale */
const moodIcons: Record<number, string> = {
  1: '\u{1F61E}',
  2: '\u{1F615}',
  3: '\u{1F610}',
  4: '\u{1F60A}',
  5: '\u{1F604}',
};

/** Mood color classes matching the theme */
const moodColorClasses: Record<number, string> = {
  1: 'bg-mood-1',
  2: 'bg-mood-2',
  3: 'bg-mood-3',
  4: 'bg-mood-4',
  5: 'bg-mood-5',
};

const moodBorderClasses: Record<number, string> = {
  1: 'border-mood-1 ring-mood-1/30',
  2: 'border-mood-2 ring-mood-2/30',
  3: 'border-mood-3 ring-mood-3/30',
  4: 'border-mood-4 ring-mood-4/30',
  5: 'border-mood-5 ring-mood-5/30',
};

/**
 * Modal for logging mood with 5-point emoji scale, optional energy/stress levels.
 */
export default function MoodLogModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
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
    formState: { errors, isSubmitting },
  } = useForm<MoodLogFormData>({
    resolver: zodResolver(moodLogSchema),
    defaultValues: {
      mood_score: 3,
      energy_level: undefined,
      stress_level: undefined,
      notes: '',
      logged_at: localISOString,
    },
  });

  async function onSubmit(data: MoodLogFormData) {
    setApiError(null);
    try {
      await createMoodLog({
        mood_score: data.mood_score,
        energy_level: data.energy_level,
        stress_level: data.stress_level,
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
        setApiError('Failed to save mood log. Please try again.');
      }
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
          <p className="text-lg font-semibold text-teal-700">Mood logged!</p>
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
          <h2 className="text-lg font-semibold text-warm-900">Log Mood</h2>
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

          {/* Mood score - 5-point emoji scale */}
          <div>
            <label className="mb-2 block text-sm font-medium text-warm-800">
              How are you feeling?
            </label>
            <Controller
              name="mood_score"
              control={control}
              render={({ field }) => (
                <div>
                  <div className="flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => field.onChange(value)}
                        className={`flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 transition-all ${
                          field.value === value
                            ? `${moodBorderClasses[value]} ring-2`
                            : 'border-warm-200 hover:border-warm-300'
                        }`}
                        aria-label={`Mood: ${moodLabels[value]}`}
                        aria-pressed={field.value === value}
                      >
                        <span className="text-2xl">{moodIcons[value]}</span>
                        <span className="text-[10px] font-medium text-warm-600">
                          {moodLabels[value]}
                        </span>
                      </button>
                    ))}
                  </div>
                  {/* Active mood indicator bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className={`h-2 flex-1 rounded-full ${moodColorClasses[field.value]}`}
                    />
                    <span className="text-xs font-medium text-warm-600">
                      {moodLabels[field.value]}
                    </span>
                  </div>
                </div>
              )}
            />
          </div>

          {/* Energy level - optional 1-5 scale */}
          <div>
            <label className="mb-2 block text-sm font-medium text-warm-800">
              Energy level (optional)
            </label>
            <Controller
              name="energy_level"
              control={control}
              render={({ field }) => (
                <ScaleSelector
                  value={field.value}
                  onChange={field.onChange}
                  labels={['Very low', 'Low', 'Medium', 'High', 'Very high']}
                  ariaPrefix="Energy"
                />
              )}
            />
          </div>

          {/* Stress level - optional 1-5 scale */}
          <div>
            <label className="mb-2 block text-sm font-medium text-warm-800">
              Stress level (optional)
            </label>
            <Controller
              name="stress_level"
              control={control}
              render={({ field }) => (
                <ScaleSelector
                  value={field.value}
                  onChange={field.onChange}
                  labels={['None', 'Mild', 'Moderate', 'High', 'Very high']}
                  ariaPrefix="Stress"
                />
              )}
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="mood-notes"
              className="mb-1.5 block text-sm font-medium text-warm-800"
            >
              Notes (optional)
            </label>
            <textarea
              id="mood-notes"
              rows={3}
              placeholder="Anything on your mind?"
              className="w-full rounded-lg border border-warm-200 bg-warm-50 px-4 py-3 text-warm-900 transition-colors placeholder:text-warm-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              {...register('notes')}
            />
          </div>

          {/* Date/time */}
          <div>
            <label
              htmlFor="mood-logged-at"
              className="mb-1.5 block text-sm font-medium text-warm-800"
            >
              Date & Time
            </label>
            <input
              id="mood-logged-at"
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
              disabled={isSubmitting}
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

// ─── ScaleSelector subcomponent ──────────────────────────────────────────

/**
 * Reusable 1-5 scale selector with clickable buttons.
 * Used for energy level and stress level inputs.
 */
function ScaleSelector({
  value,
  onChange,
  labels,
  ariaPrefix,
}: {
  value: number | undefined;
  onChange: (val: number | undefined) => void;
  labels: string[];
  ariaPrefix: string;
}) {
  return (
    <div className="flex gap-2">
      {labels.map((label, idx) => {
        const score = idx + 1;
        const isSelected = value === score;
        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(isSelected ? undefined : score)}
            className={`flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-2 text-center transition-all ${
              isSelected
                ? 'border-teal-500 bg-teal-50 text-teal-700 ring-1 ring-teal-500/30'
                : 'border-warm-200 text-warm-500 hover:border-warm-300 hover:text-warm-700'
            }`}
            aria-label={`${ariaPrefix}: ${label}`}
            aria-pressed={isSelected}
          >
            <span className="text-sm font-semibold">{score}</span>
            <span className="text-[9px] leading-tight">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
