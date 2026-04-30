import React, { useEffect, useState } from 'react';
import { useRoleAwareNavigate } from '../../hooks/useRoleAwareNavigate';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { dashboardService } from '../../services/api/dashboardService';
import { Alert } from '../../types/dashboard';
import {
    Loader2, Search, Info,
    CheckCircle2, AlertCircle, XCircle,
    ChevronLeft, ChevronRight, Calendar,
    Filter, History,
    ArrowLeft, Bell, Zap, Shield, GraduationCap, ClipboardList
} from 'lucide-react';
import toast from "@utils/toast";
import { CustomSelect } from '../../components/common/CustomSelect';
import { CustomDatePicker } from '../../components/common/CustomDatePicker';
export const AlertsPage: React.FC = () => {
    const navigate = useRoleAwareNavigate();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Filters state
    const [levelFilter, setLevelFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const fetchAlerts = async (pageNum: number) => {
        try {
            setLoading(true);
            const params = {
                page: pageNum,
                size: 15,
                search: searchTerm || undefined,
                level: levelFilter || undefined,
                type: typeFilter || undefined,
                startDate: startDate ? `${startDate}T00:00:00` : undefined,
                endDate: endDate ? `${endDate}T23:59:59` : undefined
            };
            const data = await dashboardService.getAlertsPaginated(params);
            setAlerts(data.content);
            setTotalPages(data.totalPages);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
            toast.error('Không thể tải danh sách cảnh báo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchAlerts(0);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, levelFilter, typeFilter, startDate, endDate]);

    const resetFilters = () => {
        setLevelFilter('');
        setTypeFilter('');
        setStartDate('');
        setEndDate('');
        setSearchTerm('');
    };

    const levelConfig: Record<string, { color: string; bg: string; border: string; accent: string; label: string; icon: any }> = {
        INFO: {
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-500/10',
            border: 'border-blue-100 dark:border-blue-500/20',
            accent: 'border-l-blue-500',
            label: 'Thông tin',
            icon: Info
        },
        WARNING: {
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            border: 'border-amber-100 dark:border-amber-500/20',
            accent: 'border-l-amber-500',
            label: 'Cảnh báo',
            icon: AlertCircle
        },
        ERROR: {
            color: 'text-red-600',
            bg: 'bg-red-50 dark:bg-red-500/10',
            border: 'border-red-100 dark:border-red-500/20',
            accent: 'border-l-red-500',
            label: 'Lỗi',
            icon: XCircle
        },
        CRITICAL: {
            color: 'text-rose-700',
            bg: 'bg-rose-50 dark:bg-rose-500/10',
            border: 'border-rose-100 dark:border-rose-500/20',
            accent: 'border-l-rose-500',
            label: 'Nghiêm trọng',
            icon: Zap
        },
    };

    const typeConfig: Record<string, { label: string; icon: any }> = {
        SYSTEM: { label: 'Hệ thống', icon: Bell },
        ATTENDANCE: { label: 'Điểm danh', icon: ClipboardList },
        SECURITY: { label: 'Bảo mật', icon: Shield },
        GRADE: { label: 'Điểm số', icon: GraduationCap },
        SCHEDULE: { label: 'Lịch học', icon: Calendar },
    };

    return (
        <AdminLayout pageTitle="Danh sách cảnh báo">
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
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Toàn bộ Cảnh báo</h1>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Hệ thống thông báo các sự kiện quan trọng cần lưu ý.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 md:flex-none">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm cảnh báo..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all w-full md:w-64 hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5"
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-4 h-[52px] rounded-2xl border-2 transition-all flex items-center gap-2 text-sm font-bold ${showFilters ? 'bg-fpt-orange text-white border-fpt-orange' : 'bg-white dark:bg-zinc-800 border-gray-100 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5'}`}
                            >
                                <Filter className="w-4 h-4" />
                                <span className="hidden sm:inline">Bộ lọc</span>
                            </button>
                        </div>
                    </div>

                    {/* Advanced Filters Bar */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in slide-in-from-top-2 duration-300">
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5 ml-1">Mức độ</label>
                                <CustomSelect
                                    value={levelFilter}
                                    onChange={(value) => setLevelFilter(value)}
                                    options={[
                                        { value: '', label: 'Tất cả mức độ' },
                                        { value: 'INFO', label: 'Thông tin' },
                                        { value: 'WARNING', label: 'Cảnh báo' },
                                        { value: 'ERROR', label: 'Lỗi' },
                                        { value: 'CRITICAL', label: 'Nghiêm trọng' }
                                    ]}
                                    className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5 ml-1">Loại cảnh báo</label>
                                <CustomSelect
                                    value={typeFilter}
                                    onChange={(value) => setTypeFilter(value)}
                                    options={[
                                        { value: '', label: 'Tất cả loại' },
                                        { value: 'SYSTEM', label: 'Hệ thống' },
                                        { value: 'ATTENDANCE', label: 'Điểm danh' },
                                        { value: 'SECURITY', label: 'Bảo mật' },
                                        { value: 'GRADE', label: 'Điểm số' },
                                        { value: 'SCHEDULE', label: 'Lịch học' }
                                    ]}
                                    className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5 ml-1">Từ ngày</label>
                                <CustomDatePicker
                                    value={startDate}
                                    onChange={(value) => setStartDate(value)}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5 ml-1">Đến ngày</label>
                                <CustomDatePicker
                                    value={endDate}
                                    onChange={(value) => setEndDate(value)}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={resetFilters}
                                    className="w-full h-[52px] bg-gray-100 dark:bg-zinc-800 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <History className="w-4 h-4" />
                                    Đặt lại
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Alerts List Section */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
                    {loading && alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 text-fpt-orange animate-spin" />
                            <p className="text-sm text-gray-500 font-medium">Đang truy vấn dữ liệu...</p>
                        </div>
                    ) : alerts.length > 0 ? (
                        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {alerts.map((alert) => {
                                const level = levelConfig[alert.level] || levelConfig.INFO;
                                const type = typeConfig[alert.type || 'SYSTEM'] || typeConfig.SYSTEM;
                                const LevelIcon = level.icon;
                                const TypeIcon = type.icon;

                                return (
                                    <div key={alert.id} className="p-0 hover:bg-gray-50/30 transition-colors">
                                        <div className="p-5 flex items-start gap-4">
                                            {/* Status Icon */}
                                            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${level.bg} ${level.color} flex items-center justify-center border border-white dark:border-zinc-800 shadow-sm`}>
                                                <LevelIcon className="w-6 h-6" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${level.bg} ${level.color} border ${level.border}`}>
                                                            {level.label}
                                                        </span>
                                                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                            {alert.title}
                                                        </h3>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-gray-400 flex-shrink-0">
                                                        <Calendar className="w-3 h-3" />
                                                        <span className="text-[11px] font-medium">{alert.timestamp}</span>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                                                    {alert.description}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-4 mt-3">
                                                    <div className="flex items-center gap-2 py-1 px-2.5 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-100 dark:border-zinc-800/50">
                                                        <TypeIcon className="w-3.5 h-3.5 text-fpt-orange" />
                                                        <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                                            {type.label}
                                                        </span>
                                                    </div>
                                                    {alert.isResolved ? (
                                                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-bold uppercase tracking-wider">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Đã xử lý
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-[11px] text-amber-500 font-bold uppercase tracking-wider">
                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                            Đang chờ
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-400 text-center px-4">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-lg font-bold text-gray-600 dark:text-zinc-300">Không tìm thấy cảnh báo nào</p>
                            <p className="text-sm mt-1 max-w-xs">Hãy thử thay đổi từ khóa hoặc xóa các bộ lọc để có thêm kết quả.</p>
                            <button
                                onClick={resetFilters}
                                className="mt-4 text-sm font-semibold text-fpt-orange hover:underline"
                            >
                                Xóa tất cả bộ lọc
                            </button>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <p className="text-xs text-gray-500 font-medium">
                                    Trang <span className="text-gray-900 dark:text-white font-bold">{page + 1}</span> / {totalPages}
                                </p>
                                <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800 hidden sm:block"></div>
                                <p className="text-xs text-gray-400 hidden sm:block">
                                    Hiển thị {alerts.length} cảnh báo
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        fetchAlerts(page - 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={page === 0 || loading}
                                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 transition-all shadow-sm group"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-zinc-400 group-hover:text-fpt-orange transition-colors" />
                                </button>
                                <button
                                    onClick={() => {
                                        fetchAlerts(page + 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={page >= totalPages - 1 || loading}
                                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 transition-all shadow-sm group"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-zinc-400 group-hover:text-fpt-orange transition-colors" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

