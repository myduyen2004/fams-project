import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StudentLayout } from '../../layouts/StudentLayout';
import { Card } from '../../components/common/Card';
import { useLocation } from 'react-router-dom';
import { 
    CalendarCheck,
    ChevronDown, 
    Check, 
    Loader2, 
    AlertCircle, 
    Search,
    ChevronLeft,
    Clock,
    MapPin,
    User as UserIcon,
    PieChart,
    CheckCircle2,
    XCircle,
    HelpCircle
} from 'lucide-react';
import attendanceService, { 
    StudentAttendanceSummaryResponse, 
    IndividualAttendanceDetail,
} from '../../services/api/attendanceService';
import { lecturerClassService } from '../../services/api/LecturerClass';

interface SemesterOption {
    id: number;
    name: string;
    code: string;
    status: string;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'PRESENT': return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
        case 'ABSENT': return 'text-red-600 bg-red-50 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
        case 'EXCUSED': return 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50';
        case 'FUTURE': return 'text-gray-400 bg-gray-50 border-gray-100 dark:bg-zinc-800/50 dark:text-zinc-500 dark:border-zinc-700/50';
        default: return 'text-gray-400 bg-gray-50 border-gray-100';
    }
};

const getStatusText = (status: string) => {
    switch (status) {
        case 'PRESENT': return 'Có mặt';
        case 'ABSENT': return 'Vắng';
        case 'EXCUSED': return 'Có phép';
        case 'FUTURE': return 'Chưa diễn ra';
        default: return status;
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'PRESENT': return <CheckCircle2 size={14} />;
        case 'ABSENT': return <XCircle size={14} />;
        case 'EXCUSED': return <HelpCircle size={14} />;
        default: return <Clock size={14} />;
    }
};

