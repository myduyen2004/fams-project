import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { RecentAccessTable } from '../../components/admin/dashboard/RecentAccessTable';
import { dashboardService } from '../../services/api/dashboardService';
import { RecentAccess } from '../../types/dashboard';
import { Search, ArrowLeft, Loader2 } from 'lucide-react';
import toast from "@utils/toast";
import { useWebSocket } from '../../hooks/useWebSocket';
import { useRoleAwareNavigate } from '../../hooks/useRoleAwareNavigate';

export const RecentAccessPage: React.FC = () => {
    const navigate = useRoleAwareNavigate();
    const [recentAccess, setRecentAccess] = useState<RecentAccess[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    // Filtered data
    const filteredAccess = useMemo(() => {
        if (!searchTerm.trim()) return recentAccess;

        const term = searchTerm.toLowerCase();
        return recentAccess.filter(item =>
            item.email.toLowerCase().includes(term) ||
            item.role.toLowerCase().includes(term) ||
            item.location.toLowerCase().includes(term) ||
            item.status.toLowerCase().includes(term)
        );
    }, [recentAccess, searchTerm]);

    return (
        <AdminLayout pageTitle="Danh sách truy cập gần đây">
            <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-2 text-gray-500 hover:text-fpt-orange transition-all duration-200"
                >
                    <div className="p-2 rounded-full bg-gray-100 dark:bg-zinc-800 group-hover:bg-orange-50 dark:group-hover:bg-orange-950/30 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold">Quay lại</span>
                </button>

                {/* Header Section */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lượt truy cập gần đây</h1>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Theo dõi các hoạt động đăng nhập và truy cập hệ thống thời gian thực.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 md:flex-none">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm truy cập..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all w-full md:w-64 hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5"
                                />
                            </div>
                            {/* <button
                                onClick={loadData}
                                className="px-4 h-[52px] rounded-2xl bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5 transition-all flex items-center gap-2 text-sm font-bold active:scale-95"
                                title="Tải lại dữ liệu"
                            >
                                <History className="w-4 h-4" />
                            </button> */}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-8 h-8 text-fpt-orange animate-spin" />
                        <p className="text-sm text-gray-500 font-medium">Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                        <RecentAccessTable data={filteredAccess} />
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

