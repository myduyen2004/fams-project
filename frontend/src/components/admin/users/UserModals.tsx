import React, { useState } from 'react';
import { X, Camera, User as UserIcon, Loader2, Upload } from 'lucide-react';
import { userService, UserResponse } from '../../../services/api/userService';
import toast from 'react-hot-toast';

// --- AddUserModal ---
export const AddUserModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({ fullName: '', code: '', email: '', dob: '', role: 'STUDENT' as any });

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
            <div className="col-span-2">
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
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '---';
    }
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
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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
      const formData = new FormData();
      formData.append('file', file);
      await userService.importUsers(formData);
      toast.success('Import người dùng thành công');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi import người dùng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import người dùng</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded-lg text-sm">
            <p className="font-semibold mb-1">Hướng dẫn:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Tải lên file <strong>.xlsx</strong> chứa dữ liệu người dùng.</li>
              <li>Hoặc file <strong>.zip</strong> chứa file Excel và ảnh đại diện (đặt tên ảnh trùng Mã số).</li>
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
               {loading && <Loader2 size={16} className="animate-spin" />} Import ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
