import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, User as UserIcon, Loader2, Upload, Mail, Phone, Calendar as CalendarIcon, GraduationCap, UserPlus, ChevronDown, Check, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LecturerResponse, LecturerRequest, academicStaffService, LecturerImportDTO } from '../../../services/api/academicStaffService';
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
            {label && <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">{label}</label>}
            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 h-[52px] border-2 rounded-2xl text-sm transition-all outline-none
                    ${disabled ? 'bg-gray-100 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-800 text-gray-500 cursor-not-allowed font-medium' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange hover:border-fpt-orange/40 text-gray-900 dark:text-white'}
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
            {label && <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">{label}</label>}
            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 h-[52px] border-2 rounded-2xl text-sm transition-all outline-none
                    ${disabled ? 'bg-gray-100 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-800 text-gray-500 cursor-not-allowed font-medium' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange hover:border-fpt-orange/40 text-gray-900 dark:text-white'}
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
                                    <div key={d} className="text-[10px] font-black text-gray-400 text-center uppercase">{d}</div>
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
    case 'ACTIVE': return <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-lg dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800/30">Hoạt động</span>;
    case 'LOCKED': return <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-lg dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800/30">Đã khóa</span>;
    case 'INACTIVE': return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-black uppercase rounded-lg dark:bg-yellow-950/40 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/30">Chưa kích hoạt</span>;
    default: return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-[10px] font-black uppercase rounded-lg dark:bg-zinc-800 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700">{status}</span>;
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

  return (
    <>
      <ModalSelect
        label={`Ngành dạy ${required ? '*' : ''}`}
        disabled={disabled}
        value={major}
        onChange={val => onMajorChange(val)}
        placeholder="Chọn ngành dạy"
        options={[
          { value: '', label: 'Chọn ngành dạy' },
          ...majors.map(m => ({ value: m, label: m }))
        ]}
      />
      <div className="relative">
        <ModalSelect
          label={`Chuyên ngành ${required && major ? '*' : ''}`}
          disabled={disabled || !major || specializations.length === 0}
          value={specialization}
          onChange={val => onSpecializationChange(val)}
          placeholder="Chọn chuyên ngành"
          options={[
            { value: '', label: 'Chọn chuyên ngành' },
            ...specializations.map(s => ({ value: s, label: s }))
          ]}
        />
        {major && specializations.length === 0 && (
          <p className="text-[10px] text-gray-400 mt-1 italic ml-1 absolute top-full left-0">Ngành này chưa có chuyên ngành</p>
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
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
            <X size={20} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center mb-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 flex items-center justify-center shadow-inner">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Họ và tên <span className="text-red-500">*</span></label>
              <input required type="text" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white" placeholder="Nguyễn Văn A" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Mã giảng viên <span className="text-red-500">*</span></label>
              <input required type="text" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white uppercase" placeholder="GV001" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
            </div>
            <div>
              <ModalDatePicker
                label="Ngày sinh *"
                value={formData.dob}
                onChange={value => setFormData({ ...formData, dob: value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Email <span className="text-red-500">*</span></label>
              <input required type="email" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white" placeholder="lecturer@fpt.edu.vn" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>

            <MajorSpecFields
              major={formData.major || ''}
              specialization={formData.specialization || ''}
              onMajorChange={val => setFormData({ ...formData, major: val, specialization: '' })}
              onSpecializationChange={val => setFormData({ ...formData, specialization: val })}
            />

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Chuyên môn</label>
              <input type="text" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white" placeholder="Machine Learning, Deep Learning..." value={formData.expertise || ''} onChange={e => setFormData({ ...formData, expertise: e.target.value })} />
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
      onClose();
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
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
            <X size={20} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center mb-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 flex items-center justify-center shadow-inner">
              {preview ? <img src={preview.startsWith('data:') ? preview : `${preview}${preview.includes('?') ? '&' : '?'}t=${new Date().getTime()}`} alt="preview" className="w-full h-full object-cover" /> : <UserIcon size={32} className="text-gray-300" />}
            </div>
            <span className="text-xs text-gray-400 mt-2">Ảnh đại diện</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Họ và tên</label>
              <input readOnly type="text" className="w-full h-[52px] px-4 bg-gray-50 dark:bg-zinc-800/50 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none text-gray-500 font-medium cursor-not-allowed" value={formData.fullName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Mã giảng viên</label>
              <input readOnly type="text" className="w-full h-[52px] px-4 bg-gray-50 dark:bg-zinc-800/50 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none cursor-not-allowed text-gray-500 font-medium" value={formData.code} />
            </div>
            <div>
              <ModalDatePicker
                label="Ngày sinh"
                value={formData.dob}
                onChange={() => {}}
                disabled
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Email</label>
              <input readOnly type="email" className="w-full h-[52px] px-4 bg-gray-50 dark:bg-zinc-800/50 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none text-gray-500 font-medium cursor-not-allowed" value={formData.email} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Số điện thoại</label>
              <input readOnly type="text" className="w-full h-[52px] px-4 bg-gray-50 dark:bg-zinc-800/50 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none text-gray-500 font-medium cursor-not-allowed" value={formData.phone} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Trạng thái</label>
              <input readOnly type="text" className="w-full h-[52px] px-4 bg-gray-50 dark:bg-zinc-800/50 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm outline-none text-gray-500 font-medium cursor-not-allowed" value={formData.status} />
            </div>

            <MajorSpecFields
              major={formData.major}
              specialization={formData.specialization}
              onMajorChange={val => setFormData({ ...formData, major: val, specialization: '' })}
              onSpecializationChange={val => setFormData({ ...formData, specialization: val })}
            />

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Chuyên môn</label>
              <input
                type="text"
                className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white"
                placeholder="Machine Learning, Deep Learning..."
                value={formData.expertise}
                onChange={e => setFormData({ ...formData, expertise: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Tiểu sử</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none resize-none text-gray-900 dark:text-white custom-scrollbar"
                placeholder="Mô tả ngắn về giảng viên..."
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
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
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
            <X size={20} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-blue-100 dark:border-blue-900/20 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {lecturer.avatar ? (
                <img src={`${lecturer.avatar}${lecturer.avatar.includes('?') ? '&' : '?'}t=${new Date().getTime()}`} alt="avatar" className="w-full h-full object-cover" />
              ) : (<GraduationCap size={40} />)}
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white">{lecturer.fullName}</h4>
              <p className="text-gray-500 dark:text-zinc-400 font-mono text-sm uppercase tracking-wider">{lecturer.code}</p>
              <div className="mt-2 flex items-center gap-2">
                {getStatusBadge(lecturer.status)}
                {!hasProfile && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-black uppercase rounded-lg dark:bg-yellow-950/40 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/30 shadow-sm">Chưa đăng ký</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
              <Mail className="w-5 h-5 text-fpt-orange" />
              <span className="text-sm font-medium">{lecturer.email}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
              <Phone className="w-5 h-5 text-fpt-orange" />
              <span className="text-sm font-medium">{lecturer.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
              <CalendarIcon className="w-5 h-5 text-fpt-orange" />
              <span className="text-sm font-medium">Ngày sinh: {formatDate(lecturer.dob)}</span>
            </div>

            {hasProfile && (
              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ngành dạy</p>
                    <p className="font-bold text-gray-700 dark:text-gray-300">{lecturer.major || lecturer.department || '---'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Chuyên ngành</p>
                    <p className="font-bold text-gray-700 dark:text-gray-300">{lecturer.specialization || 'Chưa cập nhật'}</p>
                  </div>
                  {lecturer.expertise && (
                    <div className="col-span-2 p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Chuyên môn</p>
                      <p className="font-bold text-gray-700 dark:text-gray-300">{lecturer.expertise}</p>
                    </div>
                  )}
                  {lecturer.bio && (
                    <div className="col-span-2 p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tiểu sử</p>
                      <p className="font-bold text-gray-700 dark:text-gray-300 italic">{lecturer.bio}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Clock size={10} /> Ngày tạo
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 font-bold">{formatDateTime(lecturer.createdAt)}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl border border-gray-100 dark:border-zinc-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Clock size={10} /> Đăng nhập lần cuối
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 font-bold">{formatDateTime(lecturer.lastLogin)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            {showRegisterButton && !hasProfile && onRegister ? (
              <button
                onClick={() => { onClose(); onRegister(lecturer); }}
                className="h-[44px] px-6 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2 font-bold active:scale-95"
              >
                <UserPlus size={16} />
                Đăng ký thông tin
              </button>
            ) : (<div></div>)}
            <button onClick={onClose} className="h-[44px] px-8 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-2xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all active:scale-95">Đóng</button>
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
      onClose();
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
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
            <X size={20} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Chuyên môn</label>
            <input
              type="text"
              className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white"
              placeholder="VD: Machine Learning, Web Development..."
              value={expertise}
              onChange={e => setExpertise(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Giới thiệu</label>
            <textarea
              rows={3}
              className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none resize-none text-gray-900 dark:text-white custom-scrollbar"
              placeholder="Mô tả ngắn về giảng viên..."
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 mt-8 pb-2">
            <button type="button" onClick={onClose} className="h-[44px] px-6 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95">Hủy</button>
            <button type="submit" disabled={loading} className="h-[44px] px-8 bg-green-600 text-white text-sm font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 flex items-center gap-2 active:scale-95">
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
        toast.warning('File không có dữ liệu hợp lệ', { icon: '⚠️' });
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
      onClose();
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
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
            <X size={20} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {!previewData ? (
            <form onSubmit={handlePreview} className="space-y-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 text-orange-900 dark:text-orange-200 rounded-2xl text-sm border border-orange-100 dark:border-orange-900/30">
                <p className="font-bold mb-1">Hướng dẫn:</p>
                <ul className="list-disc pl-4 space-y-1 text-xs opacity-80">
                  <li>Tải lên file <strong>.xlsx</strong> chứa dữ liệu giảng viên.</li>
                  <li>Dữ liệu được xác thực dựa trên <strong>Mã Giảng Viên</strong>.</li>
                  <li>Cột <strong>Ngành dạy</strong> và <strong>Chuyên ngành</strong> phải khớp nhau (chuyên ngành phải thuộc ngành dạy).</li>
                  <li>Nhấn "Xem trước" để kiểm tra dữ liệu trước khi lưu.</li>
                </ul>
              </div>
              <div className="border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center text-center cursor-pointer hover:border-fpt-orange hover:bg-fpt-orange/5 transition-all relative h-40 justify-center group">
                <input required type="file" accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                <div className="p-4 bg-fpt-orange/10 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={32} className="text-fpt-orange" />
                </div>
                {file ? (
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Chọn file dữ liệu (.xlsx)</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Kéo thả hoặc click vào đây</p>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={onClose} className="h-[44px] px-6 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95">Hủy</button>
                <button type="submit" disabled={loading} className="h-[44px] px-8 bg-fpt-orange text-white text-sm font-bold rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-fpt-orange/20 disabled:opacity-50 flex items-center gap-2 active:scale-95">
                  {loading && <Loader2 size={16} className="animate-spin" />} Xem trước
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-2xl overflow-hidden border-gray-200 dark:border-zinc-700 shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold border-b border-gray-200 dark:border-zinc-700 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-4 w-12 text-center">#</th>
                      <th className="px-4 py-4">Mã GV</th>
                      <th className="px-4 py-4">Họ tên</th>
                      <th className="px-4 py-4">Email</th>
                      <th className="px-4 py-4">Ngành / Chuyên ngành</th>
                      <th className="px-4 py-4">Chuyên môn</th>
                      <th className="px-4 py-4">Tiểu sử</th>
                      <th className="px-4 py-4 text-center">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {previewData.map((row, index) => (
                      <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors ${row.status === 'ERROR' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                        <td className="px-4 py-3.5 text-center text-gray-400 font-medium">{row.rowNumber - 1}</td>
                        <td className="px-4 py-3.5 font-bold text-gray-900 dark:text-white uppercase tracking-tight">{row.code}</td>
                        <td className="px-4 py-3.5 text-gray-700 dark:text-gray-200">{row.fullName || '---'}</td>
                        <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 italic font-medium">{row.email || '---'}</td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400">
                          <div className="font-bold">{row.major || row.department || '---'}</div>
                          {row.specialization && <div className="text-[10px] text-fpt-orange font-bold uppercase">{row.specialization}</div>}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{row.expertise || '---'}</td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{row.bio || '---'}</td>
                        <td className="px-4 py-3.5 text-center">
                          {row.status === 'VALID' ? (
                            <span className="inline-flex items-center px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-black rounded-full border border-green-100 dark:border-green-800/30">HỢP LỆ</span>
                          ) : (
                            <div className="group relative inline-flex justify-center">
                              <span className="inline-flex items-center px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-[10px] font-black rounded-full border border-red-100 dark:border-red-800/30 cursor-help">LỖI</span>
                              <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-[10px] rounded-xl z-50 text-center shadow-xl">{row.errorMessage}</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button onClick={() => setPreviewData(null)} className="h-[44px] px-6 text-sm font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl transition-all flex items-center gap-2 active:scale-95">
                  <Upload size={16} className="rotate-180" /> Thử lại
                </button>
                <div className="flex gap-3">
                  <button onClick={onClose} className="h-[44px] px-6 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95">Hủy</button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={loading || validCount === 0 || errorCount > 0}
                    className="h-[44px] px-8 bg-green-600 text-white text-sm font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Lưu {validCount} tài khoản
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

