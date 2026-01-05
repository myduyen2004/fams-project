import React from 'react';
import { Loader2 } from 'lucide-react';

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
    <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
      <span className="text-sm font-medium text-fpt-orange">Đã chọn {selectedCount} tài khoản</span>
      <div className="flex gap-2">
        <button 
          onClick={onDelete}
          disabled={isDeleting}
          className="px-4 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
        >
          {isDeleting && <Loader2 size={14} className="animate-spin" />}
          {selectedCount === 1 ? 'Xóa' : 'Xóa hàng loạt'}
        </button>
        <button 
          onClick={onActivate}
          disabled={isActivating}
          className="px-4 py-1.5 text-sm bg-fpt-orange text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
        >
          {isActivating && <Loader2 size={14} className="animate-spin" />}
          {selectedCount === 1 ? 'Kích hoạt' : 'Kích hoạt hàng loạt'}
        </button>
      </div>
    </div>
  );
});

BulkActions.displayName = 'BulkActions';
