import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PublicRoute } from './components/common/PublicRoute';

// Lazy load pages
const Login = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })));
const Dashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.Dashboard })));
const RecentAccessPage = lazy(() => import('./pages/admin/RecentAccessPage').then(m => ({ default: m.RecentAccessPage })));
const AlertsPage = lazy(() => import('./pages/admin/AlertsPage').then(m => ({ default: m.AlertsPage })));
const NotificationsPage = lazy(() => import('./pages/admin/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const SystemLogsPage = lazy(() => import('./pages/admin/SystemLogsPage').then(m => ({ default: m.SystemLogsPage })));
const UsersPage = lazy(() => import('./pages/admin/UsersPage').then(m => ({ default: m.UsersPage })));
const ActivatedUsersPage = lazy(() => import('./pages/admin/ActivatedUsersPage').then(m => ({ default: m.ActivatedUsersPage })));
const LockedUsersPage = lazy(() => import('./pages/admin/LockedUsersPage').then(m => ({ default: m.LockedUsersPage })));
const ProfilePage = lazy(() => import('./pages/admin/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AcademicStaffDashboard = lazy(() => import('./pages/academic-staff/AcademicStaffDashboard').then(m => ({ default: m.AcademicStaffDashboard })));
const AcademicStaffProfilePage = lazy(() => import('./pages/academic-staff/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const MajorManagement = lazy(() => import('./pages/academic-staff/MajorManagement').then(m => ({ default: m.MajorManagement })));
const MajorDetail = lazy(() => import('./pages/academic-staff/MajorDetail').then(m => ({ default: m.MajorDetail })));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-zinc-950">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-fpt-orange" />
      <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">Loading components...</span>
    </div>
  </div>
);

function App() {
  // Global listener for ChunkLoadError (caused by new deployments)
  useEffect(() => {
    const handleError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const errorMsg = 'message' in e ? e.message : (e as any).reason?.message;
      if (typeof errorMsg === 'string' && (
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('ChunkLoadError') ||
        errorMsg.includes('MIME type')
      )) {
        console.warn('Asset loading failed, reloading for newest version...', errorMsg);
        const lastReload = sessionStorage.getItem('last-reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload) > 10000) {
          sessionStorage.setItem('last-reload', now.toString());
          window.location.reload();
        }
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/recent-access"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <RecentAccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/alerts"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/system-logs"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <SystemLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activated-users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <ActivatedUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/locked-users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <LockedUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Academic Staff Routes */}
          <Route
            path="/academic-staff/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <AcademicStaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/profile"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <AcademicStaffProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/majors"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <MajorManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/majors/:id"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <MajorDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
