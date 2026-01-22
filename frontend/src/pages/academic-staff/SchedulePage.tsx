import React, { useEffect, useState, useRef } from 'react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import axios from 'axios';
import { timetableService, TimetableSlotDTO } from '../../services/api/timetableService';
import { toast } from 'react-hot-toast';
import { Calendar, Users, BookOpen, School, Wand2, MoreVertical, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

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
  const [currentGeneration, setCurrentGeneration] = useState<number | null>(null);
  const [bestFitness, setBestFitness] = useState<number | null>(null);

  // Toggle for showing locked schedule (isPublished)
  const [showLockedSchedule, setShowLockedSchedule] = useState(false);

  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [semesterStartDate, setSemesterStartDate] = useState<string>('');
  const [semesterEndDate, setSemesterEndDate] = useState<string>('');

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
        if (statusResp?.currentGeneration != null) setCurrentGeneration(statusResp.currentGeneration);
        if (statusResp?.bestFitness != null) setBestFitness(statusResp.bestFitness);

        if (status === 'COMPLETED' || status === 'FINISHED' || status === 'SUCCESS') {
          if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
          setGenerating(false);
          setGenerationJobId(null);
          localStorage.removeItem(GENERATION_JOB_KEY);
          toast.success('Tạo thời khóa biểu hoàn tất');
          if (selected && selectedDate) {
            fetchTimetable(selected, selectedDate);
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

  // Main generation start function
  const startGeneration = async () => {
    if (!selected) return toast.error('Vui lòng chọn học kỳ');
    try {
      // Reset all progress states
      setGenerating(true);
      setGenerationProgress(0);
      setGenerationPhase(null);
      setCurrentGeneration(null);
      setBestFitness(null);
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
    current.setDate(current.getDate() - 1);
    const newDate = current.toISOString().split('T')[0];
    if (!semesterStartDate || newDate >= semesterStartDate) {
      setSelectedDate(newDate);
    }
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
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
      toast.success(newValue ? 'Đã hiển thị thời khóa biểu' : 'Đã ẩn thời khóa biểu');
    } catch (err) {
      console.error('Failed to toggle publish status', err);
      toast.error('Không thể cập nhật trạng thái hiển thị');
    }
  };

  // Get unique values for filters
  const uniqueClasses = Array.from(new Set(slots.map(s => s.className).filter(Boolean)));
  const uniqueTeachers = Array.from(new Set(slots.map(s => s.lecturerName).filter(Boolean)));
  const uniqueCourses = Array.from(new Set(slots.map(s => s.courseCode || s.courseName).filter(Boolean)));

  // Build data structure: rooms -> slotNumber
  const rooms = Array.from(new Set(slots.map(s => s.roomName || s.roomCode || 'Phòng')));

  // Filter slots based on selected filters
  const filteredSlots = slots.filter(slot => {
    if (selectedClass && slot.className !== selectedClass) return false;
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
              {/* Toggle - Show locked schedule */}
              <div className="flex items-center gap-3 px-4 py-2 border border-gray-200 rounded-xl">
                <span className="text-sm text-gray-600">Hiển thị lịch khóa</span>
                <button
                  onClick={handleTogglePublished}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${showLockedSchedule ? 'bg-fpt-orange' : 'bg-gray-300'
                    }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${showLockedSchedule ? 'translate-x-7' : 'translate-x-1'
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
                  <Wand2 size={18} />
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
            <div className="relative flex items-center gap-2 bg-white rounded-lg px-2 border border-gray-200 hover:border-gray-300 transition-colors">
              <School size={16} className="text-gray-400" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="appearance-none bg-transparent text-sm text-gray-700 outline-none cursor-pointer pr-6 min-w-[80px] border-none focus:outline-none focus:ring-0"
              >
                <option value="">Chọn lớp</option>
                {uniqueClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Teacher Filter */}
            <div className="relative flex items-center gap-2 bg-white rounded-lg px-2 border border-gray-200 hover:border-gray-300 transition-colors">
              <Users size={16} className="text-gray-400" />
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="appearance-none bg-transparent text-sm text-gray-700 outline-none cursor-pointer pr-6 min-w-[100px] border-none focus:outline-none focus:ring-0"
              >
                <option value="">Chọn giáo viên</option>
                {uniqueTeachers.map(t => (
                  <option key={t} value={t!}>{t}</option>
                ))}
              </select>
            </div>

            {/* Course Filter */}
            <div className="relative flex items-center gap-2 bg-white rounded-lg px-2 border border-gray-200 hover:border-gray-300 transition-colors">
              <BookOpen size={16} className="text-gray-400" />
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="appearance-none bg-transparent text-sm text-gray-700 outline-none cursor-pointer pr-6 min-w-[100px] border-none focus:outline-none focus:ring-0"
              >
                <option value="">Môn học</option>
                {uniqueCourses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <div>
                  <div className="text-xs text-gray-500">Thế hệ hiện tại</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {currentGeneration != null ? `Gen ${currentGeneration}` : 'N/A'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div>
                  <div className="text-xs text-gray-500">Fitness tốt nhất</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {bestFitness != null ? bestFitness.toFixed(2) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
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
                                <div className="relative group bg-white border-l-4 border-fpt-orange rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
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
    </AcademicStaffLayout>
  );
};

export default SchedulePage;
