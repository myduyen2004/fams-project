import React from 'react';
import { Search, Upload, Download, Loader2 } from 'lucide-react';

interface StudentFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    subSpecializationFilter?: string;
    onSubSpecializationFilterChange?: (value: string) => void;
    subSpecializations?: string[];

    majorFilter?: string;
    onMajorFilterChange?: (value: string) => void;
    majors?: string[];

    specializationFilter?: string;
    onSpecializationFilterChange?: (value: string) => void;
    specializations?: string[];

    onImportClick?: () => void;
    onExportClick?: () => void;
    showImportButton?: boolean;
    showExportButton?: boolean;
    isExporting?: boolean;
}

export const StudentFilters: React.FC<StudentFiltersProps> = React.memo(({
    search,
    onSearchChange,
    subSpecializationFilter = 'all',
    onSubSpecializationFilterChange,
    subSpecializations = [],
    majorFilter = 'all',
    onMajorFilterChange,
    majors = [],
    specializationFilter = 'all',
    onSpecializationFilterChange,
    specializations = [],
    onImportClick,
    onExportClick,
    showImportButton = true,
    showExportButton = true,
    isExporting = false
}) => {
    return (
        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-6 border border-gray-100 dark:border-zinc-700">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">

                {/* Search */}
                <div className="flex-1 lg:max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên, email, MSSV..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10 pr-4 py-2.5 w-full border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    />
                </div>

                {/* Ngành học */}
                {onMajorFilterChange && (
                    <div className="lg:w-48">
                        <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                            Ngành học
                        </label>
                        <select
                            value={majorFilter}
                            onChange={(e) => onMajorFilterChange(e.target.value)}
                            className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                        >
                            <option value="all">Tất cả các ngành</option>
                            {majors.map((major) => (
                                <option key={major} value={major}>{major}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Chuyên ngành */}
                {onSpecializationFilterChange && (
                    <div className="lg:w-48">
                        <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                            Chuyên ngành
                        </label>
                        <select
                            value={specializationFilter}
                            onChange={(e) => onSpecializationFilterChange(e.target.value)}
                            className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                        >
                            <option value="all">Tất cả chuyên ngành</option>
                            {specializations.map((spec) => (
                                <option key={spec} value={spec}>{spec}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Chuyên ngành hẹp */}
                {onSubSpecializationFilterChange && (
                    <div className="lg:w-44">
                        <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
                            Chuyên ngành hẹp
                        </label>
                        <select
                            value={subSpecializationFilter}
                            onChange={(e) => onSubSpecializationFilterChange(e.target.value)}
                            disabled={subSpecializations.length === 0}
                            className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white disabled:opacity-50"
                        >
                            <option value="all">Tất cả CN hẹp</option>
                            {subSpecializations.map((ss) => (
                                <option key={ss} value={ss}>{ss}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 lg:ml-auto">
                    {showExportButton && onExportClick && (
                        <button
                            onClick={onExportClick}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
                        </button>
                    )}
                    {showImportButton && onImportClick && (
                        <button
                            onClick={onImportClick}
                            className="flex items-center gap-2 px-4 py-2.5 border border-fpt-orange text-fpt-orange rounded-lg text-sm font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                        >
                            <Upload size={18} />
                            Import
                        </button>
                    )}

                </div>
            </div>
        </div>
    );
});

StudentFilters.displayName = 'StudentFilters';
