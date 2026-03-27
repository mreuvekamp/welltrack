import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSymptomLogs } from '@/services/symptom-service';
import { getMoodLogs } from '@/services/mood-log-service';
import { getMedicationLogs } from '@/services/medication-service';
import { getHabitLogs } from '@/services/habit-service';
import type { SymptomLog, MoodLog, MedicationLog, HabitLog } from '@/types';
import SymptomLogModal from '@/components/modals/SymptomLogModal';
import MoodLogModal from '@/components/modals/MoodLogModal';
import MedicationLogModal from '@/components/modals/MedicationLogModal';
import HabitLogModal from '@/components/modals/HabitLogModal';

/** Returns the start and end of today in ISO format for API queries */
function getTodayRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

/** Returns how many of the last 7 days (including today) have any logs */
function getWeekDaysLogged(
  symptomLogs: SymptomLog[],
  moodLogs: MoodLog[],
  medicationLogs: MedicationLog[],
  habitLogs: HabitLog[],
): number {
  const daysWithLogs = new Set<string>();
  const toDateKey = (dateStr: string) => dateStr.slice(0, 10);

  for (const log of symptomLogs) daysWithLogs.add(toDateKey(log.logged_at));
  for (const log of moodLogs) daysWithLogs.add(toDateKey(log.logged_at));
  for (const log of medicationLogs) daysWithLogs.add(toDateKey(log.created_at));
  for (const log of habitLogs) daysWithLogs.add(toDateKey(log.logged_at));

  return daysWithLogs.size;
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type ModalType = 'symptom' | 'mood' | 'medication' | 'habit' | null;

export default function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.display_name || user?.email?.split('@')[0] || 'there';

  const [loading, setLoading] = useState(true);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [weekDaysLogged, setWeekDaysLogged] = useState(0);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const fetchTodayData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getTodayRange();

      const [symptomRes, moodRes, medRes, habitRes] = await Promise.all([
        getSymptomLogs(startDate, endDate),
        getMoodLogs(startDate, endDate),
        getMedicationLogs(startDate, endDate),
        getHabitLogs(startDate, endDate),
      ]);

      setSymptomLogs(symptomRes.symptom_logs);
      setMoodLogs(moodRes.mood_logs);
      setMedicationLogs(medRes.medication_logs);
      setHabitLogs(habitRes.habit_logs);

      // Fetch the past 7 days for streak indicator
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 1);
      weekEnd.setHours(0, 0, 0, 0);

      const [weekSymptoms, weekMoods, weekMeds, weekHabits] = await Promise.all([
        getSymptomLogs(weekStart.toISOString(), weekEnd.toISOString()),
        getMoodLogs(weekStart.toISOString(), weekEnd.toISOString()),
        getMedicationLogs(weekStart.toISOString(), weekEnd.toISOString()),
        getHabitLogs(weekStart.toISOString(), weekEnd.toISOString()),
      ]);

      setWeekDaysLogged(
        getWeekDaysLogged(
          weekSymptoms.symptom_logs,
          weekMoods.mood_logs,
          weekMeds.medication_logs,
          weekHabits.habit_logs,
        ),
      );
    } catch {
      // Silently handle errors - user sees empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayData();
  }, [fetchTodayData]);

  /** Called when any modal saves successfully to refresh data */
  function handleModalSuccess() {
    setActiveModal(null);
    fetchTodayData();
  }

  const quickAddButtons: {
    label: string;
    modal: ModalType;
    icon: string;
    color: string;
  }[] = [
    {
      label: 'Symptoms',
      modal: 'symptom',
      icon: '\u2764\uFE0F\u200D\u{1FA79}',
      color: 'bg-red-50 text-red-700 hover:bg-red-100',
    },
    {
      label: 'Mood',
      modal: 'mood',
      icon: '\u{1F60A}',
      color: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    },
    {
      label: 'Meds',
      modal: 'medication',
      icon: '\u{1F48A}',
      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    },
    {
      label: 'Habits',
      modal: 'habit',
      icon: '\u2705',
      color: 'bg-teal-50 text-teal-700 hover:bg-teal-100',
    },
  ];

  return (
    <div className="p-4 md:p-6">
      {/* Date and greeting */}
      <div className="mb-6">
        <p className="text-sm text-text-muted">{formatDate()}</p>
        <h1 className="mt-1 text-2xl font-bold text-warm-900">
          {getGreeting()}, {displayName}
        </h1>
      </div>

      {/* Days logged this week */}
      <div className="mb-6 rounded-xl bg-teal-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
            <span className="text-sm font-bold text-teal-700">
              {loading ? '-' : weekDaysLogged}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-teal-800">
              {loading ? 'Loading...' : `${weekDaysLogged}/7 days logged this week`}
            </p>
            <p className="text-xs text-teal-600">Keep it up!</p>
          </div>
        </div>
      </div>

      {/* Quick-add buttons */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warm-500">
          Quick Add
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickAddButtons.map(({ label, modal, icon, color }) => (
            <button
              key={label}
              onClick={() => setActiveModal(modal)}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-4 py-3 font-medium transition-colors ${color}`}
            >
              <span className="text-2xl" role="img" aria-hidden="true">
                {icon}
              </span>
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Today's summary */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warm-500">
          Today&apos;s Summary
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-warm-100"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Symptom logs */}
            <SummaryCard
              title="Symptoms"
              count={symptomLogs.length}
              emptyText="No symptoms logged yet"
              color="border-l-red-300"
            >
              {symptomLogs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {symptomLogs.map((log) => (
                    <span
                      key={log.id}
                      className="inline-flex items-center gap-1 rounded-full bg-warm-100 px-2.5 py-0.5 text-xs text-warm-700"
                    >
                      {log.symptom?.name || 'Symptom'}{' '}
                      <SeverityDot severity={log.severity} />
                    </span>
                  ))}
                </div>
              )}
            </SummaryCard>

            {/* Mood logs */}
            <SummaryCard
              title="Mood"
              count={moodLogs.length}
              emptyText="No mood logged yet"
              color="border-l-amber-300"
            >
              {moodLogs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {moodLogs.map((log) => (
                    <span
                      key={log.id}
                      className="inline-flex items-center gap-1 rounded-full bg-warm-100 px-2.5 py-0.5 text-xs text-warm-700"
                    >
                      {moodLabel(log.mood_score)}
                      {log.energy_level && ` / Energy: ${log.energy_level}`}
                    </span>
                  ))}
                </div>
              )}
            </SummaryCard>

            {/* Medication logs */}
            <SummaryCard
              title="Medications"
              count={medicationLogs.length}
              emptyText="No medications logged yet"
              color="border-l-blue-300"
            >
              {medicationLogs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {medicationLogs.map((log) => (
                    <span
                      key={log.id}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${
                        log.taken
                          ? 'bg-green-100 text-green-700'
                          : 'bg-warm-100 text-warm-500'
                      }`}
                    >
                      {log.medication?.name || 'Medication'}
                      {log.taken ? ' (taken)' : ' (skipped)'}
                    </span>
                  ))}
                </div>
              )}
            </SummaryCard>

            {/* Habit logs */}
            <SummaryCard
              title="Habits"
              count={habitLogs.length}
              emptyText="No habits logged yet"
              color="border-l-teal-300"
            >
              {habitLogs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {habitLogs.map((log) => (
                    <span
                      key={log.id}
                      className="inline-flex items-center rounded-full bg-warm-100 px-2.5 py-0.5 text-xs text-warm-700"
                    >
                      {log.habit?.name || 'Habit'}
                    </span>
                  ))}
                </div>
              )}
            </SummaryCard>
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal === 'symptom' && (
        <SymptomLogModal
          onClose={() => setActiveModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
      {activeModal === 'mood' && (
        <MoodLogModal
          onClose={() => setActiveModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
      {activeModal === 'medication' && (
        <MedicationLogModal
          onClose={() => setActiveModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
      {activeModal === 'habit' && (
        <HabitLogModal
          onClose={() => setActiveModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────

function SummaryCard({
  title,
  count,
  emptyText,
  color,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  color: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${color}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-warm-800">{title}</h3>
        <span className="text-xs text-text-muted">
          {count === 0 ? emptyText : `${count} ${count === 1 ? 'entry' : 'entries'}`}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Small colored dot indicating severity level */
function SeverityDot({ severity }: { severity: number }) {
  const color =
    severity <= 3
      ? 'bg-severity-low'
      : severity <= 6
        ? 'bg-severity-medium'
        : 'bg-severity-high';
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color}`}
      title={`Severity: ${severity}/10`}
    />
  );
}

/** Map mood score to descriptive label */
function moodLabel(score: number): string {
  const labels: Record<number, string> = {
    1: 'Very Low',
    2: 'Low',
    3: 'Okay',
    4: 'Good',
    5: 'Great',
  };
  return labels[score] || `Mood: ${score}`;
}
