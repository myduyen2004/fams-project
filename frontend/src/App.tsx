import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PublicRoute } from './components/common/PublicRoute';
import { FloatingChatWidget } from './components/common/FloatingChatWidget';
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
const SchedulePage = lazy(() => import('./pages/academic-staff/SchedulePage').then(m => ({ default: m.SchedulePage })));
const MajorManagement = lazy(() => import('./pages/academic-staff/MajorManagement').then(m => ({ default: m.MajorManagement })));
const MajorDetail = lazy(() => import('./pages/academic-staff/MajorDetail').then(m => ({ default: m.MajorDetail })));
const SlotTypePage = lazy(() => import('./pages/academic-staff/SlotTypePage').then(m => ({ default: m.SlotTypePage })));
const ClassSectionManagement = lazy(() => import('./pages/academic-staff/ClassSectionManagement').then(m => ({ default: m.ClassSectionManagement })));
const SpecializationDetail = lazy(() => import('./pages/academic-staff/SpecializationDetail').then(m => ({ default: m.SpecializationDetail })));
const CourseManagement = lazy(() => import('./pages/academic-staff/CourseManagement').then(m => ({ default: m.CourseManagement })));
const GradeConfigurationPage = lazy(() => import('./pages/academic-staff/GradeConfigurationPage').then(m => ({ default: m.GradeConfigurationPage })));
const ManagerStudentsPage = lazy(() => import('./pages/academic-staff/ManagerStudentsPage').then(m => ({ default: m.ManagerStudentsPage })));
const RoomManagement = lazy(() => import('./pages/academic-staff/RoomManagement').then(m => ({ default: m.RoomManagement })));
const RoomDetail = lazy(() => import('./pages/academic-staff/RoomDetail').then(m => ({ default: m.RoomDetail })));
const WiFiAPManagement = lazy(() => import('./pages/academic-staff/WiFiAPManagement').then(m => ({ default: m.WiFiAPManagement })));
const ScheduleRequestPage = lazy(() => import('./pages/academic-staff/ScheduleRequestPage').then(m => ({ default: m.ScheduleRequestPage })));
const RequestDetailPage = lazy(() => import('./pages/academic-staff/RequestDetailPage').then(m => ({ default: m.RequestDetailPage })));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const LecturerDashboard = lazy(() => import('./pages/lecturer/LecturerDashboard').then(m => ({ default: m.LecturerDashboard })));
const StudentSchedulePage = lazy(() => import('./pages/student/StudentSchedulePage').then(m => ({ default: m.StudentSchedulePage })));
const LeturerClassManagementPage = lazy(() => import('./pages/lecturer/LeturerClassManagementPage').then(m => ({ default: m.LeturerClassManagementPage })));
const LeturerClassDetailPage = lazy(() => import('./pages/lecturer/LeturerClassDetailPage').then(m => ({ default: m.LeturerClassDetailPage })));
const LecturerRequestPage = lazy(() => import('./pages/lecturer/LecturerRequestPage').then(m => ({ default: m.LecturerRequestPage })));
const LecturerRequestDetailPage = lazy(() => import('./pages/lecturer/LecturerRequestDetailPage').then(m => ({ default: m.LecturerRequestDetailPage })));
const LecturerCreateRequestPage = lazy(() => import('./pages/lecturer/LecturerCreateRequestPage').then(m => ({ default: m.LecturerCreateRequestPage })));
const LecturerSchedulePage = lazy(() => import('./pages/lecturer/LecturerSchedulePage').then(m => ({ default: m.LecturerSchedulePage })));
const AttendanceSessionPage = lazy(() => import('./pages/lecturer/AttendanceSessionPage').then(m => ({ default: m.AttendanceSessionPage })));
const RealTimeAttendancePage = lazy(() => import('./pages/lecturer/RealTimeAttendancePage').then(m => ({ default: m.RealTimeAttendancePage })));
const LecturerGradeManagementPage = lazy(() => import('./pages/lecturer/LecturerGradeManagementPage').then(m => ({ default: m.LecturerGradeManagementPage })));
const ExamGradeManagementPage = lazy(() => import('./pages/academic-staff/ExamGradeManagementPage').then(m => ({ default: m.ExamGradeManagementPage })));
const ResitGradeManagementPage = lazy(() => import('./pages/academic-staff/ResitGradeManagementPage').then(m => ({ default: m.ResitGradeManagementPage })));
const AttendanceConfigPage = lazy(() => import('./pages/academic-staff/AttendanceConfigPage').then(m => ({ default: m.AttendanceConfigPage })));
const LecturerAssignmentPage = lazy(() => import('./pages/lecturer/LecturerAssignmentPage').then(m => ({ default: m.LecturerAssignmentPage })));
const LecturerAssignmentDetailPage = lazy(() => import('./pages/lecturer/LecturerAssignmentDetailPage').then(m => ({ default: m.LecturerAssignmentDetailPage })));
const LecturerMessagesPage = lazy(() => import('./pages/lecturer/LecturerMessagesPage').then(m => ({ default: m.LecturerMessagesPage })));
const StudentGradesPage = lazy(() => import('./pages/student/StudentGradesPage').then(m => ({ default: m.StudentGradesPage })));
const StudentAssignmentPage = lazy(() => import('./pages/student/StudentAssignmentPage').then(m => ({ default: m.StudentAssignmentPage })));
const StudentMessagesPage = lazy(() => import('./pages/student/StudentMessagesPage').then(m => ({ default: m.StudentMessagesPage })));
const ChatPage = lazy(() => import('./pages/chatbot/ChatPage').then(m => ({ default: m.ChatPage })));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-zinc-950">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-fpt-orange" />
      <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">Loading FAMS components...</span>
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
          <Route
            path="/chatbot"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />

          {/* Academic Staff Routes */}


          {/* Lecturer Routes */}
          <Route
            path="/lecturer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['LECTURER']}>
                <LecturerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/lecturer/schedule" element={<ProtectedRoute allowedRoles={['LECTURER']}><LecturerSchedulePage /></ProtectedRoute>} />
          <Route path="/lecturer/attendance/session/:sessionId" element={<ProtectedRoute allowedRoles={['LECTURER']}><AttendanceSessionPage /></ProtectedRoute>} />
          <Route path="/lecturer/attendance/realtime/:slotId" element={<ProtectedRoute allowedRoles={['LECTURER']}><RealTimeAttendancePage /></ProtectedRoute>} />
          <Route path="/lecturer/attendance" element={<ProtectedRoute allowedRoles={['LECTURER']}><ComingSoon title="Điểm danh" /></ProtectedRoute>} />
          <Route path="/lecturer/grades" element={<ProtectedRoute allowedRoles={['LECTURER']}><LecturerGradeManagementPage /></ProtectedRoute>} />
          <Route path="/lecturer/assignments" element={<ProtectedRoute allowedRoles={['LECTURER']}><LecturerAssignmentPage /></ProtectedRoute>} />
          <Route path="/lecturer/assignments/:id" element={<ProtectedRoute allowedRoles={['LECTURER']}><LecturerAssignmentDetailPage /></ProtectedRoute>} />
          <Route path="/lecturer/classes" element={<ProtectedRoute allowedRoles={['LECTURER']}><LeturerClassManagementPage /></ProtectedRoute>} />
          <Route path="/lecturer/classes/:className" element={<ProtectedRoute allowedRoles={['LECTURER']}><LeturerClassDetailPage /></ProtectedRoute>} />
          <Route path="/lecturer/messages" element={<ProtectedRoute allowedRoles={['LECTURER']}><LecturerMessagesPage /></ProtectedRoute>} />
          <Route path="/lecturer/requests" element={<ProtectedRoute allowedRoles={['LECTURER']}><LecturerRequestPage /></ProtectedRoute>} />
          <Route path="/lecturer/requests/create" element={<ProtectedRoute allowedRoles={['LECTURER']}><LecturerCreateRequestPage /></ProtectedRoute>} />
          <Route path="/lecturer/requests/:id" element={<ProtectedRoute allowedRoles={['LECTURER']}><LecturerRequestDetailPage /></ProtectedRoute>} />
          <Route path="/lecturer/settings" element={<ProtectedRoute allowedRoles={['LECTURER']}><ComingSoon title="Cài đặt" /></ProtectedRoute>} />

          {/* Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/schedule"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/grades"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentGradesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentAssignmentPage /></ProtectedRoute>} />
          <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['STUDENT']}><ComingSoon title="Điểm danh" /></ProtectedRoute>} />
          <Route path="/student/study" element={<ProtectedRoute allowedRoles={['STUDENT']}><ComingSoon title="Học tập" /></ProtectedRoute>} />
          <Route path="/student/messages" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentMessagesPage /></ProtectedRoute>} />
          <Route path="/student/requests" element={<ProtectedRoute allowedRoles={['STUDENT']}><ComingSoon title="Gửi đơn yêu cầu" /></ProtectedRoute>} />
          <Route path="/student/settings" element={<ProtectedRoute allowedRoles={['STUDENT']}><ComingSoon title="Cài đặt" /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['STUDENT']}><ComingSoon title="Hồ sơ cá nhân" /></ProtectedRoute>} />
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
          <Route
            path="/academic-staff/courses/:courseId/grades"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <GradeConfigurationPage />
              </ProtectedRoute>
            }
          />

          {/* Academic Staff Coming Soon Routes */}
          <Route path="/academic-staff/schedule" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><SchedulePage /></ProtectedRoute>} />
          <Route path="/academic-staff/classes" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ComingSoon title="Quản lý lớp học" /></ProtectedRoute>} />
          <Route path="/academic-staff/exam-grades" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ExamGradeManagementPage /></ProtectedRoute>} />
          <Route path="/academic-staff/resit-grades" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ResitGradeManagementPage /></ProtectedRoute>} />
          <Route
            path="/academic-staff/requests"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <ScheduleRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/requests/:id"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <RequestDetailPage />
              </ProtectedRoute>
            }
          />
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
          <Route
            path="/academic-staff/requests"
            element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
              <ScheduleRequestPage />
            </ProtectedRoute>}
          />
          <Route path="/academic-staff/announcements" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><ComingSoon title="Cài đặt thông báo" /></ProtectedRoute>} />
          <Route path="/academic-staff/attendance" element={<ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}><AttendanceConfigPage /></ProtectedRoute>} />
          <Route
            path="/academic-staff/wifi-aps"
            element={
              <ProtectedRoute allowedRoles={['ACADEMIC_STAFF']}>
                <WiFiAPManagement />
              </ProtectedRoute>
            }
          />
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

        {/* Floating AI Chat Widget — visible on all authenticated pages */}
        <FloatingChatWidget />
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
