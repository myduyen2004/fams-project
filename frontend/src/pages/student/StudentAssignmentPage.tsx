import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FileText, Upload, CheckCircle, AlertCircle, XCircle, ExternalLink, Search, Trash2, RotateCcw, Paperclip } from 'lucide-react';
import { assignmentService, AssignmentSubmissionDTO, SubmitAssignmentRequest } from '../../services/api/assignmentService';
import { uploadFile } from '../../services/utils/fileUploadService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import { StudentLayout } from '../../layouts/StudentLayout';
import { Pagination } from '../../components/common/Pagination';
import toast from 'react-hot-toast';

type StatusFilter = 'ALL' | 'NOT_SUBMITTED' | 'SUBMITTED' | 'OVERDUE';
const PAGE_SIZE = 10;

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

    const filteredAssignments = assignments.filter(a => {
        const matchSearch =
            a.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.assignmentTitle.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
        const matchClass = classFilter === 'ALL' || a.className === classFilter;
        return matchSearch && matchStatus && matchClass;
    });

    // Pagination
    const totalPages = Math.ceil(filteredAssignments.length / PAGE_SIZE);
    const paginatedAssignments = useMemo(() => {
        const start = currentPage * PAGE_SIZE;
        return filteredAssignments.slice(start, start + PAGE_SIZE);
    }, [filteredAssignments, currentPage]);

    // Reset page when filters change
    useEffect(() => { setCurrentPage(0); }, [searchTerm, statusFilter, classFilter]);

    const isBeforeDeadline = (dueDate?: string) => {
        if (!dueDate) return true;
        return new Date(dueDate) > new Date();
    };


    const openUploadDialog = (assignmentId: number) => {
        setSelectedAssignmentId(assignmentId);
        setSelectedFiles([]);
        setNote('');
        setShowUploadDialog(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
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
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SUBMITTED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3" /> Đã nộp
                    </span>
                );
            case 'NOT_SUBMITTED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <AlertCircle className="w-3 h-3" /> Chưa nộp
                    </span>
                );
            case 'OVERDUE':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle className="w-3 h-3" /> Quá hạn nộp
                    </span>
                );
            default:
                return null;
        }
    };

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const stats = {
        total: assignments.length,
        submitted: assignments.filter(a => a.status === 'SUBMITTED').length,
        pending: assignments.filter(a => a.status === 'NOT_SUBMITTED').length,
        overdue: assignments.filter(a => a.status === 'OVERDUE').length
    };

    return (
        <StudentLayout pageTitle="Bài tập">
            <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm">
                        <div className="text-2xl font-bold text-gray-800 dark:text-zinc-200">{stats.total}</div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Tổng bài tập</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm">
                        <div className="text-2xl font-bold text-gray-800 dark:text-zinc-200">{stats.submitted}</div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Đã nộp</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm">
                        <div className="text-2xl font-bold text-gray-800 dark:text-zinc-200">{stats.pending}</div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Chưa nộp</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm">
                        <div className="text-2xl font-bold text-gray-800 dark:text-zinc-200">{stats.overdue}</div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Quá hạn nộp</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="relative md:max-w-xs flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm bài tập..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={classFilter}
                                onChange={e => setClassFilter(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none appearance-none pr-8 bg-no-repeat bg-[length:16px] bg-[right_8px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')]"
                            >
                                <option value="ALL">Tất cả lớp</option>
                                {enrolledClasses.map(cls => (
                                    <option key={cls} value={cls}>{cls}</option>
                                ))}
                            </select>
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none appearance-none pr-8 bg-no-repeat bg-[length:16px] bg-[right_8px_center] bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')]"
                            >
                                <option value="ALL">Tất cả trạng thái</option>
                                <option value="NOT_SUBMITTED">Chưa nộp</option>
                                <option value="SUBMITTED">Đã nộp</option>
                                <option value="OVERDUE">Quá hạn nộp</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Assignment Table */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full" />
                        </div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className="text-center py-20">
                            <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-zinc-600 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-500 dark:text-zinc-400">
                                {assignments.length === 0 ? 'Chưa có bài tập nào' : 'Không tìm thấy bài tập phù hợp'}
                            </h3>
                            <p className="text-gray-400 dark:text-zinc-500 mt-1">
                                {assignments.length === 0
                                    ? 'Giảng viên chưa tạo bài tập cho bạn'
                                    : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="w-full">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-orange-500 dark:bg-orange-600">
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider whitespace-nowrap">Tên bài</th>
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider whitespace-nowrap">Lớp</th>
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider whitespace-nowrap">Hạn nộp</th>
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider whitespace-nowrap">Trạng thái</th>
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">File bài tập</th>
                                            <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">File nộp</th>
                                            <th className="text-center px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider whitespace-nowrap">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {paginatedAssignments.map((assignment) => (
                                            <tr
                                                key={`${assignment.assignmentId}-${assignment.studentCode}`}
                                                className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/student/assignments/${assignment.assignmentId}`)}
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div
                                                        className="font-medium text-gray-900 dark:text-white"
                                                        title={assignment.assignmentTitle}
                                                    >
                                                        {assignment.assignmentTitle}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                                                    {assignment.className}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-zinc-400 whitespace-nowrap text-xs">
                                                    {assignment.assignmentDueDate ? formatDateTime(assignment.assignmentDueDate) : '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {getStatusBadge(assignment.status)}
                                                </td>
                                                <td className="px-4 py-3 max-w-[200px] break-words">
                                                    {assignment.referenceUrl ? (
                                                        <a
                                                            href={getViewableFileUrl(assignment.referenceUrl)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-fpt-orange hover:text-orange-600 text-xs transition-colors break-all"
                                                        >
                                                            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                                                            <span>{assignment.referenceName || 'Tài liệu'}</span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-300 dark:text-zinc-600">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 max-w-[200px] break-words">
                                                    {assignment.fileUrls && assignment.fileUrls.length > 0 ? (
                                                        <div className="flex flex-col gap-1">
                                                            {assignment.fileUrls.map((url, idx) => (
                                                                <a
                                                                    key={idx}
                                                                    href={getViewableFileUrl(url)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-fpt-orange hover:text-orange-600 text-xs transition-colors break-all"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                                                    <span>{assignment.fileNames?.[idx] || `File ${idx + 1}`}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 dark:text-zinc-600">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {assignment.status === 'NOT_SUBMITTED' ? (
                                                            <button
                                                                onClick={() => openUploadDialog(assignment.assignmentId)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                                                            >
                                                                <Upload className="w-3.5 h-3.5" /> Nộp bài
                                                            </button>
                                                        ) : assignment.status === 'SUBMITTED' ? (
                                                            <>
                                                                {isBeforeDeadline(assignment.assignmentDueDate) && (
                                                                    <button
                                                                        onClick={() => openUploadDialog(assignment.assignmentId)}
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-lg text-xs font-medium transition-colors"
                                                                    >
                                                                        <RotateCcw className="w-3.5 h-3.5" /> Nộp lại
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 dark:text-zinc-600">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 pb-4">
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
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-zinc-800">
                            <div className="p-6">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-orange-500" />
                                    Nộp bài tập
                                </h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                            File bài tập
                                        </label>

                                        <div
                                            className="w-full border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                                                Click để tải lên
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                                                PDF, Word, Excel, Image (Max 10MB/file)
                                            </p>
                                        </div>

                                        {selectedFiles.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {selectedFiles.map((file, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                                            <div className="w-7 h-7 rounded bg-white dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                                                <FileText className="w-3.5 h-3.5 text-orange-500" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                    {file.name}
                                                                </p>
                                                                <p className="text-xs text-gray-500 dark:text-zinc-400">
                                                                    {file.size < 1024 * 1024
                                                                        ? `${(file.size / 1024).toFixed(1)} KB`
                                                                        : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeFile(idx)}
                                                            className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded transition-colors text-gray-500 hover:text-red-500"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
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

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                            Ghi chú
                                        </label>
                                        <textarea
                                            value={note}
                                            onChange={e => setNote(e.target.value)}
                                            placeholder="Ghi chú thêm hoặc dán link (không bắt buộc)"
                                            rows={3}
                                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-zinc-800">
                                <button
                                    onClick={() => setShowUploadDialog(false)}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting !== null || (selectedFiles.length === 0 && !note?.trim())}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                                >
                                    {submitting !== null ? (
                                        <>
                                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                            Đang nộp...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" /> Nộp bài
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
