import React, { useEffect, useState, useRef, useMemo, useLayoutEffect } from 'react';
import { useRoleAwareNavigate } from '../../hooks/useRoleAwareNavigate';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import axios from 'axios';
import apiClient from '../../services/api/authService';
import { timetableService, TimetableSlotDTO } from '../../services/api/timetableService';
import toast from "@utils/toast";
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, MapPin, AlertTriangle, Check, Eye, EyeOff, Loader2, Play, Users, Download, MoreVertical, Home, RefreshCw, Save, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CustomSelect } from '../../components/common/CustomSelect';
import { CustomDatePicker } from '../../components/common/CustomDatePicker';
import { CustomMultiSelect } from '../../components/common/CustomMultiSelect';
// --- Premium Select for Filters ---
interface FilterSelectProps {
  label: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: any) => void;
  placeholder?: string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, options, onChange, placeholder = 'Chọn...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' });
  const selectedOption = options.find(opt => String(opt.value) === String(value) && opt.value !== '');

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        width: Math.max(rect.width, 200),
        zIndex: 9999,
        opacity: 1,
        pointerEvents: 'auto'
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => { if (isOpen) updatePosition(); };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 ml-1">{label}</label>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex h-[52px] items-center justify-between w-full rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-left focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5"
      >
        <span className={`text-sm font-semibold truncate ${selectedOption ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-2xl py-2 max-h-60 overflow-y-auto scroller">
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/10 ${String(value) === String(opt.value) && opt.value !== ''
                ? 'text-fpt-orange font-bold bg-orange-50/50 dark:bg-orange-900/5'
                : 'text-gray-700 dark:text-gray-300'
                }`}
            >
              <span>{opt.label}</span>
              {String(value) === String(opt.value) && opt.value !== '' && <Check size={15} className="text-fpt-orange shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

// --- Premium Date Picker for Filters ---
interface FilterDatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}

const FilterDatePicker: React.FC<FilterDatePickerProps> = ({ label, value, onChange, min, max }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [viewDate, setViewDate] = useState(value ? new Date(value + 'T00:00:00') : new Date());
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({ opacity: 0, pointerEvents: 'none' });

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        width: 280,
        zIndex: 9999,
        opacity: 1,
        pointerEvents: 'auto'
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => { if (isOpen) updatePosition(); };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateSelect = (day: number) => {
    const y = viewDate.getFullYear();
    const m = String(viewDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    if (min && dateStr < min) return;
    if (max && dateStr > max) return;
    onChange(dateStr);
    setIsOpen(false);
  };

  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1));

  const renderCalendar = () => {
    const days: React.ReactNode[] = [];
    const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const startDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`e-${i}`} className="h-9 w-9" />);
    }
    for (let d = 1; d <= totalDays; d++) {
      const y = viewDate.getFullYear();
      const m = String(viewDate.getMonth() + 1).padStart(2, '0');
      const dateStr = `${y}-${m}-${String(d).padStart(2, '0')}`;
      const isSelected = value === dateStr;
      const isOutOfRange = (min && dateStr < min) || (max && dateStr > max);
      days.push(
        <button
          key={d}
          type="button"
          disabled={!!isOutOfRange}
          onClick={() => handleDateSelect(d)}
          className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm transition-all ${isSelected
            ? 'bg-fpt-orange text-white font-bold shadow-lg shadow-fpt-orange/20'
            : isOutOfRange
              ? 'opacity-20 cursor-not-allowed text-gray-300'
              : 'hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-700 dark:text-gray-300'
            }`}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('vi-VN')
    : 'Chọn ngày...';

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 ml-1">{label}</label>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex h-[52px] items-center justify-between w-full rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-left focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5"
      >
        <span className={`text-sm font-semibold ${value ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>
          {displayValue}
        </span>
        <CalendarIcon size={18} className="shrink-0 text-gray-400" />
      </button>

      {isOpen && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-2xl p-4">
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
        </div>,
        document.body
      )}
    </div>
  );
};

// --- Premium Multi-Select for Room Filter ---

interface Semester {
  code: string;
  name: string;
  startDate?: string;
  endDate?: string;
}

interface SlotTime {
  slot: number;
  start: string;
  end: string;
}

// Default slot time ranges (fallback khi chưa có config)
const DEFAULT_SLOT_TIMES: SlotTime[] = [
  { slot: 1, start: '07:00', end: '09:15' },
  { slot: 2, start: '09:30', end: '11:45' },
  { slot: 3, start: '12:30', end: '14:45' },
  { slot: 4, start: '15:00', end: '17:15' },
];

// LocalStorage key for persisting generation job
const GENERATION_JOB_KEY = 'timetable_generation_job';

// Helper function to get start of week (Monday)
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const newDate = new Date(d);
  newDate.setUTCDate(diff);
  return newDate;
};

// Helper function to get end of week (Sunday)
const getWeekEnd = (date: Date): Date => {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return end;
};

