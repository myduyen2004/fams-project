import React from 'react';
import { Search, Plus, Upload } from 'lucide-react';

interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  onImportClick: () => void;
  onAddClick: () => void;
  onActivateAllClick?: () => void;
  showActivateAll?: boolean;
}

export const UserFilters: React.FC<UserFiltersProps> = React.memo(({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  onImportClick,
  onAddClick,
  onActivateAllClick,
  showActivateAll = false
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3">
        <div className="relative">
          <select 
            className="appearance-none pl-3 pr-10 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-fpt-orange/20"
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên</option>
            <option value="ACADEMIC_STAFF">Phòng đào tạo</option>
            <option value="LECTURER">Giảng viên</option>
            <option value="STUDENT">Sinh viên</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text"
          placeholder="Tìm kiếm..."
          className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-full text-sm outline-none focus:ring-2 focus:ring-fpt-orange/20"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        {showActivateAll && onActivateAllClick && (
          <button 
            onClick={onActivateAllClick}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Kích hoạt tất cả
          </button>
        )}
        <button 
          onClick={onImportClick}
          className="flex items-center gap-2 px-4 py-2 border border-fpt-orange text-fpt-orange rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
        >
          <Upload size={18} />
          Nhập file zip
        </button>
        <button 
          onClick={onAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-fpt-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus size={18} />
          Thêm mới
        </button>
      </div>
    </div>
  );
});

UserFilters.displayName = 'UserFilters';
