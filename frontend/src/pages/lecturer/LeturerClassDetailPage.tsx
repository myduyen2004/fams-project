import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { lecturerClassService, ClassDetailResponse } from '../../services/api/LecturerClass';
import { Users, BookOpen, GraduationCap, Calendar, Clock, ArrowLeft } from 'lucide-react';

export const LeturerClassDetailPage: React.FC = () => {
    const { className } = useParams<{ className: string }>();
    const navigate = useNavigate();
    const [detail, setDetail] = useState<ClassDetailResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [pagination, setPagination] = useState({
        page: 0,
        size: 10,
    });
    const [searchQuery, setSearchQuery] = useState<string>('');

    useEffect(() => {
        if (className) {
            fetchDetail();
        }
    }, [className]);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const data = await lecturerClassService.getClassDetail(className!);
            setDetail(data);
        } catch (error) {
            console.error("Failed to fetch class detail", error);
        } finally {
            setLoading(false);
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

    return (
        <LecturerLayout pageTitle="Chi tiết lớp học">
            <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Top Navigation & Breadcrumbs */}
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate('/lecturer/classes')}
                        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-fpt-orange transition-colors w-fit group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Quay lại danh sách lớp học
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-orange-100 text-fpt-orange text-xs font-bold rounded-full uppercase tracking-wider">
                                    {detail?.status || '...'}
                                </span>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-600 dark:text-gray-400 font-medium">{detail?.semesterName}</span>
                            </div>
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                                {detail?.className || className}
                            </h1>

                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 rounded-2xl font-bold border-2 border-gray-100  transition-all shadow-sm">

                                Quản lý điểm số
                            </button>
                            <button className="flex items-center gap-2 px-6 py-3 bg-fpt-orange text-white rounded-2xl font-bold  active:translate-y-0">

                                Phần trăm điểm danh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Class Info Card */}
                <div className="bg-[#fff9f5] dark:bg-zinc-900/50 p-10 rounded-[40px] border border-orange-100/50 dark:border-zinc-800/50 relative overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
                        {[
                            { label: 'Mã lớp', value: detail?.className, icon: <BookOpen className="text-fpt-orange" size={22} /> },
                            { label: 'Chuyên ngành', value: detail?.majorName, icon: <GraduationCap className="text-fpt-orange" size={22} /> },
                            { label: 'Khoá học', value: detail?.courseYear, icon: <Calendar className="text-fpt-orange" size={22} /> },
                            { label: 'Thành viên', value: `${detail?.studentCount} Sinh viên`, icon: <Users className="text-fpt-orange" size={22} /> },
                            { label: 'Niên khoá', value: detail?.academicYear, icon: <Clock className="text-fpt-orange" size={22} /> }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4 group/item transition-all hover:translate-x-1">
                                <div className="p-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-orange-50 dark:border-zinc-700 group-hover/item:border-fpt-orange/30 transition-colors">
                                    {item.icon}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                                        {item.label}
                                    </span>
                                    <span className="text-lg font-medium text-gray-900 dark:text-white leading-tight">
                                        {item.value || '---'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Student Table Section */}
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end px-2 gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Danh sách sinh viên</h2>
                            <p className="text-gray-500 font-medium mt-1">Tổng số {detail?.enrollments.length || 0} sinh viên chính thức</p>
                        </div>
                        <div className="relative w-full sm:w-80">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPagination(p => ({ ...p, page: 0 }));
                                }}
                                placeholder="Tìm kiếm sinh viên..."
                                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm font-medium transition-all shadow-sm  outline-none"
                            />
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/10 dark:shadow-none overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-fpt-orange text-white">
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-lg w-24 text-center">No.</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Sinh viên</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Liên hệ</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Chuyên ngành</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg w-20"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                                    {loading ? (
                                        [...Array(5)].map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={5} className="px-8 py-8 bg-gray-50/50 dark:bg-zinc-800/30"></td>
                                            </tr>
                                        ))
                                    ) : currentEnrollments.length > 0 ? (
                                        currentEnrollments.map((student: any, index: number) => (
                                            <tr key={student.studentCode} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-4 py-4 text-center text-sm text-gray-500 dark:text-zinc-400">
                                                    {(pagination.page * pagination.size + index + 1).toString().padStart(2, '0')}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-fpt-orange text-lg font-bold overflow-hidden">
                                                                {student.studentName.charAt(0)}
                                                            </div>
                                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full shadow-sm"></div>
                                                        </div>
                                                        <div>
                                                            <div className="text-base font-semibold text-gray-900 dark:text-white">{student.studentName}</div>
                                                            <div className="text-sm text-gray-500 dark:text-zinc-500 font-mono ">{student.studentCode}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col text-sm space-y-1.5">
                                                        <div className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400 font-bold">@</div>
                                                            {student.email}
                                                        </div>
                                                        <div className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                                                <Clock size={14} />
                                                            </div>
                                                            {maskValue(student.phone, 3)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-base font-semibold text-gray-500 dark:text-zinc-400">
                                                            {student.majorName}
                                                        </span>
                                                    </div>
                                                </td>

                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-24 text-center">
                                                <div className="flex flex-col items-center gap-6">
                                                    <div className="w-24 h-24 rounded-[32px] bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center">
                                                        <Users size={48} className="text-gray-200 dark:text-zinc-700" />
                                                    </div>
                                                    <p className="text-2xl font-bold text-gray-400 dark:text-zinc-600">Không có dữ liệu sinh viên.</p>
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
        </LecturerLayout>
    );
};
