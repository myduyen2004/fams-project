import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { lecturerClassService, SemesterResponse, ClassSectionResponse } from '../../services/api/LecturerClass';
import { assignmentService, AssignmentDTO } from '../../services/api/assignmentService';
import { timetableService, TimetableSlotDTO } from '../../services/api/timetableService';
import { authService } from '../../services/api/authService';
import { uploadFile } from '../../services/utils/fileUploadService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import { Pagination } from '../../components/common/Pagination';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Clock, Search, FileText, Loader2, Plus, X, BookOpen, Edit3, Trash2, Download, ChevronDown, Check
} from 'lucide-react';
import toast from "@utils/toast";
import { CustomSelect } from '../../components/common/CustomSelect';
import { StaticDateTimePicker } from '../../components/common/StaticDateTimePicker';
import { SelectionActionBar } from '../../components/academic-staff/SelectionActionBar';
import { useWebSocket } from '../../hooks/useWebSocket';

export const LecturerAssignmentPage: React.FC = () => {
    const user = authService.getUser();
    const navigate = useNavigate();

    // Semester & Class state
    const [semesters, setSemesters] = useState<SemesterResponse[]>([]);
    const [classes, setClasses] = useState<ClassSectionResponse[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');

    const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Assignments & Slots
    const [assignments, setAssignments] = useState<AssignmentDTO[]>([]);
    const [slots, setSlots] = useState<TimetableSlotDTO[]>([]);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const PAGE_SIZE = 10;

    // Multi-select & batch edit
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showBatchEditDialog, setShowBatchEditDialog] = useState(false);
    const [batchEditing, setBatchEditing] = useState(false);
    const [editAssignmentId, setEditAssignmentId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editDueDate, setEditDueDate] = useState('');
    const [editRefUrls, setEditRefUrls] = useState<string[]>([]);
    const [editRefNames, setEditRefNames] = useState<string[]>([]);
    const [uploadingEditFile, setUploadingEditFile] = useState(false);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    // Create dialog
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [newRefUrls, setNewRefUrls] = useState<string[]>([]);
    const [newRefNames, setNewRefNames] = useState<string[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Centralized create modal state
    const [createClassName, setCreateClassName] = useState('');
    const [createClassSlots, setCreateClassSlots] = useState<TimetableSlotDTO[]>([]);
    const [loadingClassSlots, setLoadingClassSlots] = useState(false);
    const [selectedSessionNumber, setSelectedSessionNumber] = useState<number | null>(null);

    // Custom dropdown states for create modal
    const [openClassDropdown, setOpenClassDropdown] = useState(false);
    const [classSearchTerm, setClassSearchTerm] = useState('');
    const [openSlotDropdown, setOpenSlotDropdown] = useState(false);
    const classDropdownRef = useRef<HTMLDivElement>(null);
    const slotDropdownRef = useRef<HTMLDivElement>(null);

    // Click outside for custom dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
                setOpenClassDropdown(false);
            }
            if (slotDropdownRef.current && !slotDropdownRef.current.contains(event.target as Node)) {
                setOpenSlotDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Download dialog state
    const [showDownloadDialog, setShowDownloadDialog] = useState(false);
    const [dlClassName, setDlClassName] = useState<string>('');
    const [dlAssignments, setDlAssignments] = useState<AssignmentDTO[]>([]);
    const [dlAssignmentId, setDlAssignmentId] = useState<number | null>(null);
    const [downloadingZip, setDownloadingZip] = useState(false);
    const [loadingDlAssignments, setLoadingDlAssignments] = useState(false);

    // Delete dialog
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // useEffects for data fetching
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

    const fetchClasses = useCallback(async () => {
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
    }, [selectedSemester, user?.id]);

    // Fetch ALL slots and assignments across all classes for the selected semester
    const fetchAllData = useCallback(async () => {
        if (!selectedSemester || !user?.id) return;
        setLoadingAssignments(true);
        try {
            const classNames = classes.map(c => c.className);

            let slotsData: TimetableSlotDTO[] = [];
            try {
                // Fetch ALL slots for these classes to guarantee we can map assignment.timetableSlotId correctly
                const classPromises = classNames.map(cn =>
                    timetableService.getTimetableByClass(cn).catch(() => [] as TimetableSlotDTO[])
                );
                const classSlotsResults = await Promise.all(classPromises);
                slotsData = classSlotsResults.flat();
            } catch (err: any) {
                console.error('Failed to fetch class slots:', err);
            }

            // Fetch assignments for all classes
            let allAssignments: AssignmentDTO[] = [];
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

    // Load classes when semester changes
    useEffect(() => {
        if (selectedSemester && user?.id) {
            fetchClasses();
        }
    }, [fetchClasses]);

    // Load ALL slots + assignments when classes are loaded (auto-load on semester change)
    useEffect(() => {
        if (selectedSemester && user?.id && classes.length > 0) {
            fetchAllData();
        } else if (classes.length === 0 && selectedSemester) {
            setSlots([]);
            setAssignments([]);
        }
    }, [classes, selectedSemester, user?.id, fetchAllData]);

    // WebSocket for real-time updates
    useWebSocket('/user/queue/notifications', (data: any) => {
        if (Array.isArray(data)) {
            const hasSubmission = data.some((notif: any) => notif.type === 'SUBMISSION');
            if (hasSubmission) {
                console.log('Real-time update: Assignment submission received');
                fetchAllData();
            }
        }
    });


    // Fetch slots for selected class in create modal
    useEffect(() => {
        if (!createClassName) {
            setCreateClassSlots([]);
            setSelectedSessionNumber(null);
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
        if (new Date(newDueDate) < new Date()) {
            toast.error('Hạn nộp bài phải từ thời điểm hiện tại trở đi');
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
                referenceUrls: newRefUrls,
                referenceNames: newRefNames
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



    const resetCreateForm = () => {
        setNewTitle('');
        setNewDescription('');
        setNewDueDate('');
        setNewRefUrls([]);
        setNewRefNames([]);
        setCreateClassName('');
        setCreateClassSlots([]);
        setSelectedSessionNumber(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const oversizedFile = files.find(f => f.size > 10 * 1024 * 1024);
        if (oversizedFile) {
            toast.error(`File ${oversizedFile.name} quá lớn. Tối đa 10MB.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        try {
            setUploadingFile(true);
            const uploadPromises = files.map(file => uploadFile(file));
            const results = await Promise.all(uploadPromises);

            const urls = results.map(r => r.secure_url || r.url);
            const names = files.map(f => f.name);

            setNewRefUrls(prev => [...prev, ...urls]);
            setNewRefNames(prev => [...prev, ...names]);

            toast.success(`Đã upload ${files.length} tài liệu`);
        } catch (err: any) {
            toast.error(err.message || 'Upload thất bại');
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeNewFile = (index: number) => {
        setNewRefUrls(prev => prev.filter((_, i) => i !== index));
        setNewRefNames(prev => prev.filter((_, i) => i !== index));
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

    // Build a merged list: each assignment + its linked slot (if any) — memoized
    const { filteredRows, totalPages, paginatedRows, assignmentIdsOnPage, allOnPageSelected } = React.useMemo(() => {
        const slotById = new Map<number, TimetableSlotDTO>();
        slots.forEach(s => slotById.set(s.id, s));

        const assignmentRows = assignments.map(assignment => ({
            assignment,
            slot: assignment.timetableSlotId ? slotById.get(assignment.timetableSlotId) || null : null
        }));

        const filteredRows = assignmentRows.filter(row => {
            if (selectedClass && row.slot?.className !== selectedClass) return false;
            if (statusFilter === 'OPEN' && row.assignment.status !== 'OPEN') return false;
            if (statusFilter === 'CLOSED' && row.assignment.status !== 'CLOSED') return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchSlot = (row.slot?.courseName || '').toLowerCase().includes(term)
                    || (row.slot?.roomCode || '').toLowerCase().includes(term)
                    || (row.slot?.className || '').toLowerCase().includes(term);
                const matchAssignment = row.assignment.title.toLowerCase().includes(term)
                    || (row.assignment.description || '').toLowerCase().includes(term);
                return matchSlot || matchAssignment;
            }
            return true;
        });

        const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
        const paginatedRows = filteredRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
        const assignmentIdsOnPage = paginatedRows.map(r => r.assignment.id);
        const allOnPageSelected = assignmentIdsOnPage.length > 0 && assignmentIdsOnPage.every(id => selectedIds.has(id));

        return { filteredRows, totalPages, paginatedRows, assignmentIdsOnPage, allOnPageSelected };
    }, [slots, assignments, selectedClass, statusFilter, searchTerm, currentPage, selectedIds]);

    // Reset page & selection when filters change
    useEffect(() => {
        setCurrentPage(0);
        setSelectedIds(new Set());
    }, [selectedClass, statusFilter, searchTerm]);

    const toggleSelect = (assignmentId: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(assignmentId)) next.delete(assignmentId);
            else next.add(assignmentId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (allOnPageSelected) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                assignmentIdsOnPage.forEach(id => next.delete(id));
                return next;
            });
        } else {
            setSelectedIds(prev => {
                const next = new Set(prev);
                assignmentIdsOnPage.forEach(id => next.add(id));
                return next;
            });
        }
    };

    const handleBatchEditOpen = () => {
        if (selectedIds.size === 0) { toast.error('Vui lòng chọn ít nhất một bài tập'); return; }
        if (selectedIds.size > 1) { toast.error('Chỉ có thể chỉnh sửa từng bài tập một'); return; }
        const assignmentId = Array.from(selectedIds)[0];
        const assignment = assignments.find(a => a.id === assignmentId);
        if (!assignment) return;
        setEditAssignmentId(assignmentId);
        setEditTitle(assignment.title);
        setEditDescription(assignment.description || '');
        setEditDueDate(assignment.dueDate || '');
        setEditRefUrls(assignment.referenceUrls?.length ? assignment.referenceUrls : (assignment.referenceUrl ? assignment.referenceUrl.split('|||') : []));
        setEditRefNames(assignment.referenceNames?.length ? assignment.referenceNames : (assignment.referenceName ? assignment.referenceName.split('|||') : []));
        setShowBatchEditDialog(true);
    };

    const handleEditFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const oversizedFile = files.find(f => f.size > 10 * 1024 * 1024);
        if (oversizedFile) {
            toast.error(`File ${oversizedFile.name} quá lớn. Tối đa 10MB.`);
            if (editFileInputRef.current) editFileInputRef.current.value = '';
            return;
        }

        try {
            setUploadingEditFile(true);
            const uploadPromises = files.map(file => uploadFile(file));
            const results = await Promise.all(uploadPromises);

            const urls = results.map(r => r.secure_url || r.url);
            const names = files.map(f => f.name);

            setEditRefUrls(prev => [...prev, ...urls]);
            setEditRefNames(prev => [...prev, ...names]);

            toast.success(`Đã upload ${files.length} tài liệu`);
        } catch (err: any) {
            toast.error(err.message || 'Upload thất bại');
        } finally {
            setUploadingEditFile(false);
            if (editFileInputRef.current) editFileInputRef.current.value = '';
        }
    };

    const removeEditFile = (index: number) => {
        setEditRefUrls(prev => prev.filter((_, i) => i !== index));
        setEditRefNames(prev => prev.filter((_, i) => i !== index));
    };

    const handleBatchEditSubmit = async () => {
        if (!editAssignmentId || !editTitle.trim()) { toast.error('Tiêu đề không được để trống'); return; }
        if (editDueDate) {
            if (new Date(editDueDate) < new Date()) {
                toast.error('Hạn nộp bài phải từ thời điểm hiện tại trở đi');
                return;
            }
        }
        try {
            setBatchEditing(true);
            await assignmentService.updateAssignment(editAssignmentId, {
                title: editTitle.trim(),
                description: editDescription.trim() || undefined,
                dueDate: editDueDate || undefined,
                referenceUrls: editRefUrls,
                referenceNames: editRefNames,
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

    const handleBatchDeleteClick = () => {
        if (selectedIds.size === 0) { toast.error('Vui lòng chọn ít nhất một bài tập'); return; }
        setShowDeleteDialog(true);
    };

    const confirmBatchDelete = async () => {
        try {
            setDeleting(true);
            const promises = Array.from(selectedIds).map(id =>
                assignmentService.deleteAssignment(id)
            );
            await Promise.all(promises);
            toast.success(`Đã xóa ${selectedIds.size} bài tập`);
            setSelectedIds(new Set());
            setShowDeleteDialog(false);
            fetchAllData();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể xóa bài tập');
        } finally {
            setDeleting(false);
        }
    };

    // Download dialog handlers
    const handleOpenDownloadDialog = () => {
        setDlClassName('');
        setDlAssignmentId(null);
        setDlAssignments([]);
        setShowDownloadDialog(true);
    };

    const handleDlClassChange = async (className: string) => {
        setDlClassName(className);
        setDlAssignmentId(null);
        setDlAssignments([]);
        if (!className) return;
        try {
            setLoadingDlAssignments(true);
            const data = await assignmentService.getAssignmentsByClass(className);
            setDlAssignments(data);
        } catch {
            toast.error('Không thể tải danh sách bài tập');
        } finally {
            setLoadingDlAssignments(false);
        }
    };

    const handleDlAssignmentChange = (idStr: string) => {
        const aid = Number(idStr);
        setDlAssignmentId(aid || null);
    };

    const handleDownloadSubmissions = async () => {
        if (!dlAssignmentId) return;
        try {
            setDownloadingZip(true);
            const blob = await assignmentService.downloadAllSubmissions(dlAssignmentId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const found = dlAssignments.find(a => a.id === dlAssignmentId);
            link.setAttribute('download', `${dlClassName}_${found?.title || dlAssignmentId}_submissions.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Đã tải bài nộp thành công');
            setShowDownloadDialog(false);
        } catch (err: any) {
            let msg = 'Không thể tải bài nộp';
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const json = JSON.parse(text);
                    msg = json.message || json.error || msg;
                } catch { /* ignore */ }
            } else if (err.response?.data?.message) {
                msg = err.response.data.message;
            }
            toast.error(msg);
        } finally {
            setDownloadingZip(false);
        }
    };

    return (
        <LecturerLayout pageTitle="Quản lý bài tập">
            <div className="space-y-6 pb-8">

                {/* Header & Filter Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-8 shadow-sm animate-in fade-in duration-500">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Quản lý Bài tập</h1>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 font-medium">Quản lý danh sách bài tập, thời hạn và tài liệu hướng dẫn cho sinh viên</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleOpenDownloadDialog}
                                className="flex h-[52px] items-center gap-2 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 px-6 text-sm font-bold text-gray-700 dark:text-white hover:border-fpt-orange/40 hover:text-fpt-orange transition-all whitespace-nowrap active:scale-95 shadow-sm"
                            >
                                <Download className="h-[20px] w-[20px]" />
                                Tải bài nộp
                            </button>
                            <button
                                onClick={() => { resetCreateForm(); setShowCreateDialog(true); }}
                                className="flex h-[52px] items-center gap-2 rounded-2xl bg-fpt-orange px-8 text-sm font-bold text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-fpt-orange/20 transition-all whitespace-nowrap active:scale-95"
                            >
                                <Plus className="h-[20px] w-[20px]" strokeWidth={3} />
                                Tạo bài tập mới
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Search Bar */}
                        <div className="relative group">
                            <label className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5 ml-1 block">Tìm kiếm</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-fpt-orange transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên bài, lớp..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 text-gray-900 dark:text-white shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Semester Selector */}
                        <CustomSelect
                            label="Học kỳ"
                            value={selectedSemester}
                            onChange={(value) => setSelectedSemester(value)}
                            options={semesters.map(s => ({ value: s.code, label: s.name }))}
                        />

                        {/* Class Selector */}
                        <CustomSelect
                            label="Lớp học"
                            value={selectedClass}
                            disabled={classes.length === 0}
                            onChange={(value) => setSelectedClass(value)}
                            options={[
                                { value: '', label: 'Tất cả lớp' },
                                ...classes.map(cls => ({ value: cls.className, label: `${cls.className} - ${cls.courseName}` }))
                            ]}
                        />

                        {/* Status Filter */}
                        <CustomSelect
                            label="Trạng thái"
                            value={statusFilter}
                            onChange={(value) => setStatusFilter(value as any)}
                            options={[
                                { value: 'ALL', label: 'Tất cả trạng thái' },
                                { value: 'OPEN', label: 'Đang mở' },
                                { value: 'CLOSED', label: 'Đã đóng' }
                            ]}
                        />
                    </div>
                </div>

                {/* Slot-Based Assignment Table */}
                {loadingAssignments ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-20 text-center shadow-xl animate-in fade-in duration-700">
                        <Loader2 className="h-10 w-10 animate-spin text-fpt-orange mx-auto mb-3" />
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Đang tải dữ liệu...</p>
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-20 text-center shadow-xl animate-in fade-in duration-700">
                        <div className="w-24 h-24 rounded-3xl bg-orange-50 dark:bg-zinc-800/50 mx-auto mb-8 flex items-center justify-center">
                            <FileText size={48} className="text-fpt-orange" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                            Không có bài tập nào
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium max-w-md mx-auto">
                            Chưa có bài tập phù hợp với bộ lọc hiện tại. Hãy thử thay đổi bộ lọc hoặc tạo bài tập mới.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Selection Action Bar - Standard pattern */}
                        <SelectionActionBar
                            selectedCount={selectedIds.size}
                            showDeactivate={Array.from(selectedIds).some(id => {
                                const row = filteredRows.find(r => r.assignment.id === id);
                                return row?.assignment.status === 'OPEN';
                            })}
                            itemLabel="bài tập"
                            deactivateLabel="Đóng bài tập"
                            activateLabel="Mở bài tập"
                            onUpdate={selectedIds.size === 1 ? handleBatchEditOpen : undefined}
                            onDelete={handleBatchDeleteClick}
                            onStatusChange={(status) => {
                                if (status === 'ACTIVE') return; // Open not supported by API yet

                                const targetIds = Array.from(selectedIds).filter(id => {
                                    const row = filteredRows.find(r => r.assignment.id === id);
                                    return row?.assignment.status === 'OPEN';
                                });

                                if (targetIds.length === 0) return;

                                Promise.all(targetIds.map(id => assignmentService.closeAssignment(id)))
                                    .then(() => {
                                        toast.success(`Đã đóng ${targetIds.length} bài tập`);
                                        setSelectedIds(new Set());
                                        fetchAllData();
                                    })
                                    .catch((err: any) => toast.error(err.response?.data?.message || 'Không thể đóng bài tập'));
                            }}
                        />

                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl overflow-hidden animate-in fade-in duration-700">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-fpt-orange text-white">
                                            <th className="px-4 py-5 w-10 rounded-tl-2xl">
                                                <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll}
                                                    className="w-4 h-4 rounded border-white/50 text-fpt-orange focus:ring-fpt-orange accent-white" />
                                            </th>
                                            <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Lớp</th>
                                            <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Ngày Slot</th>
                                            <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Slot</th>
                                            <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Phòng</th>
                                            <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Bài tập</th>
                                            <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Hạn nộp</th>
                                            <th className="px-4 py-5 text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Trạng thái</th>
                                            <th className="px-4 py-5 text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Bài nộp</th>
                                            <th className="px-4 py-5 text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap rounded-tr-2xl">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {paginatedRows.map(({ slot, assignment }) => (
                                            <React.Fragment key={assignment.id}>
                                                <tr onClick={() => navigate(`/lecturer/assignments/${assignment.id}`)}
                                                    className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer">
                                                    <td className="px-6 py-5 w-10" onClick={e => e.stopPropagation()}>
                                                        <input type="checkbox" checked={selectedIds.has(assignment.id)}
                                                            onChange={() => toggleSelect(assignment.id)}
                                                            className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-fpt-orange focus:ring-fpt-orange accent-fpt-orange" />
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="font-bold text-gray-800 dark:text-white text-sm uppercase tracking-tight group-hover:text-fpt-orange transition-colors">
                                                            {slot?.className || assignment.className || '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="text-sm font-medium text-gray-600 dark:text-zinc-400 whitespace-nowrap">
                                                            {(slot?.date && formatSlotDate(slot.date)) || '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="text-sm font-medium text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                                                            {slot?.slotNumber ? `Slot ${slot.slotNumber}` : '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="text-sm font-medium text-gray-600 dark:text-zinc-400">
                                                            {slot?.roomCode || '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div>
                                                            <div className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-fpt-orange transition-colors tracking-tight uppercase">{assignment.title}</div>
                                                            {assignment.dueDate && (
                                                                <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                                                                    <Clock className="w-3 h-3" /> Hạn: {formatDate(assignment.dueDate)}
                                                                </div>
                                                            )}
                                                            {(() => {
                                                                const urls = assignment.referenceUrls?.length ? assignment.referenceUrls : (assignment.referenceUrl ? assignment.referenceUrl.split('|||') : []);
                                                                const names = assignment.referenceNames?.length ? assignment.referenceNames : (assignment.referenceName ? assignment.referenceName.split('|||') : []);
                                                                return urls.length > 0 && (
                                                                    <div className="flex flex-col gap-1 mt-2">
                                                                        {urls.map((url, idx) => (
                                                                            <a key={idx} href={getViewableFileUrl(url)} target="_blank" rel="noopener noreferrer"
                                                                                onClick={e => e.stopPropagation()}
                                                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-fpt-orange hover:text-orange-600 transition-colors max-w-[240px]" title={names[idx] || `Tài liệu ${idx + 1}`}>
                                                                                <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                                                                                <span className="truncate border-b border-fpt-orange/20">{names[idx] || `Tài liệu ${idx + 1}`}</span>
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold border ${assignment.status === 'OPEN'
                                                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50'
                                                            : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-zinc-800/50 dark:text-zinc-500 dark:border-zinc-700/50'
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${assignment.status === 'OPEN' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                            {assignment.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 font-black text-gray-900 dark:text-white text-xs tracking-tight">
                                                            <span className="text-fpt-orange">{assignment.totalSubmissions}</span>
                                                            <span className="text-gray-400">/</span>
                                                            <span>{assignment.totalStudents}</span>
                                                        </div>
                                                    </td>

                                                </tr>

                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-8 py-8 border-t border-gray-50 dark:border-zinc-800/50 bg-gray-50/30">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl w-full max-w-4xl border border-gray-100 dark:border-zinc-800 overflow-hidden transform animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between p-8 border-b border-gray-50 dark:border-zinc-800/50">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-xl">
                                    <Edit3 className="w-5 h-5 text-fpt-orange" />
                                </div>
                                Chỉnh sửa bài tập
                            </h2>
                            <button onClick={() => setShowBatchEditDialog(false)}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 ml-1">
                                            Tiêu đề <span className="text-red-500">*</span>
                                        </label>
                                        <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="VD: Bài tập tuần 3"
                                            className="w-full px-4 h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 ml-1">Mô tả</label>
                                        <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Mô tả chi tiết bài tập..." rows={4}
                                            className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 resize-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 ml-1">
                                            <BookOpen className="w-3.5 h-3.5 inline mr-1 mb-0.5" /> Tài liệu tham khảo
                                        </label>
                                        <input type="file" ref={editFileInputRef} onChange={handleEditFileSelect} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.png"
                                            multiple className="hidden" />
                                        <button type="button" onClick={() => editFileInputRef.current?.click()} disabled={uploadingEditFile}
                                            className="w-full px-4 h-[52px] rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50 text-sm font-bold text-gray-500 hover:border-fpt-orange hover:text-fpt-orange transition-all flex items-center justify-center gap-2">
                                            {uploadingEditFile ? <><Loader2 size={16} className="animate-spin" /> Đang upload...</> : <><Plus size={16} /> Thêm tài liệu</>}
                                        </button>

                                        {editRefUrls.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                {editRefUrls.map((url, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100/50 dark:border-orange-900/20 group">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                                                                <FileText size={14} className="text-blue-500" />
                                                            </div>
                                                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-gray-700 dark:text-zinc-300 hover:text-fpt-orange underline truncate">
                                                                {editRefNames[idx] || `Tài liệu ${idx + 1}`}
                                                            </a>
                                                        </div>
                                                        <button type="button" onClick={() => removeEditFile(idx)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors rounded-lg">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="sticky top-0">
                                    <StaticDateTimePicker
                                        label="Hạn nộp bài *"
                                        value={editDueDate}
                                        onChange={setEditDueDate}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-gray-50 dark:border-zinc-800/50 bg-gray-50/30 dark:bg-zinc-800/20">
                            <button onClick={() => setShowBatchEditDialog(false)}
                                className="px-6 h-[48px] text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
                                Hủy
                            </button>
                            <button onClick={handleBatchEditSubmit} disabled={batchEditing || !editTitle.trim() || uploadingEditFile}
                                className="inline-flex items-center gap-2 px-8 h-[48px] bg-fpt-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                                {batchEditing ? <><Loader2 size={18} className="animate-spin" /> Đang lưu...</> : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Create Assignment Dialog - Centralized */}
            {showCreateDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl w-full max-w-4xl border border-gray-100 dark:border-zinc-800 max-h-[90vh] overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between p-8 border-b border-gray-50 dark:border-zinc-800/50 sticky top-0 bg-white dark:bg-zinc-900 z-10">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-xl">
                                    <Plus className="w-5 h-5 text-fpt-orange" />
                                </div>
                                Tạo bài tập mới
                            </h2>
                            <button onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                <div className="space-y-6">
                                    {/* Class Selector - Custom UI */}
                                    <div ref={classDropdownRef} className="relative">
                                        <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 ml-1">
                                            Lớp học <span className="text-red-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setOpenClassDropdown(!openClassDropdown)}
                                            className={`flex items-center justify-between w-full h-[52px] rounded-2xl border-2 px-4 text-left transition-all ${openClassDropdown ? 'border-fpt-orange ring-4 ring-fpt-orange/10 shadow-lg shadow-fpt-orange/5' : 'border-gray-100 dark:border-zinc-800 hover:border-fpt-orange/40'
                                                } bg-white dark:bg-zinc-900`}
                                        >
                                            <span className={`text-sm font-bold truncate ${createClassName ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-500'}`}>
                                                {createClassName ? (classes.find(c => c.className === createClassName)?.className + ' - ' + classes.find(c => c.className === createClassName)?.courseName) : 'Chọn lớp học'}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openClassDropdown ? 'rotate-180 text-fpt-orange' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {openClassDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute z-[60] mt-2 w-full bg-white dark:bg-zinc-900 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 shadow-2xl p-1.5 overflow-hidden flex flex-col"
                                                >
                                                    <div className="max-h-[250px] overflow-auto custom-scrollbar">
                                                        {classes.filter(c =>
                                                            c.className.toLowerCase().includes(classSearchTerm.toLowerCase()) ||
                                                            c.courseName.toLowerCase().includes(classSearchTerm.toLowerCase())
                                                        ).length > 0 ? (
                                                            classes.filter(c =>
                                                                c.className.toLowerCase().includes(classSearchTerm.toLowerCase()) ||
                                                                c.courseName.toLowerCase().includes(classSearchTerm.toLowerCase())
                                                            ).map((cls) => (
                                                                <button
                                                                    key={cls.className}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setCreateClassName(cls.className);
                                                                        setSelectedSessionNumber(null);
                                                                        setOpenClassDropdown(false);
                                                                        setClassSearchTerm('');
                                                                    }}
                                                                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-all rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 ${createClassName === cls.className ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange' : 'text-gray-700 dark:text-zinc-300 font-medium'
                                                                        }`}
                                                                >
                                                                    <span className="text-sm truncate pr-2">{cls.className} - {cls.courseName}</span>
                                                                    {createClassName === cls.className && <Check size={14} className="stroke-[3]" />}
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="py-6 text-center text-gray-400 text-xs">Không tìm thấy lớp học</div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Slot Selector - Custom UI */}
                                    <div ref={slotDropdownRef} className="relative">
                                        <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 ml-1">
                                            Buổi học <span className="text-red-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            disabled={!createClassName || loadingClassSlots}
                                            onClick={() => setOpenSlotDropdown(!openSlotDropdown)}
                                            className={`flex items-center justify-between w-full h-[52px] rounded-2xl border-2 px-4 text-left transition-all ${openSlotDropdown ? 'border-fpt-orange ring-4 ring-fpt-orange/10 shadow-lg shadow-fpt-orange/5' : 'border-gray-100 dark:border-zinc-800 hover:border-fpt-orange/40'
                                                } bg-white dark:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            <span className={`text-sm font-bold truncate ${selectedSessionNumber ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-500'}`}>
                                                {loadingClassSlots ? 'Đang tải...' : selectedSessionNumber ? `Buổi ${selectedSessionNumber} — ${formatSlotDate(createClassSlots[selectedSessionNumber - 1]?.date)}` : 'Chọn buổi học'}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openSlotDropdown ? 'rotate-180 text-fpt-orange' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {openSlotDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute z-[60] mt-2 w-full bg-white dark:bg-zinc-900 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 shadow-2xl p-1.5 overflow-hidden"
                                                >
                                                    <div className="max-h-[250px] overflow-auto custom-scrollbar">
                                                        {createClassSlots.length > 0 ? createClassSlots.map((s, idx) => {
                                                            const sessionNum = idx + 1;
                                                            const hasAssignment = assignments.some(a => a.timetableSlotId === s.id);
                                                            const isSelected = selectedSessionNumber === sessionNum;
                                                            return (
                                                                <button
                                                                    key={s.id}
                                                                    type="button"
                                                                    disabled={hasAssignment}
                                                                    onClick={() => {
                                                                        setSelectedSessionNumber(sessionNum);
                                                                        setOpenSlotDropdown(false);
                                                                    }}
                                                                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-all rounded-xl ${hasAssignment ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                                                                        } ${isSelected ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange' : 'text-gray-700 dark:text-zinc-300 font-medium'
                                                                        }`}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-bold">Buổi {sessionNum} — {formatSlotDate(s.date)}</span>
                                                                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-0.5">Slot {s.slotNumber} {hasAssignment && '• Đã có bài tập'}</span>
                                                                    </div>
                                                                    {isSelected && <Check size={14} className="stroke-[3]" />}
                                                                </button>
                                                            );
                                                        }) : (
                                                            <div className="py-6 text-center text-gray-400 text-xs">Không có dữ liệu buổi học</div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Auto-populated slot info - Enhanced view */}
                                    {selectedSessionSlot && (
                                        <div className="grid grid-cols-3 gap-3 p-4 bg-orange-50/30 dark:bg-orange-950/5 border border-orange-100/50 dark:border-orange-900/20 rounded-2xl">
                                            <div className="text-center">
                                                <div className="text-[9px] uppercase font-black tracking-widest text-orange-400 dark:text-orange-500 mb-1">Ngày</div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{formatSlotDate(selectedSessionSlot.date)}</div>
                                            </div>
                                            <div className="text-center border-x border-orange-100 dark:border-orange-900/20">
                                                <div className="text-[9px] uppercase font-black tracking-widest text-orange-400 dark:text-orange-500 mb-1">Slot</div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{selectedSessionSlot.slotNumber}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[9px] uppercase font-black tracking-widest text-orange-400 dark:text-orange-500 mb-1">Phòng</div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{selectedSessionSlot.roomCode || '—'}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Title */}
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 ml-1">
                                            Tiêu đề <span className="text-red-500">*</span>
                                        </label>
                                        <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="VD: Bài tập tuần 3"
                                            className="w-full px-4 h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40" />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 ml-1">Mô tả</label>
                                        <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Mô tả chi tiết bài tập..." rows={3}
                                            className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 resize-none" />
                                    </div>

                                    {/* Reference File */}
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 ml-1">
                                            <BookOpen className="w-3.5 h-3.5 inline mr-1 mb-0.5" /> Tài liệu tham khảo
                                        </label>
                                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.png"
                                            multiple className="hidden" />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                                            className="w-full px-4 h-[52px] rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50 text-sm font-bold text-gray-500 hover:border-fpt-orange hover:text-fpt-orange transition-all flex items-center justify-center gap-2">
                                            {uploadingFile ? <><Loader2 size={16} className="animate-spin" /> Đang upload...</> : <><Plus size={16} /> Thêm tài liệu</>}
                                        </button>

                                        {newRefUrls.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                {newRefUrls.map((url, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100/50 dark:border-orange-900/20 group">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                                                                <FileText size={14} className="text-blue-500" />
                                                            </div>
                                                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-gray-700 dark:text-zinc-300 hover:text-fpt-orange underline truncate">
                                                                {newRefNames[idx] || `Tài liệu ${idx + 1}`}
                                                            </a>
                                                        </div>
                                                        <button type="button" onClick={() => removeNewFile(idx)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors rounded-lg">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="sticky top-0">
                                    <StaticDateTimePicker
                                        label="Hạn nộp bài *"
                                        value={newDueDate}
                                        onChange={setNewDueDate}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-gray-50 dark:border-zinc-800/50 bg-gray-50/30 dark:bg-zinc-800/20 sticky bottom-0 z-10">
                            <button onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
                                className="px-6 h-[48px] text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
                                Hủy
                            </button>
                            <button onClick={handleCreate} disabled={creating || !newTitle.trim() || !createClassName || selectedSessionNumber === null || !newDueDate || uploadingFile}
                                className="inline-flex items-center gap-2 px-8 h-[48px] bg-fpt-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-black tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                                {creating ? <><Loader2 size={18} className="animate-spin" /> Đang tạo...</> : <><Plus className="w-4 h-4" /> Tạo bài tập</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Download Submissions Dialog */}
            {showDownloadDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-md shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden transform animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between p-8 border-b border-gray-50 dark:border-zinc-800/50">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-xl">
                                    <Download className="w-5 h-5 text-fpt-orange" />
                                </div>
                                Tải bài nộp
                            </h2>
                            <button onClick={() => setShowDownloadDialog(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <CustomSelect
                                    label="Lớp học *"
                                    value={dlClassName}
                                    onChange={handleDlClassChange}
                                    options={[
                                        ...classes.map(c => ({ value: c.className, label: c.className }))
                                    ]}
                                    placeholder="Chọn lớp học"
                                    isSearchable={true}
                                />
                            </div>
                            {dlClassName && (
                                <div>
                                    <CustomSelect
                                        label="Bài tập *"
                                        value={dlAssignmentId?.toString() || ''}
                                        onChange={handleDlAssignmentChange}
                                        placeholder={loadingDlAssignments ? 'Đang tải...' : 'Chọn bài tập'}
                                        options={[
                                            ...(loadingDlAssignments ? [] : dlAssignments.map(a => ({ value: a.id.toString(), label: a.title })))
                                        ]}
                                    />
                                </div>
                            )}

                        </div>
                        <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-gray-50 dark:border-zinc-800/50 bg-gray-50/30 dark:bg-zinc-800/20">
                            <button onClick={() => setShowDownloadDialog(false)} className="px-6 h-[48px] text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">Hủy</button>
                            <button onClick={handleDownloadSubmissions} disabled={!dlAssignmentId || downloadingZip}
                                className="inline-flex items-center gap-2 px-8 h-[48px] bg-fpt-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                                {downloadingZip ? <><Loader2 size={18} className="animate-spin" /> Đang tải...</> : <><Download className="w-4 h-4" /> Tải xuống</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-800 rounded-[32px] p-8 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-zinc-800 transform animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-3">Xác nhận xóa</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-8 leading-relaxed">
                            Bạn có chắc muốn xóa <span className="font-black text-red-500 px-1">{selectedIds.size}</span> bài tập đã chọn? Hành động này không thể hoàn tác.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmBatchDelete}
                                disabled={deleting}
                                className="w-full h-[52px] bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deleting ? <Loader2 size={18} className="w-5 h-5 animate-spin" /> : <Trash2 size={18} className="w-5 h-5" />}
                                {deleting ? 'Đang xóa...' : 'Xóa bài tập'}
                            </button>
                            <button
                                onClick={() => setShowDeleteDialog(false)}
                                disabled={deleting}
                                className="w-full h-[52px] bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-2xl font-bold text-sm transition-all hover:bg-gray-200 dark:hover:bg-zinc-700 active:scale-95 disabled:opacity-50"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </LecturerLayout>
    );
};

export default LecturerAssignmentPage;

