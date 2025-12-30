import React from 'react';
import { Link } from 'react-router-dom';
import { Notification } from '../../../types/dashboard';
import { Bell } from 'lucide-react';

interface NotificationsSectionProps {
  notifications: Notification[];
  isDashboard?: boolean;
}

export const NotificationsSection: React.FC<NotificationsSectionProps> = ({ notifications, isDashboard = false }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 h-full">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Thông báo
        </h3>
        <Link to="/admin/notifications" className="text-sm text-fpt-orange hover:text-orange-600 font-medium">
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
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Bell size={16} className={notification.isRead ? 'text-gray-400' : 'text-fpt-orange'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    notification.isRead 
                      ? 'text-gray-700 dark:text-gray-300' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {notification.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {notification.timestamp}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-fpt-orange rounded-full"></div>
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
