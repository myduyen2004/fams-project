import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AcademicStaffLayout } from '../layouts/AcademicStaffLayout';
import { authService } from '../services/api/authService';
import { dashboardService } from '../services/api/dashboardService';
import { AppNotification } from '../types/dashboard';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const UserNotificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = authService.getUser();
  const Layout = user?.role === 'ACADEMIC_STAFF' ? AcademicStaffLayout : AdminLayout;

  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotification = async () => {
      if (!id) {
        navigate(-1);
        return;
      }

      try {
        setLoading(true);
        const data = await dashboardService.getNotificationById(parseInt(id));
        if (data) {
          setNotification(data);
        } else {
          toast.error('Không tìm thấy thông báo');
          navigate(-1);
        }
      } catch (error) {
        console.error('Failed to load notification:', error);
        toast.error('Không thể tải thông báo');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    loadNotification();
  }, [id, navigate]);

  if (loading) {
    return (
      <Layout pageTitle="Chi tiết thông báo">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-fpt-orange" />
        </div>
      </Layout>
    );
  }

  if (!notification) {
    return (
      <Layout pageTitle="Chi tiết thông báo">
        <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Không tìm thấy thông báo</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Chi tiết thông báo">
      <div className="flex flex-col justify-center px-4 md:px-0">
        <div className="flex flex-col max-w-[1200px] w-full mx-auto flex-1 gap-8">
          {/* Header Section */}
          <div className="flex flex-col gap-4">
            <h1 className="text-slate-900 dark:text-white text-3xl md:text-5xl font-black leading-tight tracking-tight">
              {notification.title}
            </h1>

            <div className="flex items-end justify-between">
              {/* Left Side: Status + Meta */}
              <div className="flex flex-col gap-3">
                <div className="flex">
                  <span className={`text-xs font-bold px-3 py-1 rounded uppercase tracking-wider ${notification.isRead
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                    {notification.isRead ? 'Đã đọc' : 'Mới'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400">
                  <p className="text-sm font-medium">
                    Ngày gửi: <span className="text-slate-700 dark:text-slate-200">{notification.timestamp}</span>
                  </p>
                  <p className="text-sm font-medium">
                    Người gửi: <span className="text-slate-700 dark:text-slate-200">{notification.senderFullName || notification.senderName || 'Hệ thống'}</span>
                  </p>
                </div>
              </div>

              {/* Right Side: Mark as Read Button */}
              {!notification.isRead && (
                <div className="pb-1">
                  <button
                    onClick={async () => {
                      try {
                        await dashboardService.markNotificationAsRead(notification.id);
                        setNotification(prev => prev ? { ...prev, isRead: true } : null);
                        toast.success('Đã đánh dấu là đã đọc');
                        // Optional: trigger refresh
                        window.dispatchEvent(new Event('notificationRefresh'));
                      } catch (error) {
                        toast.error('Không thể cập nhật trạng thái');
                      }
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-fpt-orange text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
                  >
                    Đánh dấu đã đọc
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Left Column: Content */}
            <div className="lg:col-span-2 flex">
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm w-full flex flex-col">
                <h3 className="text-slate-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest mb-6">
                  Nội dung thông báo
                </h3>
                {/* Prose content */}
                <div className="prose prose-slate dark:prose-invert max-w-none flex-grow">
                  <div
                    className="text-slate-800 dark:text-slate-200 text-lg leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: notification.description }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Details */}
            <div className="flex">
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm w-full">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-slate-900 dark:text-white text-base font-bold">
                    Thông tin chi tiết
                  </h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-slate-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                      Người gửi
                    </p>
                    <p className="text-slate-900 dark:text-white text-sm font-semibold">
                      {notification.senderFullName || notification.senderName || 'Hệ thống'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                      Thời gian nhận
                    </p>
                    <p className="text-slate-700 dark:text-gray-300 text-sm">
                      {notification.timestamp}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                      Loại thông báo
                    </p>
                    <p className="text-slate-700 dark:text-gray-300 text-sm">
                      {notification.type || 'Hệ thống'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          {notification.attachmentUrls && notification.attachmentUrls.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-slate-900 dark:text-white text-base font-bold">
                Tài liệu đính kèm ({notification.attachmentUrls.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notification.attachmentUrls.map((url, index) => {
                  let fileName = 'unknown-file';
                  try {
                    // Try to get distinct filename if possible
                    const decodedUrl = decodeURIComponent(url);
                    fileName = decodedUrl.split('/').pop()?.split('?')[0] || `File-${index + 1}`;
                  } catch (e) {
                    fileName = url.split('/').pop() || `File-${index + 1}`;
                  }
                  const extension = fileName.split('.').pop()?.toUpperCase() || 'FILE';

                  return (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-4 hover:border-fpt-orange hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-900 dark:text-white font-semibold text-sm truncate group-hover:text-fpt-orange transition-colors">
                          {fileName}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {extension} File
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
