import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Upload, ArrowLeft, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { uploadFile } from '../../services/utils/fileUploadService';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { notificationService, AdminNotification } from '../../services/api/notificationService';
import { NotificationStatus, TargetType } from '../../types/notification';

interface NotificationForm {
  title: string;
  content: string;
  type: string;
  priority: string;
  targetType: TargetType;
  status: NotificationStatus;
  scheduledAt: string | null;
}

interface AttachedFile {
  file?: File;
  name: string;
  size: number;
  type: string;
  url?: string;
  status: 'uploading' | 'success' | 'error';
}

export const EditNotificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [formData, setFormData] = useState<NotificationForm>({
    title: '',
    content: '',
    type: 'SYSTEM',
    priority: 'MEDIUM',
    targetType: TargetType.ALL,
    status: NotificationStatus.DRAFT,
    scheduledAt: null
  });

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isDragOver, setIsDragOver] = useState(false);

  // Quill editor modules
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'align',
    'link', 'image'
  ];

  // Load notification data
  useEffect(() => {
    const loadNotification = async () => {
      if (!id) {
        navigate(backUrl);
        return;
      }

      try {
        setLoading(true);
        const data = await notificationService.getNotificationById(parseInt(id));
        setNotification(data);

        // Format datetime for input
        let scheduledAt = null;
        if (data.scheduledAt) {
          // Remove seconds from datetime string for input compatibility
          scheduledAt = data.scheduledAt.substring(0, 16);
        }

        setFormData({
          title: data.title,
          content: data.content,
          type: data.type,
          priority: data.priority,
          targetType: data.targetType,
          status: data.status,
          scheduledAt
        });

        // Populate attached files if they exist
        if (data.attachmentUrls && data.attachmentUrls.length > 0) {
          const filesFromUrl: AttachedFile[] = data.attachmentUrls.map(url => {
            // Extract filename from URL
            // Handle potentially encoded URLs
            let fileName = 'unknown-file';
            try {
              const decodedUrl = decodeURIComponent(url);
              fileName = decodedUrl.split('/').pop()?.split('?')[0] || 'unknown-file';
            } catch (e) {
              fileName = url.split('/').pop() || 'unknown-file';
            }

            return {
              name: fileName,
              size: 0, // Size is not available from URL
              type: 'unknown', // Type is not available from URL
              url: url,
              status: 'success'
            };
          });
          setAttachedFiles(filesFromUrl);
        }
      } catch (error) {
        console.error('Failed to load notification:', error);
        toast.error('Không thể tải thông báo');
        navigate(backUrl);
      } finally {
        setLoading(false);
      }
    };

    loadNotification();
  }, [id, navigate, backUrl]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Process files (common function for upload and drag & drop)
  const processFiles = async (files: File[]) => {
    for (const file of files) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} quá lớn. Vui lòng chọn file nhỏ hơn 10MB.`);
        continue;
      }

      // Check if file already exists
      if (attachedFiles.some(f => f.name === file.name)) {
        toast.error(`File ${file.name} đã được thêm trước đó.`);
        continue;
      }

      // Add file to list with uploading state
      const newFile: AttachedFile = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading'
      };

      setAttachedFiles(prev => [...prev, newFile]);

      try {
        const data = await uploadFile(file);
        console.log("File URL:", data.secure_url);

        // Update file with URL and remove uploading state
        setAttachedFiles(prev => prev.map(f => {
          if (f.name === file.name && f.status === 'uploading') {
            return {
              ...f,
              url: data.secure_url,
              status: 'success'
            };
          }
          return f;
        }));
      } catch (err) {
        console.error(err);
        toast.error(`Lỗi khi tải file ${file.name}`);
        // Mark as error
        setAttachedFiles(prev => prev.map(f => {
          if (f.name === file.name) {
            return { ...f, status: 'error' };
          }
          return f;
        }));
      }
    }
  };

  // Handle drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  // Remove file
  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };



  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Vui lòng nhập tiêu đề thông báo';
    }

    if (!formData.content.trim() || formData.content === '<p><br></p>') {
      newErrors.content = 'Vui lòng nhập nội dung thông báo';
    }

    if (formData.status === NotificationStatus.SCHEDULED && !formData.scheduledAt) {
      newErrors.scheduledAt = 'Vui lòng chọn thời gian gửi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (isDraft = false) => {
    if (!validateForm() && !isDraft) {
      return;
    }

    if (!notification) return;

    setIsSubmitting(true);
    try {
      // Prepare form data
      const submitData: any = {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        priority: formData.priority,
        targetType: formData.targetType,
        status: isDraft ? NotificationStatus.DRAFT : formData.status,
        scheduledAt: formData.scheduledAt
      };

      // If sending now, set status to SENT
      if (!isDraft && formData.status === NotificationStatus.DRAFT) {
        submitData.status = NotificationStatus.SENT;
        submitData.scheduledAt = null;
      } else if (submitData.status === NotificationStatus.SCHEDULED && !submitData.scheduledAt) {
        submitData.status = NotificationStatus.DRAFT;
        submitData.scheduledAt = null;
      } else if (submitData.scheduledAt) {
        // Format datetime for backend
        submitData.scheduledAt = submitData.scheduledAt + ':00';
      }

      // Map attachment URLs
      const attachmentUrls = attachedFiles
        .filter(f => f.url)
        .map(f => f.url as string);

      submitData.attachmentUrls = attachmentUrls;

      // Update notification
      await notificationService.updateNotification(notification.id, submitData);

      if (isDraft) {
        toast.success('Đã lưu thông báo nháp');
      } else if (submitData.status === NotificationStatus.SENT) {
        toast.success('Đã gửi thông báo thành công');
        // Trigger notification bell update
        window.dispatchEvent(new Event('notificationRefresh'));
      } else if (submitData.status === NotificationStatus.SCHEDULED) {
        toast.success('Đã lên lịch gửi thông báo');
        // Trigger notification bell update
        window.dispatchEvent(new Event('notificationRefresh'));
      }

      // Navigate back to management page
      navigate(backUrl);
    } catch (error) {
      console.error('Failed to update notification:', error);
      toast.error('Có lỗi xảy ra khi cập nhật thông báo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout pageTitle="Chỉnh sửa thông báo">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fpt-orange mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Đang tải thông báo...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Chỉnh sửa thông báo">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(`${isAcademicStaff ? '/academic-staff' : isLecturerGranted ? '/lecturer/granted' : '/admin'}/notification-management/${id}`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-fpt-orange mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại chi tiết
        </button>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tiêu đề thông báo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none transition-all text-gray-900 dark:text-white ${errors.title ? 'border-red-300' : 'border-gray-200 dark:border-zinc-700'
                  }`}
                placeholder="Nhập tiêu đề thông báo..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              {errors.title && (
                <span className="text-red-500 text-xs mt-1 block">{errors.title}</span>
              )}
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nội dung thông báo <span className="text-red-500">*</span>
              </label>
              <div className={`border rounded-lg overflow-hidden ${errors.content ? 'border-red-300' : 'border-gray-200 dark:border-zinc-700'
                }`}>
                <ReactQuill
                  value={formData.content}
                  onChange={(value) => setFormData({ ...formData, content: value })}
                  modules={modules}
                  formats={formats}
                  placeholder="Nhập nội dung thông báo..."
                  className="bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white"
                />
              </div>
              {errors.content && (
                <span className="text-red-500 text-xs mt-1 block">{errors.content}</span>
              )}
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File đính kèm
              </label>

              {/* Upload Button */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragOver
                  ? 'border-fpt-orange bg-fpt-orange/10'
                  : 'border-gray-300 dark:border-zinc-600 hover:border-fpt-orange hover:bg-fpt-orange/5'
                  }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Kéo thả file vào đây hoặc{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-fpt-orange hover:text-fpt-orange-dark font-medium"
                  >
                    chọn file
                  </button>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Hỗ trợ: PDF, Word, Excel, PowerPoint, hình ảnh (tối đa 10MB mỗi file)
                </p>
              </div>

              {/* File List */}
              {attachedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    File đã chọn ({attachedFiles.length})
                  </h4>
                  {attachedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Status Icons */}
                        {file.status === 'uploading' && (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        )}
                        {file.status === 'success' && (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        )}
                        {file.status === 'error' && (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}

                        {/* Remove Action */}
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
                          title="Xóa file"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Target Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <option value={TargetType.STUDENT}>Sinh viên</option>
                  <option value={TargetType.LECTURER}>Giảng viên</option>
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
                  <option value={NotificationStatus.SENT}>Gửi ngay</option>
                  <option value={NotificationStatus.SCHEDULED}>Lên lịch gửi</option>
                </select>
              </div>
            </div>

            {/* Scheduled DateTime - show only when status is SCHEDULED */}
            {formData.status === NotificationStatus.SCHEDULED && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Thời gian gửi <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white ${errors.scheduledAt ? 'border-red-300' : 'border-gray-200 dark:border-zinc-700'
                    }`}
                  value={formData.scheduledAt || ''}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                />
                {errors.scheduledAt && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.scheduledAt}</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
            <div className="flex gap-3">
              {formData.status === NotificationStatus.DRAFT && (
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting || attachedFiles.some(f => f.status === 'uploading')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu nháp'}
                </button>
              )}

              {formData.status === NotificationStatus.SENT && (
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || attachedFiles.some(f => f.status === 'uploading')}
                  className="px-4 py-2 text-sm font-medium text-white bg-fpt-orange hover:bg-fpt-orange-dark rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Gửi ngay'}
                </button>
              )}

              {formData.status === NotificationStatus.SCHEDULED && (
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || attachedFiles.some(f => f.status === 'uploading')}
                  className="px-4 py-2 text-sm font-medium text-white bg-fpt-orange hover:bg-fpt-orange-dark rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Cập nhật lịch gửi'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EditNotificationPage;
