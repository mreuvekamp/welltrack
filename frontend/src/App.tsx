import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import Layout from '@/components/Layout';

/** Placeholder pages for protected routes - will be replaced in later tasks */
function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-warm-900">Dashboard</h1>
      <p className="mt-2 text-text-muted">Your daily overview will appear here.</p>
    </div>
  );
}

function HistoryPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-warm-900">History</h1>
      <p className="mt-2 text-text-muted">Your past entries will appear here.</p>
    </div>
  );
}

function TrendsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-warm-900">Trends</h1>
      <p className="mt-2 text-text-muted">Your trends and analytics will appear here.</p>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-warm-900">Settings</h1>
      <p className="mt-2 text-text-muted">Your settings will appear here.</p>
    </div>
  );
}

/** Redirects / to /dashboard if authenticated, or /login if not */
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes with layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <Layout>
                  <HistoryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/trends"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrendsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <SettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
