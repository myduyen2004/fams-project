import React, { useEffect, useState, useRef, useMemo, Fragment } from 'react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import axios from 'axios';
import { timetableService, TimetableSlotDTO } from '../../services/api/timetableService';
import { toast } from 'react-hot-toast';
import { Calendar, BookOpen, ChevronLeft, ChevronRight, X, Clock, MapPin, User, GraduationCap, AlertTriangle, Check, ChevronsUpDown, Eye, EyeOff, Loader2, Play, Users, School, Download, MoreVertical, RefreshCw, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Combobox, Transition } from '@headlessui/react';

interface FilterComboboxProps {
  value: string | null; // Changed to allow null
  onChange: (value: string | null) => void; // Changed to allow null
  options: { value: string; label: string }[];
  placeholder: string;
  icon: React.ElementType;
}

const FilterCombobox: React.FC<FilterComboboxProps> = ({ value, onChange, options, placeholder, icon: Icon }) => {
  const [query, setQuery] = useState('');

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) =>
        option.label
          .toLowerCase()
          .replace(/\s+/g, '')
          .includes(query.toLowerCase().replace(/\s+/g, ''))
      );

  return (
    <div className="relative w-full sm:w-56">
      <Combobox value={value} onChange={onChange} nullable>
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-200 focus-within:border-fpt-orange focus-within:ring-1 focus-within:ring-fpt-orange sm:text-sm flex items-center transition-colors">
            <div className="pl-3 py-2 text-gray-400">
              <Icon size={16} />
            </div>
            <Combobox.Input
              className="w-full border-none py-2 pl-2 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 outline-none bg-transparent"
              displayValue={(val: string | null) => options.find(o => o.value === val)?.label || ''}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown
                className="h-4 w-4 text-gray-400 hover:text-gray-600"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50 scroller">
              {filteredOptions.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  Không tìm thấy.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <Combobox.Option
                    key={option.value}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-fpt-orange text-white' : 'text-gray-900'
                      }`
                    }
                    value={option.value}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${selected ? 'font-medium' : 'font-normal'
                            }`}
                        >
                          {option.label}
                        </span>
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-fpt-orange'
                              }`}
                          >
                            <Check className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
};


interface Semester {
  code: string;
  name: string;
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

export const SchedulePage: React.FC = () => {
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

  // Toggle for showing locked schedule (isPublished)
  const [showLockedSchedule, setShowLockedSchedule] = useState(false);

  // Filters
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
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
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  const fetchSemesters = async () => {
    try {
      const resp = await axios.get('/api/v1/semesters/active');
      const data = Array.isArray(resp.data) ? resp.data : [];
      setSemesters(data);
      if (data.length > 0 && !selected) setSelected(data[0].code);
    } catch (err) {
      console.error('Failed to load semesters', err);
      toast.error('Không thể tải danh sách học kỳ');
    }
  };

  const fetchSemesterDetails = async (semesterCode: string) => {
    try {
      const resp = await axios.get(`/api/v1/semesters/get-by-code/${semesterCode}`);
      const semesterData = resp.data;

      // Extract start and end dates from semester
      if (semesterData.startDate) {
        setSemesterStartDate(semesterData.startDate);
        setSelectedDate(semesterData.startDate); // Auto-select first day of semester
      }
      if (semesterData.endDate) {
        setSemesterEndDate(semesterData.endDate);
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
          toast.error(statusResp?.errorMessage || statusResp?.message || 'Tạo thời khóa biểu thất bại');
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

  // Fetch availability when rescheduling date changes
  useEffect(() => {
    if (isRescheduling && rescheduleDate && selected) {
      const fetchAvailability = async () => {
        setLoadingAvailability(true);
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
        } finally {
          setLoadingAvailability(false);
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

  // Main generation start function
  const startGeneration = async () => {
    if (!selected) return toast.error('Vui lòng chọn học kỳ');
    try {
      // Reset all progress states
      setGenerating(true);
      setGenerationProgress(0);
      setGenerationPhase(null);
      setGenerationStatus('RUNNING');

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
      await axios.patch(`/api/v1/semesters/${selected}/publish`, { isPublished: newValue });
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

  // Build data structure: rooms -> slotNumber
  const rooms = Array.from(new Set(slots.map(s => s.roomName || s.roomCode || 'Phòng')));

  // Filter slots based on selected filters
  const filteredSlots = slots.filter(slot => {
    if (selectedClass && !slot.className?.startsWith(selectedClass.split('-')[0])) return false;
    if (selectedTeacher && slot.lecturerName !== selectedTeacher) return false;
    if (selectedCourse && (slot.courseCode !== selectedCourse && slot.courseName !== selectedCourse)) return false;
    if (selectedDate && slot.date !== selectedDate) return false;
    return true;
  });

  const getCell = (room: string, slotNum: number) => {
    return filteredSlots.find(s =>
      (s.roomName || s.roomCode || 'Phòng') === room &&
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left filters */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Semester Selector */}
              <div className="relative flex items-center gap-2 bg-white rounded-lg px-4 border border-gray-200 hover:border-gray-300 transition-colors">
                <Calendar size={16} className="text-gray-400" />
                <select
                  value={selected ?? ''}
                  onChange={(e) => setSelected(e.target.value)}
                  className="appearance-none bg-transparent text-sm text-gray-700 outline-none cursor-pointer pr-6 min-w-[100px] border-none focus:outline-none focus:ring-0"
                >
                  <option value="">Chọn học kỳ</option>
                  {semesters.map(s => (
                    <option key={s.code} value={s.code}>{s.name || s.code}</option>
                  ))}
                </select>
              </div>

              {/* Date Selector with Arrow Navigation */}
              <div className="relative flex items-center gap-1 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                {/* Previous Day Button */}
                <button
                  onClick={handlePreviousDay}
                  disabled={!selectedDate || (!!semesterStartDate && selectedDate <= semesterStartDate)}
                  className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Ngày trước"
                >
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>

                {/* Date Display and Input */}
                <div className="flex items-center gap-2 px-3">
                  <Calendar size={16} className="text-gray-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={semesterStartDate || undefined}
                    max={semesterEndDate || undefined}
                    className="appearance-none bg-transparent text-sm text-gray-700 outline-none cursor-pointer border-none focus:outline-none focus:ring-0"
                    placeholder="Chọn ngày"
                  />
                </div>

                {/* Next Day Button */}
                <button
                  onClick={handleNextDay}
                  disabled={!selectedDate || (!!semesterEndDate && selectedDate >= semesterEndDate)}
                  className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Ngày sau"
                >
                  <ChevronRight size={18} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-4">
              {/* Toggle - Công khai cho sinh viên */}
              <div className="flex items-center gap-3 px-4 py-2 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2">
                  {showLockedSchedule ? (
                    <Eye size={16} className="text-green-600" />
                  ) : (
                    <EyeOff size={16} className="text-gray-400" />
                  )}
                  <span className="text-sm text-gray-600">Công khai cho SV</span>
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
                className="flex items-center gap-2 bg-fpt-orange hover:bg-orange-600 text-white px-5 py-2 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-60"
              >
                {generating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Play size={18} />
                )}
                {generating ? 'Đang tạo...' : 'Tạo tự động'}
              </button>

              {generating && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
              )}
            </div>
          </div>

          {/* Secondary Filter Row */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            {/* Class Filter */}
            <FilterCombobox
              value={selectedClass}
              onChange={(val) => setSelectedClass(val)}
              options={(() => {
                const baseOptions = uniqueClasses.map(c => ({ value: c.prefix, label: c.prefix })).filter(o => o.label);
                if (selectedClass && !baseOptions.some(o => o.value === selectedClass)) {
                  return [...baseOptions, { value: selectedClass, label: selectedClass }];
                }
                return baseOptions;
              })()}
              placeholder="Tìm lớp..."
              icon={School}
            />

            {/* Teacher Filter */}
            <FilterCombobox
              value={selectedTeacher}
              onChange={(val) => setSelectedTeacher(val)}
              options={(() => {
                const baseOptions = uniqueTeachers.map(t => ({ value: t!, label: t! })).filter(o => o.label);
                if (selectedTeacher && !baseOptions.some(o => o.value === selectedTeacher)) {
                  return [...baseOptions, { value: selectedTeacher, label: selectedTeacher }];
                }
                return baseOptions;
              })()}
              placeholder="Tìm GV..."
              icon={Users}
            />

            {/* Course Filter */}
            <FilterCombobox
              value={selectedCourse}
              onChange={(val) => setSelectedCourse(val)}
              options={(() => {
                const baseOptions = uniqueCourses.map(c => ({ value: c!, label: c! })).filter(o => o.label);
                if (selectedCourse && !baseOptions.some(o => o.value === selectedCourse)) {
                  return [...baseOptions, { value: selectedCourse, label: selectedCourse }];
                }
                return baseOptions;
              })()}
              placeholder="Tìm môn..."
              icon={BookOpen}
            />

            {/* Clear filters button */}
            {(selectedClass || selectedTeacher || selectedCourse) && (
              <button
                onClick={() => {
                  setSelectedClass('');
                  setSelectedTeacher('');
                  setSelectedCourse('');
                }}
                className="text-sm text-fpt-orange hover:text-orange-600 font-medium whitespace-nowrap"
              >
                Xóa bộ lọc
              </button>
            )}

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={exportingWeek || !selected || !selectedDate}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-auto"
            >
              {exportingWeek ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Xuất Excel
            </button>
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
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-fpt-orange/5 to-transparent">
                <h2 className="text-lg font-semibold text-gray-800">
                  {new Date(selectedDate).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </h2>
              </div>
            )}

            {rooms.length === 0 ? (
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
                      <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-200 w-40">
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
                    {rooms.map((room, idx) => (
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedSlot(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Chi tiết tiết học
                </h3>
                <p className="text-sm text-gray-500 mt-1">
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
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Course Info Card */}
            <div className="bg-gradient-to-r from-fpt-orange/10 to-orange-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-fpt-orange/20 rounded-xl flex items-center justify-center">
                  <BookOpen size={24} className="text-fpt-orange" />
                </div>
                <div>
                  <div className="text-lg font-bold text-fpt-orange">
                    {selectedSlot.courseCode || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-700">
                    {selectedSlot.courseName || 'Chưa có tên môn học'}
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Class */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap size={16} className="text-blue-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Lớp</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {selectedSlot.className || 'N/A'}
                </div>
              </div>

              {/* Lecturer */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User size={16} className="text-green-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Giảng viên</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {selectedSlot.lecturerName || 'Chưa phân công'}
                </div>
              </div>

              {/* Room */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-red-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {selectedSlot.roomCode || selectedSlot.roomName || 'N/A'}
                </div>
              </div>

              {/* Time Slot */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-purple-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tiết</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  Slot {selectedSlot.slotNumber || 'N/A'}
                  {selectedSlot.startTime && selectedSlot.endTime && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({selectedSlot.startTime} - {selectedSlot.endTime})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            {selectedSlot.status && !isRescheduling && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedSlot.status === 'ACTIVE' || selectedSlot.status === 'CONFIRMED'
                    ? 'bg-green-100 text-green-700'
                    : selectedSlot.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                    }`}>
                    {selectedSlot.status}
                  </span>
                </div>
              </div>
            )}

            {/* Rescheduling Form */}
            {isRescheduling && (
              <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <RefreshCw size={16} className="text-fpt-orange" />
                  Thay đổi lịch học
                </h4>

                <div className="grid grid-cols-1 gap-4">
                  {/* Date Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ngày đổi</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      min={semesterStartDate}
                      max={semesterEndDate}
                      onChange={(e) => {
                        setRescheduleDate(e.target.value);
                        setRescheduleSlot(null);
                        setRescheduleRoom(null);
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-fpt-orange focus:border-fpt-orange outline-none"
                    />
                  </div>

                  {/* Slot Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Tiết đổi</label>
                    <select
                      value={rescheduleSlot || ''}
                      onChange={(e) => setRescheduleSlot(Number(e.target.value))}
                      disabled={!rescheduleDate || loadingAvailability}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-fpt-orange focus:border-fpt-orange outline-none disabled:bg-gray-50"
                    >
                      <option value="">Chọn tiết học</option>
                      {availableSlots.map(num => (
                        <option key={num} value={num}>Slot {num}</option>
                      ))}
                    </select>
                  </div>

                  {/* Room Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Phòng đổi</label>
                    <select
                      value={rescheduleRoom || ''}
                      onChange={(e) => setRescheduleRoom(Number(e.target.value))}
                      disabled={!rescheduleSlot}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-fpt-orange focus:border-fpt-orange outline-none disabled:bg-gray-50"
                    >
                      <option value="">Chọn phòng học</option>
                      {availableRooms.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.capacity} chỗ)</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              {!isRescheduling ? (
                <>
                  <button
                    onClick={() => {
                      setIsRescheduling(true);
                      setRescheduleDate(selectedSlot.date || '');
                      setRescheduleSlot(selectedSlot.slotNumber || null);
                      setRescheduleRoom(null); // Force re-select room or keep current?
                      // If keeping current, we need its ID. selectedSlot has roomCode/roomName but maybe not roomId.
                      // Let's assume we re-select room for safety.
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-fpt-orange hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
                  >
                    <RefreshCw size={18} />
                    Cập nhật
                  </button>
                  <button
                    onClick={() => setSelectedSlot(null)}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                  >
                    Đóng
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsRescheduling(false)}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
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
                        // Refresh timetable
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
                    className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {isSubmittingReschedule ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Xác nhận đổi
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AcademicStaffLayout>
  );
};

export default SchedulePage;