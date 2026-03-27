import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * Wrapper component that redirects to /login if the user is not authenticated.
 * Shows a loading spinner while auth state is being determined.
 */
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600"
            role="status"
            aria-label="Loading"
          />
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
