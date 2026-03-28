import axios from 'axios';
import { API_URL } from './config';
import {
    DashboardStats,
    RecentAccess,
    Alert,
    Notification,
    SystemLog
} from '../../types/dashboard';

// Get auth token
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const dashboardService = {
    // Get dashboard statistics
    getStatistics: async (): Promise<DashboardStats> => {
        const response = await axios.get(`${API_URL}/dashboard/statistics`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Get recent access logs
    getRecentAccess: async (): Promise<RecentAccess[]> => {
        const response = await axios.get(`${API_URL}/dashboard/recent-access`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Get alerts
    getAlerts: async (): Promise<Alert[]> => {
        const response = await axios.get(`${API_URL}/dashboard/alerts`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Get notifications
    getNotifications: async (): Promise<Notification[]> => {
        const response = await axios.get(`${API_URL}/dashboard/notifications`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Get system logs
    getSystemLogs: async (): Promise<SystemLog[]> => {
        const response = await axios.get(`${API_URL}/dashboard/system-logs`, {
            headers: getAuthHeader()
        });
        return response.data;
    }
};
