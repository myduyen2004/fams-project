import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AcademicStaffLayout } from '../layouts/AcademicStaffLayout';
import { LecturerLayout } from '../layouts/LecturerLayout';
import { StudentLayout } from '../layouts/StudentLayout';
import { Pagination } from '../components/common/Pagination';
import { dashboardService } from '../services/api/dashboardService';
import { authService } from '../services/api/authService';
import { AppNotification } from '../types/dashboard';
import { Loader2, Search, Bell, AlertCircle, CheckCircle2, User, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePagination } from '../hooks/usePagination';

type FilterType = 'all' | 'unread' | 'system';

const getNotificationIcon = (type?: string) => {
  switch (type) {
    case 'SYSTEM':
      return <AlertCircle className="w-5 h-5" />;
    case 'ALERT':
      return <AlertCircle className="w-5 h-5" />;
    case 'IMPORT':
      return <CheckCircle2 className="w-5 h-5" />;
    default:
      return <Bell className="w-5 h-5" />;
  }
};

const getNotificationColor = (type?: string) => {
  switch (type) {
    case 'SYSTEM':
      return 'bg-fpt-orange/15 text-fpt-orange';
    case 'ALERT':
      return 'bg-red-100/50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
    case 'IMPORT':
      return 'bg-green-100/50 text-green-600 dark:bg-green-900/20 dark:text-green-400';
    default:
      return 'bg-blue-100/50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
  }
};

const parseDateTime = (timestamp: string): Date | null => {
  if (!timestamp) return null;

  // Try standard ISO parsing
  const date = new Date(timestamp);
  if (!isNaN(date.getTime())) return date;

  // Custom parsing for "dd/MM/yyyy HH:mm"
  const match = timestamp.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (match) {
    const [_, day, month, year, hours, minutes] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
  }

  return null;
};

const formatDateTime = (timestamp: string): string => {
  try {
    const date = parseDateTime(timestamp);
    if (!date) return timestamp;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return timestamp;
  }
};

