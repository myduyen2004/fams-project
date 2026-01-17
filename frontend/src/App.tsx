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
const NotificationManagementPage = lazy(() => import('./pages/admin/NotificationManagementPage').then(m => ({ default: m.NotificationManagementPage })));
const CreateNotificationPage = lazy(() => import('./pages/admin/CreateNotificationPage').then(m => ({ default: m.CreateNotificationPage })));
const EditNotificationPage = lazy(() => import('./pages/admin/EditNotificationPage').then(m => ({ default: m.EditNotificationPage })));
const NotificationDetailPage = lazy(() => import('./pages/admin/NotificationDetailPage').then(m => ({ default: m.NotificationDetailPage })));
const UserNotificationDetailPage = lazy(() => import('./pages/UserNotificationDetailPage').then(m => ({ default: m.UserNotificationDetailPage })));
const NotificationListPage = lazy(() => import('./pages/NotificationListPage').then(m => ({ default: m.NotificationListPage })));
const SystemLogsPage = lazy(() => import('./pages/admin/SystemLogsPage').then(m => ({ default: m.SystemLogsPage })));
const UsersPage = lazy(() => import('./pages/admin/UsersPage').then(m => ({ default: m.UsersPage })));
const ActivatedUsersPage = lazy(() => import('./pages/admin/ActivatedUsersPage').then(m => ({ default: m.ActivatedUsersPage })));
const LockedUsersPage = lazy(() => import('./pages/admin/LockedUsersPage').then(m => ({ default: m.LockedUsersPage })));
const ProfilePage = lazy(() => import('./pages/admin/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AcademicStaffDashboard = lazy(() => import('./pages/academic-staff/AcademicStaffDashboard').then(m => ({ default: m.AcademicStaffDashboard })));
const AcademicStaffProfilePage = lazy(() => import('./pages/academic-staff/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ManagerLecturersPage = lazy(() => import('./pages/academic-staff/ManagerLecturersPage').then(m => ({ default: m.ManagerLecturersPage })));
const SemestersPage = lazy(() => import('./pages/academic-staff/SemestersPage').then(m => ({ default: m.SemestersPage })));
const MajorManagement = lazy(() => import('./pages/academic-staff/MajorManagement').then(m => ({ default: m.MajorManagement })));
const MajorDetail = lazy(() => import('./pages/academic-staff/MajorDetail').then(m => ({ default: m.MajorDetail })));
const SlotTypePage = lazy(() => import('./pages/academic-staff/SlotTypePage').then(m => ({ default: m.SlotTypePage })));
const ClassSectionManagement = lazy(() => import('./pages/academic-staff/ClassSectionManagement').then(m => ({ default: m.ClassSectionManagement })));
const SpecializationDetail = lazy(() => import('./pages/academic-staff/SpecializationDetail').then(m => ({ default: m.SpecializationDetail })));
const CourseManagement = lazy(() => import('./pages/academic-staff/CourseManagement').then(m => ({ default: m.CourseManagement })));
const ManagerStudentsPage = lazy(() => import('./pages/academic-staff/ManagerStudentsPage').then(m => ({ default: m.ManagerStudentsPage })));
const RoomManagement = lazy(() => import('./pages/academic-staff/RoomManagement').then(m => ({ default: m.RoomManagement })));
const RoomDetail = lazy(() => import('./pages/academic-staff/RoomDetail').then(m => ({ default: m.RoomDetail })));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-zinc-950">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-fpt-orange" />
      <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">Loading components...</span>
    </div>
  </div>
);

const ComingSoon = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
      <Loader2 className="w-8 h-8 text-fpt-orange animate-spin" />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
    <p className="text-gray-500 dark:text-zinc-400 text-center max-w-md">
      Tính năng này đang được phát triển. Vui lòng quay lại sau!
    </p>
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
            path="/admin/notification-management"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'ACADEMIC_STAFF']}>
                <NotificationManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/notification-management"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <NotificationManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications/create"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <CreateNotificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/notifications/create"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <CreateNotificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <EditNotificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/notifications/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <EditNotificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications/:id"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <NotificationDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/notifications/:id"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <NotificationDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STUDENT', 'LECTURER', 'ACADEMIC_STAFF']}>
                <NotificationListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications/:id"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STUDENT', 'LECTURER', 'ACADEMIC_STAFF']}>
                <UserNotificationDetailPage />
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
            path="/academic-staff/lecturers"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <ManagerLecturersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/semesters"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <SemestersPage />
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
          <Route
            path="/academic-staff/semesters/:semesterCode/config"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <SlotTypePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/semesters/:semesterCode/class-sections"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <ClassSectionManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/specializations/:id"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <SpecializationDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/courses"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <CourseManagement />
              </ProtectedRoute>
            }
          />

          {/* Academic Staff Coming Soon Routes */}
          <Route path="/academic-staff/schedule" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ComingSoon title="Thời khóa biểu" /></ProtectedRoute>} />
          <Route path="/academic-staff/classes" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ComingSoon title="Quản lý lớp học" /></ProtectedRoute>} />
          <Route path="/academic-staff/accounts" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ComingSoon title="Quản lý tài khoản" /></ProtectedRoute>} />
          <Route
            path="/academic-staff/students"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <ManagerStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/academic-staff/academic-results" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ComingSoon title="Kết quả học tập" /></ProtectedRoute>} />
          <Route path="/academic-staff/requests" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ComingSoon title="Đơn yêu cầu" /></ProtectedRoute>} />
          <Route path="/academic-staff/announcements" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ComingSoon title="Cài đặt thông báo" /></ProtectedRoute>} />
          <Route path="/academic-staff/attendance" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ComingSoon title="Cài đặt điểm danh" /></ProtectedRoute>} />
          <Route
            path="/academic-staff/rooms"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <RoomManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/rooms/:id"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <RoomDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/academic-staff/alerts" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ComingSoon title="Cảnh báo hệ thống" /></ProtectedRoute>} />
          <Route path="/academic-staff/logs" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ComingSoon title="Nhật ký hệ thống" /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
