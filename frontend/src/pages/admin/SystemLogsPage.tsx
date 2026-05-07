import React, { useEffect, useState } from 'react';
import { useRoleAwareNavigate } from '../../hooks/useRoleAwareNavigate';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { dashboardService } from '../../services/api/dashboardService';
import { SystemLog } from '../../types/dashboard';
import {
    Loader2, Search, Info,
    CheckCircle2, AlertCircle, XCircle,
    ChevronLeft, ChevronRight, Calendar,
    Filter, ChevronDown, ChevronUp, User, Monitor, Globe, Database, History,
    ArrowLeft
} from 'lucide-react';
import toast from "@utils/toast";
import { CustomSelect } from '../../components/common/CustomSelect';
import { CustomDatePicker } from '../../components/common/CustomDatePicker';
export const SystemLogsPage: React.FC = () => {
    const navigate = useRoleAwareNavigate();
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Filters state
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Expanded logs state
    const [expandedLogs, setExpandedLogs] = useState<number[]>([]);

    const fetchLogs = async (pageNum: number) => {
        try {
            setLoading(true);
            const params = {
                page: pageNum,
                size: 15,
                search: searchTerm || undefined,
                type: typeFilter || undefined,
                role: roleFilter || undefined,
                startDate: startDate ? `${startDate}T00:00:00` : undefined,
                endDate: endDate ? `${endDate}T23:59:59` : undefined
            };
            const data = await dashboardService.getSystemLogs(params);
            setLogs(data.content);
            setTotalPages(data.totalPages);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to fetch system logs:', error);
            toast.error('Không thể tải nhật ký hệ thống');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchLogs(0);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, typeFilter, roleFilter, startDate, endDate]);

    const toggleExpand = (id: number) => {
        setExpandedLogs(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const resetFilters = () => {
        setTypeFilter('');
        setRoleFilter('');
        setStartDate('');
        setEndDate('');
        setSearchTerm('');
    };

    const typeConfig: Record<string, { color: string; bg: string; border: string; accent: string; label: string }> = {
        info: {
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-500/10',
            border: 'border-blue-100 dark:border-blue-500/20',
            accent: 'border-l-blue-500',
            label: 'Thông tin'
        },
        success: {
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-500/10',
            border: 'border-emerald-100 dark:border-emerald-500/20',
            accent: 'border-l-emerald-500',
            label: 'Thành công'
        },
        warning: {
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            border: 'border-amber-100 dark:border-amber-500/20',
            accent: 'border-l-amber-500',
            label: 'Cảnh báo'
        },
        error: {
            color: 'text-red-600',
            bg: 'bg-red-50 dark:bg-red-500/10',
            border: 'border-red-100 dark:border-red-500/20',
            accent: 'border-l-red-500',
            label: 'Lỗi'
        },
    };

    return (
        <AdminLayout pageTitle="Nhật ký hệ thống">
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
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Toàn bộ Nhật ký</h1>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Hệ thống ghi nhận chi tiết mọi hoạt động thay đổi dữ liệu và truy cập.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 md:flex-none">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo tiêu đề, nội dung..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all w-full md:w-72 hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5"
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
                                <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5 ml-1">Loại nhật ký</label>
                                <CustomSelect
                                    value={typeFilter}
                                    onChange={(value) => setTypeFilter(value)}
                                    options={[
                                        { value: '', label: 'Tất cả loại' },
                                        { value: 'INFO', label: 'Thông tin' },
                                        { value: 'SUCCESS', label: 'Thành công' },
                                        { value: 'WARNING', label: 'Cảnh báo' },
                                        { value: 'ERROR', label: 'Lỗi hệ thống' }
                                    ]}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1.5 ml-1">Vai trò thực hiện</label>
                                <CustomSelect
                                    value={roleFilter}
                                    onChange={(value) => setRoleFilter(value)}
                                    options={[
                                        { value: '', label: 'Tất cả vai trò' },
                                        { value: 'ADMIN', label: 'Quản trị viên' },
                                        { value: 'ACADEMIC_STAFF', label: 'Giáo vụ' },
                                        { value: 'LECTURER', label: 'Giảng viên' },
                                        { value: 'STUDENT', label: 'Sinh viên' }
                                    ]}
                                    className="w-full"
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
                                    className="w-full h-[52px] bg-gray-100 dark:bg-zinc-800 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 rounded-2xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                >
                                    <History className="w-4 h-4" />
                                    Đặt lại
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Logs List Section */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
                    {loading && logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 text-fpt-orange animate-spin" />
                            <p className="text-sm text-gray-500 font-medium">Đang truy vấn dữ liệu...</p>
                        </div>
                    ) : logs.length > 0 ? (
                        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {logs.map((log) => {
                                const config = typeConfig[log.type] || typeConfig.info;
                                const isSystem = !log.performerName || log.performerName === 'Hệ thống';
                                const isExpanded = expandedLogs.includes(log.id);

                                return (
                                    <div key={log.id} className="p-0 hover:bg-gray-50/30 transition-colors">
                                        <div className="p-5 flex items-start gap-4">
                                            {/* Performer Avatar */}
                                            <div className="flex-shrink-0 relative">
                                                {log.performerAvatar ? (
                                                    <img
                                                        src={log.performerAvatar}
                                                        alt={log.performerName}
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-zinc-800 shadow-sm"
                                                    />
                                                ) : (
                                                    <div className={`w-12 h-12 rounded-full ${isSystem ? 'bg-gray-100' : 'bg-orange-100'} dark:bg-orange-900/20 flex items-center justify-center border-2 border-white dark:border-zinc-800 shadow-sm`}>
                                                        <span className={`${isSystem ? 'text-gray-400' : 'text-fpt-orange'} font-bold text-sm`}>
                                                            {log.performerName ? log.performerName.charAt(0).toUpperCase() : 'S'}
                                                        </span>
                                                    </div>
                                                )}
                                                {/* Mini type icon badge */}
                                                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${config.bg} ${config.color} border border-white dark:border-zinc-900 shadow-sm`}>
                                                    {log.type === 'success' && <CheckCircle2 className="w-2.5 h-2.5" />}
                                                    {log.type === 'info' && <Info className="w-2.5 h-2.5" />}
                                                    {log.type === 'warning' && <AlertCircle className="w-2.5 h-2.5" />}
                                                    {log.type === 'error' && <XCircle className="w-2.5 h-2.5" />}
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${config.bg} ${config.color} border ${config.border}`}>
                                                            {config.label}
                                                        </span>
                                                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                                            {log.title}
                                                        </h3>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1.5 text-gray-400 flex-shrink-0">
                                                            <Calendar className="w-3 h-3" />
                                                            <span className="text-[11px] font-medium">{log.timestamp}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleExpand(log.id)}
                                                            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 transition-colors"
                                                            title="Xem chi tiết kỹ thuật"
                                                        >
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                                                    {log.description}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-4 mt-3">
                                                    {!isSystem && (
                                                        <div className="flex items-center gap-2 py-1 px-2.5 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-100 dark:border-zinc-800/50">
                                                            <User className="w-3.5 h-3.5 text-fpt-orange" />
                                                            <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                                                {log.performerName}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                                                        <Globe className="w-3.5 h-3.5 opacity-60" />
                                                        <span>{log.source || 'Hệ thống'}</span>
                                                    </div>

                                                    {log.ipAddress && (
                                                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium border-l border-gray-200 dark:border-zinc-800 pl-4">
                                                            <Monitor className="w-3.5 h-3.5 opacity-60" />
                                                            <span>IP: {log.ipAddress}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Expandable Technical Details */}
                                                {isExpanded && (
                                                    <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/20 rounded-xl border border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* Client Info */}
                                                            <div className="space-y-3">
                                                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                                                    <Monitor className="w-3.5 h-3.5" />
                                                                    Thông tin trình duyệt
                                                                </div>
                                                                <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg text-[11px] font-mono text-zinc-500 break-all leading-relaxed border border-zinc-100 dark:border-zinc-800">
                                                                {(() => {
                                                                    const ua = log.userAgent;
                                                                    if (!ua) return 'Không có thông tin UA';
                                                                    // Mobile app (Dart/Flutter)
                                                                    if (ua.startsWith('Dart/') || ua.includes('dart:io')) {
                                                                        return 'FAMS Mobile App (Flutter)';
                                                                    }
                                                                    // Parse browser
                                                                    let browser = '';
                                                                    let os = '';
                                                                    if (ua.includes('Edg/')) {
                                                                        const v = ua.match(/Edg\/([\d.]+)/);
                                                                        browser = `Edge ${v ? v[1].split('.')[0] : ''}`;
                                                                    } else if (ua.includes('Chrome/')) {
                                                                        const v = ua.match(/Chrome\/([\d.]+)/);
                                                                        browser = `Chrome ${v ? v[1].split('.')[0] : ''}`;
                                                                    } else if (ua.includes('Firefox/')) {
                                                                        const v = ua.match(/Firefox\/([\d.]+)/);
                                                                        browser = `Firefox ${v ? v[1].split('.')[0] : ''}`;
                                                                    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
                                                                        const v = ua.match(/Version\/([\d.]+)/);
                                                                        browser = `Safari ${v ? v[1].split('.')[0] : ''}`;
                                                                    }
                                                                    if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
                                                                    else if (ua.includes('Windows')) os = 'Windows';
                                                                    else if (ua.includes('Mac OS X')) os = 'macOS';
                                                                    else if (ua.includes('Linux')) os = 'Linux';
                                                                    else if (ua.includes('Android')) os = 'Android';
                                                                    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
                                                                    if (browser && os) return `${browser} trên ${os}`;
                                                                    if (browser) return browser;
                                                                    return ua;
                                                                })()}
                                                                </div>
                                                            </div>

                                                            {/* Data Changes */}
                                                            <div className="space-y-3">
                                                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                                                    <Database className="w-3.5 h-3.5" />
                                                                    Thay đổi dữ liệu
                                                                </div>
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="p-3 bg-red-50/50 dark:bg-red-500/5 rounded-lg border border-red-100/50 dark:border-red-500/10">
                                                                        <span className="text-[10px] font-bold text-red-400 block mb-1">Dữ liệu cũ:</span>
                                                                        <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 break-all">
                                                                            {log.oldValue || '—'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-lg border border-emerald-100/50 dark:border-emerald-500/10">
                                                                        <span className="text-[10px] font-bold text-emerald-400 block mb-1">Dữ liệu mới:</span>
                                                                        <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 break-all">
                                                                            {log.newValue || '—'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
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
                            <p className="text-lg font-bold text-gray-600 dark:text-zinc-300">Không tìm thấy kết quả</p>
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
                                    Hiển thị {logs.length} kết quả
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        fetchLogs(page - 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={page === 0 || loading}
                                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 transition-all shadow-sm group"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-zinc-400 group-hover:text-fpt-orange transition-colors" />
                                </button>
                                <button
                                    onClick={() => {
                                        fetchLogs(page + 1);
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

