import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { NotificationsSection } from '../../components/admin/dashboard/NotificationsSection';
import { dashboardService } from '../../services/api/dashboardService';
import { Notification } from '../../types/dashboard';
import toast from 'react-hot-toast';
import { useWebSocket } from '../../hooks/useWebSocket';

export const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await dashboardService.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to load notifications:', error);
            toast.error('Không thể tải danh sách thông báo');
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationsUpdate = useCallback((data: Notification[]) => {
        setNotifications(data);
    }, []);

    useWebSocket('/topic/notifications', handleNotificationsUpdate);

    return (
        <AdminLayout pageTitle="Danh sách thông báo">
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fpt-orange"></div>
                </div>
            ) : (
                <NotificationsSection notifications={notifications} />
            )}
        </AdminLayout>
    );
};
