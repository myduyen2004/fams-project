import React, { useState, useEffect } from 'react';
import { X, Camera, User as UserIcon, Loader2, Upload, Mail, Phone, Calendar, GraduationCap, UserPlus } from 'lucide-react';
import { LecturerResponse, LecturerRequest, academicStaffService, LecturerImportDTO } from '../../../services/api/academicStaffService';
import toast from 'react-hot-toast';

// --- Helper functions ---
const formatDateTime = (date: unknown) => {
  if (!date) return '---';
  try {
    let d: Date;
    if (Array.isArray(date)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = date as any[];
      d = new Date(year, month - 1, day, hour, minute, second);
    } else {
      d = new Date(date as string | number | Date);
    }
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '---'; }
};

const formatDate = (date: unknown) => {
  if (!date) return '---';
  try {
    let d: Date;
    if (Array.isArray(date)) {
      const [year, month, day] = date as any[];
      d = new Date(year, month - 1, day);
    } else {
      d = new Date(date as string | number | Date);
    }
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '---'; }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE': return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Hoạt động</span>;
    case 'LOCKED': return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Đã khóa</span>;
    case 'INACTIVE': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Chưa kích hoạt</span>;
    default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">{status}</span>;
  }
};

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    return axiosError.response?.data?.message || defaultMessage;
  }
  return defaultMessage;
};

