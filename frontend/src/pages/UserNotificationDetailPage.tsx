import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { dashboardService } from '../services/api/dashboardService';
import { AppNotification } from '../types/dashboard';
import { Loader2, Check, Paperclip, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export const UserNotificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
      <AdminLayout pageTitle="Chi tiết thông báo">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-fpt-orange" />
        </div>
      </AdminLayout>
    );
  }

  if (!notification) {
    return (
      <AdminLayout pageTitle="Chi tiết thông báo">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Không tìm thấy thông báo</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Chi tiết thông báo">
      <div className="mx-auto max-w-[960px] flex flex-col gap-6">
        {/* Notification Card */}
        <article className="flex flex-col bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
          {/* Header */}
          <div className="p-6 md:p-8 pb-0 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex flex-col gap-3 flex-1">
                {/* Status Badge */}
                {notification.isRead && (
                  <div className="flex items-start">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <Check size={12} />
                      Đã đọc
                    </span>
                  </div>
                )}

                {/* Title */}
                <h1 className="text-gray-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
                  {notification.title}
                </h1>

                {/* Sender and Timestamp Info */}
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  Gửi bởi{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {notification.senderFullName || notification.senderName || 'Hệ thống'}
                  </span>
                  {' '}vào lúc{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {notification.timestamp}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-2">
                {!notification.isRead && (
                  <button
                    onClick={async () => {
                      await dashboardService.markNotificationAsRead(notification.id);
                      setNotification(prev => prev ? { ...prev, isRead: true } : null);
                      toast.success('Đã đánh dấu là đã đọc');
                      setTimeout(() => navigate(-1), 1000);
                    }}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg bg-fpt-orange px-4 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-sm"
                  >
                    <Check size={20} />
                    <span>Đánh dấu đã đọc</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 pt-6">
            <div className="max-w-3xl">
              <div
                className="prose prose-lg dark:prose-invert max-w-none notification-content-document mb-8"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
                dangerouslySetInnerHTML={{ __html: notification.description }}
              />

              {/* Attachments */}
              {notification.attachmentUrls && notification.attachmentUrls.length > 0 && (
                <div className="pt-8 border-t border-gray-100 dark:border-zinc-800">
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Paperclip size={16} />
                    Tài liệu đính kèm ({notification.attachmentUrls.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {notification.attachmentUrls.map((url, index) => {
                      const fileName = url.split('/').pop() || `Attachment-${index + 1}`;
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

                      return (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-700/50 rounded-xl transition-all group"
                        >
                          <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0 text-fpt-orange shadow-sm group-hover:scale-105 transition-transform">
                            {isImage ? <ImageIcon size={24} /> : <FileText size={24} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-fpt-orange transition-colors">
                              {fileName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                              {url.split('.').pop()?.split('?')[0]} File
                            </p>
                          </div>
                          <ExternalLink size={16} className="text-gray-400 group-hover:text-fpt-orange transition-colors" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>
      </div>
    </AdminLayout>
  );
};
