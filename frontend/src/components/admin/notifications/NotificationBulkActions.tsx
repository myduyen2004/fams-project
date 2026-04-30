import React from 'react';
import { Loader2, Trash2, AlertCircle } from 'lucide-react';

interface NotificationBulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  isDeleting: boolean;
  canDelete?: boolean;
  hasSentNotification?: boolean;
}

export const NotificationBulkActions: React.FC<NotificationBulkActionsProps> = React.memo(({
  selectedCount,
  onDelete,
  isDeleting,
  canDelete = true,
  hasSentNotification = false
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-2xl space-y-3 animate-in slide-in-from-top-4 duration-300 shadow-sm">
      {hasSentNotification && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
            Không thể xóa thông báo đã gửi. Vui lòng chỉ chọn thông báo nháp hoặc đã lên lịch.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between ml-2">
        <span className="text-sm font-bold text-red-700 dark:text-red-400">
          Đã chọn {selectedCount} thông báo
        </span>
        <div className="flex gap-2">

          <button
            onClick={onDelete}
            disabled={isDeleting || !canDelete}
            className={`h-[44px] px-6 text-sm bg-white dark:bg-zinc-900 border-2 rounded-2xl transition-all flex items-center gap-2 font-bold active:scale-95 shadow-sm ${
              canDelete
                ? 'border-red-100 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200'
                : 'border-gray-200 dark:border-zinc-700 text-gray-400 cursor-not-allowed opacity-50'
            } disabled:opacity-50`}
            title={!canDelete ? 'Không thể xóa vì có thông báo đã gửi' : 'Xóa đã chọn'}
          >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            <span>Xóa đã chọn</span>
          </button>
        </div>
      </div>
    </div>
  );
});

NotificationBulkActions.displayName = 'NotificationBulkActions';

