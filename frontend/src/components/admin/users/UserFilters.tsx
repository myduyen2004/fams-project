import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Upload, ChevronDown, Check, Zap } from 'lucide-react';

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
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  const roles = [
    { value: 'all', label: 'Tất cả vai trò' },
    { value: 'ADMIN', label: 'Quản trị viên' },
    { value: 'ACADEMIC_STAFF', label: 'Phòng đào tạo' },
    { value: 'LECTURER', label: 'Giảng viên' },
    { value: 'STUDENT', label: 'Sinh viên' }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setIsRoleOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Role Selector */}
        <div className="flex-1 min-w-[200px]" ref={roleRef}>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 ml-1">
            Lọc theo vai trò
          </label>
          <div className="relative">
                <button
                  onClick={() => setIsRoleOpen(!isRoleOpen)}
                  className="flex h-[52px] items-center justify-between w-full rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-left focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {roles.find(r => r.value === roleFilter)?.label}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isRoleOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
                </button>

            {isRoleOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl py-1 animate-in slide-in-from-top-2 duration-200">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => {
                      onRoleFilterChange(r.value);
                      setIsRoleOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${roleFilter === r.value
                      ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange'
                      : 'text-gray-700 dark:text-zinc-300'
                      }`}
                  >
                    <span className="text-sm font-medium">{r.label}</span>
                    {roleFilter === r.value && <Check size={14} className="stroke-[3]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search Box */}
        <div className="flex-[2] min-w-[300px]">
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 ml-1">
            Tìm kiếm tài khoản
          </label>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Nhập tên, mã số hoặc email để tìm kiếm..."
              className="w-full h-[52px] pl-12 pr-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5 outline-none text-gray-900 dark:text-white"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Actions Group */}
        <div className="flex items-center gap-2">
          {showActivateAll && onActivateAllClick && (
            <button
              onClick={onActivateAllClick}
              className="flex h-[52px] items-center gap-2 px-6 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 group"
            >
              <Zap size={18} className="group-hover:animate-pulse" />
              <span>Kích hoạt tất cả</span>
            </button>
          )}
          <button
            onClick={onImportClick}
            className="flex h-[52px] items-center gap-2 px-6 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 rounded-2xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 hover:border-gray-200 transition-all shadow-sm active:scale-95"
          >
            <Upload size={18} />
            <span>Nhập ZIP</span>
          </button>
          <button
            onClick={onAddClick}
            className="flex h-[52px] items-center gap-2 px-8 bg-fpt-orange text-white rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-fpt-orange/20 active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            <span>Thêm mới</span>
          </button>
        </div>
      </div>
    </div>
  );
});

UserFilters.displayName = 'UserFilters';