const ErrorSuggestionsPanel: React.FC<{ error: string; onClose: () => void }> = ({ error, onClose }) => {
  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mt-4 animate-in slide-in-from-top-4 duration-500 relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors"
      >
        <X size={20} />
      </button>

      <div className="flex items-start gap-3 mb-4">
        <div className="bg-red-500 p-1.5 rounded-lg text-white">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-red-900">Tạo thời khóa biểu thất bại</h3>
          <p className="text-sm text-red-700 font-medium pt-1">Lý do: {error}</p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-red-800 font-semibold uppercase tracking-wider border-b border-red-100 pb-2">Gợi ý cách khắc phục:</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/60 p-4 rounded-xl border border-red-100">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
              <RefreshCw size={16} className="text-fpt-orange" />
              Nới lỏng cấu hình học kỳ
            </h4>
            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
              <li>Tăng <b>Số slot tối đa mỗi ngày</b> cho SV (gợi ý: 3-4 slot).</li>
              <li>Mở rộng ngày học trong tuần (nên bật thêm <b>Thứ 7</b>).</li>
            </ul>
          </div>

          <div className="bg-white/60 p-4 rounded-xl border border-red-100">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Users size={16} className="text-fpt-orange" />
              Kiểm tra dữ liệu đăng ký
            </h4>
            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
              <li>Giảm số môn đăng ký cho SV học quá mức ( &gt; 5 môn).</li>
              <li>Kiểm tra giảng viên có bị phân công quá nhiều lớp không.</li>
            </ul>
          </div>

          <div className="bg-white/60 p-4 rounded-xl border border-red-100">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Home size={16} className="text-fpt-orange" />
              Kiểm tra phòng học
            </h4>
            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
              <li>Đảm bảo danh sách phòng học đầy đủ và ở trạng thái <b>Hoạt động</b>.</li>
              <li>Tăng số lượng phòng nếu số lớp học phần quá lớn.</li>
            </ul>
          </div>

          <div className="bg-white/60 p-4 rounded-xl border border-red-100">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Save size={16} className="text-fpt-orange" />
              Chiến thuật xếp lịch
            </h4>
            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
              <li>Xếp lịch thủ công cho các lớp bị kẹt sau khi chạy tự động.</li>
              <li>Liên hệ Admin để tăng tham số <b>Tiến hóa</b> cho thuật toán.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SchedulePage: React.FC = () => {
  const navigate = useRoleAwareNavigate();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [slotTimes, setSlotTimes] = useState<SlotTime[]>(DEFAULT_SLOT_TIMES);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<TimetableSlotDTO[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const [generationProgress, setGenerationProgress] = useState<number | null>(null);
  const [generationPhase, setGenerationPhase] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showErrorSuggestions, setShowErrorSuggestions] = useState(false);

  // Toggle for showing locked schedule (isPublished)
  const [showLockedSchedule, setShowLockedSchedule] = useState(false);

  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [semesterStartDate, setSemesterStartDate] = useState<string>('');
  const [semesterEndDate, setSemesterEndDate] = useState<string>('');

  // Search terms managed by Combobox components

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Slot detail popup state
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlotDTO | null>(null);

  // Unscheduled class sections count
  const [unscheduledCount, setUnscheduledCount] = useState<number>(0);
  const [unscheduledClassNames, setUnscheduledClassNames] = useState<string[]>([]);

  // Export week loading state
  const [exportingWeek, setExportingWeek] = useState(false);

  // Rescheduling state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState<number | null>(null);
  const [rescheduleRoom, setRescheduleRoom] = useState<number | null>(null);
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [rawAvailability, setRawAvailability] = useState<any>(null);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  const fetchSemesters = async () => {
    try {
      const resp = await apiClient.get('/v1/semesters/active');
      const data = Array.isArray(resp.data) ? resp.data : [];
      setSemesters(data);

      if (data.length > 0 && !selected) {
        // Try to find the current active semester based on today's date
        const todayStr = new Date().toLocaleDateString('en-CA');
        const currentSem = data.find(s =>
          s.startDate && s.endDate && todayStr >= s.startDate && todayStr <= s.endDate
        );

        if (currentSem) {
          setSelected(currentSem.code);
        } else {
          // If no semester covers today, default to the first one (most recent)
          setSelected(data[0].code);
        }
      }
    } catch (err) {
      console.error('Failed to load semesters', err);
      toast.error('Không thể tải danh sách học kỳ');
    }
  };


  const fetchSemesterDetails = async (semesterCode: string) => {
    try {
      const resp = await apiClient.get(`/v1/semesters/get-by-code/${semesterCode}`);
      const semesterData = resp.data;

      // Extract start and end dates from semester
      if (semesterData.startDate) {
        setSemesterStartDate(semesterData.startDate);
      }
      if (semesterData.endDate) {
        setSemesterEndDate(semesterData.endDate);
      }

      // Auto-select today if it falls within the semester, otherwise default to start date
      if (semesterData.startDate) {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const isPastStart = todayStr >= semesterData.startDate;
        const isBeforeEnd = !semesterData.endDate || todayStr <= semesterData.endDate;

        if (isPastStart && isBeforeEnd) {
          setSelectedDate(todayStr);
        } else {
          setSelectedDate(semesterData.startDate);
        }
      }

      // Set published status from semester config
      setShowLockedSchedule(semesterData.isPublished ?? false);

      // Extract slot times from semester configuration
      if (semesterData.slots && Array.isArray(semesterData.slots) && semesterData.slots.length > 0) {
        const apiSlotTimes: SlotTime[] = semesterData.slots.map((slot: { startTime: string; endTime: string }, index: number) => ({
          slot: index + 1,
          start: slot.startTime || '',
          end: slot.endTime || '',
        })).filter((s: SlotTime) => s.start && s.end);

        if (apiSlotTimes.length > 0) {
          setSlotTimes(apiSlotTimes);
        } else {
          setSlotTimes(DEFAULT_SLOT_TIMES);
        }
      } else {
        setSlotTimes(DEFAULT_SLOT_TIMES);
      }
    } catch (err) {
      console.error('Failed to load semester details', err);
      // Fallback to default slot times
      setSlotTimes(DEFAULT_SLOT_TIMES);
    }
  };

  const fetchTimetable = async (semesterCode: string, date?: string) => {
    setLoading(true);
    try {
      let data;
      if (date) {
        // Use faster date-specific API
        data = await timetableService.getTimetableByDate(semesterCode, date);
      } else {
        // Fallback to full semester load
        data = await timetableService.getTimetableBySemester(semesterCode);
      }
      setSlots(data);
    } catch (err) {
      console.error('Failed to load timetable', err);
      if (axios.isAxiosError(err)) {
        console.error('Axios error details:', {
          code: err.code,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          headers: err.response?.headers,
          config: err.config,
        });
        const serverMsg = err.response?.data?.message || err.response?.data?.error || null;
        if (serverMsg) {
          toast.error(`Lỗi server: ${serverMsg}`);
        }
      }
      toast.error('Không thể tải thời khóa biểu');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unscheduled class sections count
  const fetchUnscheduledCount = async (semesterCode: string) => {
    try {
      const data = await timetableService.getUnscheduledCount(semesterCode);
      setUnscheduledCount(data.unscheduledCount);
      setUnscheduledClassNames(data.unscheduledClassNames || []);
    } catch (err) {
      console.error('Failed to fetch unscheduled count', err);
      setUnscheduledCount(0);
      setUnscheduledClassNames([]);
    }
  };

  // Helper function to start polling for job status
  const startPolling = (jobId: string) => {
    pollingRef.current = window.setInterval(async () => {
      try {
        const statusResp = await timetableService.getGenerationStatus(jobId);
        const status = statusResp?.status || statusResp?.state || statusResp?.jobStatus || null;
        setGenerationStatus(status);

        // Extract progress information
        const progressVal = statusResp?.percentComplete ?? statusResp?.progress ?? statusResp?.percent ?? null;
        if (progressVal != null) setGenerationProgress(Number(progressVal));

        // Extract additional info
        if (statusResp?.phase) setGenerationPhase(statusResp.phase);

        if (status === 'COMPLETED' || status === 'FINISHED' || status === 'SUCCESS') {
          if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
          setGenerating(false);
          setGenerationJobId(null);
          localStorage.removeItem(GENERATION_JOB_KEY);
          toast.success('Tạo thời khóa biểu hoàn tất');
          if (selected && selectedDate) {
            fetchTimetable(selected, selectedDate);
            fetchUnscheduledCount(selected);
          }
        } else if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED') {
          if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
          setGenerating(false);
          setGenerationJobId(null);
          localStorage.removeItem(GENERATION_JOB_KEY);

          const reason = statusResp?.errorMessage || statusResp?.message;
          setGenerationError(reason || 'Lỗi không xác định');
          setShowErrorSuggestions(true);
          toast.error(reason ? `Tạo thời khóa biểu thất bại: ${reason}` : 'Tạo thời khóa biểu thất bại');
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2000);
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (selected) {
      fetchSemesterDetails(selected);
      fetchUnscheduledCount(selected);
    }
  }, [selected]);

  // Fetch timetable when selectedDate changes
  useEffect(() => {
    if (selected && selectedDate) {
      fetchTimetable(selected, selectedDate);
    }
  }, [selected, selectedDate]);

  // Fetch availability when rescheduling date changes
  useEffect(() => {
    if (isRescheduling && rescheduleDate && selected) {
      const fetchAvailability = async () => {
        try {
          const data = await timetableService.getAvailability(rescheduleDate, selected);
          setRawAvailability(data);
          setAvailableSlots(data.availableSlots);
          // Initial room list if slot already selected
          if (rescheduleSlot) {
            const occupiedIds = data.occupiedRoomIdsBySlot[rescheduleSlot] || [];
            setAvailableRooms(data.allRooms.filter((r: any) => !occupiedIds.includes(r.id)));
          } else {
            setAvailableRooms([]);
          }
        } catch (err) {
          console.error('Failed to fetch availability', err);
          toast.error('Không thể tải thông tin phòng trống');
        }
      };
      fetchAvailability();
    }
  }, [isRescheduling, rescheduleDate, selected]);

  // Update available rooms when rescheduleSlot changes
  useEffect(() => {
    if (rawAvailability && rescheduleSlot) {
      const occupiedIds = rawAvailability.occupiedRoomIdsBySlot[rescheduleSlot] || [];
      setAvailableRooms(rawAvailability.allRooms.filter((r: any) => !occupiedIds.includes(r.id)));
    } else {
      setAvailableRooms([]);
    }
  }, [rescheduleSlot, rawAvailability]);

  // Reset rescheduling state when modal closes
  useEffect(() => {
    if (!selectedSlot) {
      setIsRescheduling(false);
      setRescheduleDate('');
      setRescheduleSlot(null);
      setRescheduleRoom(null);
      setRawAvailability(null);
    }
  }, [selectedSlot]);

  // Restore generation job from localStorage on mount
  useEffect(() => {
    const savedJob = localStorage.getItem(GENERATION_JOB_KEY);
    if (savedJob) {
      try {
        const { jobId, semesterCode, timestamp } = JSON.parse(savedJob);
        // Check if job is not too old (< 1 hour)
        if (Date.now() - timestamp < 3600000) {
          setGenerationJobId(jobId);
          setGenerating(true);
          setSelected(semesterCode);
          startPolling(jobId);
        } else {
          localStorage.removeItem(GENERATION_JOB_KEY);
        }
      } catch (err) {
        console.error('Failed to restore generation job', err);
        localStorage.removeItem(GENERATION_JOB_KEY);
      }
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // Main generation start function
  const startGeneration = async () => {
    if (!selected) return toast.error('Vui lòng chọn học kỳ');
    try {
      setGenerating(true);
      setGenerationProgress(0);
      setGenerationPhase(null);
      setGenerationStatus('RUNNING');
      setGenerationError(null);
      setShowErrorSuggestions(false);

      const resp = await timetableService.startAsyncGeneration(selected);
      const jobId = resp?.jobId || resp?.id || resp?.data?.jobId || null;
      setGenerationJobId(jobId);
      toast.success(resp?.message || 'Đã bắt đầu tạo thời khóa biểu');

      if (jobId) {
        // Save to localStorage for persistence
        localStorage.setItem(GENERATION_JOB_KEY, JSON.stringify({
          jobId,
          semesterCode: selected,
          timestamp: Date.now()
        }));
        startPolling(jobId);
      }
    } catch (err) {
      console.error('Generation failed', err);
      setGenerating(false);
      toast.error('Không thể bắt đầu tạo thời khóa biểu');
    }
  };

  // Check if timetable exists before generating
  const handleGenerate = async () => {
    if (!selected) return toast.error('Vui lòng chọn học kỳ');

    try {
      // Check if timetable already exists
      const existsCheck = await timetableService.checkTimetableExists(selected);
      if (existsCheck.exists) {
        setShowConfirmDialog(true);
        return;
      }

      // No existing timetable, proceed directly
      startGeneration();
    } catch (err) {
      console.error('Failed to check timetable existence', err);
      // If check fails, proceed anyway
      startGeneration();
    }
  };

  const handleCancel = async () => {
    if (!generationJobId) return toast.error('Không tìm thấy job đang chạy');
    try {
      await timetableService.cancelGeneration(generationJobId);
      if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
      setGenerating(false);
      setGenerationJobId(null);
      setGenerationStatus('CANCELLED');
      setGenerationProgress(null);
      localStorage.removeItem(GENERATION_JOB_KEY);
      toast.success('Đã hủy quá trình tạo thời khóa biểu');
    } catch (err) {
      console.error('Cancel failed', err);
      toast.error('Không thể hủy job');
    }
  };

  // Helper functions for date navigation
  const handlePreviousDay = () => {
    if (!selectedDate) return;
    const current = new Date(selectedDate);
    current.setUTCDate(current.getUTCDate() - 1);
    const newDate = current.toISOString().split('T')[0];
    if (!semesterStartDate || newDate >= semesterStartDate) {
      setSelectedDate(newDate);
    }
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const current = new Date(selectedDate);
    current.setUTCDate(current.getUTCDate() + 1);
    const newDate = current.toISOString().split('T')[0];
    if (!semesterEndDate || newDate <= semesterEndDate) {
      setSelectedDate(newDate);
    }
  };

  // Handle toggle publish status
  const handleTogglePublished = async () => {
    if (!selected) return;
    const newValue = !showLockedSchedule;
    try {
      await apiClient.patch(`/v1/semesters/${selected}/publish`, { isPublished: newValue });
      setShowLockedSchedule(newValue);
      toast.success(newValue ? 'Đã công khai thời khóa biểu cho sinh viên' : 'Đã ẩn thời khóa biểu');
    } catch (err) {
      console.error('Failed to toggle publish status', err);
      toast.error('Không thể cập nhật trạng thái hiển thị');
    }
  };

  // Export timetable to Excel - export by week with one sheet per day
  const handleExportExcel = async () => {
    if (!selected || !selectedDate) {
      toast.error('Vui lòng chọn học kỳ và ngày');
      return;
    }

    setExportingWeek(true);
    try {
      // Calculate week range
      const currentDate = new Date(selectedDate);
      const weekStart = getWeekStart(currentDate);
      const weekEnd = getWeekEnd(currentDate);

      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];

      // Fetch all slots for the week
      const weekData = await timetableService.getTimetableByWeek(selected, startStr, endStr);

      if (weekData.length === 0) {
        toast.error('Không có dữ liệu để xuất trong tuần này');
        setExportingWeek(false);
        return;
      }

      const workbook = XLSX.utils.book_new();
      const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

      // Iterate through 7 days of the week
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart);
        dayDate.setUTCDate(weekStart.getUTCDate() + i);
        const dateStr = dayDate.toISOString().split('T')[0];
        const dayOfWeekIndex = dayDate.getUTCDay();
        const dayName = dayNames[dayOfWeekIndex];

        // Format date for sheet name (e.g., "Thứ 2 (27-01)")
        // Using replace for date format dd-MM
        const sheetDateStr = dateStr.split('-').slice(1).reverse().join('-');
        // Sheet name max length is 31, ensure we fit. Example: "Thứ 2 (27-01)"
        const sheetName = `${dayName} (${sheetDateStr})`;

        // Filter data for this day
        const daySlots = weekData.filter(s => s.date === dateStr);

        // Sort by slot number
        daySlots.sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0));

        // Prepare data rows
        const exportData = daySlots.map(slot => ({
          'Tiết': slot.slotNumber || '',
          'Giờ bắt đầu': slot.startTime || '',
          'Giờ kết thúc': slot.endTime || '',
          'Mã lớp': slot.className || '',
          'Mã môn': slot.courseCode || '',
          'Tên môn': slot.courseName || '',
          'Giảng viên': slot.lecturerName || '',
          'Phòng': slot.roomCode || slot.roomName || '',
          // 'Trạng thái': slot.status || '' 
        }));

        // If no data for this day, create a placeholder row or just empty
        if (exportData.length === 0) {
          // Optional: Add a message row or leave empty
          // exportData.push({ 'Tiết': 'Không có lịch học' } as any);
        }

        const worksheet = XLSX.utils.json_to_sheet(exportData.length > 0 ? exportData : [{ 'Thông báo': 'Không có lịch học' }]);

        // Auto-size columns if there is data
        if (exportData.length > 0) {
          const maxWidth = 30;
          const colWidths = Object.keys(exportData[0] || {}).map(key => ({
            wch: Math.min(maxWidth, Math.max(key.length,
              ...exportData.map(row => String(row[key as keyof typeof row] || '').length)
            ))
          }));
          worksheet['!cols'] = colWidths;
        } else {
          worksheet['!cols'] = [{ wch: 30 }];
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }

      // Generate filename with semester and week range
      const selectedSemester = semesters.find(s => s.code === selected);
      const semesterName = selectedSemester?.name || selected || 'timetable';
      const filename = `ThoiKhoaBieu_${semesterName}_Tuan_${startStr}_${endStr}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);
      toast.success(`Đã xuất file ${filename}`);
    } catch (err) {
      console.error('Export failed', err);
      toast.error('Không thể xuất file Excel');
    } finally {
      setExportingWeek(false);
    }
  };

  // Get unique values for filters - considering selected class filter
  const uniqueClasses = useMemo(() => {
    const classes = Array.from(new Set(slots.map(s => s.className).filter(Boolean)));
    // Extract class prefix (first part before hyphen)
    const classMap = new Map<string, string>();
    classes.forEach(c => {
      if (c) {
        const prefix = c.split('-')[0];
        classMap.set(prefix, c);
      }
    });
    return Array.from(classMap.entries()).map(([prefix, fullName]) => ({
      prefix,
      fullName
    }));
  }, [slots]);

  // Filter teachers and courses based on selected class
  const uniqueTeachers = useMemo(() => {
    let filteredSlots = slots;
    if (selectedClass) {
      filteredSlots = slots.filter(s => s.className?.startsWith(selectedClass.split('-')[0]));
    }
    return Array.from(new Set(filteredSlots.map(s => s.lecturerName).filter(Boolean)));
  }, [slots, selectedClass]);

  const uniqueCourses = useMemo(() => {
    let filteredSlots = slots;
    if (selectedClass) {
      filteredSlots = slots.filter(s => s.className?.startsWith(selectedClass.split('-')[0]));
    }
    return Array.from(new Set(filteredSlots.map(s => s.courseCode || s.courseName).filter(Boolean)));
  }, [slots, selectedClass]);

  // Filters logic handled by Combobox components

  // Filter slots based on selected filters
  const filteredSlots = useMemo(() => {
    return slots.filter(slot => {
      if (selectedClass && !slot.className?.startsWith(selectedClass.split('-')[0])) return false;
      if (selectedTeacher && slot.lecturerName !== selectedTeacher) return false;
      if (selectedCourse && (slot.courseCode !== selectedCourse && slot.courseName !== selectedCourse)) return false;
      if (selectedDate && slot.date !== selectedDate) return false;
      if (selectedRooms.length > 0) {
        const slotRoom = slot.roomCode || slot.roomName || 'Phòng';
        if (!selectedRooms.includes(slotRoom)) return false;
      }
      return true;
    });
  }, [slots, selectedClass, selectedTeacher, selectedCourse, selectedDate, selectedRooms]);

  // All rooms that have at least one slot in the current list (used for the dropdown)
  const displayRooms = useMemo(() => {
    return Array.from(new Set(slots.map(s => s.roomCode || s.roomName || 'Phòng')))
      .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [slots]);

  // Rooms matching the current filters to be displayed in the table
  const filteredDisplayRooms = useMemo(() => {
    // Only show rooms that actually have at least one slot matching ALL active filters
    return Array.from(new Set(filteredSlots.map(s => s.roomCode || s.roomName || 'Phòng')))
      .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  }, [filteredSlots]);

  // Calculate rooms in use for the selected date
  const roomsInUseCount = useMemo(() => {
    return new Set(slots.map(s => s.roomCode || s.roomName || 'Phòng')).size;
  }, [slots]);

  const getCell = (room: string, slotNum: number) => {
    return filteredSlots.find(s =>
      (s.roomCode || s.roomName || 'Phòng') === room &&
      (s.slotNumber || 0) === slotNum
    );
  };

  // Reset dependent filters when class is selected
  useEffect(() => {
    if (selectedClass) {
      setSelectedTeacher(null);
      setSelectedCourse(null);
    }
  }, [selectedClass]);

  return (
    <AcademicStaffLayout pageTitle="Thời khóa biểu">
      <div className="space-y-4">
        {/* Primary Filter Bar */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap items-center gap-6">
              {/* Semester Selector */}
              <div className="flex flex-wrap items-center gap-6">
                {/* Semester Selector */}
                <div className="w-full sm:w-56 flex flex-col">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 ml-1">Học kỳ</label>
                  <CustomSelect
                    value={selected ?? ''}
                    onChange={(value) => setSelected(value)}
                    options={[
                      { value: '', label: 'Chọn học kỳ' },
                      ...semesters.map(s => ({ value: s.code, label: s.name || s.code }))
                    ]}
                    placeholder="Chọn học kỳ..."
                  />
                </div>

                {/* Date Selector with Arrow Navigation */}
                <div className="flex flex-col">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 ml-1">Ngày học</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handlePreviousDay}
                      disabled={!selectedDate || (!!semesterStartDate && selectedDate <= semesterStartDate)}
                      className="h-[52px] w-[52px] flex items-center justify-center rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-fpt-orange hover:border-fpt-orange/40 hover:shadow-lg transition-all active:scale-95 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Ngày trước"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <div className="w-full">
                      <CustomDatePicker
                        value={selectedDate}
                        onChange={(value) => setSelectedDate(value)}
                        min={semesterStartDate || undefined}
                        max={semesterEndDate || undefined}
                      />
                    </div>

                    <button
                      onClick={handleNextDay}
                      disabled={!selectedDate || (!!semesterEndDate && selectedDate >= semesterEndDate)}
                      className="h-[52px] w-[52px] flex items-center justify-center rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-fpt-orange hover:border-fpt-orange/40 hover:shadow-lg transition-all active:scale-95 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Ngày sau"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Toggle - Công khai cho sinh viên */}
              <div className="flex items-center gap-4 px-6 h-[52px] border-2 border-gray-100 dark:border-zinc-800 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/30">
                <div className="flex items-center gap-3">
                  {showLockedSchedule ? (
                    <Eye size={18} className="text-green-600" />
                  ) : (
                    <EyeOff size={18} className="text-gray-400" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Công khai cho SV</span>
                </div>
                <button
                  onClick={handleTogglePublished}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${showLockedSchedule ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${showLockedSchedule ? 'translate-x-6' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex h-[52px] items-center gap-2 bg-fpt-orange hover:bg-orange-600 text-white px-8 rounded-2xl font-bold transition-all shadow-lg shadow-fpt-orange/20 active:scale-95 disabled:opacity-60 disabled:scale-100"
              >
                {generating ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Play size={20} fill="currentColor" />
                )}
                <span>{generating ? 'Đang tạo...' : 'Tạo tự động'}</span>
              </button>

              {generating && (
                <button
                  onClick={handleCancel}
                  className="flex h-[52px] px-6 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all text-gray-600"
                >
                  Hủy
                </button>
              )}
            </div>
          </div>

          {/* Secondary Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
            {/* Class Filter */}
            <CustomSelect
              label="Lớp học"
              value={selectedClass || ''}
              onChange={(val) => setSelectedClass(val || null)}
              options={(() => {
                const baseOptions = uniqueClasses.map(c => ({ value: c.prefix, label: c.prefix })).filter(o => o.label);
                if (selectedClass && !baseOptions.some(o => o.value === selectedClass)) {
                  return [...baseOptions, { value: selectedClass, label: selectedClass }];
                }
                return baseOptions;
              })()}
              placeholder="Tìm lớp..."
              isSearchable={true}
            />

            {/* Teacher Filter */}
            <CustomSelect
              label="Giảng viên"
              value={selectedTeacher || ''}
              onChange={(val) => setSelectedTeacher(val || null)}
              options={(() => {
                const baseOptions = uniqueTeachers.map(t => ({ value: t!, label: t! })).filter(o => o.label);
                if (selectedTeacher && !baseOptions.some(o => o.value === selectedTeacher)) {
                  return [...baseOptions, { value: selectedTeacher, label: selectedTeacher }];
                }
                return baseOptions;
              })()}
              placeholder="Tìm giảng viên..."
              isSearchable={true}
            />

            {/* Course Filter */}
            <CustomSelect
              label="Môn học"
              value={selectedCourse || ''}
              onChange={(val) => setSelectedCourse(val || null)}
              options={(() => {
                const baseOptions = uniqueCourses.map(c => ({ value: c!, label: c! })).filter(o => o.label);
                if (selectedCourse && !baseOptions.some(o => o.value === selectedCourse)) {
                  return [...baseOptions, { value: selectedCourse, label: selectedCourse }];
                }
                return baseOptions;
              })()}
              placeholder="Tìm môn học..."
              isSearchable={true}
            />

            <CustomMultiSelect
              label="Phòng học"
              value={selectedRooms}
              onChange={setSelectedRooms}
              options={displayRooms.map(r => ({ value: r, label: r }))}
              placeholder="Chọn phòng..."
              icon={Home}
            />
          </div>

          <div className="flex items-center gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
            {/* Actions */}
            <div className="flex items-center gap-4 ml-auto">
              {/* Clear filters button */}
              {(selectedClass || selectedTeacher || selectedCourse || selectedRooms.length > 0) && (
                <button
                  onClick={() => {
                    setSelectedClass(null);
                    setSelectedTeacher(null);
                    setSelectedCourse(null);
                    setSelectedRooms([]);
                  }}
                  className="h-[52px] px-6 text-sm font-bold text-fpt-orange hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-2xl transition-all"
                >
                  Xóa bộ lọc
                </button>
              )}

              {/* Export Excel Button */}
              <button
                onClick={handleExportExcel}
                disabled={exportingWeek || !selected || !selectedDate}
                className="flex h-[52px] items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white px-6 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-green-600/10 active:scale-95 disabled:scale-100"
              >
                {exportingWeek ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progress tracking when generating */}
        {generating && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-fpt-orange animate-spin" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Đang tạo thời khóa biểu</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {generationPhase || generationStatus || 'Đang xử lý...'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-fpt-orange">
                  {generationProgress != null ? `${Math.round(generationProgress)}%` : '0%'}
                </div>
                <div className="text-xs text-gray-500">Hoàn thành</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-fpt-orange to-orange-500 transition-all duration-500 ease-out"
                style={{ width: `${generationProgress ?? 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Suggestions */}
        {showErrorSuggestions && generationError && (
          <ErrorSuggestionsPanel
            error={generationError}
            onClose={() => setShowErrorSuggestions(false)}
          />
        )}

        {/* Warning banner for unscheduled class sections */}
        {unscheduledCount > 0 && !generating && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Hiện tại có <span className="font-bold">{unscheduledCount}</span> lớp học phần chưa được xếp lịch học.
              </p>
              {unscheduledClassNames.length > 0 && unscheduledClassNames.length <= 5 && (
                <p className="text-xs text-amber-600 mt-1">
                  {unscheduledClassNames.join(', ')}
                </p>
              )}
            </div>
            <button
              onClick={handleGenerate}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Tạo lịch mới
            </button>
          </div>
        )}

        {/* Timetable Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-fpt-orange animate-spin" />
            <span className="ml-3 text-gray-600">Đang tải thời khóa biểu...</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Date Header */}
            {selectedDate && (
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-fpt-orange/5 to-transparent flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  {new Date(selectedDate).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 px-4 py-1.5 rounded-full border border-orange-100 shadow-sm">
                  <MapPin size={16} className="text-fpt-orange" />
                  <span>Số phòng đang sử dụng: <span className="font-bold text-gray-900">{roomsInUseCount}</span></span>
                </div>
              </div>
            )}

            {filteredSlots.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                {selectedDate
                  ? `Không có lịch học vào ${new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}`
                  : 'Chưa có thời khóa biểu cho học kỳ này.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-5 text-left w-40 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                        Phòng học
                      </th>
                      {slotTimes.map(({ slot, start, end }) => (
                        <th
                          key={slot}
                          className="text-center px-4 py-4 border-b border-l border-gray-200"
                        >
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            SLOT {slot}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            {start} - {end}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDisplayRooms.map((room, idx) => (
                      <tr key={room} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-800 border-b border-gray-100">
                          {room}
                        </td>
                        {slotTimes.map(({ slot }) => {
                          const cell = getCell(room, slot);
                          return (
                            <td
                              key={slot}
                              className="px-4 py-3 border-b border-l border-gray-100 align-top h-24"
                            >
                              {cell ? (
                                <div
                                  onClick={() => setSelectedSlot(cell)}
                                  className="relative group bg-white border-l-4 border-fpt-orange rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                >
                                  {/* Course Code */}
                                  <div className="text-sm font-bold text-fpt-orange">
                                    {cell.courseCode || cell.courseName}
                                  </div>
                                  {/* Class Name */}
                                  <div className="text-xs text-gray-600 mt-1">
                                    Lớp: {cell.className}
                                  </div>
                                  {/* Teacher */}
                                  <div className="text-xs text-gray-500">
                                    GV: {cell.lecturerName || 'Chưa phân công'}
                                  </div>
                                  {/* More menu button */}
                                  <button className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical size={14} className="text-gray-400" />
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Xác nhận tạo lại thời khóa biểu
            </h3>
            <p className="text-gray-600 mb-6">
              Học kỳ này đã có thời khóa biểu. Bạn có chắc muốn tạo lại không?
              Dữ liệu cũ sẽ bị xóa hoàn toàn.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  startGeneration();
                }}
                className="px-4 py-2 bg-fpt-orange text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Tạo lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slot Detail Popup */}
      {selectedSlot && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[500] animate-in fade-in duration-300"
          onClick={() => setSelectedSlot(null)}
        >
          <div
            className="bg-white rounded-[28px] p-7 md:p-8 max-w-md w-full mx-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] relative animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Chi tiết tiết học
                </h3>
                <p className="text-[12px] font-medium text-slate-400 mt-0.5 uppercase tracking-wider">
                  {selectedSlot.date && new Date(selectedSlot.date).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-2 hover:bg-slate-50 rounded-full transition-all group"
              >
                <X size={20} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </button>
            </div>

            {/* Course Information Section */}
            <div className="mb-5 pl-1 border-l-4 border-fpt-orange/20">
              <span className="text-[9px] font-extrabold text-fpt-orange uppercase tracking-[0.15em] mb-1 block">
                Môn học
              </span>
              <h4 className="text-lg font-bold text-slate-800 leading-snug">
                {selectedSlot.courseCode} — {selectedSlot.courseName}
              </h4>
            </div>

            <div className="h-px bg-slate-100 w-full mb-6"></div>

            {/* Details Grid (2x2) */}
            <div className="grid grid-cols-2 gap-y-5 gap-x-4 mb-8">
              {/* Class */}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1 block">Lớp</span>
                <button
                  onClick={() => navigate(`/academic-staff/class-sections/${selectedSlot.className}`)}
                  className="text-sm font-bold text-slate-800 hover:text-fpt-orange transition-colors text-left"
                >
                  {selectedSlot.className}
                </button>
              </div>

              {/* Lecturer */}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1 block">Giảng viên</span>
                <p className="text-sm font-bold text-slate-800 truncate">
                  {selectedSlot.lecturerName || 'Chưa phân công'}
                </p>
              </div>

              {/* Room */}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1 block">Phòng</span>
                <p className="text-sm font-bold text-slate-800">
                  {selectedSlot.roomCode || selectedSlot.roomName || 'N/A'}
                </p>
              </div>

              {/* Time */}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1 block">Thời gian</span>
                <p className="text-sm font-bold text-slate-800">
                  Slot {selectedSlot.slotNumber} <span className="font-medium text-slate-400 ml-1">
                    {(selectedSlot.startTime || '').substring(0, 5)} - {(selectedSlot.endTime || '').substring(0, 5)}
                  </span>
                </p>
              </div>
            </div>

            {/* Rescheduling Form - Adjusted style */}
            {isRescheduling && (
              <div className="bg-orange-50/50 rounded-2xl p-4 mb-6 border border-orange-100/50 animate-in slide-in-from-top-4 duration-300">
                <h4 className="text-[11px] font-medium text-fpt-orange uppercase tracking-wider mb-3 flex items-center gap-2">
                  <RefreshCw size={13} />
                  Thay đổi lịch học
                </h4>

                <div className="space-y-4">
                  <div>
                    <FilterDatePicker
                      label="Ngày đổi"
                      value={rescheduleDate}
                      onChange={(value) => {
                        setRescheduleDate(value);
                        setRescheduleSlot(null);
                        setRescheduleRoom(null);
                      }}
                      min={semesterStartDate || undefined}
                      max={semesterEndDate || undefined}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FilterSelect
                      label="Tiết đổi"
                      value={rescheduleSlot?.toString() || ''}
                      onChange={(val) => setRescheduleSlot(Number(val))}
                      options={[
                        { value: '', label: 'Chọn tiết' },
                        ...availableSlots.map(num => ({ value: num.toString(), label: `Slot ${num}` }))
                      ]}
                      placeholder="Chọn tiết..."
                    />
                    <FilterSelect
                      label="Phòng đổi"
                      value={rescheduleRoom?.toString() || ''}
                      onChange={(val) => setRescheduleRoom(val ? Number(val) : null)}
                      options={[
                        { value: '', label: 'Chọn phòng' },
                        ...availableRooms.map((room: any) => ({
                          value: room.id?.toString() ?? room.toString(),
                          label: room.name ?? room.roomCode ?? room.toString()
                        }))
                      ]}
                      placeholder="Chọn phòng..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {!isRescheduling ? (
                <>
                  <button
                    onClick={() => {
                      const path = `/academic-staff/attendance/realtime/${selectedSlot.id}`;
                      const userStr = localStorage.getItem('user');
                      const user = userStr ? JSON.parse(userStr) : null;
                      const mappedPath = (user?.role === 'LECTURER')
                        ? path.replace('/academic-staff/', '/lecturer/granted/')
                        : path;
                      window.open(mappedPath, '_blank');
                    }}
                    className="w-full py-3.5 bg-fpt-orange hover:bg-orange-600 text-white rounded-[20px] font-bold transition-all shadow-lg shadow-orange-100 active:scale-[0.98]"
                  >
                    Xem điểm danh
                  </button>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => {
                        setIsRescheduling(true);
                        setRescheduleDate(selectedSlot.date || '');
                        setRescheduleSlot(selectedSlot.slotNumber || null);
                        setRescheduleRoom(null);
                      }}
                      className="px-8 py-3 border border-fpt-orange/10 text-fpt-orange rounded-[18px] text-xs font-bold hover:bg-orange-50 hover:border-fpt-orange/30 transition-all active:scale-[0.98] shadow-sm shadow-orange-50"
                    >
                      Cập nhật
                    </button>
                    <button
                      onClick={() => setSelectedSlot(null)}
                      className="px-4 py-3 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors"
                    >
                      Đóng
                    </button>
                  </div>
                </>


              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsRescheduling(false)}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={async () => {
                      if (!rescheduleDate || !rescheduleSlot || !rescheduleRoom) {
                        toast.error('Vui lòng chọn đầy đủ thông tin');
                        return;
                      }
                      setIsSubmittingReschedule(true);
                      try {
                        await timetableService.updateSlot(selectedSlot.id, {
                          date: rescheduleDate,
                          slotNumber: rescheduleSlot,
                          roomId: rescheduleRoom
                        });
                        toast.success('Đã cập nhật lịch học');
                        setIsRescheduling(false);
                        setSelectedSlot(null);
                        if (selected && selectedDate) {
                          fetchTimetable(selected, selectedDate);
                        }
                      } catch (err: any) {
                        toast.error(err.response?.data?.message || 'Không thể cập nhật lịch học');
                      } finally {
                        setIsSubmittingReschedule(false);
                      }
                    }}
                    disabled={isSubmittingReschedule}
                    className="flex-[2] py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-green-100 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmittingReschedule ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Xác nhận đổi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </AcademicStaffLayout>
  );
};

export default SchedulePage;


