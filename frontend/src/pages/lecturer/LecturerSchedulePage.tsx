import React, { useEffect, useState, useRef } from 'react';
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
    Plus,
    FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import timetableService, { WeeklyTimetableDTO, TimetableSlotDTO } from '../../services/api/timetableService';
import { assignmentService } from '../../services/api/assignmentService';
import { uploadFile } from '../../services/utils/fileUploadService';
import { useNavigate } from 'react-router-dom';

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
    const [selectedSlot, setSelectedSlot] = useState<TimetableSlotDTO | null>(null);
    const [exporting, setExporting] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Create Assignment Dialog state
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForSlotId, setCreateForSlotId] = useState<number | null>(null);
    const [createForClassName, setCreateForClassName] = useState<string>('');
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [newRefUrl, setNewRefUrl] = useState('');
    const [newRefName, setNewRefName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetCreateForm = () => {
        setNewTitle('');
        setNewDescription('');
        setNewDueDate('');
        setNewRefUrl('');
        setNewRefName('');
        setSelectedFile(null);
        setCreateForSlotId(null);
        setCreateForClassName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File quá lớn. Tối đa 10MB.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        try {
            setUploadingFile(true);
            setSelectedFile(file);
            const result = await uploadFile(file);
            setNewRefUrl(result.secure_url || result.url);
            setNewRefName(file.name);
            toast.success('Upload tài liệu thành công');
        } catch (err: any) {
            toast.error(err.message || 'Upload thất bại');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } finally {
            setUploadingFile(false);
        }
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

    // Generate weeks for the entire selected year
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

    useEffect(() => {
        fetchTimetable();
    }, [currentDate]);

    const fetchTimetable = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;

            const user = JSON.parse(userStr);
            const dateStr = formatDateToLocal(currentDate);
            const data = await timetableService.getLecturerTimetable(user.id, dateStr);
            setTimetable(data);
        } catch (error: any) {
            console.error('Failed to fetch timetable:', error);
            const serverMsg = error.response?.data?.message || error.response?.data?.error || null;
            if (serverMsg) {
                toast.error(`Lỗi server: ${serverMsg}`);
            } else {
                toast.error('Không thể tải thời khóa biểu');
            }
            setTimetable(null);
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

    const getStatusStyle = (status?: string) => {
        if (status === 'CANCELLED') return 'bg-red-50 text-red-600 border-red-100';
        return 'bg-fpt-orange/10 text-fpt-orange border-fpt-orange/30';
    };

    const getStatusLabel = (slot: TimetableSlotDTO) => {
        if (slot.status === 'CANCELLED') return 'Đã hủy';
        return 'Chưa diễn ra';
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
                referenceUrl: newRefUrl.trim() || undefined,
                referenceName: newRefName.trim() || undefined
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


    return (
        <LecturerLayout pageTitle="Lịch giảng dạy">
            <div className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-fpt-orange font-bold text-sm mb-1">
                            <CalendarIcon size={16} /> Năm học {selectedYear}-{selectedYear + 1}
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                            Lịch giảng dạy theo tuần
                        </h1>
                    </div>

                    <div className="flex items-center justify-between gap-4 p-2 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-100 dark:border-orange-800">
                                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-1 whitespace-nowrap">
                                    <span className="text-xs">▼</span> Lọc:
                                </span>
                                <select
                                    value={selectedYear}
                                    onChange={handleYearChange}
                                    className="bg-transparent border-none text-fpt-orange font-bold focus:ring-0 cursor-pointer text-sm p-0 pr-6"
                                    style={{ backgroundImage: 'none' }}
                                >
                                    {YEARS.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

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
                                            <td className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 align-middle">
                                                <div className="flex flex-col">
                                                    <div className="font-bold text-xl text-gray-900 dark:text-white leading-tight">
                                                        {getDayLabel(day.date)}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                                                        {formatDateLabel(day.date)}
                                                    </div>
                                                    {day.date === formatDateToLocal(new Date()) && (
                                                        <span className="inline-block mt-2 px-2 py-0.5 bg-fpt-orange/10 text-fpt-orange text-[10px] font-black rounded-full w-fit uppercase tracking-wider">
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
                                                        className="px-3 py-3 border-b border-l border-gray-100 dark:border-zinc-800 align-middle min-h-[140px]"
                                                    >
                                                        {slotData ? (
                                                            <div
                                                                onClick={() => setSelectedSlot(slotData)}
                                                                className="relative group bg-white dark:bg-zinc-800 rounded-xl p-3 pl-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 dark:border-zinc-700 overflow-hidden"
                                                            >
                                                                <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-fpt-orange" />

                                                                <div className={`
                                                                    inline-block px-1.5 py-0.5 rounded text-[8px] font-black border mb-1 uppercase tracking-tighter
                                                                    ${getStatusStyle(slotData.status)}
                                                                `}>
                                                                    {getStatusLabel(slotData)}
                                                                </div>

                                                                <div className="font-bold text-fpt-orange text-sm mb-1 truncate" title={slotData.courseName}>
                                                                    {slotData.courseCode}
                                                                </div>

                                                                <div className="space-y-0.5 text-[11px] font-medium">
                                                                    <div className="text-gray-500 dark:text-gray-400 leading-tight">
                                                                        Lớp: {slotData.className}
                                                                    </div>
                                                                    <div className="text-gray-500 dark:text-gray-400 truncate">
                                                                        Môn: {slotData.courseName}
                                                                    </div>
                                                                    <div className="text-gray-500 dark:text-gray-400 truncate">
                                                                        Phòng: {slotData.roomCode || slotData.roomName}
                                                                    </div>
                                                                    {slotData.assignmentId && (
                                                                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 mt-1">
                                                                            <FileText size={10} />
                                                                            <span className="truncate">{slotData.assignmentTitle}</span>
                                                                        </div>
                                                                    )}
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
                                <div className="text-gray-500 font-medium text-lg">Không tìm thấy dữ liệu lịch giảng dạy</div>
                                <p className="text-gray-400 text-sm mt-1">Vui lòng chọn tuần khác hoặc liên hệ phòng đào tạo.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedSlot(null)}>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-fpt-orange px-6 py-4 flex items-center justify-between">
                            <h3 className="text-white font-bold text-lg">Chi tiết buổi dạy</h3>
                            <button
                                onClick={() => setSelectedSlot(null)}
                                className="text-white/80 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
                            >
                                <X size={20} />
                            </button>
                        </div>

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
                                        Lớp: {selectedSlot.className} ({selectedSlot.courseCode})
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


                            {/* Assignment info section */}
                            {selectedSlot.assignmentId ? (
                                <div className="flex items-start gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <div className="w-8 flex justify-center pt-1">
                                        <FileText className="text-blue-500" size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Bài tập đã giao</p>
                                        <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">
                                            {selectedSlot.assignmentTitle}
                                        </p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedSlot.assignmentStatus === 'OPEN'
                                            ? 'bg-green-100 text-green-700 border border-green-200'
                                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                                            }`}>
                                            {selectedSlot.assignmentStatus === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-gray-200 dark:border-zinc-700">
                                    <div className="w-8 flex justify-center">
                                        <FileText className="text-gray-300" size={20} />
                                    </div>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">Chưa có bài tập cho buổi này</p>
                                </div>
                            )}

                            <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-zinc-800 mt-2">
                                <div className="flex items-center gap-2 flex-1 justify-between">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Trạng thái:</p>
                                    <span className={`font-bold uppercase px-3 py-1 rounded-full text-xs border ${getStatusStyle(selectedSlot.status)}`}>
                                        {getStatusLabel(selectedSlot)}
                                    </span>
                                </div>
                                {!selectedSlot.assignmentId && (
                                    <button
                                        onClick={handleOpenCreateDialog}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-600 transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={16} /> Tạo bài tập
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/lecturer/attendance/realtime/${selectedSlot.id}`)}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-600 transition-colors flex items-center gap-2"
                                >
                                    Xem danh sách
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Assignment Dialog */}
            {showCreateDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-fpt-orange" /> Tạo bài tập mới
                            </h2>
                            <button onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                    Tiêu đề <span className="text-red-500">*</span>
                                </label>
                                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="VD: Bài tập tuần 3"
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Mô tả</label>
                                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Mô tả chi tiết bài tập..." rows={3}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                    <Clock className="w-3.5 h-3.5 inline mr-1" /> Hạn nộp bài
                                </label>
                                <input type="datetime-local" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                    <BookOpen className="w-3.5 h-3.5 inline mr-1" /> Tài liệu tham khảo
                                </label>
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.png"
                                    className="hidden" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                                    className="w-full px-3 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 text-sm text-gray-500 hover:border-fpt-orange hover:text-fpt-orange transition-colors flex items-center justify-center gap-2">
                                    {uploadingFile ? <><Loader2 size={14} className="animate-spin" /> Đang upload...</> : selectedFile ? <><FileText size={14} /> {selectedFile.name}</> : 'Chọn file (tối đa 10MB)'}
                                </button>
                                {newRefUrl && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                                        <FileText size={12} />
                                        <a href={newRefUrl} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[300px]">{newRefName || 'Xem file'}</a>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-zinc-800">
                            <button onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
                                className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-800 transition-colors">
                                Hủy
                            </button>
                            <button onClick={handleCreate} disabled={creating || !newTitle.trim() || uploadingFile}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-fpt-orange hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                {creating ? <><Loader2 size={16} className="animate-spin" /> Đang tạo...</> : <><Plus className="w-4 h-4" /> Tạo bài tập</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </LecturerLayout>
    );
};
