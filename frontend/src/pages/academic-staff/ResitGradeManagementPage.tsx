import React, { useState, useEffect, useRef } from 'react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { lecturerClassService, SemesterResponse } from '../../services/api/LecturerClass';
import { courseService } from '../../services/api/courseService';
import { Course } from '../../types/course';
import { examGradeService, ExamGradeOverviewResponse } from '../../services/api/examGradeService';
import {
    ChevronDown, Download, FileSpreadsheet, Users, TrendingUp, Award,
    Loader2, Search, Check, RefreshCw, Save, Edit3, X, AlertTriangle
} from 'lucide-react';
import { ImportExamGradeModal } from '../../components/academic-staff/ImportExamGradeModal';
import { studentGradeService } from '../../services/api/studentGradeService';
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
    const [selectedClass, setSelectedClass] = useState<string>('');

    // Dropdown states
    const [isSemesterOpen, setIsSemesterOpen] = useState(false);
    const [isCourseOpen, setIsCourseOpen] = useState(false);
    const [isClassOpen, setIsClassOpen] = useState(false);
    const semesterDropdownRef = useRef<HTMLDivElement>(null);
    const courseDropdownRef = useRef<HTMLDivElement>(null);
    const classDropdownRef = useRef<HTMLDivElement>(null);

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editedGrades, setEditedGrades] = useState<{ [key: string]: string }>({});

    // Publish state
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);
    const [publishing, setPublishing] = useState(false);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (semesterDropdownRef.current && !semesterDropdownRef.current.contains(event.target as Node)) {
                setIsSemesterOpen(false);
            }
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
                setIsCourseOpen(false);
            }
            if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
                setIsClassOpen(false);
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

    // Reset selected class when grades change
    useEffect(() => {
        setSelectedClass('');
    }, [gradeOverview]);

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

    // Edit Mode Handlers
    const handleStartEdit = () => {
        setIsEditMode(true);
        setEditedGrades({});
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditedGrades({});
    };

    const handleGradeChange = (enrollmentId: number, componentId: number, value: string) => {
        const key = `${enrollmentId}_${componentId}`;
        const cleanValue = value.replace(',', '.');

        // Only allow valid number patterns: digits, optional decimal, optional more digits
        if (cleanValue === '' || /^(\d{1,2})?(\.\d?)?$/.test(cleanValue)) {
            const numValue = parseFloat(cleanValue);
            // Allow empty, or valid numbers 0-10
            if (cleanValue === '' || cleanValue === '.' || (numValue >= 0 && numValue <= 10)) {
                setEditedGrades(prev => ({ ...prev, [key]: cleanValue }));
            }
        }
    };

    const handleConfirmPublish = async () => {
        if (!selectedCourse || !selectedSemester) return;

        setPublishing(true);
        try {
            await examGradeService.publishGrades(selectedCourse, selectedSemester, 'RESIT');
            toast.success('Công bố điểm thi lại thành công!');
            setShowPublishConfirm(false);
            fetchGrades(); // Reload to get updated status
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi công bố điểm thi lại');
        } finally {
            setPublishing(false);
        }
    };

    const handleSaveGrades = async () => {
        if (Object.keys(editedGrades).length === 0) {
            setIsEditMode(false);
            return;
        }

        setSaving(true);
        try {
            const updates: any[] = [];
            for (const [key, valueStr] of Object.entries(editedGrades)) {
                const [enrollmentId, componentId] = key.split('_').map(Number);

                // Find original score to compare
                const student = gradeOverview?.studentGrades.find(s => s.enrollmentId === enrollmentId);
                const originalScore = student?.grades[componentId] ?? null;

                // Parse string to number or null
                const newScore = valueStr.trim() === '' ? null : parseFloat(valueStr.replace(',', '.'));
                const finalScore = newScore !== null && !isNaN(newScore) ? Math.round(newScore * 10) / 10 : null;

                // Only save if changed
                if (finalScore !== originalScore) {
                    updates.push({
                        enrollmentId,
                        gradeComponentId: componentId,
                        score: finalScore
                    });
                }
            }

            if (updates.length > 0) {
                await studentGradeService.updateGradesBatch(updates);
                toast.success(`Đã lưu ${updates.length} thay đổi`);
            } else {
                toast.success('Không có thay đổi nào cần lưu');
            }

            setIsEditMode(false);
            setEditedGrades({});
            fetchGrades(); // Refresh data
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi lưu điểm');
        } finally {
            setSaving(false);
        }
    };

    // Get available classes from student grades
    const availableClasses = React.useMemo(() => {
        if (!gradeOverview?.studentGrades) return [];
        const classes = new Set(gradeOverview.studentGrades.map(s => s.className));
        return Array.from(classes).sort();
    }, [gradeOverview]);

    // ==========================================
    // RESIT ELIGIBILITY FILTER
    // Chỉ hiển thị sinh viên có:
    //   1. Điểm trung bình < 5  (FAILED / chưa đạt)
    //   2. Thiếu điểm thi cuối kỳ (Final Exam = null)
    //   3. Chưa có đủ điểm để tính TB (finalGrade = null)
    // ==========================================
    const resitEligibleStudents = React.useMemo(() => {
        if (!gradeOverview) return [];
        // Hiện tại Backend đã trả về danh sách đã lọc cho RESIT, 
        // ở đây ta lấy trực tiếp từ gradeOverview.studentGrades
        return gradeOverview.studentGrades;
    }, [gradeOverview]);

    // Filter by search term and selected class (on top of resit eligibility)
    const filteredStudents = resitEligibleStudents.filter(student => {
        const matchesSearch = student.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.className.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesClass = selectedClass ? student.className === selectedClass : true;

        return matchesSearch && matchesClass;
    });

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

    // Định nghĩa thứ tự ưu tiên cho các loại
    const TYPE_PRIORITY: Record<string, number> = {
        'PARTICIPATION': 1,
        'QUIZ': 2,
        'PROGRESS_TEST': 3,
        'WORKSHOP': 4,
        'PROJECT': 5,
        'PRESENTATION': 6,
        'ASSIGNMENT': 7,
        'MID_TERM': 8,
        'PRACTICAL_EXAM': 9,
    };

    const sortedGradeComponents = React.useMemo(() => {
        if (!gradeOverview?.gradeComponents) return [];

        const typeTotalWeight: Record<string, number> = {};
        gradeOverview.gradeComponents.forEach(gc => {
            const currentTotal = typeTotalWeight[gc.type] || 0;
            typeTotalWeight[gc.type] = currentTotal + gc.weight;
        });

        return [...gradeOverview.gradeComponents].sort((a, b) => {
            const BOTTOM_TYPES = ['FINAL_EXAM', 'RESIT'];
            const isABottom = BOTTOM_TYPES.includes(a.type);
            const isBBottom = BOTTOM_TYPES.includes(b.type);

            if (isABottom && !isBBottom) return 1;
            if (!isABottom && isBBottom) return -1;

            if (isABottom && isBBottom) {
                const pMap: Record<string, number> = { 'FINAL_EXAM': 1, 'RESIT': 2 };
                return (pMap[a.type] || 99) - (pMap[b.type] || 99);
            }

            const totalWeightA = typeTotalWeight[a.type] || 0;
            const totalWeightB = typeTotalWeight[b.type] || 0;

            if (Math.abs(totalWeightA - totalWeightB) > 0.001) {
                return totalWeightA - totalWeightB;
            }

            const typePriorityA = TYPE_PRIORITY[a.type] || 99;
            const typePriorityB = TYPE_PRIORITY[b.type] || 99;

            if (typePriorityA !== typePriorityB) {
                return typePriorityA - typePriorityB;
            }

            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [gradeOverview]);

    // Get component abbreviation
    const getComponentAbbr = (name: string, type: string): string => {
        switch (type) {
            case 'MID_TERM': return 'ME';
            case 'FINAL_EXAM': return 'FE';
            case 'PRACTICAL_EXAM': return 'PE';
            case 'RESIT': return 'Resit';
            case 'PARTICIPATION': return 'PT';
            case 'QUIZ': return 'Q';
            case 'PROGRESS_TEST': return 'PRT';
            case 'WORKSHOP': return 'WS';
            case 'PROJECT': return 'PJ';
            case 'PRESENTATION': return 'PS';
            case 'ASSIGNMENT': return 'AS';
            default: {
                const words = name.trim().split(/\s+/);
                if (words.length === 1) {
                    // If single word, take first 3-4 letters
                    return words[0].substring(0, Math.min(words[0].length, 4)).toUpperCase();
                }
                // For multiple words, take first letter of each word
                let abbr = '';
                for (const word of words) {
                    if (word.length > 0) {
                        abbr += word.charAt(0).toUpperCase();
                    }
                }
                return abbr;
            }
        }
    };

    // Lý do thi lại
    const getResitReason = (student: typeof resitEligibleStudents[0]): string => {
        if (!gradeOverview) return '';
        const feComponents = gradeOverview.gradeComponents.filter(gc => gc.type === 'FINAL_EXAM');
        const missingFE = feComponents.some(gc => student.grades[gc.id] == null);

        if (student.finalGrade === null && missingFE) return 'Thiếu điểm FE';
        if (student.finalGrade === null) return 'Chưa đủ điểm';
        if (student.finalGrade < 5) return `TB: ${student.finalGrade.toFixed(1)}`;
        if (missingFE) return 'Thiếu điểm FE';
        return '';
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

                        {/* Class Selector */}
                        <div className="flex-1 min-w-[150px]" ref={classDropdownRef}>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Lớp
                            </label>
                            <div className="relative">
                                <button
                                    onClick={() => setIsClassOpen(!isClassOpen)}
                                    className="flex items-center justify-between w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-fpt-orange transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!gradeOverview || availableClasses.length === 0}
                                >
                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {selectedClass || 'Tất cả các lớp'}
                                    </span>
                                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isClassOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isClassOpen && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-60 overflow-y-auto">
                                        <button
                                            onClick={() => {
                                                setSelectedClass('');
                                                setIsClassOpen(false);
                                            }}
                                            className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${!selectedClass
                                                ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange'
                                                : 'text-gray-900 dark:text-white'
                                                }`}
                                        >
                                            <span className="text-sm font-medium">Tất cả các lớp</span>
                                            {!selectedClass && <Check size={16} />}
                                        </button>
                                        {availableClasses.map((className) => (
                                            <button
                                                key={className}
                                                onClick={() => {
                                                    setSelectedClass(className);
                                                    setIsClassOpen(false);
                                                }}
                                                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${selectedClass === className
                                                    ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange'
                                                    : 'text-gray-900 dark:text-white'
                                                    }`}
                                            >
                                                <span className="text-sm font-medium">{className}</span>
                                                {selectedClass === className && <Check size={16} />}
                                            </button>
                                        ))}
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
                                disabled={!selectedCourse || !selectedSemester || !gradeOverview?.gradesPublished}
                                title={!gradeOverview?.gradesPublished ? "Cần công bố điểm thi trước khi nhập điểm thi lại" : "Nhập điểm thi lại từ Excel"}
                            >
                                <FileSpreadsheet size={16} />
                                Nhập điểm
                            </button>
                            {gradeOverview && !gradeOverview.gradesPublished && (
                                <button
                                    onClick={() => setShowPublishConfirm(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all disabled:opacity-50"
                                    disabled={loadingGrades || !gradeOverview.studentGrades.length}
                                >
                                    <Check size={16} />
                                    Công bố điểm
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Alert for Published Grades */}
                {gradeOverview?.gradesPublished && (
                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start gap-3">
                        <Check className="text-green-600 dark:text-green-400 mt-0.5" size={18} />
                        <div>
                            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                                Điểm thi lại đã được công bố
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                                Sinh viên hiện có thể xem điểm thi lại cho môn học này. {gradeOverview.gradesPublishedAt && `Công bố lúc ${new Date(gradeOverview.gradesPublishedAt).toLocaleString()}`} {gradeOverview.gradesPublishedBy && `bởi ${gradeOverview.gradesPublishedBy}`}
                            </p>
                        </div>
                    </div>
                )}

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
                                        {resitEligibleStudents.length} sinh viên đủ điều kiện thi lại
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/10 px-2 py-1 rounded-md border border-yellow-100 dark:border-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                                        <AlertTriangle size={12} />
                                        Lọc từ {gradeOverview.totalStudents} tổng sinh viên
                                    </span>
                                    <span>•</span>
                                    <span>{gradeOverview.gradeComponents.length} cấu phần điểm</span>
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

                {/* Toolbar: Search + Edit Buttons */}
                {gradeOverview && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-1/2">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm sinh viên theo tên hoặc MSSV..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-fpt-orange focus:border-transparent"
                            />
                        </div>

                        {/* Edit Buttons */}
                        <div className="flex items-center gap-2">
                            {isEditMode ? (
                                <>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-zinc-600 transition-all"
                                        disabled={saving}
                                    >
                                        <X size={18} />
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleSaveGrades}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all disabled:opacity-50"
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        Lưu thay đổi
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleStartEdit}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-50"
                                    disabled={gradeOverview.gradesPublished}
                                    title={gradeOverview.gradesPublished ? "Không thể chỉnh sửa sau khi đã công bố điểm" : "Chỉnh sửa điểm trực tiếp"}
                                >
                                    <Edit3 size={18} />
                                    Chỉnh sửa
                                </button>
                            )}
                        </div>
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
                                        <th className="px-3 py-4 text-center text-xs font-semibold uppercase tracking-wider min-w-[90px]">
                                            <div>Lý do</div>
                                            <div className="text-orange-200 font-normal mt-0.5 text-[10px]">
                                                Thi lại
                                            </div>
                                        </th>
                                        {sortedGradeComponents.map((component) => (
                                            <th
                                                key={component.id}
                                                className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider min-w-[60px] ${component.type === 'RESIT' ? 'bg-orange-600' : ''
                                                    }`}
                                            >
                                                <div
                                                    className="cursor-help flex items-center justify-center gap-1"
                                                    title={`${component.name} (${component.weight}%)${component.type === 'RESIT' ? ' - Có thể nhập điểm' : ' - Chỉ xem'}`}
                                                >
                                                    {getComponentAbbr(component.name, component.type)}
                                                    {component.type === 'RESIT' && (
                                                        <span className="text-[8px] bg-white/20 px-1 rounded">✎</span>
                                                    )}
                                                </div>
                                                <div className="text-orange-200 font-normal mt-0.5 text-[10px]">
                                                    {component.weight}%
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider min-w-[100px]">
                                            <div>Điểm TB</div>
                                            <div className="text-orange-200 font-normal mt-1">
                                                Tổng kết
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
                                            <td className="px-3 py-2 text-center">
                                                <span className="inline-block px-2 py-1 rounded-md text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                                                    {getResitReason(student)}
                                                </span>
                                            </td>
                                            {sortedGradeComponents.map((component) => {
                                                const gradeKey = `${student.enrollmentId}_${component.id}`;
                                                const score = student.grades[component.id];
                                                const editValue = editedGrades[gradeKey];

                                                return (
                                                    <td key={component.id} className="px-2 py-2 text-center">
                                                        {isEditMode && component.type === 'RESIT' ? (
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={editValue ?? (score !== null && score !== undefined ? score.toFixed(1) : '')}
                                                                onChange={(e) => handleGradeChange(student.enrollmentId, component.id, e.target.value)}
                                                                className="w-14 text-center px-1 py-1 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                placeholder="--"
                                                            />
                                                        ) : (
                                                            <span className={`inline-block px-2 py-1 rounded-lg font-semibold text-sm border border-gray-200 dark:border-zinc-600 ${getScoreColor(score)}`}>
                                                                {formatScore(score)}
                                                            </span>
                                                        )}
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
                                {searchTerm || selectedClass ? 'Không tìm thấy sinh viên phù hợp' : 'Không có sinh viên đủ điều kiện thi lại'}
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

            {/* Publish Confirmation Modal */}
            {showPublishConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-4 text-orange-600">
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold dark:text-white">Xác nhận công bố điểm</h3>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">
                            Bạn có chắc chắn muốn công bố điểm thi lại cho môn <span className="text-fpt-orange font-bold">{gradeOverview?.courseName}</span>?
                            Sau khi công bố, sinh viên sẽ có thể xem điểm và bạn <span className="text-red-600 font-bold">không thể</span> chỉnh sửa điểm trực tiếp được nữa.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPublishConfirm(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
                                disabled={publishing}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmPublish}
                                className="flex-1 px-4 py-2.5 bg-fpt-orange text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                                disabled={publishing}
                            >
                                {publishing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                Xác nhận công bố
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AcademicStaffLayout>
    );
};
