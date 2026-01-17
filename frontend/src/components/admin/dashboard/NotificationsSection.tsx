import React from 'react';
import { Link } from 'react-router-dom';
import { AppNotification } from '../../../types/dashboard';
import { Bell } from 'lucide-react';

interface NotificationsSectionProps {
  notifications: AppNotification[];
  isDashboard?: boolean;
  viewAllUrl?: string;
}

export const NotificationsSection: React.FC<NotificationsSectionProps> = ({ notifications, isDashboard = false, viewAllUrl = '/notifications' }) => {
  // Strip HTML tags from text
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Truncate text with ellipsis
  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 h-full">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Thông báo
        </h3>
        <Link to={viewAllUrl} className="text-sm text-fpt-orange hover:text-orange-600 font-medium">
          Xem tất cả →
        </Link>
      </div>

      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            Không có thông báo nào
          </p>
        ) : (
          (isDashboard ? notifications.slice(0, 6) : notifications).map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.isRead
                  ? 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                  : 'border-fpt-orange/30 bg-orange-50 dark:bg-orange-900/10'
              } hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {notification.senderName && notification.senderName !== 'System' ? (
                    notification.senderAvatar ? (
                      <img 
                        src={notification.senderAvatar} 
                        alt={notification.senderFullName || notification.senderName} 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        notification.type === 'ALERT' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                         {(notification.senderFullName || notification.senderName).charAt(0)}
                      </div>
                    )
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      notification.type === 'SYSTEM' ? 'bg-blue-100 text-blue-600' :
                      notification.type === 'ALERT' ? 'bg-red-100 text-red-600' :
                      'bg-orange-100 text-fpt-orange'
                    }`}>
                       <Bell size={20} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-tight ${
                    notification.isRead 
                      ? 'text-gray-700 dark:text-gray-300 font-medium' 
                      : 'text-gray-900 dark:text-white font-bold'
                  }`}>
                    {notification.senderName && notification.senderName !== 'System' && (
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-normal mb-0.5">
                        {notification.senderFullName || notification.senderName}
                      </span>
                    )}
                    {stripHtml(notification.title)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {truncateText(stripHtml(notification.description))}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {notification.senderName && notification.senderName !== 'System' ? (notification.senderFullName || notification.senderName) : (notification.type === 'SYSTEM' ? 'Hệ thống' : 'Cảnh báo')}
                     </span>
                     <span className="text-[10px] text-gray-400">•</span>
                     <span className="text-[10px] text-gray-400 font-medium">{notification.timestamp}</span>
                  </div>
                </div>
                {!notification.isRead && (
                  <div className="flex-shrink-0 pt-1">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-900"></div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
