import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { academicStaffService } from '../../services/api/academicStaffService';
import { AcademicStaffDashboardResponse } from '../../types/dashboard';
import toast from 'react-hot-toast';

// New Components
import { AnalyticalCards } from '../../components/academic-staff/dashboard/AnalyticalCards';
import { AttendanceFrequencyChart, DailyAttendanceDonut } from '../../components/academic-staff/dashboard/DashboardCharts';
import { PendingRequests, RunningRooms, SystemActivityLog } from '../../components/academic-staff/dashboard/DashboardLists';

export const AcademicStaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AcademicStaffDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  // Initial dashboard load (all data)
  const fetchDashboardData = useCallback(async (startDate: string) => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Dashboard data fetch timed out');
        setLoading(false);
        toast.error('Kết nối máy chủ chậm, đang hiển thị dữ liệu tạm thời');
      }
    }, 15000);

    try {
      setLoading(true);
      const dashboardData = await academicStaffService.getDashboardData(startDate);
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  // Weekly-only data reload (lightweight endpoint, only updates the chart)
  const fetchWeeklyData = useCallback(async (startDate: string) => {
    try {
      setWeeklyLoading(true);
      const weeklyData = await academicStaffService.getWeeklyAttendance(startDate);
      setData(prev => prev ? { ...prev, weeklyAttendance: weeklyData } : prev);
    } catch (error) {
      console.error('Failed to fetch weekly data:', error);
      toast.error('Không thể tải dữ liệu tuần');
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  // Initial load only once
  useEffect(() => {
    fetchDashboardData(selectedWeekStart);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When week changes (after initial load), only reload weekly chart
  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchWeeklyData(selectedWeekStart);
  }, [selectedWeekStart, fetchWeeklyData]);

  const handlePrevWeek = () => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() - 7);
    setSelectedWeekStart(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() + 7);
    setSelectedWeekStart(d.toISOString().split('T')[0]);
  };

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

  return (
    <AcademicStaffLayout pageTitle="Dashboard">


      <div className="space-y-6">
        {/* Row 1: Unified Monitoring Row (Horizontal Alignment as requested) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Analytical Cards (5/12) */}
          <div className="lg:col-span-5 h-full">
            <AnalyticalCards stats={data?.stats} />
          </div>

          {/* Notifications (3/12) */}
          <div className="lg:col-span-3 h-full">
            <div
              className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-zinc-800 h-full cursor-pointer hover:shadow-md transition-all duration-300 group/notif flex flex-col"
              onClick={() => navigate('/notifications')}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Thông báo mới
                </h3>
                {data?.unreadNotificationsCount !== undefined && data.unreadNotificationsCount > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                    {data.unreadNotificationsCount}
                  </span>
                )}
              </div>

              <div className="space-y-2 flex-grow">
                {data?.notifications && data.notifications.length > 0 ? (
                  data.notifications.slice(0, 3).map((notif, idx) => (
                    <div key={notif.id || idx} className={`p-3 rounded-xl border transition-all ${idx === 0 ? 'bg-zinc-50/50 dark:bg-zinc-800/30 border-gray-100 dark:border-zinc-800' : 'border-transparent hover:border-gray-100 dark:hover:border-zinc-800'}`}>
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{notif.title}</h5>
                      <p className="text-xs text-gray-500 mt-1">
                        {(() => {
                          if (!notif.timestamp) return 'Vừa xong';

                          const match = notif.timestamp.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
                          let date: Date | null = null;

                          if (match) {
                            const [_, day, month, year, hours, minutes] = match;
                            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
                          } else {
                            date = new Date(notif.timestamp);
                          }

                          return date && !isNaN(date.getTime())
                            ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                            : 'Vừa xong';
                        })()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div
                    className="py-12 text-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/20 rounded-xl transition-all border border-dashed border-gray-200 dark:border-zinc-800 h-full flex flex-col justify-center"
                    onClick={() => navigate('/notifications')}
                  >
                    <p className="text-sm text-gray-500 font-medium">Không có thông báo mới</p>
                    <p className="text-xs text-gray-400 mt-2">Nhấp để xem lịch sử</p>
                  </div>
                )}
              </div>

              <button
                className="w-full mt-2 text-xs font-semibold text-gray-500 hover:text-orange-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/notifications');
                }}
              >
                Xem tất cả thông báo
              </button>
            </div>
          </div>

          {/* Running Rooms (4/12) */}
          <div className="lg:col-span-4 h-full">
            <RunningRooms rooms={data?.runningRooms} total={data?.totalRunningRooms} />
          </div>
        </div>

        {/* Row 2: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 h-full">
            <AttendanceFrequencyChart
              data={data?.weeklyAttendance}
              loading={weeklyLoading}
              weekStart={selectedWeekStart}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
            />
          </div>
          <div className="lg:col-span-4 h-full">
            <DailyAttendanceDonut stats={data?.attendanceStats} />
          </div>
        </div>

        {/* Row 3: Pending Requests & System Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5">
            <PendingRequests />
          </div>
          <div className="lg:col-span-7">
            <SystemActivityLog />
          </div>
        </div>
      </div>
    </AcademicStaffLayout>
  );
};