export const StudentAttendancePage: React.FC = () => {
    // State
    const [semesters, setSemesters] = useState<SemesterOption[]>([]);
    const [selectedSemesterCode, setSelectedSemesterCode] = useState<string>('');
    const [summary, setSummary] = useState<StudentAttendanceSummaryResponse | null>(null);
    const [detailData, setDetailData] = useState<IndividualAttendanceDetail | null>(null);
    const [selectedClassName, setSelectedClassName] = useState<string | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // UI State
    const [isSemesterOpen, setIsSemesterOpen] = useState(false);
    const semesterDropdownRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    // Handle incoming navigation state
    useEffect(() => {
        const state = location.state as { selectedClassName?: string };
        if (state?.selectedClassName) {
            setSelectedClassName(state.selectedClassName);
        }
    }, [location]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (semesterDropdownRef.current && !semesterDropdownRef.current.contains(event.target as Node)) {
                setIsSemesterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initial load
    useEffect(() => {
        fetchSemesters();
    }, []);

    // Fetch summary when semester changes
    useEffect(() => {
        if (selectedSemesterCode) {
            fetchSummary(selectedSemesterCode);
            
            // Only reset if we didn't just come from navigation with a specific class
            if (!location.state?.selectedClassName) {
                setSelectedClassName(null);
            }
            setDetailData(null);
        }
    }, [selectedSemesterCode, location.state]);

    // Fetch detail when class selected
    useEffect(() => {
        if (selectedClassName) {
            fetchDetail(selectedClassName);
        }
    }, [selectedClassName]);

    const fetchSemesters = async () => {
        try {
            setLoading(true);
            const data = await lecturerClassService.getSemesters();
            const options = data.map(s => ({ id: s.id, name: s.name, code: s.code, status: s.status }));
            setSemesters(options);
            
            // Default to ongoing semester, or first if no ongoing
            if (options.length > 0) {
                const ongoing = options.find(s => s.status === 'ONGOING');
                setSelectedSemesterCode(ongoing ? ongoing.code : options[0].code);
            }
        } catch (err) {
            console.error('Error fetching semesters:', err);
            setError('Không thể tải danh sách học kỳ');
            setLoading(false);
        }
    };

    const fetchSummary = async (code: string) => {
        try {
            setLoading(true);
            setError(null);
            const data = await attendanceService.getStudentReport(code);
            setSummary(data);
        } catch (err) {
            console.error('Error fetching summary:', err);
            setError('Không thể tải dữ liệu điểm danh');
        } finally {
            setLoading(false);
        }
    };

    const fetchDetail = async (className: string) => {
        try {
            setDetailLoading(true);
            const data = await attendanceService.getStudentClassAttendanceDetail(className);
            setDetailData(data);
        } catch (err) {
            console.error('Error fetching detail:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    const filteredSummaries = useMemo(() => {
        if (!summary) return [];
        return summary.classSummaries.filter(cs => 
            cs.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cs.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cs.courseCode.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [summary, searchQuery]);


    const stats = useMemo(() => {
        if (!summary) return { totalHeld: 0, totalSlots: 0, present: 0, absent: 0, percent: 0 };
        const totalHeld = summary.classSummaries.reduce((acc, curr) => acc + curr.totalSessionsHeld, 0);
        const totalSlots = summary.classSummaries.reduce((acc, curr) => acc + (curr.totalSlots || 0), 0);
        const present = summary.classSummaries.reduce((acc, curr) => acc + curr.presentCount, 0);
        const absent = summary.classSummaries.reduce((acc, curr) => acc + curr.unexcusedAbsentCount, 0);
        const excused = summary.classSummaries.reduce((acc, curr) => acc + curr.excusedAbsentCount, 0);
        const percent = totalHeld > 0 ? ((present + excused) / totalHeld) * 100 : 100;
        return { totalHeld, totalSlots, present, absent, percent };
    }, [summary]);

    if (loading && !summary) {
        return (
            <StudentLayout pageTitle="Điểm danh">
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-fpt-orange" />
                    <p className="text-gray-500 dark:text-gray-400">Đang tải dữ liệu điểm danh...</p>
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout pageTitle="Điểm danh">
            <div className="space-y-6 pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-fpt-orange font-bold text-sm mb-1 uppercase tracking-wider">
                            <CalendarCheck size={16} /> Quản lý chuyên cần
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {selectedClassName ? 'Chi tiết điểm danh' : 'Kết quả điểm danh'}
                        </h1>
                    </div>

                    {!selectedClassName && (
                        <div className="w-full md:w-64" ref={semesterDropdownRef}>
                            <div className="relative">
                                    <button
                                        onClick={() => setIsSemesterOpen(!isSemesterOpen)}
                                        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-fpt-orange/20 transition-all shadow-sm group hover:border-fpt-orange/30 min-w-[140px] justify-between"
                                    >
                                        <div className="flex flex-col text-left">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                {semesters.find(s => s.code === selectedSemesterCode)?.name || 'Chọn học kỳ'}
                                            </span>
                                        </div>
                                        <ChevronDown className={`h-4 w-4 text-gray-400 group-hover:text-fpt-orange transition-transform duration-300 ${isSemesterOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                {isSemesterOpen && (
                                    <div className="absolute z-30 mt-2 w-full rounded-xl border border-gray-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-1">
                                            {semesters.map((s) => (
                                                <button
                                                    key={s.code}
                                                    onClick={() => {
                                                        setSelectedSemesterCode(s.code);
                                                        setIsSemesterOpen(false);
                                                    }}
                                                    className={`flex w-full items-center justify-between px-4 py-2 rounded-lg text-left transition-colors ${selectedSemesterCode === s.code
                                                        ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange font-bold'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                                                        }`}
                                                >
                                                    <span className="text-sm">{s.name}</span>
                                                    {selectedSemesterCode === s.code && <Check size={16} strokeWidth={3} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Statistics Simplified */}
                {!selectedClassName && summary && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: 'Đã học / Tổng', value: `${stats.totalHeld} / ${stats.totalSlots}`, icon: Clock, color: 'orange' },
                            { label: 'Số buổi có mặt', value: stats.present, icon: CheckCircle2, color: 'emerald' },
                            { label: 'Số buổi vắng', value: stats.absent, icon: XCircle, color: 'red' },
                            { label: 'Tỉ lệ tham gia', value: `${stats.percent.toFixed(1)}%`, icon: PieChart, color: 'blue' }
                        ].map((item, i) => (
                            <div key={i} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                                <div className={`w-8 h-8 rounded-lg bg-${item.color}-50 dark:bg-${item.color}-900/10 flex items-center justify-center text-${item.color}-500`}>
                                    <item.icon size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
                                    <p className={`text-base font-extrabold ${item.color === 'emerald' ? 'text-emerald-600' : item.color === 'red' ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                        {item.value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 border border-red-100 dark:border-red-900/30">
                        <AlertCircle size={20} />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {/* OVERVIEW MODE */}
                {!selectedClassName ? (
                    <div className="space-y-6">
                        {/* Filters & Stats */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 max-w-xs">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text"
                                    placeholder="Tìm kiếm môn học, mã lớp..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-fpt-orange/20 transition-all shadow-sm text-sm"
                                />
                            </div>
                        </div>

                        {/* Attendance Summary Table */}
                        <Card className="overflow-hidden border-none shadow-sm dark:shadow-none bg-white dark:bg-zinc-900 p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-700">
                                            <th className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px]">Thông tin Lớp/Môn</th>
                                            <th className="px-4 py-4 font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px] text-center">Tổng buổi</th>
                                            <th className="px-4 py-4 font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px] text-center">Đã học</th>
                                            <th className="px-4 py-4 font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider text-[11px] text-center">Có mặt</th>
                                            <th className="px-4 py-4 font-bold text-red-600 dark:text-red-500 uppercase tracking-wider text-[11px] text-center">Vắng</th>
                                            <th className="px-4 py-4 font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px] text-center">Chuyên cần</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                                        {filteredSummaries.length > 0 ? (
                                            filteredSummaries.map((cs) => (
                                                <tr 
                                                    key={cs.className} 
                                                    onClick={() => setSelectedClassName(cs.className)}
                                                    className="hover:bg-gray-100/80 dark:hover:bg-zinc-800/80 transition-all cursor-pointer group border-b border-gray-50 dark:border-zinc-800/50 last:border-none"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-900 dark:text-white mb-0.5 group-hover:text-fpt-orange transition-colors">{cs.courseName}</span>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-[10px] font-bold text-fpt-orange bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">
                                                                    {cs.courseCode}
                                                                </span>
                                                                <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">{cs.className.split('-')[0]}</span>
                                                                <span className="text-gray-400 dark:text-zinc-600 px-1">•</span>
                                                                <span className="text-gray-500 dark:text-zinc-500 text-xs italic">GV: {cs.lecturerName}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center font-medium text-gray-600 dark:text-zinc-400">{cs.totalSlots}</td>
                                                    <td className="px-4 py-4 text-center font-medium text-gray-600 dark:text-zinc-400">{cs.totalSessionsHeld}</td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold">
                                                            {cs.presentCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold">
                                                            {cs.unexcusedAbsentCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`text-sm font-bold ${cs.absentPercentage >= 20 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                                                {cs.attendancePercentage}%
                                                            </span>
                                                            <div className="w-16 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full ${cs.absentPercentage >= 20 ? 'bg-red-500' : 'bg-fpt-orange'}`}
                                                                    style={{ width: `${cs.attendancePercentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-zinc-400">
                                                    Không tìm thấy môn học nào
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                ) : (
                    /* DETAIL MODE */
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Back button */}
                        <button 
                            onClick={() => setSelectedClassName(null)}
                            className="flex items-center gap-2 text-gray-500 hover:text-fpt-orange transition-colors font-semibold text-sm"
                        >
                            <ChevronLeft size={18} /> Quay lại danh sách
                        </button>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Class Info Side Panel */}
                            <div className="lg:col-span-1 space-y-6">
                                <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-orange-100/20 p-6 space-y-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                                            {detailData?.courseName}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs font-bold text-fpt-orange bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded uppercase">
                                                {detailData?.courseCode}
                                            </span>
                                            <span className="text-gray-500 dark:text-zinc-500 text-sm font-medium">#{detailData?.className.split('-')[0]}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-zinc-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/10 flex items-center justify-center text-fpt-orange">
                                                <UserIcon size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Giảng viên</p>
                                                <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                                                    {detailData?.slots[0]?.lecturerName || 'Đang cập nhật'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/10 flex items-center justify-center text-blue-500">
                                                <PieChart size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Trạng thái vắng</p>
                                                {summary?.classSummaries.find(cs => cs.className === selectedClassName) && (() => {
                                                    const s = summary.classSummaries.find(cs => cs.className === selectedClassName)!;
                                                    return (
                                                        <p className={`text-sm font-bold ${s.absentPercentage >= 20 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                            {s.unexcusedAbsentCount}/{s.totalSlots} buổi ({s.absentPercentage}% {s.absentPercentage >= 20 ? '🚨' : ''})
                                                        </p>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Attendance Log Table */}
                            <div className="lg:col-span-2 space-y-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock size={18} className="text-fpt-orange" /> Nhật ký điểm danh
                                </h3>
                                
                                {detailLoading ? (
                                    <div className="flex items-center justify-center p-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-fpt-orange" />
                                    </div>
                                ) : (
                                    <Card className="overflow-hidden border-none shadow-sm dark:shadow-none bg-white dark:bg-zinc-900 p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead>
                                                    <tr className="bg-gradient-to-r from-fpt-orange to-orange-500">
                                                        <th className="px-6 py-4 font-bold text-white uppercase tracking-wider text-[11px] w-16">Slot</th>
                                                        <th className="px-4 py-4 font-bold text-white uppercase tracking-wider text-[11px]">Ngày</th>
                                                        <th className="px-4 py-4 font-bold text-white uppercase tracking-wider text-[11px]">Giờ học</th>
                                                        <th className="px-4 py-4 font-bold text-white uppercase tracking-wider text-[11px]">Phòng</th>
                                                        <th className="px-6 py-4 font-bold text-white uppercase tracking-wider text-[11px] text-center">Trạng thái</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                                                    {detailData?.slots.map((slot) => (
                                                        <tr key={slot.slotId} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                                            <td className="px-6 py-4 font-bold text-gray-500 dark:text-zinc-500">{slot.slotIndex}</td>
                                                            <td className="px-4 py-4 text-gray-900 dark:text-white font-medium">
                                                                {new Date(slot.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                                            </td>
                                                            <td className="px-4 py-4 text-gray-600 dark:text-zinc-400 font-medium">
                                                                {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-400">
                                                                    <MapPin size={12} className="text-fpt-orange" />
                                                                    <span>{slot.roomCode}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(slot.status)}`}>
                                                                    {getStatusIcon(slot.status)}
                                                                    {getStatusText(slot.status)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </StudentLayout>
    );
};

export default StudentAttendancePage;
