import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

// --- Inline Modal Components ---

interface ModalDatePickerProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

const ModalDatePicker: React.FC<ModalDatePickerProps> = ({ label, value, onChange, disabled = false, placeholder = 'Chọn ngày...' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewDate, setViewDate] = useState(() => {
        if (value) {
            const [y, m, d] = value.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        return new Date();
    });
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
        }
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                const picker = document.getElementById('datepicker-portal');
                if (picker && picker.contains(event.target as Node)) return;
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handleDateSelect = (day: number) => {
        const yyyy = viewDate.getFullYear();
        const mm = String(viewDate.getMonth() + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        onChange(`${yyyy}-${mm}-${dd}`);
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
            let isSelected = false;
            if (value) {
                const [y, m, dayVal] = value.split('-').map(Number);
                isSelected = dayVal === d && (m - 1) === viewDate.getMonth() && y === viewDate.getFullYear();
            }
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
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 h-[52px] border-2 rounded-2xl text-sm transition-all outline-none
                    ${disabled ? 'bg-gray-100 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-800 text-gray-500 cursor-not-allowed font-medium' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange hover:border-fpt-orange/40 text-gray-900 dark:text-white'}
                `}
            >
                <span className={value ? 'font-bold' : 'text-gray-400'}>
                    {value ? value.split('-').reverse().join('/') : placeholder}
                </span>
                <CalendarIcon size={16} className="text-gray-400" />
            </button>

            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            id="datepicker-portal"
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            style={{
                                position: 'absolute',
                                top: coords.top - 8,
                                left: coords.left,
                                width: Math.max(coords.width, 300),
                                transform: 'translateY(-100%)',
                                zIndex: 9999
                            }}
                            className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-2xl p-4"
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
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

interface Semester {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface AddSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (semesterData: {
    code: string;
    name: string;
    startDate: string;
    endDate: string;
  }) => Promise<void>;
  existingSemesters?: Semester[];
}

export const AddSemesterModal: React.FC<AddSemesterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingSemesters = [],
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name || !formData.startDate || !formData.endDate) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [startYear, startMonth, startDay] = formData.startDate.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    
    const [endYear, endMonth, endDay] = formData.endDate.split('-').map(Number);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    if (startDate <= today) {
      setError('Ngày bắt đầu học kỳ phải sau ngày hôm nay');
      return;
    }

    if (startDate >= endDate) {
      setError('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    const codeRegex = /^(SP|SU|FA)\d{2}$/;
    if (!codeRegex.test(formData.code)) {
      setError('Vui lòng nhập đúng mã học kỳ, mã học kỳ phải bắt đầu SP, SU, FA. VD: SP26, SU26, FA26');
      return;
    }

    const duplicateCode = existingSemesters.find(
      s => s.code.toLowerCase() === formData.code.toLowerCase()
    );
    if (duplicateCode) {
      setError(`Mã học kỳ "${formData.code}" đã tồn tại trong hệ thống`);
      return;
    }

    const duplicateName = existingSemesters.find(
      s => s.name.toLowerCase() === formData.name.toLowerCase()
    );
    if (duplicateName) {
      setError(`Tên học kỳ "${formData.name}" đã tồn tại trong hệ thống`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
      setFormData({
        code: '',
        name: '',
        startDate: '',
        endDate: '',
      });
      onClose();
    } catch (err: unknown) {
      let errorMessage = 'Có lỗi xảy ra khi thêm học kỳ';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string; error?: string }, status?: number } };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.response?.status === 409) {
          errorMessage = 'Mã học kỳ hoặc tên học kỳ đã tồn tại trong hệ thống';
        } else if (axiosError.response?.status === 400) {
          errorMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin';
        } else if (axiosError.response?.status === 500) {
          errorMessage = 'Thời gian học kỳ bị trùng với học kỳ khác hoặc có lỗi hệ thống. Vui lòng kiểm tra lại';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      code: '',
      name: '',
      startDate: '',
      endDate: '',
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thêm học kỳ</h2>
          <button
            onClick={handleCancel}
            className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Mã học kỳ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1.5 ml-1">
              Mã học kỳ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="Ví dụ: SP26, FA26"
              className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white uppercase font-bold"
              disabled={loading}
            />
          </div>

          {/* Tên học kỳ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1.5 ml-1">
              Tên học kỳ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên học kỳ"
              className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white font-bold"
              disabled={loading}
            />
          </div>

          {/* Ngày bắt đầu & Ngày kết thúc */}
          <div className="grid grid-cols-2 gap-4">
            <ModalDatePicker
              label="Ngày bắt đầu *"
              value={formData.startDate}
              onChange={(value) => setFormData({ ...formData, startDate: value })}
              disabled={loading}
            />

            <ModalDatePicker
              label="Ngày kết thúc *"
              value={formData.endDate}
              onChange={(value) => setFormData({ ...formData, endDate: value })}
              disabled={loading}
            />
          </div>

          {/* Status Note */}
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl px-4 py-3 shadow-inner">
            <p className="text-[11px] font-bold text-fpt-orange flex items-center gap-2 uppercase tracking-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-fpt-orange" />
              Trạng thái mặc định: Sắp diễn ra
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 h-[44px] flex items-center justify-center gap-2 px-4 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-2xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all font-bold active:scale-95 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-[44px] flex items-center justify-center gap-2 px-4 bg-fpt-orange text-white rounded-2xl hover:bg-orange-600 transition-all font-bold shadow-lg shadow-fpt-orange/20 active:scale-95 disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Đang lưu...' : 'Thêm học kỳ'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

