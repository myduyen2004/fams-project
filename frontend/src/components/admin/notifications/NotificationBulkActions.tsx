import React from 'react';
import { Loader2, Eye, EyeOff, Trash2, AlertCircle } from 'lucide-react';

interface NotificationBulkActionsProps {
  selectedCount: number;
  onPublish: () => void;
  onHide: () => void;
  onDelete: () => void;
  isPublishing: boolean;
  isHiding: boolean;
  isDeleting: boolean;
  canDelete?: boolean;
  hasSentNotification?: boolean;
}

export const NotificationBulkActions: React.FC<NotificationBulkActionsProps> = React.memo(({
  selectedCount,
  onPublish,
  onHide,
  onDelete,
  isPublishing,
  isHiding,
  isDeleting,
  canDelete = true,
  hasSentNotification = false
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-lg space-y-3">
      {hasSentNotification && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Không thể xóa thông báo đã gửi. Vui lòng chỉ chọn thông báo nháp hoặc đã lên lịch.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-fpt-orange">
          Đã chọn {selectedCount} thông báo
        </span>
        <div className="flex gap-2">
          
         
          {selectedCount === 1 && (
            <button
              onClick={onEdit}
              className="px-4 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-orange-200 dark:border-orange-800 text-fpt-orange rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              Chỉnh sửa
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={isDeleting || !canDelete}
            className={`px-4 py-1.5 text-sm bg-white dark:bg-zinc-800 border rounded-lg transition-colors flex items-center gap-2 ${
              canDelete
                ? 'border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'border-gray-200 dark:border-zinc-700 text-gray-400 cursor-not-allowed opacity-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={!canDelete ? 'Không thể xóa vì có thông báo đã gửi' : 'Xóa'}
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
});

NotificationBulkActions.displayName = 'NotificationBulkActions';
