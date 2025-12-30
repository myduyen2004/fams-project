import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { RecentAccessPage } from './pages/admin/RecentAccessPage';
import { AlertsPage } from './pages/admin/AlertsPage';
import { NotificationsPage } from './pages/admin/NotificationsPage';
import { SystemLogsPage } from './pages/admin/SystemLogsPage';
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;