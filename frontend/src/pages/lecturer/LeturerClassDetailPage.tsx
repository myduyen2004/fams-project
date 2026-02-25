import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { lecturerClassService, ClassDetailResponse } from '../../services/api/LecturerClass';
import { assignmentService, AssignmentDTO, AssignmentSubmissionDTO } from '../../services/api/assignmentService';
import { timetableService, TimetableSlotDTO } from '../../services/api/timetableService';
import { uploadFile } from '../../services/utils/fileUploadService';

import { Pagination } from '../../components/common/Pagination';
import { Users, BookOpen, GraduationCap, Calendar, Clock, ArrowLeft, FileText, ChevronDown, ChevronUp, ExternalLink, Lock, Loader2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const LeturerClassDetailPage: React.FC = () => {
    const { className } = useParams<{ className: string }>();
    const navigate = useNavigate();
    const [detail, setDetail] = useState<ClassDetailResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [pagination, setPagination] = useState({
        page: 0,
        size: 10,
    });
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Assignment section state
    const [showAssignments, setShowAssignments] = useState(false);
    const [slots, setSlots] = useState<TimetableSlotDTO[]>([]);
    const [assignments, setAssignments] = useState<AssignmentDTO[]>([]);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [assignmentPage, setAssignmentPage] = useState(0);
    const ASSIGNMENT_PAGE_SIZE = 10;
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [submissions, setSubmissions] = useState<Record<number, AssignmentSubmissionDTO[]>>({});
    const [loadingSubmissions, setLoadingSubmissions] = useState<number | null>(null);


    // Create dialog state
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

    const resetCreateForm = () => {
        setNewTitle('');
        setNewDescription('');
        setNewDueDate('');
        setNewRefUrl('');
        setNewRefName('');
        setSelectedFile(null);
        setCreateForSlotId(null);
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


    useEffect(() => {
        if (className) {
            fetchDetail();
        }
    }, [className]);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const data = await lecturerClassService.getClassDetail(className!);
            setDetail(data);
        } catch (error) {
            console.error("Failed to fetch class detail", error);
        } finally {
            setLoading(false);
        }
    };


    const maskValue = (value: string | undefined, visibleChars: number = 2) => {
        if (!value) return '';
        if (value.length <= visibleChars * 2) return value;
        return value.substring(0, visibleChars) + '****' + value.substring(value.length - visibleChars);
    };

    // Fetch assignment data for this class
    const fetchAssignmentData = useCallback(async () => {
        if (!className) return;
        setLoadingAssignments(true);
        try {
            const [slotsData, assignmentsData] = await Promise.all([
                timetableService.getTimetableByClass(className).catch(() => [] as TimetableSlotDTO[]),
                assignmentService.getAssignmentsByClass(className).catch(() => [] as AssignmentDTO[])
            ]);
            setSlots(slotsData);
            setAssignments(assignmentsData);
        } catch (err) {
            console.error('Failed to fetch assignment data', err);
        } finally {
            setLoadingAssignments(false);
        }
    }, [className]);

    const handleToggleAssignments = () => {
        if (!showAssignments) {
            fetchAssignmentData();
        }
        setShowAssignments(!showAssignments);
    };

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



    const handleCreate = async () => {
        if (!newTitle.trim() || !className) {
            toast.error('Vui lòng nhập tiêu đề bài tập');
            return;
        }
        if (newDueDate) {
            if (new Date(newDueDate) < new Date()) {
                toast.error('Hạn nộp bài phải sau thời điểm hiện tại');
                return;
            }
        }
        try {
            setCreating(true);
            await assignmentService.createAssignment({
                className: className,
                timetableSlotId: createForSlotId || undefined,
                title: newTitle.trim(),
                description: newDescription.trim() || undefined,
                dueDate: newDueDate || undefined,
                referenceUrl: newRefUrl.trim() || undefined,
                referenceName: newRefName.trim() || undefined
            });
            toast.success('Đã tạo bài tập');
            setShowCreateDialog(false);
            resetCreateForm();
            fetchAssignmentData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể tạo bài tập');
        } finally {
            setCreating(false);
        }
    };

    const handleOpenCreateDialog = (slotId: number) => {
        setCreateForSlotId(slotId);
        setShowCreateDialog(true);
    };

    const handleCloseAssignment = async (assignmentId: number) => {
        try {
            await assignmentService.closeAssignment(assignmentId);
            toast.success('Đã đóng bài tập');
            fetchAssignmentData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể đóng bài tập');
        }
    };

    const formatSlotDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Render note text with clickable links
    const renderNoteWithLinks = (text?: string) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/;
        const parts = text.split(urlRegex);
        return parts.filter(Boolean).map((part, i) => {
            if (urlRegex.test(part)) {
                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-fpt-orange hover:underline break-all">{part}</a>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    // Build merged slot-assignment rows
    const assignmentBySlotId = new Map<number, AssignmentDTO>();
    assignments.forEach(a => {
        if (a.timetableSlotId) assignmentBySlotId.set(a.timetableSlotId, a);
    });
    const slotRows = slots.map(slot => ({
        slot,
        assignment: assignmentBySlotId.get(slot.id) || null
    }));
    const totalAssignmentPages = Math.ceil(slotRows.length / ASSIGNMENT_PAGE_SIZE);
    const paginatedSlotRows = slotRows.slice(assignmentPage * ASSIGNMENT_PAGE_SIZE, (assignmentPage + 1) * ASSIGNMENT_PAGE_SIZE);

    // Filter enrollments based on search query
    const filteredEnrollments = detail?.enrollments.filter(student =>
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // Pagination for the filtered enrollments list
    const currentEnrollments = filteredEnrollments.slice(
        pagination.page * pagination.size,
        (pagination.page + 1) * pagination.size
    );

    const totalPages = Math.ceil(filteredEnrollments.length / pagination.size);

    return (
        <LecturerLayout pageTitle="Chi tiết lớp học">
            <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Top Navigation & Breadcrumbs */}
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate('/lecturer/classes')}
                        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-fpt-orange transition-colors w-fit group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Quay lại danh sách lớp học
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-orange-100 text-fpt-orange text-xs font-bold rounded-full uppercase tracking-wider">
                                    {detail?.status || '...'}
                                </span>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-600 dark:text-gray-400 font-medium">{detail?.semesterName}</span>
                            </div>
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                                {detail?.className || className}
                            </h1>

                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 rounded-2xl font-bold border-2 border-gray-100 transition-all shadow-sm">
                                Quản lý điểm số
                            </button>
                            <button className="flex items-center gap-2 px-6 py-3 bg-fpt-orange text-white rounded-2xl font-bold active:translate-y-0">
                                Phần trăm điểm danh
                            </button>
                            <button
                                onClick={handleToggleAssignments}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold border-2 transition-all shadow-sm ${showAssignments
                                    ? 'bg-fpt-orange text-white border-fpt-orange'
                                    : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 border-gray-100 hover:border-fpt-orange/30 hover:text-fpt-orange'
                                    }`}
                            >
                                <FileText size={18} />
                                Bài tập
                            </button>
                        </div>
                    </div>
                </div>

                {/* Class Info Card */}
                <div className="bg-[#fff9f5] dark:bg-zinc-900/50 p-10 rounded-[40px] border border-orange-100/50 dark:border-zinc-800/50 relative overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
                        {[
                            { label: 'Mã lớp', value: detail?.className, icon: <BookOpen className="text-fpt-orange" size={22} /> },
                            { label: 'Chuyên ngành', value: detail?.majorName, icon: <GraduationCap className="text-fpt-orange" size={22} /> },
                            { label: 'Khoá học', value: detail?.courseYear, icon: <Calendar className="text-fpt-orange" size={22} /> },
                            { label: 'Thành viên', value: `${detail?.studentCount} Sinh viên`, icon: <Users className="text-fpt-orange" size={22} /> },
                            { label: 'Niên khoá', value: detail?.academicYear, icon: <Clock className="text-fpt-orange" size={22} /> }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4 group/item transition-all hover:translate-x-1">
                                <div className="p-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-orange-50 dark:border-zinc-700 group-hover/item:border-fpt-orange/30 transition-colors">
                                    {item.icon}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                                        {item.label}
                                    </span>
                                    <span className="text-lg font-medium text-gray-900 dark:text-white leading-tight">
                                        {item.value || '---'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Assignment Table Section (toggled) */}
                {showAssignments && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white px-2">Bài tập lớp {className}</h2>
                        {loadingAssignments ? (
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-12 text-center">
                                <Loader2 size={32} className="animate-spin mx-auto text-fpt-orange mb-4" />
                                <p className="text-gray-500">Đang tải dữ liệu...</p>
                            </div>
                        ) : slotRows.length === 0 ? (
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-12 text-center">
                                <FileText size={48} className="mx-auto text-gray-300 dark:text-zinc-600 mb-4" />
                                <p className="text-gray-500 dark:text-zinc-400">Chưa có buổi học nào</p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-700">
                                                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-zinc-300">Ngày</th>
                                                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-zinc-300">Slot</th>
                                                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-zinc-300">Phòng</th>
                                                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-zinc-300">Bài tập</th>
                                                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-zinc-300">Trạng thái</th>
                                                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-zinc-300">Nộp</th>
                                                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-zinc-300">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                            {paginatedSlotRows.map(({ slot, assignment }) => (
                                                <React.Fragment key={slot.id}>
                                                    <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
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
                                                                        <button onClick={() => toggleExpand(assignment.id)}
                                                                            className="inline-flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-lg text-xs transition-colors">
                                                                            <Users className="w-3.5 h-3.5" />
                                                                            {expandedId === assignment.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                        </button>
                                                                        {assignment.status === 'OPEN' && (
                                                                            <button onClick={() => handleCloseAssignment(assignment.id)}
                                                                                className="inline-flex items-center gap-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs transition-colors">
                                                                                <Lock className="w-3.5 h-3.5" /> Đóng
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <button onClick={() => handleOpenCreateDialog(slot.id)}
                                                                        className="inline-flex items-center gap-1 px-2 py-1.5 bg-fpt-orange/10 hover:bg-fpt-orange/20 text-fpt-orange rounded-lg text-xs transition-colors font-medium">
                                                                        <Plus className="w-3.5 h-3.5" /> Tạo bài tập
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {assignment && expandedId === assignment.id && (
                                                        <tr>
                                                            <td colSpan={7} className="bg-gray-50 dark:bg-zinc-950 px-4 py-4">
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
                                                                                        {sub.fileNames && sub.fileNames.length > 0
                                                                                            ? sub.fileNames.join(', ')
                                                                                            : 'Không có file'} • Nộp lúc {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN') : '—'}
                                                                                    </div>
                                                                                    {sub.note && <div className="text-xs text-gray-400 mt-0.5">Ghi chú: {renderNoteWithLinks(sub.note)}</div>}
                                                                                </div>
                                                                                {sub.fileUrls && sub.fileUrls.length > 0 && (
                                                                                    <div className="flex flex-col gap-1">
                                                                                        {sub.fileUrls.map((url, idx) => (
                                                                                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 text-fpt-orange rounded-lg text-xs transition-colors">
                                                                                                <ExternalLink className="w-3 h-3" />
                                                                                                {sub.fileNames?.[idx] || `File ${idx + 1}`}
                                                                                            </a>
                                                                                        ))}
                                                                                    </div>
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
                                        currentPage={assignmentPage}
                                        totalPages={totalAssignmentPages}
                                        totalElements={slotRows.length}
                                        pageSize={ASSIGNMENT_PAGE_SIZE}
                                        onPageChange={setAssignmentPage}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Student Table Section */}
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end px-2 gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Danh sách sinh viên</h2>
                            <p className="text-gray-500 font-medium mt-1">Tổng số {detail?.enrollments.length || 0} sinh viên chính thức</p>
                        </div>
                        <div className="relative w-full sm:w-80">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPagination(p => ({ ...p, page: 0 }));
                                }}
                                placeholder="Tìm kiếm sinh viên..."
                                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm font-medium transition-all shadow-sm  outline-none"
                            />
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-[40px] border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/10 dark:shadow-none overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-fpt-orange text-white">
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-lg w-24 text-center">No.</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Sinh viên</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Liên hệ</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Chuyên ngành</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg w-20"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                                    {loading ? (
                                        [...Array(5)].map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={5} className="px-8 py-8 bg-gray-50/50 dark:bg-zinc-800/30"></td>
                                            </tr>
                                        ))
                                    ) : currentEnrollments.length > 0 ? (
                                        currentEnrollments.map((student: any, index: number) => (
                                            <tr key={student.studentCode} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-4 py-4 text-center text-sm text-gray-500 dark:text-zinc-400">
                                                    {(pagination.page * pagination.size + index + 1).toString().padStart(2, '0')}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-fpt-orange text-lg font-bold overflow-hidden">
                                                                {student.studentName.charAt(0)}
                                                            </div>
                                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full shadow-sm"></div>
                                                        </div>
                                                        <div>
                                                            <div className="text-base font-semibold text-gray-900 dark:text-white">{student.studentName}</div>
                                                            <div className="text-sm text-gray-500 dark:text-zinc-500 font-mono ">{student.studentCode}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col text-sm space-y-1.5">
                                                        <div className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400 font-bold">@</div>
                                                            {student.email}
                                                        </div>
                                                        <div className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                                                <Clock size={14} />
                                                            </div>
                                                            {maskValue(student.phone, 3)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-base font-semibold text-gray-500 dark:text-zinc-400">
                                                            {student.majorName}
                                                        </span>
                                                    </div>
                                                </td>

                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-24 text-center">
                                                <div className="flex flex-col items-center gap-6">
                                                    <div className="w-24 h-24 rounded-[32px] bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center">
                                                        <Users size={48} className="text-gray-200 dark:text-zinc-700" />
                                                    </div>
                                                    <p className="text-2xl font-bold text-gray-400 dark:text-zinc-600">Không có dữ liệu sinh viên.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Simplified Pagination */}
                        {totalPages > 1 && (
                            <div className="ml-10 mr-10 mb-10 flex items-center justify-between mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800 text-sm text-gray-500">
                                <div>
                                    Hiển thị <span className="font-medium text-gray-900 dark:text-white">
                                        {filteredEnrollments.length > 0 ? pagination.page * pagination.size + 1 : 0}
                                    </span> đến{' '}
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {Math.min((pagination.page + 1) * pagination.size, filteredEnrollments.length)}
                                    </span> trong số{' '}
                                    <span className="font-medium text-gray-900 dark:text-white">{filteredEnrollments.length}</span> sinh viên
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPagination(p => ({ ...p, page: Math.max(0, p.page - 1) }))}
                                        disabled={pagination.page === 0}
                                        className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
                                    >
                                        Trước
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPagination(p => ({ ...p, page: i }))}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-colors ${pagination.page === i
                                                ? 'bg-fpt-orange text-white'
                                                : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPagination(p => ({ ...p, page: Math.min(totalPages - 1, p.page + 1) }))}
                                        disabled={pagination.page >= totalPages - 1}
                                        className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* Create Assignment Dialog */}
            {
                showCreateDialog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-fpt-orange" /> Tạo bài tập mới
                                </h2>
                                <button onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                        Tiêu đề <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="VD: Bài tập tuần 3"
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Mô tả</label>
                                    <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Mô tả chi tiết bài tập..." rows={3}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange outline-none resize-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                        <Clock className="w-3.5 h-3.5 inline mr-1" /> Hạn nộp bài
                                    </label>
                                    <input type="datetime-local" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange outline-none" />
                                </div>
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
                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-zinc-800">
                                <button onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-800 transition-colors">
                                    Hủy
                                </button>
                                <button onClick={handleCreate} disabled={creating || !newTitle.trim() || uploadingFile}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-fpt-orange hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                    {creating ? <><Loader2 size={16} className="animate-spin" /> Đang tạo...</> : <><Plus className="w-4 h-4" /> Tạo bài tập</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </LecturerLayout >
    );
};
