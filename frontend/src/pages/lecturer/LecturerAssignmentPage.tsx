import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { lecturerClassService, SemesterResponse, ClassSectionResponse } from '../../services/api/LecturerClass';
import { assignmentService, AssignmentDTO, AssignmentSubmissionDTO } from '../../services/api/assignmentService';
import { timetableService, TimetableSlotDTO } from '../../services/api/timetableService';
import { authService } from '../../services/api/authService';
import { uploadFile } from '../../services/utils/fileUploadService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import { Pagination } from '../../components/common/Pagination';
import {
    ChevronDown, Check, Users, Clock, ChevronUp, ExternalLink, Search,
    FileText, Loader2, Plus, X, BookOpen, Lock, Eye, Edit3, AlertCircle, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

export const LecturerAssignmentPage: React.FC = () => {
    const user = authService.getUser();
    const navigate = useNavigate();

    // Semester & Class state
    const [semesters, setSemesters] = useState<SemesterResponse[]>([]);
    const [classes, setClasses] = useState<ClassSectionResponse[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');

    // Dropdown open state
    const [isSemesterOpen, setIsSemesterOpen] = useState(false);
    const [isClassOpen, setIsClassOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
    const semesterDropdownRef = useRef<HTMLDivElement>(null);
    const classDropdownRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    // Assignments & Slots
    const [assignments, setAssignments] = useState<AssignmentDTO[]>([]);
    const [slots, setSlots] = useState<TimetableSlotDTO[]>([]);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [submissions, setSubmissions] = useState<Record<number, AssignmentSubmissionDTO[]>>({});
    const [loadingSubmissions, setLoadingSubmissions] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const PAGE_SIZE = 10;

    // Multi-select & batch edit
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showBatchEditDialog, setShowBatchEditDialog] = useState(false);
    const [batchEditing, setBatchEditing] = useState(false);
    const [batchWarning, setBatchWarning] = useState('');
    const [editAssignmentId, setEditAssignmentId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editDueDate, setEditDueDate] = useState('');
    const [editRefUrl, setEditRefUrl] = useState('');
    const [editRefName, setEditRefName] = useState('');
    const [editRefFile, setEditRefFile] = useState<File | null>(null);
    const [uploadingEditFile, setUploadingEditFile] = useState(false);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    // Create dialog
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForSlotId, setCreateForSlotId] = useState<number | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [newRefUrl, setNewRefUrl] = useState('');
    const [newRefName, setNewRefName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Centralized create modal state
    const [createClassName, setCreateClassName] = useState('');
    const [createClassSlots, setCreateClassSlots] = useState<TimetableSlotDTO[]>([]);
    const [loadingClassSlots, setLoadingClassSlots] = useState(false);
    const [selectedSessionNumber, setSelectedSessionNumber] = useState<number | null>(null);
    const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
    const [isCreateSlotOpen, setIsCreateSlotOpen] = useState(false);
    const createClassDropdownRef = useRef<HTMLDivElement>(null);
    const createSlotDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (semesterDropdownRef.current && !semesterDropdownRef.current.contains(event.target as Node)) {
                setIsSemesterOpen(false);
            }
            if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
                setIsClassOpen(false);
            }
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setIsStatusOpen(false);
            }
            if (createClassDropdownRef.current && !createClassDropdownRef.current.contains(event.target as Node)) {
                setIsCreateClassOpen(false);
            }
            if (createSlotDropdownRef.current && !createSlotDropdownRef.current.contains(event.target as Node)) {
                setIsCreateSlotOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load semesters & auto-select ongoing
    useEffect(() => {
        const fetchSemesters = async () => {
            try {
                const data = await lecturerClassService.getSemesters();
                setSemesters(data);
                // Auto-select ongoing semester
                const ongoing = data.find(s => s.status === 'active' || s.status === 'ACTIVE' || s.status === 'ongoing' || s.status === 'ONGOING');
                if (ongoing) {
                    setSelectedSemester(ongoing.code);
                } else if (data.length > 0) {
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

    // Load ALL slots + assignments when classes are loaded (auto-load on semester change)
    useEffect(() => {
        if (selectedSemester && user?.id && classes.length > 0) {
            fetchAllData();
        } else if (classes.length === 0 && selectedSemester) {
            setSlots([]);
            setAssignments([]);
        }
    }, [classes, selectedSemester, user?.id]);

    const fetchClasses = async () => {
        try {
            const data = await lecturerClassService.getTeachingClasses(selectedSemester, {
                lecturerId: user?.id,
                size: 100
            });
            setClasses(data.content);
            setSelectedClass('');
        } catch (error) {
            console.error("Failed to fetch classes", error);
        }
    };

    // Fetch ALL slots and assignments across all classes for the selected semester
    const fetchAllData = useCallback(async () => {
        if (!selectedSemester || !user?.id) return;
        setLoadingAssignments(true);
        try {
            // Fetch all slots for lecturer in this semester
            let slotsData: TimetableSlotDTO[] = [];
            try {
                slotsData = await timetableService.getLecturerSemesterSlots(user.id, selectedSemester);
            } catch (err: any) {
                console.error('Failed to fetch semester slots:', err?.response?.status, err?.response?.data || err.message);
            }

            // Fetch assignments for all classes
            let allAssignments: AssignmentDTO[] = [];
            const classNames = classes.map(c => c.className);
            const assignmentPromises = classNames.map(cn =>
                assignmentService.getAssignmentsByClass(cn).catch(() => [] as AssignmentDTO[])
            );
            const results = await Promise.all(assignmentPromises);
            allAssignments = results.flat();

            setSlots(slotsData);
            setAssignments(allAssignments);
        } catch (err: any) {
            console.error('fetchAllData unexpected error:', err);
            toast.error('Không thể tải dữ liệu');
        } finally {
            setLoadingAssignments(false);
        }
    }, [selectedSemester, user?.id, classes]);

    const toggleExpand = async (assignmentId: number) => {
        if (expandedId === assignmentId) {
            setExpandedId(null);
            return;
        }
        setExpandedId(assignmentId);
        if (!submissions[assignmentId]) {
            try {
                setLoadingSubmissions(assignmentId);
                const data = await assignmentService.getAssignmentSubmissions(assignmentId);
                setSubmissions(prev => ({ ...prev, [assignmentId]: data }));
            } catch {
                setSubmissions(prev => ({ ...prev, [assignmentId]: [] }));
            } finally {
                setLoadingSubmissions(null);
            }
        }
    };

    // Fetch slots for selected class in create modal
    useEffect(() => {
        if (!createClassName) {
            setCreateClassSlots([]);
            setSelectedSessionNumber(null);
            setCreateForSlotId(null);
            return;
        }
        const fetchClassSlots = async () => {
            setLoadingClassSlots(true);
            try {
                const allSlots = await timetableService.getTimetableByClass(createClassName);
                // Sort by date then slotNumber to compute session_number (ROW_NUMBER)
                const sorted = [...allSlots].sort((a, b) => {
                    const dateCompare = (a.date || '').localeCompare(b.date || '');
                    if (dateCompare !== 0) return dateCompare;
                    return (a.slotNumber || 0) - (b.slotNumber || 0);
                });
                setCreateClassSlots(sorted);
            } catch {
                setCreateClassSlots([]);
                toast.error('Không thể tải danh sách buổi học');
            } finally {
                setLoadingClassSlots(false);
            }
        };
        fetchClassSlots();
    }, [createClassName]);

    // Get selected session info
    const selectedSessionSlot = selectedSessionNumber !== null ? createClassSlots[selectedSessionNumber - 1] : null;

    const handleCreate = async () => {
        if (!newTitle.trim()) {
            toast.error('Vui lòng nhập tiêu đề bài tập');
            return;
        }
        if (!createClassName) {
            toast.error('Vui lòng chọn lớp học');
            return;
        }
        if (selectedSessionNumber === null || !selectedSessionSlot) {
            toast.error('Vui lòng chọn buổi học');
            return;
        }
        if (!newDueDate) {
            toast.error('Vui lòng nhập hạn nộp bài');
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(newDueDate) < today) {
            toast.error('Hạn nộp bài phải từ hôm nay trở đi');
            return;
        }
        try {
            setCreating(true);
            await assignmentService.createAssignment({
                className: createClassName,
                timetableSlotId: selectedSessionSlot.id,
                title: newTitle.trim(),
                description: newDescription.trim() || undefined,
                dueDate: newDueDate || undefined,
                referenceUrl: newRefUrl.trim() || undefined,
                referenceName: newRefName.trim() || undefined
            });
            toast.success('Đã tạo bài tập');
            setShowCreateDialog(false);
            resetCreateForm();
            fetchAllData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể tạo bài tập');
        } finally {
            setCreating(false);
        }
    };

    const handleClose = async (assignmentId: number) => {
        try {
            await assignmentService.closeAssignment(assignmentId);
            toast.success('Đã đóng bài tập');
            fetchAllData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể đóng bài tập');
        }
    };

    const resetCreateForm = () => {
        setNewTitle('');
        setNewDescription('');
        setNewDueDate('');
        setNewRefUrl('');
        setNewRefName('');
        setSelectedFile(null);
        setCreateForSlotId(null);
        setCreateClassName('');
        setCreateClassSlots([]);
        setSelectedSessionNumber(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File quá lớn. Tối đa 10MB.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        try {
            setUploadingFile(true);
            setSelectedFile(file);
            const result = await uploadFile(file);
            setNewRefUrl(result.secure_url || result.url);
            setNewRefName(file.name);
            toast.success('Upload tài liệu thành công');
        } catch (err: any) {
            toast.error(err.message || 'Upload thất bại');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } finally {
            setUploadingFile(false);
        }
    };

    const getSelectedSemesterName = () => {
        const semester = semesters.find(s => s.code === selectedSemester);
        return semester ? semester.name : 'Chọn học kỳ';
    };

    const getSelectedClassName = () => {
        if (!selectedClass) return 'Tất cả lớp';
        const cls = classes.find(c => c.className === selectedClass);
        return cls ? `${cls.className} - ${cls.courseName}` : selectedClass;
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const formatSlotDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Build a merged list: each slot + its linked assignment (if any)
    const assignmentBySlotId = new Map<number, AssignmentDTO>();
    assignments.forEach(a => {
        if (a.timetableSlotId) assignmentBySlotId.set(a.timetableSlotId, a);
    });

    const slotRows = slots.map(slot => ({
        slot,
        assignment: assignmentBySlotId.get(slot.id) || null
    }));

    // Filter: class + status + search
    const filteredRows = slotRows.filter(row => {
        // Class filter (optional)
        if (selectedClass && row.slot.className !== selectedClass) return false;
        // Status filter
        if (statusFilter === 'OPEN' && (!row.assignment || row.assignment.status !== 'OPEN')) return false;
        if (statusFilter === 'CLOSED' && (!row.assignment || row.assignment.status !== 'CLOSED')) return false;
        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchSlot = (row.slot.courseName || '').toLowerCase().includes(term)
                || (row.slot.roomCode || '').toLowerCase().includes(term)
                || (row.slot.className || '').toLowerCase().includes(term);
            const matchAssignment = row.assignment && (
                row.assignment.title.toLowerCase().includes(term)
                || (row.assignment.description || '').toLowerCase().includes(term)
            );
            return matchSlot || matchAssignment;
        }
        return true;
    });

    // Reset page & selection when filters change
    useEffect(() => {
        setCurrentPage(0);
        setSelectedIds(new Set());
        setBatchWarning('');
    }, [selectedClass, statusFilter, searchTerm]);

    // Paginate filtered rows
    const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
    const paginatedRows = filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    // Multi-select helpers
    const assignmentIdsOnPage = paginatedRows.filter(r => r.assignment).map(r => r.assignment!.id);
    const allOnPageSelected = assignmentIdsOnPage.length > 0 && assignmentIdsOnPage.every(id => selectedIds.has(id));

    const toggleSelect = (assignmentId: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(assignmentId)) next.delete(assignmentId);
            else next.add(assignmentId);
            return next;
        });
        setBatchWarning('');
    };

    const toggleSelectAll = () => {
        if (allOnPageSelected) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                assignmentIdsOnPage.forEach(id => next.delete(id));
                return next;
            });
            setBatchWarning('');
        } else {
            setSelectedIds(prev => {
                const next = new Set(prev);
                assignmentIdsOnPage.forEach(id => next.add(id));
                return next;
            });
            const hasClosedOnPage = paginatedRows.some(r => r.assignment && r.assignment.status === 'CLOSED');
            if (hasClosedOnPage) {
                setBatchWarning('Không thể chỉnh sửa hoặc xóa bài tập đã đóng. Vui lòng chỉ chọn bài tập đang mở.');
            } else {
                setBatchWarning('');
            }
        }
    };

    const handleBatchEditOpen = () => {
        if (selectedIds.size === 0) { toast.error('Vui lòng chọn ít nhất một bài tập'); return; }
        if (selectedIds.size > 1) { toast.error('Chỉ có thể chỉnh sửa từng bài tập một'); return; }
        const hasClosedAssignment = assignments.some(a => selectedIds.has(a.id) && a.status === 'CLOSED');
        if (hasClosedAssignment) {
            setBatchWarning('Không thể chỉnh sửa hoặc xóa bài tập đã đóng. Vui lòng chỉ chọn bài tập đang mở.');
            return;
        }
        const assignmentId = Array.from(selectedIds)[0];
        const assignment = assignments.find(a => a.id === assignmentId);
        if (!assignment) return;
        setEditAssignmentId(assignmentId);
        setEditTitle(assignment.title);
        setEditDescription(assignment.description || '');
        setEditDueDate(assignment.dueDate || '');
        setEditRefUrl(assignment.referenceUrl || '');
        setEditRefName(assignment.referenceName || '');
        setEditRefFile(null);
        setShowBatchEditDialog(true);
    };

    const handleEditFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File quá lớn. Tối đa 10MB.');
            if (editFileInputRef.current) editFileInputRef.current.value = '';
            return;
        }
        try {
            setUploadingEditFile(true);
            setEditRefFile(file);
            const result = await uploadFile(file);
            setEditRefUrl(result.secure_url || result.url);
            setEditRefName(file.name);
            toast.success('Upload tài liệu thành công');
        } catch (err: any) {
            toast.error(err.message || 'Upload thất bại');
            setEditRefFile(null);
            if (editFileInputRef.current) editFileInputRef.current.value = '';
        } finally {
            setUploadingEditFile(false);
        }
    };

    const handleBatchEditSubmit = async () => {
        if (!editAssignmentId || !editTitle.trim()) { toast.error('Tiêu đề không được để trống'); return; }
        try {
            setBatchEditing(true);
            await assignmentService.updateAssignment(editAssignmentId, {
                title: editTitle.trim(),
                description: editDescription.trim() || undefined,
                dueDate: editDueDate || undefined,
                referenceUrl: editRefUrl || undefined,
                referenceName: editRefName || undefined,
            });
            toast.success('Đã cập nhật bài tập');
            setShowBatchEditDialog(false);
            setSelectedIds(new Set());
            fetchAllData();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể cập nhật bài tập');
        } finally {
            setBatchEditing(false);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) { toast.error('Vui lòng chọn ít nhất một bài tập'); return; }
        const hasClosedAssignment = assignments.some(a => selectedIds.has(a.id) && a.status === 'CLOSED');
        if (hasClosedAssignment) {
            setBatchWarning('Không thể chỉnh sửa hoặc xóa bài tập đã đóng. Vui lòng chỉ chọn bài tập đang mở.');
            return;
        }
        if (!window.confirm(`Bạn có chắc muốn xóa ${selectedIds.size} bài tập? Hành động này không thể hoàn tác.`)) return;
        try {
            setBatchEditing(true);
            const promises = Array.from(selectedIds).map(id =>
                assignmentService.deleteAssignment(id)
            );
            await Promise.all(promises);
            toast.success(`Đã xóa ${selectedIds.size} bài tập`);
            setSelectedIds(new Set());
            fetchAllData();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể xóa bài tập');
        } finally {
            setBatchEditing(false);
        }
    };

    return (
        <LecturerLayout pageTitle="Quản lý bài tập">
            <div className="mt-5 ml-10 mr-10 space-y-6">

                {/* Filter Section — Semester + Class + Status dropdowns */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Semester Selector */}
                        <div ref={semesterDropdownRef}>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Học kỳ</label>
                            <div className="relative">
                                <button onClick={() => setIsSemesterOpen(!isSemesterOpen)}
                                    className="flex items-center justify-between w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-fpt-orange transition-all">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{getSelectedSemesterName()}</span>
                                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isSemesterOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isSemesterOpen && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-60 overflow-y-auto">
                                        {semesters.map(semester => (
                                            <button key={semester.id} onClick={() => { setSelectedSemester(semester.code); setIsSemesterOpen(false); }}
                                                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${selectedSemester === semester.code ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange' : 'text-gray-900 dark:text-white'}`}>
                                                <span className="text-sm font-medium">{semester.name}</span>
                                                {selectedSemester === semester.code && <Check size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Class Selector */}
                        <div ref={classDropdownRef}>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Lớp học</label>
                            <div className="relative">
                                <button onClick={() => !classes.length ? null : setIsClassOpen(!isClassOpen)}
                                    disabled={classes.length === 0}
                                    className={`flex items-center justify-between w-full rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-fpt-orange transition-all ${classes.length === 0 ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed' : 'bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white'}`}>
                                    <span className="text-sm font-medium truncate">{getSelectedClassName()}</span>
                                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isClassOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isClassOpen && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-60 overflow-y-auto">
                                        <button onClick={() => { setSelectedClass(''); setIsClassOpen(false); }}
                                            className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 ${!selectedClass ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange' : 'text-gray-900 dark:text-white'}`}>
                                            <span className="text-sm font-medium">Tất cả lớp</span>
                                            {!selectedClass && <Check size={16} />}
                                        </button>
                                        {classes.map(cls => (
                                            <button key={cls.className} onClick={() => { setSelectedClass(cls.className); setIsClassOpen(false); }}
                                                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 ${selectedClass === cls.className ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange' : 'text-gray-900 dark:text-white'}`}>
                                                <span className="text-sm font-medium">{cls.className} - {cls.courseName}</span>
                                                {selectedClass === cls.className && <Check size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div ref={statusDropdownRef}>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Trạng thái</label>
                            <div className="relative">
                                <button onClick={() => setIsStatusOpen(!isStatusOpen)}
                                    className="flex items-center justify-between w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-fpt-orange transition-all">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {statusFilter === 'ALL' ? 'Tất cả trạng thái' : statusFilter === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                                    </span>
                                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isStatusOpen && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg">
                                        {[
                                            { value: 'ALL', label: 'Tất cả trạng thái' },
                                            { value: 'OPEN', label: 'Đang mở' },
                                            { value: 'CLOSED', label: 'Đã đóng' }
                                        ].map((option) => (
                                            <button key={option.value} onClick={() => { setStatusFilter(option.value as any); setIsStatusOpen(false); }}
                                                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${statusFilter === option.value ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange' : 'text-gray-900 dark:text-white'}`}>
                                                <span className="text-sm font-medium">{option.label}</span>
                                                {statusFilter === option.value && <Check size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search bar + Create button */}
                <div className="flex gap-3 items-center">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Tìm kiếm theo tên bài tập, phòng, lớp..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange focus:border-transparent outline-none" />
                    </div>
                    <button
                        onClick={() => { resetCreateForm(); setShowCreateDialog(true); }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-fpt-orange hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm whitespace-nowrap">
                        <Plus className="w-4 h-4" /> Tạo bài tập mới
                    </button>
                </div>

                {/* Slot-Based Assignment Table */}
                {loadingAssignments ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-12 text-center">
                        <Loader2 size={32} className="animate-spin mx-auto text-fpt-orange mb-4" />
                        <p className="text-gray-500">Đang tải dữ liệu...</p>
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-12 text-center">
                        <FileText size={48} className="mx-auto text-gray-300 dark:text-zinc-600 mb-4" />
                        <p className="text-gray-500 dark:text-zinc-400">Không có buổi học nào phù hợp</p>
                    </div>
                ) : (
                    <>
                        {/* Batch warning */}
                        {batchWarning && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {batchWarning}
                            </div>
                        )}

                        {/* Batch toolbar */}
                        {selectedIds.size > 0 && (
                            <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl">
                                <span className="text-sm text-orange-700 dark:text-orange-400 font-medium">
                                    Đã chọn {selectedIds.size} bài tập
                                </span>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleBatchEditOpen}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors">
                                        <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa bài tập
                                    </button>
                                    <button onClick={handleBatchDelete}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-orange-500 dark:bg-orange-600">
                                            <th className="px-4 py-3 w-10">
                                                <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll}
                                                    className="w-4 h-4 rounded border-white/50 text-orange-600 focus:ring-orange-500 accent-orange-600" />
                                            </th>
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Lớp</th>
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Ngày</th>
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Slot</th>
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Phòng</th>
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Bài tập</th>
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Trạng thái</th>
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Nộp</th>
                                            <th className="text-right px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {paginatedRows.map(({ slot, assignment }) => (
                                            <React.Fragment key={slot.id}>
                                                <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                    <td className="px-4 py-3 w-10">
                                                        {assignment ? (
                                                            <input type="checkbox" checked={selectedIds.has(assignment.id)}
                                                                onChange={() => toggleSelect(assignment.id)}
                                                                className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-orange-500 focus:ring-orange-500 accent-orange-500" />
                                                        ) : <span className="w-4 h-4 block" />}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                                                        {slot.className || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                                                        {formatSlotDate(slot.date)}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                                                        Slot {slot.slotNumber}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 dark:text-zinc-300">{slot.roomCode || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        {assignment ? (
                                                            <div>
                                                                <div className="font-medium text-gray-900 dark:text-white">{assignment.title}</div>
                                                                {assignment.dueDate && (
                                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                                        <Clock className="w-3 h-3 inline mr-1" />Hạn: {formatDate(assignment.dueDate)}
                                                                    </div>
                                                                )}
                                                                {assignment.referenceUrl && (
                                                                    <a href={getViewableFileUrl(assignment.referenceUrl)} target="_blank" rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-xs text-fpt-orange hover:text-orange-600 mt-0.5">
                                                                        <BookOpen className="w-3 h-3" /> {assignment.referenceName || 'Tài liệu'}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 dark:text-zinc-500 italic">Chưa có bài tập</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {assignment ? (
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${assignment.status === 'OPEN'
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400'
                                                                }`}>
                                                                {assignment.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300 dark:text-zinc-600">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 dark:text-zinc-300">
                                                        {assignment ? `${assignment.totalSubmissions}/${assignment.totalStudents}` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {assignment ? (
                                                                <>
                                                                    <button onClick={() => navigate(`/lecturer/assignments/${assignment.id}`)}
                                                                        className="inline-flex items-center gap-1 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs transition-colors"
                                                                        title="Chi tiết">
                                                                        <Eye className="w-3.5 h-3.5" /> Chi tiết
                                                                    </button>
                                                                    <button onClick={() => toggleExpand(assignment.id)}
                                                                        className="inline-flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-lg text-xs transition-colors">
                                                                        <Users className="w-3.5 h-3.5" />
                                                                        {expandedId === assignment.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                    </button>
                                                                    {assignment.status === 'OPEN' && (
                                                                        <button onClick={() => handleClose(assignment.id)}
                                                                            className="inline-flex items-center gap-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs transition-colors">
                                                                            <Lock className="w-3.5 h-3.5" /> Đóng
                                                                        </button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="text-gray-300 dark:text-zinc-600 text-xs italic">—</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {assignment && expandedId === assignment.id && (
                                                    <tr>
                                                        <td colSpan={9} className="bg-gray-50 dark:bg-zinc-950 px-4 py-4">
                                                            {loadingSubmissions === assignment.id ? (
                                                                <div className="text-center py-4">
                                                                    <Loader2 size={24} className="animate-spin mx-auto text-fpt-orange" />
                                                                </div>
                                                            ) : (submissions[assignment.id]?.length || 0) === 0 ? (
                                                                <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-3">Chưa có sinh viên nào nộp bài</p>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    <div className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                                                                        {submissions[assignment.id]?.length} bài nộp
                                                                    </div>
                                                                    {submissions[assignment.id]?.map(sub => (
                                                                        <div key={sub.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg p-3 border border-gray-200 dark:border-zinc-800">
                                                                            <div>
                                                                                <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                                                    {sub.studentCode} — {sub.studentName}
                                                                                </div>
                                                                                <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                                                                    {sub.fileNames?.[0] || 'File'} • Nộp lúc {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN') : '—'}
                                                                                </div>
                                                                                {sub.note && <div className="text-xs text-gray-400 mt-0.5">Ghi chú: {sub.note}</div>}
                                                                            </div>
                                                                            {sub.fileUrls?.[0] && (
                                                                                <a href={getViewableFileUrl(sub.fileUrls[0])} target="_blank" rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 text-fpt-orange rounded-lg text-xs transition-colors">
                                                                                    <ExternalLink className="w-3 h-3" /> Xem file
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 pb-4">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalElements={filteredRows.length}
                                    pageSize={PAGE_SIZE}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Batch Edit Due Date Dialog */}
            {showBatchEditDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-orange-500" />
                                Chỉnh sửa bài tập
                            </h2>
                            <button onClick={() => setShowBatchEditDialog(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                    Tiêu đề <span className="text-red-500">*</span>
                                </label>
                                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="VD: Bài tập tuần 3"
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Mô tả</label>
                                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Mô tả chi tiết bài tập..." rows={3}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                    <Clock className="w-3.5 h-3.5 inline mr-1" /> Hạn nộp bài
                                </label>
                                <input type="datetime-local" value={editDueDate} onChange={e => setEditDueDate(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                    <BookOpen className="w-3.5 h-3.5 inline mr-1" /> Tài liệu tham khảo
                                </label>
                                <input type="file" ref={editFileInputRef} onChange={handleEditFileSelect} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.png"
                                    className="hidden" />
                                <button type="button" onClick={() => editFileInputRef.current?.click()} disabled={uploadingEditFile}
                                    className="w-full px-3 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 text-sm text-gray-500 hover:border-fpt-orange hover:text-fpt-orange transition-colors flex items-center justify-center gap-2">
                                    {uploadingEditFile ? <><Loader2 size={14} className="animate-spin" /> Đang upload...</> : editRefFile ? <><FileText size={14} /> {editRefFile.name}</> : editRefName ? <><FileText size={14} /> {editRefName}</> : 'Chọn file (tối đa 10MB)'}
                                </button>
                                {editRefUrl && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                                        <FileText size={12} />
                                        <a href={editRefUrl} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[300px]">{editRefName || 'Xem file'}</a>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-zinc-800">
                            <button onClick={() => setShowBatchEditDialog(false)}
                                className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-800 transition-colors">
                                Hủy
                            </button>
                            <button onClick={handleBatchEditSubmit} disabled={batchEditing || !editTitle.trim() || uploadingEditFile}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-fpt-orange hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                {batchEditing ? <><Loader2 size={16} className="animate-spin" /> Đang cập nhật...</> : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Assignment Dialog - Centralized */}
            {showCreateDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-fpt-orange" /> Tạo bài tập mới
                            </h2>
                            <button onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Class Dropdown */}
                            <div ref={createClassDropdownRef}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                    <Users className="w-3.5 h-3.5 inline mr-1" /> Lớp học <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <button onClick={() => setIsCreateClassOpen(!isCreateClassOpen)}
                                        className="flex items-center justify-between w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-fpt-orange transition-all">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {createClassName ? `${createClassName} - ${classes.find(c => c.className === createClassName)?.courseName || ''}` : 'Chọn lớp học'}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isCreateClassOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isCreateClassOpen && (
                                        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-48 overflow-y-auto">
                                            {classes.map(cls => (
                                                <button key={cls.className} onClick={() => {
                                                    setCreateClassName(cls.className);
                                                    setSelectedSessionNumber(null);
                                                    setCreateForSlotId(null);
                                                    setIsCreateClassOpen(false);
                                                }}
                                                    className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${createClassName === cls.className ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange' : 'text-gray-900 dark:text-white'}`}>
                                                    <span className="text-sm font-medium">{cls.className} - {cls.courseName}</span>
                                                    {createClassName === cls.className && <Check size={16} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Slot (Session) Dropdown */}
                            <div ref={createSlotDropdownRef}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                    <Clock className="w-3.5 h-3.5 inline mr-1" /> Slot thứ <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <button
                                        onClick={() => createClassName && !loadingClassSlots && setIsCreateSlotOpen(!isCreateSlotOpen)}
                                        disabled={!createClassName || loadingClassSlots}
                                        className={`flex items-center justify-between w-full rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-fpt-orange transition-all ${!createClassName || loadingClassSlots ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed' : 'bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white'}`}>
                                        <span className="text-sm font-medium truncate">
                                            {loadingClassSlots ? 'Đang tải...' : selectedSessionNumber !== null ? `Buổi ${selectedSessionNumber}` : 'Chọn buổi học'}
                                        </span>
                                        {loadingClassSlots ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isCreateSlotOpen ? 'rotate-180' : ''}`} />}
                                    </button>
                                    {isCreateSlotOpen && createClassSlots.length > 0 && (
                                        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-48 overflow-y-auto">
                                            {createClassSlots.map((s, idx) => {
                                                const sessionNum = idx + 1;
                                                const hasAssignment = assignments.some(a => a.timetableSlotId === s.id);
                                                return (
                                                    <button key={s.id}
                                                        onClick={() => {
                                                            if (!hasAssignment) {
                                                                setSelectedSessionNumber(sessionNum);
                                                                setCreateForSlotId(s.id);
                                                                setIsCreateSlotOpen(false);
                                                            }
                                                        }}
                                                        disabled={hasAssignment}
                                                        className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors ${hasAssignment ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-zinc-800' : 'hover:bg-gray-50 dark:hover:bg-zinc-700/50'} ${selectedSessionNumber === sessionNum ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange' : 'text-gray-900 dark:text-white'}`}>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">Buổi {sessionNum} — {formatSlotDate(s.date)} — Slot {s.slotNumber}</span>
                                                            <span className="text-xs text-gray-400">Phòng: {s.roomCode || '—'}{hasAssignment ? ' (Đã có bài tập)' : ''}</span>
                                                        </div>
                                                        {selectedSessionNumber === sessionNum && <Check size={16} />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Auto-populated slot info */}
                            {selectedSessionSlot && (
                                <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg">
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold">Ngày</div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{formatSlotDate(selectedSessionSlot.date)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold">Slot</div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{selectedSessionSlot.slotNumber}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold">Phòng</div>
                                        <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{selectedSessionSlot.roomCode || '—'}</div>
                                    </div>
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                    Tiêu đề <span className="text-red-500">*</span>
                                </label>
                                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="VD: Bài tập tuần 3"
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange outline-none" />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Mô tả</label>
                                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Mô tả chi tiết bài tập..." rows={3}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange outline-none resize-none" />
                            </div>

                            {/* Deadline */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                    <Clock className="w-3.5 h-3.5 inline mr-1" /> Hạn nộp bài <span className="text-red-500">*</span>
                                </label>
                                <input type="datetime-local" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange outline-none" />
                            </div>

                            {/* Reference File */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                    <BookOpen className="w-3.5 h-3.5 inline mr-1" /> Tài liệu tham khảo
                                </label>
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.png"
                                    className="hidden" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                                    className="w-full px-3 py-2.5 rounded-lg border border-dashed border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 text-sm text-gray-500 hover:border-fpt-orange hover:text-fpt-orange transition-colors flex items-center justify-center gap-2">
                                    {uploadingFile ? <><Loader2 size={14} className="animate-spin" /> Đang upload...</> : selectedFile ? <><FileText size={14} /> {selectedFile.name}</> : 'Chọn file (tối đa 10MB)'}
                                </button>
                                {newRefUrl && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                                        <FileText size={12} />
                                        <a href={newRefUrl} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[300px]">{newRefName || 'Xem file'}</a>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-zinc-800 sticky bottom-0 bg-white dark:bg-zinc-900 rounded-b-2xl">
                            <button onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
                                className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-800 transition-colors">
                                Hủy
                            </button>
                            <button onClick={handleCreate} disabled={creating || !newTitle.trim() || !createClassName || selectedSessionNumber === null || !newDueDate || uploadingFile}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-fpt-orange hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                {creating ? <><Loader2 size={16} className="animate-spin" /> Đang tạo...</> : <><Plus className="w-4 h-4" /> Tạo bài tập</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </LecturerLayout >
    );
};

export default LecturerAssignmentPage;
