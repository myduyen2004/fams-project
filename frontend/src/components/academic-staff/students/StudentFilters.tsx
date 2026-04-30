import React from 'react';
import { Search, Upload, Download, Loader2 } from 'lucide-react';
import { CustomSelect } from '../../common/CustomSelect';

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
                <div className="flex-1 lg:max-w-md">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Tìm kiếm</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, email, MSSV..."
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                {/* Ngành học */}
                {onMajorFilterChange && (
                    <div className="lg:w-64">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Ngành học</label>
                        <CustomSelect
                            value={majorFilter}
                            onChange={onMajorFilterChange}
                            options={[
                                { value: 'all', label: 'Tất cả các ngành' },
                                ...majors.map((major) => ({ value: major, label: major }))
                            ]}
                        />
                    </div>
                )}

                {/* Chuyên ngành */}
                {onSpecializationFilterChange && (
                    <div className="lg:w-64">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Chuyên ngành</label>
                        <CustomSelect
                            value={specializationFilter}
                            onChange={onSpecializationFilterChange}
                            options={[
                                { value: 'all', label: 'Tất cả chuyên ngành' },
                                ...specializations.map((spec) => ({ value: spec, label: spec }))
                            ]}
                        />
                    </div>
                )}

                {/* Chuyên ngành hẹp */}
                {onSubSpecializationFilterChange && (
                    <div className="lg:w-64">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Chuyên ngành hẹp</label>
                        <CustomSelect
                            value={subSpecializationFilter}
                            onChange={onSubSpecializationFilterChange}
                            disabled={subSpecializations.length === 0}
                            options={[
                                { value: 'all', label: 'Tất cả CN hẹp' },
                                ...subSpecializations.map((ss) => ({ value: ss, label: ss }))
                            ]}
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 lg:ml-auto">
                    {showExportButton && onExportClick && (
                        <button
                            onClick={onExportClick}
                            disabled={isExporting}
                            className="flex items-center justify-center gap-2 px-6 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-white text-sm font-bold rounded-2xl hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5 transition-all shadow-sm disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
                        </button>
                    )}
                    {showImportButton && onImportClick && (
                        <button
                            onClick={onImportClick}
                            className="flex items-center justify-center gap-2 px-6 h-[52px] bg-fpt-orange text-white text-sm font-bold rounded-2xl hover:bg-orange-600 hover:shadow-lg hover:shadow-fpt-orange/20 transition-all shadow-sm"
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

