import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FileText, Plus, CheckCircle, AlertCircle, Upload, X, Loader2, Info, Trash2, AlertTriangle, ExternalLink, ChevronDown, Check } from 'lucide-react';
import { StudentLayout } from '../../layouts/StudentLayout';
import { Pagination } from '../../components/common/Pagination';
import { academicRequestService, AcademicRequest, AcademicRequestType, CreateAcademicRequestPayload } from '../../services/api/academicRequestService';
import { majorService } from '../../services/api/majorService';
import { specializationService } from '../../services/api/specializationService';
import { subSpecializationService } from '../../services/api/subSpecializationService';
import { studentMyGradeService, StudentCourseOption } from '../../services/api/studentMyGradeService';
import { authService } from '../../services/api/authService';
import { classSectionService, ClassSectionTransferResponse } from '../../services/api/classSectionService';
import apiClient from '../../services/api/authService';
import { Major } from '../../types/major';
import { Specialization } from '../../types/specialization';
import { useWebSocket } from '../../hooks/useWebSocket';

import { Course } from '../../types/course';
import toast from "@utils/toast";

const PAGE_SIZE = 10;

// --- Internal RequestSelect Component ---
interface RequestSelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface RequestSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: RequestSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

const RequestSelect: React.FC<RequestSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Chọn...',
    disabled = false,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl transition-all ${disabled ? 'opacity-50 cursor-not-allowed text-gray-400' : 'hover:border-fpt-orange/40 focus:border-fpt-orange shadow-sm'
                    } ${isOpen ? 'border-fpt-orange ring-4 ring-fpt-orange/10' : ''}`}
            >
                <span className={`text-sm font-bold truncate ${selectedOption ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
            </button>

            {isOpen && !disabled && (
                <div className="absolute z-[600] w-full mt-2 py-2 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            disabled={opt.disabled}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={`flex items-center justify-between w-full px-4 py-3 text-left transition-colors ${opt.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'} ${value === opt.value ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange' : 'text-zinc-700 dark:text-zinc-300'
                                }`}
                        >
                            <span className="text-sm font-bold truncate pr-2">{opt.label}</span>
                            {value === opt.value && <Check className="w-4 h-4 stroke-[3] shrink-0" />}
                        </button>
                    ))}
                    {options.length === 0 && (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm text-zinc-400 font-medium italic">Không có dữ liệu</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Request type fields mapping
const REQUEST_TYPE_FIELDS: Record<string, string[]> = {
    PAUSE_SEMESTER: ['semesterId', 'reason'],
    RETAKE_COURSE: ['semesterId', 'courseId', 'reason'],
    CHANGE_CLASS: ['semesterId', 'classSectionId', 'toClassName', 'reason'],
    OVERLOAD_STUDY: ['semesterId', 'courseId', 'reason'],
    ABSENT_REQUEST: ['semesterId', 'reason'],
    GRADE_APPEAL: ['classSectionId', 'reason'],
    CHANGE_MAJOR: ['toMajor', 'toSpecialization', 'reason'],
    CHANGE_SPECIALIZATION: ['toSubSpecialization', 'reason'],
    OTHERS: ['requestTitle', 'reason', 'note'],
};

const FIELD_LABELS: Record<string, string> = {
    semesterId: 'Học kỳ',
    courseId: 'Môn học',
    classSectionId: 'Lớp học phần',
    toClassName: 'Lớp muốn chuyển đến',
    toMajor: 'Ngành muốn chuyển',
    toSpecialization: 'Chuyên ngành muốn chuyển',
    toSubSpecialization: 'Chuyên ngành hẹp muốn chuyển',
    requestTitle: 'Tiêu đề yêu cầu',
    reason: 'Lý do',
};

export const StudentAcademicRequestPage: React.FC = () => {
    // List state
    const [requests, setRequests] = useState<AcademicRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    // Request types
    const [requestTypes, setRequestTypes] = useState<AcademicRequestType[]>([]);

    // Create dialog state
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedType, setSelectedType] = useState<AcademicRequestType | null>(null);
    const [formData, setFormData] = useState<CreateAcademicRequestPayload>({
        requestType: '',
        reason: '',
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Detail dialog state
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<AcademicRequest | null>(null);

    // Supporting data
    const [semesters, setSemesters] = useState<any[]>([]);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [myCourses, setMyCourses] = useState<StudentCourseOption[]>([]);
    const [majors, setMajors] = useState<Major[]>([]);
    const [specializations, setSpecializations] = useState<Specialization[]>([]);
    const [studentProfile, setStudentProfile] = useState<any>(null);
    const [transferTargets, setTransferTargets] = useState<ClassSectionTransferResponse[]>([]);
    const [loadingTargets, setLoadingTargets] = useState(false);
    const [gradeDetail, setGradeDetail] = useState<any>(null);
    const [fetchingGrade, setFetchingGrade] = useState(false);

    // Course Search/Combobox state
    const [courseSearch, setCourseSearch] = useState('');
    const [showCourseDropdown, setShowCourseDropdown] = useState(false);

    // Request type info state
    const [infoType, setInfoType] = useState<AcademicRequestType | null>(null);
    const [fetchingMajors, setFetchingMajors] = useState(false);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [requestToCancel, setRequestToCancel] = useState<number[]>([]);
    const [cancelling, setCancelling] = useState(false);

    // Fetch requests
    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const response = await academicRequestService.getMyRequests(currentPage, PAGE_SIZE, 'createdAt,desc', {
                status: statusFilter,
                requestType: typeFilter
            });
            setRequests(response.content);
            setTotalPages(response.totalPages);
            setTotalElements(response.totalElements);
            setSelectedIds([]); // Clear selection when page changes
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể tải danh sách yêu cầu');
        } finally {
            setLoading(false);
        }
    }, [currentPage, statusFilter, typeFilter]);

    // Fetch request types
    const fetchRequestTypes = useCallback(async () => {
        try {
            const types = await academicRequestService.getRequestTypes();
            setRequestTypes(types);
        } catch (err: any) {
            toast.error('Không thể tải danh sách loại yêu cầu');
        }
    }, []);

    const fetchStudentProfile = useCallback(async () => {
        try {
            const response = await apiClient.get('/auth/me');
            setStudentProfile(response.data);
            return response.data;
        } catch (err) {
            console.error('Failed to fetch student profile', err);
            return null;
        }
    }, []);

    const fetchSemesters = useCallback(async () => {
        try {
            const response = await apiClient.get('/v1/semesters/active');
            // Filter only UPCOMING semesters on frontend
            const semesterData = Array.isArray(response.data) ? response.data : [];
            const upcomingOnly = semesterData.filter((s: any) => s.status === 'upcoming');
            setSemesters(upcomingOnly);
        } catch (err) {
            console.error('Failed to fetch semesters', err);
        }
    }, []);

    const fetchAllCourses = useCallback(async (profile: any) => {
        try {
            let curriculumCourses: any[] = [];

            if (profile) {
                // 1. Fetch courses for major
                if (profile.majorId) {
                    try {
                        const majorCourses = await majorService.getCourses(profile.majorId);
                        curriculumCourses = [...curriculumCourses, ...majorCourses];
                    } catch (e) {
                        console.error('Failed to fetch major courses', e);
                    }
                }

                // 2. Fetch courses for specialization
                if (profile.specializationId) {
                    try {
                        const specCourses = await specializationService.getCourses(profile.specializationId);
                        curriculumCourses = [...curriculumCourses, ...specCourses];
                    } catch (e) {
                        console.error('Failed to fetch specialization courses', e);
                    }
                }

                // 3. Fetch courses for sub-specialization
                if (profile.subSpecializationId) {
                    try {
                        const subSpecCourses = await subSpecializationService.getCourses(profile.subSpecializationId);
                        curriculumCourses = [...curriculumCourses, ...subSpecCourses];
                    } catch (e) {
                        console.error('Failed to fetch sub-specialization courses', e);
                    }
                }

                // Remove duplicates by ID
                const uniqueCourses = Array.from(new Map(curriculumCourses.map(item => [item.id, item])).values());

                // Sort by course code or name
                uniqueCourses.sort((a: Course, b: Course) => (a.code || '').localeCompare(b.code || ''));

                setAllCourses(uniqueCourses);
            } else {
                setAllCourses([]);
            }
        } catch (err) {
            console.error('Failed to fetch courses', err);
        }
    }, []);

    const fetchMyEnrolledCourses = useCallback(async (semesterId?: number) => {
        const user = authService.getUser();
        if (user) {
            try {
                const courses = await studentMyGradeService.getMyCourses(user.id, semesterId);
                setMyCourses(courses);
            } catch (err) {
                console.error('Failed to fetch my courses', err);
            }
        }
    }, []);

    const fetchMajors = useCallback(async () => {
        try {
            setFetchingMajors(true);
            const response = await majorService.getMajors({ size: 200 });
            console.log('Majors API Response:', response);

            let majorList: any[] = [];
            if (Array.isArray(response)) {
                majorList = response;
            } else if (response && (response as any).content && Array.isArray((response as any).content)) {
                majorList = (response as any).content;
            } else if (response && (response as any).data && Array.isArray((response as any).data)) {
                majorList = (response as any).data;
            } else if (response && typeof response === 'object') {
                // Check for other potential wrappers
                const possibleArray = Object.values(response).find(val => Array.isArray(val));
                if (possibleArray) majorList = possibleArray as any[];
            }

            setMajors(majorList);
            if (majorList.length === 0) {
                console.warn('Majors list empty', response);
            }
        } catch (err: any) {
            console.error('Failed to fetch majors', err);
            toast.error('Lỗi khi tải danh sách ngành: ' + (err.response?.data?.message || err.message));
        } finally {
            setFetchingMajors(false);
        }
    }, []);

    // Body scroll lock & backdrop cover
    useEffect(() => {
        const isDialogOpen = !!showCreateDialog || !!showDetailDialog || !!infoType || requestToCancel.length > 0;
        if (isDialogOpen) {
            document.body.style.overflow = 'hidden';
            // Prevent layout shift if possible
            document.body.style.paddingRight = 'var(--scrollbar-width, 0px)';
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        };
    }, [showCreateDialog, showDetailDialog, infoType, requestToCancel]);

    // WebSocket for real-time updates
    useWebSocket('/user/queue/notifications', (data: any) => {
        if (Array.isArray(data)) {
            const hasUpdate = data.some((notif: any) => notif.type === 'ACADEMIC');
            if (hasUpdate) {
                console.log('Real-time update: Academic request status changed');
                fetchRequests();
            }
        }
    });

    useEffect(() => {
        fetchRequests();
        fetchRequestTypes();
        fetchStudentProfile().then(profile => {
            fetchAllCourses(profile);
        });
        fetchSemesters();
        fetchMajors();
    }, [fetchRequests, fetchRequestTypes, fetchStudentProfile, fetchSemesters, fetchMajors, fetchAllCourses]);

    // Fetch dependent data when semester changes
    useEffect(() => {
        if (formData.semesterId) {
            fetchMyEnrolledCourses(formData.semesterId);
        } else {
            fetchMyEnrolledCourses();
        }
    }, [formData.semesterId, fetchMyEnrolledCourses]);

    // Fetch specializations when target major changes
    useEffect(() => {
        const fetchSpecs = async () => {
            if (formData.toMajor) {
                const major = majors.find(m => m.name === formData.toMajor || m.code === formData.toMajor);
                if (major) {
                    try {
                        const response = await specializationService.getSpecializationsByMajor(major.id, { size: 100 });
                        console.log('Specializations API Response:', response);

                        let specList: any[] = [];
                        if (Array.isArray(response)) {
                            specList = response;
                        } else if (response && (response as any).content && Array.isArray((response as any).content)) {
                            specList = (response as any).content;
                        } else if (response && (response as any).data && Array.isArray((response as any).data)) {
                            specList = (response as any).data;
                        }

                        setSpecializations(specList);
                    } catch (err) {
                        console.error('Failed to fetch specializations', err);
                    }
                }
            }
        };
        fetchSpecs();
    }, [formData.toMajor, majors]);

    // Fetch sub-specializations when target specialization changes


    // Fetch transfer targets for CHANGE_CLASS
    useEffect(() => {
        const fetchTargets = async () => {
            if (selectedType?.value === 'CHANGE_CLASS' && formData.classSectionId && studentProfile?.id) {
                try {
                    setLoadingTargets(true);
                    const targets = await classSectionService.getTransferTargets(formData.classSectionId, studentProfile.id);
                    setTransferTargets(targets);
                } catch (err) {
                    console.error('Failed to fetch transfer targets', err);
                    toast.error('Không thể lấy danh sách lớp có thể chuyển');
                } finally {
                    setLoadingTargets(false);
                }
            } else {
                setTransferTargets([]);
            }
        };
        fetchTargets();
    }, [formData.classSectionId, selectedType, studentProfile]);

    // Fetch grade details for GRADE_APPEAL
    useEffect(() => {
        const fetchGradeInfo = async () => {
            if (selectedType?.value === 'GRADE_APPEAL' && formData.classSectionId && studentProfile?.id) {
                try {
                    setFetchingGrade(true);
                    const gradeInfo = await studentMyGradeService.getMyGrades(studentProfile.id, formData.classSectionId);
                    setGradeDetail(gradeInfo);
                } catch (err) {
                    console.error('Failed to fetch grade info', err);
                    setGradeDetail(null);
                } finally {
                    setFetchingGrade(false);
                }
            } else {
                setGradeDetail(null);
            }
        };
        fetchGradeInfo();
    }, [formData.classSectionId, selectedType, studentProfile]);

    // Handle form field change
    const handleFieldChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Handle type selection
    const handleTypeSelect = (type: AcademicRequestType) => {
        const isExcluded = type.value === 'GRADE_APPEAL' || type.value === 'OTHERS';
        const hasNoUpcomingSemester = semesters.length === 0;

        if (!isExcluded && hasNoUpcomingSemester) {
            toast.error('Chưa đến thời gian nộp loại đơn này (Hệ thống hiện chưa có học kỳ sắp tới)');
            return;
        }

        if (!type.canSubmit) {
            const isFuture = type.startDate && new Date(type.startDate).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0);
            toast.error(isFuture ? 'Chưa đến thời gian tiếp nhận loại đơn này' : 'Đã hết hạn nộp loại đơn này');
            return;
        }

        // New check for CHANGE_SPECIALIZATION
        if (type.value === 'CHANGE_SPECIALIZATION' && !studentProfile?.subSpecializationId) {
            toast.error('Sinh viên chưa đến kỳ đăng ký chuyên ngành hẹp');
            return;
        }

        setSelectedType(type);
        setFormData({
            requestType: type.value,
            reason: '',
        });

        // Force major reload to ensure fresh data for this specific request
        if (type.value === 'CHANGE_MAJOR') {
            fetchMajors();
        }
    };

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error('File không được vượt quá 10MB');
                return;
            }
            setSelectedFile(file);
        }
    };

    // Handle submit
    const handleSubmit = async () => {
        if (!selectedType) return;

        // Validate required fields
        const requiredFields = REQUEST_TYPE_FIELDS[selectedType.value] || [];
        for (const field of requiredFields) {
            const val = (formData as any)[field];
            if (val === undefined || val === null || val === '' || (typeof val === 'string' && !val.trim())) {
                if (field === 'note') continue; // Note is optional even if in list
                toast.error(`Vui lòng nhập / chọn: ${FIELD_LABELS[field] || field} `);
                return;
            }
        }

        // Extra validation for Remark Request
        if (selectedType.value === 'GRADE_APPEAL' && formData.classSectionId) {
            if (fetchingGrade) {
                toast.error('Vui lòng đợi hệ thống kiểm tra trạng thái điểm');
                return;
            }
            if (!gradeDetail?.gradesPublished) {
                toast.error('Điểm thi chưa được công bố. Bạn chưa thể gửi đơn phúc khảo cho lớp này.');
                return;
            }
            if (gradeDetail.gradesPublishedAt) {
                const pubDate = new Date(gradeDetail.gradesPublishedAt);
                const dueDate = new Date(pubDate);
                dueDate.setDate(dueDate.getDate() + 3);
                if (new Date() > dueDate) {
                    toast.error('Đã hết thời hạn nộp đơn phúc khảo cho lớp này (Hạn nộp: 3 ngày kể từ khi công bố điểm).');
                    return;
                }
            }
        }

        try {
            setSubmitting(true);
            await academicRequestService.createRequest(formData, selectedFile || undefined);
            toast.success('Gửi yêu cầu thành công');
            setShowCreateDialog(false);
            setSelectedType(null);
            setFormData({ requestType: '', reason: '' });
            setSelectedFile(null);
            setCourseSearch('');
            fetchRequests();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle cancel request (called by button or bulk action)
    const handleCancelRequest = (ids: number[]) => {
        if (ids.length === 0) return;

        // Only allow cancelling PENDING requests
        const pendingIds = requests
            .filter(r => ids.includes(r.id) && r.status === 'PENDING')
            .map(r => r.id);

        if (pendingIds.length === 0) {
            toast.error('Chỉ có thể thu hồi các yêu cầu đang chờ xử lý');
            return;
        }

        setRequestToCancel(pendingIds);
    };

    // Selection handlers
    const toggleSelectAll = () => {
        const pendingIds = requests.filter(r => r.status === 'PENDING').map(r => r.id);
        if (pendingIds.length === 0) return;

        const allPendingSelected = pendingIds.every(id => selectedIds.includes(id));
        if (allPendingSelected) {
            setSelectedIds(prev => prev.filter(id => !pendingIds.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...pendingIds])));
        }
    };

    const toggleSelect = (id: number) => {
        const request = requests.find(r => r.id === id);
        if (request?.status !== 'PENDING') return;

        setSelectedIds(prev => prev.includes(id)
            ? prev.filter(item => item !== id)
            : [...prev, id]
        );
    };

    const handleBulkCancel = () => {
        handleCancelRequest(selectedIds);
    };

    // Perform cancel after confirmation
    const performCancel = async () => {
        if (requestToCancel.length === 0) return;

        try {
            setCancelling(true);
            for (const id of requestToCancel) {
                await academicRequestService.cancelRequest(id);
            }
            toast.success(requestToCancel.length > 1 ? `Đã thu hồi ${requestToCancel.length} yêu cầu` : 'Đã thu hồi yêu cầu');
            setRequestToCancel([]);
            setSelectedIds([]);
            fetchRequests();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi thu hồi yêu cầu');
        } finally {
            setCancelling(false);
        }
    };

    // Get status badge
    const getStatusBadge = (status: string, statusLabel: string) => {
        const styles: Record<string, { bg: string, text: string, dot: string, anim: string }> = {
            PENDING: {
                bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-800/30',
                text: 'text-amber-600 dark:text-amber-400',
                dot: 'bg-amber-500',
                anim: 'animate-pulse'
            },
            APPROVED: {
                bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/30',
                text: 'text-emerald-600 dark:text-emerald-400',
                dot: 'bg-emerald-500',
                anim: ''
            },
            REJECTED: {
                bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200/50 dark:border-rose-800/30',
                text: 'text-rose-600 dark:text-rose-400',
                dot: 'bg-rose-500',
                anim: ''
            },
            CANCELLED: {
                bg: 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200/50 dark:border-zinc-700/30',
                text: 'text-zinc-600 dark:text-zinc-400',
                dot: 'bg-zinc-500',
                anim: ''
            },
        };

        const currentStyle = styles[status] || styles.CANCELLED;

        return (
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm ${currentStyle.bg} ${currentStyle.text}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${currentStyle.dot} ${currentStyle.anim}`} />
                {statusLabel}
            </span>
        );
    };

    // Format date
    const formatDate = (dateStr?: string, showTime: boolean = true) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '—';

            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                ...(showTime ? { hour: '2-digit', minute: '2-digit' } : {})
            });
        } catch (e) {
            return '—';
        }
    };

    return (
        <StudentLayout pageTitle="Yêu Cầu Học Thuật">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-fpt-orange rounded-full" />
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Yêu Cầu Học Thuật</h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium ml-5">Quản lý và theo dõi các đơn từ học thuật của bạn</p>
                    </div>
                    <button
                        onClick={() => setShowCreateDialog(true)}
                        className="flex items-center gap-2 px-8 py-3.5 bg-fpt-orange text-white rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-500/20 active:scale-95 transition-all font-bold text-sm"
                    >
                        <Plus className="w-5 h-5" />
                        Tạo yêu cầu mới
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 relative group">
                    {/* <div className="absolute top-0 right-0 w-32 h-32 bg-fpt-orange/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" /> */}

                    <div className="lg:col-span-6 space-y-2 relative z-10">
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">
                            Loại yêu cầu
                        </label>
                        <RequestSelect
                            value={typeFilter}
                            onChange={(value) => {
                                setTypeFilter(value);
                                setCurrentPage(0);
                            }}
                            options={[
                                { value: '', label: 'Tất cả loại yêu cầu' },
                                ...requestTypes.map(type => ({ value: type.value, label: type.label }))
                            ]}
                            className="font-medium"
                        />
                    </div>

                    <div className="lg:col-span-4 space-y-2 relative z-10">
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">
                            Trạng thái đơn
                        </label>
                        <RequestSelect
                            value={statusFilter}
                            onChange={(value) => {
                                setStatusFilter(value);
                                setCurrentPage(0);
                            }}
                            options={[
                                { value: '', label: 'Tất cả trạng thái' },
                                { value: 'PENDING', label: 'Chờ xử lý' },
                                { value: 'APPROVED', label: 'Đã duyệt' },
                                { value: 'REJECTED', label: 'Từ chối' },
                                { value: 'CANCELLED', label: 'Đã hủy' }
                            ]}
                            className="font-medium"
                        />
                    </div>

                    <div className="lg:col-span-2 flex items-end relative z-10">
                        <button
                            onClick={() => {
                                setTypeFilter('');
                                setStatusFilter('');
                                setCurrentPage(0);
                            }}
                            className="w-full text-xs text-gray-400 hover:text-fpt-orange font-medium uppercase tracking-widest h-[52px] border-2 border-transparent hover:border-orange-100 dark:hover:border-orange-900/30 rounded-2xl transition-all"
                        >
                            Xóa lọc
                        </button>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className="flex justify-end pr-2">
                        <button
                            onClick={handleBulkCancel}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors font-medium border border-red-200 shadow-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            Thu hồi ({selectedIds.length}) đã chọn
                        </button>
                    </div>
                )}

                {/* Request List */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-12 h-12 border-4 border-fpt-orange/20 border-t-fpt-orange rounded-full animate-spin" />
                            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-24 group">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
                                <FileText className="w-10 h-10 text-gray-300 dark:text-zinc-700" />
                            </div>
                            <p className="text-gray-400 dark:text-zinc-500 font-medium uppercase tracking-widest text-sm">Chưa có yêu cầu nào được tạo</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-fpt-orange">
                                        <th className="px-6 py-5 text-center w-16">
                                            <input
                                                type="checkbox"
                                                checked={requests.length > 0 && requests.filter(r => r.status === 'PENDING').length > 0 && requests.filter(r => r.status === 'PENDING').every(r => selectedIds.includes(r.id))}
                                                onChange={toggleSelectAll}
                                                disabled={requests.filter(r => r.status === 'PENDING').length === 0}
                                                className="w-4 h-4 text-fpt-orange dark:text-fpt-orange border-white/30 rounded-lg focus:ring-fpt-orange/20 cursor-pointer disabled:opacity-30 transition-all"
                                            />
                                        </th>
                                        <th className="px-4 py-5 text-white text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Loại yêu cầu</th>
                                        <th className="px-4 py-5 text-white text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Tiêu đề (Nhấn đúp để xem)</th>
                                        <th className="px-4 py-5 text-white text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Trạng thái</th>
                                        <th className="px-4 py-5 text-white text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Ngày tạo</th>
                                        <th className="px-4 py-5 text-white text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Hạn nộp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                    {requests.map((request) => (
                                        <tr
                                            key={request.id}
                                            className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 cursor-pointer transition-all group"
                                            onDoubleClick={() => {
                                                setSelectedRequest(request);
                                                setShowDetailDialog(true);
                                            }}
                                        >
                                            <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(request.id)}
                                                    onChange={() => toggleSelect(request.id)}
                                                    disabled={request.status !== 'PENDING'}
                                                    className="w-4 h-4 text-fpt-orange dark:text-fpt-orange border-gray-300 dark:border-zinc-700 rounded-lg focus:ring-fpt-orange/20 cursor-pointer disabled:opacity-30 transition-all"
                                                />
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-sm font-medium text-gray-900 dark:text-zinc-200 group-hover:text-fpt-orange transition-colors">
                                                    {request.requestTypeLabel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium line-clamp-1">{request.requestTitle}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {getStatusBadge(request.status, request.statusLabel)}
                                            </td>
                                            <td className="px-6 py-5 text-sm font-medium text-gray-400 dark:text-zinc-500 text-center">
                                                {formatDate(request.createdAt)}
                                            </td>
                                            <td className="px-6 py-5 text-sm font-medium text-gray-400 dark:text-zinc-500 text-center">
                                                {request.dueDate || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-8 py-5 border-t border-gray-50 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-900/50">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalElements={totalElements}
                                pageSize={PAGE_SIZE}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Create Request Dialog */}
            {showCreateDialog && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-md"
                        style={{ width: '100vw', height: '100vh' }}
                        onClick={() => !submitting && setShowCreateDialog(false)}
                    />
                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative z-10 flex flex-col border border-gray-100 dark:border-zinc-800 transition-all">
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-fpt-orange/10 rounded-xl">
                                    <Plus className="w-5 h-5 text-fpt-orange" />
                                </div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                                    {selectedType ? selectedType.label : 'Chọn loại yêu cầu'}
                                </h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowCreateDialog(false);
                                    setSelectedType(null);
                                    setCourseSearch('');
                                }}
                                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors flex-shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            {!selectedType ? (
                                // Type selection
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {requestTypes.map((type) => {
                                        const isUnavailable = !type.canSubmit || (type.value !== 'GRADE_APPEAL' && type.value !== 'OTHERS' && semesters.length === 0);
                                        const isFuture = (type.startDate && new Date(type.startDate).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0));
                                        const isDisabled = isUnavailable || isFuture;

                                        return (
                                            <div
                                                key={type.value}
                                                onClick={() => !isDisabled && handleTypeSelect(type)}
                                                className={`group p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full ${isDisabled
                                                    ? 'bg-zinc-50 dark:bg-zinc-800/20 border-zinc-100 dark:border-zinc-800 opacity-60 cursor-not-allowed'
                                                    : 'bg-white dark:bg-zinc-800 border-gray-100 dark:border-zinc-700 hover:border-fpt-orange/50 hover:shadow-xl hover:shadow-orange-500/5 cursor-pointer active:scale-[0.98]'
                                                    }`}
                                            >
                                                {!isDisabled && (
                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-fpt-orange/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
                                                )}

                                                <div>
                                                    <div className="flex items-center justify-between mb-2 relative z-10">
                                                        <div className={`p-2 rounded-xl border ${isDisabled ? 'bg-zinc-100/50 dark:bg-zinc-800/50 border-zinc-200/50' : 'bg-fpt-orange/5 border-orange-100/50 dark:border-orange-900/20 text-fpt-orange'}`}>
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setInfoType(type);
                                                            }}
                                                            className="text-fpt-orange hover:text-orange-600 p-1 transition-colors bg-fpt-orange/10 rounded-lg"
                                                            title="Xem thông tin chi tiết"
                                                        >
                                                            <Info className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="font-bold text-zinc-900 dark:text-zinc-100 text-base leading-snug mb-1 relative z-10">{type.label}</div>
                                                    {type.requiresClassSection && (
                                                        <div className="text-[10px] font-medium text-blue-500 uppercase tracking-widest relative z-10">
                                                            Lớp học phần
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4 relative z-10">
                                                    {isUnavailable && type.value !== 'GRADE_APPEAL' && type.value !== 'OTHERS' && semesters.length === 0 ? (
                                                        <span className="text-[10px] font-medium text-rose-500 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-lg border border-rose-100 dark:border-rose-900/30">Chưa đến thời gian</span>
                                                    ) : isFuture ? (
                                                        <span className="text-[10px] font-medium text-amber-500 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-900/30">Từ: {type.startDate}</span>
                                                    ) : type.dueDate ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Hạn: {type.dueDate}</span>
                                                            {!type.canSubmit && <span className="text-[10px] font-medium text-rose-500 uppercase tracking-widest">(Hết hạn)</span>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-medium text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">Đang mở</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                // Request form
                                <div className="space-y-6">

                                    {/* Dynamic Fields based on Type */}
                                    {selectedType.value === 'OTHERS' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Tiêu đề yêu cầu <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.requestTitle || ''}
                                                onChange={(e) => handleFieldChange('requestTitle', e.target.value)}
                                                className="w-full px-4 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 font-medium"
                                                placeholder="Nhập tiêu đề yêu cầu"
                                            />
                                        </div>
                                    )}

                                    {/* Semester Selection */}
                                    {(selectedType.value === 'PAUSE_SEMESTER' ||
                                        selectedType.value === 'RETAKE_COURSE' ||
                                        selectedType.value === 'CHANGE_CLASS' ||
                                        selectedType.value === 'OVERLOAD_STUDY' ||
                                        selectedType.value === 'ABSENT_REQUEST') && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Học kỳ <span className="text-red-500">*</span>
                                                </label>
                                                <RequestSelect
                                                    value={formData.semesterId?.toString() || ''}
                                                    onChange={(value) => handleFieldChange('semesterId', value ? Number(value) : null)}
                                                    options={[
                                                        { value: '', label: 'Chọn học kỳ' },
                                                        ...semesters.map(s => ({ value: s.id.toString(), label: `${s.code} - ${s.name}` }))
                                                    ]}
                                                />
                                            </div>
                                        )}

                                    {/* Course Selection (Searchable Combobox) */}
                                    {(selectedType.value === 'RETAKE_COURSE' || selectedType.value === 'OVERLOAD_STUDY') && (
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Môn học <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={courseSearch || (formData.courseId ? allCourses.find(c => c.id === formData.courseId)?.name : '')}
                                                    onChange={(e) => {
                                                        setCourseSearch(e.target.value);
                                                        setShowCourseDropdown(true);
                                                    }}
                                                    onFocus={() => setShowCourseDropdown(true)}
                                                    onBlur={() => setTimeout(() => setShowCourseDropdown(false), 200)}
                                                    className="w-full px-4 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 pr-10 font-medium"
                                                    placeholder="Tìm kiếm môn học..."
                                                />
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                    <Info className="w-4 h-4 text-gray-400" />
                                                </div>
                                            </div>

                                            {showCourseDropdown && (
                                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                    {allCourses
                                                        .filter(c =>
                                                            c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
                                                            c.code.toLowerCase().includes(courseSearch.toLowerCase())
                                                        )
                                                        .map(c => (
                                                            <div
                                                                key={c.id}
                                                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b dark:border-gray-700 last:border-b-0"
                                                                onClick={() => {
                                                                    handleFieldChange('courseId', c.id);
                                                                    setCourseSearch(`${c.name} `);
                                                                    setShowCourseDropdown(false);
                                                                }}
                                                            >
                                                                <div className="font-medium text-sm">[{c.code}] {c.name}</div>
                                                                <div className="text-xs text-gray-500">Tín chỉ: {c.credits}</div>
                                                            </div>
                                                        ))}
                                                    {allCourses.filter(c =>
                                                        c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
                                                        c.code.toLowerCase().includes(courseSearch.toLowerCase())
                                                    ).length === 0 && (
                                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                                Không tìm thấy môn học
                                                            </div>
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Class Section Selection (Current) */}
                                    {(selectedType.value === 'CHANGE_CLASS' || selectedType.value === 'GRADE_APPEAL') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {selectedType.value === 'CHANGE_CLASS' ? 'Lớp học phần hiện tại' : 'Lớp học phần muốn phúc khảo'} <span className="text-red-500">*</span>
                                            </label>
                                            <RequestSelect
                                                value={formData.classSectionId || ''}
                                                onChange={(value) => handleFieldChange('classSectionId', value)}
                                                options={[
                                                    { value: '', label: 'Chọn lớp học phần' },
                                                    ...myCourses.map(c => ({ value: c.className, label: `${c.className} - ${c.courseName}` }))
                                                ]}
                                            />

                                            {/* Grade Appeal Info */}
                                            {selectedType.value === 'GRADE_APPEAL' && formData.classSectionId && (
                                                <div className="mt-2">
                                                    {fetchingGrade ? (
                                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span>Đang kiểm tra trạng thái điểm...</span>
                                                        </div>
                                                    ) : gradeDetail ? (
                                                        <div className={`p-3 rounded-lg border text-sm ${gradeDetail.gradesPublished ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'}`}>
                                                            {gradeDetail.gradesPublished ? (
                                                                <div className="flex items-start gap-2">
                                                                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                                                    <div>
                                                                        <p className="font-semibold">Điểm đã được công bố</p>
                                                                        <p className="mt-1">
                                                                            Hạn nộp phúc khảo: <span className="font-bold underline">
                                                                                {(() => {
                                                                                    if (!gradeDetail.gradesPublishedAt) return 'N/A';
                                                                                    const pubDate = new Date(gradeDetail.gradesPublishedAt);
                                                                                    const dueDate = new Date(pubDate);
                                                                                    dueDate.setDate(dueDate.getDate() + 3);
                                                                                    return dueDate.toLocaleDateString('vi-VN', {
                                                                                        day: '2-digit',
                                                                                        month: '2-digit',
                                                                                        year: 'numeric',
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit'
                                                                                    });
                                                                                })()}
                                                                            </span>
                                                                        </p>
                                                                        <p className="text-xs mt-1 text-blue-600 italic">* Lưu ý: Đơn phúc khảo chỉ được chấp nhận trong vòng 3 ngày kể từ khi công bố điểm.</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-start gap-2">
                                                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                                                    <p className="font-semibold">Điểm thi chưa được công bố. Bạn chưa thể gửi đơn phúc khảo cho lớp này.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Target Class Name for CHANGE_CLASS */}
                                    {selectedType.value === 'CHANGE_CLASS' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Lớp muốn chuyển qua <span className="text-red-500">*</span>
                                            </label>
                                            {loadingTargets ? (
                                                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Đang tải danh sách lớp...</span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <RequestSelect
                                                        value={formData.toClassName || ''}
                                                        onChange={(value) => handleFieldChange('toClassName', value)}
                                                        disabled={!formData.classSectionId}
                                                        options={[
                                                            { value: '', label: formData.classSectionId ? 'Chọn lớp học phần đích' : 'Vui lòng chọn lớp hiện tại trước' },
                                                            ...transferTargets.map(t => ({
                                                                value: t.classSection.className,
                                                                label: `${t.classSection.className} ${t.hasConflict ? '(⚠️ Có xung đột)' : ''}`
                                                            }))
                                                        ]}
                                                        className={transferTargets.find(t => t.classSection.className === formData.toClassName)?.hasConflict ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : ''}
                                                    />

                                                    {/* Conflict details if selected */}
                                                    {formData.toClassName && transferTargets.find(t => t.classSection.className === formData.toClassName)?.hasConflict && (
                                                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                                                            <div className="flex items-start gap-2 mb-1">
                                                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                                                <span className="font-semibold">Cảnh báo xung đột thời gian:</span>
                                                            </div>
                                                            <ul className="list-disc list-inside space-y-1 ml-6">
                                                                {transferTargets.find(t => t.classSection.className === formData.toClassName)?.conflictDetails.map((detail, idx) => (
                                                                    <li key={idx}>{detail}</li>
                                                                ))}
                                                            </ul>
                                                            <p className="mt-2 text-xs italic">* Bạn vẫn có thể gửi yêu cầu, nhưng khả năng được duyệt sẽ thấp hơn nếu có xung đột.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Major/Specialization Info (Readonly) for CHANGE_MAJOR */}
                                    {selectedType?.value === 'CHANGE_MAJOR' && (
                                        <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border dark:border-gray-700">
                                            <div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Ngành hiện tại</div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{studentProfile?.major || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Chuyên ngành hiện tại</div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{studentProfile?.specialization || 'N/A'}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sub-Specialization Info (Readonly) for CHANGE_SPECIALIZATION */}
                                    {selectedType?.value === 'CHANGE_SPECIALIZATION' && (
                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border dark:border-gray-700">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Chuyên ngành hẹp hiện tại</div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                {studentProfile?.subSpecialization ? (
                                                    <span className="text-blue-600 dark:text-blue-400">{studentProfile.subSpecialization}</span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500 italic">Bạn chưa được thêm vào chuyên ngành hẹp</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                * Bạn chỉ có thể chuyển giữa các chuyên ngành hẹp trong cùng chuyên ngành
                                                <span className="font-semibold text-gray-600 ml-1">({studentProfile?.specialization || 'N/A'})</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Target Major Selection */}
                                    {selectedType.value === 'CHANGE_MAJOR' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Ngành muốn chuyển <span className="text-red-500">*</span>
                                                </label>
                                                <RequestSelect
                                                    value={formData.toMajor || ''}
                                                    onChange={(value) => handleFieldChange('toMajor', value)}
                                                    disabled={fetchingMajors}
                                                    options={[
                                                        { value: '', label: fetchingMajors ? 'Đang tải danh sách...' : majors.length > 0 ? 'Chọn ngành' : 'Chọn ngành (Danh sách trống)' },
                                                        ...majors.map(m => ({ value: m.name, label: m.name }))
                                                    ]}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Chuyên ngành muốn chuyển <span className="text-red-500">*</span>
                                                </label>
                                                <RequestSelect
                                                    value={formData.toSpecialization || ''}
                                                    onChange={(value) => handleFieldChange('toSpecialization', value)}
                                                    disabled={!formData.toMajor || fetchingMajors}
                                                    options={[
                                                        { value: '', label: fetchingMajors ? 'Đang tải...' : 'Chọn chuyên ngành' },
                                                        ...specializations.map(s => ({ value: s.name, label: s.name }))
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Target Sub-Specialization Selection */}
                                    {selectedType.value === 'CHANGE_SPECIALIZATION' && (
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-widest ml-1">
                                                Chuyên ngành hẹp muốn chọn <span className="text-rose-500">*</span>
                                            </label>
                                            <RequestSelect
                                                value={formData.toSubSpecialization || ''}
                                                onChange={(value) => handleFieldChange('toSubSpecialization', value)}
                                                options={[
                                                    { value: '', label: 'Chọn chuyên ngành hẹp' },
                                                    ...specializations.map(s => ({ value: s.name, label: s.name }))
                                                ]}
                                                className="bg-gray-50/50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-800 rounded-2xl font-medium"
                                            />
                                        </div>
                                    )}
                                    {/* Reason */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-widest ml-1">
                                            Lý do <span className="text-rose-500">*</span>
                                        </label>
                                        <textarea
                                            value={formData.reason}
                                            onChange={(e) => handleFieldChange('reason', e.target.value)}
                                            rows={4}
                                            className="w-full px-5 py-4 bg-gray-50/50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange transition-all outline-none font-medium resize-none"
                                            placeholder="Ghi rõ lý do tại sao bạn gửi yêu cầu này..."
                                        />
                                    </div>

                                    {/* Note */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                                            Ghi chú bổ sung
                                        </label>
                                        <textarea
                                            value={formData.note || ''}
                                            onChange={(e) => handleFieldChange('note', e.target.value)}
                                            rows={2}
                                            className="w-full px-5 py-3 bg-gray-50/50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange transition-all outline-none font-medium resize-none"
                                            placeholder="Bất kỳ thông tin nào khác bạn muốn cung cấp..."
                                        />
                                    </div>


                                    {/* File upload */}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                                            Tài liệu đính kèm
                                        </label>
                                        <div className={`border-2 border-dashed rounded-[32px] p-8 transition-all duration-300 group/upload ${selectedFile ? 'border-emerald-100 dark:border-emerald-900/20 bg-emerald-50/30' : 'border-zinc-100 dark:border-zinc-800 hover:border-fpt-orange/30 hover:bg-zinc-50/50'}`}>
                                            {selectedFile ? (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-emerald-100/50 rounded-2xl">
                                                            <FileText className="w-6 h-6 text-emerald-600" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedFile.name}</span>
                                                            <span className="text-xs text-zinc-400 uppercase font-bold tracking-widest">Sẵn sàng để tải lên</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedFile(null)}
                                                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center cursor-pointer min-h-[120px]">
                                                    <div className="p-4 bg-fpt-orange/5 group-hover/upload:bg-fpt-orange/10 rounded-2xl transition-colors mb-4">
                                                        <Upload className="w-8 h-8 text-fpt-orange group-hover/upload:scale-110 transition-transform duration-300" />
                                                    </div>
                                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-200">
                                                        Chọn tài liệu hoặc kéo thả vào đây
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                                                        Kích thước tối đa: 10MB
                                                    </span>
                                                    <input
                                                        type="file"
                                                        onChange={handleFileSelect}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* Deadline info */}
                                    {selectedType.dueDate && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                            <div className="flex items-center gap-2 text-yellow-800">
                                                <AlertCircle className="w-4 h-4" />
                                                <span className="text-sm font-medium">
                                                    Hạn nộp: {selectedType.dueDate}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>

                        {/* Sticky Footer Actions */}
                        {selectedType && (
                            <div className="px-8 py-6 border-t border-gray-100 dark:border-zinc-800 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 bg-gray-50/30 dark:bg-zinc-900/30">
                                <button
                                    onClick={() => setSelectedType(null)}
                                    className="px-8 py-3.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                >
                                    Quay lại danh sách
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-10 py-3.5 bg-fpt-orange text-white rounded-[20px] font-bold text-sm hover:bg-orange-600 shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 group"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    )}
                                    Gửi yêu cầu ngay
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showDetailDialog && selectedRequest && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={() => setShowDetailDialog(false)}
                    />
                    <div className="bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl max-w-2xl w-full relative z-10 border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-fpt-orange/10 rounded-xl">
                                    <FileText className="w-5 h-5 text-fpt-orange" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">Chi tiết yêu cầu</h2>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                                        Mã ID: {selectedRequest.id || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetailDialog(false)}
                                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                            {/* Status and Type Card */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Loại yêu cầu</span>
                                    <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">{selectedRequest.requestTypeLabel}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-center">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Trạng thái hiện tại</span>
                                    <div>{getStatusBadge(selectedRequest.status, selectedRequest.statusLabel)}</div>
                                </div>
                            </div>

                            {/* Title Section */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Tiêu đề yêu cầu</span>
                                <div className="p-6 rounded-3xl bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 shadow-sm">
                                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{selectedRequest.requestTitle}</p>
                                </div>
                            </div>

                            {/* Dynamic Content Bento Grid */}
                            <div className="space-y-4">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Thông tin bổ sung</span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedRequest.className && (
                                        <div className="p-5 rounded-3xl bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/20">
                                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Lớp học phần</span>
                                            <p className="font-bold text-zinc-900 dark:text-zinc-100">{selectedRequest.className}</p>
                                        </div>
                                    )}
                                    {selectedRequest.semesterName && (
                                        <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Học kỳ</span>
                                            <p className="font-bold text-zinc-900 dark:text-zinc-100">{selectedRequest.semesterName}</p>
                                        </div>
                                    )}
                                    {selectedRequest.courseCode && (
                                        <div className="md:col-span-2 p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Môn học</span>
                                            <p className="font-bold text-zinc-900 dark:text-zinc-100">
                                                [{selectedRequest.courseCode}] {selectedRequest.courseName}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reason & Notes Row */}
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Lý do gửi yêu cầu</span>
                                    <div className="p-6 rounded-3xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                                        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                                            {selectedRequest.reason}
                                        </p>
                                    </div>
                                </div>

                                {selectedRequest.note && (
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Ghi chú của bạn</span>
                                        <div className="p-6 rounded-3xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 italic">
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                                                "{selectedRequest.note}"
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* File Attachment */}
                            {selectedRequest.fileUrl && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Tài liệu đính kèm</span>
                                    <a
                                        href={selectedRequest.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-4 rounded-3xl bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-900/20 group hover:border-emerald-500/30 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-2xl">
                                                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Xem tệp đính kèm</p>
                                                <p className="text-[10px] font-bold text-emerald-600/50 uppercase tracking-widest">Nhấn để mở tệp trong tab mới</p>
                                            </div>
                                        </div>
                                        <div className="p-2 rounded-xl group-hover:bg-emerald-500/10 transition-colors">
                                            <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                    </a>
                                </div>
                            )}

                            {/* Processing Information */}
                            {selectedRequest.approverName && (
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Kết quả xử lý</span>
                                    <div className="p-6 rounded-[32px] bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/20 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">Người xử lý</span>
                                                <p className="font-bold text-zinc-900 dark:text-zinc-100">{selectedRequest.approverName}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">Thời gian xử lý</span>
                                                <p className="font-bold text-zinc-900 dark:text-zinc-100">{formatDate(selectedRequest.approvedAt)}</p>
                                            </div>
                                        </div>
                                        {selectedRequest.approverNote && (
                                            <div className="pt-4 border-t border-indigo-100/30">
                                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">Ghi chú từ Phòng Đào tạo</span>
                                                <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium italic">
                                                    "{selectedRequest.approverNote}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Timestamps Section */}
                            <div className="grid grid-cols-2 gap-4 pt-8 border-t border-zinc-50 dark:border-zinc-800">
                                <div>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Ngày tạo yêu cầu</span>
                                    <p className="text-xs font-bold text-zinc-500 tracking-tight">{formatDate(selectedRequest.createdAt, true)}</p>
                                </div>
                                {selectedRequest.dueDate && (
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Hạn xử lý</span>
                                        <p className="text-xs font-bold text-zinc-500 tracking-tight">{selectedRequest.dueDate}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-8 py-6 border-t border-gray-100 dark:border-zinc-800 flex justify-end shrink-0 bg-gray-50/30 dark:bg-zinc-900/30">
                            <button
                                onClick={() => setShowDetailDialog(false)}
                                className="px-10 py-3.5 bg-fpt-orange text-white rounded-[20px] font-bold text-sm hover:bg-orange-600 shadow-xl shadow-orange-500/20 transition-all active:scale-95"
                            >
                                Đã xem và đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Request Type Info Modal */}
            {infoType && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={() => setInfoType(null)}
                    />
                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden relative z-10 transform animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-zinc-800">
                        <div className="p-8 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-fpt-orange/10 rounded-lg">
                                    <Info className="w-5 h-5 text-fpt-orange" />
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                                    Thông tin loại yêu cầu
                                </h3>
                            </div>
                            <button
                                onClick={() => setInfoType(null)}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <h4 className="font-bold text-zinc-900 dark:text-white text-base mb-3 leading-snug">{infoType.label}</h4>
                            <div className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed space-y-3 font-medium">
                                {infoType.description ? (
                                    <p className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 italic">
                                        "{infoType.description}"
                                    </p>
                                ) : (
                                    <p className="italic text-zinc-400 dark:text-zinc-500">Không có thông tin chi tiết cho loại yêu cầu này.</p>
                                )}
                            </div>
                        </div>
                        <div className="px-8 py-6 bg-gray-50/50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
                            <button
                                onClick={() => setInfoType(null)}
                                className="px-8 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:opacity-90 transition-all font-bold text-sm shadow-lg shadow-zinc-950/10 active:scale-95"
                            >
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {requestToCancel.length > 0 && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={() => !cancelling && setRequestToCancel([])}
                    />
                    <div className="bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl max-w-md w-full overflow-hidden relative z-10 transform animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-zinc-800">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100/50 dark:border-rose-900/20">
                                <AlertTriangle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">Thu hồi yêu cầu?</h3>
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed px-4">
                                Bạn có chắc chắn muốn thu hồi {requestToCancel.length > 1 ? `${requestToCancel.length} yêu cầu đã chọn` : 'yêu cầu này'} không? Hành động này không thể hoàn tác.
                            </p>
                        </div>
                        <div className="px-10 pb-10 flex gap-4">
                            <button
                                onClick={() => setRequestToCancel([])}
                                disabled={cancelling}
                                className="flex-1 px-6 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50 active:scale-95"
                            >
                                Quay lại
                            </button>
                            <button
                                onClick={performCancel}
                                disabled={cancelling}
                                className="flex-1 px-6 py-4 bg-rose-600 text-white rounded-2xl font-bold text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                            >
                                {cancelling ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </StudentLayout>
    );
};

export default StudentAcademicRequestPage;


