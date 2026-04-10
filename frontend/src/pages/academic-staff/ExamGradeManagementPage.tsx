import React, { useState, useEffect, useRef } from 'react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { lecturerClassService, SemesterResponse } from '../../services/api/LecturerClass';
import { courseService } from '../../services/api/courseService';
import { Course } from '../../types/course';
import { examGradeService, ExamGradeOverviewResponse } from '../../services/api/examGradeService';
import { studentGradeService } from '../../services/api/studentGradeService';
import {
    ChevronDown, Download, FileSpreadsheet, Users, TrendingUp, Award,
    Loader2, Search, Check, BookOpen, Send, AlertCircle, X, ShieldCheck,
    Save, Edit3, Info
} from 'lucide-react';
import { ImportExamGradeModal } from '../../components/academic-staff/ImportExamGradeModal';
import { StudentInfoModal } from '../../components/common/StudentInfoModal';
import { sortGradeComponents } from '../../utils/gradeSortUtils';
import toast from 'react-hot-toast';

export const ExamGradeManagementPage: React.FC = () => {
    const [semesters, setSemesters] = useState<SemesterResponse[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [gradeOverview, setGradeOverview] = useState<ExamGradeOverviewResponse | null>(null);
    const [loadingGrades, setLoadingGrades] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [courseSearchTerm, setCourseSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState<string>(''); // New state for selected class

    // Dropdown states
    const [isSemesterOpen, setIsSemesterOpen] = useState(false);
    const [isCourseOpen, setIsCourseOpen] = useState(false);
    const [isClassOpen, setIsClassOpen] = useState(false); // New state for class dropdown
    const semesterDropdownRef = useRef<HTMLDivElement>(null);
    const courseDropdownRef = useRef<HTMLDivElement>(null);
    const classDropdownRef = useRef<HTMLDivElement>(null); // New ref for class dropdown

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Publish state
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);
    const [publishing, setPublishing] = useState(false);

    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editedGrades, setEditedGrades] = useState<{ [key: string]: string }>({});

    // Student Info Modal State
    const [selectedStudentCode, setSelectedStudentCode] = useState<string | null>(null);
    const [isStudentInfoModalOpen, setIsStudentInfoModalOpen] = useState(false);

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
            const data = await examGradeService.getExamGradeOverview(selectedCourse, selectedSemester, 'EXAM');
            setGradeOverview(data);
        } catch (error) {
            console.error("Failed to fetch grades", error);
            toast.error('Không thể tải điểm');
        } finally {
            setLoadingGrades(false);
        }
    };

    const handleExport = async () => {
        if (!selectedCourse || !selectedSemester) return;
        setExporting(true);
        try {
            await examGradeService.exportExamGrades(selectedCourse, selectedSemester, 'EXAM');
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
        toast.success('Nhập điểm thành công!');
    };

    const handleConfirmPublish = async () => {
        if (!selectedCourse || !selectedSemester) return;

        setPublishing(true);
        try {
            await examGradeService.publishGrades(selectedCourse, selectedSemester, 'EXAM');
            toast.success('Công bố điểm thành công!');
            fetchGrades(); // Reload to get updated status
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi công bố điểm');
        } finally {
            setPublishing(false);
            setShowPublishConfirm(false);
        }
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

    // Filter students by search term and selected class
    const filteredStudents = gradeOverview?.studentGrades.filter(student => {
        const matchesSearch = student.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.className.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesClass = selectedClass ? student.className === selectedClass : true;

        return matchesSearch && matchesClass;
    }) || [];

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

    const sortedGradeComponents = React.useMemo(() => {
        if (!gradeOverview?.gradeComponents) return [];
        return sortGradeComponents(gradeOverview.gradeComponents);
    }, [gradeOverview]);

    // Get component abbreviation
    const getComponentAbbr = (name: string, type: string): string => {
        switch (type) {
            case 'MID_TERM': return 'ME';
            case 'FINAL_EXAM': return 'FE';
            case 'PRACTICAL_EXAM': return 'PE';
            default: {
                const words = name.trim().split(/\s+/);
                if (words.length === 1) return words[0].substring(0, 4).toUpperCase();
                let abbr = '';
                let number = '';
                for (const word of words) {
                    if (/^\d+$/.test(word)) number = word;
                    else abbr += word.charAt(0).toUpperCase();
                }
                return abbr + number;
            }
        }
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
        <AcademicStaffLayout pageTitle="Quản lý điểm thi">
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
                                                .filter(c => {
                                                    const searchTerm = courseSearchTerm.toLowerCase();
                                                    const combinedLabel = `${c.code} - ${c.name}`.toLowerCase();
                                                    return (
                                                        c.code.toLowerCase().includes(searchTerm) ||
                                                        c.name.toLowerCase().includes(searchTerm) ||
                                                        combinedLabel.includes(searchTerm)
                                                    );
                                                })
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

                        {/* Class Selector (New) */}
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
                        <div className="flex flex-col items-end gap-1.5">
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
                                    disabled={!selectedCourse || !selectedSemester || !!gradeOverview?.gradesPublished || (gradeOverview ? !gradeOverview.anyGradesSubmitted : false)}
                                    title={gradeOverview?.gradesPublished ? "Điểm đã được công bố, không thể nhập thêm" : (!gradeOverview?.anyGradesSubmitted ? "Giảng viên chưa gửi điểm, không thể nhập thêm" : "Nhập điểm từ Excel")}
                                >
                                    <FileSpreadsheet size={16} />
                                    Nhập điểm
                                </button>
                            </div>

                            {/* Top Reason Bar */}
                            {(!selectedCourse || !selectedSemester || gradeOverview?.gradesPublished || (gradeOverview && !gradeOverview.anyGradesSubmitted)) && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2 px-3 py-1.5 bg-orange-50/80 dark:bg-orange-900/10 border border-orange-100/50 dark:border-orange-900/20 rounded-lg text-[10px] text-orange-700 dark:text-orange-400 font-medium backdrop-blur-sm">
                                    <AlertCircle size={12} className="flex-shrink-0" />
                                    <span>
                                        {!selectedCourse || !selectedSemester
                                            ? "Vui lòng chọn kỳ học và môn học để tiếp tục."
                                            : gradeOverview?.gradesPublished
                                                ? "Dữ liệu điểm này đã được công bố chính thức và bị khóa."
                                                : "Hệ thống đang đợi giảng viên nộp điểm thành phần."}
                                    </span>
                                </div>
                            )}
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
                                        <BookOpen size={20} className="text-fpt-orange" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                        {gradeOverview.courseName}
                                    </h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-fpt-orange dark:bg-orange-900/30">
                                        {gradeOverview.courseCode}
                                    </span>
                                    {gradeOverview.gradesPublished && (
                                        <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-full border border-green-100 dark:border-green-800">
                                            <Check size={12} className="stroke-[3]" />
                                            <span className="font-medium">Đã công bố {gradeOverview.gradesPublishedAt ? new Date(gradeOverview.gradesPublishedAt).toLocaleDateString('vi-VN') : ''}</span>
                                            {gradeOverview.gradesPublishedBy && (
                                                <span className="opacity-75 border-l border-green-200 dark:border-green-700 pl-2 ml-1">
                                                    bởi {gradeOverview.gradesPublishedBy}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium">
                                    <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded-md border border-gray-100 dark:border-zinc-700">
                                        <Users size={12} />
                                        {gradeOverview.totalStudents} sinh viên
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
                                        {!gradeOverview.anyGradesSubmitted ? '--' : (gradeOverview.averageGrade ?? '--')}
                                    </div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/10 rounded-lg px-3 py-2 border border-green-100 dark:border-green-900/30 min-w-[100px]">
                                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium mb-0.5">
                                        <Award size={14} />
                                        Tỷ lệ đạt
                                    </div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                                        {!gradeOverview.anyGradesSubmitted ? '--' : (gradeOverview.passRate ? `${gradeOverview.passRate}%` : '--')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toolbar: Search + Edit/Publish Buttons */}
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

                        {/* Edit/Publish Buttons */}
                        <div className="flex flex-col items-end gap-1.5">
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
                                    <>
                                        <button
                                            onClick={handleStartEdit}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-50"
                                            disabled={gradeOverview.gradesPublished || !gradeOverview.anyGradesSubmitted}
                                            title={gradeOverview.gradesPublished
                                                ? 'Điểm đã được công bố, không thể chỉnh sửa'
                                                : !gradeOverview.anyGradesSubmitted
                                                    ? 'Giảng viên chưa nộp điểm thành phần, chưa thể chỉnh sửa'
                                                    : 'Chỉnh sửa điểm trực tiếp'}
                                        >
                                            <Edit3 size={18} />
                                            Chỉnh sửa
                                        </button>

                                        {gradeOverview.gradesPublished ? (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
                                                <ShieldCheck size={18} />
                                                <span>Đã công bố điểm</span>
                                            </div>
                                        ) : gradeOverview.anyGradesSubmitted && (
                                            <button
                                                onClick={() => setShowPublishConfirm(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all disabled:opacity-50"
                                                disabled={publishing || gradeOverview.totalStudents === 0}
                                            >
                                                {publishing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                                Công bố điểm
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Reason Bar */}
                            {!isEditMode && (gradeOverview.gradesPublished || !gradeOverview.anyGradesSubmitted) && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-xl text-[11px] font-medium text-zinc-600 dark:text-zinc-400 shadow-sm">
                                    <div className="p-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 flex-shrink-0">
                                        <Info size={12} />
                                    </div>
                                    <span>
                                        {gradeOverview.gradesPublished
                                            ? "Điểm đã công bố. Vui lòng liên hệ quản trị viên nếu cần thay đổi dữ liệu."
                                            : "Chức năng chỉnh sửa sẽ khả dụng sau khi giảng viên nộp đủ các cấu phần điểm."}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Grade Table */}
                {loadingGrades ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fpt-orange mx-auto mb-4"></div>
                        <p className="text-gray-500">Đang tải dữ liệu điểm...</p>
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
                                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider min-w-[120px]">
                                            Mã SV
                                        </th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                            Lớp
                                        </th>
                                        {sortedGradeComponents.map((component) => (
                                            <th
                                                key={component.id}
                                                className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider min-w-[60px] ${component.isEditable ? 'bg-orange-600' : ''
                                                    }`}
                                            >
                                                <div
                                                    className="cursor-help flex items-center justify-center gap-1"
                                                    title={`${component.name} (${component.weight}%)${component.isEditable ? ' - Có thể nhập điểm' : ' - Chỉ xem'}`}
                                                >
                                                    {getComponentAbbr(component.name, component.type)}
                                                    {component.isEditable && (
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
                                    {filteredStudents.map((student, index) => {
                                        const isSubmitted = gradeOverview.submittedClasses?.includes(student.className) ?? false;

                                        return (
                                            <tr key={student.enrollmentId} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-4 py-2 text-center text-sm text-gray-500 dark:text-zinc-400">
                                                    {(index + 1).toString().padStart(2, '0')}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex flex-col">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedStudentCode(student.studentCode);
                                                                setIsStudentInfoModalOpen(true);
                                                            }}
                                                            className="text-left font-bold text-gray-900 dark:text-white text-sm hover:text-fpt-orange transition-colors"
                                                        >
                                                            {student.studentName}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-zinc-400">
                                                    {student.studentCode}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                                                    {student.className}
                                                </td>
                                                {sortedGradeComponents.map((component) => {
                                                    const gradeKey = `${student.enrollmentId}_${component.id}`;
                                                    const score = student.grades[component.id];
                                                    const editValue = editedGrades[gradeKey];

                                                    return (
                                                        <td key={component.id} className="px-2 py-2 text-center">
                                                            {isEditMode && component.isEditable && isSubmitted ? (
                                                                <input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    value={editValue ?? (score !== null && score !== undefined ? score.toFixed(1) : '')}
                                                                    onChange={(e) => handleGradeChange(student.enrollmentId, component.id, e.target.value)}
                                                                    className="w-14 text-center px-1 py-1 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    placeholder="--"
                                                                />
                                                            ) : (
                                                                <span className={`inline-block px-2 py-1 rounded-lg font-semibold text-sm border border-gray-200 dark:border-zinc-600 ${isSubmitted ? getScoreColor(score) : 'text-gray-400'}`}>
                                                                    {isSubmitted ? formatScore(score) : '--'}
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-2 text-center">
                                                    <span className={`inline-block min-w-[50px] px-3 py-1.5 rounded-lg border text-sm font-bold ${isSubmitted ? getFinalGradeColor(student.finalGrade) : 'text-gray-400 border-gray-200'}`}>
                                                        {isSubmitted ? formatScore(student.finalGrade) : '--'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {filteredStudents.length === 0 && (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                {searchTerm || selectedClass ? 'Không tìm thấy sinh viên phù hợp' : 'Không có dữ liệu'}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-12 text-center">
                        <FileSpreadsheet size={64} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg text-gray-500">Chọn học kỳ và môn học để xem bảng điểm</p>
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
                    type="EXAM"
                />
            )}

            {/* Publish Confirmation Modal */}
            {showPublishConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-xl border border-gray-100 dark:border-zinc-800 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send size={28} className="text-green-600 dark:text-green-400" />
                            </div>

                            <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
                                Xác nhận công bố điểm?
                            </h3>

                            <div className="text-center space-y-3 mb-6">
                                <p className="text-gray-600 dark:text-gray-300">
                                    Bạn đang công bố điểm cho môn <strong>{gradeOverview?.courseName}</strong> - <strong>{gradeOverview?.semesterName}</strong>.
                                </p>

                                    <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-400 text-left flex gap-2">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <div className="flex flex-col gap-1">
                                            <p>Sau khi công bố, sinh viên sẽ xem được điểm thi ngay lập tức.</p>
                                            <p className="font-semibold text-red-600 dark:text-red-400">Hành động này không thể hoàn tác.</p>
                                        </div>
                                    </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowPublishConfirm(false)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
                                    disabled={publishing}
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleConfirmPublish}
                                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                                    disabled={publishing}
                                >
                                    {publishing ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck size={18} />
                                            Xác nhận công bố
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <StudentInfoModal
                isOpen={isStudentInfoModalOpen}
                onClose={() => setIsStudentInfoModalOpen(false)}
                studentCode={selectedStudentCode}
            />
        </AcademicStaffLayout>
    );
};
