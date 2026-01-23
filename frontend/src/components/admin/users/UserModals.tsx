import React, { useState } from 'react';
import { X, Camera, User as UserIcon, Loader2, Upload } from 'lucide-react';
import { userService, UserResponse } from '../../../services/api/userService';
import { authService } from '../../../services/api/authService';
import { useWebSocket } from '../../../hooks/useWebSocket';
import toast from 'react-hot-toast';
import { useRef } from 'react';

// --- AddUserModal ---
export const AddUserModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({ fullName: '', code: '', email: '', dob: '', phone: '', role: 'STUDENT' as any });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await userService.createUser(formData, avatar || undefined);
      toast.success('Đã thêm người dùng thành công');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi thêm người dùng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Thêm tài khoản mới</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex flex-col items-center mb-4">
             <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
                {preview ? <img src={preview} alt="preview" className="w-full h-full object-cover" /> : <UserIcon size={32} className="text-gray-300" />}
                <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors cursor-pointer group">
                   <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                   <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
             </div>
             <span className="text-xs text-gray-400 mt-2">Ảnh đại diện (Sẽ tự động đăng ký khuôn mặt)</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Họ và tên</label>
              <input required type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" placeholder="Nguyễn Văn A" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Mã số</label>
              <input required type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" placeholder="SE150000" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Ngày sinh</label>
              <input required type="date" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Email</label>
              <input required type="email" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" placeholder="anv@fpt.edu.vn" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Số điện thoại</label>
              <input type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" placeholder="0123456789" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Vai trò</label>
              <select className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                <option value="STUDENT">Sinh viên</option>
                <option value="LECTURER">Giảng viên</option>
                <option value="ACADEMIC_STAFF">Phòng đào tạo</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
               {loading && <Loader2 size={16} className="animate-spin" />} Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- EditUserModal ---
