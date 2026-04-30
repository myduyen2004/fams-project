import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';

import { notificationService, AdminNotification } from '../../services/api/notificationService';
import { NotificationStatus, getStatusLabel, getTargetTypeLabel } from '../../types/notification';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from "@utils/toast";

export const NotificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAcademicStaff = location.pathname.startsWith('/academic-staff');
  const isLecturerGranted = location.pathname.startsWith('/lecturer/granted');
  const Layout = (isAcademicStaff || isLecturerGranted) ? AcademicStaffLayout : AdminLayout;
  const backUrl = isAcademicStaff 
    ? '/academic-staff/notification-management' 
    : isLecturerGranted 
      ? '/lecturer/granted/notifications' 
      : '/admin/notification-management';

  const [notification, setNotification] = useState<AdminNotification | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to format date
  const formatDateTime = (dateStr: string | null | undefined): string => {
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
      setTimeout(() => navigate(backUrl), 2000);
    } finally {
      setLoading(false);
    }
  };



  const getStatusBadgeColor = (status: NotificationStatus) => {
    switch (status) {
      case NotificationStatus.SENT: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case NotificationStatus.SCHEDULED: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case NotificationStatus.DRAFT: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

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

          {/* Back Button */}
          <button
            onClick={() => navigate(backUrl)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-fpt-orange w-fit transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách
          </button>

          {/* Header Section */}
          <div className="flex flex-col gap-4">
            <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold leading-tight">
              {notification.title}
            </h1>

            <div className="flex items-end justify-between">
              {/* Left Side: Status + Meta */}
              <div className="flex flex-col gap-3">
                <div className="flex">
                  <span className={`text-xs font-bold px-3 py-1 rounded uppercase tracking-wider ${getStatusBadgeColor(notification.status)}`}>
                    {getStatusLabel(notification.status)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 dark:text-slate-400">
                  <p className="text-sm font-medium">
                    {notification.status === NotificationStatus.SENT ? 'Đã gửi vào lúc: ' :
                      notification.status === NotificationStatus.SCHEDULED ? 'Lên lịch vào lúc: ' : 'Ngày tạo: '}
                    <span className="text-slate-700 dark:text-slate-200">
                      {notification.status === NotificationStatus.SENT ? formatDateTime(notification.sentAt) :
                        notification.status === NotificationStatus.SCHEDULED ? formatDateTime(notification.scheduledAt) :
                          formatDateTime(notification.createdAt)}
                    </span>
                  </p>
                  <p className="text-sm font-medium">
                    Người nhận: <span className="text-slate-700 dark:text-slate-200">{getTargetTypeLabel(notification.targetType)}</span>
                  </p>
                </div>
              </div>

              {/* Right Side: Actions - MOVED TO BOTTOM */}
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
                <div className="ui-content max-w-none flex-grow">
                  <div
                    dangerouslySetInnerHTML={{ __html: notification.content }}
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
                      {notification.sender?.fullName || 'Hệ thống'}
                    </p>
                  </div>
                  {/* Draft Date - Only visible if viewing own role's notification */
                    ((isAcademicStaff && notification.sender?.role === 'ACADEMIC_STAFF') ||
                      (!isAcademicStaff && notification.sender?.role === 'ADMIN')) && (
                      <div>
                        <p className="text-slate-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                          Ngày tạo bản nháp
                        </p>
                        <p className="text-slate-700 dark:text-gray-300 text-sm">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>
                    )}
                  <div>
                    <p className="text-slate-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                      {notification.status === NotificationStatus.SCHEDULED ? 'Thời gian lên lịch' : 'Ngày gửi'}
                    </p>
                    <p className="text-slate-700 dark:text-gray-300 text-sm">
                      {notification.status === NotificationStatus.SCHEDULED
                        ? formatDateTime(notification.scheduledAt)
                        : formatDateTime(notification.sentAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">
                      Cập nhật lần cuối
                    </p>
                    <p className="text-slate-700 dark:text-gray-300 text-sm">
                      {formatDateTime(notification.updatedAt)}
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
                    const decodedUrl = decodeURIComponent(url);
                    fileName = decodedUrl.split('/').pop()?.split('?')[0] || 'unknown-file';
                  } catch (e) {
                    fileName = url.split('/').pop() || 'unknown-file';
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
    </Layout >
  );
};

