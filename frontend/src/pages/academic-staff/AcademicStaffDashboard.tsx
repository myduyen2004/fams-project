import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { Loader2 } from 'lucide-react';
import { academicStaffService } from '../../services/api/academicStaffService';
import { AcademicStaffDashboardResponse } from '../../types/dashboard';
import toast from "@utils/toast";

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

          {/* News (3/12) */}
          <div className="lg:col-span-3 h-full">
            <div
              className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-zinc-800 h-full cursor-pointer hover:shadow-md transition-all duration-300 group/news flex flex-col"
              onClick={() => navigate('/news')}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tin tức mới nhất
                </h3>
                {data?.unreadNotificationsCount !== undefined && data.unreadNotificationsCount > 0 && (
                  <span className="px-2 h-5 bg-orange-100 text-orange-600 text-[10px] flex items-center justify-center rounded-full font-bold">
                    {data.unreadNotificationsCount} mới
                  </span>
                )}
              </div>

              <div className="space-y-4 flex-grow">
                {data?.news && data.news.length > 0 ? (
                  data.news.map((item) => (
                    <div key={item.id} className="relative group/item flex gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800">
                        <img
                          src={item.thumbnailImage || 'https://res.cloudinary.com/dhp7p8c8t/image/upload/v1712411514/news-placeholder_tqjz6z.png'}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover/item:text-orange-600 transition-colors">
                          {item.title}
                        </h5>
                        <p className="text-[11px] text-gray-500 mt-1">
                          {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('vi-VN') : 'Vừa xong'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center rounded-xl border border-dashed border-gray-200 dark:border-zinc-800 h-full flex flex-col justify-center bg-zinc-50/50 dark:bg-zinc-800/10">
                    <p className="text-xs text-gray-500 font-medium">Chưa có tin tức mới</p>
                  </div>
                )}
              </div>

              <button
                className="w-full mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 text-xs font-bold text-gray-400 hover:text-orange-600 transition-colors uppercase tracking-wider"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/news');
                }}
              >
                Xem tất cả tin tức
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
          <div className="lg:col-span-7 h-full">
            <AttendanceFrequencyChart
              data={data?.weeklyAttendance}
              loading={weeklyLoading}
              weekStart={selectedWeekStart}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
            />
          </div>
          <div className="lg:col-span-5 h-full">
            <DailyAttendanceDonut stats={data?.attendanceStats} />
          </div>
        </div>

        {/* Row 3: Pending Requests & System Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5">
            <PendingRequests stats={data?.stats} />
          </div>
          <div className="lg:col-span-7">
            <SystemActivityLog />
          </div>
        </div>
      </div>
    </AcademicStaffLayout>
  );
};

