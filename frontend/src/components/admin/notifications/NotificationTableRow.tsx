import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit2 } from 'lucide-react';
import { 
  AdminNotification, 
  getStatusLabel, 
  getStatusColor, 
  getTargetTypeLabel,
  NotificationStatus
} from '../../../types/notification';

interface NotificationTableRowProps {
  notification: AdminNotification;
  index: number;
  isSelected: boolean;
  onSelect: (id: number) => void;
  basePath?: string;
}

export const NotificationTableRow: React.FC<NotificationTableRowProps> = React.memo(({
  notification,
  index,
  isSelected,
  onSelect,
  basePath = '/admin'
}) => {
  const navigate = useNavigate();
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return { date: '--/--/----', time: '--:--' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: '--/--/----', time: '--:--' };
      
      // Manual format để tránh vấn đề timezone
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      
      return {
        date: `${day}/${month}/${year}`,
        time: `${hours}:${minutes}`
      };
    } catch {
      return { date: '--/--/----', time: '--:--' };
    }
  };

  // Lấy thời gian hiển thị dựa trên status
  // SCHEDULED: hiển thị scheduledAt
  // SENT: hiển thị sentAt
  // DRAFT: hiển thị ---
  const getDisplayDateTime = () => {
    if (notification.status === NotificationStatus.SCHEDULED) {
      return formatDateTime(notification.scheduledAt);
    } else if (notification.status === NotificationStatus.SENT) {
      return formatDateTime(notification.sentAt);
    }
    return { date: '--/--/----', time: '--:--' };
  };

  const displayDateTime = getDisplayDateTime();

  // Strip HTML tags for snippet
  const getSnippet = (content: string) => {
    const stripped = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return stripped.length > 80 ? stripped.substring(0, 80) + '...' : stripped;
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-sm">
      <td className="px-4 py-4">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange cursor-pointer"
          checked={isSelected}
          onChange={() => onSelect(notification.id)}
        />
      </td>
      <td className="px-4 py-4 text-gray-600 dark:text-gray-400 font-medium">
        {String(index + 1).padStart(2, '0')}
      </td>
      <td className="px-4 py-4 max-w-md">
        <div className="space-y-1">
          <span className="block font-semibold text-gray-900 dark:text-white">
            {notification.title}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
            {getSnippet(notification.content)}
          </span>
        </div>
      </td>
      <td className="px-4 py-4 text-gray-900 dark:text-white font-semibold">
        {getTargetTypeLabel(notification.targetType)}
      </td>
      <td className="px-4 py-4">
        <div className="space-y-0.5">
          <span className="block text-gray-700 dark:text-gray-300">{displayDateTime.date}</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">{displayDateTime.time}</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(notification.status)}`}>
          {getStatusLabel(notification.status)}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => navigate(`${basePath}/notifications/${notification.id}`)}
            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Xem chi tiết"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => navigate(`${basePath}/notifications/edit/${notification.id}`)}
            disabled={notification.status === NotificationStatus.SENT}
            className={`p-1.5 rounded-lg transition-colors ${
              notification.status === NotificationStatus.SENT
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                : 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
            }`}
            title={notification.status === NotificationStatus.SENT ? 'Không thể sửa thông báo đã gửi' : 'Chỉnh sửa'}
          >
            <Edit2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
});

NotificationTableRow.displayName = 'NotificationTableRow';
