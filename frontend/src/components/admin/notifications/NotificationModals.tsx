import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Loader2, Bell, Calendar, Send, Save, AlertCircle, ChevronDown, Check } from 'lucide-react';
import ReactQuill from 'react-quill';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-quill/dist/quill.snow.css';
import '../../../styles/quill-custom.css';
import {
  AdminNotification,
  NotificationRequest,
  NotificationStatus,
  NotificationType,
  NotificationPriority,
  getStatusLabel,
  getStatusColor,
  getTargetTypeLabel,
  getTypeLabel,
  getPriorityLabel,
  getPriorityColor
} from '../../../types/notification';
import { notificationService } from '../../../services/api/notificationService';
import toast from "@utils/toast";

// --- Inline Modal Components (Non-portal versions for z-index stability) ---

interface ModalSelectProps {
    label?: string;
    value: string | number;
    options: { value: string | number; label: string }[];
    onChange: (value: any) => void;
    placeholder?: string;
}

const ModalSelect: React.FC<ModalSelectProps> = ({ label, value, options, onChange, placeholder = 'Chọn...' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">{label}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white"
            >
                <span className={selectedOption ? 'font-medium' : 'text-gray-400'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-2xl z-[70] py-2 max-h-60 overflow-y-auto custom-scrollbar"
                    >
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/10
                                    ${value === opt.value ? 'text-fpt-orange bg-orange-50/50 dark:bg-orange-900/5 font-bold' : 'text-gray-700 dark:text-gray-300'}
                                `}
                            >
                                <span>{opt.label}</span>
                                {value === opt.value && <Check size={16} className="text-fpt-orange" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ========================= View Notification Modal =========================
interface ViewNotificationModalProps {
  notification: AdminNotification;
  onClose: () => void;
}

export const ViewNotificationModal: React.FC<ViewNotificationModalProps> = ({ notification, onClose }) => {
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '---';

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
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100 dark:border-zinc-800 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết thông báo</h3>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Title */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0 shadow-sm border border-orange-50 dark:border-orange-900/10">
              <Bell size={24} className="text-fpt-orange" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                {notification.title}
              </h4>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${getStatusColor(notification.status)}`}>
                  {getStatusLabel(notification.status)}
                </span>
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-700">
                  {getTargetTypeLabel(notification.targetType)}
                </span>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${getPriorityColor(notification.priority)}`}>
                  {getPriorityLabel(notification.priority)}
                </span>
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/20">
                  {getTypeLabel(notification.type)}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-black uppercase text-gray-400 dark:text-zinc-500 mb-3 tracking-widest ml-1">Nội dung</label>
            <div
              className="p-5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl prose prose-sm dark:prose-invert max-w-none shadow-inner"
              dangerouslySetInnerHTML={{ __html: notification.content }}
            />
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/30 border border-gray-100 dark:border-zinc-800">
              <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 mb-1">Ngày tạo</label>
              <span className="text-gray-900 dark:text-white font-bold">
                {formatDateTime(notification.createdAt)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/30 border border-gray-100 dark:border-zinc-800">
              <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 mb-1">
                {notification.status === NotificationStatus.SCHEDULED ? 'Thời gian lên lịch' : 'Ngày gửi'}
              </label>
              <span className="text-gray-900 dark:text-white font-bold">
                {notification.status === NotificationStatus.SCHEDULED
                  ? formatDateTime(notification.scheduledAt)
                  : formatDateTime(notification.sentAt)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/30 border border-gray-100 dark:border-zinc-800">
              <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 mb-1">Cập nhật lần cuối</label>
              <span className="text-gray-900 dark:text-white font-bold">
                {formatDateTime(notification.updatedAt)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/30 border border-gray-100 dark:border-zinc-800">
              <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 mb-1">Người gửi</label>
              <span className="text-gray-900 dark:text-white font-bold">
                {notification.sender?.fullName || '---'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 h-[44px] text-sm font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95"
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
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
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

    if (sendNow) {
      submitData.status = NotificationStatus.SENT;
      submitData.scheduledAt = null;
    } else {
      if (submitData.status === NotificationStatus.SCHEDULED && !submitData.scheduledAt) {
        submitData.status = NotificationStatus.DRAFT;
        submitData.scheduledAt = null;
      }
    }

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
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100 dark:border-zinc-800 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}
          </h3>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ml-1">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all text-gray-900 dark:text-white outline-none ${errors.title ? 'border-red-500' : 'border-gray-100 dark:border-zinc-800'
                }`}
              placeholder="Nhập tiêu đề thông báo..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            <p className="text-xs text-gray-400 mt-1 ml-1">{formData.title.length}/200 ký tự</p>
          </div>

          {/* Type & Priority in one row */}
          <div className="grid grid-cols-2 gap-4">
            <ModalSelect
              label="Loại thông báo"
              value={formData.type}
              onChange={(val) => setFormData({ ...formData, type: val as NotificationType })}
              options={[
                { value: NotificationType.SYSTEM, label: 'Hệ thống' },
                { value: NotificationType.ACADEMIC, label: 'Học vụ' },
                { value: NotificationType.ATTENDANCE, label: 'Điểm danh' },
                { value: NotificationType.GRADE, label: 'Điểm số' },
                { value: NotificationType.CHAT, label: 'Chat' },
                { value: NotificationType.SCHEDULE, label: 'Lịch học' }
              ]}
            />
            <ModalSelect
              label="Độ ưu tiên"
              value={formData.priority}
              onChange={(val) => setFormData({ ...formData, priority: val as NotificationPriority })}
              options={[
                { value: NotificationPriority.LOW, label: 'Thấp' },
                { value: NotificationPriority.MEDIUM, label: 'Trung bình' },
                { value: NotificationPriority.HIGH, label: 'Cao' },
                { value: NotificationPriority.URGENT, label: 'Khẩn cấp' }
              ]}
            />
          </div>

          {/* Target Type & Status */}
          <div className="grid grid-cols-2 gap-4">
            <ModalSelect
              label="Đối tượng nhận"
              value={formData.targetType}
              onChange={(val) => setFormData({ ...formData, targetType: val as TargetType })}
              options={[
                { value: TargetType.ALL, label: 'Toàn trường' },
                { value: TargetType.STUDENT, label: 'Tất cả sinh viên' },
                { value: TargetType.LECTURER, label: 'Tất cả giảng viên' },
                { value: TargetType.CLASS, label: 'Theo lớp học phần' },
                { value: TargetType.COURSE, label: 'Theo môn học' }
              ]}
            />
            <ModalSelect
              label="Trạng thái"
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val as NotificationStatus })}
              options={[
                { value: NotificationStatus.DRAFT, label: 'Lưu nháp' },
                { value: NotificationStatus.SCHEDULED, label: 'Lên lịch gửi' },
                { value: NotificationStatus.SENT, label: 'Đã gửi' }
              ]}
            />
          </div>

          {/* Scheduled DateTime - show only when status is SCHEDULED */}
          {formData.status === NotificationStatus.SCHEDULED && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/30">
              <label className="flex items-center gap-2 text-sm font-bold text-fpt-orange mb-2 ml-1">
                <Calendar size={16} />
                Thời gian gửi <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className={`w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all text-gray-900 dark:text-white outline-none ${errors.scheduledAt ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-100 dark:border-zinc-800'
                  }`}
                min={getMinDateTime()}
                value={formData.scheduledAt ? formData.scheduledAt.slice(0, 16) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setFormData({ ...formData, scheduledAt: e.target.value + ':00' });
                  } else {
                    setFormData({ ...formData, scheduledAt: null });
                  }
                }}
              />
              {errors.scheduledAt && <p className="text-red-500 text-xs mt-1 ml-1">{errors.scheduledAt}</p>}
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 ml-1 font-medium italic">
                💡 Thông báo sẽ tự động được gửi vào thời gian đã chọn
              </p>
            </div>
          )}

          {/* Content with Rich Text Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ml-1">
              Nội dung <span className="text-red-500">*</span>
            </label>

            <div className={`rounded-2xl overflow-hidden border-2 transition-all ${errors.content ? 'border-red-500' : 'border-gray-100 dark:border-zinc-800'}`}>
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Nhập nội dung thông báo..."
                className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-white min-h-[200px]"
              />
            </div>
            {errors.content && <p className="text-red-500 text-xs mt-1 ml-1">{errors.content}</p>}
          </div>

          {/* Priority warning for URGENT */}
          {formData.priority === NotificationPriority.URGENT && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">Thông báo khẩn cấp</p>
                <p className="text-xs text-red-600 dark:text-red-500 font-medium leading-relaxed">
                  Thông báo sẽ được gửi với độ ưu tiên cao nhất và hiển thị dạng popup nổi bật cho tất cả người nhận ngay khi họ đăng nhập.
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            {formData.status === NotificationStatus.SCHEDULED && formData.scheduledAt && (
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Calendar size={12} />
                Lịch: {(() => {
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 h-[44px] text-sm font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95"
            >
              Hủy
            </button>

            {formData.status !== NotificationStatus.SENT && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={isSubmitting || isSendingNow}
                className="px-6 h-[44px] text-sm font-bold bg-fpt-orange text-white rounded-2xl hover:bg-orange-600 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-fpt-orange/20 active:scale-95"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                <Save size={16} />
                {formData.status === NotificationStatus.SCHEDULED ? 'Lưu lịch gửi' : 'Lưu nháp'}
              </button>
            )}

            {!isEditing && formData.status !== NotificationStatus.SENT && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting || isSendingNow}
                className="px-6 h-[44px] text-sm font-bold bg-green-500 text-white rounded-2xl hover:bg-green-600 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-green-500/20 active:scale-95"
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

// ========================= Confirmation Modal =========================
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isProcessing?: boolean;
  hideIcon?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'danger',
  isProcessing = false,
  hideIcon = false
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertCircle className="w-6 h-6 text-red-600" />,
          button: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20',
          iconBg: 'bg-red-100 dark:bg-red-900/20'
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-6 h-6 text-orange-600" />,
          button: 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/20',
          iconBg: 'bg-orange-100 dark:bg-orange-900/20'
        };
      case 'success':
        return {
          icon: <Send className="w-6 h-6 text-white" />,
          button: 'bg-fpt-orange hover:bg-orange-600 text-white shadow-fpt-orange/20',
          iconBg: 'bg-fpt-orange/10 dark:bg-orange-900/20'
        };
      case 'info':
      default:
        return {
          icon: <AlertCircle className="w-6 h-6 text-blue-600" />,
          button: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
          iconBg: 'bg-blue-100 dark:bg-blue-900/20'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-zinc-800 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            {!hideIcon && (
              <div className={`p-4 rounded-2xl flex-shrink-0 ${styles.iconBg} shadow-inner`}>
                {styles.icon}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-end gap-3 border-t border-gray-100 dark:border-zinc-800">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 h-[44px] text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-8 h-[44px] text-sm font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 ${styles.button}`}
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

