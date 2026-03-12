import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { lecturerClassService, ClassDetailResponse, StudentEnrollmentDTO } from '../../services/api/LecturerClass';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import { studentGradeService } from '../../services/api/studentGradeService';
import { StudentResponse } from '../../services/api/academicStaffService';
import { ViewStudentModal } from '../../components/academic-staff/students/StudentModals';
import attendanceService, { ClassAttendanceReportResponse } from '../../services/api/attendanceService';

import { Users, ArrowLeft, Mail, Phone, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

export const AcademicStaffClassDetailPage: React.FC = () => {
    const { className } = useParams<{ className: string }>();
    const navigate = useNavigate();
    const [detail, setDetail] = useState<ClassDetailResponse | null>(null);
    const [attendanceReport, setAttendanceReport] = useState<ClassAttendanceReportResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [pagination, setPagination] = useState({
        page: 0,
        size: 30,
    });
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [headerAvatars, setHeaderAvatars] = useState<{ code: string; url: string | null; name: string }[]>([]);

    // View Student Modal State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<StudentResponse | null>(null);

    useEffect(() => {
        if (className) {
            fetchDetail();
            fetchAttendanceReport();
        }
    }, [className]);

    useEffect(() => {
        const fetchHeaderAvatars = async () => {
            if (detail?.enrollments && detail.enrollments.length > 0) {
                const limit = Math.min(detail.enrollments.length, 2);
                const avatars: { code: string; url: string | null; name: string }[] = [];
                for (let i = 0; i < limit; i++) {
                    const student = detail.enrollments[i];
                    try {
                        const info = await studentGradeService.getStudentInfo(student.studentCode);
                        avatars.push({
                            code: student.studentCode,
                            url: info.avatar || null,
                            name: student.studentName
                        });
                    } catch (error) {
                        avatars.push({
                            code: student.studentCode,
                            url: null,
                            name: student.studentName
                        });
                    }
                }
                setHeaderAvatars(avatars);
            }
        };
        fetchHeaderAvatars();
    }, [detail?.enrollments]);

    const fetchDetail = async () => {
        try {
            const data = await lecturerClassService.getClassDetail(className!);
            setDetail(data);
        } catch (error) {
            console.error("Failed to fetch class detail", error);
            toast.error("Không thể tải thông tin lớp học");
        }
    };

    const fetchAttendanceReport = async () => {
        setLoading(true);
        try {
            const data = await attendanceService.getClassAttendanceReport(className!);
            setAttendanceReport(data);
        } catch (error) {
            console.error("Failed to fetch attendance report", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewStudentDetail = async (studentCode: string) => {
        try {
            const student = await studentGradeService.getStudentInfo(studentCode);
            setViewingStudent(student);
            setIsViewModalOpen(true);
        } catch (error) {
            toast.error('Lỗi khi tải thông tin sinh viên');
        }
    };

    const maskValue = (value: string | undefined, visibleChars: number = 2) => {
        if (!value) return '';
        if (value.length <= visibleChars * 2) return value;
        return value.substring(0, visibleChars) + '****' + value.substring(value.length - visibleChars);
    };

    // Filter enrollments based on search query
    const filteredEnrollments = detail?.enrollments.filter(student =>
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // Pagination for the filtered enrollments list
    const currentEnrollments = filteredEnrollments.slice(
        pagination.page * pagination.size,
        (pagination.page + 1) * pagination.size
    );

    const totalPages = Math.ceil(filteredEnrollments.length / pagination.size);

    // Map attendance data for easy lookup
    const attendanceMap = new Map<string, number>();
    attendanceReport?.studentReports.forEach(report => {
        attendanceMap.set(report.studentCode, report.absentPercentage);
    });

    return (
        <AcademicStaffLayout pageTitle="Chi tiết lớp học">
            <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Top Navigation & Breadcrumbs */}
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-fpt-orange transition-colors w-fit group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Quay lại trang trước
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-6">
                            <div className="flex -space-x-8 -space-y-4">
                                {headerAvatars.length > 0 ? (
                                    headerAvatars.map((st, idx) => (
                                        <div
                                            key={st.code}
                                            className={`w-14 h-14 rounded-full border-4 border-white dark:border-zinc-950 overflow-hidden shadow-lg transition-transform hover:scale-110 relative ${idx === 0 ? 'z-20' : 'z-10 bg-orange-200'}`}
                                        >
                                            {st.url ? (
                                                <img
                                                    src={getViewableFileUrl(st.url)}
                                                    alt={st.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-orange-100 flex items-center justify-center text-fpt-orange font-bold text-xl uppercase">
                                                    {st.name.split(' ').pop()?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="w-14 h-14 rounded-full border-4 border-white dark:border-zinc-900 bg-gray-50 flex items-center justify-center text-gray-300 shadow-inner">
                                        <Users size={24} />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`px-3 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-sm border ${detail?.status === 'UPCOMING'
                                            ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/40'
                                            : detail?.status === 'OPEN' || detail?.status === 'ONGOING'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900/40'
                                                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                                        }`}>
                                        {detail?.status === 'UPCOMING' ? 'SẮP DIỄN RA' : detail?.status === 'ONGOING' ? 'ĐANG DIỄN RA' : detail?.status === 'FINISHED' ? 'ĐÃ KẾT THÚC' : detail?.status || 'ĐANG TẢI...'}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-zinc-800"></span>
                                    <span className="text-gray-400 dark:text-gray-500 text-[10px] font-bold tracking-widest uppercase">{detail?.semesterName}</span>
                                </div>
                                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                                    {detail?.className || className}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(`/academic-staff/classes/${className}/attendance-report`)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-fpt-orange text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all hover:-translate-y-0.5"
                            >
                                <BarChart3 size={18} />
                                Báo cáo điểm danh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Student Table Section */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end px-1 gap-4">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white">Danh sách sinh viên</h4>
                            <p className="text-xs text-gray-500 font-medium mt-1">Tổng số {detail?.enrollments.length || 0} sinh viên chính thức</p>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPagination(p => ({ ...p, page: 0 }));
                                }}
                                placeholder="Tìm sinh viên..."
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl text-xs font-medium transition-all shadow-sm outline-none focus:border-fpt-orange/50"
                            />
                            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-fpt-orange text-white">
                                        <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest w-16">STT</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest">Sinh viên</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest">Liên hệ</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest">Chuyên ngành</th>
                                        <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest w-24">Vắng (%)</th>
                                        <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest w-32">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                    {loading ? (
                                        [...Array(5)].map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={6} className="px-4 py-6 bg-gray-50/50 dark:bg-zinc-800/30"></td>
                                            </tr>
                                        ))
                                    ) : currentEnrollments.length > 0 ? (
                                        currentEnrollments.map((student: StudentEnrollmentDTO, index: number) => {
                                            const absentPercentage = attendanceMap.get(student.studentCode) || 0;
                                            return (
                                                <tr key={student.studentCode}
                                                    onClick={() => handleViewStudentDetail(student.studentCode)}
                                                    className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group">
                                                    <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-zinc-400 font-medium font-mono">
                                                        {(pagination.page * pagination.size + index + 1).toString().padStart(2, '0')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-full border border-orange-100 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-fpt-orange font-bold text-xs uppercase shadow-sm">
                                                                {student.avatar ? (
                                                                    <img
                                                                        src={getViewableFileUrl(student.avatar)}
                                                                        alt={student.studentName}
                                                                        className="w-full h-full object-cover rounded-full"
                                                                    />
                                                                ) : (
                                                                    student.studentName.split(' ').pop()?.charAt(0)
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">{student.studentName}</div>
                                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{student.studentCode}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-[13px] text-gray-600 dark:text-gray-400">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1.5 font-medium">
                                                                <Mail size={12} className="text-gray-400" />
                                                                <span>{maskValue(student.email, 4)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Phone size={12} className="text-gray-400" />
                                                                <span>{maskValue(student.phone, 3)}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-[13px] text-gray-600 dark:text-gray-400">
                                                        <div className="flex flex-col">
                                                            <div className="font-bold text-gray-800 dark:text-zinc-300">{student.majorName}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-sm font-bold font-mono ${
                                                            absentPercentage >= 20 
                                                                ? 'text-red-500' 
                                                                : absentPercentage >= 10 
                                                                    ? 'text-amber-500' 
                                                                    : 'text-gray-600 dark:text-zinc-400'
                                                        }`}>
                                                            {absentPercentage.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase whitespace-nowrap ${student.status === 'ENROLLED'
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                                                                : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700'
                                                            }`}>
                                                            {student.status === 'ENROLLED' ? 'ĐANG HỌC' : student.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center">
                                                        <Users size={32} className="text-gray-200 dark:text-zinc-700" />
                                                    </div>
                                                    <p className="text-lg font-bold text-gray-400 dark:text-zinc-600 tracking-tight">Không tìm thấy sinh viên</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Simplified Pagination */}
                        {totalPages > 1 && (
                            <div className="ml-10 mr-10 mb-10 flex items-center justify-between mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800 text-sm text-gray-500">
                                <div>
                                    Hiển thị <span className="font-medium text-gray-900 dark:text-white">
                                        {filteredEnrollments.length > 0 ? pagination.page * pagination.size + 1 : 0}
                                    </span> đến{' '}
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {Math.min((pagination.page + 1) * pagination.size, filteredEnrollments.length)}
                                    </span> trong số{' '}
                                    <span className="font-medium text-gray-900 dark:text-white">{filteredEnrollments.length}</span> sinh viên
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPagination(p => ({ ...p, page: Math.max(0, p.page - 1) }))}
                                        disabled={pagination.page === 0}
                                        className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
                                    >
                                        Trước
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPagination(p => ({ ...p, page: i }))}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-colors ${pagination.page === i
                                                    ? 'bg-fpt-orange text-white'
                                                    : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPagination(p => ({ ...p, page: Math.min(totalPages - 1, p.page + 1) }))}
                                        disabled={pagination.page >= totalPages - 1}
                                        className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isViewModalOpen && viewingStudent && (
                <ViewStudentModal
                    student={viewingStudent}
                    onClose={() => setIsViewModalOpen(false)}
                />
            )}
        </AcademicStaffLayout>
    );
};
