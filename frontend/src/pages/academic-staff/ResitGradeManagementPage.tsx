import React, { useState, useEffect, useRef } from 'react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { lecturerClassService, SemesterResponse } from '../../services/api/LecturerClass';
import { courseService } from '../../services/api/courseService';
import { Course } from '../../types/course';
import { examGradeService, ExamGradeOverviewResponse } from '../../services/api/examGradeService';
import {
    ChevronDown, Download, FileSpreadsheet, Users, TrendingUp, Award,
    Loader2, Search, Check, RefreshCw
} from 'lucide-react';
import { ImportExamGradeModal } from '../../components/academic-staff/ImportExamGradeModal';
import toast from 'react-hot-toast';

export const ResitGradeManagementPage: React.FC = () => {
    const [semesters, setSemesters] = useState<SemesterResponse[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [gradeOverview, setGradeOverview] = useState<ExamGradeOverviewResponse | null>(null);
    const [loadingGrades, setLoadingGrades] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [courseSearchTerm, setCourseSearchTerm] = useState('');

    // Dropdown states
    const [isSemesterOpen, setIsSemesterOpen] = useState(false);
    const [isCourseOpen, setIsCourseOpen] = useState(false);
    const semesterDropdownRef = useRef<HTMLDivElement>(null);
    const courseDropdownRef = useRef<HTMLDivElement>(null);

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (semesterDropdownRef.current && !semesterDropdownRef.current.contains(event.target as Node)) {
                setIsSemesterOpen(false);
            }
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
                setIsCourseOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load semesters on mount
    useEffect(() => {
        const fetchSemesters = async () => {
            try {
                const data = await lecturerClassService.getSemesters();
                setSemesters(data);
                if (data.length > 0) {
                    setSelectedSemester(data[0].code);
                }
            } catch (error) {
                console.error("Failed to fetch semesters", error);
                toast.error('Không thể tải danh sách học kỳ');
            }
        };
        fetchSemesters();
    }, []);

    // Load courses on mount
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const data = await courseService.searchCourses('', 500);
                setCourses(data);
            } catch (error) {
                console.error("Failed to fetch courses", error);
            }
        };
        fetchCourses();
    }, []);

    // Load grades when semester and course are selected
    useEffect(() => {
        if (selectedSemester && selectedCourse) {
            fetchGrades();
        } else {
            setGradeOverview(null);
        }
    }, [selectedSemester, selectedCourse]);

    const fetchGrades = async () => {
        setLoadingGrades(true);
        try {
            const data = await examGradeService.getExamGradeOverview(selectedCourse, selectedSemester, 'RESIT');
            setGradeOverview(data);
        } catch (error) {
            console.error("Failed to fetch grades", error);
            toast.error('Không thể tải điểm thi lại');
        } finally {
            setLoadingGrades(false);
        }
    };

    const handleExport = async () => {
        if (!selectedCourse || !selectedSemester) return;
        setExporting(true);
        try {
            await examGradeService.exportExamGrades(selectedCourse, selectedSemester, 'RESIT');
            toast.success('Xuất file Excel thành công!');
        } catch (error) {
            toast.error('Lỗi khi xuất file');
        } finally {
            setExporting(false);
        }
    };

    const handleImportSuccess = () => {
        fetchGrades();
        setShowImportModal(false);
        toast.success('Nhập điểm thi lại thành công!');
    };

    // Filter students by search term
    const filteredStudents = gradeOverview?.studentGrades.filter(student =>
        student.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.className.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    // Get score colors
    const getScoreColor = (score: number | null): string => {
        if (score === null || score === undefined) return 'text-gray-400';
        return 'text-gray-900 dark:text-white';
    };

    const getFinalGradeColor = (score: number | null): string => {
        if (score === null || score === undefined) return 'text-gray-400 border-gray-200';
        if (score >= 5.0) return 'text-green-600 bg-green-50 border-green-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const formatScore = (score: number | null): string => {
        if (score === null || score === undefined) return '--';
        return score.toFixed(1);
    };

    const getSelectedSemesterName = () => {
        const semester = semesters.find(s => s.code === selectedSemester);
        return semester ? semester.name : 'Chọn học kỳ';
    };

    const getSelectedCourseName = () => {
        if (!selectedCourse) return '-- Chọn môn học --';
        const course = courses.find(c => c.code === selectedCourse);
        return course ? `${course.code} - ${course.name}` : selectedCourse;
    };

    return (
        <AcademicStaffLayout pageTitle="Quản lý thi lại">
            <div className="space-y-6">
                {/* Filters */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm">
                    <div className="flex flex-wrap gap-4 items-end">
                        {/* Semester Selector */}
                        <div className="flex-1 min-w-[200px]" ref={semesterDropdownRef}>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Học kỳ
                            </label>
                            <div className="relative">
                                <button
                                    onClick={() => setIsSemesterOpen(!isSemesterOpen)}
                                    className="flex items-center justify-between w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-fpt-orange transition-all"
                                >
                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {getSelectedSemesterName()}
                                    </span>
                                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isSemesterOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isSemesterOpen && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-60 overflow-y-auto">
                                        {semesters.map((semester) => (
                                            <button
                                                key={semester.id}
                                                onClick={() => {
                                                    setSelectedSemester(semester.code);
                                                    setIsSemesterOpen(false);
                                                }}
                                                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${selectedSemester === semester.code
                                                    ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange'
                                                    : 'text-gray-900 dark:text-white'
                                                    }`}
                                            >
                                                <span className="text-sm font-medium">{semester.name}</span>
                                                {selectedSemester === semester.code && <Check size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Course Selector */}
                        <div className="flex-1 min-w-[300px]" ref={courseDropdownRef}>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Môn học
                            </label>
                            <div className="relative">
                                <button
                                    onClick={() => setIsCourseOpen(!isCourseOpen)}
                                    className="flex items-center justify-between w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-fpt-orange transition-all"
                                >
                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {getSelectedCourseName()}
                                    </span>
                                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isCourseOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isCourseOpen && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg">
                                        {/* Search Input */}
                                        <div className="p-2 border-b border-gray-100 dark:border-zinc-700">
                                            <div className="relative">
                                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Tìm môn học..."
                                                    value={courseSearchTerm}
                                                    onChange={(e) => setCourseSearchTerm(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-fpt-orange"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-52 overflow-y-auto">
                                            <button
                                                onClick={() => {
                                                    setSelectedCourse('');
                                                    setIsCourseOpen(false);
                                                    setCourseSearchTerm('');
                                                }}
                                                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${!selectedCourse
                                                    ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange'
                                                    : 'text-gray-900 dark:text-white'
                                                    }`}
                                            >
                                                <span className="text-sm font-medium">-- Chọn môn học --</span>
                                                {!selectedCourse && <Check size={16} />}
                                            </button>
                                            {courses
                                                .filter(c =>
                                                    c.code.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
                                                    c.name.toLowerCase().includes(courseSearchTerm.toLowerCase())
                                                )
                                                .map((course) => (
                                                    <button
                                                        key={course.code}
                                                        onClick={() => {
                                                            setSelectedCourse(course.code);
                                                            setIsCourseOpen(false);
                                                            setCourseSearchTerm('');
                                                        }}
                                                        className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${selectedCourse === course.code
                                                            ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange'
                                                            : 'text-gray-900 dark:text-white'
                                                            }`}
                                                    >
                                                        <span className="text-sm font-medium">{course.code} - {course.name}</span>
                                                        {selectedCourse === course.code && <Check size={16} />}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-end gap-2">
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
                                disabled={!gradeOverview || exporting}
                            >
                                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                Xuất Excel
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-fpt-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-all disabled:opacity-50"
                                disabled={!selectedCourse || !selectedSemester}
                            >
                                <FileSpreadsheet size={16} />
                                Nhập điểm
                            </button>
                        </div>
                    </div>
                </div>

                {/* Course Info Header */}
                {gradeOverview && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                        <RefreshCw size={20} className="text-fpt-orange" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                        Thi lại: {gradeOverview.courseName}
                                    </h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-fpt-orange dark:bg-orange-900/30">
                                        {gradeOverview.courseCode}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium">
                                    <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded-md border border-gray-100 dark:border-zinc-700">
                                        <Users size={12} />
                                        {gradeOverview.totalStudents} sinh viên thi lại
                                    </span>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="flex gap-3">
                                <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg px-3 py-2 border border-orange-100 dark:border-orange-900/30 min-w-[100px]">
                                    <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 text-xs font-medium mb-0.5">
                                        <TrendingUp size={14} />
                                        Điểm TB
                                    </div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                                        {gradeOverview.averageGrade ?? '--'}
                                    </div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/10 rounded-lg px-3 py-2 border border-green-100 dark:border-green-900/30 min-w-[100px]">
                                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium mb-0.5">
                                        <Award size={14} />
                                        Tỷ lệ đạt
                                    </div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                                        {gradeOverview.passRate ? `${gradeOverview.passRate}%` : '--'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                {gradeOverview && (
                    <div className="relative max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm theo MSSV, tên hoặc lớp..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-fpt-orange focus:border-transparent"
                        />
                    </div>
                )}

                {/* Grade Table */}
                {loadingGrades ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fpt-orange mx-auto mb-4"></div>
                        <p className="text-gray-500">Đang tải dữ liệu điểm thi lại...</p>
                    </div>
                ) : gradeOverview ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-fpt-orange text-white">
                                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider w-16 text-center">
                                            STT
                                        </th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider min-w-[200px]">
                                            Thông tin sinh viên
                                        </th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                            Lớp
                                        </th>
                                        {gradeOverview.gradeComponents.map((component) => (
                                            <th
                                                key={component.id}
                                                className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider min-w-[80px]"
                                            >
                                                <div title={component.name}>
                                                    Resit
                                                </div>
                                                <div className="text-orange-200 font-normal mt-0.5 text-[10px]">
                                                    {component.weight}%
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider min-w-[100px]">
                                            <div>Kết quả</div>
                                            <div className="text-orange-200 font-normal mt-1">
                                                Sau thi lại
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                                    {filteredStudents.map((student, index) => (
                                        <tr key={student.enrollmentId} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-2 text-center text-sm text-gray-500 dark:text-zinc-400">
                                                {(index + 1).toString().padStart(2, '0')}
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white text-sm">{student.studentName}</p>
                                                        <p className="text-xs text-gray-500 dark:text-zinc-400">{student.studentCode}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                                                {student.className}
                                            </td>
                                            {gradeOverview.gradeComponents.map((component) => {
                                                const score = student.grades[component.id];
                                                return (
                                                    <td key={component.id} className="px-4 py-2 text-center">
                                                        <span className={`inline-block min-w-[40px] px-2 py-1 rounded border text-sm font-medium ${getScoreColor(score)} border-gray-200 dark:border-zinc-600`}>
                                                            {formatScore(score)}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-2 text-center">
                                                <span className={`inline-block min-w-[50px] px-3 py-1.5 rounded-lg border text-sm font-bold ${getFinalGradeColor(student.finalGrade)}`}>
                                                    {formatScore(student.finalGrade)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredStudents.length === 0 && (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                {searchTerm ? 'Không tìm thấy sinh viên phù hợp' : 'Không có sinh viên thi lại'}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-12 text-center">
                        <RefreshCw size={64} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg text-gray-500">Chọn học kỳ và môn học để xem danh sách thi lại</p>
                    </div>
                )}
            </div>

            {/* Import Modal */}
            {showImportModal && selectedCourse && selectedSemester && (
                <ImportExamGradeModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onSuccess={handleImportSuccess}
                    courseCode={selectedCourse}
                    semesterCode={selectedSemester}
                    type="RESIT"
                />
            )}
        </AcademicStaffLayout>
    );
};
