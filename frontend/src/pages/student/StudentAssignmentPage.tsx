import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FileText, Upload, CheckCircle, AlertCircle, XCircle, ExternalLink, Search, Trash2, RotateCcw, X } from 'lucide-react';
import { assignmentService, AssignmentSubmissionDTO, SubmitAssignmentRequest } from '../../services/api/assignmentService';
import { uploadFile } from '../../services/utils/fileUploadService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import { StudentLayout } from '../../layouts/StudentLayout';
import { Pagination } from '../../components/common/Pagination';
import toast from "@utils/toast";
import { CustomSelect } from '../../components/common/CustomSelect';
import { Loader2 } from 'lucide-react';

type StatusFilter = 'ALL' | 'NOT_SUBMITTED' | 'SUBMITTED' | 'OVERDUE';
const PAGE_SIZE = 10;

const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const isBeforeDeadline = (dueDate?: string) => {
    if (!dueDate) return true;
    return new Date(dueDate) > new Date();
};

export const StudentAssignmentPage: React.FC = () => {
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState<AssignmentSubmissionDTO[]>([]);
    const [enrolledClasses, setEnrolledClasses] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [classFilter, setClassFilter] = useState<string>('ALL');
    const [submitting, setSubmitting] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(0);

    // Upload dialog state
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [note, setNote] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true);
            const data = await assignmentService.getMyAssignments();
            setAssignments(data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể tải danh sách bài tập');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAssignments();
        // Fetch all enrolled classes for the filter
        assignmentService.getEnrolledClasses()
            .then(classes => setEnrolledClasses(classes.sort()))
            .catch(() => { });
    }, [fetchAssignments]);

    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const matchSearch =
                a.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.assignmentTitle.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
            const matchClass = classFilter === 'ALL' || a.className === classFilter;
            return matchSearch && matchStatus && matchClass;
        });
    }, [assignments, searchTerm, statusFilter, classFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredAssignments.length / PAGE_SIZE);
    const paginatedAssignments = useMemo(() => {
        const start = currentPage * PAGE_SIZE;
        return filteredAssignments.slice(start, start + PAGE_SIZE);
    }, [filteredAssignments, currentPage]);




    const openUploadDialog = useCallback((assignmentId: number) => {
        setSelectedAssignmentId(assignmentId);
        setSelectedFiles([]);
        setNote('');
        setShowUploadDialog(true);
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newFiles: File[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > 10 * 1024 * 1024) {
                    toast.error(`File ${file.name} vượt quá 10MB`);
                    continue;
                }
                newFiles.push(file);
            }
            setSelectedFiles(prev => [...prev, ...newFiles]);
        }
        if (e.target) e.target.value = '';
    }, []);

    const removeFile = useCallback((index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!selectedAssignmentId || (selectedFiles.length === 0 && !note?.trim())) {
            toast.error('Vui lòng chọn file hoặc nhập ghi chú');
            return;
        }

        try {
            setSubmitting(selectedAssignmentId);

            const fileUrls: string[] = [];
            const fileNames: string[] = [];

            // Upload all selected files
            for (const file of selectedFiles) {
                try {
                    const uploadResult = await uploadFile(file);
                    fileUrls.push(uploadResult.url || uploadResult.secure_url);
                    fileNames.push(file.name);
                } catch (error) {
                    console.error('File upload failed:', error);
                    toast.error(`Không thể upload file ${file.name}. Vui lòng thử lại.`);
                    setSubmitting(null);
                    return;
                }
            }

            const request: SubmitAssignmentRequest = {
                assignmentId: selectedAssignmentId,
                fileUrls: fileUrls.length > 0 ? fileUrls : undefined,
                fileNames: fileNames.length > 0 ? fileNames : undefined,
                note: note || undefined
            };
            await assignmentService.submitAssignment(request);
            toast.success('Nộp bài thành công!');
            setShowUploadDialog(false);
            fetchAssignments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Nộp bài thất bại');
        } finally {
            setSubmitting(null);
        }
    }, [selectedAssignmentId, selectedFiles, note, fetchAssignments]);

    const getStatusBadge = useCallback((status: string) => {
        switch (status) {
            case 'SUBMITTED':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[10px] font-bold border border-green-200 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Đã nộp
                    </span>
                );
            case 'NOT_SUBMITTED':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-bold border border-orange-200 text-orange-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        Chưa nộp
                    </span>
                );
            case 'OVERDUE':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[10px] font-bold border border-red-200 text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Quá hạn
                    </span>
                );
            default:
                return null;
        }
    }, []);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(0);
    }, [searchTerm, statusFilter, classFilter]);

    const stats = useMemo(() => {
        return {
            total: assignments.length,
            submitted: assignments.filter(a => a.status === 'SUBMITTED').length,
            pending: assignments.filter(a => a.status === 'NOT_SUBMITTED').length,
            overdue: assignments.filter(a => a.status === 'OVERDUE').length
        };
    }, [assignments]);

    return (
        <StudentLayout pageTitle="Bài tập">
            <div className="space-y-6 pb-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            {/* <div className="w-2 h-8 bg-fpt-orange rounded-full" /> */}
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Danh sách Bài tập</h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium ml-5 flex items-center gap-2">
                            Theo dõi thời hạn và nộp bài tập cho các lớp học
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-gray-100 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Total</span>
                        </div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stats.total}</div>
                        <div className="text-xs text-gray-400 dark:text-zinc-500 mt-1 font-bold uppercase tracking-widest">Tổng bài tập</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-gray-100 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Done</span>
                        </div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stats.submitted}</div>
                        <div className="text-xs text-gray-400 dark:text-zinc-500 mt-1 font-bold uppercase tracking-widest">Đã nộp</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-gray-100 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-fpt-orange" />
                            </div>
                            <span className="text-[10px] font-black text-fpt-orange uppercase tracking-widest">Pending</span>
                        </div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stats.pending}</div>
                        <div className="text-xs text-gray-400 dark:text-zinc-500 mt-1 font-bold uppercase tracking-widest">Chưa nộp</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-gray-100 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                <XCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Late</span>
                        </div>
                        <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stats.overdue}</div>
                        <div className="text-xs text-gray-400 dark:text-zinc-500 mt-1 font-bold uppercase tracking-widest">Quá hạn nộp</div>
                    </div>
                </div>

                {/* Filters Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-8 shadow-sm animate-in fade-in duration-500">

                    <div className="flex flex-col md:flex-row items-end gap-6">
                        <div className="flex-1 w-full relative group">
                            <label className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 ml-1 block">Tìm kiếm</label>
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

                        <div className="flex-1 w-full">
                            <CustomSelect
                                label="Lớp học"
                                value={classFilter}
                                onChange={value => setClassFilter(value)}
                                options={[
                                    { value: 'ALL', label: 'Tất cả lớp' },
                                    ...enrolledClasses.map(cls => ({ value: cls, label: cls }))
                                ]}
                            />
                        </div>

                        <div className="flex-1 w-full">
                            <CustomSelect
                                label="Trạng thái"
                                value={statusFilter}
                                onChange={value => setStatusFilter(value as StatusFilter)}
                                options={[
                                    { value: 'ALL', label: 'Tất cả trạng thái' },
                                    { value: 'NOT_SUBMITTED', label: 'Chưa nộp' },
                                    { value: 'SUBMITTED', label: 'Đã nộp' },
                                    { value: 'OVERDUE', label: 'Quá hạn nộp' }
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Table Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl overflow-hidden animate-in fade-in duration-700">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                            <Loader2 className="w-10 h-10 animate-spin text-fpt-orange mb-4" />
                            <p className="text-sm font-bold uppercase tracking-widest">Đang tải dữ liệu...</p>
                        </div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className="text-center py-32 animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 rounded-3xl bg-orange-50 dark:bg-zinc-800/50 mx-auto mb-8 flex items-center justify-center">
                                <FileText className="w-12 h-12 text-fpt-orange" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                                {assignments.length === 0 ? 'Chưa có bài tập nào' : 'Không tìm thấy bài tập'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium max-w-md mx-auto">
                                {assignments.length === 0
                                    ? 'Giảng viên chưa tạo bài tập cho bạn trong kỳ học này'
                                    : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để tìm thấy bài tập bạn cần'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-fpt-orange">
                                            <th className="px-4 py-5 text-white text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap rounded-tl-2xl">Bài tập</th>
                                            <th className="px-4 py-5 text-white text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Lớp học</th>
                                            <th className="px-4 py-5 text-white text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Hạn nộp</th>
                                            <th className="px-4 py-5 text-white text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Trạng thái</th>
                                            <th className="px-4 py-5 text-white text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">File bài nộp</th>
                                            <th className="px-4 py-5 text-white text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap rounded-tr-2xl">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {paginatedAssignments.map((assignment) => (
                                            <tr
                                                key={`${assignment.assignmentId}-${assignment.studentCode}`}
                                                className="group hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-all cursor-pointer"
                                                onClick={() => navigate(`/student/assignments/${assignment.assignmentId}`)}
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="font-bold text-gray-700 dark:text-white text-base group-hover:text-fpt-orange transition-colors tracking-tight">
                                                        {assignment.assignmentTitle}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                                                        {assignment.className}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-sm font-medium text-gray-600 dark:text-zinc-400">
                                                        {assignment.assignmentDueDate ? formatDateTime(assignment.assignmentDueDate) : '—'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    {getStatusBadge(assignment.status)}
                                                </td>

                                                <td className="px-6 py-5">
                                                    {assignment.fileUrls && assignment.fileUrls.length > 0 ? (
                                                        <div className="flex flex-col gap-1.5">
                                                            {assignment.fileUrls.map((url, idx) => (
                                                                <a
                                                                    key={idx}
                                                                    href={getViewableFileUrl(url)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={e => e.stopPropagation()}
                                                                    className="inline-flex items-center gap-1.5 text-fpt-orange hover:text-orange-600 text-xs font-bold transition-colors"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                                                    <span className="truncate border-b border-fpt-orange/20 max-w-[180px]">{assignment.fileNames?.[idx] || `File ${idx + 1}`}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 dark:text-zinc-600 font-medium">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {assignment.status === 'NOT_SUBMITTED' ? (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openUploadDialog(assignment.assignmentId); }}
                                                                className="flex items-center gap-2 px-4 py-2 bg-fpt-orange hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                                                            >
                                                                <Upload className="w-3.5 h-3.5" /> Nộp bài
                                                            </button>
                                                        ) : assignment.status === 'SUBMITTED' ? (
                                                            <>
                                                                {isBeforeDeadline(assignment.assignmentDueDate) && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); openUploadDialog(assignment.assignmentId); }}
                                                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                                                    >
                                                                        <RotateCcw className="w-3.5 h-3.5" /> Nộp lại
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-8 py-8 border-t border-gray-50 dark:border-zinc-800/50 bg-gray-50/30">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalElements={filteredAssignments.length}
                                    pageSize={PAGE_SIZE}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Upload Dialog - rendered via Portal */}
                {showUploadDialog && createPortal(
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowUploadDialog(false)} />

                        <div className="relative bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
                            {/* Header */}
                            <div className="bg-white dark:bg-zinc-900 px-10 py-8 relative border-b border-gray-100 dark:border-zinc-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-2xl flex items-center justify-center text-fpt-orange">
                                        <Upload size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Nộp bài tập</h2>
                                        <p className="text-gray-500 dark:text-zinc-400 text-xs font-medium">Tải lên các tệp tin bài làm của bạn</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowUploadDialog(false)}
                                    className="absolute top-8 right-8 w-10 h-10 rounded-full bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-zinc-400 transition-all active:scale-90"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                {/* File Upload Area */}
                                <div className="space-y-3">
                                    <label className="block text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">
                                        Tệp tin bài làm <span className="text-fpt-orange">*</span>
                                    </label>

                                    <div
                                        className="relative group w-full border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-fpt-orange/50 hover:bg-orange-50/30 dark:hover:bg-orange-950/10 transition-all duration-300"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400 group-hover:text-fpt-orange group-hover:scale-110 transition-all duration-500 mb-4">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <p className="text-base font-bold text-gray-900 dark:text-white mb-1">
                                            Kéo thả hoặc nhấn để tải lên
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-zinc-500 font-medium">
                                            Hỗ trợ: PDF, Word, Excel, Hình ảnh (Tối đa 10MB/file)
                                        </p>
                                    </div>

                                    {selectedFiles.length > 0 && (
                                        <div className="grid grid-cols-1 gap-3 mt-4">
                                            {selectedFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm animate-in slide-in-from-top-2 duration-300">
                                                    <div className="flex items-center gap-4 overflow-hidden">
                                                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-fpt-orange flex-shrink-0">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                                {file.name}
                                                            </p>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                                                                {file.size < 1024 * 1024
                                                                    ? `${(file.size / 1024).toFixed(1)} KB`
                                                                    : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileChange}
                                        multiple
                                    />
                                </div>

                                {/* Note Area */}
                                <div className="space-y-3">
                                    <label className="block text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">
                                        Ghi chú nộp bài
                                    </label>
                                    <textarea
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                        placeholder="Ghi chú thêm thông tin hoặc link bài làm nếu cần..."
                                        rows={3}
                                        className="w-full p-5 rounded-3xl border-2 border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange/40 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-end gap-3 px-8 py-6 bg-gray-50/50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-800">
                                <button
                                    onClick={() => setShowUploadDialog(false)}
                                    className="px-8 h-[52px] text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-all active:scale-95"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting !== null || (selectedFiles.length === 0 && !note?.trim())}
                                    className="flex items-center gap-2 px-10 h-[52px] bg-fpt-orange text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] shadow-lg shadow-fpt-orange/20 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                                >
                                    {submitting !== null ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={18} /> Xác nhận nộp bài
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </StudentLayout>
    );
};

export default StudentAssignmentPage;


