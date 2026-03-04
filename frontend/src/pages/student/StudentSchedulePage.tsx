import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentLayout } from '../../layouts/StudentLayout';
import { Card } from '../../components/common/Card';
import {
    Clock,
    MapPin,
    Download,
    Calendar as CalendarIcon,
    Loader2,
    X,
    User,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Lock,
    FileText
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import timetableService, { WeeklyTimetableDTO, TimetableSlotDTO } from '../../services/api/timetableService';

const SLOTS = [
    { id: 1, label: 'SLOT 1', time: '07:30 - 09:45' },
    { id: 2, label: 'SLOT 2', time: '10:00 - 12:15' },
    { id: 3, label: 'SLOT 3', time: '13:00 - 15:15' },
    { id: 4, label: 'SLOT 4', time: '15:30 - 17:45' },
];

interface Semester {
    code: string;
    name: string;
    startDate: string;
    endDate: string;
}

export const StudentSchedulePage: React.FC = () => {
    const navigate = useNavigate();
    const [timetable, setTimetable] = useState<WeeklyTimetableDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedSlot, setSelectedSlot] = useState<TimetableSlotDTO | null>(null);
    const [isScheduleHidden, setIsScheduleHidden] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Semester State
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [semesterStartDate, setSemesterStartDate] = useState<string>('');
    const [semesterEndDate, setSemesterEndDate] = useState<string>('');

    // Helper to get Monday of the week for a given date (Local time)
    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    // Helper to format date as YYYY-MM-DD (Local time)
    const formatDateToLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Generate weeks based on semester start/end dates
    const generateWeeks = () => {
        if (!semesterStartDate || !semesterEndDate) return [];

        const weeks = [];
        const startSem = new Date(semesterStartDate);
        const endSem = new Date(semesterEndDate);

        // Start from the Monday of the week containing the semester start date
        // or just the semester start date if we want strict cutoff?
        // Usually weeks are full weeks. Let's align to Monday.
        const startOfFirstWeek = getStartOfWeek(startSem);

        // Loop until we pass the end date
        let currentStart = new Date(startOfFirstWeek);

        while (currentStart <= endSem) {
            const currentEnd = new Date(currentStart);
            currentEnd.setDate(currentStart.getDate() + 6);

            weeks.push({
                value: formatDateToLocal(currentStart),
                label: `${currentStart.getDate()}/${currentStart.getMonth() + 1} - ${currentEnd.getDate()}/${currentEnd.getMonth() + 1}`,
                isCurrent: false
            });

            // Move to next week
            const nextWeek = new Date(currentStart);
            nextWeek.setDate(currentStart.getDate() + 7);
            currentStart = nextWeek;
        }

        return weeks;
    };

    const weeks = generateWeeks();

    // Find current week value for initial selection if needed, but we rely on currentDate state
    // We update currentDate when selection changes

    const handleSemesterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const semesterCode = e.target.value;
        setSelectedSemester(semesterCode);
        const sem = semesters.find(s => s.code === semesterCode);
        if (sem) {
            setSemesterStartDate(sem.startDate);
            setSemesterEndDate(sem.endDate);

            // Auto select start date of semester
            const newDate = new Date(sem.startDate);
            setCurrentDate(newDate);
        }
    };

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);

        // Prevent going before semester start
        if (semesterStartDate) {
            const startLimit = new Date(semesterStartDate);
            // Adjust to start of week for fair comparison
            const startOfWeekLimit = getStartOfWeek(startLimit);
            if (newDate < startOfWeekLimit) {
                return; // Or toast user
            }
        }

        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);

        // Prevent going after semester end
        if (semesterEndDate) {
            const endLimit = new Date(semesterEndDate);
            if (newDate > endLimit) {
                return;
            }
        }

        setCurrentDate(newDate);
    };

    const fetchSemesters = async () => {
        try {
            const resp = await axios.get('/api/v1/semesters/active');
            const data = Array.isArray(resp.data) ? resp.data : [];
            setSemesters(data);

            if (data.length > 0) {
                // Default to first semester
                const defaultSem = data[0];
                setSelectedSemester(defaultSem.code);
                setSemesterStartDate(defaultSem.startDate);
                setSemesterEndDate(defaultSem.endDate);

                // If today is within this semester, use today. Else use start date
                const today = new Date();
                const start = new Date(defaultSem.startDate);
                const end = new Date(defaultSem.endDate);

                if (today >= start && today <= end) {
                    setCurrentDate(today);
                } else {
                    setCurrentDate(start);
                }
            }
        } catch (err) {
            console.error('Failed to load semesters', err);
            toast.error('Không thể tải danh sách học kỳ');
        }
    };

    useEffect(() => {
        fetchSemesters();
    }, []);

    useEffect(() => {
        fetchTimetable();
    }, [currentDate]);

    const fetchTimetable = async () => {
        setLoading(true);
        setIsScheduleHidden(false);
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;

            const user = JSON.parse(userStr);
            console.log('Fetching schedule for User ID:', user.id, 'Date:', currentDate.toISOString());

            const dateStr = currentDate.toISOString().split('T')[0];
            const data = await timetableService.getStudentTimetable(user.id, dateStr);
            console.log('Schedule Data:', data);
            setTimetable(data);
        } catch (error: any) {
            console.error('Failed to fetch timetable:', error);
            // Check for 403 in response
            if (error.response && error.response.status === 403) {
                setIsScheduleHidden(true);
                setTimetable(null);
            } else if (axios.isAxiosError(error) && error.response?.status === 403) {
                // Double check axios error format
                setIsScheduleHidden(true);
                setTimetable(null);
            } else {
                console.warn('Timetable fetch error:', error.response?.data?.message || error.message);
                setTimetable(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // e.target.value is YYYY-MM-DD
        const parts = e.target.value.split('-').map(Number);
        const selectedDate = new Date(parts[0], parts[1] - 1, parts[2]); // Year, Month (0-idx), Day
        setCurrentDate(selectedDate);
    };

    const formatDateLabel = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    };

    const getDayLabel = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = date.getDay(); // 0 = Sun, 1 = Mon
        if (day === 0) return 'Chủ nhật';
        return `Thứ ${day + 1}`;
    };

    const getStatusStyle = (slot?: TimetableSlotDTO) => {
        if (slot) {
            const label = getStatusLabel(slot);
            if (label === 'Đã hủy') return 'bg-red-50 text-red-600 border-red-100';
            if (label === 'Đã kết thúc') return 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
            if (label === 'Đang diễn ra') return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
        }
        // Uniform Orange Theme for all statuses per user request
        return 'bg-fpt-orange/10 text-fpt-orange border-fpt-orange/30';
    };

    const SLOT_TIMES: Record<number, { start: string; end: string }> = {
        1: { start: '07:30', end: '09:45' },
        2: { start: '10:00', end: '12:15' },
        3: { start: '13:00', end: '15:15' },
        4: { start: '15:30', end: '17:45' },
    };

    const getStatusLabel = (slot: TimetableSlotDTO) => {
        if (slot.attendanceStatus === 'PRESENT') return 'Có mặt';
        if (slot.attendanceStatus === 'ABSENT') return 'Vắng mặt';
        if (slot.status === 'CANCELLED') return 'Đã hủy';

        // Time-based status check
        if (slot.date && slot.slotNumber) {
            const now = new Date();
            const slotDate = new Date(slot.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            slotDate.setHours(0, 0, 0, 0);

            if (slotDate < today) {
                return 'Đã kết thúc';
            }

            if (slotDate.getTime() === today.getTime()) {
                const times = SLOT_TIMES[slot.slotNumber];
                if (times) {
                    const [endH, endM] = times.end.split(':').map(Number);
                    const [startH, startM] = times.start.split(':').map(Number);
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                    const endMinutes = endH * 60 + endM;
                    const startMinutes = startH * 60 + startM;

                    if (currentMinutes >= endMinutes) return 'Đã kết thúc';
                    if (currentMinutes >= startMinutes) return 'Đang diễn ra';
                }
            }
        }

        return 'Chưa diễn ra';
    };

    const getSlotForCell = (daySlots: TimetableSlotDTO[], slotNumber: number) => {
        return daySlots ? daySlots.find(s => s.slotNumber === slotNumber) : undefined;
    };

    // Helper to get start of current week date string for select value
    const getCurrentWeekValue = () => {
        const monday = getStartOfWeek(currentDate);
        return formatDateToLocal(monday);
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);

            // Determine semester based on selectedSemester
            const semesterCode = selectedSemester;

            console.log('Exporting for semester:', semesterCode);

            const response = await timetableService.exportStudentTimetable(user.id, semesterCode);

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from header if possible, or default
            const contentDisposition = response.headers['content-disposition'];
            let fileName = `Schedule_${user.code}_${semesterCode}.xlsx`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2)
                    fileName = fileNameMatch[1];
            }

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Xuất file thất bại. Vui lòng thử lại.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <StudentLayout pageTitle="Thời khóa biểu">
            <div className="space-y-6">
                {/* Header Controls */}
                <div className="flex flex-col gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-fpt-orange font-bold text-sm mb-1">
                            <CalendarIcon size={16} /> {semesters.find(s => s.code === selectedSemester)?.name || 'Học kỳ'}
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                            Lịch học theo tuần
                        </h1>
                    </div>

                    {/* Toolbar: Filters (Left) and Export Button (Far Right) */}
                    <div className="flex items-center justify-between gap-4 p-2 rounded-xl">
                        <div className="flex items-center gap-3">
                            {/* Semester Filter */}
                            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-100 dark:border-orange-800">
                                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                                    <span className="text-xs">▼</span> Học kỳ:
                                </span>
                                <select
                                    value={selectedSemester}
                                    onChange={handleSemesterChange}
                                    className="bg-transparent border-none text-fpt-orange font-bold focus:ring-0 cursor-pointer text-sm p-0 pr-6"
                                    style={{ backgroundImage: 'none' }}
                                >
                                    {semesters.map(s => (
                                        <option key={s.code} value={s.code}>{s.name || s.code}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Week Selector with Navigation */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handlePrevWeek}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-fpt-orange transition-colors"
                                    title="Tuần trước"
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <div className="relative">
                                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border border-fpt-orange/50 shadow-sm focus-within:ring-2 ring-fpt-orange/20">
                                        <select
                                            value={getCurrentWeekValue()}
                                            onChange={handleWeekChange}
                                            className="bg-transparent border-none text-gray-700 dark:text-gray-200 font-medium focus:ring-0 cursor-pointer text-sm p-0 w-64"
                                        >
                                            {weeks.map((week) => (
                                                <option key={week.value} value={week.value}>
                                                    {week.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleNextWeek}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-fpt-orange transition-colors"
                                    title="Tuần sau"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Export Button - Far Right */}
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className={`flex items-center gap-2 px-4 py-2 bg-fpt-orange text-white rounded-xl font-medium text-sm shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-colors ${exporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            <span>{exporting ? 'Đang xuất...' : 'Xuất file'}</span>
                        </button>
                    </div>
                </div>

                {/* Calendar Grid Container */}
                <Card className="min-w-full overflow-hidden border-none shadow-sm dark:shadow-none bg-white dark:bg-zinc-900">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex items-center justify-center p-20">
                                <Loader2 className="w-8 h-8 animate-spin text-fpt-orange" />
                            </div>
                        ) : isScheduleHidden ? (
                            <div className="p-12 text-center text-gray-500">
                                <div className="bg-orange-50 dark:bg-orange-900/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                    <Lock size={32} className="text-fpt-orange" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Thời khóa biểu chưa được công bố</h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Vui lòng quay lại sau khi nhà trường công bố lịch học chính thức.
                                </p>
                            </div>
                        ) : timetable && timetable.days ? (
                            <table className="w-full border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-zinc-800/50">
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800 w-[150px]">
                                            Thứ / Ngày
                                        </th>
                                        {SLOTS.map((slot) => (
                                            <th
                                                key={slot.id}
                                                className="text-center px-4 py-4 border-b border-l border-gray-200 dark:border-zinc-800"
                                            >
                                                <div className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                                                    {slot.label}
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-1 font-medium">
                                                    {slot.time}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timetable.days.map((day, idx) => (
                                        <tr
                                            key={day.date}
                                            className={`${idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50/30 dark:bg-zinc-800/20'} group`}
                                        >
                                            {/* Day Label Cell */}
                                            <td className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 align-middle">
                                                <div className="flex flex-col">
                                                    <div className="font-bold text-xl text-gray-900 dark:text-white leading-tight">
                                                        {getDayLabel(day.date)}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                                                        {formatDateLabel(day.date)}
                                                    </div>
                                                    {day.date === new Date().toISOString().split('T')[0] && (
                                                        <span className="inline-block mt-2 px-2 py-0.5 bg-fpt-orange/10 text-fpt-orange text-[10px] font-black rounded-full w-fit uppercase tracking-wider">
                                                            Hôm nay
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Slot Cells */}
                                            {SLOTS.map((slot) => {
                                                const slotData = getSlotForCell(day.slots, slot.id);
                                                return (
                                                    <td
                                                        key={`${day.date}-${slot.id}`}
                                                        className="px-3 py-3 border-b border-l border-gray-100 dark:border-zinc-800 align-middle min-h-[140px]"
                                                    >
                                                        {slotData ? (
                                                            <div
                                                                onClick={() => setSelectedSlot(slotData)}
                                                                className="relative group bg-white dark:bg-zinc-800 rounded-xl p-3 pl-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 dark:border-zinc-700 overflow-hidden"
                                                            >
                                                                {/* Left Orange Accent Bar - Absolute positioned for perfect rounding */}
                                                                <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-fpt-orange" />

                                                                {/* Status Badge */}
                                                                {(slotData.status || slotData.attendanceStatus) && (
                                                                    <div className={`
                                                                        inline-block px-1.5 py-0.5 rounded text-[8px] font-black border mb-1 uppercase tracking-tighter
                                                                        ${getStatusStyle(slotData)}
                                                                    `}>
                                                                        {getStatusLabel(slotData)}
                                                                    </div>
                                                                )}

                                                                {/* Course Code */}
                                                                <div className="font-bold text-fpt-orange text-sm mb-1 truncate" title={slotData.courseName}>
                                                                    {slotData.courseCode}
                                                                </div>

                                                                {/* Details */}
                                                                <div className="space-y-0.5 text-[11px] font-medium">
                                                                    <div className="text-gray-500 dark:text-gray-400 leading-tight">
                                                                        Lớp: {slotData.className}
                                                                    </div>
                                                                    <div className="text-gray-500 dark:text-gray-400 truncate">
                                                                        GV: {slotData.lecturerName || 'Chưa phân công'}
                                                                    </div>
                                                                    <div className="text-gray-500 dark:text-gray-400 truncate">
                                                                        Phòng: {slotData.roomCode || slotData.roomName}
                                                                    </div>
                                                                    <div className="text-gray-500 dark:text-gray-400 truncate">
                                                                        Bài tập: {!slotData.assignmentId
                                                                            ? 'Chưa có'
                                                                            : slotData.submissionStatus === 'SUBMITTED'
                                                                                ? <span className="text-green-600 dark:text-green-400 font-semibold">Đã nộp</span>
                                                                                : slotData.assignmentStatus === 'CLOSED'
                                                                                    ? <span className="text-red-500 dark:text-red-400 font-semibold">Đã đóng</span>
                                                                                    : <span className="text-amber-500 dark:text-amber-400 font-semibold">Chưa nộp</span>
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="h-full min-h-[100px] flex items-center justify-center bg-gray-50/30 dark:bg-zinc-800/10 rounded-lg border border-dashed border-gray-100 dark:border-zinc-800/50">
                                                                <span className="text-gray-300 dark:text-zinc-700 font-black text-xs">-</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center p-20 flex flex-col items-center justify-center">
                                <CalendarIcon className="w-12 h-12 text-gray-300 mb-4" />
                                <div className="text-gray-500 font-medium text-lg">Không tìm thấy dữ liệu lịch học</div>
                                <p className="text-gray-400 text-sm mt-1">Vui lòng chọn tuần khác hoặc liên hệ phòng đào tạo.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Detail Modal */}
            {
                selectedSlot && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedSlot(null)}>
                        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="bg-fpt-orange px-6 py-4 flex items-center justify-between">
                                <h3 className="text-white font-bold text-lg">Chi tiết buổi học</h3>
                                <button
                                    onClick={() => setSelectedSlot(null)}
                                    className="text-white/80 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 flex justify-center pt-1">
                                        <CalendarIcon className="text-gray-400" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Ngày</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {selectedSlot.date ? (() => {
                                                const d = new Date(selectedSlot.date);
                                                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} (${getDayLabel(selectedSlot.date)})`;
                                            })() : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 flex justify-center pt-1">
                                        <Clock className="text-gray-400" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Thời gian</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            Slot {selectedSlot.slotNumber} <span className="text-gray-400 text-sm font-normal">({selectedSlot.startTime} - {selectedSlot.endTime})</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 flex justify-center pt-1">
                                        <BookOpen className="text-gray-400" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Môn học / Lớp</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {selectedSlot.courseName}
                                        </p>
                                        <p className="text-sm text-fpt-orange font-bold mt-1">
                                            {selectedSlot.className}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 flex justify-center pt-1">
                                        <MapPin className="text-gray-400" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Phòng học</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {selectedSlot.roomCode || selectedSlot.roomName}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 flex justify-center pt-1">
                                        <User className="text-gray-400" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Giáo viên</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {selectedSlot.lecturerName || 'Chưa phân công'}
                                        </p>
                                    </div>
                                </div>

                                {/* Assignment Info Section */}
                                <div className="flex items-start gap-4 pt-2 border-t border-gray-100 dark:border-zinc-800 mt-2">
                                    <div className="w-8 flex justify-center pt-1">
                                        <FileText className="text-gray-400" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Bài tập</p>
                                        <p className="font-medium text-gray-900 dark:text-white mt-1">
                                            {selectedSlot.assignmentId
                                                ? selectedSlot.assignmentTitle
                                                : 'Chưa có bài tập'}
                                        </p>
                                        {selectedSlot.assignmentId && (
                                            <>
                                                <p className="text-sm mt-1">
                                                    Trạng thái: {selectedSlot.submissionStatus === 'SUBMITTED'
                                                        ? <span className="text-green-600 dark:text-green-400 font-semibold">Đã nộp</span>
                                                        : selectedSlot.assignmentStatus === 'CLOSED'
                                                            ? <span className="text-red-500 dark:text-red-400 font-semibold">Đã đóng</span>
                                                            : <span className="text-amber-500 dark:text-amber-400 font-semibold">Chưa nộp</span>}
                                                </p>
                                                <button
                                                    onClick={() => { setSelectedSlot(null); navigate('/student/assignments'); }}
                                                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-fpt-orange/10 hover:bg-fpt-orange/20 text-fpt-orange rounded-lg text-xs font-semibold transition-colors"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Xem bài tập
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 pt-2 border-t border-gray-100 dark:border-zinc-800 mt-2">
                                    <div className="w-8 flex justify-center pt-1">
                                    </div>
                                    <div className="flex items-center gap-2 w-full justify-between">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Trạng thái điểm danh:</p>
                                        <span className={`font-bold uppercase px-3 py-1 rounded-full text-xs border ${getStatusStyle(selectedSlot)}`}>
                                            {getStatusLabel(selectedSlot)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </StudentLayout>
    );
};
