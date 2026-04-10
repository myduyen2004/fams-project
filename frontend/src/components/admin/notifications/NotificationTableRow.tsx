import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
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

  // Get the first line of content preserving HTML tags
  const getFirstLineHtml = (content: string) => {
    let clean = content;

    // 1. Strip leading empty blocks (e.g. <p><br></p>, <p>&nbsp;</p>) and loose breaks/spaces
    let prev;
    do {
      prev = clean;
      // Strip loose <br>, whitespace, &nbsp;
      clean = clean.replace(/^(\s|&nbsp;|<br\s*\/?>)+/i, '');
      // Strip empty tags P, DIV, H1-6, LI containing only whitespace/br/&nbsp;
      clean = clean.replace(/^<(p|div|h[1-6]|li)[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/\1>/i, '');
    } while (clean !== prev && clean.length > 0);

    // 2. Strip leading whitespace strictly inside the first opening tag if present
    clean = clean.replace(/^(<[a-z][^>]*>)(\s|&nbsp;|<br\s*\/?>)+/i, '$1');

    const splitRegex = /(<br\s*\/?>|<\/(p|div|h[1-6]|li)>)/i;
    const match = clean.match(splitRegex);

    if (match && match.index !== undefined) {
      if (match[0].startsWith('</')) {
        return clean.substring(0, match.index + match[0].length).trim();
      } else {
        return clean.substring(0, match.index).trim();
      }
    }
    return clean.trim();
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
          <div
            className="text-xs text-gray-500 dark:text-gray-400 truncate-html"
            dangerouslySetInnerHTML={{ __html: getFirstLineHtml(notification.content) }}
          />
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
            onClick={() => navigate(`${basePath}/notification-management/${notification.id}`)}
            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Xem chi tiết"
          >
            <Eye size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
});

NotificationTableRow.displayName = 'NotificationTableRow';
