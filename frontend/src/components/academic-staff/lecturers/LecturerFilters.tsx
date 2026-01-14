import React from 'react';
import { Search, Upload, Download, Loader2 } from 'lucide-react';

interface LecturerFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  departmentFilter?: string;
  onDepartmentFilterChange?: (value: string) => void;
  departments?: string[];
  onImportClick?: () => void;
  onExportClick?: () => void;
  showImportButton?: boolean;
  showDepartmentFilter?: boolean;
  showExportButton?: boolean;
  isExporting?: boolean;
}

export const LecturerFilters: React.FC<LecturerFiltersProps> = React.memo(({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  departmentFilter = 'all',
  onDepartmentFilterChange,
  onImportClick,
  onExportClick,
  showImportButton = true,
  showDepartmentFilter = true,
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
            placeholder="Tìm kiếm theo tên, email, mã giảng viên..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          />
        </div>

        {/* Chuyên ngành */}
        {showDepartmentFilter && onDepartmentFilterChange && (
          <div className="lg:w-48">
            <label className="block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1">
              Khoa
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => onDepartmentFilterChange(e.target.value)}
              className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="">Tất cả các khoa</option>

              <option value="Khoa Công nghệ Thông tin">Khoa Công nghệ Thông tin</option>
              <option value="Khoa Khoa học Máy tính">Khoa Khoa học Máy tính</option>
              <option value="Khoa Trí tuệ Nhân tạo">Khoa Trí tuệ Nhân tạo</option>
              <option value="Khoa Kỹ thuật Phần mềm">Khoa Kỹ thuật Phần mềm</option>

              <option value="Khoa Kinh tế">Khoa Kinh tế</option>
              <option value="Khoa Quản trị Kinh doanh">Khoa Quản trị Kinh doanh</option>
              <option value="Khoa Marketing">Khoa Marketing</option>
              <option value="Khoa Tài chính – Ngân hàng">Khoa Tài chính – Ngân hàng</option>

              <option value="Khoa Ngôn ngữ Anh">Khoa Ngôn ngữ Anh</option>
              <option value="Khoa Ngôn ngữ Nhật">Khoa Ngôn ngữ Nhật</option>
              <option value="Khoa Ngôn ngữ Hàn Quốc">Khoa Ngôn ngữ Hàn Quốc</option>
              <option value="Khoa Ngôn ngữ Trung Quốc">Khoa Ngôn ngữ Trung Quốc</option>

              <option value="Khoa Thiết kế Đồ họa">Khoa Thiết kế Đồ họa</option>
              <option value="Khoa Mỹ thuật">Khoa Mỹ thuật</option>
              <option value="Khoa Kiến trúc">Khoa Kiến trúc</option>

              <option value="Khoa Luật">Khoa Luật</option>
              <option value="Khoa Khoa học Xã hội">Khoa Khoa học Xã hội</option>
              <option value="Khoa Du lịch – Khách sạn">Khoa Du lịch – Khách sạn</option>
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
            <option value="INACTIVE">🟡 Chưa kích hoạt</option>
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
