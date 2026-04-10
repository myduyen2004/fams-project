import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { assignmentService, AssignmentDTO, AssignmentPlagiarismDTO, AssignmentSubmissionDTO } from '../../services/api/assignmentService';
import { timetableService, TimetableSlotDTO } from '../../services/api/timetableService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import { Pagination } from '../../components/common/Pagination';
import {
    ArrowLeft, Clock, ExternalLink, Search, Loader2, BookOpen, Lock, X, Download, MessageSquare, ShieldAlert, ScanSearch, Sparkles
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
    const [plagiarismSubmission, setPlagiarismSubmission] = useState<AssignmentSubmissionDTO | null>(null);
    const [plagiarismResult, setPlagiarismResult] = useState<AssignmentPlagiarismDTO | null>(null);
    const [checkingPlagiarismId, setCheckingPlagiarismId] = useState<number | null>(null);

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
            const blob = await assignmentService.downloadAllSubmissions(assignmentId);
            const url = window.URL.createObjectURL(blob);
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

    const handleCheckPlagiarism = async (submission: AssignmentSubmissionDTO) => {
        if (!submission.id) return;

        setPlagiarismSubmission(submission);
        setCheckingPlagiarismId(submission.id);
        setPlagiarismResult(null);

        try {
            const result = await assignmentService.checkSubmissionPlagiarism(assignmentId, submission.id);
            setPlagiarismResult(result);
        } catch (err: any) {
            setPlagiarismSubmission(null);
            setPlagiarismResult(null);
            toast.error(
                err?.response?.data?.message
                    ? `Không thể kiểm tra đạo văn trong toàn môn học: ${err.response.data.message}`
                    : 'Không thể kiểm tra đạo văn trong toàn môn học'
            );
        } finally {
            setCheckingPlagiarismId(null);
        }
    };

    const closePlagiarismDialog = () => {
        if (checkingPlagiarismId) return;
        setPlagiarismSubmission(null);
        setPlagiarismResult(null);
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

    const getPlagiarismTone = (percent?: number) => {
        const value = percent ?? 0;
        if (value >= 75) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        if (value >= 45) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    };

    useEffect(() => {
        setCurrentPage(0);
    }, [searchTerm]);

    if (loading) {
        return (
            <LecturerLayout pageTitle="Chi tiêt bài tâp">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 size={32} className="animate-spin text-fpt-orange" />
                </div>
            </LecturerLayout>
        );
    }

    return (
        <LecturerLayout pageTitle="Chi tiết bài tập">
            <div className="mt-4 ml-10 mr-10 space-y-6 mb-10">

                {/* Top bar: Back + Action Buttons */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/lecturer/assignments')}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-zinc-400 hover:text-fpt-orange transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại danh sách bài tập
                    </button>
                    <div className="flex items-center gap-3">
                        {submittedCount > 0 && (
                            <button
                                onClick={handleDownloadAll}
                                disabled={downloadingZip}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {downloadingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                {downloadingZip ? 'Đang tải...' : 'Tải bài nộp'}
                            </button>
                        )}
                        {assignment?.status === 'OPEN' && (
                            <button
                                onClick={handleCloseAssignment}
                                disabled={closingAssignment}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
                            >
                                <Lock className="w-4 h-4" />
                                {closingAssignment ? 'Đang đóng...' : 'Đóng bài tập'}
                            </button>
                        )}
                    </div>
                </div>

                {assignment && (
                    <>
                        {/* Top Header Card */}
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden p-6 sm:px-8 sm:py-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 dark:border-zinc-700">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center text-sm">

                                {/* Class & Subject */}
                                <div className="md:col-span-4">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">LỚP & BÀI TẬP</p>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${assignment.status === 'OPEN'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400'
                                            }`}>
                                            {assignment.status === 'OPEN' ? 'ĐANG MỞ' : 'ĐÃ ĐÓNG'}
                                        </span>
                                    </div>
                                    <h2 className="font-extrabold text-[#001D4A] dark:text-white leading-tight text-lg">
                                        {assignment.className} - {assignment.title}
                                    </h2>
                                    {assignment.description && (
                                        <p className="text-gray-500 dark:text-zinc-400 mt-1.5 text-xs line-clamp-2">
                                            {assignment.description}
                                        </p>
                                    )}
                                </div>

                                {/* Time */}
                                <div className="md:col-span-3">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">THỜI GIAN</p>
                                    <p className="font-medium text-[#001D4A] dark:text-gray-300">
                                        {slotInfo ? (
                                            <>
                                                {formatDateTime(slotInfo.date).split(' ')[0]} - {slotInfo.slotNumber && `Slot ${slotInfo.slotNumber}`}
                                            </>
                                        ) : (
                                            <span className="text-gray-400">Chưa xếp lịch</span>
                                        )}
                                    </p>
                                </div>

                                {/* Room */}
                                <div className="md:col-span-2">
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">PHÒNG HỌC</p>
                                    <p className="font-medium text-[#001D4A] dark:text-gray-300">
                                        {slotInfo?.roomName || slotInfo?.roomCode || <span className="text-gray-400">Chưa xếp phòng</span>}
                                    </p>
                                </div>

                                {/* Right Deadline Box */}
                                <div className="md:col-span-3 md:justify-self-end w-full md:w-auto">
                                    <div className="bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/30 px-4 py-3 inline-block w-full">
                                        <p className="text-[10px] font-bold text-fpt-orange uppercase tracking-widest mb-1.5">HẠN TRÓT NHẬN BÀI</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20">
                                                <Clock className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <p className="text-base font-bold text-[#001D4A] dark:text-white leading-none mb-1">
                                                    {formatDateTime(assignment.dueDate).split(' ')[1]}
                                                </p>
                                                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 leading-none">
                                                    {formatDateTime(assignment.dueDate).split(' ')[0]}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Middle Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Left Column - Materials */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6">
                                    <h3 className="text-base font-bold text-[#001D4A] dark:text-white mb-6 flex items-center gap-3">
                                        <div className="text-fpt-orange">
                                            <BookOpen className="fill-current w-5 h-5" />
                                        </div>
                                        Tài liệu học tập
                                    </h3>

                                    <div className="space-y-4">
                                        {(() => {
                                            const urls = assignment.referenceUrls?.length ? assignment.referenceUrls : (assignment.referenceUrl ? assignment.referenceUrl.split('|||') : []);
                                            const names = assignment.referenceNames?.length ? assignment.referenceNames : (assignment.referenceName ? assignment.referenceName.split('|||') : []);
                                            
                                            if (urls.length === 0) {
                                                return <p className="text-sm text-gray-400 px-2 italic">Không có tài liệu đính kèm.</p>;
                                            }

                                            return urls.map((url, idx) => (
                                                <a
                                                    key={idx}
                                                    href={getViewableFileUrl(url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group border border-transparent hover:border-gray-100 dark:hover:border-zinc-700"
                                                >
                                                    <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0 text-fpt-orange">
                                                        <BookOpen size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm text-[#001D4A] dark:text-white truncate group-hover:text-fpt-orange transition-colors">
                                                            {names[idx] || `Tài liệu ${idx + 1}`}
                                                        </p>
                                                        <p className="text-[11px] text-gray-400 mt-0.5">Mở tài liệu</p>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 group-hover:text-fpt-orange transition-colors shrink-0">
                                                        <ExternalLink size={16} />
                                                    </div>
                                                </a>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Stats */}
                            <div className="lg:col-span-2">
                                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 sm:p-8 h-full">
                                    <h3 className="text-base font-bold text-[#001D4A] dark:text-white mb-6 flex items-center gap-3">
                                        <div className="w-6 h-6 rounded bg-fpt-orange flex items-center justify-center text-white shrink-0">
                                            <Search size={14} />
                                        </div>
                                        Tổng quan nộp bài
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-[calc(100%-3rem)] min-h-[120px]">
                                        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5 flex flex-col justify-center items-center text-center">
                                            <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Tổng sinh viên</span>
                                            <span className="text-4xl font-black text-[#001D4A] dark:text-white">{totalStudents}</span>
                                        </div>
                                        <div className="bg-green-50/50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30 p-5 flex flex-col justify-center items-center text-center">
                                            <span className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider mb-2">Đã nộp</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-black text-green-700 dark:text-green-400">{submittedCount}</span>
                                                <span className="text-sm font-bold text-green-600/60 dark:text-green-500/60">
                                                    ({totalStudents > 0 ? Math.round(submittedCount / totalStudents * 100) : 0}%)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 p-5 flex flex-col justify-center items-center text-center">
                                            <span className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-wider mb-2">Chưa nộp</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-black text-red-700 dark:text-red-400">{notSubmittedCount}</span>
                                                <span className="text-sm font-bold text-red-600/60 dark:text-red-500/60">
                                                    ({totalStudents > 0 ? Math.round(notSubmittedCount / totalStudents * 100) : 0}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Submissions Section */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="text-base font-bold text-[#001D4A] dark:text-white flex items-center gap-3">
                            <span className="w-2 h-6 bg-fpt-orange rounded-full"></span>
                            Danh sách bài làm sinh viên
                        </h3>
                        <div className="relative w-full sm:w-72">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm theo MSSV, họ tên..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-orange-50/50 dark:bg-orange-900/10 border-b border-gray-200 dark:border-zinc-700 text-[#001D4A] dark:text-zinc-300">
                                    <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider w-16">STT</th>
                                    <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider">Học viên</th>
                                    <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider">Trạng thái</th>
                                    <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider">File đính kèm</th>
                                    <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider">Bài làm / Ghi chú</th>
                                    <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-wider">Check đạo văn</th>
                                    <th className="text-center px-6 py-4 font-bold text-xs uppercase tracking-wider">Nhận xét</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {paginatedSubmissions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500">
                                                <Search size={32} className="mb-3 opacity-50" />
                                                <p className="text-sm font-medium">{searchTerm ? 'Không tìm thấy sinh viên nào phù hợp' : 'Chưa có dữ liệu sinh viên'}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedSubmissions.map((sub, index) => (
                                        <tr key={sub.studentCode || index} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                                            <td className="px-6 py-4 text-gray-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                                                {currentPage * PAGE_SIZE + index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                                                        {(sub.studentName?.charAt(0) || 'S').toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-[#001D4A] dark:text-white leading-tight">{sub.studentName || '—'}</p>
                                                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 font-mono">{sub.studentCode || '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {sub.status === 'SUBMITTED' ? (
                                                    <div>
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mb-1">
                                                            ĐÃ NỘP
                                                        </span>
                                                        {sub.submittedAt && (
                                                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                                                                {formatDateTime(sub.submittedAt).split(' ')[1]} {formatDateTime(sub.submittedAt).split(' ')[0]}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        CHƯA NỘP
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {sub.fileUrls && sub.fileUrls.length > 0 ? (
                                                    <div className="flex flex-col gap-1.5">
                                                        {sub.fileUrls.map((url, idx) => (
                                                            <a key={idx} href={getViewableFileUrl(url)} target="_blank" rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-gray-100 dark:border-zinc-700 rounded-lg text-fpt-orange hover:text-orange-600 text-xs font-medium transition-colors max-w-[220px] group/link">
                                                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                                                <span className="truncate" title={sub.fileNames?.[idx]}>{sub.fileNames?.[idx] || `File ${idx + 1}`}</span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-zinc-600 italic text-xs">— Không có file —</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-gray-600 dark:text-zinc-300 max-w-[200px] line-clamp-2" title={sub.note}>
                                                    {sub.note ? renderNoteWithLinks(sub.note) : <span className="text-gray-300 dark:text-zinc-600 italic">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {sub.status === 'SUBMITTED' && sub.id ? (
                                                    <button
                                                        onClick={() => handleCheckPlagiarism(sub)}
                                                        disabled={checkingPlagiarismId === sub.id}
                                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold text-fpt-orange transition-colors hover:bg-orange-100 disabled:opacity-60 w-full max-w-[160px]"
                                                    >
                                                        {checkingPlagiarismId === sub.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <ShieldAlert className="w-4 h-4" />
                                                        )}
                                                        {checkingPlagiarismId === sub.id ? 'Đang check...' : 'Check đạo văn'}
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-zinc-600 italic text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {sub.status === 'SUBMITTED' && sub.id ? (
                                                    <button
                                                        onClick={() => openCommentDialog(sub)}
                                                        className={`inline-flex items-center justify-center px-4 py-2 ${sub.lecturerComment ? 'bg-orange-50 text-fpt-orange hover:bg-orange-100 border border-orange-200' : 'bg-gray-50 text-gray-500 hover:text-fpt-orange hover:bg-gray-100 border border-gray-200'} rounded-xl text-xs font-bold transition-colors w-full max-w-[140px]`}
                                                    >
                                                        {sub.lecturerComment ? 'Đã nhận xét' : 'Nhận xét'}
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-zinc-600 italic text-xs">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {filteredSubmissions.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/10">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalElements={filteredSubmissions.length}
                                pageSize={PAGE_SIZE}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Comment Dialog */}
            {commentSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-zinc-800 overflow-hidden transform transition-all">
                        <div className="bg-orange-500 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Nhận xét bài làm
                            </h3>
                            <button onClick={() => { setCommentSubmission(null); setCommentDraft(''); }}
                                className="text-orange-100 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-1.5 rounded-lg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-4 mb-6 border border-orange-100 dark:border-orange-900/30 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center font-bold text-orange-700 dark:text-orange-300 text-sm shrink-0">
                                    {(commentSubmission.studentName?.charAt(0) || 'S').toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-[#001D4A] dark:text-white leading-tight">{commentSubmission.studentName}</p>
                                    <p className="text-xs font-mono text-gray-500 dark:text-zinc-400 mt-0.5">{commentSubmission.studentCode}</p>
                                </div>
                                {commentSubmission.submittedAt && (
                                    <div className="ml-auto text-right">
                                        <p className="text-[10px] font-bold text-orange-600/60 uppercase tracking-wider mb-0.5">Thời gian nộp</p>
                                        <p className="text-xs font-medium text-orange-800 dark:text-orange-300">
                                            {formatDateTime(commentSubmission.submittedAt)}
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">Nội dung nhận xét</label>
                                <textarea
                                    value={commentDraft}
                                    onChange={e => setCommentDraft(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-fpt-orange focus:bg-white outline-none resize-none transition-all"
                                    placeholder="Nhập nhận xét cho sinh viên..."
                                    autoFocus
                                    disabled={savingComment}
                                />
                            </div>
                            
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => { setCommentSubmission(null); setCommentDraft(''); }}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl text-sm font-bold transition-colors">
                                    Hủy
                                </button>
                                <button onClick={handleSaveComment} disabled={savingComment}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-fpt-orange hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm shadow-orange-500/30">
                                    {savingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu nhận xét'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {plagiarismSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-zinc-800">
                            <div>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-[#001D4A] dark:text-white">
                                    <ShieldAlert className="h-5 w-5 text-fpt-orange" />
                                    Kết quả check đạo văn
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                                    {plagiarismSubmission.studentName} - {plagiarismSubmission.studentCode}
                                </p>
                            </div>
                            <button
                                onClick={closePlagiarismDialog}
                                className="rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-fpt-orange dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="max-h-[80vh] overflow-y-auto p-6">
                            {checkingPlagiarismId === plagiarismSubmission.id && !plagiarismResult ? (
                                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
                                    <Loader2 className="h-10 w-10 animate-spin text-fpt-orange" />
                                    <div>
                                        <p className="text-base font-bold text-[#001D4A] dark:text-white">Đang phân tích bài nộp nội bộ</p>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                                            Hệ thống đang so sánh trong toàn bộ môn học để tìm bài tương tự.
                                        </p>
                                    </div>
                                </div>
                            ) : plagiarismResult ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
                                        <div className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 dark:border-orange-900/30 dark:from-orange-950/20 dark:via-zinc-900 dark:to-amber-950/10">
                                            <div className="flex flex-wrap items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-fpt-orange">Decision Layer</p>
                                                    <h4 className="mt-2 text-2xl font-black text-[#001D4A] dark:text-white">
                                                        {plagiarismResult.plagiarismPercent}% đạo văn
                                                    </h4>
                                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-zinc-300">
                                                        Kiểm tra nội bộ trong toàn bộ môn học, dùng feature `text + image + metadata`
                                                        và decision model `{plagiarismResult.model}`.
                                                    </p>
                                                </div>
                                                <div className={`rounded-2xl px-4 py-3 text-sm font-black ${getPlagiarismTone(plagiarismResult.plagiarismPercent)}`}>
                                                    {plagiarismResult.plagiarized ? 'NGHI NGỜ ĐẠO VĂN' : 'ÍT TÍN HIỆU ĐẠO VĂN'}
                                                </div>
                                            </div>

                                            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                                                <div className="rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Originality</p>
                                                    <p className="mt-2 text-3xl font-black text-green-600 dark:text-green-400">{plagiarismResult.originalityPercent}%</p>
                                                </div>
                                                <div className="rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Xác suất</p>
                                                    <p className="mt-2 text-3xl font-black text-[#001D4A] dark:text-white">{Math.round(plagiarismResult.probability * 100)}%</p>
                                                </div>
                                                <div className="rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Phạm vi</p>
                                                    <p className="mt-2 text-sm font-bold text-[#001D4A] dark:text-white">{plagiarismResult.courseCode}</p>
                                                    <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">{plagiarismResult.className}</p>
                                                </div>
                                                <div className="rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">So sánh</p>
                                                    <p className="mt-2 text-3xl font-black text-[#001D4A] dark:text-white">{plagiarismResult.comparedSubmissionCount}</p>
                                                    <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">bài nộp trong cùng môn học</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/60">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-fpt-orange" />
                                                <h4 className="text-sm font-black uppercase tracking-[0.18em] text-[#001D4A] dark:text-white">Feature Breakdown</h4>
                                            </div>
                                            <div className="mt-5 space-y-4">
                                                {[
                                                    { label: 'Text Score', value: plagiarismResult.textScore },
                                                    { label: 'Image Score', value: plagiarismResult.imageScore },
                                                    { label: 'Metadata Score', value: plagiarismResult.metadataScore },
                                                    { label: 'Filename Score', value: plagiarismResult.fileNameScore },
                                                ].map(item => (
                                                    <div key={item.label}>
                                                        <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                                                            <span>{item.label}</span>
                                                            <span>{Math.round(item.value * 100)}%</span>
                                                        </div>
                                                        <div className="h-2.5 rounded-full bg-gray-100 dark:bg-zinc-800">
                                                            <div
                                                                className="h-2.5 rounded-full bg-gradient-to-r from-orange-400 to-fpt-orange"
                                                                style={{ width: `${Math.max(4, Math.round(item.value * 100))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/70 p-4 dark:border-orange-900/30 dark:bg-orange-900/10">
                                                <p className="text-xs font-black uppercase tracking-[0.18em] text-fpt-orange">Tín hiệu chính</p>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {plagiarismResult.keySignals.map(signal => (
                                                        <span
                                                            key={signal}
                                                            className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-900/40 dark:bg-zinc-900 dark:text-orange-300"
                                                        >
                                                            {signal}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/60">
                                        <div className="flex items-center gap-2">
                                            <ScanSearch className="h-4 w-4 text-fpt-orange" />
                                            <h4 className="text-sm font-black uppercase tracking-[0.18em] text-[#001D4A] dark:text-white">Các bài tương tự</h4>
                                        </div>

                                        {plagiarismResult.topMatches.length === 0 ? (
                                            <div className="py-12 text-center text-sm text-gray-500 dark:text-zinc-400">
                                                Không có bài tương tự đáng kể trong cùng môn học.
                                            </div>
                                        ) : (
                                            <div className="mt-5 space-y-4">
                                                {plagiarismResult.topMatches.map(match => (
                                                    <div
                                                        key={match.submissionId}
                                                        className="rounded-2xl border border-gray-200 p-5 dark:border-zinc-800"
                                                    >
                                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                            <div>
                                                                <div className="flex items-center gap-3">
                                                                    <p className="text-base font-bold text-[#001D4A] dark:text-white">
                                                                        {match.studentName}
                                                                    </p>
                                                                    <span className="font-mono text-xs text-gray-500 dark:text-zinc-400">
                                                                        {match.studentCode}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-zinc-300">
                                                                    {match.notePreview || 'Không có ghi chú văn bản.'}
                                                                </p>
                                                            </div>
                                                            <div className={`rounded-2xl px-4 py-3 text-center ${getPlagiarismTone(match.plagiarismPercent)}`}>
                                                                <p className="text-2xl font-black">{match.plagiarismPercent}%</p>
                                                                <p className="text-[11px] font-bold uppercase tracking-[0.18em]">match</p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                                                            {[
                                                                { label: 'Text', value: match.textScore },
                                                                { label: 'Image', value: match.imageScore },
                                                                { label: 'Metadata', value: match.metadataScore },
                                                                { label: 'Filename', value: match.fileNameScore },
                                                            ].map(metric => (
                                                                <div key={metric.label} className="rounded-xl bg-gray-50 px-3 py-3 dark:bg-zinc-900">
                                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{metric.label}</p>
                                                                    <p className="mt-1 text-lg font-black text-[#001D4A] dark:text-white">{Math.round(metric.value * 100)}%</p>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {match.fileNames && match.fileNames.length > 0 && (
                                                            <div className="mt-4">
                                                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">File đính kèm</p>
                                                                <div className="mt-2 flex flex-wrap gap-2">
                                                                    {match.fileNames.map(fileName => (
                                                                        <span key={fileName} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                                                                            {fileName}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="mt-4 flex flex-wrap gap-2">
                                                            {match.sharedSignals.map(signal => (
                                                                <span
                                                                    key={signal}
                                                                    className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-300"
                                                                >
                                                                    {signal}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </LecturerLayout>
    );
};

export default LecturerAssignmentDetailPage;
