import React from 'react';
import { Search, Download, Calendar, Loader2 } from 'lucide-react';

interface RequestFiltersProps {
    filters: {
        search: string;
        role: string;
        reason: string;
        status: string;
        startDate: string;
        endDate: string;
    };
    onFilterChange: (newFilters: Partial<RequestFiltersProps['filters']>) => void;
    onExportClick?: () => void;
    isExporting?: boolean;
}

const RequestFilters: React.FC<RequestFiltersProps> = ({ filters, onFilterChange, onExportClick, isExporting }) => {
    return (
        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-gray-100 dark:border-zinc-700 w-full mb-6">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">

                {/* Search */}
                <div className="flex-1 lg:max-w-xs relative">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5 ml-1">Tìm kiếm</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Người gửi, mã, lớp..."
                            value={filters.search}
                            onChange={(e) => onFilterChange({ search: e.target.value })}
                            className="pl-10 pr-4 py-2 w-full border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Role */}
                <div className="w-full lg:w-32">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5 ml-1">Vai trò</label>
                    <select
                        value={filters.role}
                        onChange={(e) => onFilterChange({ role: e.target.value })}
                        className="px-3 py-2 w-full border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all shadow-sm"
                    >
                        <option value="">Tất cả vai trò</option>
                        <option value="STUDENT">Sinh viên</option>
                        <option value="LECTURER">Giảng viên</option>
                    </select>
                </div>

                {/* Status */}
                <div className="w-full lg:w-40">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5 ml-1">Trạng thái</label>
                    <select
                        value={filters.status}
                        onChange={(e) => onFilterChange({ status: e.target.value })}
                        className="px-3 py-2 w-full border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all shadow-sm"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="PENDING">Đang chờ</option>
                        <option value="APPROVED">Đã duyệt</option>
                        <option value="REJECTED">Đã từ chối</option>
                    </select>
                </div>

                {/* Date Range */}
                <div className="flex-1 lg:max-w-md grid grid-cols-2 gap-3">
                    <div className="relative">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5 ml-1">Từ ngày</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => onFilterChange({ startDate: e.target.value })}
                                className="pl-10 pr-3 py-2 w-full border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all shadow-sm appearance-none"
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5 ml-1">Đến ngày</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => onFilterChange({ endDate: e.target.value })}
                                className="pl-10 pr-3 py-2 w-full border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all shadow-sm appearance-none"
                            />
                        </div>
                    </div>

                </div>

                {/* Export Button */}
                {onExportClick && (
                    <div className="w-full lg:w-auto">
                        <button
                            onClick={onExportClick}
                            disabled={isExporting}
                            className="w-full lg:w-auto px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 text-gray-700 dark:text-white text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap disabled:opacity-50"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang xuất...
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    Xuất Excel
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestFilters;
