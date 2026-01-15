import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { dashboardService } from '../services/api/dashboardService';
import { AppNotification } from '../types/dashboard';
import { Loader2, Check, User } from 'lucide-react';
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
        const notifications = await dashboardService.getNotifications();
        const found = notifications.find(n => n.id === parseInt(id));
        if (found) {
          setNotification(found);
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
                className="prose prose-lg dark:prose-invert max-w-none notification-content-document"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
                dangerouslySetInnerHTML={{ __html: notification.description }}
              />
            </div>
          </div>
        </article>
      </div>
    </AdminLayout>
  );
};
