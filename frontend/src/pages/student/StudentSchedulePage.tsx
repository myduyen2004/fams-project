import React, { useEffect, useState, useMemo, Fragment } from 'react';
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
    FileText,
    Check,
    ChevronDown
} from 'lucide-react';
import axios from 'axios';
import { Listbox, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import apiClient from '../../services/api/authService';
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
    const [showLecturerPopup, setShowLecturerPopup] = useState(false);
    const [isScheduleHidden, setIsScheduleHidden] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Semester State
    const [selectedSemester, setSelectedSemester] = useState<string>('');

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

    const YEARS = [2024, 2025, 2026];

    // Generate weeks based on selected year
    const generateWeeks = () => {
        const weeks = [];
        const d = new Date(selectedYear, 0, 1);
        const startOfFirstWeek = getStartOfWeek(d);

        for (let i = 0; i < 53; i++) {
            const startOfWeek = new Date(startOfFirstWeek);
            startOfWeek.setDate(startOfFirstWeek.getDate() + (i * 7));

            if (startOfWeek.getFullYear() > selectedYear && startOfWeek.getMonth() > 0) break;

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            weeks.push({
                value: formatDateToLocal(startOfWeek),
                label: `${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}/${startOfWeek.getFullYear()} - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1}/${endOfWeek.getFullYear()}`,
                isCurrent: false
            });
        }
        return weeks;
    };

    const weeks = generateWeeks();


    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const year = Number(e.target.value);
        setSelectedYear(year);
        const newDate = new Date(currentDate);
        newDate.setFullYear(year);
        setCurrentDate(newDate);
    };

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
        if (newDate.getFullYear() !== selectedYear) {
            setSelectedYear(newDate.getFullYear());
        }
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
        if (newDate.getFullYear() !== selectedYear) {
            setSelectedYear(newDate.getFullYear());
        }
    };

    const fetchSemesters = async () => {
        try {
            const resp = await apiClient.get('/v1/semesters/active');
            const data = Array.isArray(resp.data) ? resp.data : [];
            // setSemesters(data); // Unused in UI

            if (data.length > 0) {
                const today = new Date();
                // Find a semester that contains today
                const currentSem = data.find(s => {
                    const start = new Date(s.startDate);
                    const end = new Date(s.endDate);
                    return today >= start && today <= end;
                });

                if (currentSem) {
                    setSelectedSemester(currentSem.code);
                } else {
                    // Default to first semester but don't change currentDate
                    setSelectedSemester(data[0].code);
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
            const dateStr = currentDate.toISOString().split('T')[0];
            const data = await timetableService.getStudentTimetable(user.id, dateStr);
            setTimetable(data);
        } catch (error: any) {
            console.error('Failed to fetch timetable:', error);
            if (error.response?.status === 403 || (axios.isAxiosError(error) && error.response?.status === 403)) {
                setIsScheduleHidden(true);
                setTimetable(null);
            } else {
                setTimetable(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const parts = e.target.value.split('-').map(Number);
        const selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
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
        const day = date.getDay();
        if (day === 0) return 'Chủ nhật';
        return `Thứ ${day + 1}`;
    };

    const SLOT_TIMES: Record<number, { start: string; end: string }> = {
        1: { start: '07:15', end: '09:30' },
        2: { start: '09:45', end: '12:00' },
        3: { start: '13:00', end: '15:15' },
        4: { start: '15:30', end: '17:45' },
    };


    const dynamicSlotTimes = useMemo(() => {
        const times: Record<number, { start: string; end: string }> = { ...SLOT_TIMES };
        if (timetable?.days) {
            timetable.days.forEach(day => {
                day.slots?.forEach(slot => {
                    if (slot.slotNumber && slot.startTime && slot.endTime) {
                        times[slot.slotNumber] = {
                            start: slot.startTime.substring(0, 8),
                            end: slot.endTime.substring(0, 8)
                        };
                    }
                });
            });
        }
        return times;
    }, [timetable]);

    const getStatusStyle = (slot?: TimetableSlotDTO) => {
        if (!slot) return 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
        
        const label = getStatusLabel(slot);
        if (label === 'Đã hủy') return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
        if (label === 'Vắng mặt') return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
        if (label === 'Có mặt') return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
        if (label === 'Có phép') return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
        
        return 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    };

    const getStatusLabel = (slot: TimetableSlotDTO) => {
        if (slot.status === 'CANCELLED') return 'Đã hủy';
        
        if (slot.attendanceStatus === 'PRESENT') return 'Có mặt';
        if (slot.attendanceStatus === 'ABSENT') return 'Vắng mặt';
        if (slot.attendanceStatus === 'EXCUSED') return 'Có phép';

        // Auto-calculate for unmarked slots
        if (slot.date && slot.slotNumber) {
            const now = new Date();
            const slotDateStr = slot.date.split('T')[0];
            const times = dynamicSlotTimes[slot.slotNumber];

            if (times) {
                const startTime = new Date(`${slotDateStr}T${times.start}`);
                const threshold = slot.absentThresholdMinutes ?? 15;
                const attendanceDeadline = new Date(startTime.getTime() + threshold * 60000);

                if (now < attendanceDeadline) return 'Chưa điểm danh';
                return 'Vắng mặt';
            }
        }

        return 'Chưa điểm danh';
    };

    const isOngoingSlot = (slot: TimetableSlotDTO) => {
        if (slot.date && slot.slotNumber) {
            const now = new Date();
            const slotDateStr = slot.date.split('T')[0];
            const times = dynamicSlotTimes[slot.slotNumber];
            if (times) {
                const startTime = new Date(`${slotDateStr}T${times.start}`);
                const endTime = new Date(`${slotDateStr}T${times.end}`);
                return now >= startTime && now <= endTime;
            }
        }
        return false;
    };

    const getSlotForCell = (daySlots: TimetableSlotDTO[], slotNumber: number) => {
        return daySlots ? daySlots.find(s => s.slotNumber === slotNumber) : undefined;
    };

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
            const response = await timetableService.exportStudentTimetable(user.id, selectedSemester);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const contentDisposition = response.headers['content-disposition'];
            let fileName = `Schedule_${user.code}_${selectedSemester}.xlsx`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2) fileName = fileNameMatch[1];
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
                <div className="flex flex-col gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-fpt-orange font-bold text-sm mb-1">
                            <CalendarIcon size={16} /> Năm học {selectedYear}-{selectedYear + 1}
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Lịch học theo tuần</h1>
                    </div>

                    <div className="flex items-center justify-between gap-4 p-2 rounded-xl">
                        <div className="flex items-center gap-3">
                            {/* Year Selector */}
                            <div className="relative">
                                <Listbox value={selectedYear} onChange={(val) => handleYearChange({ target: { value: val } } as any)}>
                                    <div className="relative">
                                        <Listbox.Button className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-100 dark:border-orange-800 text-fpt-orange font-bold text-sm transition-all hover:bg-orange-100 dark:hover:bg-orange-900/30">
                                            <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1 whitespace-nowrap">
                                                Lọc:
                                            </span>
                                            <span>{selectedYear}</span>
                                            <ChevronDown size={14} className="text-fpt-orange" />
                                        </Listbox.Button>
                                        <Transition
                                            as={Fragment}
                                            leave="transition ease-in duration-100"
                                            leaveFrom="opacity-100"
                                            leaveTo="opacity-0"
                                        >
                                            <Listbox.Options className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white dark:bg-zinc-800 py-1 text-sm shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-gray-100 dark:border-zinc-700">
                                                {YEARS.map((year) => (
                                                    <Listbox.Option
                                                        key={year}
                                                        className={({ active }) =>
                                                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                                active ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange' : 'text-gray-900 dark:text-gray-200'
                                                            }`
                                                        }
                                                        value={year}
                                                    >
                                                        {({ selected }) => (
                                                            <>
                                                                <span className={`block truncate ${selected ? 'font-bold' : 'font-normal'}`}>
                                                                    {year}
                                                                </span>
                                                                {selected ? (
                                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-fpt-orange">
                                                                        <Check className="h-4 w-4" aria-hidden="true" />
                                                                    </span>
                                                                ) : null}
                                                            </>
                                                        )}
                                                    </Listbox.Option>
                                                ))}
                                            </Listbox.Options>
                                        </Transition>
                                    </div>
                                </Listbox>
                            </div>

                            <div className="flex items-center gap-1">
                                <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-fpt-orange transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                                
                                {/* Week Selector */}
                                <div className="relative min-w-[260px]">
                                    <Listbox value={getCurrentWeekValue()} onChange={(val) => handleWeekChange({ target: { value: val } } as any)}>
                                        <div className="relative">
                                            <Listbox.Button className="flex items-center justify-between w-full gap-2 bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg border border-fpt-orange/50 shadow-sm text-gray-700 dark:text-gray-200 font-medium text-sm transition-all hover:border-fpt-orange focus:ring-2 ring-fpt-orange/20">
                                                <span className="truncate">{weeks.find(w => w.value === getCurrentWeekValue())?.label || 'Chọn tuần'}</span>
                                                <ChevronDown size={14} className="text-gray-400" />
                                            </Listbox.Button>
                                            <Transition
                                                as={Fragment}
                                                leave="transition ease-in duration-100"
                                                leaveFrom="opacity-100"
                                                leaveTo="opacity-0"
                                            >
                                                <Listbox.Options className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white dark:bg-zinc-800 py-1 text-sm shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-gray-100 dark:border-zinc-700">
                                                    {weeks.map((week) => (
                                                        <Listbox.Option
                                                            key={week.value}
                                                            className={({ active }) =>
                                                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                                    active ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange' : 'text-gray-900 dark:text-gray-200'
                                                                }`
                                                            }
                                                            value={week.value}
                                                        >
                                                            {({ selected }) => (
                                                                <>
                                                                    <span className={`block truncate ${selected ? 'font-bold' : 'font-normal'}`}>
                                                                        {week.label}
                                                                    </span>
                                                                    {selected ? (
                                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-fpt-orange">
                                                                            <Check className="h-4 w-4" aria-hidden="true" />
                                                                        </span>
                                                                    ) : null}
                                                                </>
                                                            )}
                                                        </Listbox.Option>
                                                    ))}
                                                </Listbox.Options>
                                            </Transition>
                                        </div>
                                    </Listbox>
                                </div>

                                <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-fpt-orange transition-colors">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

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
                                <p className="text-gray-500 dark:text-gray-400">Vui lòng quay lại sau khi nhà trường công bố lịch học chính thức.</p>
                            </div>
                        ) : timetable && timetable.days ? (
                            <table className="w-full border-collapse min-w-[1000px] table-fixed">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-zinc-800/50">
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800 w-[14%]">Thứ / Ngày</th>
                                        {SLOTS.map((slot) => {
                                            const times = dynamicSlotTimes[slot.id];
                                            const formatTime = (timeStr: string) => timeStr?.slice(0, 5) || '';
                                            const timeRange = times ? `${formatTime(times.start)} - ${formatTime(times.end)}` : slot.time;
                                            return (
                                                <th key={slot.id} className="text-center px-4 py-3 border-b border-l border-gray-100 dark:border-zinc-800 w-[21.5%]">
                                                    <div className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">{slot.label}</div>
                                                    <div className="text-[11px] text-gray-400 mt-1 font-medium">{timeRange}</div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timetable.days.map((day, idx) => (
                                        <tr key={day.date} className={`${idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50/30 dark:bg-zinc-800/20'} group`}>
                                            <td className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 align-middle">
                                                <div className="flex flex-col">
                                                    <div className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{getDayLabel(day.date)}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{formatDateLabel(day.date)}</div>
                                                    {day.date === new Date().toISOString().split('T')[0] && (
                                                        <span className="inline-block mt-1.5 px-2 py-0.5 bg-fpt-orange/10 text-fpt-orange text-[10px] font-black rounded-full w-fit uppercase tracking-wider">Hôm nay</span>
                                                    )}
                                                </div>
                                            </td>
                                            {SLOTS.map((slot) => {
                                                const slotData = getSlotForCell(day.slots, slot.id);
                                                return (
                                                    <td key={`${day.date}-${slot.id}`} className="px-2.5 py-2.5 border-b border-l border-gray-100 dark:border-zinc-800 align-top min-w-[160px]">
                                                        {slotData ? (() => {
                                                            const status = getStatusLabel(slotData);
                                                            const isOngoing = isOngoingSlot(slotData);
                                                            const isAbsent = status === 'Vắng mặt';
                                                            const isPresent = status === 'Có mặt';
                                                            const isExcused = status === 'Có phép';
                                                            const isCancelled = status === 'Đã hủy';

                                                            const borderClass = isOngoing ? 'border-l-[6px] border-fpt-orange' : 'border-l-4 border-fpt-orange';
                                                            const bgClass = isOngoing ? 'bg-orange-50/50' : (isAbsent || isCancelled) ? 'bg-red-50/10' : isPresent ? 'bg-emerald-50/10' : isExcused ? 'bg-amber-50/10' : 'bg-white dark:bg-zinc-900';

                                                            return (
                                                                <div
                                                                    onClick={() => setSelectedSlot(slotData)}
                                                                    className={`relative group rounded-md p-2.5 shadow-sm transition-all cursor-pointer h-[110px] w-full flex flex-col justify-between ${borderClass} ${bgClass} ${isOngoing ? 'ring-1 ring-fpt-orange/30 shadow-[0_0_15px_rgba(255,102,0,0.2)] animate-[pulse-glow_2s_infinite_ease-in-out]' : 'hover:shadow-md'}`}
                                                                >
                                                                    {isOngoing && <style dangerouslySetInnerHTML={{ __html: `@keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 5px rgba(255,102,0,0.2); border-color: rgba(255,102,0,0.8); } 50% { box-shadow: 0 0 18px rgba(255,102,0,0.4); border-color: rgba(255,102,0,1); } }` }} />}
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-1.5">
                                                                            <span className="font-extrabold text-[#001D4A] dark:text-white text-sm leading-tight truncate pr-1" title={slotData.courseName}>{slotData.courseCode}</span>
                                                                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                                                                                isAbsent ? 'bg-red-50/20 text-red-500/80 border-red-100/20' :
                                                                                isPresent ? 'bg-emerald-50/20 text-emerald-500/80 border-emerald-100/20' :
                                                                                isExcused ? 'bg-amber-50/20 text-amber-500/80 border-amber-100/20' :
                                                                                isCancelled ? 'bg-red-50/20 text-red-500/80 border-red-100/20' :
                                                                                isOngoing ? 'bg-fpt-orange/20 text-fpt-orange border-fpt-orange/30' :
                                                                                'bg-slate-50/20 text-slate-400 border-slate-100/20'
                                                                            }`}>
                                                                                {status}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate mb-1">Lớp: {slotData.className}</div>
                                                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate opacity-80">Phòng: {slotData.roomCode || slotData.roomName}</div>
                                                                    </div>
                                                                    <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100 dark:border-zinc-800 text-[9px] font-medium text-gray-400 truncate">
                                                                        {slotData.assignmentId ? (slotData.submissionStatus === 'SUBMITTED' ? <span className="text-green-600">Bài tập: Đã nộp</span> : <span className="text-fpt-orange">Bài tập: Chưa nộp</span>) : <span className="italic">Không có bài tập</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })() : (
                                                            <div 
                                                                className="h-[110px] w-full flex items-center justify-center rounded-md border border-gray-200 dark:border-zinc-700 bg-gray-50/5 shadow-[inset_0_0_10px_rgba(0,0,0,0.01)]"
                                                            >
                                                                <span className="text-gray-300 dark:text-zinc-700 font-bold text-xs">-</span>
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

            {selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { setSelectedSlot(null); setShowLecturerPopup(false); }}>
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div className="bg-fpt-orange px-8 py-6 relative">
                            <h3 className="text-white font-bold text-xl mb-1">Chi tiết buổi học</h3>
                            <p className="text-white/80 text-sm">Thông tin chi tiết lịch trình học tập</p>
                            <button
                                onClick={() => { setSelectedSlot(null); setShowLecturerPopup(false); }}
                                className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-6">
                            
                            {/* Date & Time Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-fpt-orange shrink-0">
                                        <CalendarIcon size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">NGÀY</p>
                                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                                            {selectedSlot.date ? (() => {
                                                const d = new Date(selectedSlot.date);
                                                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} (${getDayLabel(selectedSlot.date)})`;
                                            })() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-fpt-orange shrink-0">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">THỜI GIAN</p>
                                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                                            Slot {selectedSlot.slotNumber} <span className="text-gray-400 font-normal">({selectedSlot.startTime} - {selectedSlot.endTime})</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Course / Class */}
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-fpt-orange mt-1 shrink-0">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">MÔN HỌC / LỚP</p>
                                    <p className="font-bold text-gray-900 dark:text-white text-base leading-tight mb-2">
                                        {selectedSlot.courseName}
                                    </p>
                                    <button
                                        onClick={() => {
                                            if (selectedSlot.className) {
                                                setSelectedSlot(null);
                                                navigate(`/student/classes/${selectedSlot.className}/members`);
                                            }
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-fpt-orange font-bold text-[11px] rounded-full hover:bg-orange-100 transition-colors border border-orange-100 group"
                                        title="Xem danh sách sinh viên"
                                    >
                                        Lớp: {selectedSlot.className}
                                        <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-4px] group-hover:translate-x-0" />
                                    </button>
                                </div>
                            </div>

                            {/* Room & Lecturer Row */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Room */}
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-fpt-orange shrink-0">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">PHÒNG HỌC</p>
                                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                                            {selectedSlot.roomCode || selectedSlot.roomName}
                                        </p>
                                    </div>
                                </div>
                                {/* Lecturer */}
                                <div className="flex items-center gap-4 relative">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-fpt-orange shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">GIẢNG VIÊN</p>
                                        <p 
                                            className={`font-bold text-sm text-gray-900 dark:text-white ${selectedSlot.lecturerName ? 'cursor-pointer hover:text-fpt-orange transition-colors' : ''}`}
                                            onClick={() => {
                                                if (selectedSlot.lecturerName) {
                                                    setShowLecturerPopup(!showLecturerPopup);
                                                }
                                            }}
                                        >
                                            {selectedSlot.lecturerName ? (
                                                <span className="flex items-center gap-1">
                                                    {selectedSlot.lecturerName}
                                                    <ChevronRight size={14} className="text-gray-400" />
                                                </span>
                                            ) : 'Chưa phân công'}
                                        </p>
                                        
                                        {/* Lecturer Info Popup */}
                                        {showLecturerPopup && selectedSlot.lecturerName && (
                                            <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-700 p-4 w-64 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-700 shrink-0 border border-gray-200 dark:border-zinc-600">
                                                        {selectedSlot.lecturerAvatar ? (
                                                            <img src={selectedSlot.lecturerAvatar} alt={selectedSlot.lecturerName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg">
                                                                {selectedSlot.lecturerName.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-900 dark:text-white truncate" title={selectedSlot.lecturerName}>{selectedSlot.lecturerName}</p>
                                                        {selectedSlot.lecturerEmail ? (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={selectedSlot.lecturerEmail}>{selectedSlot.lecturerEmail}</p>
                                                        ) : (
                                                            <p className="text-xs text-gray-400 italic">Chưa có email</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Assignment info section */}
                            {selectedSlot.assignmentId ? (
                                <div
                                    className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-gray-50/80 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-orange-100/50 dark:bg-orange-900/30 flex items-center justify-center shrink-0 text-fpt-orange">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1 w-full">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <p className="text-sm text-fpt-orange font-bold">Bài tập</p>
                                                <p className="font-medium text-gray-800 dark:text-gray-200 text-sm mt-0.5 line-clamp-1">
                                                    {selectedSlot.assignmentTitle}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 shrink-0">
                                                {selectedSlot.submissionStatus === 'SUBMITTED' ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded bg-green-100/80 text-green-700 text-[10px] font-extrabold uppercase tracking-wider">
                                                        Đã nộp
                                                    </span>
                                                ) : selectedSlot.assignmentStatus === 'CLOSED' ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded bg-gray-200 text-gray-600 text-[10px] font-extrabold uppercase tracking-wider">
                                                        Đã đóng
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-600 text-[10px] font-extrabold uppercase tracking-wider">
                                                        Chưa nộp
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <button 
                                                onClick={() => { setSelectedSlot(null); navigate(`/student/assignments/${selectedSlot.assignmentId}`); }} 
                                                className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-1.5 bg-white text-fpt-orange border border-fpt-orange rounded-lg hover:bg-orange-50 transition-colors text-xs font-bold"
                                            >
                                                <FileText className="w-3.5 h-3.5" /> Xem bài tập
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                        </div>

                        {/* Footer Action area */}
                        <div className="bg-gray-50/50 dark:bg-zinc-800/30 px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Điểm danh:</span>
                                <span className={`font-bold uppercase px-3 py-1 rounded text-[11px] border whitespace-nowrap ${getStatusStyle(selectedSlot)}`}>
                                    {getStatusLabel(selectedSlot)}
                                </span>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </StudentLayout>
    );
};
