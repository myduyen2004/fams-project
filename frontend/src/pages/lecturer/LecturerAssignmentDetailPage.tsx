import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { assignmentService, AssignmentDTO, AssignmentSubmissionDTO } from '../../services/api/assignmentService';
import { timetableService, TimetableSlotDTO } from '../../services/api/timetableService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import { Pagination } from '../../components/common/Pagination';
import {
    ArrowLeft, Clock, ExternalLink, Search, Loader2, BookOpen, Lock, X, Download
} from 'lucide-react';
import toast from 'react-hot-toast';

const PAGE_SIZE = 30;

export const LecturerAssignmentDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const assignmentId = Number(id);

    const [assignment, setAssignment] = useState<AssignmentDTO | null>(null);
    const [submissions, setSubmissions] = useState<AssignmentSubmissionDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [commentSubmission, setCommentSubmission] = useState<AssignmentSubmissionDTO | null>(null);
    const [commentDraft, setCommentDraft] = useState('');
    const [savingComment, setSavingComment] = useState(false);
    const [closingAssignment, setClosingAssignment] = useState(false);
    const [downloadingZip, setDownloadingZip] = useState(false);
    const [slotInfo, setSlotInfo] = useState<TimetableSlotDTO | null>(null);

    useEffect(() => {
        if (!assignmentId || isNaN(assignmentId)) return;
        fetchData();
    }, [assignmentId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const subsData = await assignmentService.getAllSubmissionStatus(assignmentId);
            setSubmissions(subsData);

            if (subsData.length > 0) {
                const first = subsData[0];
                const classAssignments = await assignmentService.getAssignmentsByClass(first.className);
                const found = classAssignments.find(a => a.id === assignmentId);
                if (found) {
                    setAssignment(found);
                    // Fetch slot info
                    if (found.timetableSlotId) {
                        try {
                            const slots = await timetableService.getTimetableByClass(found.className);
                            const slot = slots.find(s => s.id === found.timetableSlotId);
                            if (slot) setSlotInfo(slot);
                        } catch { /* slot info is optional */ }
                    }
                }
            }
        } catch (err: any) {
            toast.error('Không thể tải dữ liệu bài tập');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const renderNoteWithLinks = (text?: string) => {
        if (!text) return '—';
        const urlRegex = /(https?:\/\/[^\s]+)/;
        const parts = text.split(urlRegex);
        return parts.filter(Boolean).map((part, i) => {
            if (urlRegex.test(part)) {
                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-fpt-orange hover:underline break-all">{part}</a>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    const openCommentDialog = (sub: AssignmentSubmissionDTO) => {
        setCommentSubmission(sub);
        setCommentDraft(sub.lecturerComment || '');
    };

    const handleSaveComment = async () => {
        if (!commentSubmission?.id) return;
        setSavingComment(true);
        try {
            const updated = await assignmentService.updateLecturerComment(commentSubmission.id, commentDraft);
            setSubmissions(prev => prev.map(s => s.id === commentSubmission.id ? { ...s, lecturerComment: updated.lecturerComment } : s));
            setCommentSubmission(null);
            setCommentDraft('');
            toast.success('Đã lưu nhận xét');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể lưu nhận xét');
        } finally {
            setSavingComment(false);
        }
    };

    const handleCloseAssignment = async () => {
        if (!assignment) return;
        try {
            setClosingAssignment(true);
            await assignmentService.closeAssignment(assignment.id);
            toast.success('Đã đóng bài tập');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể đóng bài tập');
        } finally {
            setClosingAssignment(false);
        }
    };

    const handleDownloadAll = async () => {
        if (!assignment) return;
        try {
            setDownloadingZip(true);
            const resp = await assignmentService.downloadAllSubmissions(assignmentId);
            const url = window.URL.createObjectURL(new Blob([resp.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${assignment.className}_${assignment.title}_submissions.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Đã tải bài nộp thành công');
        } catch (err: any) {
            let msg = 'Không thể tải bài nộp';
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const json = JSON.parse(text);
                    msg = json.message || json.error || msg;
                } catch { /* ignore parse error */ }
            } else if (err.response?.data?.message) {
                msg = err.response.data.message;
            }
            toast.error(msg);
        } finally {
            setDownloadingZip(false);
        }
    };

    // Stats
    const totalStudents = submissions.length;
    const submittedCount = submissions.filter(s => s.status === 'SUBMITTED').length;
    const notSubmittedCount = submissions.filter(s => s.status === 'NOT_SUBMITTED').length;

    // Filter
    const filteredSubmissions = useMemo(() => {
        if (!searchTerm) return submissions;
        const term = searchTerm.toLowerCase();
        return submissions.filter(s =>
            (s.studentCode || '').toLowerCase().includes(term) ||
            (s.studentName || '').toLowerCase().includes(term)
        );
    }, [submissions, searchTerm]);

    // Pagination
    const totalPages = Math.ceil(filteredSubmissions.length / PAGE_SIZE);
    const paginatedSubmissions = filteredSubmissions.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    useEffect(() => {
        setCurrentPage(0);
    }, [searchTerm]);

    if (loading) {
        return (
            <LecturerLayout pageTitle="Chi tiết bài tập">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 size={32} className="animate-spin text-fpt-orange" />
                </div>
            </LecturerLayout>
        );
    }

    return (
        <LecturerLayout pageTitle="Chi tiết bài tập">
            <div className="mt-4 ml-10 mr-10 space-y-3">

                {/* Top bar: Back + Close */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/lecturer/assignments')}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-zinc-400 hover:text-fpt-orange transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại danh sách bài tập
                    </button>
                    <div className="flex items-center gap-2">
                        {submittedCount > 0 && (
                            <button
                                onClick={handleDownloadAll}
                                disabled={downloadingZip}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {downloadingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                {downloadingZip ? 'Đang tải...' : 'Tải bài nộp'}
                            </button>
                        )}
                        {assignment?.status === 'OPEN' && (
                            <button
                                onClick={handleCloseAssignment}
                                disabled={closingAssignment}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                <Lock className="w-4 h-4" />
                                {closingAssignment ? 'Đang đóng...' : 'Đóng bài tập'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Assignment Header Card */}
                {assignment && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        {/* Title bar */}
                        <div className="bg-orange-500 dark:bg-orange-600 px-5 py-2">
                            <h2 className="text-base font-bold text-white">{assignment.title}</h2>
                            {assignment.description && (
                                <p className="text-orange-100 text-xs mt-0.5">{assignment.description}</p>
                            )}
                        </div>

                        {/* Info row with dividers */}
                        <div className="px-5 py-2.5 grid grid-cols-3 md:grid-cols-6 divide-x divide-gray-200 dark:divide-zinc-700 text-sm">
                            <div className="flex items-center gap-2 px-2 justify-center">
                                <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Lớp</span>
                                <span className="font-semibold text-gray-900 dark:text-white text-sm">{assignment.className}</span>
                            </div>
                            {slotInfo?.date && (
                                <div className="flex items-center gap-2 px-2 justify-center">
                                    <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider text-nowrap">Ngày học</span>
                                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                        {new Date(slotInfo.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </span>
                                </div>
                            )}
                            {slotInfo?.slotNumber && (
                                <div className="flex items-center gap-2 px-2 justify-center">
                                    <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Slot</span>
                                    <span className="font-semibold text-gray-900 dark:text-white text-sm">Slot {slotInfo.slotNumber}</span>
                                </div>
                            )}
                            {(slotInfo?.roomCode || slotInfo?.roomName) && (
                                <div className="flex items-center gap-2 px-2 justify-center">
                                    <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Phòng</span>
                                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{slotInfo.roomCode || slotInfo.roomName}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 px-2 justify-center">
                                <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider text-nowrap">Hạn nộp</span>
                                <span className="font-semibold text-gray-900 dark:text-white text-sm inline-flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    {formatDateTime(assignment.dueDate)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-2 justify-center">
                                <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Trạng thái</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${assignment.status === 'OPEN'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400'
                                    }`}>
                                    {assignment.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                                </span>
                            </div>
                        </div>
                        {assignment.referenceUrl && (
                            <div className="px-5 pb-2.5 -mt-0.5">
                                <a href={getViewableFileUrl(assignment.referenceUrl)} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-fpt-orange hover:text-orange-600 transition-colors">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    {assignment.referenceName || 'Tài liệu tham khảo'}
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 px-4 py-2 shadow-sm flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-zinc-400">Tổng sinh viên</span>
                        <span className="text-base font-bold text-gray-900 dark:text-white">{totalStudents}</span>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 px-4 py-2 shadow-sm flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-zinc-400">Đã nộp</span>
                        <span className="text-base font-bold text-gray-900 dark:text-white">
                            {submittedCount}
                            <span className="text-[11px] font-normal text-gray-400 ml-1">
                                ({totalStudents > 0 ? Math.round(submittedCount / totalStudents * 100) : 0}%)
                            </span>
                        </span>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 px-4 py-2 shadow-sm flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-zinc-400">Chưa nộp</span>
                        <span className="text-base font-bold text-gray-900 dark:text-white">
                            {notSubmittedCount}
                            <span className="text-[11px] font-normal text-gray-400 ml-1">
                                ({totalStudents > 0 ? Math.round(notSubmittedCount / totalStudents * 100) : 0}%)
                            </span>
                        </span>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo MSSV, họ tên..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange focus:border-transparent outline-none"
                    />
                </div>

                {/* Student Submission Table */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-orange-500 dark:bg-orange-600">
                                    <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider w-16">STT</th>
                                    <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">MSSV</th>
                                    <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Họ tên</th>
                                    <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Trạng thái</th>
                                    <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Thời gian nộp</th>
                                    <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">File</th>
                                    <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Nội dung</th>
                                    <th className="text-left px-4 py-3 font-semibold text-white text-xs uppercase tracking-wider">Nhận xét</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {paginatedSubmissions.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-gray-400 dark:text-zinc-500">
                                            {searchTerm ? 'Không tìm thấy sinh viên phù hợp' : 'Chưa có dữ liệu sinh viên'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedSubmissions.map((sub, index) => (
                                        <tr key={sub.studentCode || index} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-4 py-3 text-gray-500 dark:text-zinc-400">
                                                {currentPage * PAGE_SIZE + index + 1}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                {sub.studentCode || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 dark:text-zinc-300">
                                                {sub.studentName || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {sub.status === 'SUBMITTED' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        Đã nộp
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        Chưa nộp
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                                                {sub.submittedAt ? formatDateTime(sub.submittedAt) : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {sub.fileUrls && sub.fileUrls.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {sub.fileUrls.map((url, idx) => (
                                                            <a key={idx} href={getViewableFileUrl(url)} target="_blank" rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-fpt-orange hover:text-orange-600 text-xs transition-colors">
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                                {sub.fileNames?.[idx] || `File ${idx + 1}`}
                                                            </a>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-zinc-600">—</span>
                                                )}
                                            </td>
                                            {/* Nội dung (từ sinh viên) */}
                                            <td className="px-4 py-3 text-gray-500 dark:text-zinc-400 text-xs max-w-[200px]">
                                                {renderNoteWithLinks(sub.note)}
                                            </td>
                                            {/* Nhận xét */}
                                            <td className="px-4 py-3 max-w-[200px]">
                                                {sub.status === 'SUBMITTED' && sub.id ? (
                                                    <button
                                                        onClick={() => openCommentDialog(sub)}
                                                        className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 hover:text-fpt-orange transition-colors cursor-pointer"
                                                    >
                                                        {sub.lecturerComment || <span className="italic text-gray-300 dark:text-zinc-600">Nhấn để nhận xét</span>}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-zinc-500">
                                                        {sub.lecturerComment || '—'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 pb-4">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalElements={filteredSubmissions.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            </div>

            {/* Comment Dialog */}
            {commentSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between px-6 pt-5 pb-3">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Nhận xét bài làm</h3>
                            <button onClick={() => { setCommentSubmission(null); setCommentDraft(''); }}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="px-6 pb-2">
                            <div className="text-sm text-gray-500 dark:text-zinc-400 space-y-0.5">
                                <p><span className="font-medium text-gray-700 dark:text-zinc-300">{commentSubmission.studentCode}</span> — {commentSubmission.studentName}</p>
                                {commentSubmission.submittedAt && (
                                    <p className="text-xs">Nộp lúc: {formatDateTime(commentSubmission.submittedAt)}</p>
                                )}
                            </div>
                        </div>
                        <div className="px-6 pb-5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5 mt-3">Nhận xét</label>
                            <textarea
                                value={commentDraft}
                                onChange={e => setCommentDraft(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                                placeholder="Nhập nhận xét cho bài làm của sinh viên..."
                                autoFocus
                                disabled={savingComment}
                            />
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => { setCommentSubmission(null); setCommentDraft(''); }}
                                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                    Hủy
                                </button>
                                <button onClick={handleSaveComment} disabled={savingComment}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                    {savingComment ? 'Đang lưu...' : 'Lưu nhận xét'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </LecturerLayout>
    );
};

export default LecturerAssignmentDetailPage;
