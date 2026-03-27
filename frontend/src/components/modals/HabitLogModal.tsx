/** Stub - will be fully implemented in task 2.9 */
export default function HabitLogModal({
  onClose,
  onSuccess: _onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-warm-900">Log Habits</h2>
        <p className="mt-2 text-text-muted">Coming soon...</p>
        <button
          onClick={onClose}
          className="mt-4 rounded-lg bg-warm-100 px-4 py-2 text-sm font-medium text-warm-700 hover:bg-warm-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}
