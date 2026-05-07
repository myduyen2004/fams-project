import apiClient from './apiClient';
import {
    DashboardStats,
    RecentAccess,
    Alert,
    AppNotification,
    SystemLog
} from '../../types/dashboard';

export interface DashboardSummary {
    stats: DashboardStats;
    recentAccess: RecentAccess[];
    alerts: Alert[];
}

export const dashboardService = {
    // Get dashboard summary stats
    getSummary: async (): Promise<DashboardSummary> => {
        const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
        return response.data;
    },

    // Get dashboard statistics
    getStatistics: async (): Promise<DashboardStats> => {
        const response = await apiClient.get<DashboardStats>('/dashboard/stats');
        return response.data;
    },

    // Get recent access logs
    getRecentAccess: async (): Promise<RecentAccess[]> => {
        const response = await apiClient.get<RecentAccess[]>('/dashboard/recent-access');
        return response.data;
    },

    // Get alerts
    getAlerts: async (): Promise<Alert[]> => {
        const response = await apiClient.get<Alert[]>('/dashboard/alerts');
        return response.data;
    },

    // Get notifications
    getNotifications: async (): Promise<AppNotification[]> => {
        const response = await apiClient.get<AppNotification[]>('/dashboard/notifications');
        return response.data;
    },

    // Get notification by ID
    getNotificationById: async (id: number): Promise<AppNotification> => {
        const response = await apiClient.get<AppNotification>(`/dashboard/notifications/${id}`);
        return response.data;
    },

    // Get system logs
    getSystemLogs: async (params?: {
        page?: number;
        size?: number;
        search?: string;
        type?: string;
        role?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{ content: SystemLog[]; totalPages: number; totalElements: number }> => {
        const response = await apiClient.get<{ content: SystemLog[]; totalPages: number; totalElements: number }>('/dashboard/system-logs', {
            params
        });
        return response.data;
    },

    // Mark notification as read
    markNotificationAsRead: async (id: number) => {
        await apiClient.post(`/dashboard/notifications/${id}/read`);
    },

    markAllNotificationsAsRead: async () => {
        await apiClient.post('/dashboard/notifications/read-all');
    },

    // Get alerts (paginated)
    getAlertsPaginated: async (params?: {
        page?: number;
        size?: number;
        search?: string;
        level?: string;
        type?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{ content: Alert[]; totalPages: number; totalElements: number }> => {
        const response = await apiClient.get<{ content: Alert[]; totalPages: number; totalElements: number }>('/dashboard/alerts/paginated', {
            params
        });
        return response.data;
    }
};

