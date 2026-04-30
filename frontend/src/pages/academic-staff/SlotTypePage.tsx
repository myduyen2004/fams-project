import React, { useState, useEffect, useRef } from 'react';
import { Settings, Calendar, Plus, Trash2, Clock, Check, AlertCircle, ChevronRight, AlertTriangle, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { useParams } from 'react-router-dom';
import { useRoleAwareNavigate } from '../../hooks/useRoleAwareNavigate';
import toast from "@utils/toast";
import apiClient from '../../services/api/authService';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { timetableService } from '../../services/api/timetableService';
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
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
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
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 h-[44px] border-2 rounded-2xl text-sm transition-all outline-none
                    ${disabled ? 'bg-gray-100 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-800 text-gray-500 cursor-not-allowed font-medium' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange hover:border-fpt-orange/40 text-gray-900 dark:text-white'}
                `}
      >
        <span className={value ? 'font-bold' : 'text-gray-400'}>
          {value ? new Date(value).toLocaleDateString('vi-VN') : placeholder}
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

interface SlotTime {
  startTime: string;
  endTime: string;
}

interface Holiday {
  holidayDate: string;
  description: string;
}

interface SemesterConfig {
  semesterName: string;
  startDate: string;
  endDate: string;
  selectedDays: string[];
  maxSlotsPerDay: number;
  slotsPerSubjectPerWeek: number;
  slotType: '90' | '135';
  slots: SlotTime[];
  holidays: Holiday[];
  isPublished: boolean;
  status: 'upcoming' | 'active' | 'ended';
}

const DAYS_OF_WEEK = [
  { id: 'MON', label: 'T2' },
  { id: 'TUE', label: 'T3' },
  { id: 'WED', label: 'T4' },
  { id: 'THU', label: 'T5' },
  { id: 'FRI', label: 'T6' },
  { id: 'SAT', label: 'T7' },
  { id: 'SUN', label: 'CN' },
];

const VIETNAMESE_HOLIDAYS_PRESETS = [
  { name: 'Tết Dương Lịch', month: 1, day: 1, type: 'solar' },
  { name: 'Tết Nguyên Đán (Dự kiến)', month: 2, day: 16, type: 'solar', days: 7 }, // 2026 specific
  { name: 'Giỗ Tổ Hùng Vương', month: 4, day: 26, type: 'solar' }, // 2026 specific
  { name: 'Ngày Giải phóng Miền Nam', month: 4, day: 30, type: 'solar' },
  { name: 'Ngày Quốc tế Lao động', month: 5, day: 1, type: 'solar' },
  { name: 'Ngày Quốc khánh', month: 9, day: 2, type: 'solar', days: 2 },
  { name: 'Ngày Nhà giáo Việt Nam', month: 11, day: 20, type: 'solar' },
];

export const SlotTypePage: React.FC = () => {
  const navigate = useRoleAwareNavigate();
  const { semesterCode } = useParams<{ semesterCode: string }>();

  const [config, setConfig] = useState<SemesterConfig>({
    semesterName: '',
    startDate: '',
    endDate: '',
    selectedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    maxSlotsPerDay: 4,
    slotsPerSubjectPerWeek: 2,
    slotType: '90',
    slots: [
      { startTime: '07:30', endTime: '09:00' },
      { startTime: '09:15', endTime: '10:45' },
      { startTime: '11:00', endTime: '12:30' },
      { startTime: '13:30', endTime: '15:00' },
    ],
    holidays: [],
    isPublished: false,
    status: 'upcoming'
  });

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [isReadOnly, setIsReadOnly] = useState(true);
  const [originalConfig, setOriginalConfig] = useState<SemesterConfig | null>(null);

  const DEFAULT_CONFIG: Omit<SemesterConfig, 'semesterName' | 'startDate' | 'endDate' | 'isPublished'> = {
    selectedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    maxSlotsPerDay: 4,
    slotsPerSubjectPerWeek: 2,
    slotType: '90',
    slots: [
      { startTime: '07:30', endTime: '09:00' },
      { startTime: '09:15', endTime: '10:45' },
      { startTime: '11:00', endTime: '12:30' },
      { startTime: '13:30', endTime: '15:00' },
    ],
    holidays: [],
    status: 'upcoming'
  };

  const addMinutes = (time: string, minutes: number): string => {
    if (!time) return '';
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  useEffect(() => {
    const duration = parseInt(config.slotType);
    const BREAK_DURATION = 15; // 15-minute break between slots

    // Use reduce to properly chain calculations - each slot depends on the NEWLY calculated previous slot
    const updatedSlots = config.slots.reduce<SlotTime[]>((acc, slot, index) => {
      if (index === 0) {
        // Keep first slot's start time, just update end time
        const startTime = slot.startTime || '07:30';
        acc.push({
          startTime,
          endTime: addMinutes(startTime, duration)
        });
      } else {
        // Calculate start time based on the NEWLY calculated previous slot's end time + break
        const prevCalculatedSlot = acc[index - 1];
        const newStartTime = addMinutes(prevCalculatedSlot.endTime, BREAK_DURATION);
        acc.push({
          startTime: newStartTime,
          endTime: addMinutes(newStartTime, duration)
        });
      }
      return acc;
    }, []);

    const hasChanged = updatedSlots.some((slot, i) =>
      slot.startTime !== config.slots[i].startTime || slot.endTime !== config.slots[i].endTime
    );

    if (hasChanged) {
      setConfig(prev => ({ ...prev, slots: updatedSlots }));
    }
  }, [config.slotType]);

  // Fetch semester data
  useEffect(() => {
    if (semesterCode) {
      apiClient.get(`/v1/semesters/get-by-code/${semesterCode}`)
        .then(response => {
          const data = response.data;
          const loadedConfig: SemesterConfig = {
            ...config,
            semesterName: data.name || '',
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            isPublished: data.isPublished || false,
            // Load configuration if exists, with fallbacks to DEFAULT_CONFIG
            selectedDays: data.selectedDays || DEFAULT_CONFIG.selectedDays,
            maxSlotsPerDay: data.maxSlotsPerDay || DEFAULT_CONFIG.maxSlotsPerDay,
            slotsPerSubjectPerWeek: data.slotsPerSubjectPerWeek || DEFAULT_CONFIG.slotsPerSubjectPerWeek,
            slotType: data.slotDuration ? data.slotDuration.toString() : DEFAULT_CONFIG.slotType,
            slots: (data.slots && data.slots.length > 0) ? data.slots : DEFAULT_CONFIG.slots,
            holidays: data.holidays || DEFAULT_CONFIG.holidays,
            status: data.status || 'upcoming'
          };

          setConfig(loadedConfig);
          setOriginalConfig(loadedConfig);

          // If configuration exists (e.g. maxSlotsPerDay is not null), stay in read-only mode
          if (data.maxSlotsPerDay) {
            setIsReadOnly(true);
          } else {
            setIsReadOnly(false); // New semester configuration
          }
        })
        .catch(error => {
          console.error('Error fetching semester:', error);
          toast.error('Không thể tải thông tin học kỳ');
        });
    }
  }, [semesterCode]);

  const handleInputChange = (field: keyof SemesterConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const toggleDay = (dayId: string) => {
    setConfig(prev => {
      const isSelected = prev.selectedDays.includes(dayId);
      const newDays = isSelected
        ? prev.selectedDays.filter(d => d !== dayId)
        : [...prev.selectedDays, dayId];
      return { ...prev, selectedDays: newDays };
    });
  };

  const handleSlotTimeChange = (index: number, value: string) => {
    if (isReadOnly) return;
    const duration = parseInt(config.slotType);
    const updatedSlots = [...config.slots];
    updatedSlots[index] = {
      startTime: value,
      endTime: value ? addMinutes(value, duration) : ''
    };
    setConfig(prev => ({ ...prev, slots: updatedSlots }));
  };

  const addSlot = () => {
    if (isReadOnly) return;
    if (config.slots.length >= 10) {
      toast.error('Tối đa 10 slot');
      return;
    }
    const lastSlot = config.slots[config.slots.length - 1];
    let newStartTime = '07:30';
    if (lastSlot && lastSlot.endTime) {
      newStartTime = addMinutes(lastSlot.endTime, 15);
    }
    const duration = parseInt(config.slotType);
    setConfig(prev => ({
      ...prev,
      slots: [...prev.slots, { startTime: newStartTime, endTime: addMinutes(newStartTime, duration) }]
    }));
  };

  const removeSlot = (index: number) => {
    if (config.slots.length <= 1) return;
    const updatedSlots = config.slots.filter((_, i) => i !== index);
    setConfig(prev => ({ ...prev, slots: updatedSlots }));
  };

  const addHoliday = () => {
    setConfig(prev => ({
      ...prev,
      holidays: [...prev.holidays, { holidayDate: '', description: '' }]
    }));
  };

  const removeHoliday = (index: number) => {
    setConfig(prev => {
      const updatedHolidays = prev.holidays.filter((_, i) => i !== index);
      return { ...prev, holidays: updatedHolidays };
    });
  };

  const handleHolidayChange = (index: number, field: keyof Holiday, value: string) => {
    setConfig(prev => {
      const updatedHolidays = [...prev.holidays];
      updatedHolidays[index] = { ...updatedHolidays[index], [field]: value };
      return { ...prev, holidays: updatedHolidays };
    });
  };

  const handleCancelChanges = () => {
    if (originalConfig) {
      setConfig(originalConfig);
      setIsReadOnly(true);
      toast.success('Đã hủy các thay đổi');
    }
  };

  const handleResetToDefault = () => {
    setConfig(prev => ({
      ...prev,
      ...DEFAULT_CONFIG
    }));
    toast.success('Đã đặt lại về cấu hình mặc định');
  };

  const loadStandardHolidays = () => {
    if (!config.startDate || !config.endDate) {
      toast.error('Vui lòng chờ tải thông tin thời gian kỳ học');
      return;
    }

    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    const year = start.getFullYear();

    const standardHolidays: Holiday[] = [];
    let holidaysInRange = 0;

    VIETNAMESE_HOLIDAYS_PRESETS.forEach(preset => {
      const daysToLoad = preset.days || 1;
      for (let i = 0; i < daysToLoad; i++) {
        const holidayDate = new Date(year, preset.month - 1, preset.day + i);
        if (holidayDate >= start && holidayDate <= end) {
          holidaysInRange++;
          const formattedDate = holidayDate.toISOString().split('T')[0];
          // Avoid duplicates
          if (!config.holidays.some(h => h.holidayDate === formattedDate)) {
            standardHolidays.push({
              holidayDate: formattedDate,
              description: preset.name + (daysToLoad > 1 ? ` (Ngày ${i + 1})` : '')
            });
          }
        }
      }
    });

    if (standardHolidays.length > 0) {
      setConfig(prev => ({
        ...prev,
        holidays: [...prev.holidays, ...standardHolidays]
      }));
      toast.success(`Đã nạp thêm ${standardHolidays.length} ngày lễ chuẩn`);
    } else if (holidaysInRange > 0) {
      toast.success('Tất cả ngày nghỉ lễ chuẩn trong kỳ này đã có trong danh sách');
    } else {
      toast.error('Không tìm thấy ngày lễ chuẩn nào trong khoảng thời gian này');
    }
  };

  const validateSchedule = () => {
    for (let i = 0; i < config.slots.length; i++) {
      const cur = config.slots[i];
      for (let j = i + 1; j < config.slots.length; j++) {
        const next = config.slots[j];
        if (cur.startTime < next.endTime && next.startTime < cur.endTime) return `Trùng lặp: Slot ${i + 1} và Slot ${j + 1}`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validateSchedule();
    if (err) {
      toast.error(err);
      return;
    }
    if (!config.semesterName || config.selectedDays.length === 0) {
      toast.error('Thiếu thông tin bắt buộc');
      return;
    }

    // Validate slots and holidays
    const validSlots = config.slots.filter(s => s.startTime && s.endTime);
    if (validSlots.length === 0) {
      toast.error('Cần ít nhất một khung giờ hoàn chỉnh');
      return;
    }

    // Check if timetable exists to show warning
    try {
      if (semesterCode) {
        const checkResult = await timetableService.checkTimetableExists(semesterCode);
        if (checkResult && checkResult.exists) {
          setIsConfirmModalOpen(true);
          return;
        }
      }
      // If no TKB exists or semesterCode is missing, save directly
      handleConfirmSave();
    } catch (error) {
      console.error('Error checking TKB existence:', error);
      // Fallback to confirmation modal on error to be safe
      setIsConfirmModalOpen(true);
    }
  };

  const handleConfirmSave = async () => {
    setIsConfirmModalOpen(false);
    const validSlots = config.slots.filter(s => s.startTime && s.endTime);
    const validHolidays = config.holidays.filter(h => h.holidayDate);

    const payload = {
      selectedDays: config.selectedDays,
      maxSlotsPerDay: config.maxSlotsPerDay,
      slotsPerSubjectPerWeek: config.slotsPerSubjectPerWeek,
      slotDuration: parseInt(config.slotType),
      isPublished: config.isPublished,
      slots: validSlots,
      holidays: validHolidays
    };

    const toastId = toast.loading('Đang lưu cấu hình...');
    try {
      await apiClient.post(`/v1/semesters/${semesterCode}/config`, payload);
      toast.success('Lưu cấu hình thành công', { id: toastId });

      // Refresh data to get newest state
      const response = await apiClient.get(`/v1/semesters/get-by-code/${semesterCode}`);
      const data = response.data;
      const updatedConfig: SemesterConfig = {
        ...config,
        isPublished: data.isPublished || false,
        selectedDays: data.selectedDays || config.selectedDays,
        maxSlotsPerDay: data.maxSlotsPerDay || config.maxSlotsPerDay,
        slotsPerSubjectPerWeek: data.slotsPerSubjectPerWeek || config.slotsPerSubjectPerWeek,
        slotType: data.slotDuration ? data.slotDuration.toString() : config.slotType,
        slots: data.slots || config.slots,
        holidays: data.holidays || config.holidays,
        status: data.status || 'upcoming'
      };

      setConfig(updatedConfig);
      setOriginalConfig(updatedConfig);
      setIsReadOnly(true);
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      let errorMessage = 'Lỗi không xác định khi lưu cấu hình';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleNavigateClassSection = () => {
    setTimeout(() => {
      navigate(`/academic-staff/semesters/${semesterCode}/class-sections`);
    }, 1000);
  };

  return (
    <AcademicStaffLayout pageTitle="Cấu hình kỳ học">
      <div className="max-w-7xl mx-auto space-y-4 pb-20 pt-2">

        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none uppercase">Cấu hình chi tiết</h1>
              {isReadOnly ? (
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black border border-blue-100 flex items-center gap-1.5 uppercase tracking-widest">
                  <div className="w-1 h-1 rounded-full bg-blue-500" />
                  Chế độ xem
                </span>
              ) : (
                <span className="px-3 py-1 bg-fpt-orange/10 text-fpt-orange rounded-full text-[9px] font-black border border-fpt-orange/20 flex items-center gap-1.5 uppercase tracking-widest animate-pulse">
                  <div className="w-1 h-1 rounded-full bg-fpt-orange" />
                  Đang chỉnh sửa
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleNavigateClassSection}
              className="flex h-[44px] items-center gap-2 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 px-5 text-[10px] font-black text-gray-600 hover:border-fpt-orange hover:text-fpt-orange hover:shadow-lg transition-all active:scale-95 uppercase tracking-widest"
            >
              Quản lý lớp học phần
            </button>
            {isReadOnly ? (
              config.status === 'upcoming' ? (
                <button
                  onClick={() => setIsReadOnly(false)}
                  className="flex h-[44px] items-center gap-2 rounded-2xl bg-blue-600 px-6 text-[10px] font-black text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95 uppercase tracking-widest"
                >
                  <Settings className="w-3.5 h-3.5" /> Chỉnh sửa
                </button>
              ) : (
                <div className="flex h-[44px] items-center gap-3 bg-amber-50 text-amber-700 px-5 rounded-2xl border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest leading-tight">Khóa chỉnh sửa</span>
                </div>
              )
            ) : (
              <>
                <button
                  onClick={handleCancelChanges}
                  className="flex h-[44px] items-center px-5 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-600 text-[10px] font-black hover:bg-gray-200 transition-all active:scale-95 uppercase tracking-widest"
                >
                  Hủy thay đổi
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex h-[44px] items-center gap-2 rounded-2xl bg-fpt-orange px-6 text-[10px] font-black text-white hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 uppercase tracking-widest"
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} /> Lưu cấu hình
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">

          {/* Row 1: Basic Information */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-1.5 rounded-xl bg-fpt-orange/10">
                <Calendar className="w-4 h-4 text-fpt-orange" />
              </div>
              <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Thông tin chung học kỳ</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Tên học kỳ */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Tên học kỳ</label>
                {isReadOnly ? (
                  <div className="w-full h-[48px] bg-gray-50 dark:bg-zinc-800/50 rounded-2xl px-5 flex items-center text-sm font-bold text-gray-900 dark:text-white border-2 border-transparent">{config.semesterName || '--'}</div>
                ) : (
                  <input
                    type="text"
                    placeholder="VD: SPRING 2026"
                    value={config.semesterName}
                    onChange={(e) => handleInputChange('semesterName', e.target.value)}
                    className="w-full h-[48px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl px-5 text-sm font-bold text-gray-900 dark:text-white outline-none hover:border-fpt-orange/40 focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10 transition-all"
                  />
                )}
              </div>

              {/* Thời gian kỳ học */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Thời gian kỳ học</label>
                <div className="grid grid-cols-2 gap-2">
                  {isReadOnly ? (
                    <>
                      <div className="w-full h-[48px] bg-gray-50 dark:bg-zinc-800/50 rounded-2xl px-5 flex items-center text-sm font-bold text-gray-900 dark:text-white border-2 border-transparent">{config.startDate || '--'}</div>
                      <div className="w-full h-[48px] bg-gray-50 dark:bg-zinc-800/50 rounded-2xl px-5 flex items-center text-sm font-bold text-gray-900 dark:text-white border-2 border-transparent">{config.endDate || '--'}</div>
                    </>
                  ) : (
                    <>
                      <ModalDatePicker value={config.startDate} onChange={(value) => handleInputChange('startDate', value)} placeholder="Bắt đầu" />
                      <ModalDatePicker value={config.endDate} onChange={(value) => handleInputChange('endDate', value)} placeholder="Kết thúc" />
                    </>
                  )}
                </div>
              </div>

              {/* Ngày học trong tuần */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Ngày học trong tuần</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day.id}
                      onClick={() => toggleDay(day.id)}
                      disabled={isReadOnly}
                      className={`w-9 h-[44px] rounded-xl text-[10px] font-black transition-all border-2 ${config.selectedDays.includes(day.id)
                        ? 'bg-fpt-orange border-fpt-orange text-white shadow-lg shadow-fpt-orange/20'
                        : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-400 hover:border-fpt-orange/40'
                        } ${isReadOnly ? 'cursor-not-allowed opacity-80 border-transparent' : 'active:scale-90'}`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Row 2: Content & Slots */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Left Sidebar: Training Params */}
            <div className="lg:col-span-4 space-y-4">

              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6 space-y-6 h-full">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-fpt-orange/10">
                      <Clock className="w-4 h-4 text-fpt-orange" />
                    </div>
                    <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Tham số đào tạo</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Thời lượng tiết học</label>
                      <div className="flex bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-2xl border-2 border-gray-100 dark:border-zinc-800">
                        <button onClick={() => handleInputChange('slotType', '90')}
                          disabled={isReadOnly}
                          className={`flex-1 py-2.5 rounded-xl text-[9px] font-black transition-all duration-300 uppercase tracking-widest ${config.slotType === '90' ? 'bg-white dark:bg-zinc-900 text-fpt-orange shadow-sm border border-gray-100 dark:border-zinc-700' : 'text-gray-400 hover:text-gray-600'} ${isReadOnly ? 'cursor-not-allowed' : ''}`}>
                          90 PHÚT
                        </button>
                        <button onClick={() => handleInputChange('slotType', '135')}
                          disabled={isReadOnly}
                          className={`flex-1 py-2.5 rounded-xl text-[9px] font-black transition-all duration-300 uppercase tracking-widest ${config.slotType === '135' ? 'bg-white dark:bg-zinc-900 text-fpt-orange shadow-sm border border-gray-100 dark:border-zinc-700' : 'text-gray-400 hover:text-gray-600'} ${isReadOnly ? 'cursor-not-allowed' : ''}`}>
                          135 PHÚT
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Số Slot tối đa / Ngày</label>
                        {isReadOnly ? (
                          <div className="flex h-[44px] items-center bg-gray-50 dark:bg-zinc-800/50 rounded-2xl px-5 text-sm font-bold text-gray-900 dark:text-white border-2 border-transparent">
                            <Settings className="w-3.5 h-3.5 text-gray-400 mr-3" />
                            <span>{config.maxSlotsPerDay}</span>
                          </div>
                        ) : (
                          <div className="flex h-[44px] items-center bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden px-5 transition-all hover:border-fpt-orange/40 focus-within:border-fpt-orange focus-within:ring-4 focus-within:ring-fpt-orange/10">
                            <Settings className="w-3.5 h-3.5 text-gray-400 mr-2" />
                            <input
                              type="number"
                              value={config.maxSlotsPerDay}
                              onChange={(e) => handleInputChange('maxSlotsPerDay', parseInt(e.target.value))}
                              className="w-full bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none border-none focus:ring-0"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest ml-1">Số Slot / Môn / Tuần</label>
                        {isReadOnly ? (
                          <div className="flex h-[44px] items-center bg-gray-50 dark:bg-zinc-800/50 rounded-2xl px-5 text-sm font-bold text-gray-900 dark:text-white border-2 border-transparent">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 mr-3" />
                            <span>{config.slotsPerSubjectPerWeek}</span>
                          </div>
                        ) : (
                          <div className="flex h-[44px] items-center bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden px-5 transition-all hover:border-fpt-orange/40 focus-within:border-fpt-orange focus-within:ring-4 focus-within:ring-fpt-orange/10">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 mr-2" />
                            <input
                              type="number"
                              value={config.slotsPerSubjectPerWeek}
                              onChange={(e) => handleInputChange('slotsPerSubjectPerWeek', parseInt(e.target.value))}
                              className="w-full bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none border-none focus:ring-0"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-fpt-orange/5 border border-fpt-orange/10 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-fpt-orange shrink-0 mt-0.5" />
                  <p className="text-[10px] text-orange-900 dark:text-orange-200 leading-relaxed font-bold uppercase tracking-tight">
                    Khi thay đổi LOẠI TIẾT HỌC, toàn bộ GIỜ KẾ THÚC sẽ được tự động tính toán lại.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Slots List */}
            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl flex flex-col h-full overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between bg-gray-50/30 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-fpt-orange/10">
                      <Clock className="w-4 h-4 text-fpt-orange" />
                    </div>
                    <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Khung giờ học (Slots)</h2>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                        <th className="px-4 py-5 text-left w-24 text-xs font-bold uppercase tracking-widest whitespace-nowrap">STT</th>
                        <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Giờ bắt đầu</th>
                        <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Giờ kết thúc (Auto)</th>
                        <th className="px-6 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                      {config.slots.map((slot, index) => (
                        <tr key={index} className="group hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-all duration-200">
                          <td className="px-6 py-3">
                            <span className="text-[10px] font-black text-gray-400 group-hover:text-fpt-orange uppercase tracking-widest transition-colors whitespace-nowrap">Slot {index + 1}</span>
                          </td>
                          <td className="px-6 py-3">
                            {isReadOnly ? (
                              <span className="text-sm font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-transparent">{slot.startTime || '--:--'}</span>
                            ) : (
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => handleSlotTimeChange(index, e.target.value)}
                                className="w-28 h-[40px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl px-3 text-sm font-black text-gray-900 dark:text-white outline-none shadow-sm transition-all hover:border-fpt-orange/40 focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10"
                              />
                            )}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              {isReadOnly ? (
                                <span className="text-sm font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-transparent">{slot.endTime || '--:--'}</span>
                              ) : (
                                <input
                                  type="time"
                                  value={slot.endTime || ''}
                                  disabled
                                  className="w-28 h-[40px] bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent rounded-2xl px-3 text-sm font-black text-gray-400 outline-none cursor-not-allowed"
                                />
                              )}
                              {!isReadOnly && <Check className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            {!isReadOnly && (
                              <button onClick={() => removeSlot(index)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90" title="Xóa slot">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!isReadOnly && (
                  <div className="p-6 bg-gray-50/30 dark:bg-zinc-900/50 border-t border-gray-50 dark:border-zinc-800">
                    <button onClick={addSlot} className="w-full h-[44px] border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center gap-3 text-gray-400 hover:text-fpt-orange hover:border-fpt-orange hover:bg-white dark:hover:bg-zinc-900 transition-all font-black text-[10px] uppercase tracking-widest active:scale-[0.98]">
                      <Plus className="w-4 h-4" strokeWidth={3} /> Thêm tiết học mới
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Row 3: Holiday Selection */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-50 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/30 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-fpt-orange/10">
                <Calendar className="w-4 h-4 text-fpt-orange" />
              </div>
              <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Kế hoạch nghỉ lễ</h2>
            </div>
            {!isReadOnly && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleResetToDefault}
                  className="h-[38px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-[9px] font-black text-gray-500 hover:border-gray-300 dark:hover:border-zinc-700 transition-all uppercase tracking-widest active:scale-95"
                >
                  Đặt lại mặc định
                </button>
                <button
                  onClick={loadStandardHolidays}
                  className="h-[38px] flex items-center gap-2 px-4 bg-red-50 text-red-600 rounded-2xl text-[9px] font-black border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm uppercase tracking-widest active:scale-95"
                >
                  <Calendar className="w-3.5 h-3.5" /> Nạp ngày lễ VN
                </button>
                <button
                  onClick={addHoliday}
                  className="h-[38px] flex items-center gap-2 px-4 bg-fpt-orange text-white rounded-2xl text-[9px] font-black hover:bg-orange-600 transition-all uppercase tracking-widest active:scale-95 shadow-lg shadow-fpt-orange/20"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Thêm ngày nghỉ
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto max-h-[500px] custom-scrollbar">
            {config.holidays.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gray-50 dark:bg-zinc-800 text-gray-400">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest mb-1">Chưa có dữ liệu</h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Thiết lập kế hoạch nghỉ lễ cho học kỳ</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                    <th className="px-4 py-5 text-left w-24 text-xs font-bold uppercase tracking-widest whitespace-nowrap">STT</th>
                    <th className="px-4 py-5 text-left w-64 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Ngày nghỉ</th>
                    <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Lý do / Mô tả</th>
                    <th className="px-4 py-5 text-right w-24 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                  {config.holidays.map((holiday, index) => (
                    <tr key={index} className="group hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-all duration-200">
                      <td className="px-6 py-3">
                        <span className="text-[10px] font-black text-gray-400 group-hover:text-fpt-orange transition-colors uppercase tracking-widest whitespace-nowrap">#{index + 1}</span>
                      </td>
                      <td className="px-6 py-3">
                        {isReadOnly ? (
                          <span className="text-xs font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-transparent block w-fit">{holiday.holidayDate || '--'}</span>
                        ) : (
                          <ModalDatePicker value={holiday.holidayDate} onChange={(value) => handleHolidayChange(index, 'holidayDate', value)} placeholder="Chọn ngày" />
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {isReadOnly ? (
                          <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 leading-relaxed">{holiday.description || 'Chưa có mô tả'}</span>
                        ) : (
                          <input
                            type="text"
                            placeholder="Mô tả..."
                            value={holiday.description}
                            onChange={(e) => handleHolidayChange(index, 'description', e.target.value)}
                            className="h-[44px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl px-4 text-sm font-bold text-gray-900 dark:text-white outline-none transition-all shadow-sm w-full hover:border-fpt-orange/40 focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10 placeholder:text-gray-400"
                          />
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {!isReadOnly && (
                          <button
                            onClick={() => removeHoliday(index)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-6 shadow-xl gap-4">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <Check className="w-5 h-5 text-emerald-500" strokeWidth={3} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Hệ thống</p>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Dữ liệu sẵn sàng</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isReadOnly && (
              <button
                onClick={handleSubmit}
                className="h-[48px] px-8 bg-fpt-orange text-white rounded-2xl font-black text-[10px] hover:bg-orange-600 shadow-2xl shadow-fpt-orange/30 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2"
              >
                <Check className="w-4 h-4" strokeWidth={3} /> Hoàn tất lưu
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSave}
        title="Xác nhận thay đổi cấu hình"
        message="Học kỳ này đã có thời khóa biểu được tạo. Nếu bạn thay đổi cấu hình Slot hoặc Ngày học, dữ liệu thời khóa biểu hiện tại có thể bị ảnh hưởng hoặc cần được tính toán lại. Bạn có chắc chắn muốn lưu không?"
        type="warning"
        confirmLabel="Vẫn lưu cấu hình"
        cancelLabel="Kiểm tra lại"
      />
    </AcademicStaffLayout>
  );
};


