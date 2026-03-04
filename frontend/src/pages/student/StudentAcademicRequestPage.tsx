import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Plus, Clock, CheckCircle, XCircle, AlertCircle, Upload, X, Loader2, Info, Trash2, AlertTriangle, FileText as FileIcon } from 'lucide-react';
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
import { SubSpecialization } from '../../types/subspecialization';
import { Course } from '../../types/course';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

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
    const [subSpecializations, setSubSpecializations] = useState<SubSpecialization[]>([]);
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
            setSemesters(response.data);
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
    useEffect(() => {
        const fetchSubSpecs = async () => {
            // Determine which specialization ID to use
            let targetSpecId: number | undefined;

            if (selectedType?.value === 'CHANGE_SPECIALIZATION') {
                // For sub-spec change, always use student's current specialization ID
                targetSpecId = studentProfile?.specializationId;
            } else if (formData.toSpecialization) {
                // For other changes (like major change), find ID by name
                const spec = specializations.find(s => s.name === formData.toSpecialization);
                targetSpecId = spec?.id;
            }

            if (targetSpecId) {
                try {
                    const response = await subSpecializationService.getSubSpecializationsBySpecialization(targetSpecId);
                    setSubSpecializations(response);
                } catch (err) {
                    console.error('Failed to fetch sub-specializations', err);
                }
            } else {
                setSubSpecializations([]);
            }
        };
        fetchSubSpecs();
    }, [formData.toSpecialization, selectedType, studentProfile, specializations]);

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
        const styles: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            APPROVED: 'bg-green-100 text-green-800',
            REJECTED: 'bg-red-100 text-red-800',
            CANCELLED: 'bg-gray-100 text-gray-800',
        };
        const icons: Record<string, React.ReactNode> = {
            PENDING: <Clock className="w-3 h-3" />,
            APPROVED: <CheckCircle className="w-3 h-3" />,
            REJECTED: <XCircle className="w-3 h-3" />,
            CANCELLED: <AlertCircle className="w-3 h-3" />,
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100'}`}>
                {icons[status] || null}
                {statusLabel}
            </span>
        );
    };

    // Format date
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <StudentLayout pageTitle="Yêu Cầu Học Thuật">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Yêu Cầu Học Thuật</h1>
                        <p className="text-gray-500 mt-1">Quản lý các yêu cầu học thuật của bạn</p>
                    </div>
                    <button
                        onClick={() => setShowCreateDialog(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Tạo yêu cầu mới
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                            Loại yêu cầu
                        </label>
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setCurrentPage(0);
                            }}
                            className="w-[400px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                        >
                            <option value="">Tất cả loại yêu cầu</option>
                            {requestTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-[200px]">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                            Trạng thái
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(0);
                            }}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="PENDING">Chờ xử lý</option>
                            <option value="APPROVED">Đã duyệt</option>
                            <option value="REJECTED">Từ chối</option>
                            <option value="CANCELLED">Đã hủy</option>
                        </select>
                    </div>

                    <div className="self-end pb-0.5">
                        <button
                            onClick={() => {
                                setTypeFilter('');
                                setStatusFilter('');
                                setCurrentPage(0);
                            }}
                            className="text-sm text-gray-500 hover:text-orange-600 font-medium px-2 py-2 transition-colors"
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Chưa có yêu cầu nào</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-orange-600 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-center w-12">
                                            <input
                                                type="checkbox"
                                                checked={requests.length > 0 && requests.filter(r => r.status === 'PENDING').length > 0 && requests.filter(r => r.status === 'PENDING').every(r => selectedIds.includes(r.id))}
                                                onChange={toggleSelectAll}
                                                disabled={requests.filter(r => r.status === 'PENDING').length === 0}
                                                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase w-1/5">Loại yêu cầu</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase w-1/3">Tiêu đề</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase w-1/6">Trạng thái</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase w-1/6">Ngày tạo</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase w-1/6">Hạn nộp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {requests.map((request) => (
                                        <tr
                                            key={request.id}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            onDoubleClick={() => {
                                                setSelectedRequest(request);
                                                setShowDetailDialog(true);
                                            }}
                                        >
                                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(request.id)}
                                                    onChange={() => toggleSelect(request.id)}
                                                    disabled={request.status !== 'PENDING'}
                                                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {request.requestTypeLabel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600">{request.requestTitle}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {getStatusBadge(request.status, request.statusLabel)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 text-center">
                                                {formatDate(request.createdAt)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 text-center">
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
                        <div className="px-4 py-3 border-t">
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

                {/* Create Request Dialog */}
                {showCreateDialog && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            style={{ width: '100vw', height: '100vh' }}
                            onClick={() => !submitting && setShowCreateDialog(false)}
                        />
                        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col m-4">
                            <div className="p-6 border-b flex items-center justify-between bg-white sticky top-0 z-20">
                                <h2 className="text-xl font-bold text-gray-900 leading-none">
                                    {selectedType ? selectedType.label : 'Chọn loại yêu cầu'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowCreateDialog(false);
                                        setSelectedType(null);
                                        setCourseSearch('');
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6">
                                {!selectedType ? (
                                    // Type selection
                                    <div className="grid gap-3">
                                        {requestTypes.map((type) => (
                                            <button
                                                key={type.value}
                                                onClick={() => handleTypeSelect(type)}
                                                disabled={!type.canSubmit}
                                                className={`p-4 rounded-lg border text-left transition-colors w-full ${type.canSubmit
                                                    ? 'hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                                                    : 'opacity-50 cursor-not-allowed bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-gray-900 text-base">{type.label}</div>
                                                        {type.requiresClassSection && (
                                                            <div className="text-sm text-blue-600 mt-1">
                                                                Cần chọn lớp học phần
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col items-end">
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setInfoType(type);
                                                            }}
                                                            className="text-blue-500 hover:text-blue-700 p-1 cursor-pointer"
                                                            title="Xem thông tin chi tiết"
                                                        >
                                                            <Info className="w-5 h-5" />
                                                        </div>
                                                        <div className="mt-1">
                                                            {type.startDate && new Date(type.startDate).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0) ? (
                                                                <span className="text-sm text-blue-600 font-medium">
                                                                    Bắt đầu từ: {type.startDate} (Chưa đến thời gian)
                                                                </span>
                                                            ) : type.dueDate ? (
                                                                <span className="text-sm text-gray-600">
                                                                    Hạn nộp: {type.dueDate}
                                                                    {!type.canSubmit && <span className="text-red-500 font-medium ml-1">(Đã hết hạn)</span>}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    // Request form
                                    <div className="space-y-4">
                                        {/* Dynamic Fields based on Type */}
                                        {selectedType.value === 'OTHERS' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Tiêu đề yêu cầu <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.requestTitle || ''}
                                                    onChange={(e) => handleFieldChange('requestTitle', e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Học kỳ <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        value={formData.semesterId || ''}
                                                        onChange={(e) => handleFieldChange('semesterId', Number(e.target.value))}
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Chọn học kỳ</option>
                                                        {semesters.map(s => (
                                                            <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                        {/* Course Selection (Searchable Combobox) */}
                                        {(selectedType.value === 'RETAKE_COURSE' || selectedType.value === 'OVERLOAD_STUDY') && (
                                            <div className="relative">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                                                        placeholder="Tìm kiếm môn học..."
                                                    />
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                        <Info className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                </div>

                                                {showCourseDropdown && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                        {allCourses
                                                            .filter(c =>
                                                                c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
                                                                c.code.toLowerCase().includes(courseSearch.toLowerCase())
                                                            )
                                                            .map(c => (
                                                                <div
                                                                    key={c.id}
                                                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
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
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    {selectedType.value === 'CHANGE_CLASS' ? 'Lớp học phần hiện tại' : 'Lớp học phần muốn phúc khảo'} <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={formData.classSectionId || ''}
                                                    onChange={(e) => handleFieldChange('classSectionId', e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">Chọn lớp học phần</option>
                                                    {myCourses.map(c => (
                                                        <option key={c.className} value={c.className}>{c.className} - {c.courseName}</option>
                                                    ))}
                                                </select>

                                                {/* Grade Appeal Info */}
                                                {selectedType.value === 'GRADE_APPEAL' && formData.classSectionId && (
                                                    <div className="mt-2">
                                                        {fetchingGrade ? (
                                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                <span>Đang kiểm tra trạng thái điểm...</span>
                                                            </div>
                                                        ) : gradeDetail ? (
                                                            <div className={`p-3 rounded-lg border text-sm ${gradeDetail.gradesPublished ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
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
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Lớp muốn chuyển qua <span className="text-red-500">*</span>
                                                </label>
                                                {loadingTargets ? (
                                                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Đang tải danh sách lớp...</span>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <select
                                                            value={formData.toClassName || ''}
                                                            onChange={(e) => handleFieldChange('toClassName', e.target.value)}
                                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${transferTargets.find(t => t.classSection.className === formData.toClassName)?.hasConflict
                                                                ? 'border-yellow-500 bg-yellow-50'
                                                                : ''
                                                                }`}
                                                            disabled={!formData.classSectionId}
                                                        >
                                                            <option value="">{formData.classSectionId ? 'Chọn lớp học phần đích' : 'Vui lòng chọn lớp hiện tại trước'}</option>
                                                            {transferTargets.map(t => (
                                                                <option
                                                                    key={t.classSection.className}
                                                                    value={t.classSection.className}
                                                                    className={t.hasConflict ? 'text-yellow-700' : ''}
                                                                >
                                                                    {t.classSection.className} {t.hasConflict ? '(⚠️ Có xung đột)' : ''}
                                                                </option>
                                                            ))}
                                                        </select>

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
                                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border">
                                                <div>
                                                    <div className="text-xs text-gray-500 uppercase font-semibold">Ngành hiện tại</div>
                                                    <div className="text-sm font-medium text-gray-900">{studentProfile?.major || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 uppercase font-semibold">Chuyên ngành hiện tại</div>
                                                    <div className="text-sm font-medium text-gray-900">{studentProfile?.specialization || 'N/A'}</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Sub-Specialization Info (Readonly) for CHANGE_SPECIALIZATION */}
                                        {selectedType?.value === 'CHANGE_SPECIALIZATION' && (
                                            <div className="bg-gray-50 p-3 rounded-lg border">
                                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Chuyên ngành hẹp hiện tại</div>
                                                <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                                    {studentProfile?.subSpecialization ? (
                                                        <span className="text-blue-600">{studentProfile.subSpecialization}</span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">Bạn chưa được thêm vào chuyên ngành hẹp</span>
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
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Ngành muốn chuyển <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        value={formData.toMajor || ''}
                                                        onChange={(e) => handleFieldChange('toMajor', e.target.value)}
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 bg-white"
                                                        disabled={fetchingMajors}
                                                    >
                                                        <option value="">
                                                            {fetchingMajors ? 'Đang tải danh sách...' : majors.length > 0 ? `Chọn ngành (Đã tải ${majors.length})` : 'Chọn ngành (Danh sách trống)'}
                                                        </option>
                                                        {majors.map(m => (
                                                            <option key={m.id} value={m.name}>{m.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Chuyên ngành muốn chuyển <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        value={formData.toSpecialization || ''}
                                                        onChange={(e) => handleFieldChange('toSpecialization', e.target.value)}
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                                                        disabled={!formData.toMajor || fetchingMajors}
                                                    >
                                                        <option value="">{fetchingMajors ? 'Đang tải...' : 'Chọn chuyên ngành'}</option>
                                                        {specializations.map(s => (
                                                            <option key={s.id} value={s.name}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {/* Target Sub-Specialization Selection */}
                                        {selectedType.value === 'CHANGE_SPECIALIZATION' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Chuyên ngành hẹp muốn chọn <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={formData.toSubSpecialization || ''}
                                                    onChange={(e) => handleFieldChange('toSubSpecialization', e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">{subSpecializations.length > 0 ? 'Chọn chuyên ngành hẹp' : 'Không có chuyên ngành hẹp phù hợp'}</option>
                                                    {subSpecializations
                                                        .filter(ss => ss.name !== studentProfile?.subSpecialization)
                                                        .map(ss => (
                                                            <option key={ss.id} value={ss.name}>{ss.name}</option>
                                                        ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Reason */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Lý do <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={formData.reason}
                                                onChange={(e) => handleFieldChange('reason', e.target.value)}
                                                rows={4}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Nhập lý do chi tiết..."
                                            />
                                        </div>

                                        {/* Note */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Ghi chú thêm
                                            </label>
                                            <textarea
                                                value={formData.note || ''}
                                                onChange={(e) => handleFieldChange('note', e.target.value)}
                                                rows={2}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Ghi chú thêm (nếu có)..."
                                            />
                                        </div>

                                        {/* File upload */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                File đính kèm
                                            </label>
                                            <div className="border-2 border-dashed rounded-lg p-4">
                                                {selectedFile ? (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="w-5 h-5 text-blue-600" />
                                                            <span className="text-sm">{selectedFile.name}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setSelectedFile(null)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="flex flex-col items-center cursor-pointer">
                                                        <Upload className="w-8 h-8 text-gray-400" />
                                                        <span className="text-sm text-gray-500 mt-2">
                                                            Kéo thả hoặc click để chọn file
                                                        </span>
                                                        <span className="text-xs text-gray-400 mt-1">
                                                            Tối đa 10MB
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

                                        {/* Actions */}
                                        <div className="flex justify-end gap-3 pt-4">
                                            <button
                                                onClick={() => setSelectedType(null)}
                                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                            >
                                                Quay lại
                                            </button>
                                            <button
                                                onClick={handleSubmit}
                                                disabled={submitting}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                                Gửi yêu cầu
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Detail Dialog */}
                {showDetailDialog && selectedRequest && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowDetailDialog(false)}
                        />
                        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full relative z-10">
                            <div className="p-6 border-b flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Chi tiết yêu cầu</h2>
                                <button
                                    onClick={() => setShowDetailDialog(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-gray-500">Loại yêu cầu</span>
                                        <p className="font-medium">{selectedRequest.requestTypeLabel}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">Trạng thái</span>
                                        <p>{getStatusBadge(selectedRequest.status, selectedRequest.statusLabel)}</p>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-sm text-gray-500">Tiêu đề</span>
                                    <p className="font-medium">{selectedRequest.requestTitle}</p>
                                </div>

                                {/* Dynamic content based on request type */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
                                    {selectedRequest.requestType === 'CHANGE_CLASS' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Lớp hiện tại</span>
                                                <p className="font-semibold text-gray-700">{selectedRequest.className || '—'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">Lớp muốn chuyển</span>
                                                <p className="font-semibold text-blue-700">{selectedRequest.toClassName || '—'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedRequest.requestType === 'CHANGE_MAJOR' && (
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">Ngành mới</span>
                                                <p className="font-semibold text-blue-700">{selectedRequest.toMajor || '—'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">Chuyên ngành mới</span>
                                                <p className="font-semibold text-blue-700">{selectedRequest.toSpecialization || '—'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedRequest.requestType === 'CHANGE_SPECIALIZATION' && (
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">Chuyên ngành hẹp mới</span>
                                            <p className="font-semibold text-blue-700">{selectedRequest.toSubSpecialization || '—'}</p>
                                        </div>
                                    )}

                                    {/* PAUSE_SEMESTER (Xin tạm nghỉ học) & ABSENT_REQUEST (Miễn điểm danh) - Show Semester */}
                                    {(['PAUSE_SEMESTER', 'ABSENT_REQUEST'].includes(selectedRequest.requestType)) && (
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Học kỳ</span>
                                            <p className="font-semibold text-gray-700">{selectedRequest.semesterName || '—'}</p>
                                        </div>
                                    )}

                                    {/* RETAKE_COURSE (Học lại) & OVERLOAD_STUDY (Học vượt) - Show Course + Semester */}
                                    {(['RETAKE_COURSE', 'OVERLOAD_STUDY'].includes(selectedRequest.requestType)) && (
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Môn học</span>
                                                <p className="font-semibold text-gray-700">
                                                    {selectedRequest.courseCode} {selectedRequest.courseName ? `- ${selectedRequest.courseName}` : ''}
                                                </p>
                                            </div>
                                            {selectedRequest.semesterName && (
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Học kỳ</span>
                                                    <p className="font-semibold text-gray-700">{selectedRequest.semesterName}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* GRADE_APPEAL (Phúc khảo) - Show Class Section + Semester (NO COURSE as per request) */}
                                    {selectedRequest.requestType === 'GRADE_APPEAL' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedRequest.className && (
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Lớp học phần</span>
                                                    <p className="font-semibold text-gray-700">{selectedRequest.className}</p>
                                                </div>
                                            )}
                                            {selectedRequest.semesterName && (
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Học kỳ</span>
                                                    <p className="font-semibold text-gray-700">{selectedRequest.semesterName}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <span className="text-sm text-gray-500">Lý do</span>
                                    <p className="text-gray-700 leading-relaxed">{selectedRequest.reason}</p>
                                </div>

                                {selectedRequest.note && (
                                    <div>
                                        <span className="text-sm text-gray-500">Ghi chú</span>
                                        <p className="text-gray-700">{selectedRequest.note}</p>
                                    </div>
                                )}

                                {selectedRequest.fileUrl && (
                                    <div>
                                        <span className="text-sm text-gray-500">File đính kèm</span>
                                        <a
                                            href={selectedRequest.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Xem file
                                        </a>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-gray-500">Ngày tạo</span>
                                        <p>{formatDate(selectedRequest.createdAt)}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">Hạn nộp</span>
                                        <p>{selectedRequest.dueDate || '—'}</p>
                                    </div>
                                </div>

                                {selectedRequest.approverName && (
                                    <div className="border-t pt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-sm text-gray-500">Người xử lý</span>
                                                <p>{selectedRequest.approverName}</p>
                                            </div>
                                            <div>
                                                <span className="text-sm text-gray-500">Thời gian xử lý</span>
                                                <p>{formatDate(selectedRequest.approvedAt)}</p>
                                            </div>
                                        </div>
                                        {selectedRequest.approverNote && (
                                            <div className="mt-3">
                                                <span className="text-sm text-gray-500">Ghi chú từ phòng đào tạo</span>
                                                <p className="text-gray-700">{selectedRequest.approverNote}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Request Type Info Modal */}
                {infoType && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setInfoType(null)}
                        />
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden relative z-10 transform animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b flex items-center justify-between bg-blue-50">
                                <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                    <Info className="w-5 h-5" />
                                    Thông tin loại yêu cầu
                                </h3>
                                <button
                                    onClick={() => setInfoType(null)}
                                    className="text-blue-400 hover:text-blue-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6">
                                <h4 className="font-bold text-gray-900 mb-3">{infoType.label}</h4>
                                <div className="text-gray-600 text-sm leading-relaxed space-y-2">
                                    {infoType.description ? (
                                        <p>{infoType.description}</p>
                                    ) : (
                                        <p className="italic text-gray-400">Không có thông tin chi tiết cho loại yêu cầu này.</p>
                                    )}
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                                <button
                                    onClick={() => setInfoType(null)}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                                >
                                    Đã hiểu
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cancel Confirmation Modal */}
                {requestToCancel.length > 0 && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => !cancelling && setRequestToCancel([])}
                        />
                        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden relative z-10 transform animate-in zoom-in-95 duration-200">
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Thu hồi yêu cầu?</h3>
                                <p className="text-gray-500">
                                    Bạn có chắc chắn muốn thu hồi {requestToCancel.length > 1 ? `${requestToCancel.length} yêu cầu đã chọn` : 'yêu cầu này'} không? Hành động này không thể hoàn tác.
                                </p>
                            </div>
                            <div className="px-8 pb-8 flex gap-3">
                                <button
                                    onClick={() => setRequestToCancel([])}
                                    disabled={cancelling}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Bỏ qua
                                </button>
                                <button
                                    onClick={performCancel}
                                    disabled={cancelling}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {cancelling ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : null}
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </StudentLayout>
    );
};

export default StudentAcademicRequestPage;
