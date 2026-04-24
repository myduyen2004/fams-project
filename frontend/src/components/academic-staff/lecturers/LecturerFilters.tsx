import React, { useEffect, useState } from 'react';
import { Search, Upload, Download, Loader2 } from 'lucide-react';
import { academicStaffService } from '../../../services/api/academicStaffService';

interface LecturerFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  majorFilter?: string;
  onMajorFilterChange?: (value: string) => void;
  specializationFilter?: string;
  onSpecializationFilterChange?: (value: string) => void;
  onImportClick?: () => void;
  onExportClick?: () => void;
  showImportButton?: boolean;
  showMajorFilter?: boolean;
  showExportButton?: boolean;
  isExporting?: boolean;
  // Legacy props kept for backward compatibility
  departmentFilter?: string;
  onDepartmentFilterChange?: (value: string) => void;
  departments?: string[];
  showDepartmentFilter?: boolean;
}

export const LecturerFilters: React.FC<LecturerFiltersProps> = React.memo(({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  majorFilter = 'all',
  onMajorFilterChange,
  specializationFilter = 'all',
  onSpecializationFilterChange,
  onImportClick,
  onExportClick,
  showImportButton = true,
  showMajorFilter = true,
  showExportButton = true,
  isExporting = false,
  // Legacy support
  showDepartmentFilter,
}) => {
  const [majors, setMajors] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);

  // Show major filter if either showMajorFilter or legacy showDepartmentFilter is set
  const shouldShowFilter = showMajorFilter || showDepartmentFilter;

  useEffect(() => {
    if (!shouldShowFilter) return;
    academicStaffService.getAllMajors()
      .then(setMajors)
      .catch(() => console.error('Failed to fetch majors'));
  }, [shouldShowFilter]);

  useEffect(() => {
    if (majorFilter && majorFilter !== 'all') {
      academicStaffService.getSpecializationsByMajor(majorFilter)
        .then(setSpecializations)
        .catch(() => setSpecializations([]));
    } else {
      setSpecializations([]);
      onSpecializationFilterChange?.('all');
    }
  }, [majorFilter]);

  return (
    <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-6 border border-gray-100 dark:border-zinc-700">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">

        {/* Search */}
        <div className="flex-1 lg:max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, mã giảng viên..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          />
        </div>

        {/* Ngành dạy */}
        {shouldShowFilter && onMajorFilterChange && (
          <div className="lg:w-48">
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
              Ngành dạy
            </label>
            <select
              value={majorFilter}
              onChange={(e) => onMajorFilterChange(e.target.value)}
              className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="all">Tất cả ngành</option>
              {majors.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* Chuyên ngành – chỉ hiện khi đã chọn ngành */}
        {shouldShowFilter && onSpecializationFilterChange && majorFilter && majorFilter !== 'all' && specializations.length > 0 && (
          <div className="lg:w-52">
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
              Chuyên ngành
            </label>
            <select
              value={specializationFilter}
              onChange={(e) => onSpecializationFilterChange(e.target.value)}
              className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="all">Tất cả chuyên ngành</option>
              {specializations.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Trạng thái */}
        <div className="lg:w-44">
          <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
            Trạng thái
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="ACTIVE">🟢 Đang hoạt động</option>
            <option value="LOCKED">🔴 Đã khóa</option>
          </select>
        </div>

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

LecturerFilters.displayName = 'LecturerFilters';
