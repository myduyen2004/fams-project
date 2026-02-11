import React, { useState, useEffect, useRef } from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { lecturerClassService, SemesterResponse, ClassSectionResponse } from '../../services/api/LecturerClass';
import { studentGradeService, GradeOverviewResponse, GradeComponentInfo } from '../../services/api/studentGradeService';
import { lecturerOtpService } from '../../services/api/lecturerOtpService';
import { authService } from '../../services/api/authService';
import { ChevronDown, FileSpreadsheet, Download, Users, TrendingUp, Award, Check, Loader2, Edit3, Save, X, Search, Send } from 'lucide-react';
import { ImportGradeModal } from '../../components/lecturer/ImportGradeModal';
import { OtpSetupModal } from '../../components/lecturer/OtpSetupModal';
import { OtpVerificationModal } from '../../components/lecturer/OtpVerificationModal';
import toast from 'react-hot-toast';

export const LecturerGradeManagementPage: React.FC = () => {
    const [semesters, setSemesters] = useState<SemesterResponse[]>([]);
    const [classes, setClasses] = useState<ClassSectionResponse[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [gradeOverview, setGradeOverview] = useState<GradeOverviewResponse | null>(null);
    const [loadingGrades, setLoadingGrades] = useState<boolean>(false);

    // Dropdown states
    const [isSemesterOpen, setIsSemesterOpen] = useState(false);
    const [isClassOpen, setIsClassOpen] = useState(false);
    const semesterDropdownRef = useRef<HTMLDivElement>(null);
    const classDropdownRef = useRef<HTMLDivElement>(null);

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Inline edit state - store as strings to allow typing decimals
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedGrades, setEditedGrades] = useState<{ [key: string]: string }>({});
    const [saving, setSaving] = useState(false);

    // OTP state
    const [hasOtp, setHasOtp] = useState<boolean | null>(null);
    const [otpVerified, setOtpVerified] = useState(false);
    const [showOtpSetupModal, setShowOtpSetupModal] = useState(false);
    const [showOtpVerifyModal, setShowOtpVerifyModal] = useState(false);
    const [isRegenerateMode, setIsRegenerateMode] = useState(false);
    const [pendingAction, setPendingAction] = useState<'edit' | 'import' | 'submit' | null>(null);

    // Search and submit state
    const [searchTerm, setSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

    const user = authService.getUser();

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (semesterDropdownRef.current && !semesterDropdownRef.current.contains(event.target as Node)) {
                setIsSemesterOpen(false);
            }
            if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
                setIsClassOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Check OTP status on mount
    useEffect(() => {
        const checkOtpStatus = async () => {
            try {
                const status = await lecturerOtpService.getOtpStatus();
                setHasOtp(status.hasOtp);

                // Also check if session is valid
                if (status.hasOtp) {
                    const session = await lecturerOtpService.checkSession();
                    setOtpVerified(session.hasValidSession);
                }
            } catch (error) {
                console.error('Failed to check OTP status', error);
            }
        };
        checkOtpStatus();
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
            }
        };
        fetchSemesters();
    }, []);

    // Load classes when semester changes
    useEffect(() => {
        if (selectedSemester && user?.id) {
            fetchClasses();
        }
    }, [selectedSemester, user?.id]);

    // Load grades when class changes
    useEffect(() => {
        if (selectedClass) {
            fetchGrades();
        } else {
            setGradeOverview(null);
        }
    }, [selectedClass]);

    const fetchClasses = async () => {
        try {
            const data = await lecturerClassService.getTeachingClasses(selectedSemester, {
                lecturerId: user?.id,
                size: 100
            });
            setClasses(data.content);
            // Reset selected class when semester changes
            setSelectedClass('');
        } catch (error) {
            console.error("Failed to fetch classes", error);
        }
    };

    const fetchGrades = async () => {
        setLoadingGrades(true);
        try {
            const data = await studentGradeService.getGradeOverview(selectedClass);
            setGradeOverview(data);
        } catch (error) {
            console.error("Failed to fetch grades", error);
        } finally {
            setLoadingGrades(false);
        }
    };

    // Regular score - always black text, no background
    const getScoreColor = (score: number | null): string => {
        if (score === null || score === undefined) return 'text-gray-400';
        return 'text-gray-900 dark:text-white';
    };

    const getScoreBgColor = (_score: number | null): string => {
        return 'border-gray-200 dark:border-zinc-600';
    };

    // Final grade - green if >= 5, red if < 5
    const getFinalGradeColor = (score: number | null): string => {
        if (score === null || score === undefined) return 'text-gray-400 border-gray-200';
        if (score >= 5.0) return 'text-green-600 bg-green-50 border-green-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const formatScore = (score: number | null): string => {
        if (score === null || score === undefined) return '--';
        return score.toFixed(1);
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Generate abbreviated name: "Progress Test 1" -> "PT1", "Midterm Exam" -> "ME"
    const getAbbreviatedName = (name: string): string => {
        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            return words[0].substring(0, 4).toUpperCase();
        }
        // Get first letter of each word + number at end if exists
        let abbr = '';
        let number = '';
        for (const word of words) {
            if (/^\d+$/.test(word)) {
                number = word;
            } else {
                abbr += word.charAt(0).toUpperCase();
            }
        }
        return abbr + number;
    };

    const getSelectedSemesterName = () => {
        const semester = semesters.find(s => s.code === selectedSemester);
        return semester ? semester.name : 'Chọn học kỳ';
    };

    const getSelectedClassName = () => {
        if (!selectedClass) return '-- Chọn lớp học --';
        const cls = classes.find(c => c.className === selectedClass);
        return cls ? `${cls.className} - ${cls.courseName}` : selectedClass;
    };

    const handleExport = async () => {
        if (!selectedClass) return;
        setExporting(true);
        try {
            await studentGradeService.exportGrades(selectedClass);
            toast.success('Đã tải xuống bảng điểm');
        } catch (error) {
            toast.error('Không thể xuất file');
        } finally {
            setExporting(false);
        }
    };

    // Check if component is editable (not MidTerm, PE, Final, Resit)
    const isEditable = (component: GradeComponentInfo): boolean => {
        const NON_EDITABLE_TYPES = ['MID_TERM', 'PRACTICAL_EXAM', 'FINAL_EXAM', 'RESIT'];
        return !NON_EDITABLE_TYPES.includes(component.type) && !component.isResit;
    };

    // Generate key for edited grades map
    const gradeKey = (enrollmentId: number, componentId: number) => `${enrollmentId}_${componentId}`;

    // Check OTP before action
    const requireOtpForAction = (action: 'edit' | 'import' | 'submit') => {
        // If no OTP set up, show setup modal
        if (!hasOtp) {
            setPendingAction(action);
            setShowOtpSetupModal(true);
            return false;
        }

        // If not verified yet, show verify modal
        if (!otpVerified) {
            setPendingAction(action);
            setShowOtpVerifyModal(true);
            return false;
        }

        return true;
    };

    // Start edit mode - checks OTP first
    const handleStartEdit = () => {
        if (!gradeOverview) return;

        // Require OTP verification
        if (!requireOtpForAction('edit')) return;

        // Initialize edit mode
        initializeEditMode();
    };

    // Initialize edit mode directly (after OTP verified)
    const initializeEditMode = () => {
        if (!gradeOverview) return;

        // Initialize edited grades with current values as strings
        const initial: { [key: string]: string } = {};
        gradeOverview.studentGrades.forEach(student => {
            gradeOverview.gradeComponents.forEach(component => {
                if (isEditable(component)) {
                    const score = student.grades[component.id];
                    initial[gradeKey(student.enrollmentId, component.id)] = score !== null && score !== undefined ? score.toFixed(1) : '';
                }
            });
        });
        setEditedGrades(initial);
        setIsEditMode(true);
    };

    // Handle import button click
    const handleImportClick = () => {
        if (!requireOtpForAction('import')) return;
        setShowImportModal(true);
    };

    // Handle OTP setup success
    const handleOtpSetupSuccess = () => {
        setShowOtpSetupModal(false);
        setHasOtp(true);
        setOtpVerified(true); // After creating OTP, auto-verify for this session
        setIsRegenerateMode(false);

        // Continue with pending action - use direct functions to avoid OTP re-check
        if (pendingAction === 'edit') {
            initializeEditMode();
        } else if (pendingAction === 'import') {
            setShowImportModal(true);
        } else if (pendingAction === 'submit') {
            setShowSubmitConfirm(true);
        }
        setPendingAction(null);
    };

    // Handle OTP verify success
    const handleOtpVerifySuccess = () => {
        setShowOtpVerifyModal(false);
        setOtpVerified(true);

        // Continue with pending action - use direct functions to avoid OTP re-check
        if (pendingAction === 'edit') {
            initializeEditMode();
        } else if (pendingAction === 'import') {
            setShowImportModal(true);
        } else if (pendingAction === 'submit') {
            setShowSubmitConfirm(true);
        }
        setPendingAction(null);
    };

    // Handle submit grades button click
    const handleSubmitClick = () => {
        if (!requireOtpForAction('submit')) return;
        setShowSubmitConfirm(true);
    };

    // Execute grade submission
    const handleConfirmSubmit = async () => {
        if (!gradeOverview) return;
        setSubmitting(true);
        try {
            await studentGradeService.submitGrades(gradeOverview.className);
            toast.success('Đã gửi điểm cho phòng đào tạo thành công!');
            setShowSubmitConfirm(false);
            fetchGrades(); // Refresh to update submission status
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể gửi điểm');
        } finally {
            setSubmitting(false);
        }
    };

    // Cancel edit mode
    const handleCancelEdit = () => {
        setEditedGrades({});
        setIsEditMode(false);
    };

    // Save all edited grades
    const handleSaveGrades = async () => {
        if (!gradeOverview) return;
        setSaving(true);
        try {
            const updates: Promise<void>[] = [];
            for (const [key, valueStr] of Object.entries(editedGrades)) {
                const [enrollmentId, componentId] = key.split('_').map(Number);
                // Find original score
                const student = gradeOverview.studentGrades.find(s => s.enrollmentId === enrollmentId);
                const originalScore = student?.grades[componentId] ?? null;
                // Parse string to number or null
                const newScore = valueStr.trim() === '' ? null : parseFloat(valueStr.replace(',', '.'));
                const finalScore = newScore !== null && !isNaN(newScore) ? Math.round(newScore * 10) / 10 : null;
                // Only save if changed
                if (finalScore !== originalScore) {
                    updates.push(studentGradeService.updateGrade({
                        enrollmentId,
                        gradeComponentId: componentId,
                        score: finalScore
                    }));
                }
            }
            await Promise.all(updates);
            toast.success(`Đã lưu ${updates.length} thay đổi`);
            setIsEditMode(false);
            setEditedGrades({});
            fetchGrades(); // Refresh data
        } catch (error) {
            toast.error('Không thể lưu điểm');
        } finally {
            setSaving(false);
        }
    };

    // Handle grade input change - store as string to allow typing decimals
    const handleGradeChange = (enrollmentId: number, componentId: number, value: string) => {
        const key = gradeKey(enrollmentId, componentId);
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

    // Định nghĩa thứ tự ưu tiên cho các loại (khi cùng trọng số)
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
        // Các loại khác sẽ tự động có priority thấp hơn
    };

    const sortedGradeComponents = React.useMemo(() => {
        if (!gradeOverview?.gradeComponents) return [];

        // 1. Tính tổng trọng số cho từng loại (Grade Type)
        const typeTotalWeight: Record<string, number> = {};
        gradeOverview.gradeComponents.forEach(gc => {
            const currentTotal = typeTotalWeight[gc.type] || 0;
            typeTotalWeight[gc.type] = currentTotal + gc.weight;
        });

        return [...gradeOverview.gradeComponents].sort((a, b) => {
            const BOTTOM_TYPES = ['FINAL_EXAM', 'RESIT'];
            const isABottom = BOTTOM_TYPES.includes(a.type);
            const isBBottom = BOTTOM_TYPES.includes(b.type);

            // 1. Xử lý nhóm ĐÁY (FE/RESIT)
            if (isABottom && !isBBottom) return 1;
            if (!isABottom && isBBottom) return -1;

            if (isABottom && isBBottom) {
                // Final Exam luôn đứng trước Resit
                const pMap: Record<string, number> = { 'FINAL_EXAM': 1, 'RESIT': 2 };
                return (pMap[a.type] || 99) - (pMap[b.type] || 99);
            }

            // 2. Xử lý nhóm THƯỜNG

            // Ưu tiên A: Theo TỔNG TRỌNG SỐ của Loại (Type Total Weight) tăng dần
            const totalWeightA = typeTotalWeight[a.type] || 0;
            const totalWeightB = typeTotalWeight[b.type] || 0;

            if (Math.abs(totalWeightA - totalWeightB) > 0.001) {
                return totalWeightA - totalWeightB;
            }

            // Ưu tiên B: Theo Loại (Type Priority) - Nếu tổng trọng số bằng nhau
            const typePriorityA = TYPE_PRIORITY[a.type] || 99;
            const typePriorityB = TYPE_PRIORITY[b.type] || 99;

            if (typePriorityA !== typePriorityB) {
                return typePriorityA - typePriorityB;
            }

            // Ưu tiên C: Theo Tên (Name)
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [gradeOverview]);

    return (
        <LecturerLayout pageTitle="Quản lý điểm số">
            <div className="mt-5 ml-10 mr-10 space-y-6">
                {/* Filter Section - Semester and Class at top */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Semester Selector */}
                        <div className="flex-1" ref={semesterDropdownRef}>
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

                        {/* Class Selector */}
                        <div className="flex-1" ref={classDropdownRef}>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Lớp học
                            </label>
                            <div className="relative">
                                <button
                                    onClick={() => !classes.length ? null : setIsClassOpen(!isClassOpen)}
                                    disabled={classes.length === 0}
                                    className={`flex items-center justify-between w-full rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-fpt-orange transition-all ${classes.length === 0
                                        ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white'
                                        }`}
                                >
                                    <span className="text-sm font-medium truncate">
                                        {getSelectedClassName()}
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
                                            <span className="text-sm font-medium">-- Chọn lớp học --</span>
                                            {!selectedClass && <Check size={16} />}
                                        </button>
                                        {classes.map((cls) => (
                                            <button
                                                key={cls.className}
                                                onClick={() => {
                                                    setSelectedClass(cls.className);
                                                    setIsClassOpen(false);
                                                }}
                                                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${selectedClass === cls.className
                                                    ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange'
                                                    : 'text-gray-900 dark:text-white'
                                                    }`}
                                            >
                                                <span className="text-sm font-medium">{cls.className}</span>
                                                {selectedClass === cls.className && <Check size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons - Export and Import only, Edit moved to table toolbar */}
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
                                onClick={handleImportClick}
                                className="flex items-center gap-2 px-4 py-2 bg-fpt-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-all disabled:opacity-50"
                                disabled={!gradeOverview || gradeOverview?.gradesSubmitted}
                            >
                                <FileSpreadsheet size={16} />
                                Nhập điểm
                            </button>
                        </div>
                    </div>
                </div>

                {/* Class Info Header */}
                {gradeOverview && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                        {gradeOverview.className}
                                    </h2>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${gradeOverview.status === 'IN_PROGRESS'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400'
                                        }`}>
                                        {gradeOverview.status === 'IN_PROGRESS' ? 'Đang học' : gradeOverview.status}
                                    </span>
                                    {/* Submission Status Badge */}
                                    {gradeOverview.gradesSubmitted && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                                            <Check size={10} />
                                            Đã gửi điểm
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium flex-wrap">
                                    <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded-md border border-gray-100 dark:border-zinc-700">
                                        <div className="w-1.5 h-1.5 rounded-full bg-fpt-orange"></div>
                                        {gradeOverview.courseName}
                                    </span>
                                    <span>•</span>
                                    <span>{gradeOverview.totalStudents} sinh viên</span>
                                    {gradeOverview.gradesSubmittedAt && (
                                        <>
                                            <span>•</span>
                                            <span className="text-blue-600 dark:text-blue-400">
                                                Gửi lúc: {new Date(gradeOverview.gradesSubmittedAt).toLocaleString('vi-VN')}
                                                {gradeOverview.gradesSubmittedByName && ` bởi ${gradeOverview.gradesSubmittedByName}`}
                                            </span>
                                        </>
                                    )}
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

                {/* Table Toolbar - Search and Edit/Submit Buttons */}
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

                        {/* Edit/Submit Buttons */}
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
                                        disabled={gradeOverview.gradesSubmitted}
                                        title={gradeOverview.gradesSubmitted ? 'Điểm đã được gửi, không thể chỉnh sửa' : ''}
                                    >
                                        <Edit3 size={18} />
                                        Chỉnh sửa
                                    </button>
                                    {!gradeOverview.gradesSubmitted && (
                                        <button
                                            onClick={handleSubmitClick}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all disabled:opacity-50"
                                            disabled={submitting}
                                        >
                                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                            Gửi điểm
                                        </button>
                                    )}
                                </>
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
                                        {sortedGradeComponents.map((component) => (
                                            <th
                                                key={component.id}
                                                className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider min-w-[60px]"
                                            >
                                                <div
                                                    className="cursor-help"
                                                    title={`${component.name} (${component.weight}%)`}
                                                >
                                                    {getAbbreviatedName(component.name)}
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
                                    {gradeOverview.studentGrades
                                        .filter(student => {
                                            if (!searchTerm.trim()) return true;
                                            const term = searchTerm.toLowerCase();
                                            return student.studentName.toLowerCase().includes(term) ||
                                                student.studentCode.toLowerCase().includes(term);
                                        })
                                        .map((student, index) => (
                                            <tr key={student.enrollmentId} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-4 py-2 text-center text-sm text-gray-500 dark:text-zinc-400">
                                                    {(index + 1).toString().padStart(2, '0')}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {student.studentName}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-zinc-500 font-mono">
                                                                {student.studentCode}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {sortedGradeComponents.map((component) => {
                                                    const score = student.grades[component.id];
                                                    const key = gradeKey(student.enrollmentId, component.id);
                                                    const isComponentEditable = isEditable(component);
                                                    const editValue = editedGrades[key];

                                                    return (
                                                        <td key={component.id} className="px-2 py-2 text-center">
                                                            {isEditMode && isComponentEditable ? (
                                                                <input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    value={editValue ?? ''}
                                                                    onChange={(e) => handleGradeChange(student.enrollmentId, component.id, e.target.value)}
                                                                    className="w-14 text-center px-1 py-1 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    placeholder="--"
                                                                />
                                                            ) : (
                                                                <span className={`inline-block px-2 py-1 rounded-lg font-semibold text-sm border ${getScoreBgColor(score)} ${getScoreColor(score)} ${isComponentEditable ? '' : 'opacity-60'}`}>
                                                                    {formatScore(score)}
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-2 py-2 text-center">
                                                    <span className={`inline-block px-2 py-1 rounded-lg font-bold text-sm border ${getFinalGradeColor(student.finalGrade)}`}>
                                                        {formatScore(student.finalGrade)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}

                                    {gradeOverview.studentGrades.length === 0 && (
                                        <tr>
                                            <td colSpan={sortedGradeComponents.length + 3} className="px-6 py-16 text-center">
                                                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                                <p className="text-gray-500 text-lg">Không có sinh viên trong lớp này</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Stats */}
                        <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-700 flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                                Điểm trung bình: <span className="font-bold text-fpt-orange">{gradeOverview.averageGrade ?? '--'}</span>
                                <span className="mx-4">•</span>
                                Tỷ lệ đạt: <span className="font-bold text-green-600">{gradeOverview.passRate ? `${gradeOverview.passRate}%` : '--'}</span>
                            </div>
                            <div className="text-sm text-gray-400">
                                Cập nhật lần cuối: {formatDate(gradeOverview.lastUpdated)}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-16 text-center">
                        <div className="w-24 h-24 rounded-full bg-orange-50 dark:bg-zinc-800 mx-auto mb-6 flex items-center justify-center">
                            <FileSpreadsheet size={48} className="text-fpt-orange" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Chọn lớp học để xem điểm
                        </h3>
                        <p className="text-gray-500">
                            Vui lòng chọn học kỳ và lớp học ở trên để hiển thị bảng điểm
                        </p>
                    </div>
                )}
            </div>

            {/* Import Modal */}
            {gradeOverview && (
                <ImportGradeModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onSuccess={() => {
                        fetchGrades();
                        setShowImportModal(false);
                    }}
                    className={gradeOverview.className}
                    courseName={gradeOverview.courseName}
                />
            )}

            {/* OTP Setup Modal */}
            <OtpSetupModal
                isOpen={showOtpSetupModal}
                onClose={() => {
                    setShowOtpSetupModal(false);
                    setIsRegenerateMode(false);
                    setPendingAction(null);
                }}
                onSuccess={handleOtpSetupSuccess}
                isRegenerate={isRegenerateMode}
            />

            {/* OTP Verification Modal */}
            <OtpVerificationModal
                isOpen={showOtpVerifyModal}
                onClose={() => {
                    setShowOtpVerifyModal(false);
                    setPendingAction(null);
                }}
                onSuccess={handleOtpVerifySuccess}
            />

            {/* Submit Confirmation Modal */}
            {showSubmitConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send size={28} className="text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Xác nhận gửi điểm
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Bạn có chắc muốn gửi điểm cho phòng đào tạo?
                                Sau khi gửi, bạn sẽ <span className="font-semibold text-red-600">không thể chỉnh sửa</span> điểm nữa.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubmitConfirm(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
                                disabled={submitting}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmSubmit}
                                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <><Loader2 size={16} className="animate-spin" /> Đang gửi...</>
                                ) : (
                                    <><Send size={16} /> Xác nhận gửi</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </LecturerLayout>
    );
};

