import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatCard } from '../../components/admin/dashboard/StatCard';
import { VietnamMap } from '../../components/admin/dashboard/VietnamMap';
import { RecentAccessTable } from '../../components/admin/dashboard/RecentAccessTable';
import { AlertsSection } from '../../components/admin/dashboard/AlertsSection';
import { SystemLogsSection } from '../../components/admin/dashboard/SystemLogsSection';
import { dashboardService } from '../../services/api/dashboardService';
import { newsService } from '../../services/api/newsService';
import {
  DashboardStats,
  RecentAccess,
  Alert,
  SystemLog
} from '../../types/dashboard';
import { NewsItem } from '../../types/news';
import { Users, UserCog, CreditCard, FileText, Activity, Newspaper, ArrowRight } from 'lucide-react';
import toast from "@utils/toast";
import { useWebSocket } from '../../hooks/useWebSocket';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalUsers: 0,
    totalAccounts: 0,
    totalApplications: 0,
    totalBehaviors: 0
  });
  const [recentAccess, setRecentAccess] = useState<RecentAccess[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        statsData,
        recentAccessData,
        alertsData,
        logsData,
        newsData
      ] = await Promise.all([
        dashboardService.getStatistics(),
        dashboardService.getRecentAccess(),
        dashboardService.getAlerts(),
        dashboardService.getSystemLogs(),
        newsService.getPublishedNews(0, 5)
      ]);

      setStats(statsData);
      setRecentAccess(recentAccessData);
      setAlerts(alertsData);
      setSystemLogs(logsData.content);
      setNews(newsData.content || []);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates via WebSockets
  const handleStatsUpdate = useCallback((data: DashboardStats) => {
    console.log('WS: Received stats update', data);
    setStats(prev => ({ ...prev, ...data }));
  }, []);

  const handleRecentAccessUpdate = useCallback((data: RecentAccess[]) => {
    console.log('WS: Received recent access update', data);
    setRecentAccess(data);
  }, []);

  const handleAlertsUpdate = useCallback((data: Alert[]) => {
    console.log('WS: Received alerts update', data);
    setAlerts(data);
  }, []);


  const handleSystemLogsUpdate = useCallback((data: SystemLog[]) => {
    console.log('WS: Received system logs update', data);
    setSystemLogs(data);
  }, []);

  useWebSocket('/topic/stats', handleStatsUpdate);
  useWebSocket('/topic/recent-access', handleRecentAccessUpdate);
  useWebSocket('/topic/alerts', handleAlertsUpdate);
  useWebSocket('/topic/system-logs', handleSystemLogsUpdate);

  if (loading) {
    return (
      <AdminLayout pageTitle="Admin - Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fpt-orange"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Admin - Dashboard">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          value={stats.totalStudents}
          label="Sinh viên"
          variant="blue"
        />
        <StatCard
          icon={UserCog}
          iconColor="text-green-600"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
          value={stats.totalUsers}
          label="Giảng viên"
          variant="green"
        />
        <StatCard
          icon={CreditCard}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          value={stats.totalAccounts}
          label="Tài khoản"
          variant="purple"
        />
        <StatCard
          icon={FileText}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100 dark:bg-orange-900/30"
          value={stats.totalApplications}
          label="Đơn yêu cầu"
          variant="orange"
        />
        <StatCard
          icon={Activity}
          iconColor="text-red-600"
          iconBgColor="bg-red-100 dark:bg-red-900/30"
          value={stats.totalBehaviors}
          label="Cảnh báo"
          variant="red"
        />
      </div>

      {/* Map and Recent Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Vietnam Map */}
        <div className="lg:col-span-1">
          <VietnamMap />
        </div>

        {/* Recent Access Table */}
        <div className="lg:col-span-2">
          <RecentAccessTable data={recentAccess} isDashboard={true} />
        </div>
      </div>

      {/* Bottom Layout: News (25%), Alerts (25%), System Logs (50%) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-8">
        {/* News Section */}
        <div className="h-[600px]">
          <div className="bg-white dark:bg-zinc-900 rounded-[24px] shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col h-full overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                Tin tức
              </h3>
              <button 
                onClick={() => navigate('/news')}
                className="group flex items-center gap-1.5 text-xs font-bold text-fpt-orange hover:text-orange-600 transition-colors uppercase tracking-wider"
              >
                Xem tất cả
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="flex-1 p-5 space-y-5 overflow-y-auto custom-scrollbar">
              {news.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center mb-4">
                     <Newspaper size={32} className="text-gray-300 dark:text-zinc-700" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">
                    Không có tin tức nào
                  </p>
                </div>
              ) : (
                news.slice(0, 5).map(item => (
                  <button 
                    key={item.id} 
                    className="w-full text-left group" 
                    onClick={() => navigate(`/news/${item.id}`)}
                  >
                    <div className="rounded-[20px] overflow-hidden border border-gray-50 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1">
                      {/* News Image */}
                      <div className="aspect-[16/9] overflow-hidden relative">
                        <img 
                          src={item.thumbnailImage || `https://picsum.photos/seed/${item.id}/800/450`} 
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur shadow-sm rounded-lg text-[10px] font-bold text-fpt-orange uppercase tracking-wider">
                           {item.type || 'Tin tức'}
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-relaxed group-hover:text-fpt-orange transition-colors">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest tabular-nums">
                          <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('vi-VN') : 'Gần đây'}</span>
                          <span className="text-gray-200 dark:text-zinc-800">•</span>
                          <span>{item.senderName || 'Admin'}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="h-[600px]">
          <AlertsSection alerts={alerts} isDashboard={true} />
        </div>

        {/* System Logs Section (Occupies 50% on large screens) */}
        <div className="h-[600px] xl:col-span-2">
          <SystemLogsSection logs={systemLogs} isDashboard={true} />
        </div>
      </div>
    </AdminLayout>
  );
};

