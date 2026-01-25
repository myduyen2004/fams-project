import React, { useEffect, useState } from 'react';
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
    BookOpen
} from 'lucide-react';
import timetableService, { WeeklyTimetableDTO, TimetableSlotDTO } from '../../services/api/timetableService';

const SLOTS = [
    { id: 1, label: 'Slot 1' },
    { id: 2, label: 'Slot 2' },
    { id: 3, label: 'Slot 3' },
    { id: 4, label: 'Slot 4' },
];

export const StudentSchedulePage: React.FC = () => {
    const [timetable, setTimetable] = useState<WeeklyTimetableDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedSlot, setSelectedSlot] = useState<TimetableSlotDTO | null>(null);
    const [exporting, setExporting] = useState(false);
    const [selectedYear, setSelectedYear] = useState(2025); // Default to 2025 as requested
    const YEARS = [2024, 2025, 2026];

    // Generate weeks for the entire selected year
    const generateWeeks = () => {
        const weeks = [];
        // Start from first Monday of the year (or closest date to Jan 1)
        const d = new Date(selectedYear, 0, 1);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday

        // Loop for ~53 weeks to cover full year
        for (let i = 0; i < 53; i++) {
            const startOfWeek = new Date(d);
            startOfWeek.setDate(diff + (i * 7));

            // Stop if we pushed into next year too far (allow overlap if week starts in Dec)
            if (startOfWeek.getFullYear() > selectedYear && i > 50) break;

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            weeks.push({
                value: startOfWeek.toISOString().split('T')[0],
                label: `${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}/${startOfWeek.getFullYear()} - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1}/${endOfWeek.getFullYear()}`,
                isCurrent: false
            });
        }
        return weeks;
    };

    const weeks = generateWeeks();

    // Find current week value for initial selection if needed, but we rely on currentDate state
    // We update currentDate when selection changes

    useEffect(() => {
        // When year changes, update current date to that year (preserve month/day if possible)
        const newDate = new Date(currentDate);
        newDate.setFullYear(selectedYear);
        setCurrentDate(newDate);
    }, [selectedYear]);

    useEffect(() => {
        fetchTimetable();
    }, [currentDate]);

    const fetchTimetable = async () => {
        try {
            setLoading(true);
            const userStr = localStorage.getItem('user');
            if (!userStr) return;

            const user = JSON.parse(userStr);
            console.log('Fetching schedule for User ID:', user.id, 'Date:', currentDate.toISOString());

            const dateStr = currentDate.toISOString().split('T')[0];
            const data = await timetableService.getStudentTimetable(user.id, dateStr);
            console.log('Schedule Data:', data);
            setTimetable(data);
        } catch (error) {
            console.error('Failed to fetch timetable:', error);
            // Don't show toast on 404 (just means no schedule yet), only real errors
            // toast.error('Không thể tải lịch học');
        } finally {
            setLoading(false);
        }
    };

    const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedDate = new Date(e.target.value);
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

    const getStatusStyle = () => {
        // Uniform Orange Theme for all statuses per user request
        return 'bg-fpt-orange/10 text-fpt-orange border-fpt-orange/30';
    };

    const getStatusLabel = (slot: TimetableSlotDTO) => {
        if (slot.attendanceStatus === 'PRESENT') return 'Có mặt';
        if (slot.attendanceStatus === 'ABSENT') return 'Vắng mặt';

        switch (slot.status) {
            case 'COMPLETED': return 'Chưa diễn ra';
            case 'CANCELLED': return 'Đã hủy';
            case 'SCHEDULED': return 'Chưa diễn ra';
            default: return 'Chưa diễn ra';
        }
    };

    const getSlotForCell = (daySlots: TimetableSlotDTO[], slotNumber: number) => {
        return daySlots ? daySlots.find(s => s.slotNumber === slotNumber) : undefined;
    };

    // Helper to get start of current week date string for select value
    const getCurrentWeekValue = () => {
        const date = new Date(currentDate);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        return monday.toISOString().split('T')[0];
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);

            // Hardcoded semester for now or get from context/dropdown
            const semesterCode = 'SPRING2025';

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
                            <CalendarIcon size={16} /> Năm học {selectedYear}-{selectedYear + 1}
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                            Lịch học theo tuần
                        </h1>
                    </div>

                    {/* Toolbar: Filters (Left) and Export Button (Far Right) */}
                    <div className="flex items-center justify-between gap-4 p-2 rounded-xl">
                        <div className="flex items-center gap-3">
                            {/* Year Filter */}
                            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-100 dark:border-orange-800">
                                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                                    <span className="text-xs">▼</span> Lọc:
                                </span>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="bg-transparent border-none text-fpt-orange font-bold focus:ring-0 cursor-pointer text-sm p-0 pr-6"
                                    style={{ backgroundImage: 'none' }}
                                >
                                    {YEARS.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Week Selector */}
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
                <Card className="min-w-full overflow-x-auto pb-4 border-none shadow-sm dark:shadow-none bg-white dark:bg-zinc-900">
                    <div className="min-w-[1000px]">
                        {loading ? (
                            <div className="flex items-center justify-center p-20">
                                <Loader2 className="w-8 h-8 animate-spin text-fpt-orange" />
                            </div>
                        ) : timetable && timetable.days ? (
                            <>
                                {/* Days Header */}
                                <div className="grid grid-cols-[100px_repeat(7,1fr)] mb-6">
                                    <div className="p-4"></div>
                                    {timetable.days.map((day, index) => (
                                        <div key={index} className="px-2 py-4 border-b-2 border-transparent hover:border-fpt-orange/30 transition-colors group">
                                            <div className="font-bold text-gray-900 dark:text-white text-base mb-1">
                                                {getDayLabel(day.date)}
                                            </div>
                                            <div className="text-sm text-gray-400 font-medium group-hover:text-fpt-orange transition-colors">
                                                {formatDateLabel(day.date)}
                                            </div>
                                            {day.date === new Date().toISOString().split('T')[0] && (
                                                <div className="h-0.5 w-full bg-fpt-orange mt-3 rounded-full"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Slots Rows */}
                                <div className="space-y-4">
                                    {SLOTS.map((slot) => (
                                        <div key={slot.id} className="grid grid-cols-[100px_repeat(7,1fr)] gap-0 group">
                                            <div className="py-2 pr-6 flex items-start justify-end">
                                                <span className="font-bold text-gray-900 dark:text-white text-base">
                                                    {slot.label}
                                                </span>
                                            </div>

                                            {timetable.days.map((day) => {
                                                const slotData = getSlotForCell(day.slots, slot.id);

                                                return (
                                                    <div key={`${slot.id}-${day.date}`} className="px-2 relative min-h-[140px]">
                                                        <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-blue-100 dark:bg-zinc-800 group-hover:bg-blue-200 transition-colors"></div>
                                                        {slotData ? (
                                                            <div
                                                                onClick={() => setSelectedSlot(slotData)}
                                                                className={`
                                                                h-full rounded-xl p-4 border-l-4 transition-all hover:shadow-md cursor-pointer
                                                                border-l-fpt-orange bg-white border border-gray-100 dark:bg-zinc-800 dark:border-zinc-700
                                                            `}>
                                                                {(slotData.status || slotData.attendanceStatus) && (
                                                                    <span className={`
                                                                        inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-2 uppercase
                                                                        ${getStatusStyle()}
                                                                    `}>
                                                                        {getStatusLabel(slotData)}
                                                                    </span>
                                                                )}
                                                                <h4 className="font-bold text-gray-900 dark:text-white text-base mb-2">
                                                                    {slotData.courseCode}
                                                                </h4>
                                                                <div className="space-y-1 text-xs text-gray-500 font-medium">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Clock size={12} strokeWidth={2.5} />
                                                                        {slotData.startTime} - {slotData.endTime}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <MapPin size={12} strokeWidth={2.5} />
                                                                        {slotData.roomCode || slotData.roomName}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </>
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
                                                return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                                            })() : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 flex justify-center pt-1">
                                        <Clock className="text-gray-400" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Slot</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {selectedSlot.slotNumber} <span className="text-gray-400 text-sm font-normal">({selectedSlot.startTime} - {selectedSlot.endTime})</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-8 flex justify-center pt-1">
                                        <BookOpen className="text-gray-400" size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Mã lớp</p>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {selectedSlot.className || selectedSlot.courseCode}
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

                                <div className="flex items-start gap-4 pt-2">
                                    <div className="w-8 flex justify-center pt-1">
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Trạng thái điểm danh:</p>
                                        <span className="font-bold text-gray-900 dark:text-white uppercase">
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