export const NotificationListPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Strip HTML tags from text
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Process notification content to get first line with formatting
  const processNotificationContent = (html: string) => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    let content = '';

    // Strategy 1: Find first paragraph with text content
    const paragraphs = tempDiv.querySelectorAll('p');
    for (let i = 0; i < paragraphs.length; i++) {
      // Check if paragraph has meaningful text (ignoring whitespace/nbsp)
      if (paragraphs[i].textContent && paragraphs[i].textContent?.replace(/[\s\u00A0]/g, '').length > 0) {
        content = paragraphs[i].innerHTML;
        break;
      }
    }

    // Strategy 2: If no valid p found, split by <br> and find first non-empty line
    if (!content) {
      const lines = tempDiv.innerHTML.split(/<br\s*\/?>/i);
      content = lines.find(line => {
        const t = document.createElement('div');
        t.innerHTML = line;
        // Check if line has meaningful text
        return t.textContent && t.textContent.replace(/[\s\u00A0]/g, '').length > 0;
      }) || lines[0] || '';
    }

    // Remove leading <br> tags if any remain
    content = content.replace(/^(\s*<br\s*\/?>\s*)+/gi, '');

    // Robust trimming of leading whitespace/entities while preserving formatting tags
    // Matches start of string, optional tags, then whitespace/entities
    // Loop to handle deep nesting (e.g. <b><i>&nbsp;Text</i></b>)
    let oldContent = '';
    while (content !== oldContent) {
      oldContent = content;
      content = content.replace(/^((?:<[^>]+>)*)(?:&nbsp;|&#160;|\s)+/gi, '$1');
    }

    return content;
  };

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 10;
  const user = authService.getUser();

  // Use custom pagination hook - auto resets to page 0 when filters change
  const { page: currentPage, setPage: setCurrentPage } = usePagination({
    resetDependencies: [filter, searchTerm]
  });

  const getLayout = (role?: string) => {
    switch (role) {
      case 'STUDENT':
        return StudentLayout;
      case 'ACADEMIC_STAFF':
        return AcademicStaffLayout;
      case 'LECTURER':
        return LecturerLayout;
      default:
        return AdminLayout;
    }
  };

  const LayoutComponent = getLayout(user?.role);

  // Load notifications - defined outside useEffect so it can be reused
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      // Use dashboardService.getNotifications() for all roles
      // This endpoint returns notifications from NotificationRecipient table
      // which properly tracks isRead status per user
      const recipientNotifications = await dashboardService.getNotifications();

      // Sort by timestamp desc (requires proper parsing)
      const sortedNotifs = [...recipientNotifications].sort((a, b) => {
        const dateA = parseDateTime(a.timestamp);
        const dateB = parseDateTime(b.timestamp);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      });

      setNotifications(sortedNotifs);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Filter notifications
  const filteredNotifications = notifications.filter((notif) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'unread' && !notif.isRead) ||
      (filter === 'system' && notif.type === 'SYSTEM');

    const matchesSearch =
      notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Pagination
  const totalElements = filteredNotifications.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedNotifications = filteredNotifications.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Note: Page reset is now handled by usePagination hook

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      // Immediately update UI state for instant feedback
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

      // Then sync with backend using the dedicated endpoint
      await dashboardService.markAllNotificationsAsRead();
      toast.success('Đã đánh dấu tất cả là đã đọc');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Không thể đánh dấu tất cả là đã đọc');
      // Reload notifications on error to restore correct state
      loadNotifications();
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) {
      try {
        await dashboardService.markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
    if (notification.targetUrl) {
      navigate(notification.targetUrl);
    } else {
      navigate(`/notifications/${notification.id}`);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    switch (user?.role) {
      case 'STUDENT':
        navigate('/student/dashboard');
        break;
      case 'ACADEMIC_STAFF':
      case 'LECTURER':
        navigate('/academic-staff/dashboard');
        break;
      default:
        navigate('/admin/dashboard');
    }
  };

  if (loading) {
    return (
      <LayoutComponent pageTitle="Thông báo">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-fpt-orange" />
        </div>
      </LayoutComponent>
    );
  }



  return (
    <LayoutComponent pageTitle="Thông báo">
      <div className="mb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-fpt-orange transition-colors w-fit group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Quay lại Dashboard
        </button>
      </div>
      <div className="mx-auto max-w-5xl flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col gap-6">
          {/* Title and Stats */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex flex-col gap-4">

                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                  Thông báo
                </h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {unreadCount > 0
                  ? `Bạn có ${unreadCount} thông báo chưa đọc`
                  : 'Bạn đã đọc tất cả thông báo'}
              </p>
            </div>

            {/* Mark All as Read Button */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center justify-center gap-2 px-6 h-11 rounded-xl bg-fpt-orange text-white font-semibold hover:bg-orange-600 active:bg-orange-700 transition-all shadow-sm hover:shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Đánh dấu tất cả là đã đọc</span>
              </button>
            )}
          </div>

          {/* Tabs and Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-zinc-800">
            {/* Filter Tabs */}
            <nav className="flex gap-6 overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={`whitespace-nowrap pb-3 text-sm font-bold transition-all border-b-2 ${filter === 'all'
                  ? 'border-fpt-orange text-fpt-orange'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`whitespace-nowrap pb-3 text-sm font-bold transition-all border-b-2 ${filter === 'unread'
                  ? 'border-fpt-orange text-fpt-orange'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                Chưa đọc {unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
              </button>

            </nav>

            {/* Search Bar */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm thông báo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange transition-all"
              />
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {paginatedNotifications.length > 0 ? (
          <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
            {paginatedNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`group flex items-start gap-4 p-5 cursor-pointer transition-all relative ${!notification.isRead
                  ? 'bg-fpt-orange/5 hover:bg-fpt-orange/10 border-b border-gray-100 dark:border-zinc-800'
                  : 'bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800 last:border-b-0'
                  }`}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${getNotificationColor(
                    notification.type
                  )}`}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 gap-1 min-w-0 pr-8">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm leading-tight ${!notification.isRead
                        ? 'font-bold text-gray-900 dark:text-white'
                        : 'font-semibold text-gray-900 dark:text-gray-200'
                        }`}
                    >
                      {stripHtml(notification.title)}
                    </p>
                  </div>

                  {/* Sender Info */}
                  {notification.senderName && notification.senderName !== 'System' && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <User className="w-3 h-3" />
                      <span>{notification.senderName}</span>
                    </div>
                  )}

                  {/* Description */}
                  <div
                    className={`text-sm leading-relaxed line-clamp-1 ${!notification.isRead
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400'
                      }`}
                    dangerouslySetInnerHTML={{
                      __html: processNotificationContent(notification.description),
                    }}
                  />

                  {/* Footer with timestamp and type */}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDateTime(notification.timestamp)}
                    </span>

                    {/* Type Badge */}
                    {notification.type && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400">
                        {notification.senderName && notification.senderName !== 'System'
                          ? notification.senderName
                          : notification.type === 'SYSTEM'
                            ? 'Hệ thống'
                            : notification.type === 'ALERT'
                              ? 'Cảnh báo'
                              : notification.type === 'IMPORT'
                                ? 'Nhập'
                                : notification.type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Unread Indicator Dot */}
                {!notification.isRead && (
                  <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-fpt-orange rounded-full" />
                )}
              </div>
            ))}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 pb-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalElements={totalElements}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {searchTerm
                ? 'Không tìm thấy thông báo phù hợp'
                : 'Bạn không có thông báo nào'}
            </p>
          </div>
        )}
      </div>
    </LayoutComponent>
  );
};
