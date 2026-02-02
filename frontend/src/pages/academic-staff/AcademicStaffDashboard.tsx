import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { Loader2, Search as SearchIcon } from 'lucide-react';
import { academicStaffService } from '../../services/api/academicStaffService';
import { dashboardService } from '../../services/api/dashboardService';
import { AcademicStaffDashboardResponse } from '../../types/dashboard';
import toast from 'react-hot-toast';

// New Components
import { AnalyticalCards } from '../../components/academic-staff/dashboard/AnalyticalCards';
import { AttendanceFrequencyChart, DailyAttendanceDonut } from '../../components/academic-staff/dashboard/DashboardCharts';
import { PendingRequests, AttendanceLog, RunningRooms } from '../../components/academic-staff/dashboard/DashboardLists';

export const AcademicStaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AcademicStaffDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Safety timeout
      const timeoutId = setTimeout(() => {
        if (loading) {
          console.warn('Dashboard data fetch timed out');
          setLoading(false);
          toast.error('Kết nối máy chủ chậm, đang hiển thị dữ liệu tạm thời');
        }
      }, 5000);

      try {
        setLoading(true);
        console.log('Fetching dashboard data...');
        const [dashboardData, notifications] = await Promise.all([
          academicStaffService.getDashboardData(),
          dashboardService.getNotifications().catch(e => {
            console.error('Failed to fetch notifications:', e);
            return [];
          })
        ]);
        console.log('Dashboard data received:', dashboardData);
        // Ensure notifications from both sources are considered, prioritizing the specific notifications fetch if dashboardData doesn't have them
        setData({
          ...dashboardData,
          notifications: dashboardData.notifications?.length ? dashboardData.notifications : notifications
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('Không thể tải dữ liệu dashboard');
      } finally {
        clearTimeout(timeoutId);
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

  return (
    <AcademicStaffLayout pageTitle="Dashboard">
      {/* Search and Header Info */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-sm text-zinc-400 font-medium tracking-tight">Chào mừng trở lại, hệ thống đang hoạt động ổn định.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SearchIcon size={18} className="text-zinc-300 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm mã sinh viên, lớp..."
              className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl py-3 pl-12 pr-6 text-sm w-full md:w-80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>
      </div>

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
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-zinc-800 h-full cursor-pointer hover:border-orange-500/20 transition-all duration-300 group/notif flex flex-col"
              onClick={() => navigate('/notifications')}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[11px] font-black text-zinc-800 dark:text-white tracking-[0.2em] uppercase">
                  THÔNG BÁO MỚI
                </h3>
                {data?.notifications && data.notifications.length > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                    {data.notifications.length}
                  </span>
                )}
              </div>

              <div className="space-y-2 flex-grow">
                {data?.notifications && data.notifications.length > 0 ? (
                  data.notifications.slice(0, 3).map((notif, idx) => (
                    <div key={notif.id || idx} className={`p-2.5 rounded-2xl border transition-all ${idx === 0 ? 'bg-zinc-50/50 dark:bg-zinc-800/30 border-gray-50 dark:border-zinc-800' : 'border-transparent hover:border-gray-100 dark:hover:border-zinc-800'}`}>
                      <h5 className="text-xs font-bold text-zinc-800 dark:text-white line-clamp-1">{notif.title}</h5>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">
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
                    className="py-12 text-center cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/20 rounded-2xl transition-all border border-dashed border-gray-100 dark:border-zinc-800 h-full flex flex-col justify-center"
                    onClick={() => navigate('/notifications')}
                  >
                    <p className="text-xs text-gray-400 font-medium">Không có thông báo mới</p>
                    <p className="text-[10px] text-zinc-300 mt-2">Nhấp để xem lịch sử</p>
                  </div>
                )}
              </div>

              <button
                className="w-full mt-2 text-[10px] font-bold text-zinc-300 uppercase tracking-widest hover:text-orange-500 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/notifications');
                }}
              >
                TẤT CẢ THÔNG BÁO
              </button>
            </div>
          </div>

          {/* Running Rooms (4/12) */}
          <div className="lg:col-span-4 h-full">
            <RunningRooms />
          </div>
        </div>

        {/* Row 2: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 h-full">
            <AttendanceFrequencyChart />
          </div>
          <div className="lg:col-span-4 h-full">
            <DailyAttendanceDonut stats={data?.attendanceStats} />
          </div>
        </div>

        {/* Row 3: Lists & Analysis Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              <div className="lg:col-span-7 h-full">
                <PendingRequests />
              </div>
              <div className="lg:col-span-5 h-full">
                <AttendanceLog />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-[#FDF2EC] dark:bg-orange-950/20 rounded-[32px] p-8 h-full border border-orange-100/50 dark:border-orange-500/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.2em] mb-4">PHÂN TÍCH CHUYÊN CẦN</h4>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">LỚP VẮNG NHIỀU NHẤT</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-zinc-800 dark:text-white">IT001, BA202</p>
                    <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase">Báo động</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">SINH VIÊN CÓ NGUY CƠ</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-zinc-800 dark:text-white">12 Sinh viên</p>
                    <span className="text-[9px] font-bold text-orange-500">+5.2%</span>
                  </div>
                </div>

                <button className="w-full bg-white dark:bg-zinc-800 py-3 rounded-2xl text-[11px] font-bold text-zinc-900 dark:text-white shadow-[0_4px_15px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] transition-all mt-4 border border-gray-100 dark:border-zinc-700">
                  Xem báo cáo chi tiết
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AcademicStaffLayout>
  );
};
