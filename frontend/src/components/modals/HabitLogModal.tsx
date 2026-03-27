import { useState, useEffect, useRef } from 'react';
import { getHabits } from '@/services/habit-service';
import { createHabitLog } from '@/services/habit-service';
import type { Habit, TrackingType } from '@/types';
import { isAxiosError } from 'axios';

/** State for each habit's log value in the form */
interface HabitEntry {
  habit: Habit;
  value_boolean?: boolean;
  value_numeric?: string;
  /** Duration stored as hours and minutes for easier input */
  duration_hours: string;
  duration_minutes: string;
  notes: string;
}

/**
 * Modal for logging habits grouped by tracking type.
 * Supports boolean (toggle), numeric (number input), and duration (h/m) habits.
 */
export default function HabitLogModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [loadingHabits, setLoadingHabits] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loggedAt, setLoggedAt] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchHabits() {
      try {
        const data = await getHabits();
        const activeHabits = data.habits.filter((h) => h.is_active);
        setEntries(
          activeHabits.map((habit) => ({
            habit,
            value_boolean: undefined,
            value_numeric: '',
            duration_hours: '',
            duration_minutes: '',
            notes: '',
          })),
        );
      } catch {
        setApiError('Failed to load habits');
      } finally {
        setLoadingHabits(false);
      }
    }
    fetchHabits();
  }, []);

  function updateEntry(index: number, updates: Partial<HabitEntry>) {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...updates } : entry)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    // Only submit entries that have a value set
    const toSubmit = entries.filter((entry) => {
      if (entry.habit.tracking_type === 'boolean') return entry.value_boolean !== undefined;
      if (entry.habit.tracking_type === 'numeric') return entry.value_numeric !== '';
      if (entry.habit.tracking_type === 'duration')
        return entry.duration_hours !== '' || entry.duration_minutes !== '';
      return false;
    });

    if (toSubmit.length === 0) {
      setApiError('Please log at least one habit');
      return;
    }

    setSubmitting(true);

    try {
      const isoLoggedAt = new Date(loggedAt).toISOString();

      const promises = toSubmit.map((entry) => {
        const payload: {
          habit_id: string;
          value_boolean?: boolean;
          value_numeric?: number;
          value_duration?: number;
          notes?: string;
          logged_at: string;
        } = {
          habit_id: entry.habit.id,
          logged_at: isoLoggedAt,
        };

        if (entry.notes) payload.notes = entry.notes;

        switch (entry.habit.tracking_type) {
          case 'boolean':
            payload.value_boolean = entry.value_boolean;
            break;
          case 'numeric':
            payload.value_numeric = parseFloat(entry.value_numeric || '0');
            break;
          case 'duration': {
            const hours = parseInt(entry.duration_hours || '0', 10);
            const minutes = parseInt(entry.duration_minutes || '0', 10);
            payload.value_duration = hours * 60 + minutes;
            break;
          }
        }

        return createHabitLog(payload);
      });

      await Promise.all(promises);

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 800);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setApiError(err.response.data.error);
      } else {
        setApiError('Failed to save habit logs. Please try again.');
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
          <p className="text-lg font-semibold text-teal-700">Habits logged!</p>
        </div>
      </div>
    );
  }

  // Group habits by tracking type for organized display
  const groupedEntries = groupByType(entries);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-warm-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-warm-900">Log Habits</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-warm-500 hover:bg-warm-100 hover:text-warm-700"
            aria-label="Close"
          >
            &#10005;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {apiError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              {apiError}
            </div>
          )}

          {loadingHabits ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-warm-100" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-lg bg-warm-50 p-4 text-center text-sm text-text-muted">
              No active habits found. Add habits in Settings first.
            </div>
          ) : (
            <>
              {/* Boolean habits */}
              {groupedEntries.boolean.length > 0 && (
                <HabitGroup title="Yes / No">
                  {groupedEntries.boolean.map((entry) => {
                    const idx = entries.indexOf(entry);
                    return (
                      <BooleanHabitRow
                        key={entry.habit.id}
                        entry={entry}
                        onChange={(val) => updateEntry(idx, { value_boolean: val })}
                      />
                    );
                  })}
                </HabitGroup>
              )}

              {/* Numeric habits */}
              {groupedEntries.numeric.length > 0 && (
                <HabitGroup title="Numeric">
                  {groupedEntries.numeric.map((entry) => {
                    const idx = entries.indexOf(entry);
                    return (
                      <NumericHabitRow
                        key={entry.habit.id}
                        entry={entry}
                        onChange={(val) => updateEntry(idx, { value_numeric: val })}
                      />
                    );
                  })}
                </HabitGroup>
              )}

              {/* Duration habits */}
              {groupedEntries.duration.length > 0 && (
                <HabitGroup title="Duration">
                  {groupedEntries.duration.map((entry) => {
                    const idx = entries.indexOf(entry);
                    return (
                      <DurationHabitRow
                        key={entry.habit.id}
                        entry={entry}
                        onChangeHours={(val) => updateEntry(idx, { duration_hours: val })}
                        onChangeMinutes={(val) => updateEntry(idx, { duration_minutes: val })}
                      />
                    );
                  })}
                </HabitGroup>
              )}
            </>
          )}

          {/* Date/time */}
          <div>
            <label
              htmlFor="habit-logged-at"
              className="mb-1.5 block text-sm font-medium text-warm-800"
            >
              Date & Time
            </label>
            <input
              id="habit-logged-at"
              type="datetime-local"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
              className="w-full rounded-lg border border-warm-200 bg-warm-50 px-4 py-3 text-warm-900 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
              disabled={submitting || loadingHabits}
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

