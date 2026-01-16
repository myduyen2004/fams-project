import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { notificationService, AdminNotification } from '../../services/api/notificationService';
import { NotificationStatus, getTypeLabel, getPriorityLabel, getStatusLabel, getTargetTypeLabel, getStatusColor, getPriorityColor } from '../../types/notification';
import { Loader2, Edit2, Bell, Paperclip, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export const NotificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [notification, setNotification] = useState<AdminNotification | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to format date
  const formatDateTime = (dateStr: string): string => {
    if (!dateStr) return '--/--/---- --:--';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '--/--/---- --:--';

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return '--/--/---- --:--';
    }
  };

  useEffect(() => {
    if (id) {
      fetchNotification(parseInt(id));
    }
  }, [id]);

  const fetchNotification = async (notificationId: number) => {
    try {
      setLoading(true);
      const data = await notificationService.getNotificationById(notificationId);
      setNotification(data);
    } catch (error) {
      toast.error('Không thể tải thông báo');
      console.error(error);
      setTimeout(() => navigate('/admin/notification-management'), 2000);
    } finally {
      setLoading(false);
    }
  };

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

  const isEditable = notification.status === NotificationStatus.DRAFT || notification.status === NotificationStatus.SCHEDULED;

  return (
    <AdminLayout pageTitle="Chi tiết thông báo">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">

        </div>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết thông báo</h3>
            {isEditable && (
              <Link
                to={`/admin/notifications/edit/${notification.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-fpt-orange text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Edit2 size={18} />
                Chỉnh sửa
              </Link>
            )}
          </div>

          {/* Content */}
          <div className="p-8 space-y-8 max-w-4xl mx-auto">
            {/* Title with Icon and Badges */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                <Bell size={24} className="text-fpt-orange" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {notification.title}
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(notification.status)}`}>
                    {getStatusLabel(notification.status)}
                  </span>
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">
                    {getTargetTypeLabel(notification.targetType)}
                  </span>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium text-white ${getPriorityColor(notification.priority)}`}>
                    {getPriorityLabel(notification.priority)}
                  </span>
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    {getTypeLabel(notification.type)}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Nội dung</label>
              <div
                className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: notification.content }}
              />
            </div>

            {/* Attachments */}
            {notification.attachmentUrls && notification.attachmentUrls.length > 0 && (
              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <Paperclip size={16} />
                  Tài liệu đính kèm ({notification.attachmentUrls.length})
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {notification.attachmentUrls.map((url, index) => {
                    const fileName = url.split('/').pop() || `Attachment-${index + 1}`;
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

                    return (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-750 border border-gray-200 dark:border-zinc-700 rounded-xl transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0 text-fpt-orange">
                          {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-fpt-orange transition-colors">
                            {fileName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                            {url.split('.').pop()?.split('?')[0]} File
                          </p>
                        </div>
                        <ExternalLink size={14} className="text-gray-400 group-hover:text-fpt-orange" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Meta Info */}
            <div className="pt-6 border-t border-gray-100 dark:border-zinc-800 grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <label className="block text-gray-500 dark:text-gray-400 mb-1">Ngày tạo</label>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatDateTime(notification.createdAt)}
                </span>
              </div>
              <div>
                <label className="block text-gray-500 dark:text-gray-400 mb-1">
                  {notification.status === NotificationStatus.SCHEDULED ? 'Thời gian lên lịch' : 'Ngày gửi'}
                </label>
                <span className="text-gray-900 dark:text-white font-medium">
                  {notification.status === NotificationStatus.SCHEDULED
                    ? formatDateTime(notification.scheduledAt || '')
                    : formatDateTime(notification.sentAt || '')}
                </span>
              </div>
              <div>
                <label className="block text-gray-500 dark:text-gray-400 mb-1">Cập nhật lần cuối</label>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatDateTime(notification.updatedAt || '')}
                </span>
              </div>
              <div>
                <label className="block text-gray-500 dark:text-gray-400 mb-1">Người gửi</label>
                <span className="text-gray-900 dark:text-white font-medium">
                  {notification.sender?.fullName || '---'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
