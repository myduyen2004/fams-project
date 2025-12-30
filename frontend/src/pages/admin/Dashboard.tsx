import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatCard } from '../../components/admin/dashboard/StatCard';
import { VietnamMap } from '../../components/admin/dashboard/VietnamMap';
import { RecentAccessTable } from '../../components/admin/dashboard/RecentAccessTable';
import { AlertsSection } from '../../components/admin/dashboard/AlertsSection';
import { NotificationsSection } from '../../components/admin/dashboard/NotificationsSection';
import { SystemLogsSection } from '../../components/admin/dashboard/SystemLogsSection';
import { dashboardService } from '../../services/api/dashboardService';
import {
  DashboardStats,
  RecentAccess,
  Alert,
  Notification,
  SystemLog
} from '../../types/dashboard';
import { Users, UserCog, CreditCard, FileText, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWebSocket } from '../../hooks/useWebSocket';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalUsers: 0,
    totalAccounts: 0,
    totalApplications: 0,
    totalBehaviors: 0
  });
  const [recentAccess, setRecentAccess] = useState<RecentAccess[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
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
        notificationsData,
        logsData
      ] = await Promise.all([
        dashboardService.getStatistics(),
        dashboardService.getRecentAccess(),
        dashboardService.getAlerts(),
        dashboardService.getNotifications(),
        dashboardService.getSystemLogs()
      ]);

      setStats(statsData);
      setRecentAccess(recentAccessData);
      setAlerts(alertsData);
      setNotifications(notificationsData);
      setSystemLogs(logsData);
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

  const handleNotificationsUpdate = useCallback((data: Notification[]) => {
    console.log('WS: Received notifications update', data);
    setNotifications(data);
  }, []);

  const handleSystemLogsUpdate = useCallback((data: SystemLog[]) => {
    console.log('WS: Received system logs update', data);
    setSystemLogs(data);
  }, []);

  useWebSocket('/topic/stats', handleStatsUpdate);
  useWebSocket('/topic/recent-access', handleRecentAccessUpdate);
  useWebSocket('/topic/alerts', handleAlertsUpdate);
  useWebSocket('/topic/notifications', handleNotificationsUpdate);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <StatCard
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          value={stats.totalStudents}
          label="Sinh viên"
        />
        <StatCard
          icon={UserCog}
          iconColor="text-green-600"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
          value={stats.totalUsers}
          label="Giảng viên"
        />
        <StatCard
          icon={CreditCard}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          value={stats.totalAccounts}
          label="Tài khoản"
        />
        <StatCard
          icon={FileText}
          iconColor="text-orange-600"
          iconBgColor="bg-orange-100 dark:bg-orange-900/30"
          value={stats.totalApplications}
          label="Đơn yêu cầu"
        />
        <StatCard
          icon={Activity}
          iconColor="text-red-600"
          iconBgColor="bg-red-100 dark:bg-red-900/30"
          value={stats.totalBehaviors}
          label="Cảnh báo"
        />
      </div>

      {/* Map and Recent Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Vietnam Map */}
        <div className="lg:col-span-1">
          <VietnamMap />
        </div>

        {/* Recent Access Table */}
        <div className="lg:col-span-2">
          <RecentAccessTable data={recentAccess} isDashboard={true} />
        </div>
      </div>

      {/* Bottom Three Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AlertsSection alerts={alerts} isDashboard={true} />
        <NotificationsSection notifications={notifications} isDashboard={true} />
        <SystemLogsSection logs={systemLogs} isDashboard={true} />
      </div>
    </AdminLayout>
  );
};
