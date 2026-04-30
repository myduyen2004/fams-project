import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { lecturerClassService, SemesterResponse, ClassSectionResponse } from '../../services/api/LecturerClass';
import { studentGradeService, GradeOverviewResponse, GradeComponentInfo } from '../../services/api/studentGradeService';
import { lecturerOtpService } from '../../services/api/lecturerOtpService';
import { authService } from '../../services/api/authService';
import { FileSpreadsheet, Download, Users, TrendingUp, Award, Check, Loader2, Edit3, Save, X, Search, Send, AlertCircle } from 'lucide-react';
import { ImportGradeModal } from '../../components/lecturer/ImportGradeModal';
import { StudentInfoModal } from '../../components/common/StudentInfoModal';
import { OtpSetupModal } from '../../components/lecturer/OtpSetupModal';
import { OtpVerificationModal } from '../../components/lecturer/OtpVerificationModal';
import { sortGradeComponents } from '../../utils/gradeSortUtils';
import toast from "@utils/toast";
import { useLocation } from 'react-router-dom';
import { CustomSelect } from '../../components/common/CustomSelect';

export const LecturerGradeManagementPage: React.FC = () => {
    const location = useLocation();
    const state = location.state as { className?: string; semesterCode?: string } | null;

    const [semesters, setSemesters] = useState<SemesterResponse[]>([]);
    const [classes, setClasses] = useState<ClassSectionResponse[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>(state?.semesterCode || '');
    const [selectedClass, setSelectedClass] = useState<string>(state?.className || '');
    const [gradeOverview, setGradeOverview] = useState<GradeOverviewResponse | null>(null);
    const [loadingGrades, setLoadingGrades] = useState<boolean>(false);

    // Dropdown states

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Student Info Modal State
    const [selectedStudentCode, setSelectedStudentCode] = useState<string | null>(null);
    const [isStudentInfoModalOpen, setIsStudentInfoModalOpen] = useState(false);

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
                if (data.length > 0 && !selectedSemester) {
                    setSelectedSemester(data[0].code);
                }
            } catch (error) {
                console.error("Failed to fetch semesters", error);
            }
        };
        fetchSemesters();
    }, []);

    const fetchClasses = useCallback(async () => {
        try {
            const data = await lecturerClassService.getTeachingClasses(selectedSemester, {
                lecturerId: user?.id,
                size: 100
            });
            setClasses(data.content);
            // Reset selected class when semester changes, if not matching state
            if (!state?.className || state.className !== selectedClass) {
                if (!data.content.find(c => c.className === selectedClass)) {
                    setSelectedClass('');
                }
            }
        } catch (error) {
            console.error("Failed to fetch classes", error);
        }
    }, [selectedSemester, user?.id, selectedClass, state?.className]);

    const fetchGrades = useCallback(async () => {
        setLoadingGrades(true);
        try {
            const data = await studentGradeService.getGradeOverview(selectedClass);
            setGradeOverview(data);
        } catch (error) {
            console.error("Failed to fetch grades", error);
        } finally {
            setLoadingGrades(false);
        }
    }, [selectedClass]);

    // Load classes when semester changes
    useEffect(() => {
        if (selectedSemester && user?.id) {
            fetchClasses();
        }
    }, [fetchClasses]);

    // Load grades when class changes
    useEffect(() => {
        if (selectedClass) {
            fetchGrades();
        } else {
            setGradeOverview(null);
        }
    }, [fetchGrades]);


    // Regular score - always black text, no background
    const getScoreColor = (score: number | null): string => {
        if (score === null || score === undefined) return 'text-gray-400';
        return 'text-gray-900 dark:text-white';
    };

    const getScoreBgColor = (_score: number | null): string => {
        return 'border-gray-200 dark:border-zinc-600';
    };

    // Final grade - green if PASSED, red if FAILED based on backend status
    const getFinalGradeColorByStatus = (status: string | undefined | null): string => {
        if (status === 'PASSED') return 'text-green-600 bg-green-50 border-green-200';
        if (status === 'FAILED') return 'text-red-600 bg-red-50 border-red-200';
        return 'text-gray-400 border-gray-200';
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
            fetchGrades(); // Refresh to update submission status
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể gửi điểm');
        } finally {
            setSubmitting(false);
            setShowSubmitConfirm(false);
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
            const updates: any[] = [];
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

    const sortedGradeComponents = React.useMemo(() => {
        if (!gradeOverview?.gradeComponents) return [];
        return sortGradeComponents(gradeOverview.gradeComponents as any);
    }, [gradeOverview]);
    const dynamicPassRate = React.useMemo(() => {
        if (!gradeOverview || !gradeOverview.studentGrades || gradeOverview.studentGrades.length === 0) return null;

        // Tìm component thi cuối kỳ (FE)
        const feComponent = gradeOverview.gradeComponents.find(c => c.type === 'FINAL_EXAM');
        if (!feComponent) return null;

        // Kiểm tra xem đã có bất kỳ sinh viên nào có điểm FE chưa
        const hasAnyFEGrade = gradeOverview.studentGrades.some(s => s.grades[feComponent.id] !== null);

        // Nếu chưa có điểm FE, chưa xét tỷ lệ đạt
        if (!hasAnyFEGrade) return null;

        // Nếu đã có điểm FE, tính tỷ lệ dựa trên số lượng sinh viên đạt (isPassing)
        // isPassing sẽ tự động được backend cập nhật khi có điểm FE hoặc Resit
        const passingStudents = gradeOverview.studentGrades.filter(s => s.isPassing).length;
        const totalStudents = gradeOverview.studentGrades.length;

        return Math.round((passingStudents / totalStudents) * 100);
    }, [gradeOverview]);

    const filteredStudents = useMemo(() =>
        (gradeOverview?.studentGrades ?? []).filter(student => {
            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase();
            return student.studentName.toLowerCase().includes(term) ||
                student.studentCode.toLowerCase().includes(term);
        }),
        [gradeOverview, searchTerm]
    );

    return (
        <LecturerLayout pageTitle="Quản lý điểm số">
            <div className="mt-5 ml-10 mr-10 space-y-6">
                {/* Filter Section - Semester and Class at top */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-6 shadow-sm">
                    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                        <div className="flex flex-wrap items-end gap-4 flex-1">
                            {/* Semester Selector */}
                            <div className="w-full sm:w-64">
                                <CustomSelect
                                    label="Học kỳ"
                                    value={selectedSemester}
                                    onChange={(val) => setSelectedSemester(val)}
                                    options={semesters.map(s => ({ label: s.name, value: s.code }))}
                                />
                            </div>

                            {/* Class Selector */}
                            <div className="w-full sm:w-96">
                                <CustomSelect
                                    label="Lớp học"
                                    value={selectedClass}
                                    onChange={(val) => setSelectedClass(val)}
                                    options={[
                                        { label: '-- Chọn lớp học --', value: '' },
                                        ...classes.map(c => ({ label: `${c.className} - ${c.courseName}`, value: c.className }))
                                    ]}
                                    disabled={classes.length === 0}
                                />
                            </div>
                        </div>

                        {/* Action Buttons - Export and Import only */}
                        <div className="flex items-end gap-3 pb-1">
                            <button
                                onClick={handleExport}
                                className="flex h-[52px] items-center gap-2 px-6 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm text-gray-700 dark:text-gray-200 font-bold hover:border-fpt-orange/40 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                                disabled={!gradeOverview || exporting}
                            >
                                {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                <span>Xuất Excel</span>
                            </button>
                            <button
                                onClick={handleImportClick}
                                className="flex h-[52px] items-center gap-2 px-8 bg-fpt-orange text-white rounded-2xl text-sm font-bold shadow-lg shadow-fpt-orange/20 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                                disabled={!gradeOverview || gradeOverview?.gradesSubmitted}
                            >
                                <FileSpreadsheet size={18} />
                                <span>Nhập điểm</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Class Info Header */}
                {gradeOverview && (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 p-6 shadow-sm">
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
                            <div className="flex gap-4">
                                <div className="bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl px-4 py-3 border border-orange-100 dark:border-orange-900/30 min-w-[120px] shadow-sm shadow-orange-500/5">
                                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-wider mb-1">
                                        <TrendingUp size={14} className="stroke-[3]" />
                                        Điểm TB
                                    </div>
                                    <div className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                        {gradeOverview.averageGrade ?? '--'}
                                    </div>
                                </div>
                                <div className="bg-green-50/50 dark:bg-green-900/10 rounded-2xl px-4 py-3 border border-green-100 dark:border-green-900/30 min-w-[120px] shadow-sm shadow-green-500/5">
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-wider mb-1">
                                        <Award size={14} className="stroke-[3]" />
                                        Tỷ lệ đạt
                                    </div>
                                    <div className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                                        {dynamicPassRate !== null ? `${dynamicPassRate}%` : '--'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table Toolbar - Search and Edit/Submit Buttons */}
                {gradeOverview && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-1/2">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm sinh viên theo tên hoặc MSSV..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-[52px] pl-12 pr-4 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm text-gray-900 dark:text-white focus:border-fpt-orange/40 focus:ring-0 transition-all outline-none"
                            />
                        </div>

                        {/* Edit/Submit Buttons */}
                        <div className="flex items-center gap-3">
                            {isEditMode ? (
                                <>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="flex h-[52px] items-center gap-2 px-6 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm text-gray-600 dark:text-gray-300 font-bold hover:border-gray-300 dark:hover:border-zinc-600 transition-all active:scale-95 disabled:opacity-50"
                                        disabled={saving}
                                    >
                                        <X size={18} />
                                        <span>Hủy</span>
                                    </button>
                                    <button
                                        onClick={handleSaveGrades}
                                        className="flex h-[52px] items-center gap-2 px-8 bg-green-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50"
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        <span>Lưu thay đổi</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleStartEdit}
                                        className="flex h-[52px] items-center gap-2 px-6 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                                        disabled={gradeOverview.gradesSubmitted}
                                        title={gradeOverview.gradesSubmitted ? 'Điểm đã được gửi, không thể chỉnh sửa' : ''}
                                    >
                                        <Edit3 size={18} />
                                        <span>Chỉnh sửa</span>
                                    </button>
                                    {!gradeOverview.gradesSubmitted && (
                                        <button
                                            onClick={handleSubmitClick}
                                            className="flex h-[52px] items-center gap-2 px-8 bg-green-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50"
                                            disabled={submitting}
                                        >
                                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                            <span>Gửi điểm</span>
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
                                        <th className="px-4 py-5 text-left w-16 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            STT
                                        </th>
                                        <th className="px-4 py-5 text-left w-[200px] text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Thông tin sinh viên
                                        </th>
                                        <th className="px-4 py-5 text-left w-[120px] text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Mã SV
                                        </th>
                                        {sortedGradeComponents.map((component) => (
                                            <th
                                                key={component.id}
                                                className="px-4 py-5 text-center w-[60px] text-xs font-bold uppercase tracking-widest whitespace-nowrap"
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
                                        <th className="px-4 py-5 text-center w-[100px] text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            <div>Điểm TB</div>
                                            <div className="text-orange-200 font-normal mt-1">
                                                Tổng kết
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                                    {filteredStudents
                                        .map((student, index) => (
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
                                                    <div className="flex flex-col items-center gap-1">
                                                        {(() => {
                                                            const computedStatus = student.finalGrade === null ? 'PENDING' : (student.isPassing ? 'PASSED' : 'FAILED');
                                                            return (
                                                                <>
                                                                    <span className={`inline-block min-w-[50px] px-3 py-1 rounded-lg border text-sm font-bold ${getFinalGradeColorByStatus(computedStatus)}`}>
                                                                        {formatScore(student.finalGrade)}
                                                                    </span>
                                                                    {computedStatus !== 'PENDING' && (
                                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${computedStatus === 'PASSED' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                            {computedStatus}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
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
                                Tỷ lệ đạt: <span className="font-bold text-green-600">{dynamicPassRate !== null ? `${dynamicPassRate}%` : '--'}</span>
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[500] animate-in fade-in duration-300 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 border-2 border-gray-100 dark:border-zinc-800 overflow-hidden">
                        <div className="p-8">
                            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Send size={32} className="text-green-600 dark:text-green-400 stroke-[2.5]" />
                            </div>

                            <h3 className="text-2xl font-black text-center text-gray-900 dark:text-white mb-3 tracking-tight">
                                Xác nhận gửi điểm?
                            </h3>

                            <div className="text-center space-y-4 mb-8">
                                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-medium">
                                    Bạn đang gửi điểm cho lớp <span className="font-bold text-gray-900 dark:text-white">{gradeOverview?.className}</span> - <span className="font-bold text-gray-900 dark:text-white">{gradeOverview?.courseName}</span>.
                                </p>

                                <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/20 rounded-2xl p-4 text-xs text-red-700 dark:text-red-400 text-left flex gap-3">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <div className="flex flex-col gap-1">
                                        <p className="font-black uppercase tracking-wider">Lưu ý quan trọng:</p>
                                        <p className="font-bold opacity-90">Sau khi gửi, bạn sẽ không thể chỉnh sửa điểm được nữa.</p>
                                        <p className="font-black uppercase tracking-wide underline underline-offset-2">Hệ thống sẽ khóa chức năng chỉnh sửa.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setShowSubmitConfirm(false)}
                                    className="flex-1 h-[52px] px-6 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold border-2 border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all active:scale-95"
                                    disabled={submitting}
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleConfirmSubmit}
                                    className="flex-1 h-[52px] px-6 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 whitespace-nowrap"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Xác nhận gửi
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
        </LecturerLayout>
    );
};



