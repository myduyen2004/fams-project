import React from 'react';
import { Loader2, Trash2, Zap, Filter } from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  onActivate: () => void;
  isDeleting: boolean;
  isActivating: boolean;
}

export const BulkActions: React.FC<BulkActionsProps> = React.memo(({
  selectedCount,
  onDelete,
  onActivate,
  isDeleting,
  isActivating
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/30 rounded-2xl flex items-center justify-between mb-6 animate-in slide-in-from-top-4 duration-300 shadow-sm">
      <div className="flex items-center gap-3 ml-2">
        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-fpt-orange">
            <Filter size={16} />
        </div>
        <span className="text-sm font-bold text-orange-700 dark:text-orange-400">Đã chọn {selectedCount} tài khoản</span>
      </div>
      <div className="flex gap-3">
        <button 
          onClick={onDelete}
          disabled={isDeleting}
          className="h-[44px] px-6 text-sm bg-white dark:bg-zinc-900 border-2 border-red-100 dark:border-red-900/30 text-red-600 rounded-2xl font-bold hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm active:scale-95"
        >
          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          <span>Xóa đã chọn</span>
        </button>
        <button 
          onClick={onActivate}
          disabled={isActivating}
          className="h-[44px] px-8 text-sm bg-fpt-orange text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-fpt-orange/20 flex items-center gap-2 disabled:opacity-50 active:scale-95"
        >
          {isActivating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          <span>Kích hoạt ngay</span>
        </button>
      </div>
    </div>
  );
});

BulkActions.displayName = 'BulkActions';

