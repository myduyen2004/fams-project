import React, { useState } from 'react';
import { X, Camera, User as UserIcon, Loader2, Upload, AlertCircle } from 'lucide-react';
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
  const [mode, setMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [loading, setLoading] = useState(false);
  const [isAsyncJob, setIsAsyncJob] = useState(false); // Track if it's a background job
  const [progress, setProgress] = useState<{
    percentage: number;
    message: string;
    status: string;
  }>({ percentage: 0, message: '', status: '' });
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const currentUser = authService.getUser();
  const username = currentUser?.username || 'anonymous';
  const lastToastId = useRef<string | null>(null);

  useWebSocket(`/topic/import-progress/${username}`, (data) => {
    setProgress({
      percentage: data.percentage,
      message: data.message,
      status: data.status
    });
  });

  // Check for existing active jobs on mount
  React.useEffect(() => {
    const checkActiveJob = async () => {
      try {
        const activeJob = await userService.getActiveImportJob();
        if (activeJob) {
          setIsAsyncJob(true);
          setLoading(true);
          setProgress({
            percentage: activeJob.percentage || 0,
            message: activeJob.errorMessage || 'Đang xử lý trong background...',
            status: activeJob.status
          });
          
          // Prevent double toast using Ref
          if (lastToastId.current !== activeJob.jobId) {
            toast.success('Hệ thống đang tiếp tục xử lý bản import trước đó.');
            lastToastId.current = activeJob.jobId;
          }
        }
      } catch (error) {
        console.error('Failed to check active job:', error);
      }
    };
    checkActiveJob();
  }, []);

  // Protection against accidental closure during import
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = 'Quá trình import đang diễn ra. Bạn có chắc muốn rời khỏi trang?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loading, isAsyncJob]);

  const handleClose = () => {
    // Only confirm if it's a sync import in progress (NOT async background job)
    if (loading && !isAsyncJob) {
      const confirmed = window.confirm('Quá trình import đang diễn ra. Nếu đóng bây giờ, có thể sẽ có sai sót trong dữ liệu. Bạn có chắc muốn đóng?');
      if (!confirmed) return;
    }
    // Reset state when closing
    setIsAsyncJob(false);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Vui lòng chọn file');
      return;
    }

    try {
      setLoading(true);
      setImportErrors([]);
      setProgress({ percentage: 0, message: 'Đang khởi tạo...', status: 'STARTING' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      
      const response = await userService.importUsers(formData);
      
      // Check response type
      if (response.data.type === 'sync') {
        // Excel sync import - completed instantly
        toast.success(`✅ Import hoàn tất! ${file.name}`);
        setProgress({ percentage: 100, message: 'Hoàn thành', status: 'COMPLETED' });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else if (response.data.type === 'async' && response.data.jobId) {
        // ZIP async job - show job created message
        const jobId = response.data.jobId;
        setIsAsyncJob(true); // Mark as async job
        setLoading(false); // Allow closing modal without warning
        
        toast.success(`🚀 Job ID: ${jobId.substring(0, 8)}... đang chạy background!`);
        setProgress({ 
          percentage: 0, 
          message: 'Đang xử lý trong background. Bạn có thể đóng modal này.', 
          status: 'PROCESSING' 
        });
        
        // Store jobId in localStorage for notification tracking
        const existingJobs = JSON.parse(localStorage.getItem('importJobs') || '[]');
        existingJobs.push({ jobId, filename: file.name, startTime: new Date().toISOString() });
        localStorage.setItem('importJobs', JSON.stringify(existingJobs));
        
        // Dispatch event to notify notification bell
        window.dispatchEvent(new CustomEvent('new-import-job', { detail: { jobId, filename: file.name } }));
      }
      
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Lỗi khi import người dùng';
      if (errMsg.includes('\n')) {
        setImportErrors(errMsg.split('\n').filter((l: string) => l.trim() !== ''));
        toast.error('Dữ liệu không hợp lệ, vui lòng kiểm tra danh sách lỗi bên dưới');
      } else {
        toast.error(errMsg);
      }
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('Bạn có chắc muốn dọn dẹp các tiến trình import đang hoạt động? Việc này sẽ dừng các yêu cầu import hiện tại.')) return;
    
    try {
      setLoading(true);
      await userService.cleanupStuckJobs();
      toast.success('Đã dọn dẹp các tiến trình đang xử lý. Bạn có thể thử import lại.');
      setIsAsyncJob(false);
      setLoading(false);
      setProgress({ percentage: 0, message: '', status: '' });
      lastToastId.current = null;
      onSuccess(); 
    } catch (error) {
      toast.error('Lỗi khi dọn dẹp tiến trình');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import người dùng</h3>
          <button onClick={handleClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Instructions */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded-xl text-sm border border-blue-100 dark:border-blue-900/20">
            <p className="font-bold mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Hướng dẫn:
            </p>
            <ul className="list-disc pl-5 space-y-1 opacity-90">
              <li>Tải lên file <strong className="text-blue-600 dark:text-blue-400">.xlsx</strong> chứa dữ liệu người dùng.</li>
              <li>Hoặc file <strong className="text-blue-600 dark:text-blue-400">.zip</strong> chứa file Excel và ảnh đại diện (đặt tên ảnh trùng Mã số).</li>
            </ul>
          </div>
          
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-2xl p-8 flex flex-col items-center text-center cursor-pointer hover:border-fpt-orange hover:bg-orange-50/30 dark:hover:bg-orange-950/10 transition-all relative group">
             <input required type="file" accept=".xlsx, .xls, .zip" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
             <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload size={24} className="text-fpt-orange" />
             </div>
             {file ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-1 font-medium">
                    <span className="w-1 h-1 rounded-full bg-green-500"></span>
                    Đã sẵn sàng tải lên
                  </p>
                </div>
             ) : (
                <>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Click để chọn file hoặc kéo thả</p>
                  <p className="text-xs text-gray-500 mt-1">Hỗ trợ định dạng .xlsx, .xls, .zip</p>
                </>
             )}
          </div>

          {/* Strategy Selection */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 dark:text-zinc-400 ml-1">Chiến lược Import:</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMode('APPEND')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                  mode === 'APPEND' 
                    ? 'border-fpt-orange bg-orange-50 dark:bg-orange-950/10 ring-4 ring-orange-500/10' 
                    : 'border-gray-50 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-500 hover:border-gray-200 dark:hover:border-zinc-700'
                }`}
              >
                <span className={`text-sm font-bold ${mode === 'APPEND' ? 'text-fpt-orange' : ''}`}>Thêm mới</span>
                <span className="text-[10px] mt-1 opacity-70">Giữ danh sách hiện tại</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('REPLACE')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                  mode === 'REPLACE' 
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/10 ring-4 ring-red-500/10' 
                    : 'border-gray-50 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-500 hover:border-gray-200 dark:hover:border-zinc-700'
                }`}
              >
                <span className={`text-sm font-bold ${mode === 'REPLACE' ? 'text-red-500' : ''}`}>Thay thế</span>
                <span className="text-[10px] mt-1 opacity-70">Xóa hết cũ (trừ Admin)</span>
              </button>
            </div>
          </div>

          {/* Error List */}
          {importErrors.length > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl space-y-2 animate-in slide-in-from-top-2 duration-300 shadow-sm">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                <X size={16} />
                Phát hiện {importErrors.length} lỗi dữ liệu
              </div>
              <div className="max-h-40 overflow-y-auto px-2 space-y-1.5 custom-scrollbar scrollbar-thin scrollbar-thumb-red-200 dark:scrollbar-thumb-red-900/40">
                {importErrors.map((err, idx) => (
                  <p key={idx} className="text-xs text-red-500 dark:text-red-400 leading-relaxed font-medium flex gap-2">
                    <span className="opacity-50">#{(idx + 1).toString().padStart(2, '0')}</span>
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Progress Bar Area */}
          {loading && (
            <div className="space-y-4 py-4 px-2 animate-in slide-in-from-top-2 duration-500 font-sans">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black text-fpt-orange uppercase tracking-[0.1em]">TIẾN TRÌNH XỬ LÝ</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-zinc-200 animate-pulse">{progress.message || 'Đang chuẩn bị dữ liệu...'}</p>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-4xl font-black text-fpt-orange tracking-tighter drop-shadow-sm">{progress.percentage}</span>
                  <span className="text-lg font-black text-fpt-orange opacity-80">%</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-3.5 p-0.5 overflow-hidden border border-slate-200 dark:border-zinc-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                <div 
                  className="bg-gradient-to-r from-orange-400 via-fpt-orange to-orange-600 h-full transition-all duration-700 ease-out rounded-full shadow-[0_0_15px_rgba(242,113,34,0.4)] relative overflow-hidden"
                  style={{ width: `${progress.percentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite] -skew-x-[20deg] w-1/2"></div>
                </div>
              </div>
              {progress.status === 'ERROR' && (
                <div className="flex items-center gap-2 text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100">
                   <AlertCircle size={12} />
                   Có lỗi xảy ra trong quá trình xử lý background.
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center mt-6">
            {isAsyncJob && (
              <button
                type="button"
                onClick={handleCleanup}
                className="text-xs text-red-500 hover:text-red-700 font-medium underline underline-offset-4"
              >
                Xử lí tiến trình đang chạy
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button type="button" onClick={handleClose} disabled={loading && !isAsyncJob} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">Hủy</button>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                 {(loading && !isAsyncJob) && <Loader2 size={16} className="animate-spin" />} {isAsyncJob ? 'Đang chạy ngầm...' : (loading ? 'Đang gửi...' : 'Import ngay')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