export const EditUserModal: React.FC<{ user: UserResponse; onClose: () => void; onSuccess: () => void }> = ({ user, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user.avatar || null);

  const ensureStringDate = (d: any) => {
    if (Array.isArray(d)) {
      const [year, month, day] = d;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return d || '';
  };

  const [formData, setFormData] = useState({
    fullName: user.fullName,
    code: user.code,
    email: user.email,
    dob: ensureStringDate(user.dob),
    phone: user.phone || '',
    role: user.role as any,
    status: user.status as any
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await userService.updateUser(user.id, formData as any, avatar || undefined);
      toast.success('Cập nhật thành công');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Chỉnh sửa thông tin</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex flex-col items-center mb-4">
             <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
                {preview ? <img src={preview.startsWith('data:') ? preview : `${preview}${preview.includes('?') ? '&' : '?'}t=${new Date().getTime()}`} alt="preview" className="w-full h-full object-cover" /> : <UserIcon size={32} className="text-gray-300" />}
                <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors cursor-pointer group">
                   <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                   <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
             </div>
             <span className="text-xs text-gray-400 mt-2">Ảnh đại diện</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Họ và tên</label>
              <input required type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Mã số</label>
              <input readOnly type="text" className="w-full px-4 py-2 bg-gray-100 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none cursor-not-allowed text-gray-500" value={formData.code} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Ngày sinh</label>
              <input required type="date" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Email</label>
              <input required type="email" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Số điện thoại</label>
              <input type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Trạng thái</label>
              <select disabled className="w-full px-4 py-2 bg-gray-100 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none cursor-not-allowed text-gray-500" value={formData.status}>
                <option value="INACTIVE">Chưa kích hoạt</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="LOCKED">Đã khóa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Vai trò</label>
              <select className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                <option value="STUDENT">Sinh viên</option>
                <option value="LECTURER">Giảng viên</option>
                <option value="ACADEMIC_STAFF">Phòng đào tạo</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
               {loading && <Loader2 size={16} className="animate-spin" />} Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- ViewUserModal ---
export const ViewUserModal: React.FC<{ user: UserResponse; onClose: () => void }> = ({ user, onClose }) => {
  const formatDateTime = (date: any) => {
    if (!date) return '---';
    try {
      let d: Date;
      if (Array.isArray(date)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = date;
        d = new Date(year, month - 1, day, hour, minute, second);
      } else {
        d = new Date(date);
      }
      if (isNaN(d.getTime())) return '---';
      return d.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return '---'; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết tài khoản</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="p-6 space-y-6">
           <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-orange-100 dark:border-fpt-orange/20">
                 {user.avatar ? <img src={`${user.avatar}${user.avatar.includes('?') ? '&' : '?'}t=${new Date().getTime()}`} alt="avatar" className="w-full h-full object-cover" /> : <UserIcon size={40} className="m-auto text-gray-300 dark:text-zinc-600 mt-6" />}
              </div>
              <div>
                 <h4 className="text-xl font-bold text-gray-900 dark:text-white">{user.fullName}</h4>
                 <p className="text-gray-500 dark:text-zinc-400">{user.roleName}</p>
                 <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                    Chưa kích hoạt
                 </span>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                 <p className="text-gray-500 dark:text-zinc-400">Mã số</p>
                 <p className="font-medium text-gray-900 dark:text-white">{user.code}</p>
              </div>
              <div>
                 <p className="text-gray-500 dark:text-zinc-400">Ngày sinh</p>
                 <p className="font-medium text-gray-900 dark:text-white">
                    {Array.isArray(user.dob) 
                        ? `${String(user.dob[2]).padStart(2, '0')}/${String(user.dob[1]).padStart(2, '0')}/${user.dob[0]}`
                        : (user.dob || 'Chưa cập nhật')}
                 </p>
              </div>
              <div className="col-span-2">
                 <p className="text-gray-500 dark:text-zinc-400">Email</p>
                 <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
              </div>
              <div>
                 <p className="text-gray-500 dark:text-zinc-400">Số điện thoại</p>
                 <p className="font-medium text-gray-900 dark:text-white">{user.phone || 'Chưa cập nhật'}</p>
              </div>
              <div>
                 <p className="text-gray-500 dark:text-zinc-400">Khuôn mặt</p>
                 <p className={`font-medium ${user.faceDataStatus === 'REGISTERED' ? 'text-green-600' : 'text-red-500'}`}>
                    {user.faceDataStatus === 'REGISTERED' ? 'Đã đăng ký' : 'Chưa đăng ký'}
                 </p>
              </div>
              <div className="col-span-2 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                 <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Cập nhật lần cuối</p>
                 <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {formatDateTime(user.updatedAt || user.createdAt)}
                 </p>
              </div>
           </div>
           <div className="flex justify-end mt-4">
              <button onClick={onClose} className="px-6 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">Đóng</button>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- ImportUserModal ---
export const ImportUserModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    totalRows: number;
    validRows: number;
    errorRows: number;
    previewData: any[];
    validationMessages: string[];
  } | null>(null);
  const [isAsyncJob, setIsAsyncJob] = useState(false);
  const [progress, setProgress] = useState<{
    percentage: number;
    message: string;
    status: string;
  }>({ percentage: 0, message: '', status: '' });

  const currentUser = authService.getUser();
  const username = currentUser?.username || 'anonymous';
  const lastToastId = useRef<string | null>(null);

  useWebSocket(`/topic/import-progress/${username}`, (data) => {
    setProgress({
      percentage: data.percentage,
      message: data.message,
      status: data.status
    });
    
    // Auto-set isAsyncJob when receiving updates (job is running)
    if (['STARTING', 'PROCESSING', 'SAVING'].includes(data.status)) {
      setIsAsyncJob(true);
    }
    
    if (data.statusMessage === 'DATA_PHASE_COMPLETE') {
      toast.success('Dữ liệu đã sẵn sàng! Đang chuẩn bị ảnh nền...');
      setIsAsyncJob(false);
      onSuccess();
      onClose();
      return;
    }
    
    if (data.status === 'COMPLETED') {
      toast.success('Import hoàn tất thành công!');
      setIsAsyncJob(false);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } else if (data.status === 'CANCELLED') {
      setIsAsyncJob(false);
      toast.error('Tiến trình đã bị dừng.');
    }
  });

  // Check for existing active jobs on mount
  React.useEffect(() => {
    const checkActiveJob = async () => {
      try {
        const activeJob = await userService.getActiveImportJob();
        // Only show progress if job is actually running (PENDING or PROCESSING from DB)
        if (activeJob && ['PENDING', 'PROCESSING'].includes(activeJob.status)) {
          setIsAsyncJob(true);
          setLoading(true);
          setProgress({
            percentage: activeJob.percentage || 0,
            message: activeJob.statusMessage || activeJob.errorMessage || 'Đang chờ xử lý...',
            status: activeJob.status
          });
          if (lastToastId.current !== activeJob.jobId) {
            toast.success('Đang tiếp tục xử lý import...');
            lastToastId.current = activeJob.jobId;
          }
        }
      } catch (error) {
        console.error('Failed to check active job:', error);
      }
    };
    checkActiveJob();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewData(null);
    }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Vui lòng chọn file');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const preview = await userService.previewImport(formData);
      setPreviewData(preview);
      if (preview.totalRows === 0) {
        toast('File không có dữ liệu hợp lệ', { icon: '⚠️' });
      } else {
        toast.success(`Đã đọc ${preview.totalRows} dòng`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi đọc file');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file || !previewData || previewData.validRows === 0) return;

    try {
      setLoading(true);
      setProgress({ percentage: 0, message: 'Đang khởi tạo...', status: 'STARTING' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', 'APPEND');
      
      const response = await userService.importUsers(formData);
      
      if (response.data.type === 'sync') {
        toast.success('Import hoàn tất!');
        setProgress({ percentage: 100, message: 'Hoàn thành', status: 'COMPLETED' });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else if (response.data.type === 'async' && response.data.jobId) {
        setIsAsyncJob(true);
        toast.success('Đang xử lý trong nền...');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi import');
      setLoading(false);
    }
  };

  const validCount = previewData?.validRows || 0;
  const errorCount = previewData?.errorRows || 0;
  // Only show progress when actually importing (async job detected or import in progress)
  // Note: STARTING/PROCESSING/SAVING are WebSocket statuses, PENDING/PROCESSING are DB statuses
  const showProgress = isAsyncJob || ['PENDING', 'STARTING', 'PROCESSING', 'SAVING'].includes(progress.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full ${previewData ? 'max-w-5xl' : 'max-w-md'} border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh]`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import danh sách người dùng</h3>
            {previewData && (
              <p className="text-sm text-gray-500 mt-1">
                Xem trước: <span className="text-green-600 font-medium">{validCount} hợp lệ</span> • <span className="text-red-500 font-medium">{errorCount} lỗi</span>
              </p>
            )}
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Progress View - Show ONLY this when importing */}
          {showProgress ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              {/* Circular Progress */}
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-100 dark:text-zinc-800" />
                  <circle
                    cx="64" cy="64" r="56"
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={352}
                    strokeDashoffset={352 - (352 * progress.percentage) / 100}
                    className="transition-all duration-500 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#fb923c" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-fpt-orange">{progress.percentage}</span>
                  <span className="text-xs font-bold text-gray-400">%</span>
                </div>
              </div>

              {/* Status Message */}
              <div className="text-center space-y-2">
                <p className="text-base font-semibold text-gray-900 dark:text-white">{progress.message || 'Đang khởi tạo...'}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  progress.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  progress.status === 'ERROR' || progress.status === 'FAILED' || progress.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {progress.status === 'PENDING' ? 'Đang chờ' :
                   progress.status === 'STARTING' ? 'Khởi tạo' :
                   progress.status === 'PROCESSING' ? 'Đang xử lý' :
                   progress.status === 'SAVING' ? 'Đang lưu' :
                   progress.status === 'COMPLETED' ? 'Hoàn thành' :
                   progress.status === 'CANCELLED' ? 'Đã dừng' :
                   progress.status === 'ERROR' || progress.status === 'FAILED' ? 'Lỗi' : progress.status}
                </span>
              </div>

              {/* Action for async jobs */}
              {(isAsyncJob || ['PENDING', 'PROCESSING', 'SAVING'].includes(progress.status)) && (
                <div className="text-center space-y-3 pt-4">
                  <p className="text-xs text-gray-500 italic">💡 Tiến trình đang chạy nền, có thể đóng và quay lại sau.</p>
                  <button onClick={onClose} className="px-6 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                    Đóng
                  </button>
                </div>
              )}
            </div>
          ) : !previewData ? (
            // Upload Form
            <form onSubmit={handlePreview} className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded-lg text-sm">
                <p className="font-semibold mb-1">Hướng dẫn:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Tải lên file <strong>.xlsx</strong> chứa dữ liệu người dùng.</li>
                  <li>Hoặc file <strong>.zip</strong> chứa Excel + ảnh đại diện (tên ảnh = mã số).</li>
                  <li>Nhấn "Xem trước" để kiểm tra dữ liệu trước khi lưu.</li>
                </ul>
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors relative">
                <input required type="file" accept=".xlsx, .xls, .zip" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                <Upload size={32} className="text-fpt-orange mb-2" />
                {file ? (
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Chọn file để tải lên</p>
                    <p className="text-xs text-gray-500 mt-1">Hỗ trợ .xlsx, .zip</p>
                  </>
                )}
              </div>



              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {loading && <Loader2 size={16} className="animate-spin" />} Xem trước
                </button>
              </div>
            </form>
          ) : (
            // Preview Table
            <div className="space-y-4">
              {/* Error summary alert */}
              {errorCount > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-800/20 text-sm">
                  <p className="font-semibold mt-1">⚠️ Không thể import do có {errorCount} dòng bị lỗi. Vui lòng sửa file và thử lại.</p>
                </div>
              )}

              {/* Preview Table */}
              <div className="border rounded-xl overflow-hidden border-gray-200 dark:border-zinc-700 shadow-sm">
                <div className="max-h-[400px] overflow-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold border-b border-gray-200 dark:border-zinc-700 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">#</th>
                        <th className="px-4 py-3 w-32">Mã số</th>
                        <th className="px-4 py-3 w-48">Họ tên</th>
                        <th className="px-4 py-3 w-56">Email</th>
                        <th className="px-4 py-3 w-32">Ngày sinh</th>
                        <th className="px-4 py-3 w-28 text-center">Vai trò</th>
                        <th className="px-4 py-3 w-12 text-center">Ảnh</th>
                        <th className="px-4 py-3 w-28 text-center">Kết quả</th>
                        <th className="px-4 py-3">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                      {previewData?.previewData.map((row: any, index: number) => (
                        <tr key={index} className={row.status === 'error' ? 'bg-red-50/50 dark:bg-red-900/5' : ''}>
                          <td className="px-4 py-3 text-center text-gray-500 font-medium">{index + 1}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white uppercase">{row.code || '---'}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-zinc-300">{row.fullName || '---'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{row.email || '---'}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{row.dob || '---'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                              {row.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.hasImage ? (
                                <span className="text-green-600 font-bold" title="Đã tìm thấy ảnh">✓</span>
                            ) : (
                                <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.status === 'valid' ? (
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                                ✓ HỢP LỆ
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                                ✕ LỖI
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.status === 'error' ? (
                              <span className="text-xs text-red-600 font-medium">{row.errorMessage}</span>
                            ) : (
                              <span className="text-xs text-green-600">Sẵn sàng import</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  onClick={() => setPreviewData(null)}
                  className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Upload size={16} className="rotate-180" /> Quay lại upload
                </button>
                <div className="flex gap-3">
                  <button onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={loading || validCount === 0 || errorCount > 0}
                    className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-orange-500/20 flex items-center gap-2"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {errorCount > 0 ? `Có ${errorCount} dòng lỗi` : `Xác nhận import (${validCount})`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
