import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { ArrowLeft, Users, BookOpen, Download } from 'lucide-react';
import attendanceService, { ClassAttendanceReportResponse } from '../../services/api/attendanceService';
import toast from "@utils/toast";
import { ViewStudentModal } from '../../components/academic-staff/students/StudentModals';
import { studentGradeService } from '../../services/api/studentGradeService';
import { StudentResponse } from '../../services/api/academicStaffService';

export const ClassAttendanceReportPage: React.FC = () => {
    const { className } = useParams<{ className: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    
    const isAcademicStaff = location.pathname.includes('/academic-staff/');
    const Layout = isAcademicStaff ? AcademicStaffLayout : LecturerLayout;
    
    const [report, setReport] = useState<ClassAttendanceReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'danger' | 'warning' | 'safe'>('all');
    const [exportLoading, setExportLoading] = useState(false);
    
    // View Student Modal State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<StudentResponse | null>(null);
    const [isFetchingStudent, setIsFetchingStudent] = useState(false);

    const filteredStudents = report?.studentReports?.filter(student => {
        const matchesSearch = student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             student.studentCode.toLowerCase().includes(searchQuery.toLowerCase());
        
        let matchesStatus = true;
        if (statusFilter === 'danger') matchesStatus = student.absentPercentage >= 20;
        else if (statusFilter === 'warning') matchesStatus = student.absentPercentage >= 10 && student.absentPercentage < 20;
        else if (statusFilter === 'safe') matchesStatus = student.absentPercentage < 10;
        
        return matchesSearch && matchesStatus;
    });

    useEffect(() => {
        if (className) {
            fetchReport();
        }
    }, [className]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.getClassAttendanceReport(className!);
            setReport(data);
        } catch (error) {
            console.error('Failed to fetch attendance report:', error);
            toast.error('Không thể tải dữ liệu báo cáo điểm danh');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!className) return;
        
        try {
            setExportLoading(true);
            const blob = await attendanceService.exportClassAttendanceReport(className);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_report_${className}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Xuất file excel thành công');
        } catch (error) {
            console.error('Failed to export attendance report:', error);
            toast.error('Không thể xuất file excel');
        } finally {
            setExportLoading(false);
        }
    };

    const handleViewStudentDetail = async (studentCode: string) => {
        setIsFetchingStudent(true);
        try {
            const student = await studentGradeService.getStudentInfo(studentCode);
            setViewingStudent(student);
            setIsViewModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch student info", error);
            toast.error('Lỗi khi tải thông tin sinh viên');
        } finally {
            setIsFetchingStudent(false);
        }
    };

    return (
        <Layout pageTitle="Báo cáo điểm danh">
            <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-fpt-orange transition-colors w-fit group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Quay lại 
                    </button>
                    
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-orange-50 dark:bg-orange-900/10 text-fpt-orange rounded-full text-[11px] font-black uppercase tracking-widest border border-orange-100 dark:border-orange-900/20">
                                {report?.semesterName || 'HỌC KỲ ...'}
                            </span>
                            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                Báo cáo điểm danh
                            </h2>
                        </div>
                        
                        <div className="flex flex-col lg:flex-row lg:items-stretch gap-10 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm w-fit">
                            <div className="flex items-start gap-4">
                                <div className="w-11 h-11 bg-orange-50 dark:bg-orange-900/10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
                                    <BookOpen size={22} className="text-fpt-orange" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 leading-none">MÔN HỌC</p>
                                    <h1 className="text-xl font-black text-[#04162e] dark:text-white tracking-tight leading-none">
                                        {report?.courseCode}
                                    </h1>
                                    <p className="text-[13px] font-bold text-gray-500 mt-1.5 leading-tight max-w-[250px]">{report?.courseName}</p>
                                </div>
                            </div>

                            <div className="hidden lg:block w-px bg-gray-100 dark:border-zinc-800 my-1" />

                            <div className="flex items-start gap-4">
                                <div className="w-11 h-11 bg-orange-50 dark:bg-orange-900/10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
                                    <Users size={22} className="text-fpt-orange" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 leading-none">LỚP HỌC</p>
                                    <p className="text-xl font-black text-[#04162e] dark:text-white tracking-tight leading-none uppercase">
                                        {className?.split('-')[0]}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-2">
                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            placeholder="Tìm tên hoặc mã sinh viên..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange outline-none transition-all shadow-sm"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1.5 md:pb-0 no-scrollbar">
                        {(['all', 'danger', 'warning', 'safe'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setStatusFilter(filter)}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border uppercase tracking-wider ${
                                    statusFilter === filter
                                        ? 'bg-fpt-orange text-white border-fpt-orange shadow-md shadow-orange-200/50'
                                        : 'bg-white dark:bg-zinc-900 text-gray-400 border-gray-100 dark:border-zinc-800 hover:border-fpt-orange/30 hover:text-fpt-orange'
                                }`}
                            >
                                {filter === 'all' && 'Tất cả'}
                                {filter === 'danger' && 'Nguy cơ cao'}
                                {filter === 'warning' && 'Cảnh báo'}
                                {filter === 'safe' && 'An toàn'}
                            </button>
                        ))}
                        
                        <div className="w-px h-6 bg-gray-100 dark:bg-zinc-800 mx-2 hidden md:block" />

                        <button
                            onClick={handleExport}
                            disabled={exportLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 text-fpt-orange border border-fpt-orange/30 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-fpt-orange hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm"
                        >
                            {exportLoading ? (
                                <div className="w-3.5 h-3.5 border-2 border-fpt-orange border-t-transparent group-hover:border-white rounded-full animate-spin"></div>
                            ) : (
                                <Download size={14} />
                            )}
                            {exportLoading ? 'Đang xuất...' : 'Xuất Excel'}
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-0 table-fixed">
                            <thead>
                                <tr className="bg-fpt-orange text-white">
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest bg-fpt-orange sticky left-0 z-20 w-[100px] min-w-[100px] border-none">
                                        Mã SV
                                    </th>
                                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest bg-fpt-orange sticky left-[100px] z-20 w-[200px] min-w-[200px] border-none shadow-[1px_0_0_0_rgba(255,255,255,0.1)]">
                                        Họ và tên
                                    </th>
                                    {loading ? (
                                        [...Array(10)].map((_, i) => (
                                            <th key={i} className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-widest whitespace-nowrap w-[75px] min-w-[75px]">
                                                Slot {i + 1}
                                            </th>
                                        ))
                                    ) : report?.slots?.map((slot) => (
                                        <th key={slot.slotId} className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-widest whitespace-nowrap w-[75px] min-w-[75px]">
                                            Slot {slot.slotIndex}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest whitespace-nowrap sticky right-0 z-20 bg-fpt-orange w-[90px] min-w-[90px]">
                                        % Absent
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-4 py-4 bg-white dark:bg-zinc-900 sticky left-0 z-10 border-none w-[100px] min-w-[100px]">
                                                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-16"></div>
                                            </td>
                                            <td className="px-6 py-4 bg-white dark:bg-zinc-900 sticky left-[100px] z-10 border-none w-[220px] min-w-[220px] shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]">
                                                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-32"></div>
                                            </td>
                                            {[...Array(10)].map((_, j) => (
                                                <td key={j} className="px-3 py-4"><div className="h-4 w-4 bg-gray-200 dark:bg-zinc-700 rounded mx-auto"></div></td>
                                            ))}
                                            <td className="px-6 py-4 sticky right-0 z-10 bg-white dark:bg-zinc-900 border-l border-gray-50 dark:border-zinc-800">
                                                <div className="h-4 w-8 bg-gray-200 dark:bg-zinc-700 rounded mx-auto"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredStudents?.length === 0 ? (
                                    <tr>
                                        <td colSpan={(report?.slots?.length || 0) + 3} className="px-6 py-12 text-center text-gray-400 font-medium">
                                            Không tìm thấy sinh viên nào phù hợp
                                        </td>
                                    </tr>
                                ) : filteredStudents?.map((student) => (
                                    <tr key={student.studentId} className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 group">
                                        <td 
                                            className="px-4 py-3 text-[13px] font-bold text-fpt-orange whitespace-nowrap bg-white dark:bg-zinc-900 group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/50 sticky left-0 z-10 w-[100px] min-w-[100px] border-none cursor-pointer hover:underline font-mono"
                                            onClick={() => handleViewStudentDetail(student.studentCode)}
                                        >
                                            {student.studentCode}
                                        </td>
                                        <td 
                                            className="px-6 py-3 text-[13px] font-bold text-gray-700 dark:text-zinc-200 whitespace-nowrap bg-white dark:bg-zinc-900 group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/50 sticky left-[100px] z-10 w-[200px] min-w-[200px] border-none shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)] cursor-pointer hover:underline"
                                            onClick={() => handleViewStudentDetail(student.studentCode)}
                                        >
                                            {student.studentName}
                                        </td>
                                        
                                        {report?.slots?.map((slot) => {
                                            const detail = student.attendanceDetails?.find(d => d.slotId === slot.slotId);
                                            const status = detail?.status;
                                            
                                            let displayClass = "text-gray-400 font-medium";
                                            let displayText = "-";
                                            let cellBg = "";
                                            
                                            if (status === 'P') {
                                                displayClass = "text-[#04162e] dark:text-gray-200 font-bold";
                                                displayText = "P";
                                            } else if (status === 'A') {
                                                displayClass = "text-red-600 font-bold";
                                                displayText = "A";
                                                cellBg = "bg-red-100 dark:bg-red-900/20";
                                            } else if (status === 'E') {
                                                displayClass = "text-yellow-600 dark:text-yellow-500 font-bold";
                                                displayText = "E";
                                            }

                                            return (
                                                <td key={slot.slotId} className={`px-2 py-3 text-center text-[13px] w-[75px] min-w-[75px] ${cellBg} ${displayClass}`}>
                                                    {displayText}
                                                </td>
                                            );
                                        })}
                                        
                                        <td className="px-4 py-3 text-center sticky right-0 z-10 bg-white dark:bg-zinc-900 group-hover:bg-gray-50 dark:group-hover:bg-zinc-800/50 border-l border-gray-100 dark:border-zinc-800 w-[90px] min-w-[90px]">
                                            <span className={`text-[13px] font-bold ${
                                                student.absentPercentage >= 20 
                                                    ? 'text-red-600' 
                                                    : student.absentPercentage >= 10
                                                        ? 'text-amber-500 dark:text-amber-400'
                                                        : 'text-[#04162e] dark:text-gray-300'
                                            }`}>
                                                {student.absentPercentage.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isViewModalOpen && viewingStudent && (
                <ViewStudentModal
                    student={viewingStudent!}
                    onClose={() => setIsViewModalOpen(false)}
                />
            )}
            
            {isFetchingStudent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-xl flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-fpt-orange border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">Đang tải thông tin...</span>
                    </div>
                </div>
            )}
        </Layout>
    );
};

