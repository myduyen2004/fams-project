import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, User as UserIcon, Loader2, Upload, Download, Edit2, ChevronDown, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { userService, UserResponse } from '../../../services/api/userService';
import { authService } from '../../../services/api/authService';
import { useWebSocket } from '../../../hooks/useWebSocket';
import toast from "@utils/toast";

// --- Portal Dropdown Wrapper ---
const DropdownPortal: React.FC<{ children: React.ReactNode; triggerRef: React.RefObject<HTMLElement> }> = ({ children, triggerRef }) => {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 300 });
  const [isReady, setIsReady] = useState(false);

  React.useLayoutEffect(() => {
    const updateCoords = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.right + 12,
          width: 300
        });
        setIsReady(true);
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [triggerRef]);

  // Adjust if overflowing screen width
  const adjustedLeft = coords.left + coords.width > window.innerWidth ? window.innerWidth - coords.width - 20 : coords.left;

  if (!isReady) return null;

  return createPortal(
    <div 
      className="fixed z-[9999]" 
      style={{ top: coords.top, left: adjustedLeft }}
    >
      {children}
    </div>,
    document.body
  );
};

// --- Inline Modal Components (Portal-based for z-index stability) ---

interface ModalSelectProps {
  label?: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ModalSelect: React.FC<ModalSelectProps> = ({ label, value, options, onChange, placeholder = 'Chọn...', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Also check if clicking inside the portal content
        const portalContent = document.querySelector('.select-portal-content');
        if (portalContent && portalContent.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1.5 ml-1">{label}</label>}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 h-[52px] border-2 rounded-2xl text-sm transition-all outline-none
                    ${disabled ? 'bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-800 text-gray-500 cursor-not-allowed font-medium' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange hover:border-fpt-orange/40 text-gray-900 dark:text-white'}
                `}
      >
        <span className={selectedOption ? 'font-medium' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <DropdownPortal triggerRef={buttonRef}>
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.95 }}
              className="select-portal-content bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-2xl py-2 max-h-60 overflow-y-auto custom-scrollbar w-[240px]"
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
          </DropdownPortal>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ModalDatePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const ModalDatePicker: React.FC<ModalDatePickerProps> = ({ label, value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const portalContent = document.querySelector('.datepicker-portal-content');
        if (portalContent && portalContent.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(selectedDate.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1));

  const renderCalendar = () => {
    const days = [];
    const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const startDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    }

    for (let d = 1; d <= totalDays; d++) {
      const isSelected = value && new Date(value).getDate() === d &&
        new Date(value).getMonth() === viewDate.getMonth() &&
        new Date(value).getFullYear() === viewDate.getFullYear();
      days.push(
        <button
          key={d}
          type="button"
          onClick={() => handleDateSelect(d)}
          className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm transition-all
                        ${isSelected ? 'bg-fpt-orange text-white font-bold shadow-lg shadow-fpt-orange/20' : 'hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-700 dark:text-gray-300'}
                    `}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1.5 ml-1">{label}</label>}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 h-[52px] border-2 rounded-2xl text-sm transition-all outline-none
                    ${disabled ? 'bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-800 text-gray-500 cursor-not-allowed font-medium' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange hover:border-fpt-orange/40 text-gray-900 dark:text-white'}
                `}
      >
        <span className={value ? 'font-medium' : 'text-gray-400'}>
          {value ? new Date(value).toLocaleDateString('vi-VN') : 'Chọn ngày...'}
        </span>
        <CalendarIcon size={16} className="text-gray-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <DropdownPortal triggerRef={buttonRef}>
            <motion.div
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.95 }}
              className="datepicker-portal-content bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 w-[300px]"
            >
              <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                  <ChevronLeft size={16} className="text-gray-600 dark:text-zinc-400" />
                </button>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {viewDate.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}
                </span>
                <button type="button" onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                  <ChevronRight size={16} className="text-gray-600 dark:text-zinc-400" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                  <div key={d} className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </motion.div>
          </DropdownPortal>
        )}
      </AnimatePresence>
    </div>
  );
};

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
      onClose();
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
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95"><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center mb-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-fpt-orange mx-auto bg-gray-50 dark:bg-zinc-800 flex items-center justify-center shadow-inner">
              {preview ? <img src={preview} alt="preview" className="w-full h-full object-cover" /> : <UserIcon size={32} className="text-gray-300" />}
              <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors cursor-pointer group">
                <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
            <span className="text-[10px] font-black uppercase text-gray-400 mt-2 tracking-widest text-center">Ảnh đại diện (Sẽ dùng để đăng ký khuôn mặt)</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1.5 ml-1">Họ và tên</label>
              <input required type="text" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white" placeholder="Nguyễn Văn A" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1.5 ml-1">Mã số</label>
              <input required type="text" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white uppercase tracking-tight" placeholder="SE150000" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
            </div>
            <div>
              <ModalDatePicker
                label="Ngày sinh"
                value={formData.dob}
                onChange={value => setFormData({ ...formData, dob: value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1.5 ml-1">Email</label>
              <input required type="email" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white" placeholder="anv@fpt.edu.vn" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1.5 ml-1">Số điện thoại</label>
              <input type="text" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white" placeholder="0123456789" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div>
              <ModalSelect
                label="Vai trò"
                value={formData.role}
                onChange={value => setFormData({ ...formData, role: value as any })}
                options={[
                  { value: 'STUDENT', label: 'Sinh viên' },
                  { value: 'LECTURER', label: 'Giảng viên' },
                  { value: 'ACADEMIC_STAFF', label: 'Phòng đào tạo' },
                  { value: 'ADMIN', label: 'Admin' }
                ]}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8 pb-2">
            <button type="button" onClick={onClose} className="h-[44px] px-6 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95">Hủy</button>
            <button type="submit" disabled={loading} className="h-[44px] px-8 bg-fpt-orange text-white text-sm font-bold rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-fpt-orange/20 disabled:opacity-50 flex items-center gap-2 active:scale-95">
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
      onClose();
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
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95"><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center mb-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-fpt-orange mx-auto bg-gray-50 dark:bg-zinc-800 flex items-center justify-center shadow-inner">
              {preview ? <img src={preview.startsWith('data:') ? preview : `${preview}${preview.includes('?') ? '&' : '?'}t=${new Date().getTime()}`} alt="preview" className="w-full h-full object-cover" /> : <UserIcon size={32} className="text-gray-300" />}
              <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors cursor-pointer group">
                <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
            <span className="text-[10px] font-black uppercase text-gray-400 mt-2 tracking-widest text-center">Ảnh đại diện</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1.5 ml-1">Họ và tên</label>
              <input required type="text" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1.5 ml-1">Mã số</label>
              <input readOnly type="text" className="w-full h-[52px] px-4 bg-gray-50 dark:bg-zinc-800/50 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none cursor-not-allowed text-gray-500 uppercase tracking-tight" value={formData.code} />
            </div>
            <div>
              <ModalDatePicker
                label="Ngày sinh"
                value={formData.dob}
                onChange={value => setFormData({ ...formData, dob: value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1.5 ml-1">Email</label>
              <input required type="email" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1.5 ml-1">Số điện thoại</label>
              <input type="text" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div>
              <ModalSelect
                label="Vai trò"
                value={formData.role}
                onChange={value => setFormData({ ...formData, role: value as any })}
                options={[
                  { value: 'STUDENT', label: 'Sinh viên' },
                  { value: 'LECTURER', label: 'Giảng viên' },
                  { value: 'ACADEMIC_STAFF', label: 'Phòng đào tạo' },
                  { value: 'ADMIN', label: 'Admin' }
                ]}
              />
            </div>
            <div className="col-span-2">
              <ModalSelect
                label="Trạng thái tài khoản"
                value={formData.status}
                onChange={value => setFormData({ ...formData, status: value as any })}
                options={[
                  { value: 'ACTIVE', label: 'Đang hoạt động' },
                  { value: 'LOCKED', label: 'Đã khóa' },
                  { value: 'INACTIVE', label: 'Chưa kích hoạt' }
                ]}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8 pb-2">
            <button type="button" onClick={onClose} className="h-[44px] px-6 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95">Hủy</button>
            <button type="submit" disabled={loading} className="h-[44px] px-8 bg-fpt-orange text-white text-sm font-bold rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-fpt-orange/20 disabled:opacity-50 flex items-center gap-2 active:scale-95">
              {loading && <Loader2 size={16} className="animate-spin" />} Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- ViewUserModal ---
export const ViewUserModal: React.FC<{
  user: UserResponse;
  onClose: () => void;
  onEdit?: () => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    className?: string;
  };
}> = ({ user, onClose, onEdit, secondaryAction }) => {
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
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết tài khoản</h3>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-fpt-orange/10 to-orange-400/20 border-2 border-fpt-orange shadow-lg flex items-center justify-center">
              {user.avatar ? <img src={`${user.avatar}${user.avatar.includes('?') ? '&' : '?'}t=${new Date().getTime()}`} alt="avatar" className="w-full h-full object-cover" /> : <UserIcon size={40} className="text-gray-300 dark:text-zinc-600" />}
            </div>
            <div>
              <h4 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{user.fullName}</h4>
              <p className="text-sm font-bold text-fpt-orange uppercase tracking-wider mt-1">{user.roleName}</p>
              <div className="mt-3">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${user.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30' :
                  user.status === 'LOCKED' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30' :
                    'bg-gray-50 text-gray-600 border-gray-100 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                  }`}>
                  {user.status === 'ACTIVE' ? 'Đang hoạt động' : user.status === 'LOCKED' ? 'Đã khóa' : 'Chưa kích hoạt'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mã số</p>
              <p className="font-bold text-gray-900 dark:text-white tracking-tight">{user.code}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ngày sinh</p>
              <p className="font-bold text-gray-900 dark:text-white">
                {Array.isArray(user.dob)
                  ? `${String(user.dob[2]).padStart(2, '0')}/${String(user.dob[1]).padStart(2, '0')}/${user.dob[0]}`
                  : (user.dob || '---')}
              </p>
            </div>
            <div className="col-span-2 p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</p>
              <p className="font-bold text-gray-900 dark:text-white truncate">{user.email}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Số điện thoại</p>
              <p className="font-bold text-gray-900 dark:text-white">{user.phone || '---'}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Khuôn mặt</p>
              <p className={`font-black uppercase text-[11px] ${user.faceDataStatus === 'REGISTERED' ? 'text-green-600' : 'text-red-500'}`}>
                {user.faceDataStatus === 'REGISTERED' ? 'Đã đăng ký' : 'Chưa đăng ký'}
              </p>
            </div>
            <div className="col-span-2 p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Clock size={10} /> Cập nhật lần cuối
              </p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {formatDateTime(user.updatedAt || user.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 mt-4">
            <button
              onClick={onClose}
              className="h-[44px] px-6 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-2xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
            >
              Đóng
            </button>

            {secondaryAction && (
              <button
                onClick={() => {
                  secondaryAction.onClick();
                }}
                className={`h-[44px] px-6 rounded-2xl text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 ${secondaryAction.className || 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700'}`}
              >
                {secondaryAction.icon}
                {secondaryAction.label}
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="h-[44px] px-6 bg-fpt-orange text-white rounded-2xl text-sm font-bold shadow-lg shadow-fpt-orange/20 hover:bg-orange-600 transition-all active:scale-95 flex items-center gap-2"
              >
                <Edit2 size={16} />
                Chỉnh sửa
              </button>
            )}
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

  const currentUser = authService.getUser();
  const username = currentUser?.username || 'anonymous';
  const lastToastId = useRef<string | null>(null);

  const [progress, setProgress] = useState<{
    percentage: number;
    message: string;
    status: string;
  }>({ percentage: 0, message: '', status: '' });

  useWebSocket(`/topic/import-progress/${username}`, (data) => {
    setProgress({
      percentage: data.percentage,
      message: data.message,
      status: data.status
    });

    if (data.statusMessage === 'DATA_PHASE_COMPLETE' && lastToastId.current !== 'DATA_PHASE_COMPLETE') {
      lastToastId.current = 'DATA_PHASE_COMPLETE';
      toast.success('Dữ liệu đã sẵn sàng! Đang chuẩn bị ảnh nền...');
      onSuccess();
      onClose();
      return;
    }

    if (data.status === 'COMPLETED') {
      toast.success('Nhập dữ liệu hoàn tất thành công!');
      setLoading(false);
      setProgress({ percentage: 100, message: 'Hoàn tất cập nhật dữ liệu.', status: 'COMPLETED' });
      onSuccess();
    } else if (data.status === 'CANCELLED' || data.status === 'FAILED') {
      setLoading(false);
      toast.error(data.status === 'CANCELLED' ? 'Tiến trình đã bị dừng.' : 'Nhập dữ liệu thất bại.');
    }
  });

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
        toast.warning('File không có dữ liệu hợp lệ', { icon: '⚠️' });
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
        toast.success('Nhập dữ liệu hoàn tất!');
        setProgress({ percentage: 100, message: 'Hoàn tất cập nhật dữ liệu.', status: 'COMPLETED' });
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi nhập dữ liệu');
      setLoading(false);
    }
  };

  const validCount = previewData?.validRows || 0;
  const errorCount = previewData?.errorRows || 0;
  const isProgressView = ['STARTING', 'PENDING', 'PROCESSING', 'SAVING', 'COMPLETED'].includes(progress.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div
        layout
        transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
        className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full ${!isProgressView && previewData ? 'max-w-[95vw] lg:max-w-6xl 2xl:max-w-7xl' : 'max-w-md'} border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[90vh]`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <motion.div layout="position">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nhập danh sách người dùng từ file zip</h3>
            {!isProgressView && previewData && (
              <p className="text-sm text-gray-500 mt-1 font-bold">
                Xem trước: <span className="text-green-600 uppercase">{validCount} hợp lệ</span> • <span className="text-red-500 uppercase">{errorCount} lỗi</span>
              </p>
            )}
          </motion.div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
            <X size={20} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col min-h-0 relative">
          <AnimatePresence mode="wait">
            {isProgressView ? (
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-10 space-y-6 overflow-y-auto w-full custom-scrollbar"
              >
                {progress.status === 'COMPLETED' ? (
                  <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shadow-xl shadow-green-500/10 mb-2">
                    <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center mb-2">
                    <div className="w-20 h-20 border-[6px] border-orange-100 dark:border-orange-900/30 rounded-full"></div>
                    <div className="w-20 h-20 border-[6px] border-fpt-orange rounded-full border-t-transparent animate-spin absolute top-0 left-0 drop-shadow-md"></div>
                  </div>
                )}

                <div className="text-center space-y-3 px-4">
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                    {progress.status === 'COMPLETED' ? 'Nhập dữ liệu thành công!' : 'Đang xử lý dữ liệu...'}
                  </h4>
                  <p className="text-sm font-bold text-gray-500 dark:text-zinc-400">
                    {progress.message || 'Hệ thống đang chạy ngầm'}
                  </p>
                </div>

                <div className="pt-6 text-center w-full">
                  {progress.status === 'COMPLETED' ? (
                    <button onClick={onClose} className="w-full h-[52px] bg-green-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-green-500/20 hover:bg-green-600 transition-all active:scale-95">
                      Đóng hộp thoại
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-[11px] text-gray-500 italic font-medium uppercase tracking-tight">💡 Tiến trình đang xử lý ngầm, bạn có thể đóng và làm việc khác.</p>
                      <button onClick={onClose} className="h-[44px] px-6 text-sm text-gray-600 font-bold hover:bg-gray-100 rounded-2xl border-2 border-gray-100 transition-all active:scale-95">
                        Ẩn hộp thoại
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : !previewData ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                <form onSubmit={handlePreview} className="space-y-5 overflow-y-auto h-full pr-1 custom-scrollbar">
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/20 text-orange-900 dark:text-orange-200 rounded-2xl text-sm border border-orange-100 dark:border-orange-900/30 shadow-inner">
                    <p className="font-black mb-1 flex items-center gap-2 uppercase tracking-widest text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-fpt-orange" /> Hướng dẫn:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs opacity-80 font-bold">
                      <li>Tải lên file <strong>.xlsx</strong> chứa dữ liệu người dùng.</li>
                      <li>Hoặc file <strong>.zip</strong> chứa dữ liệu + ảnh nền.</li>
                      <li>Nhấn "Xem trước" để kiểm tra trước khi lưu.</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => userService.downloadSampleZip()}
                    className="w-full px-4 py-3 border-2 border-orange-100 dark:border-orange-900/50 rounded-2xl text-sm font-black uppercase tracking-tight text-fpt-orange bg-white dark:bg-zinc-800 hover:bg-fpt-orange hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                  >
                    <Download size={18} /> Tải file mẫu (.zip)
                  </button>

                  <div className="border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center text-center cursor-pointer hover:border-fpt-orange hover:bg-fpt-orange/5 transition-all relative group h-40 justify-center shadow-inner">
                    <input required type="file" accept=".xlsx, .xls, .zip" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                    <div className="p-4 bg-fpt-orange/10 rounded-full mb-3 group-hover:scale-110 transition-transform">
                      <Upload size={32} className="text-fpt-orange" />
                    </div>
                    {file ? (
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[250px]">{file.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Chọn file dữ liệu (.xlsx, .zip)</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-black">Kéo thả hoặc click vào đây</p>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-50 dark:border-zinc-800">
                    <button type="button" onClick={onClose} className="h-[44px] px-6 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95">Hủy</button>
                    <button type="submit" disabled={loading} className="h-[44px] px-8 bg-fpt-orange text-white text-sm font-bold rounded-2xl hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-fpt-orange/20 active:scale-95">
                      {loading && <Loader2 size={16} className="animate-spin" />} Xem trước
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col min-h-0 space-y-4 w-full"
              >
                {errorCount > 0 && (
                  <div className="shrink-0 p-4 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-2xl border border-red-100 dark:border-red-800/30 text-sm flex items-center gap-3">
                    <span className="text-lg">⚠️</span>
                    <p className="font-bold uppercase tracking-tight">Cảnh báo: Có {errorCount} dòng bị lỗi. Vui lòng kiểm tra lại.</p>
                  </div>
                )}

                <div className="flex-1 flex flex-col min-h-0 border-2 rounded-2xl overflow-hidden border-gray-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900/30">
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-gray-50 dark:bg-zinc-800/80 text-gray-700 dark:text-zinc-300 font-black uppercase tracking-widest text-[10px] border-b border-gray-100 dark:border-zinc-700 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-4 w-12 text-center">#</th>
                          <th className="px-4 py-4 min-w-[120px]">Mã số</th>
                          <th className="px-4 py-4 min-w-[180px]">Họ tên</th>
                          <th className="px-4 py-4 min-w-[220px]">Email</th>
                          <th className="px-4 py-4 min-w-[120px]">Ngày sinh</th>
                          <th className="px-4 py-4 min-w-[100px] text-center">Vai trò</th>
                          <th className="px-4 py-4 w-16 text-center">Ảnh</th>
                          <th className="px-4 py-4 w-28 text-center">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                        {previewData?.previewData.map((row: any, index: number) => (
                          <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors ${row.status === 'error' ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                            <td className="px-4 py-3.5 text-center text-gray-400 font-bold">{index + 1}</td>
                            <td className="px-4 py-3.5 font-bold text-gray-900 dark:text-white uppercase tracking-tight">{row.code || '---'}</td>
                            <td className="px-4 py-3.5 font-bold text-gray-700 dark:text-gray-200">{row.fullName || '---'}</td>
                            <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 italic font-medium">{row.email || '---'}</td>
                            <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 font-bold">{row.dob || '---'}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-600">
                                {row.role}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {row.hasImage ? (
                                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mx-auto shadow-sm shadow-green-500/20">
                                  <span className="text-white text-[10px] font-bold">✓</span>
                                </div>
                              ) : (
                                <span className="text-gray-300 dark:text-zinc-700 px-2">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {row.status === 'valid' ? (
                                <span className="inline-flex items-center px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-black rounded-full border border-green-100 dark:border-green-800/30 uppercase tracking-tighter">
                                  HỢP LỆ
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-black rounded-full border border-red-100 dark:border-red-800/30 cursor-help uppercase tracking-tighter"
                                  title={row.errorMessage}
                                >
                                  CÓ LỖI
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="shrink-0 flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <button
                    onClick={() => setPreviewData(null)}
                    className="h-[44px] px-5 text-sm font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 transition-all flex items-center gap-2 active:scale-95"
                  >
                    <Upload size={18} className="rotate-180" /> Thử lại
                  </button>
                  <div className="flex gap-3">
                    <button onClick={onClose} className="h-[44px] px-6 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95">Đóng</button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={loading || validCount === 0 || errorCount > 0}
                      className="h-[44px] px-8 bg-fpt-orange text-white text-sm font-bold rounded-2xl hover:bg-orange-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-fpt-orange/20 active:scale-95 flex items-center gap-2"
                    >
                      {loading && <Loader2 size={18} className="animate-spin" />}
                      {errorCount > 0 ? `Chứa dòng lỗi` : `Lưu ${validCount} tài khoản`}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

// --- ConfirmModal ---
export const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'success' | 'info';
  confirmLabel?: string;
  cancelLabel?: string;
}> = ({ isOpen, onClose, onConfirm, title, message, type = 'danger', confirmLabel = 'Xác nhận', cancelLabel = 'Hủy' }) => {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-red-600 hover:bg-red-700 shadow-red-500/20',
    warning: 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20',
    success: 'bg-green-600 hover:bg-green-700 shadow-green-500/20',
    info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-zinc-800 p-6"
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-tight">{title}</h3>
        <p className="text-gray-500 dark:text-zinc-400 mb-8 leading-relaxed font-medium">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="h-[44px] px-6 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95">{cancelLabel}</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`h-[44px] px-6 text-white text-sm font-bold rounded-2xl shadow-lg transition-all active:scale-95 ${colors[type]}`}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  );
};

