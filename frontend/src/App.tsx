import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Login } from './pages/auth/Login';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { Dashboard } from './pages/admin/Dashboard';
import { RecentAccessPage } from './pages/admin/RecentAccessPage';
import { AlertsPage } from './pages/admin/AlertsPage';
import { NotificationsPage } from './pages/admin/NotificationsPage';
import { SystemLogsPage } from './pages/admin/SystemLogsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { ActivatedUsersPage } from './pages/admin/ActivatedUsersPage';
import { LockedUsersPage } from './pages/admin/LockedUsersPage';
import { ProfilePage } from './pages/admin/ProfilePage';
import { AcademicStaffDashboard } from './pages/academic-staff/AcademicStaffDashboard';
import { ProfilePage as AcademicStaffProfilePage } from './pages/academic-staff/ProfilePage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PublicRoute } from './components/common/PublicRoute';
import { Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;