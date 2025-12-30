import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { RecentAccessTable } from '../../components/admin/dashboard/RecentAccessTable';
import { dashboardService } from '../../services/api/dashboardService';
import { RecentAccess } from '../../types/dashboard';
import toast from 'react-hot-toast';
import { useWebSocket } from '../../hooks/useWebSocket';

export const RecentAccessPage: React.FC = () => {
    const [recentAccess, setRecentAccess] = useState<RecentAccess[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await dashboardService.getRecentAccess();
            setRecentAccess(data);
        } catch (error) {
            console.error('Failed to load recent access:', error);
            toast.error('Không thể tải danh sách truy cập');
        } finally {
            setLoading(false);
        }
    };

    const handleRecentAccessUpdate = useCallback((data: RecentAccess[]) => {
        setRecentAccess(data);
    }, []);

    useWebSocket('/topic/recent-access', handleRecentAccessUpdate);

    return (
        <AdminLayout pageTitle="Danh sách truy cập gần đây">
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fpt-orange"></div>
                </div>
            ) : (
                <RecentAccessTable data={recentAccess} />
            )}
        </AdminLayout>
    );
};