// --- MajorSpecializationFields – reusable cascading selector ---
interface MajorSpecFieldsProps {
  major: string;
  specialization: string;
  onMajorChange: (val: string) => void;
  onSpecializationChange: (val: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const MajorSpecFields: React.FC<MajorSpecFieldsProps> = ({
  major, specialization, onMajorChange, onSpecializationChange, required = false, disabled = false
}) => {
  const [majors, setMajors] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);

  useEffect(() => {
    academicStaffService.getAllMajors()
      .then(setMajors)
      .catch(() => console.error('Failed to fetch majors'));
  }, []);

  useEffect(() => {
    if (major) {
      academicStaffService.getSpecializationsByMajor(major)
        .then(setSpecializations)
        .catch(() => setSpecializations([]));
    } else {
      setSpecializations([]);
      onSpecializationChange('');
    }
  }, [major]);

  const fieldClass = `w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">
          Ngành dạy {required && <span className="text-red-500">*</span>}
        </label>
        <select
          required={required}
          disabled={disabled}
          className={fieldClass}
          value={major}
          onChange={e => onMajorChange(e.target.value)}
        >
          <option value="">Chọn ngành dạy</option>
          {majors.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">
          Chuyên ngành {required && major && <span className="text-red-500">*</span>}
        </label>
        <select
          required={required && !!major}
          disabled={disabled || !major || specializations.length === 0}
          className={fieldClass}
          value={specialization}
          onChange={e => onSpecializationChange(e.target.value)}
        >
          <option value="">Chọn chuyên ngành</option>
          {specializations.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {major && specializations.length === 0 && (
          <p className="text-xs text-gray-400 mt-1 italic">Ngành này chưa có chuyên ngành</p>
        )}
      </div>
    </>
  );
};

// --- AddLecturerModal ---
export const AddLecturerModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<LecturerRequest>({
    fullName: '',
    code: '',
    email: '',
    dob: '',
    major: '',
    specialization: '',
    expertise: ''
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
    if (formData.major && !formData.specialization) {
      toast.error('Vui lòng chọn chuyên ngành phù hợp với ngành dạy đã chọn');
      return;
    }
    try {
      setLoading(true);
      await academicStaffService.createLecturer(formData, avatar || undefined);
      toast.success('Đã thêm giảng viên thành công');
      onSuccess();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lỗi khi thêm giảng viên'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Thêm giảng viên mới</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Họ và tên <span className="text-red-500">*</span></label>
              <input required type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white" placeholder="Nguyễn Văn A" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Mã giảng viên <span className="text-red-500">*</span></label>
              <input required type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white" placeholder="GV001" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Ngày sinh <span className="text-red-500">*</span></label>
              <input required type="date" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Email <span className="text-red-500">*</span></label>
              <input required type="email" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white" placeholder="lecturer@fpt.edu.vn" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>

            {/* Cascading Major / Specialization */}
            <MajorSpecFields
              major={formData.major || ''}
              specialization={formData.specialization || ''}
              onMajorChange={val => setFormData({ ...formData, major: val, specialization: '' })}
              onSpecializationChange={val => setFormData({ ...formData, specialization: val })}
            />

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Chuyên môn</label>
              <input type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white" placeholder="Machine Learning, Deep Learning..." value={formData.expertise || ''} onChange={e => setFormData({ ...formData, expertise: e.target.value })} />
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

// --- EditLecturerModal ---
export const EditLecturerModal: React.FC<{ lecturer: LecturerResponse; onClose: () => void; onSuccess: () => void }> = ({ lecturer, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const preview = lecturer.avatar || null;

  const ensureStringDate = (d: unknown): string => {
    if (Array.isArray(d)) {
      const [year, month, day] = d as unknown[];
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return (d as string) || '';
  };

  type StatusType = 'ACTIVE' | 'LOCKED' | 'INACTIVE';

  type LecturerForm = {
    fullName: string;
    code: string;
    email: string;
    dob: string;
    phone: string;
    status: StatusType;
    major: string;
    specialization: string;
    expertise: string;
    bio?: string;
  };

  const [formData, setFormData] = useState<LecturerForm>({
    fullName: lecturer.fullName,
    code: lecturer.code,
    email: lecturer.email,
    dob: ensureStringDate(lecturer.dob),
    phone: lecturer.phone || '',
    status: (lecturer.status as StatusType) || 'INACTIVE',
    major: lecturer.major || '',
    specialization: lecturer.specialization || '',
    expertise: lecturer.expertise || '',
    bio: lecturer.bio || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.major && !formData.specialization) {
      toast.error('Chuyên ngành phải nằm trong ngành dạy đã chọn. Vui lòng chọn chuyên ngành.');
      return;
    }
    try {
      setLoading(true);
      await academicStaffService.updateLecturer(lecturer.id, {
        fullName: formData.fullName,
        code: formData.code,
        email: formData.email,
        dob: formData.dob,
        phone: formData.phone,
        status: formData.status,
        major: formData.major,
        specialization: formData.specialization,
        expertise: formData.expertise,
        bio: formData.bio
      });
      toast.success('Cập nhật thành công');
      onSuccess();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lỗi khi cập nhật'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Chỉnh sửa thông tin giảng viên</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-col items-center mb-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
              {preview ? <img src={preview.startsWith('data:') ? preview : `${preview}${preview.includes('?') ? '&' : '?'}t=${new Date().getTime()}`} alt="preview" className="w-full h-full object-cover" /> : <UserIcon size={32} className="text-gray-300" />}
            </div>
            <span className="text-xs text-gray-400 mt-2">Ảnh đại diện</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Họ và tên</label>
              <input readOnly type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none text-gray-900 dark:text-white" value={formData.fullName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Mã giảng viên</label>
              <input readOnly type="text" className="w-full px-4 py-2 bg-gray-100 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none cursor-not-allowed text-gray-500" value={formData.code} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Ngày sinh</label>
              <input readOnly type="date" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none text-gray-900 dark:text-white" value={formData.dob} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Email</label>
              <input readOnly type="email" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none text-gray-900 dark:text-white" value={formData.email} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Số điện thoại</label>
              <input readOnly type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none text-gray-900 dark:text-white" value={formData.phone} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Trạng thái</label>
              <input readOnly type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none text-gray-900 dark:text-white" value={formData.status} />
            </div>

            {/* Cascading Major / Specialization – editable */}
            <MajorSpecFields
              major={formData.major}
              specialization={formData.specialization}
              onMajorChange={val => setFormData({ ...formData, major: val, specialization: '' })}
              onSpecializationChange={val => setFormData({ ...formData, specialization: val })}
            />

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Chuyên môn</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                placeholder="Machine Learning, Deep Learning..."
                value={formData.expertise}
                onChange={e => setFormData({ ...formData, expertise: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Tiểu sử</label>
              <textarea
                rows={3}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none resize-none text-gray-900 dark:text-white"
                placeholder="Mô tả ngắn về giảng viên..."
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
              />
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

// --- ViewLecturerModal ---
export const ViewLecturerModal: React.FC<{
  lecturer: LecturerResponse;
  onClose: () => void;
  onRegister?: (lecturer: LecturerResponse) => void;
  showRegisterButton?: boolean;
}> = ({ lecturer, onClose, onRegister, showRegisterButton = true }) => {
  const hasProfile = !!(lecturer.major || lecturer.department);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Thông tin Giảng viên</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-blue-100 dark:border-blue-900/20 flex items-center justify-center text-white text-2xl font-bold">
              {lecturer.avatar ? (
                <img src={`${lecturer.avatar}${lecturer.avatar.includes('?') ? '&' : '?'}t=${new Date().getTime()}`} alt="avatar" className="w-full h-full object-cover" />
              ) : (<GraduationCap size={40} />)}
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white">{lecturer.fullName}</h4>
              <p className="text-gray-500 dark:text-zinc-400 font-mono">{lecturer.code}</p>
              <div className="mt-2 flex items-center gap-2">
                {getStatusBadge(lecturer.status)}
                {!hasProfile && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Chưa đăng ký</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <Mail className="w-5 h-5 text-gray-400" />
              <span>{lecturer.email}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <Phone className="w-5 h-5 text-gray-400" />
              <span>{lecturer.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span>Ngày sinh: {formatDate(lecturer.dob)}</span>
            </div>

            {hasProfile && (
              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Ngành dạy</p>
                    <p className="font-medium text-gray-700 dark:text-gray-300">{lecturer.major || lecturer.department || '---'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Chuyên ngành</p>
                    <p className="font-medium text-gray-700 dark:text-gray-300">{lecturer.specialization || 'Chưa cập nhật'}</p>
                  </div>
                  {lecturer.expertise && (
                    <div>
                      <p className="text-gray-400">Chuyên môn</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{lecturer.expertise}</p>
                    </div>
                  )}
                  {lecturer.bio && (
                    <div className="col-span-2">
                      <p className="text-gray-400">Tiểu sử</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300">{lecturer.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Ngày tạo</p>
                  <p className="text-gray-700 dark:text-gray-300">{formatDateTime(lecturer.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Lần đăng nhập cuối</p>
                  <p className="text-gray-700 dark:text-gray-300">{formatDateTime(lecturer.lastLogin)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-4">
            {showRegisterButton && !hasProfile && onRegister ? (
              <button
                onClick={() => { onClose(); onRegister(lecturer); }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <UserPlus size={16} />
                Đăng ký thông tin
              </button>
            ) : (<div></div>)}
            <button onClick={onClose} className="px-6 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- RegisterLecturerProfileModal ---
export const RegisterLecturerProfileModal: React.FC<{ lecturer: LecturerResponse; onClose: () => void; onSuccess: () => void }> = ({ lecturer, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [major, setMajor] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [expertise, setExpertise] = useState('');
  const [bio, setBio] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!major) {
      toast.error('Vui lòng chọn ngành dạy');
      return;
    }
    if (!specialization) {
      toast.error('Chuyên ngành phải nằm trong ngành dạy đã chọn. Vui lòng chọn chuyên ngành.');
      return;
    }
    try {
      setLoading(true);
      await academicStaffService.registerLecturerProfile(lecturer.id, {
        department: major, // backward compat
        expertise,
        bio
      });
      toast.success('Đã đăng ký thông tin giảng viên thành công');
      onSuccess();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lỗi khi đăng ký thông tin giảng viên'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Đăng ký thông tin giảng viên</h3>
            <p className="text-sm text-gray-500 mt-1">Giảng viên: {lecturer.fullName}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <MajorSpecFields
              major={major}
              specialization={specialization}
              onMajorChange={val => { setMajor(val); setSpecialization(''); }}
              onSpecializationChange={setSpecialization}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Chuyên môn</label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
              placeholder="VD: Machine Learning, Web Development..."
              value={expertise}
              onChange={e => setExpertise(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Giới thiệu</label>
            <textarea
              rows={3}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none resize-none text-gray-900 dark:text-white"
              placeholder="Mô tả ngắn về giảng viên..."
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              <UserPlus size={16} />
              Đăng ký
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- ImportLecturerModal ---
export const ImportLecturerModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<LecturerImportDTO[] | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewData(null);
    }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error('Vui lòng chọn file'); return; }
    try {
      setLoading(true);
      const data = await academicStaffService.previewImportLecturers(file);
      setPreviewData(data);
      if (data.length === 0) {
        toast('File không có dữ liệu hợp lệ', { icon: '⚠️' });
      } else {
        toast.success(`Đã đọc ${data.length} dòng`);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lỗi khi đọc file'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || previewData.length === 0) return;
    try {
      setLoading(true);
      const result = await academicStaffService.saveImportedLecturers(previewData);
      const totalSuccess = result.created + result.updated;
      if (totalSuccess > 0) toast.success(`Thành công: ${result.created} mới, ${result.updated} cập nhật`);
      if (result.failed > 0) {
        toast.error(`${result.failed} dòng bị lỗi`);
        if (result.errors && result.errors.length > 0) console.error('Import save errors:', result.errors);
      }
      onSuccess();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Lỗi khi lưu dữ liệu'));
    } finally {
      setLoading(false);
    }
  };

  const validCount = previewData?.filter(item => item.status === 'VALID').length || 0;
  const errorCount = previewData?.filter(item => item.status === 'ERROR').length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full ${previewData ? 'max-w-6xl' : 'max-w-md'} border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh]`}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import danh sách giảng viên</h3>
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
          {!previewData ? (
            <form onSubmit={handlePreview} className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded-lg text-sm">
                <p className="font-semibold mb-1">Hướng dẫn:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Tải lên file <strong>.xlsx</strong> chứa dữ liệu giảng viên.</li>
                  <li>Dữ liệu được xác thực dựa trên <strong>Mã Giảng Viên</strong>.</li>
                  <li>Cột <strong>Ngành dạy</strong> và <strong>Chuyên ngành</strong> phải khớp nhau (chuyên ngành phải thuộc ngành dạy).</li>
                  <li>Nhấn "Xem trước" để kiểm tra dữ liệu trước khi lưu.</li>
                </ul>
              </div>
              <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors relative">
                <input required type="file" accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                <Upload size={32} className="text-fpt-orange mb-2" />
                {file ? (
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Chọn file để tải lên</p>
                    <p className="text-xs text-gray-500 mt-1">Hỗ trợ .xlsx</p>
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
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden border-gray-200 dark:border-zinc-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-medium border-b border-gray-200 dark:border-zinc-700">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-4 py-3">Mã GV</th>
                      <th className="px-4 py-3">Họ tên</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Ngành dạy / Chuyên ngành</th>
                      <th className="px-4 py-3">Chuyên môn</th>
                      <th className="px-4 py-3">Tiểu sử</th>
                      <th className="px-4 py-3 text-center">Ghi chú</th>
                      <th className="px-4 py-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {previewData.map((row, index) => (
                      <tr key={index} className={row.status === 'ERROR' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <td className="px-4 py-3 text-center text-gray-500">{row.rowNumber - 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.code}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.fullName || '---'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.email || '---'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          <div>{row.major || row.department || '---'}</div>
                          {row.specialization && <div className="text-xs text-gray-400">{row.specialization}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.expertise || '---'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.bio || '---'}</td>
                        <td className="px-4 py-3 text-red-500 text-xs italic max-w-xs">{row.errorMessage || ''}</td>
                        <td className="px-4 py-3 text-center">
                          {row.status === 'VALID' ? (
                            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Hợp lệ</span>
                          ) : (
                            <div className="group relative inline-flex justify-center">
                              <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full cursor-help">Lỗi</span>
                              <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded z-50 text-center">{row.errorMessage}</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button onClick={() => setPreviewData(null)} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
                  <Upload size={16} className="rotate-180" /> Quay lại upload
                </button>
                <div className="flex gap-3">
                  <button onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={loading || validCount === 0 || errorCount > 0}
                    className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Xác nhận import ({validCount})
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
