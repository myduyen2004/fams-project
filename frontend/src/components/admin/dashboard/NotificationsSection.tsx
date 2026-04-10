import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppNotification } from '../../../types/dashboard';
import { Bell, ArrowRight } from 'lucide-react';

interface NotificationsSectionProps {
  notifications: AppNotification[];
  isDashboard?: boolean;
  viewAllUrl?: string;
}

export const NotificationsSection: React.FC<NotificationsSectionProps> = ({ notifications, isDashboard = false, viewAllUrl = '/notifications' }) => {
  const navigate = useNavigate();
  
  const getFirstLineHtml = (html: string): string => {
    let clean = html;
    let prev;
    do {
      prev = clean;
      clean = clean.replace(/^(\s|&nbsp;|<br\s*\/?>)+/i, '');
      clean = clean.replace(/^<(p|div|h[1-6]|li)[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/\1>/i, '');
    } while (clean !== prev && clean.length > 0);
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
    <div className="bg-white dark:bg-zinc-900 rounded-[24px] shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col h-full overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-10">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          Thông báo
        </h3>
        <Link to={viewAllUrl} className="group flex items-center gap-1.5 text-xs font-bold text-fpt-orange hover:text-orange-600 transition-colors uppercase tracking-wider">
          Xem tất cả
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <Bell size={32} className="text-gray-300 dark:text-zinc-700" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">
              Không có thông báo nào
            </p>
          </div>
        ) : (
          (isDashboard ? notifications.slice(0, 6) : notifications).map((notification) => (
            <div
              key={notification.id}
              onClick={() => navigate(`/notifications/${notification.id}`)}
              className={`group p-4 rounded-2xl border cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 ${notification.isRead
                ? 'border-gray-50 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md'
                : 'border-fpt-orange/20 bg-orange-50/30 dark:bg-orange-900/5 hover:border-fpt-orange/40 hover:shadow-md shadow-sm shadow-orange-500/5'
                }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {notification.senderName && notification.senderName !== 'System' ? (
                    notification.senderAvatar ? (
                      <div className="relative">
                        <img
                          src={notification.senderAvatar}
                          alt={notification.senderFullName || notification.senderName}
                          className="w-11 h-11 rounded-1.5xl object-cover ring-2 ring-white dark:ring-zinc-900 shadow-sm"
                        />
                        {!notification.isRead && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse"></span>
                        )}
                      </div>
                    ) : (
                      <div className={`w-11 h-11 rounded-1.5xl flex items-center justify-center text-sm font-black shadow-sm ring-2 ring-white dark:ring-zinc-900 ${notification.type === 'ALERT' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {(notification.senderFullName || notification.senderName).charAt(0)}
                      </div>
                    )
                  ) : (
                    <div className={`w-11 h-11 rounded-1.5xl flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-zinc-900 ${notification.type === 'SYSTEM' ? 'bg-blue-50 text-blue-600' :
                      notification.type === 'ALERT' ? 'bg-red-50 text-red-600' :
                        'bg-orange-50 text-fpt-orange'
                      }`}>
                      <Bell size={20} className={!notification.isRead ? 'animate-bounce' : ''} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-sm leading-tight line-clamp-2 ${notification.isRead
                      ? 'text-gray-700 dark:text-zinc-300 font-medium'
                      : 'text-gray-900 dark:text-white font-bold'
                      }`}>
                      {notification.title}
                    </p>
                  </div>
                  <div
                    className="text-xs text-gray-500 dark:text-zinc-400 mt-1.5 line-clamp-1 leading-relaxed italic"
                    dangerouslySetInnerHTML={{ __html: getFirstLineHtml(notification.description) }}
                  />
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap">
                      {notification.senderName && notification.senderName !== 'System' 
                        ? (notification.senderFullName || notification.senderName) 
                        : (notification.type === 'SYSTEM' ? 'Hệ thống' : 
                           notification.type === 'ALERT' ? 'Cảnh báo' : 
                           notification.type === 'SUBMISSION' ? 'Bài nộp' :
                           notification.type === 'NEWS' ? 'Tin tức' : 
                           notification.type === 'SCHEDULE' ? 'Lịch trình' : 'Thông báo')}
                    </span>
                    <span className="text-[10px] text-gray-300 dark:text-zinc-700">•</span>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium tabular-nums">{notification.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

