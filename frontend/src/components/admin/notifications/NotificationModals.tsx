import React, { useState, useMemo } from 'react';
import { X, Loader2, Bell, Calendar, Send, Save, AlertCircle } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../../../styles/quill-custom.css';
import {
  AdminNotification,
  NotificationRequest,
  NotificationStatus,
  NotificationType,
  NotificationPriority,
  TargetType,
  getStatusLabel,
  getStatusColor,
  getTargetTypeLabel,
  getTypeLabel,
  getPriorityLabel,
  getPriorityColor
} from '../../../types/notification';
import { notificationService } from '../../../services/api/notificationService';
import toast from 'react-hot-toast';

// ========================= View Notification Modal =========================
interface ViewNotificationModalProps {
  notification: AdminNotification;
  onClose: () => void;
}

export const ViewNotificationModal: React.FC<ViewNotificationModalProps> = ({ notification, onClose }) => {
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '---';
    try {
      // Nếu dateStr không có 'Z' (local time từ backend), parse trực tiếp
      // Nếu có 'Z' (UTC), Date sẽ tự convert sang local
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '---';
      
      // Format theo định dạng Việt Nam
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return '---';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết thông báo</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Title */}
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

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
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
                  ? formatDateTime(notification.scheduledAt) 
                  : formatDateTime(notification.sentAt)}
              </span>
            </div>
            <div>
              <label className="block text-gray-500 dark:text-gray-400 mb-1">Cập nhật lần cuối</label>
              <span className="text-gray-900 dark:text-white font-medium">
                {formatDateTime(notification.updatedAt)}
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

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================= Create/Edit Notification Modal =========================
interface NotificationFormModalProps {
  notification?: AdminNotification;
  onClose: () => void;
  onSuccess: () => void;
}