// ─── Subcomponents ────────────────────────────────────────────────────────

function HabitGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-warm-500">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/** Boolean habit: toggle switch between yes/no */
function BooleanHabitRow({
  entry,
  onChange,
}: {
  entry: HabitEntry;
  onChange: (val: boolean | undefined) => void;
}) {
  const value = entry.value_boolean;
  return (
    <div className="flex items-center justify-between rounded-lg border border-warm-200 px-4 py-3">
      <span className="text-sm font-medium text-warm-900">{entry.habit.name}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(value === true ? undefined : true)}
          className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            value === true
              ? 'bg-teal-600 text-white'
              : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
          }`}
          aria-label={`${entry.habit.name}: Yes`}
          aria-pressed={value === true}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(value === false ? undefined : false)}
          className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            value === false
              ? 'bg-warm-500 text-white'
              : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
          }`}
          aria-label={`${entry.habit.name}: No`}
          aria-pressed={value === false}
        >
          No
        </button>
      </div>
    </div>
  );
}

/** Numeric habit: number input with unit label */
function NumericHabitRow({
  entry,
  onChange,
}: {
  entry: HabitEntry;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-warm-200 px-4 py-3">
      <span className="text-sm font-medium text-warm-900">{entry.habit.name}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="any"
          value={entry.value_numeric}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-20 rounded-lg border border-warm-200 bg-warm-50 px-3 py-2 text-right text-sm text-warm-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          aria-label={`${entry.habit.name} value`}
        />
        {entry.habit.unit && (
          <span className="text-xs text-text-muted">{entry.habit.unit}</span>
        )}
      </div>
    </div>
  );
}

/** Duration habit: hours and minutes inputs */
function DurationHabitRow({
  entry,
  onChangeHours,
  onChangeMinutes,
}: {
  entry: HabitEntry;
  onChangeHours: (val: string) => void;
  onChangeMinutes: (val: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-warm-200 px-4 py-3">
      <span className="text-sm font-medium text-warm-900">{entry.habit.name}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min="0"
          max="24"
          value={entry.duration_hours}
          onChange={(e) => onChangeHours(e.target.value)}
          placeholder="0"
          className="w-14 rounded-lg border border-warm-200 bg-warm-50 px-2 py-2 text-right text-sm text-warm-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          aria-label={`${entry.habit.name} hours`}
        />
        <span className="text-xs text-text-muted">h</span>
        <input
          type="number"
          min="0"
          max="59"
          value={entry.duration_minutes}
          onChange={(e) => onChangeMinutes(e.target.value)}
          placeholder="0"
          className="w-14 rounded-lg border border-warm-200 bg-warm-50 px-2 py-2 text-right text-sm text-warm-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          aria-label={`${entry.habit.name} minutes`}
        />
        <span className="text-xs text-text-muted">m</span>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function groupByType(entries: HabitEntry[]): Record<TrackingType, HabitEntry[]> {
  return {
    boolean: entries.filter((e) => e.habit.tracking_type === 'boolean'),
    numeric: entries.filter((e) => e.habit.tracking_type === 'numeric'),
    duration: entries.filter((e) => e.habit.tracking_type === 'duration'),
  };
}
