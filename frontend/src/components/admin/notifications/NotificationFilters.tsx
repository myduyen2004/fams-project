import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationStatus, TargetType } from '../../../types/notification';

// --- Inline Select Component (Non-portal version for z-index stability) ---
interface InlineSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}

const InlineSelect: React.FC<InlineSelectProps> = ({ value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white"
            >
                <span className="font-bold">{selectedOption ? selectedOption.label : 'Chọn...'}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-2xl z-[70] py-2 overflow-hidden"
                    >
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/10
                                    ${value === opt.value ? 'text-fpt-orange bg-orange-50/50 dark:bg-orange-900/5 font-bold' : 'text-gray-700 dark:text-gray-300'}
                                `}
                            >
                                <span>{opt.label}</span>
                                {value === opt.value && <Check size={16} className="text-fpt-orange" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

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
  onStatusFilterChange,
}) => {
  return (
    <div className="space-y-4 mb-6">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề hoặc nội dung..."
            className="w-full pl-10 pr-4 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5 outline-none text-gray-900 dark:text-white font-medium"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Area */}
      <div className="flex flex-wrap gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 shadow-sm">
        <div className="relative w-64">
          <InlineSelect
            value={targetTypeFilter}
            onChange={onTargetTypeFilterChange}
            options={[
              { value: 'ALL', label: 'Tất cả đối tượng' },
              { value: TargetType.ALL, label: 'Toàn trường' },
              { value: TargetType.STUDENT, label: 'Sinh viên' },
              { value: TargetType.LECTURER, label: 'Giảng viên' }
            ]}
          />
        </div>

        <div className="relative w-64">
          <InlineSelect
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: NotificationStatus.DRAFT, label: 'Bản nháp' },
              { value: NotificationStatus.SCHEDULED, label: 'Đã lên lịch' },
              { value: NotificationStatus.SENT, label: 'Đã gửi' }
            ]}
          />
        </div>

        {/* Clear Filters */}
        {(targetTypeFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <button
            onClick={() => {
              onTargetTypeFilterChange('ALL');
              onStatusFilterChange('ALL');
            }}
            className="px-4 py-2 text-sm font-black text-gray-400 hover:text-fpt-orange transition-colors flex items-center uppercase tracking-widest active:scale-95"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>
    </div>
  );
});

NotificationFilters.displayName = 'NotificationFilters';

