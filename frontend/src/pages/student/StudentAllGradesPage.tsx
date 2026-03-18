import React, { useState, useEffect, useMemo } from 'react';
import { StudentLayout } from '../../layouts/StudentLayout';
import { Card } from '../../components/common/Card';
import { GraduationCap, AlertCircle, Loader2, TrendingUp, BookOpen, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import apiClient from '../../services/api/authService';

export interface CourseGradeSummary {
    no: number;
    term: number;
    semesterCode: string | null;
    semesterName: string | null;
    courseCode: string;
    courseName: string;
    credits: number;
    prerequisiteCodes: string;
    className: string | null;
    grade: number | null;
    status: 'PASSED' | 'FAILED' | 'PENDING' | 'STUDYING';
    gradesPublished: boolean;
    isCalculatedInGpa?: boolean;
}

export interface AllGradesSummaryResponse {
    courses: CourseGradeSummary[];
    totalCourses: number;
    passedCourses: number;
    failedCourses: number;
    pendingCourses: number;
    gpa: number | null;
    specializationName?: string | null;
    majorName?: string | null;
}

const getUserId = (): number => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        return user.id;
    }
    return 0;
};

const getGradeColor = (grade: number | null): string => {
    if (grade === null) return 'bg-gray-600';
    if (grade >= 8.5) return 'bg-green-600';
    if (grade >= 7.0) return 'bg-blue-600';
    if (grade >= 5.0) return 'bg-amber-500';
    return 'bg-red-600';
};

