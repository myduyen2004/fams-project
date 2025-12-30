import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AlertsSection } from '../../components/admin/dashboard/AlertsSection';
import { dashboardService } from '../../services/api/dashboardService';
import { Alert } from '../../types/dashboard';
import toast from 'react-hot-toast';
import { useWebSocket } from '../../hooks/useWebSocket';

export const AlertsPage: React.FC = () => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await dashboardService.getAlerts();
            setAlerts(data);
        } catch (error) {
            console.error('Failed to load alerts:', error);
            toast.error('Không thể tải danh sách cảnh báo');
        } finally {
            setLoading(false);
        }
    };

    const handleAlertsUpdate = useCallback((data: Alert[]) => {
        setAlerts(data);
    }, []);

    useWebSocket('/topic/alerts', handleAlertsUpdate);

    return (
        <AdminLayout pageTitle="Danh sách cảnh báo">
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fpt-orange"></div>
                </div>
            ) : (
                <AlertsSection alerts={alerts} />
            )}
        </AdminLayout>
    );
};
