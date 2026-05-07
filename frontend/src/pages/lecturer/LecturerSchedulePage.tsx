import React, { useEffect, useState, useRef, useMemo } from 'react';

// Static keyframes injected once at module level — avoids dangerouslySetInnerHTML per cell
const PULSE_GLOW_CSS = `@keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 5px rgba(255,102,0,0.2); border-color: rgba(255,102,0,0.8); } 50% { box-shadow: 0 0 18px rgba(255,102,0,0.4); border-color: rgba(255,102,0,1); } }`;
if (typeof document !== 'undefined' && !document.getElementById('pulse-glow-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'pulse-glow-style';
    styleEl.textContent = PULSE_GLOW_CSS;
    document.head.appendChild(styleEl);
}
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { Card } from '../../components/common/Card';
import {
    Clock,
    MapPin,
    Download,
    Calendar as CalendarIcon,
    Loader2,
    X,
    ChevronLeft,
    ChevronRight,
    BookOpen,
    Lock,
    FileText,
    Plus
} from 'lucide-react';
import toast from "@utils/toast";
import timetableService, { WeeklyTimetableDTO, TimetableSlotDTO } from '../../services/api/timetableService';
import { assignmentService, AssignmentDTO } from '../../services/api/assignmentService';
import { scheduleRequestService } from '../../services/api/scheduleRequestService';
import { uploadFile } from '../../services/utils/fileUploadService';
import { useNavigate } from 'react-router-dom';
import { CustomSelect } from '../../components/common/CustomSelect';
import { StaticDateTimePicker } from '../../components/common/StaticDateTimePicker';
import { motion, AnimatePresence } from 'framer-motion';

const SLOTS = [
    { id: 1, label: 'SLOT 1', time: '07:30 - 09:45' },
    { id: 2, label: 'SLOT 2', time: '10:00 - 12:15' },
    { id: 3, label: 'SLOT 3', time: '13:00 - 15:15' },
    { id: 4, label: 'SLOT 4', time: '15:30 - 17:45' },
];

export const LecturerSchedulePage: React.FC = () => {
    const [timetable, setTimetable] = useState<WeeklyTimetableDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isScheduleHidden, setIsScheduleHidden] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<TimetableSlotDTO | null>(null);
    const [exporting, setExporting] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Download Submissions Dialog state
    const [showDownloadDialog, setShowDownloadDialog] = useState(false);
    const [dlClasses, setDlClasses] = useState<string[]>([]);
    const [dlClassName, setDlClassName] = useState<string>('');
    const [dlAssignments, setDlAssignments] = useState<AssignmentDTO[]>([]);
    const [dlAssignmentId, setDlAssignmentId] = useState<number | null>(null);

    const [dlAssignmentTitle, setDlAssignmentTitle] = useState<string>('');
    const [downloadingZip, setDownloadingZip] = useState(false);
    const [loadingDlData, setLoadingDlData] = useState(false);

    // Create Assignment Dialog state
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForSlotId, setCreateForSlotId] = useState<number | null>(null);
    const [createForClassName, setCreateForClassName] = useState<string>('');
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [newRefUrls, setNewRefUrls] = useState<string[]>([]);
    const [newRefNames, setNewRefNames] = useState<string[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetCreateForm = () => {
        setNewTitle('');
        setNewDescription('');
        setNewDueDate('');
        setNewRefUrls([]);
        setNewRefNames([]);
        setCreateForSlotId(null);
        setCreateForClassName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const validFiles = files.filter(f => {
            if (f.size > 10 * 1024 * 1024) {
                toast.error(`File ${f.name} quá lớn. Tối đa 10MB.`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        try {
            setUploadingFile(true);
            const uploadPromises = validFiles.map(file => uploadFile(file));
            const results = await Promise.all(uploadPromises);

            const urls = results.map(r => r.secure_url || r.url);
            const names = validFiles.map(f => f.name);

            setNewRefUrls(prev => [...prev, ...urls]);
            setNewRefNames(prev => [...prev, ...names]);

            toast.success(`Đã upload ${validFiles.length} tài liệu`);
        } catch (err: any) {
            toast.error(err.message || 'Upload thất bại');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setUploadingFile(false);
        }
    };

    const removeNewFile = (index: number) => {
        setNewRefUrls(prev => prev.filter((_, i) => i !== index));
        setNewRefNames(prev => prev.filter((_, i) => i !== index));
    };

    const YEARS = [2024, 2025, 2026];

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

    // Generate weeks for the entire selected year — memoized to avoid 53 object allocations per render
    const weeks = useMemo(() => {
        const weeks: { value: string; label: string; isCurrent: boolean }[] = [];
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
    }, [selectedYear]);

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
            const dateStr = formatDateToLocal(currentDate);
            const data = await timetableService.getLecturerTimetable(user.id, dateStr);
            setTimetable(data);
        } catch (error: any) {
            console.error('Failed to fetch timetable:', error);
            if (error.response && error.response.status === 403) {
                setIsScheduleHidden(true);
                setTimetable(null);
            } else {
                const serverMsg = error.response?.data?.message || error.response?.data?.error || null;
                if (serverMsg) {
                    toast.error(`Lỗi server: ${serverMsg}`);
                } else {
                    toast.error('Không thể tải thời khóa biểu');
                }
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

    const getStatusStyle = (status?: string, slot?: TimetableSlotDTO) => {
        if (status === 'CANCELLED') return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
        if (slot) {
            const label = getStatusLabel(slot);
            if (label === 'Đã kết thúc') return 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
            if (label === 'Đang diễn ra') return 'bg-fpt-orange/20 text-fpt-orange border-fpt-orange/30 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
        }
        return 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    };

    const SLOT_TIMES: Record<number, { start: string; end: string }> = {
        1: { start: '07:15', end: '09:30' },
        2: { start: '09:45', end: '12:00' },
        3: { start: '13:00', end: '15:15' },
        4: { start: '15:30', end: '17:45' },
    };

    const dynamicSlotTimes = React.useMemo(() => {
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

    const getStatusLabel = (slot: TimetableSlotDTO) => {
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
                const times = dynamicSlotTimes[slot.slotNumber];
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

            const dateStr = formatDateToLocal(currentDate);

            const response = await timetableService.exportLecturerTimetable(user.id, undefined, dateStr);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers['content-disposition'];
            let fileName = `Schedule_Lecturer_${user.code}_${dateStr}.xlsx`;
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

    const navigate = useNavigate();

    const handleOpenCreateDialog = () => {
        if (!selectedSlot) return;
        setCreateForSlotId(selectedSlot.id);
        setCreateForClassName(selectedSlot.className || '');
        setShowCreateDialog(true);
    };

    const handleCreate = async () => {
        if (!newTitle.trim()) {
            toast.error('Vui lòng nhập tiêu đề bài tập');
            return;
        }
        const targetClassName = createForClassName || selectedSlot?.className || '';
        if (!targetClassName) {
            toast.error('Không xác định được lớp học');
            return;
        }
        if (newDueDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (new Date(newDueDate) < today) {
                toast.error('Hạn nộp bài phải từ hôm nay trở đi');
                return;
            }
        }
        try {
            setCreating(true);
            await assignmentService.createAssignment({
                className: targetClassName,
                timetableSlotId: createForSlotId || undefined,
                title: newTitle.trim(),
                description: newDescription.trim() || undefined,
                dueDate: newDueDate || undefined,
                referenceUrls: newRefUrls,
                referenceNames: newRefNames
            });
            toast.success('Đã tạo bài tập thành công');
            setShowCreateDialog(false);
            setSelectedSlot(null);
            resetCreateForm();
            fetchTimetable(); // Refresh to show new assignment indicator
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể tạo bài tập');
        } finally {
            setCreating(false);
        }
    };

    // Download submissions helpers
    const handleOpenDownloadDialog = async () => {
        setDlClassName('');
        setDlAssignmentId(null);

        setDlAssignmentTitle('');
        setDlAssignments([]);
        setShowDownloadDialog(true);
        try {
            setLoadingDlData(true);
            const classes = await scheduleRequestService.getClasses();
            setDlClasses(classes);
        } catch {
            toast.error('Không thể tải danh sách lớp');
        } finally {
            setLoadingDlData(false);
        }
    };

    const handleDlClassChange = async (className: string) => {
        setDlClassName(className);
        setDlAssignmentId(null);

        setDlAssignmentTitle('');
        setDlAssignments([]);
        if (!className) return;
        try {
            setLoadingDlData(true);
            const assignments = await assignmentService.getAssignmentsByClass(className);
            setDlAssignments(assignments);
        } catch {
            toast.error('Không thể tải danh sách bài tập');
        } finally {
            setLoadingDlData(false);
        }
    };

    const handleDlAssignmentChange = (assignmentIdStr: string) => {
        const aid = Number(assignmentIdStr);
        setDlAssignmentId(aid || null);
        const found = dlAssignments.find(a => a.id === aid);

        setDlAssignmentTitle(found?.title || '');
    };

    const handleDownloadSubmissions = async () => {
        if (!dlAssignmentId) return;
        try {
            setDownloadingZip(true);
            const blob = await assignmentService.downloadAllSubmissions(dlAssignmentId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${dlClassName}_${dlAssignmentTitle}_submissions.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Đã tải bài nộp thành công');
            setShowDownloadDialog(false);
        } catch (err: any) {
            let msg = 'Không thể tải bài nộp';
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const json = JSON.parse(text);
                    msg = json.message || json.error || msg;
                } catch { /* ignore parse error */ }
            } else if (err.response?.data?.message) {
                msg = err.response.data.message;
            }
            toast.error(msg);
        } finally {
            setDownloadingZip(false);
        }
    };


    return (
        <LecturerLayout pageTitle="Lịch giảng dạy">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-fpt-orange rounded-full" />
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Lịch giảng dạy theo tuần</h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium ml-5 flex items-center gap-2">
                            <CalendarIcon size={16} className="text-fpt-orange" /> Năm học {selectedYear}-{selectedYear + 1}
                        </p>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex flex-wrap items-end gap-6">
                        {/* Year Selector */}
                        <div className="w-full md:w-48">
                            <CustomSelect
                                label="Năm học"
                                value={selectedYear.toString()}
                                onChange={(val) => handleYearChange({ target: { value: val } } as any)}
                                options={YEARS.map(year => ({ label: year.toString(), value: year.toString() }))}
                            />
                        </div>

                        {/* Week Navigation */}
                        <div className="flex items-end gap-2">
                            <div className="flex items-end gap-2 pb-0.5">
                                <button
                                    onClick={handlePrevWeek}
                                    className="h-[52px] w-[52px] flex items-center justify-center rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-fpt-orange hover:border-fpt-orange/40 hover:shadow-lg transition-all active:scale-95 shrink-0"
                                    title="Tuần trước"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="w-full md:w-80">
                                    <CustomSelect
                                        label="Tuần"
                                        value={getCurrentWeekValue()}
                                        onChange={(val) => handleWeekChange({ target: { value: val } } as any)}
                                        options={weeks.map(week => ({ label: week.label, value: week.value }))}
                                    />
                                </div>
                                <button
                                    onClick={handleNextWeek}
                                    className="h-[52px] w-[52px] flex items-center justify-center rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-fpt-orange hover:border-fpt-orange/40 hover:shadow-lg transition-all active:scale-95 shrink-0"
                                    title="Tuần sau"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {!isScheduleHidden && (
                        <div className="flex items-end gap-3 pb-0.5">
                            <button
                                onClick={handleOpenDownloadDialog}
                                className="flex h-[52px] items-center gap-2 px-6 bg-white dark:bg-zinc-900 text-fpt-orange border-2 border-fpt-orange/20 rounded-2xl font-bold text-sm hover:border-fpt-orange hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
                            >
                                <Download size={18} />
                                <span>Bài nộp</span>
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className={`flex h-[52px] items-center gap-2 px-8 bg-fpt-orange text-white rounded-2xl font-bold text-sm shadow-lg shadow-fpt-orange/20 hover:bg-orange-600 transition-all active:scale-95 whitespace-nowrap ${exporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                <span>{exporting ? 'Đang xuất...' : 'Xuất file'}</span>
                            </button>
                        </div>
                    )}
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
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Lịch giảng dạy chưa được công bố</h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    Vui lòng quay lại sau khi nhà trường công bố lịch dạy chính thức.
                                </p>
                            </div>
                        ) : timetable && timetable.days ? (
                            <table className="w-full border-collapse min-w-[1000px] table-fixed">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-zinc-800/50">
                                        <th className="px-4 py-5 text-black dark:text-white text-left w-[14%] text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Thứ / Ngày
                                        </th>
                                        {SLOTS.map((slot) => {
                                            const times = dynamicSlotTimes[slot.id];
                                            const formatTime = (timeStr: string) => timeStr?.slice(0, 5) || '';
                                            const timeRange = times ? `${formatTime(times.start)} - ${formatTime(times.end)}` : slot.time;
                                            return (
                                                <th
                                                    key={slot.id}
                                                    className="text-center px-4 py-3 border-b border-l border-gray-100 dark:border-zinc-800 w-[21.5%]"
                                                >
                                                    <div className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                                                        {slot.label}
                                                    </div>
                                                    <div className="text-[11px] text-black dark:text-white/80 mt-1 font-medium">
                                                        {timeRange}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timetable.days.map((day, idx) => (
                                        <tr
                                            key={day.date}
                                            className={`${idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50/30 dark:bg-zinc-800/20'} group`}
                                        >
                                            <td className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 align-middle">
                                                <div className="flex flex-col">
                                                    <div className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                                                        {getDayLabel(day.date)}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                                        {formatDateLabel(day.date)}
                                                    </div>
                                                    {day.date === formatDateToLocal(new Date()) && (
                                                        <span className="inline-block mt-1.5 px-2 py-0.5 bg-fpt-orange/10 text-fpt-orange text-[10px] font-black rounded-full w-fit uppercase tracking-wider">
                                                            Hôm nay
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {SLOTS.map((slot) => {
                                                const slotData = getSlotForCell(day.slots, slot.id);
                                                return (
                                                    <td
                                                        key={`${day.date}-${slot.id}`}
                                                        className="px-2.5 py-2.5 border-b border-l border-gray-100 dark:border-zinc-800 align-top min-w-[160px]"
                                                    >
                                                        {slotData ? (() => {
                                                            const status = getStatusLabel(slotData);
                                                            const isOngoing = isOngoingSlot(slotData);
                                                            const isCancelled = status === 'Đã hủy';
                                                            const isFinished = status === 'Đã kết thúc';

                                                            const borderClass = isOngoing ? 'border-l-[6px] border-fpt-orange' : 'border-l-4 border-fpt-orange';
                                                            const bgClass = isOngoing ? 'bg-orange-50/50' : isFinished || isCancelled ? 'bg-gray-50/50' : 'bg-white dark:bg-zinc-900';

                                                            return (
                                                                <div
                                                                    onClick={() => setSelectedSlot(slotData)}
                                                                    className={`relative group rounded-md p-2.5 shadow-sm transition-all cursor-pointer h-[110px] w-full flex flex-col justify-between ${borderClass} ${bgClass} ${isOngoing ? 'ring-1 ring-fpt-orange/30 shadow-[0_0_15px_rgba(255,102,0,0.2)] animate-[pulse-glow_2s_infinite_ease-in-out]' : 'hover:shadow-md'}`}
                                                                >
                                                                    {isOngoing && <div className="absolute inset-0 rounded-md pointer-events-none ring-1 ring-fpt-orange/30" />}
                                                                    <div>
                                                                        <div className="flex items-center justify-between mb-1.5">
                                                                            <span className="font-extrabold text-[#001D4A] dark:text-white text-sm leading-tight truncate pr-1" title={slotData.courseName}>{slotData.courseCode}</span>
                                                                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${isCancelled ? 'bg-red-50/20 text-red-500/80 border border-red-100/20' :
                                                                                isFinished ? 'bg-gray-100 text-gray-500 border border-gray-200' :
                                                                                    isOngoing ? 'bg-fpt-orange/20 text-fpt-orange border border-fpt-orange/30' :
                                                                                        'bg-slate-50/20 text-slate-400 border border-slate-100/20'
                                                                                }`}>
                                                                                {status}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate mb-1">Lớp: {slotData.className}</div>
                                                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate opacity-80">Phòng: {slotData.roomCode || slotData.roomName}</div>
                                                                    </div>
                                                                    <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100 dark:border-zinc-800 text-[9px] font-medium text-gray-400 truncate">
                                                                        {slotData.assignmentId ? (slotData.assignmentStatus === 'CLOSED' ? <span className="text-gray-500">Bài tập: Đã đóng</span> : <span className="text-green-600">Bài tập: Đang mở</span>) : <span className="italic">Không có bài tập</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })() : (
                                                            <div className="h-[110px] w-full flex items-center justify-center rounded-md border border-gray-200 dark:border-zinc-700 bg-gray-50/5 shadow-[inset_0_0_10px_rgba(0,0,0,0.01)]">
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
                                <div className="text-gray-500 font-medium text-lg">Không tìm thấy dữ liệu lịch giảng dạy</div>
                                <p className="text-gray-400 text-sm mt-1">Vui lòng chọn tuần khác hoặc liên hệ phòng đào tạo.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedSlot(null)}>
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="bg-fpt-orange px-8 py-6 relative">
                            <h3 className="text-white font-bold text-xl mb-1">Chi tiết buổi dạy</h3>
                            <p className="text-white/80 text-sm">Thông tin chi tiết lịch trình giảng dạy</p>
                            <button
                                onClick={() => setSelectedSlot(null)}
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
                                        onClick={() => navigate(`/lecturer/classes/${selectedSlot.className}`)}
                                        className="inline-block px-3 py-1 bg-orange-50 text-fpt-orange font-bold text-[11px] rounded-full hover:bg-orange-100 transition-colors border border-orange-100"
                                    >
                                        Lớp: {selectedSlot.className}
                                    </button>
                                </div>
                            </div>

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

                            {/* Assignment info section */}
                            {selectedSlot.assignmentId ? (
                                <div
                                    className="mt-6 flex items-center gap-4 p-4 bg-gray-50/80 dark:bg-zinc-800/50 rounded-2xl cursor-pointer hover:bg-orange-50/50 transition-colors border border-gray-100 dark:border-zinc-800"
                                    onClick={() => navigate(`/lecturer/assignments/${selectedSlot.assignmentId}`)}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-orange-100/50 dark:bg-orange-900/30 flex items-center justify-center shrink-0 text-fpt-orange">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-fpt-orange font-bold">Bài tập đã giao</p>
                                        <p className="font-medium text-gray-800 dark:text-gray-200 text-sm mt-0.5">
                                            {selectedSlot.assignmentTitle}
                                        </p>
                                        <div className="mt-2">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${selectedSlot.assignmentStatus === 'OPEN'
                                                ? 'bg-green-100/80 text-green-700'
                                                : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                {selectedSlot.assignmentStatus === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-gray-300" size={20} />
                                </div>
                            ) : null}

                        </div>

                        {/* Footer Action area */}
                        <div className="bg-gray-50/50 dark:bg-zinc-800/30 px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Trạng thái:</span>
                                <span className={`font-bold uppercase px-3 py-1 rounded text-[11px] border whitespace-nowrap ${getStatusStyle(selectedSlot.status, selectedSlot)}`}>
                                    {getStatusLabel(selectedSlot)}
                                </span>
                            </div>

                            <div className="flex gap-3 w-full sm:w-auto">
                                {!selectedSlot.assignmentId && (
                                    <button
                                        onClick={handleOpenCreateDialog}
                                        className="flex-1 sm:flex-none px-3 sm:px-5 py-2.5 bg-white text-fpt-orange border border-fpt-orange rounded-xl text-sm font-bold hover:bg-orange-50 transition-colors flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
                                    >
                                        <Plus size={16} /> Tạo bài tập
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/lecturer/attendance/realtime/${selectedSlot.id}`)}
                                    className="flex-1 sm:flex-none px-3 sm:px-5 py-2.5 bg-fpt-orange text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-colors flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap"
                                >
                                    Xem danh sách <span className="font-normal">→</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Create Assignment Dialog - Premium "Regular" Design */}
            <AnimatePresence>
                {showCreateDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl w-full max-w-4xl border border-gray-100 dark:border-zinc-800 max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            <div className="flex items-center justify-between p-8 border-b border-gray-50 dark:border-zinc-800/50 sticky top-0 bg-white dark:bg-zinc-900 z-10">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                    <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-xl">
                                        <Plus className="w-5 h-5 text-fpt-orange" />
                                    </div>
                                    Tạo bài tập mới
                                </h2>
                                <button
                                    onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
                                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                    <div className="space-y-6">
                                        {/* Class Info (Read-only in Schedule context) */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 ml-1">
                                                Lớp học
                                            </label>
                                            <div className="flex items-center justify-between w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50 px-4 text-left transition-all">
                                                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                    {createForClassName}
                                                </span>
                                                <Lock size={14} className="text-gray-400" />
                                            </div>
                                        </div>

                                        {/* Slot Info - Enhanced View */}
                                        <div className="grid grid-cols-3 gap-3 p-4 bg-orange-50/30 dark:bg-orange-950/5 border border-orange-100/50 dark:border-orange-900/20 rounded-2xl">
                                            <div className="text-center">
                                                <div className="text-[9px] uppercase font-black tracking-widest text-orange-400 dark:text-orange-500 mb-1">Ngày</div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">
                                                    {selectedSlot?.date ? new Date(selectedSlot.date).toLocaleDateString('vi-VN') : '—'}
                                                </div>
                                            </div>
                                            <div className="text-center border-x border-orange-100 dark:border-orange-900/20">
                                                <div className="text-[9px] uppercase font-black tracking-widest text-orange-400 dark:text-orange-500 mb-1">Slot</div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{selectedSlot?.slotNumber || '—'}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[9px] uppercase font-black tracking-widest text-orange-400 dark:text-orange-500 mb-1">Phòng</div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{selectedSlot?.roomCode || '—'}</div>
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 ml-1">
                                                Tiêu đề <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={newTitle}
                                                onChange={e => setNewTitle(e.target.value)}
                                                placeholder="VD: Bài tập tuần 3"
                                                className="w-full px-4 h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40"
                                            />
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 ml-1">Mô tả</label>
                                            <textarea
                                                value={newDescription}
                                                onChange={e => setNewDescription(e.target.value)}
                                                placeholder="Mô tả chi tiết bài tập..."
                                                rows={3}
                                                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 resize-none"
                                            />
                                        </div>

                                        {/* Reference File */}
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 ml-1">
                                                <BookOpen className="w-3.5 h-3.5 inline mr-1 mb-0.5" /> Tài liệu tham khảo
                                            </label>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileSelect}
                                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.png"
                                                multiple
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingFile}
                                                className="w-full px-4 h-[52px] rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50 text-sm font-bold text-gray-500 hover:border-fpt-orange hover:text-fpt-orange transition-all flex items-center justify-center gap-2"
                                            >
                                                {uploadingFile ? <><Loader2 size={16} className="animate-spin" /> Đang upload...</> : <><Plus size={16} /> Thêm tài liệu</>}
                                            </button>

                                            {newRefUrls.length > 0 && (
                                                <div className="mt-4 space-y-2">
                                                    {newRefUrls.map((url, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100/50 dark:border-orange-900/20 group">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                                                                    <FileText size={14} className="text-blue-500" />
                                                                </div>
                                                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-gray-700 dark:text-zinc-300 hover:text-fpt-orange underline truncate">
                                                                    {newRefNames[idx] || `Tài liệu ${idx + 1}`}
                                                                </a>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeNewFile(idx)}
                                                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors rounded-lg"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="sticky top-0">
                                        <StaticDateTimePicker
                                            label="Hạn nộp bài *"
                                            value={newDueDate}
                                            onChange={setNewDueDate}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-gray-50 dark:border-zinc-800/50 bg-gray-50/30 dark:bg-zinc-800/20 sticky bottom-0 z-10">
                                <button
                                    onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
                                    className="px-6 h-[48px] text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={creating || !newTitle.trim() || uploadingFile}
                                    className="inline-flex items-center gap-2 px-8 h-[48px] bg-fpt-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-black tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                                >
                                    {creating ? <><Loader2 size={18} className="animate-spin" /> Đang tạo...</> : <><Plus className="w-4 h-4" /> Tạo bài tập</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Download Submissions Dialog */}
            {showDownloadDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-xl border border-gray-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Download className="w-5 h-5 text-fpt-orange" /> Tải bài nộp theo slot
                            </h2>
                            <button onClick={() => setShowDownloadDialog(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                    Lớp học <span className="text-red-500">*</span>
                                </label>
                                <CustomSelect
                                    value={dlClassName}
                                    onChange={handleDlClassChange}
                                    options={[
                                        { value: '', label: '-- Chọn lớp --' },
                                        ...(loadingDlData && !dlClasses.length ? [{ value: 'loading', label: 'Đang tải...', disabled: true }] : dlClasses.map(c => ({ value: c, label: c })))
                                    ]}
                                    className="bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                                />
                            </div>

                            {dlClassName && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                        Bài tập <span className="text-red-500">*</span>
                                    </label>
                                    <CustomSelect
                                        value={dlAssignmentId?.toString() || ''}
                                        onChange={handleDlAssignmentChange}
                                        options={[
                                            { value: '', label: '-- Chọn bài tập --' },
                                            ...(loadingDlData ? [{ value: 'loading', label: 'Đang tải...', disabled: true }] : dlAssignments.map(a => ({ value: a.id.toString(), label: `${a.title} (${a.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'})` })))
                                        ]}
                                        className="bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                                    />
                                </div>
                            )}



                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-zinc-800">
                            <button onClick={() => setShowDownloadDialog(false)}
                                className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-800 transition-colors">
                                Hủy
                            </button>
                            <button
                                onClick={handleDownloadSubmissions}
                                disabled={!dlAssignmentId || downloadingZip}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-fpt-orange hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                {downloadingZip ? <><Loader2 size={16} className="animate-spin" /> Đang tải...</> : <><Download className="w-4 h-4" /> Tải xuống</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </LecturerLayout>
    );
};


