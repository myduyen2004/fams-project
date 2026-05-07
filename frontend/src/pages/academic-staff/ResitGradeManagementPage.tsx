import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { lecturerClassService, SemesterResponse } from '../../services/api/LecturerClass';
import { courseService } from '../../services/api/courseService';
import { Course } from '../../types/course';
import { examGradeService, ExamGradeOverviewResponse } from '../../services/api/examGradeService';
import {
    Download, FileSpreadsheet, Users, TrendingUp, Award,
    Loader2, Search, Check, RefreshCw, Save, Edit3, Send, ShieldCheck, AlertCircle, X
} from 'lucide-react';
import { ImportExamGradeModal } from '../../components/academic-staff/ImportExamGradeModal';
import { StudentInfoModal } from '../../components/common/StudentInfoModal';
import { studentGradeService } from '../../services/api/studentGradeService';
import { sortGradeComponents } from '../../utils/gradeSortUtils';
import toast from "@utils/toast";
import { CustomSelect } from '../../components/common/CustomSelect';
import { useWebSocket } from '../../hooks/useWebSocket';

export const ResitGradeManagementPage: React.FC = () => {
    const [semesters, setSemesters] = useState<SemesterResponse[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [gradeOverview, setGradeOverview] = useState<ExamGradeOverviewResponse | null>(null);
    const [loadingGrades, setLoadingGrades] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState<string>('');

    // Import modal state
    const [showImportModal, setShowImportModal] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editedGrades, setEditedGrades] = useState<{ [key: string]: string }>({});

    // Student Info Modal State
    const [selectedStudentCode, setSelectedStudentCode] = useState<string | null>(null);
    const [isStudentInfoModalOpen, setIsStudentInfoModalOpen] = useState(false);

    // Publish state
    const [showPublishConfirm, setShowPublishConfirm] = useState(false);
    const [publishing, setPublishing] = useState(false);

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

    const fetchGrades = useCallback(async () => {
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
    }, [selectedCourse, selectedSemester]);

    // Load grades when semester and course are selected
    useEffect(() => {
        if (selectedSemester && selectedCourse) {
            fetchGrades();
        } else {
            setGradeOverview(null);
        }
    }, [fetchGrades]);

    // Reset selected class when grades change
    useEffect(() => {
        setSelectedClass('');
    }, [gradeOverview]);

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

        if (cleanValue === '' || /^(\d{1,2})?(\.\d?)?$/.test(cleanValue)) {
            const numValue = parseFloat(cleanValue);
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
            fetchGrades(); // Reload to get updated status
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.message || 'Lỗi khi công bố điểm thi lại';
            toast.error(errorMessage, { duration: 5000 });
        } finally {
            setPublishing(false);
            setShowPublishConfirm(false);
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
                const student = gradeOverview?.studentGrades.find(s => s.enrollmentId === enrollmentId);
                const originalScore = student?.grades[componentId] ?? null;
                const newScore = valueStr.trim() === '' ? null : parseFloat(valueStr.replace(',', '.'));
                const finalScore = newScore !== null && !isNaN(newScore) ? Math.round(newScore * 10) / 10 : null;

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
            fetchGrades();
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.message || 'Lỗi khi lưu điểm';
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    // Real-time synchronization
    useWebSocket('/user/queue/notifications', (notifications: any[]) => {
        if (!notifications || notifications.length === 0) return;
        
        const hasRelevantUpdate = notifications.some(notif => 
            notif.type === 'GRADE_SUBMITTED'
        );

        if (hasRelevantUpdate && selectedCourse && selectedSemester) {
            console.log('Real-time update: Refreshing resit grades due to submission');
            fetchGrades();
        }
    });

    const availableClasses = React.useMemo(() => {
        if (!gradeOverview?.studentGrades) return [];
        const classes = new Set(gradeOverview.studentGrades.map(s => s.className));
        return Array.from(classes).sort();
    }, [gradeOverview]);

    const filteredStudents = useMemo(() => {
        const students = gradeOverview?.studentGrades ?? [];
        return students.filter(student => {
            const matchesSearch = student.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.className.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesClass = selectedClass ? student.className === selectedClass : true;
            return matchesSearch && matchesClass;
        });
    }, [gradeOverview, searchTerm, selectedClass]);

    const getScoreColor = (score: number | null): string => {
        if (score === null || score === undefined) return 'text-gray-400';
        return 'text-gray-900 dark:text-white';
    };

    const getFinalGradeColorByStatus = (status: string | undefined | null): string => {
        if (status === 'PASSED') return 'text-green-600 bg-green-50 border-green-200';
        if (status === 'FAILED') return 'text-red-600 bg-red-50 border-red-200';
        return 'text-gray-400 border-gray-200';
    };

    const formatScore = (score: number | null): string => {
        if (score === null || score === undefined) return '--';
        return score.toFixed(1);
    };

    const sortedGradeComponents = React.useMemo(() => {
        if (!gradeOverview?.gradeComponents) return [];
        return sortGradeComponents(gradeOverview.gradeComponents);
    }, [gradeOverview]);

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
                if (words.length === 1) return words[0].substring(0, 4).toUpperCase();
                let abbr = '';
                for (const word of words) {
                    if (word.length > 0) abbr += word.charAt(0).toUpperCase();
                }
                return abbr;
            }
        }
    };

    return (
        <AcademicStaffLayout pageTitle="Quản lý thi lại">
            <div className="space-y-6">
                {/* Filters */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 p-6 shadow-sm">
                    <div className="flex flex-wrap gap-6 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <CustomSelect
                                label="Học kỳ"
                                value={selectedSemester}
                                onChange={(val) => setSelectedSemester(val)}
                                options={semesters.map(s => ({ label: s.name, value: s.code }))}
                            />
                        </div>

                        <div className="flex-1 min-w-[300px]">
                            <CustomSelect
                                label="Môn học"
                                value={selectedCourse}
                                onChange={(val) => setSelectedCourse(val)}
                                options={courses.map(c => ({ label: `${c.code} - ${c.name}`, value: c.code }))}
                                placeholder="-- Chọn môn học --"
                                isSearchable
                            />
                        </div>

                        <div className="flex-1 min-w-[150px]">
                            <CustomSelect
                                label="Lớp học"
                                value={selectedClass}
                                onChange={(val) => setSelectedClass(val)}
                                options={[
                                    { label: 'Tất cả các lớp', value: '' },
                                    ...availableClasses.map(c => ({ label: c, value: c }))
                                ]}
                                disabled={!gradeOverview || availableClasses.length === 0}
                            />
                        </div>

                        <div className="flex items-end gap-3 mb-1">
                            <button
                                onClick={handleExport}
                                className="flex h-[52px] items-center gap-2 px-6 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm text-gray-700 dark:text-gray-200 font-bold hover:border-fpt-orange/40 hover:shadow-lg transition-all disabled:opacity-50"
                                disabled={!gradeOverview || exporting}
                            >
                                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                Xuất Excel
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex h-[52px] items-center gap-2 px-6 bg-fpt-orange text-white rounded-2xl text-sm font-bold hover:bg-orange-600 hover:shadow-lg hover:shadow-fpt-orange/20 transition-all disabled:opacity-50"
                                disabled={!selectedCourse || !selectedSemester || !gradeOverview?.examGradesPublished || gradeOverview?.resitGradesPublished || (gradeOverview ? !gradeOverview.anyGradesSubmitted : false)}
                                title={!gradeOverview?.examGradesPublished ? "Cần công bố điểm thi (FE) trước khi nhập điểm thi lại" : gradeOverview?.resitGradesPublished ? "Điểm thi lại đã được công bố, không thể chỉnh sửa" : (!gradeOverview?.anyGradesSubmitted ? "Giảng viên chưa gửi điểm, không thể nhập thêm" : "Nhập điểm thi lại từ Excel")}
                            >
                                <FileSpreadsheet size={16} />
                                Nhập điểm
                            </button>
                        </div>
                    </div>

                    {(!selectedCourse || !selectedSemester || !gradeOverview?.examGradesPublished || gradeOverview?.resitGradesPublished || (gradeOverview && !gradeOverview.anyGradesSubmitted)) && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-3 px-4 py-3 bg-orange-50/80 dark:bg-orange-900/10 border-2 border-orange-100/50 dark:border-orange-900/20 rounded-2xl text-xs text-orange-700 dark:text-orange-400 font-bold backdrop-blur-sm">
                            <AlertCircle size={14} className="flex-shrink-0" />
                            <span>
                                {!selectedCourse || !selectedSemester
                                    ? "Vui lòng chọn kỳ học và môn học để tiếp tục."
                                    : !gradeOverview?.examGradesPublished
                                        ? "Cần công bố điểm thi (FE) trước khi nhập điểm thi lại."
                                        : gradeOverview?.resitGradesPublished
                                            ? "Dữ liệu điểm thi lại đã được công bố chính thức."
                                            : "Hệ thống đang đợi giảng viên nộp điểm thành phần."}
                            </span>
                        </div>
                    )}
                </div>

                {/* Course Info Header */}
                {gradeOverview && (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-2xl">
                                        <RefreshCw size={24} className="text-fpt-orange" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                                Thi lại: {gradeOverview.courseName}
                                            </h2>
                                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-orange-100 text-fpt-orange dark:bg-orange-900/30 border border-orange-200/50">
                                                {gradeOverview.courseCode}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                                            <span className="flex items-center gap-2">
                                                <Users size={14} />
                                                {gradeOverview.studentGrades.length} sinh viên đủ điều kiện
                                            </span>
                                            <span className="text-gray-300">•</span>
                                            <span>{gradeOverview.gradeComponents.length} cấu phần điểm</span>
                                        </div>
                                    </div>
                                </div>
                                {gradeOverview.resitGradesPublished && (
                                    <div className="flex items-center gap-2.5 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[11px] font-bold uppercase tracking-wider rounded-xl border-2 border-green-100 dark:border-green-800/50 w-fit">
                                        <Check size={14} className="stroke-[3]" />
                                        <span>Đã công bố thi lại</span>
                                    </div>
                                )}
                            </div>

                            {/* Stats Cards */}
                            <div className="flex gap-4">
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border-2 border-gray-100 dark:border-zinc-800 min-w-[120px] shadow-sm text-center">
                                    <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                                        <TrendingUp size={14} />
                                        Điểm TB
                                    </div>
                                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                                        {!gradeOverview.anyGradesSubmitted ? '--' : (gradeOverview.averageGrade ?? '--')}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border-2 border-gray-100 dark:border-zinc-800 min-w-[120px] shadow-sm text-center">
                                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                                        <Award size={14} />
                                        Tỷ lệ đạt
                                    </div>
                                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                                        {!gradeOverview.anyGradesSubmitted ? '--' : (gradeOverview.passRate ? `${gradeOverview.passRate}%` : '--')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toolbar */}
                {gradeOverview && (
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                        <div className="w-full lg:w-1/2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Tìm kiếm</label>
                            <div className="relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm sinh viên theo tên hoặc MSSV..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-[52px] pl-12 pr-4 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-3 w-full lg:w-auto">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                {isEditMode ? (
                                    <>
                                        <button onClick={handleCancelEdit} className="flex-1 sm:flex-none h-[52px] flex items-center justify-center gap-2 px-6 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm text-gray-600 font-bold hover:bg-gray-50 transition-all active:scale-95">
                                            <X size={18} /> Hủy
                                        </button>
                                        <button onClick={handleSaveGrades} className="flex-1 sm:flex-none h-[52px] flex items-center justify-center gap-2 px-6 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-500/20 active:scale-95" disabled={saving}>
                                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Lưu thay đổi
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={handleStartEdit} className="flex-1 sm:flex-none h-[52px] flex items-center justify-center gap-2 px-6 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95" disabled={gradeOverview.resitGradesPublished || !gradeOverview.anyGradesSubmitted}>
                                            <Edit3 size={18} /> Chỉnh sửa
                                        </button>
                                        {!gradeOverview.resitGradesPublished && gradeOverview.anyGradesSubmitted && (
                                            <button onClick={() => setShowPublishConfirm(true)} className="flex-1 sm:flex-none h-[52px] flex items-center justify-center gap-2 px-6 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-500/20 active:scale-95">
                                                <Send size={18} /> Công bố điểm
                                            </button>
                                        )}
                                        {gradeOverview.resitGradesPublished && (
                                            <div className="flex h-[52px] items-center px-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800/50 rounded-2xl text-sm text-green-700 font-bold">
                                                <ShieldCheck size={18} className="mr-2" /> Đã công bố
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
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
                                        <th className="px-4 py-5 text-center w-16 text-xs font-bold uppercase tracking-widest whitespace-nowrap">STT</th>
                                        <th className="px-4 py-5 text-left w-[200px] text-xs font-bold uppercase tracking-widest whitespace-nowrap">Thông tin sinh viên</th>
                                        <th className="px-4 py-5 text-left w-[120px] text-xs font-bold uppercase tracking-widest whitespace-nowrap">Mã SV</th>
                                        <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Lớp</th>
                                        {sortedGradeComponents.map((component) => (
                                            <th key={component.id} className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider min-w-[60px] ${component.type === 'RESIT' ? 'bg-orange-600' : ''}`}>
                                                <div className="cursor-help flex items-center justify-center gap-1" title={`${component.name} (${component.weight}%)${component.type === 'RESIT' ? ' - Có thể nhập điểm' : ' - Chỉ xem'}`}>
                                                    {getComponentAbbr(component.name, component.type)}
                                                    {component.type === 'RESIT' && <span className="text-[8px] bg-white/20 px-1 rounded">✎</span>}
                                                </div>
                                                <div className="text-orange-200 font-normal mt-0.5 text-[10px]">{component.weight}%</div>
                                            </th>
                                        ))}
                                        <th className="px-4 py-5 text-center w-[100px] text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            <div>Điểm TB</div>
                                            <div className="text-orange-200 font-normal mt-1">Tổng kết</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                                    {filteredStudents.map((student, index) => {
                                        const isSubmitted = gradeOverview.submittedClasses?.includes(student.className) ?? false;
                                        return (
                                            <tr key={student.enrollmentId} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-4 py-2 text-center text-sm text-gray-500 dark:text-zinc-400">{(index + 1).toString().padStart(2, '0')}</td>
                                                <td className="px-4 py-2">
                                                    <button onClick={() => { setSelectedStudentCode(student.studentCode); setIsStudentInfoModalOpen(true); }} className="text-left font-bold text-gray-900 dark:text-white text-sm hover:text-fpt-orange transition-colors">{student.studentName}</button>
                                                </td>
                                                <td className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-zinc-400">{student.studentCode}</td>
                                                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{student.className}</td>
                                                {sortedGradeComponents.map((component) => {
                                                    const gradeKey = `${student.enrollmentId}_${component.id}`;
                                                    const score = student.grades[component.id];
                                                    const editValue = editedGrades[gradeKey];
                                                    return (
                                                        <td key={component.id} className="px-2 py-2 text-center">
                                                            {isEditMode && component.type === 'RESIT' && isSubmitted ? (
                                                                <input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    value={editValue ?? (score !== null && score !== undefined ? score.toFixed(1) : '')}
                                                                    onChange={(e) => handleGradeChange(student.enrollmentId, component.id, e.target.value)}
                                                                    className="w-14 text-center px-1 py-1 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`inline-block min-w-[50px] px-3 py-1 rounded-lg border text-sm font-bold ${isSubmitted ? getFinalGradeColorByStatus(student.status) : 'text-gray-400 border-gray-200'}`}>
                                                            {isSubmitted ? formatScore(student.finalGrade) : '--'}
                                                        </span>
                                                        {isSubmitted && student.status && student.status !== 'PENDING' && (
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${student.status === 'PASSED' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{student.status}</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-12 text-center">
                        <FileSpreadsheet size={64} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg text-gray-500">Chọn học kỳ và môn học để xem bảng điểm thi lại</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showImportModal && selectedCourse && selectedSemester && (
                <ImportExamGradeModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onSuccess={handleImportSuccess}
                    courseCode={selectedCourse}
                    semesterCode={selectedSemester}
                    type="RESIT"
                    existingData={gradeOverview || undefined}
                />
            )}

            {showPublishConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[500] animate-in fade-in duration-300 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 border-2 border-gray-100 dark:border-zinc-800 overflow-hidden">
                        <div className="p-8">
                            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Send size={32} className="text-green-600 dark:text-green-400 stroke-[2.5]" />
                            </div>
                            <h3 className="text-2xl font-black text-center text-gray-900 dark:text-white mb-3 tracking-tight">Xác nhận công bố điểm thi lại?</h3>
                            <div className="text-center space-y-4 mb-8">
                                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-medium">
                                    Bạn đang công bố điểm thi lại cho môn <span className="font-bold text-gray-900 dark:text-white">{gradeOverview?.courseName}</span>.
                                </p>
                                <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/20 rounded-2xl p-4 text-xs text-red-700 dark:text-red-400 text-left flex gap-3">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <div className="flex flex-col gap-1">
                                        <p className="font-black uppercase tracking-wider">Lưu ý quan trọng:</p>
                                        <p className="font-bold opacity-90">Sau khi công bố, sinh viên sẽ xem được điểm thi lại ngay lập tức.</p>
                                        <p className="font-black uppercase tracking-wide underline underline-offset-2">Hành động này không thể hoàn tác.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button onClick={() => setShowPublishConfirm(false)} className="flex-1 h-[52px] px-6 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold border-2 border-gray-100 dark:border-zinc-800 hover:bg-gray-50 transition-all active:scale-95" disabled={publishing}>Hủy bỏ</button>
                                <button onClick={handleConfirmPublish} className="flex-1 h-[52px] px-6 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50" disabled={publishing}>
                                    {publishing ? <Loader2 size={20} className="animate-spin" /> : <><Send size={18} />Xác nhận</>}
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

