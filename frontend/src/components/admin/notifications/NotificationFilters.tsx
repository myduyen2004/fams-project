import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { NotificationStatus, TargetType } from '../../../types/notification';

interface NotificationFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  targetTypeFilter: string;
  onTargetTypeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export const NotificationFilters: React.FC<NotificationFiltersProps> = React.memo(({
  search,
  onSearchChange,
  targetTypeFilter,
  onTargetTypeFilterChange,
  statusFilter,
  onStatusFilterChange
}) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-4 mb-6">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề hoặc nội dung..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange transition-all"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button
          onClick={() => navigate('/admin/notifications/create')}
          className="flex items-center gap-2 px-4 py-2 bg-fpt-orange text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Tạo thông báo
        </button>
      </div>

      {/* Filter Area */}
      <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-100 dark:border-zinc-800">
        {/* Target Type Filter */}
        <div className="relative">
          <select
            className="appearance-none pl-3 pr-10 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-fpt-orange/20 cursor-pointer transition-colors"
            value={targetTypeFilter}
            onChange={(e) => onTargetTypeFilterChange(e.target.value)}
          >
            <option value="ALL">Đối tượng: Tất cả</option>
            <option value={TargetType.ALL}>Toàn trường</option>
            <option value={TargetType.STUDENT}>Sinh viên</option>
            <option value={TargetType.LECTURER}>Giảng viên</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            className="appearance-none pl-3 pr-10 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-fpt-orange/20 cursor-pointer transition-colors"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="ALL">Trạng thái: Tất cả</option>
            <option value={NotificationStatus.DRAFT}>Nháp</option>
            <option value={NotificationStatus.SCHEDULED}>Đã lên lịch</option>
            <option value={NotificationStatus.SENT}>Đã gửi</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Clear Filters */}
        {(targetTypeFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <button
            onClick={() => {
              onTargetTypeFilterChange('ALL');
              onStatusFilterChange('ALL');
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white underline hover:underline-offset-2 transition-colors"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>
    </div>
  );
});

NotificationFilters.displayName = 'NotificationFilters';