export const StudentAllGradesPage: React.FC = () => {
    const [data, setData] = useState<AllGradesSummaryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAllGrades();
    }, []);

    const fetchAllGrades = async () => {
        try {
            setLoading(true);
            setError(null);
            const userId = getUserId();
            if (!userId) {
                setError('Không thể xác định người dùng');
                return;
            }
            const response = await apiClient.get(`/v1/students/${userId}/all-grades`);
            setData(response.data);
        } catch (err) {
            console.error('Error fetching all grades:', err);
            setError('Không thể tải dữ liệu điểm');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!filteredCourses || filteredCourses.length === 0) return;

        const exportData = filteredCourses.map(c => ({
            'STT': c.no,
            'Kỳ thứ': c.term,
            'Học kỳ': c.semesterCode,
            'Mã môn': c.courseCode,
            'Môn tiên quyết': c.prerequisiteCodes || '',
            'Tên môn học': c.courseName,
            'Tín chỉ': c.credits,
            'Tính GPA': c.isCalculatedInGpa ? 'Có' : 'Không',
            'Điểm': c.gradesPublished && c.grade !== null ? c.grade.toFixed(1) : '',
            'Trạng thái': c.status === 'PASSED' ? 'Passed' : c.status === 'FAILED' ? 'Failed' : 'Pending'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);

        // Auto size columns
        const colWidths = [
            { wch: 5 }, // STT
            { wch: 8 }, // Kỳ thứ
            { wch: 12 }, // Học kỳ
            { wch: 10 }, // Mã môn
            { wch: 20 }, // Môn tiên quyết
            { wch: 35 }, // Tên môn học
            { wch: 8 }, // Tín chỉ
            { wch: 10 }, // Tính GPA
            { wch: 8 }, // Điểm
            { wch: 12 } // Trạng thái
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ket_Qua_Hoc_Tap');
        XLSX.writeFile(wb, `KetQuaHocTap.xlsx`);
    };

    const filteredCourses = useMemo(() => {
        if (!data) return [];
        return data.courses;
    }, [data]);

    if (loading) {
        return (
            <StudentLayout pageTitle="Kết Quả Học Tập">
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-fpt-orange" />
                    <p className="text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</p>
                </div>
            </StudentLayout>
        );
    }

    if (error || !data) {
        return (
            <StudentLayout pageTitle="Kết Quả Học Tập">
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <p className="text-gray-600 dark:text-gray-400">{error || 'Không thể tải dữ liệu'}</p>
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout pageTitle="Kết Quả Học Tập">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 text-fpt-orange font-bold text-sm mb-1">
                        <GraduationCap size={16} /> Bảng điểm tổng hợp
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Kết Quả Học Tập
                    </h1>
                    {(data.specializationName || data.majorName) && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {data.majorName && <span>{data.majorName}</span>}
                            {data.majorName && data.specializationName && <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>}
                            {data.specializationName && <span className="font-medium text-fpt-orange">{data.specializationName}</span>}
                        </p>
                    )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <BookOpen size={18} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tổng số môn</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{data.totalCourses}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Qua môn (Passed)</p>
                                <p className="text-xl font-bold text-green-600 dark:text-green-400">{data.passedCourses}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <XCircle size={18} className="text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Rớt môn (Failed)</p>
                                <p className="text-xl font-bold text-red-600 dark:text-red-400">{data.failedCourses}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <TrendingUp size={18} className="text-fpt-orange" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Điểm trung bình (GPA)</p>
                                <p className="text-xl font-bold text-fpt-orange">
                                    {data.gpa !== null ? data.gpa.toFixed(2) : '—'}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Table */}
                <Card className="p-0 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse">
                            <thead>
                                <tr className="bg-gradient-to-r from-fpt-orange to-orange-500 text-white">
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap w-12">STT</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap w-20">Kỳ thứ</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap w-28">Học kỳ</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap w-28">Mã môn</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap w-36">Môn tiên quyết</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">Tên môn học</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap w-20">Tín chỉ</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap w-20">Điểm</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap w-28">Trạng thái</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap w-20">Tính GPA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCourses.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12 text-gray-400 dark:text-gray-500">
                                            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                            <p>Không có dữ liệu</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCourses.map((course, idx) => (
                                        <tr
                                            key={idx}
                                            className={`border-b border-gray-100 dark:border-zinc-800 hover:bg-orange-50/40 dark:hover:bg-zinc-800/40 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50/50 dark:bg-zinc-900/50'
                                                }`}
                                        >
                                            <td className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">{course.no}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 font-medium">{course.term}</td>
                                            <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                {course.semesterCode ?? <span className="text-gray-400 dark:text-gray-500">—</span>}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200">
                                                    {course.courseCode}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(course.prerequisiteCodes || '').split(',').map((code, pIdx) => {
                                                        const trimmedCode = code.trim();
                                                        if (!trimmedCode) return null;
                                                        return (
                                                            <span
                                                                key={pIdx}
                                                                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-fpt-orange/10 dark:bg-fpt-orange/20 text-fpt-orange border border-fpt-orange/20 dark:border-fpt-orange/30 text-[10px] font-bold tracking-wider"
                                                            >
                                                                {trimmedCode}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-200 font-medium">
                                                {course.courseName}
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-300">
                                                {course.credits}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {course.gradesPublished && course.grade !== null ? (
                                                    <span className={`inline-flex items-center justify-center w-12 h-7 rounded-md text-white text-sm font-bold ${getGradeColor(course.grade)}`}>
                                                        {course.grade.toFixed(1)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {course.status === 'PASSED' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800/50">
                                                        <CheckCircle size={12} />
                                                        Passed
                                                    </span>
                                                ) : course.status === 'FAILED' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800/50">
                                                        <XCircle size={12} />
                                                        Failed
                                                    </span>
                                                ) : course.status === 'STUDYING' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800/50">
                                                        <BookOpen size={12} />
                                                        Studying
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800/50">
                                                        <Clock size={12} />
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {course.isCalculatedInGpa ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                                        <CheckCircle size={14} />
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500">
                                                        <XCircle size={14} />
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Summary footer & Export */}
                {filteredCourses.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Hiển thị {filteredCourses.length} môn học
                        </div>
                        <button
                            onClick={handleExport}
                            disabled={filteredCourses.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-green-700 transition-colors disabled:opacity-50 shadow-sm"
                        >
                            <Download size={16} />
                            Xuất Excel
                        </button>
                    </div>
                )}
            </div>
        </StudentLayout>
    );
};

export default StudentAllGradesPage;
