import React, { useState, useEffect } from 'react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { Users, GraduationCap, Loader2 } from 'lucide-react';
import { academicStaffService } from '../../services/api/academicStaffService';
import { dashboardService } from '../../services/api/dashboardService';
import { AcademicStaffDashboardResponse, AppNotification } from '../../types/dashboard';
import { NotificationsSection } from '../../components/admin/dashboard/NotificationsSection';
import toast from 'react-hot-toast';

export const AcademicStaffDashboard: React.FC = () => {
  const [data, setData] = useState<AcademicStaffDashboardResponse | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch both dashboard data and notifications
        const [dashboardData, notificationsData] = await Promise.all([
          academicStaffService.getDashboardData(),
          dashboardService.getNotifications()
        ]);
        setData(dashboardData);
        setNotifications(notificationsData || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('Không thể tải dữ liệu dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AcademicStaffLayout pageTitle="Dashboard">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Loader2 className="w-10 h-10 text-fpt-orange animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</p>
        </div>
      </AcademicStaffLayout>
    );
  }

  if (!data) {
    return (
      <AcademicStaffLayout pageTitle="Dashboard">
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-gray-500 dark:text-gray-400">Không có dữ liệu hiển thị</p>
        </div>
      </AcademicStaffLayout>
    );
  }

  const stats = [
    {
      label: 'Sinh viên',
      value: (Number(data.stats?.totalStudents) || 0).toLocaleString(),
      icon: <Users className="w-5 h-5" />,
      color: 'bg-orange-100 text-orange-600',
      description: 'Xem danh sách sinh viên'
    },
    {
      label: 'Giảng viên',
      value: (Number(data.stats?.totalLecturers) || 0).toLocaleString(),
      icon: <GraduationCap className="w-5 h-5" />,
      color: 'bg-blue-100 text-blue-600',
      description: 'Xem danh sách giảng viên'
    }
  ];

  return (
    <AcademicStaffLayout pageTitle="Dashboard">
      <div className="space-y-6">
        {/* Top Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Top 100 Students (65%) */}
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top 100 sinh viên</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Sắp xếp theo: Toàn trường</span>
                    <button className="text-xs text-gray-400">▼</button>
                  </div>
                  <button className="text-xs text-fpt-orange hover:underline font-medium flex items-center gap-1">
                    Xem tất cả {"\u00bb\u00bb\u00bb"}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-zinc-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        STT
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Họ và tên
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Khóa
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        GPA
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                    {(data?.topStudents ?? []).slice(0, 6).map((student, idx) => (
                      <tr key={student?.rank ?? idx} className="hover:bg-gray-50 dark:hover:bg-zinc-800">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {student?.rank ?? idx + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fpt-orange to-orange-600 flex items-center justify-center text-white text-xs font-semibold">
                              {student?.name?.charAt(0) ?? 'S'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {student?.name ?? 'Sinh viên'}
                              </p>
                              <p className="text-[10px] text-gray-500">{student?.className ?? 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {student?.email ?? 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {student?.course ?? 'N/A'}
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                          {student?.gpa?.toFixed(1) ?? '0.0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Stats & Notifications (35%) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-zinc-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-medium text-gray-500 uppercase">{stat?.label ?? 'N/A'}</span>
                    <div className={`p-1.5 rounded-lg ${stat?.color ?? 'bg-gray-100'}`}>
                      {stat?.icon}
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{stat?.value ?? '0'}</p>
                  <p className="text-[9px] text-gray-400 hover:text-fpt-orange cursor-pointer transition-colors mt-1">{stat?.description ?? ''}</p>
                </div>
              ))}
            </div>

            {/* Notifications List */}
            <NotificationsSection 
              notifications={notifications}
              isDashboard={true}
              viewAllUrl="/notifications"
            />
          </div>
        </div>

        {/* Bottom Section: Attendance Chart */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Attendance Chart */}
          <div className="md:col-span-12">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tỉ lệ điểm danh sinh viên</h2>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-center py-8 gap-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#22c55e]"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Điểm danh có mặt</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-[#ef4444]"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Điểm danh vắng mặt</span>
                  </div>
                </div>

                <div className="relative w-64 h-64">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#fee2e2" strokeWidth="12" />
                    {/* Green - Present */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="12"
                      strokeDasharray={`${((data?.attendanceStats?.present ?? 0) / (Math.max(1, (data?.attendanceStats?.present ?? 0) + (data?.attendanceStats?.absent ?? 0)))) * 251.33} 251.33`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    {/* Red - Absent */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="12"
                      strokeDasharray={`${((data?.attendanceStats?.absent ?? 0) / (Math.max(1, (data?.attendanceStats?.present ?? 0) + (data?.attendanceStats?.absent ?? 0)))) * 251.33} 251.33`}
                      strokeDashoffset={`-${((data?.attendanceStats?.present ?? 0) / (Math.max(1, (data?.attendanceStats?.present ?? 0) + (data?.attendanceStats?.absent ?? 0)))) * 251.33}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xs font-medium text-gray-500 uppercase">Thời gian</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{data?.attendanceStats?.date ?? 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AcademicStaffLayout>
  );
};
