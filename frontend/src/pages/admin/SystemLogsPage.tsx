import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { SystemLogsSection } from '../../components/admin/dashboard/SystemLogsSection';
import { dashboardService } from '../../services/api/dashboardService';
import { SystemLog } from '../../types/dashboard';
import toast from 'react-hot-toast';
import { useWebSocket } from '../../hooks/useWebSocket';

export const SystemLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await dashboardService.getSystemLogs();
            setLogs(data);
        } catch (error) {
            console.error('Failed to load system logs:', error);
            toast.error('Không thể tải nhật ký hệ thống');
        } finally {
            setLoading(false);
        }
    };

    const handleSystemLogsUpdate = useCallback((data: SystemLog[]) => {
        setLogs(data);
    }, []);

    useWebSocket('/topic/system-logs', handleSystemLogsUpdate);

    return (
        <AdminLayout pageTitle="Nhật ký hệ thống">
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fpt-orange"></div>
                </div>
            ) : (
                <SystemLogsSection logs={logs} />
            )}
        </AdminLayout>
    );
};