export const NotificationFormModal: React.FC<NotificationFormModalProps> = ({
  notification,
  onClose,
  onSuccess
}) => {
  const isEditing = !!notification;

  const [formData, setFormData] = useState<NotificationRequest>({
    title: notification?.title || '',
    content: notification?.content || '',
    type: notification?.type || NotificationType.SYSTEM,
    priority: notification?.priority || NotificationPriority.MEDIUM,
    targetType: notification?.targetType || TargetType.ALL,
    status: notification?.status || NotificationStatus.DRAFT,
    scheduledAt: notification?.scheduledAt || null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingNow, setIsSendingNow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Quill editor configuration
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  }), []);

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'align',
    'link'
  ];

  // Get minimum datetime for scheduling (now + 5 minutes)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề không được để trống';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Tiêu đề không được quá 200 ký tự';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Nội dung không được để trống';
    }

    if (formData.status === NotificationStatus.SCHEDULED && !formData.scheduledAt) {
      newErrors.scheduledAt = 'Vui lòng chọn thời gian gửi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, sendNow: boolean = false) => {
    e.preventDefault();
    
    const submitData = { ...formData };
    
    // Xử lý logic status dựa trên hành động người dùng
    if (sendNow) {
      // Nút "Gửi ngay" - gửi luôn
      submitData.status = NotificationStatus.SENT;
      submitData.scheduledAt = null;
    } else {
      // Nút "Lưu nháp" hoặc submit form - giữ nguyên status user đã chọn
      // Nếu chọn SCHEDULED nhưng không có thời gian, đổi về DRAFT
      if (submitData.status === NotificationStatus.SCHEDULED && !submitData.scheduledAt) {
        submitData.status = NotificationStatus.DRAFT;
        submitData.scheduledAt = null;
      }
    }
    
    // Update formData for validation
    if (sendNow) {
      setFormData(submitData);
    }
    
    if (!validate()) return;

    try {
      if (sendNow) {
        setIsSendingNow(true);
      } else {
        setIsSubmitting(true);
      }

      if (isEditing && notification) {
        await notificationService.updateNotification(notification.id, submitData);
        toast.success('Cập nhật thông báo thành công');
      } else {
        await notificationService.createNotification(submitData);
        if (sendNow) {
          toast.success('Đã gửi thông báo thành công!');
        } else if (submitData.status === NotificationStatus.SCHEDULED) {
          toast.success('Đã lên lịch gửi thông báo');
        } else {
          toast.success('Đã lưu thông báo nháp');
        }
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
      setIsSendingNow(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-5 overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none transition-all text-gray-900 dark:text-white ${
                errors.title ? 'border-red-500' : 'border-gray-200 dark:border-zinc-700'
              }`}
              placeholder="Nhập tiêu đề thông báo..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            <p className="text-xs text-gray-400 mt-1">{formData.title.length}/200 ký tự</p>
          </div>

          {/* Type & Priority in one row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Loại thông báo
              </label>
              <select
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as NotificationType })}
              >
                <option value={NotificationType.SYSTEM}>Hệ thống</option>
                <option value={NotificationType.ACADEMIC}>Học vụ</option>
                <option value={NotificationType.ATTENDANCE}>Điểm danh</option>
                <option value={NotificationType.GRADE}>Điểm số</option>
                <option value={NotificationType.CHAT}>Chat</option>
                <option value={NotificationType.SCHEDULE}>Lịch học</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Độ ưu tiên
              </label>
              <select
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as NotificationPriority })}
              >
                <option value={NotificationPriority.LOW}>Thấp</option>
                <option value={NotificationPriority.MEDIUM}>Trung bình</option>
                <option value={NotificationPriority.HIGH}>Cao</option>
                <option value={NotificationPriority.URGENT}>Khẩn cấp</option>
              </select>
            </div>
          </div>

          {/* Target Type & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Đối tượng nhận
              </label>
              <select
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                value={formData.targetType}
                onChange={(e) => setFormData({ ...formData, targetType: e.target.value as TargetType })}
              >
                <option value={TargetType.ALL}>Toàn trường</option>
                <option value={TargetType.STUDENT}>Tất cả sinh viên</option>
                <option value={TargetType.LECTURER}>Tất cả giảng viên</option>
                <option value={TargetType.CLASS}>Theo lớp học phần</option>
                <option value={TargetType.COURSE}>Theo môn học</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trạng thái
              </label>
              <select
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as NotificationStatus })}
              >
                <option value={NotificationStatus.DRAFT}>Lưu nháp</option>
                <option value={NotificationStatus.SCHEDULED}>Lên lịch gửi</option>
                <option value={NotificationStatus.SENT}>Đã gửi</option>
                <option value={NotificationStatus.SENT}>Đã gửi</option>
              </select>
            </div>
          </div>

          {/* Scheduled DateTime - show only when status is SCHEDULED */}
          {formData.status === NotificationStatus.SCHEDULED && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <label className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                <Calendar size={16} />
                Thời gian gửi <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className={`w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white ${
                  errors.scheduledAt ? 'border-red-500' : 'border-blue-200 dark:border-zinc-700'
                }`}
                min={getMinDateTime()}
                value={formData.scheduledAt ? formData.scheduledAt.slice(0, 16) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    // Lưu datetime-local trực tiếp (format: YYYY-MM-DDTHH:mm:ss)
                    // Không convert sang UTC để giữ đúng giờ local user đã chọn
                    setFormData({ ...formData, scheduledAt: e.target.value + ':00' });
                  } else {
                    setFormData({ ...formData, scheduledAt: null });
                  }
                }}
              />
              {errors.scheduledAt && <p className="text-red-500 text-xs mt-1">{errors.scheduledAt}</p>}
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Thông báo sẽ tự động được gửi vào thời gian đã chọn
              </p>
            </div>
          )}

          {/* Content with Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nội dung <span className="text-red-500">*</span>
            </label>
            
            <div className={`rounded-lg overflow-hidden border ${errors.content ? 'border-red-500' : 'border-gray-200 dark:border-zinc-700'}`}>
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Nhập nội dung thông báo..."
                className="bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white"
                style={{ minHeight: '200px' }}
              />
            </div>
            {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
          </div>

          {/* Priority warning for URGENT */}
          {formData.priority === NotificationPriority.URGENT && (
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Thông báo khẩn cấp</p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Thông báo sẽ được gửi với độ ưu tiên cao nhất và hiển thị dạng popup cho người nhận.
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            {formData.status === NotificationStatus.SCHEDULED && formData.scheduledAt && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Calendar size={12} />
                Sẽ gửi: {(() => {
                  const d = new Date(formData.scheduledAt!);
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const year = d.getFullYear();
                  const hours = String(d.getHours()).padStart(2, '0');
                  const minutes = String(d.getMinutes()).padStart(2, '0');
                  return `${day}/${month}/${year} ${hours}:${minutes}`;
                })()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Hủy
            </button>
            
            {/* Save button - Lưu theo trạng thái đã chọn */}
            {formData.status !== NotificationStatus.SENT && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={isSubmitting || isSendingNow}
                className="px-4 py-2 text-sm font-medium bg-fpt-orange text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                <Save size={16} />
                {formData.status === NotificationStatus.SCHEDULED ? 'Lưu lịch gửi' : 'Lưu nháp'}
              </button>
            )}

            {/* Send Now button - chỉ hiện khi tạo mới */}
            {!isEditing && formData.status !== NotificationStatus.SENT && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting || isSendingNow}
                className="px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSendingNow && <Loader2 size={16} className="animate-spin" />}
                <Send size={16} />
                Gửi ngay
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
