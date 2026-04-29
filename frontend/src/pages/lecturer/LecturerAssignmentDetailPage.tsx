/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { assignmentService, AssignmentDTO, AssignmentPlagiarismDTO, AssignmentSubmissionDTO } from '../../services/api/assignmentService';
import { timetableService, TimetableSlotDTO } from '../../services/api/timetableService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import { Pagination } from '../../components/common/Pagination';
import {
    ArrowLeft, Clock, ExternalLink, Search, Loader2, BookOpen, Lock, X, Download, MessageSquare, ShieldAlert, SlidersHorizontal
} from 'lucide-react';
import toast from "@utils/toast";

const PAGE_SIZE = 30;
const BATCH_CHECK_CONCURRENCY = 3;

type BatchCheckFilter = 'ALL' | 'SUSPECT' | 'ERROR';

interface BatchCheckRow {
    key: string;
    assignmentId: number;
    assignmentTitle: string;
    submissionId: number;
    studentCode: string;
    studentName: string;
    plagiarismPercent?: number;
    plagiarized?: boolean;
    status: 'SUCCESS' | 'ERROR';
    errorMessage?: string;
    checkedAt: string;
}

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
    const [showPlagiarismConfigModal, setShowPlagiarismConfigModal] = useState(false);
    const [configTextThreshold, setConfigTextThreshold] = useState('70');
    const [configImageThreshold, setConfigImageThreshold] = useState('95');
    const [savingPlagiarismConfig, setSavingPlagiarismConfig] = useState(false);
    const [isBatchChecking, setIsBatchChecking] = useState(false);
    const [showBatchResultModal, setShowBatchResultModal] = useState(false);
    const [batchRows, setBatchRows] = useState<BatchCheckRow[]>([]);
    const [batchTotal, setBatchTotal] = useState(0);
    const [batchDone, setBatchDone] = useState(0);
    const [batchErrors, setBatchErrors] = useState(0);
    const [batchFilter, setBatchFilter] = useState<BatchCheckFilter>('ALL');

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    const handleCheckPlagiarismWholeClass = async () => {
        if (!assignmentId || Number.isNaN(assignmentId)) {
            toast.error('Không xác định được bài tập để check');
            return;
        }
        if (isBatchChecking) return;

        setBatchRows([]);
        setBatchTotal(0);
        setBatchDone(0);
        setBatchErrors(0);
        setBatchFilter('ALL');
        setShowBatchResultModal(true);
        setIsBatchChecking(true);

        try {
            const assignmentSubs = await assignmentService.getAllSubmissionStatus(assignmentId);
            const targets: Array<{ assignmentId: number; assignmentTitle: string; submission: AssignmentSubmissionDTO }> =
                assignmentSubs
                    .filter(sub => sub.status === 'SUBMITTED' && !!sub.id)
                    .map(sub => ({
                        assignmentId,
                        assignmentTitle: assignment?.title || `Assignment #${assignmentId}`,
                        submission: sub,
                    }));

            if (targets.length === 0) {
                toast.info('Không có bài nộp hợp lệ để check trong bài tập này');
                return;
            }

            setBatchTotal(targets.length);

            let cursor = 0;
            const workerCount = Math.min(BATCH_CHECK_CONCURRENCY, targets.length);
            const workers = Array.from({ length: workerCount }, async () => {
                while (true) {
                    const currentIndex = cursor++;
                    if (currentIndex >= targets.length) break;
                    const target = targets[currentIndex];
                    const now = new Date().toISOString();

                    try {
                        const result = await assignmentService.checkSubmissionPlagiarism(
                            target.assignmentId,
                            target.submission.id as number
                        );
                        setBatchRows(prev => [
                            ...prev,
                            {
                                key: `${target.assignmentId}-${target.submission.id}`,
                                assignmentId: target.assignmentId,
                                assignmentTitle: target.assignmentTitle,
                                submissionId: target.submission.id as number,
                                studentCode: target.submission.studentCode || '—',
                                studentName: target.submission.studentName || '—',
                                plagiarismPercent: result.plagiarismPercent,
                                plagiarized: result.plagiarized,
                                status: 'SUCCESS',
                                checkedAt: now,
                            }
                        ]);
                    } catch (err: any) {
                        setBatchErrors(prev => prev + 1);
                        const message = err?.response?.data?.message || err?.message || 'Lỗi không xác định';
                        setBatchRows(prev => [
                            ...prev,
                            {
                                key: `${target.assignmentId}-${target.submission.id}-err`,
                                assignmentId: target.assignmentId,
                                assignmentTitle: target.assignmentTitle,
                                submissionId: target.submission.id as number,
                                studentCode: target.submission.studentCode || '—',
                                studentName: target.submission.studentName || '—',
                                status: 'ERROR',
                                errorMessage: message,
                                checkedAt: now,
                            }
                        ]);
                    } finally {
                        setBatchDone(prev => prev + 1);
                    }
                }
            });

            await Promise.all(workers);
            toast.success('Đã hoàn tất check đạo văn cho bài tập này');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể check đạo văn cho bài tập này');
        } finally {
            setIsBatchChecking(false);
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
    const textThreshold = plagiarismResult?.textThreshold ?? assignment?.plagiarismTextThreshold ?? 0.7;
    const imageThreshold = plagiarismResult?.imageThreshold ?? assignment?.plagiarismImageThreshold ?? 0.95;
    const isTextPlagiarized = Boolean(plagiarismResult?.plagiarizedText);
    const isImagePlagiarized = Boolean(plagiarismResult?.plagiarizedImage);
    const overallPlagiarized = isTextPlagiarized || isImagePlagiarized;
    const displayPlagiarismPercent = plagiarismResult?.plagiarismPercent ?? 0;
    const batchSuspectCount = useMemo(() => batchRows.filter(row => row.status === 'SUCCESS' && row.plagiarized).length, [batchRows]);
    const batchFilteredRows = useMemo(() => {
        if (batchFilter === 'SUSPECT') {
            return batchRows.filter(row => row.status === 'SUCCESS' && row.plagiarized);
        }
        if (batchFilter === 'ERROR') {
            return batchRows.filter(row => row.status === 'ERROR');
        }
        return batchRows;
    }, [batchRows, batchFilter]);

    const getPlagiarismTone = (percent?: number) => {
        const value = percent ?? 0;
        if (value >= 75) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        if (value >= 45) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    };

    const getBooleanTone = (value: boolean) =>
        value
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';

    const getReasonTagLabel = (tag: string) => {
        const map: Record<string, string> = {
            DIRECT_COPY: 'Sao chép trực tiếp',
            IMPROPER_PARAPHRASING: 'Diễn đạt lại sai cách',
            IDEA_PLAGIARISM: 'Đạo văn ý tưởng',
            MOSAIC_PATCHWRITING: 'Mosaic/Patchwriting',
            SELF_PLAGIARISM: 'Tự đạo văn',
            MIS_CITATION: 'Trích dẫn sai/thiếu',
            UNINTENTIONAL_RISK: 'Đạo văn vô ý (rủi ro)',
            INSUFFICIENT_EVIDENCE: 'Chưa đủ bằng chứng',
        };
        return map[tag] || tag;
    };

    const openPlagiarismConfig = () => {
        setConfigTextThreshold(String(Math.round((assignment?.plagiarismTextThreshold ?? 0.7) * 100)));
        setConfigImageThreshold(String(Math.round((assignment?.plagiarismImageThreshold ?? 0.95) * 100)));
        setShowPlagiarismConfigModal(true);
    };

    const handleSavePlagiarismConfig = async () => {
        if (!assignment?.id) return;
        const textPercent = Number(configTextThreshold);
        const imagePercent = Number(configImageThreshold);
        if (Number.isNaN(textPercent) || Number.isNaN(imagePercent)) {
            toast.error('Vui lòng nhập ngưỡng hợp lệ');
            return;
        }
        if (textPercent < 0 || textPercent > 100 || imagePercent < 0 || imagePercent > 100) {
            toast.error('Ngưỡng phải trong khoảng 0% đến 100%');
            return;
        }

        try {
            setSavingPlagiarismConfig(true);
            const updated = await assignmentService.updateAssignmentPlagiarismConfig(
                assignment.id,
                textPercent / 100,
                imagePercent / 100
            );
            setAssignment(updated);
            setShowPlagiarismConfigModal(false);
            toast.success('Đã cập nhật cấu hình đạo văn');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể cập nhật cấu hình đạo văn');
        } finally {
            setSavingPlagiarismConfig(false);
        }
    };

    const filteredSimilarMatches = useMemo(
        () =>
            (plagiarismResult?.topMatches || []).filter(match => {
                const hasSuspectSignal = Boolean(match.textSuspect) || Boolean(match.imageSuspect);
                const hasInsufficientEvidenceTag = (match.reasonTags || []).includes('INSUFFICIENT_EVIDENCE');
                return hasSuspectSignal && !hasInsufficientEvidenceTag;
            }),
        [plagiarismResult]
    );

    const uniqueReasonTags = useMemo(() => {
        const tags = new Set<string>();
        filteredSimilarMatches.forEach(match => {
            (match.reasonTags || [])
                .filter(tag => tag !== 'INSUFFICIENT_EVIDENCE')
                .forEach(tag => tags.add(tag));
        });
        return Array.from(tags);
    }, [filteredSimilarMatches]);

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
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
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
                            <button
                                type="button"
                                onClick={handleCheckPlagiarismWholeClass}
                                disabled={isBatchChecking}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300"
                            >
                                {isBatchChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                                {isBatchChecking ? 'Đang check bài tập...' : 'Check đạo văn bài tập'}
                            </button>
                            <button
                                type="button"
                                onClick={openPlagiarismConfig}
                                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-600 transition-colors hover:bg-gray-50 hover:text-fpt-orange dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                title="Cấu hình ngưỡng đạo văn"
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                            </button>
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
                                                        {displayPlagiarismPercent}% đạo văn
                                                    </h4>
                                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-zinc-300">
                                                        Kết quả được tách độc lập theo 2 luồng:
                                                        Text Score {'>='} {Math.round(textThreshold * 100)}% cho tài liệu văn bản
                                                        và Image Score {'>='} {Math.round(imageThreshold * 100)}% cho hình ảnh.
                                                    </p>
                                                </div>
                                                <div className={`rounded-2xl px-4 py-3 text-sm font-black ${getPlagiarismTone(displayPlagiarismPercent)}`}>
                                                    {overallPlagiarized ? 'NGHI NGỜ ĐẠO VĂN' : 'ÍT TÍN HIỆU ĐẠO VĂN'}
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <span className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${getBooleanTone(isTextPlagiarized)}`}>
                                                    Đạo văn văn bản: {isTextPlagiarized ? 'Nghi ngờ' : 'Không'}
                                                </span>
                                                <span className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${getBooleanTone(isImagePlagiarized)}`}>
                                                    Đạo ảnh: {isImagePlagiarized ? 'Nghi ngờ' : 'Không'}
                                                </span>
                                            </div>

                                        </div>

                                        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/60">
                                            <h4 className="text-sm font-black uppercase tracking-[0.18em] text-[#001D4A] dark:text-white">Nhận định AI</h4>
                                            {plagiarismResult.overallComment && (
                                                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                                                    <p className="text-sm leading-6 text-blue-900 dark:text-blue-200">{plagiarismResult.overallComment}</p>
                                                </div>
                                            )}

                                            {uniqueReasonTags.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {uniqueReasonTags.map(tag => (
                                                        <span
                                                            key={tag}
                                                            className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-300"
                                                        >
                                                            {getReasonTagLabel(tag)}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {!plagiarismResult.overallComment && uniqueReasonTags.length === 0 && (
                                                <p className="mt-3 text-sm text-gray-500 dark:text-zinc-400">Chưa có dữ liệu nhận định AI.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/60">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h4 className="text-sm font-black uppercase tracking-[0.18em] text-[#001D4A] dark:text-white">Những bài tương đồng</h4>
                                            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                                                Ngưỡng text {'>='} {Math.round(textThreshold * 100)}% • image {'>='} {Math.round(imageThreshold * 100)}%
                                            </span>
                                        </div>

                                        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-zinc-800">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50 dark:bg-zinc-800/40">
                                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Tên</th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Lớp</th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Bài tập trùng</th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">File đính kèm</th>
                                                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">% đạo văn</th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Lý do</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                                    {filteredSimilarMatches.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-zinc-400">
                                                                Không có bài tương đồng vượt ngưỡng.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredSimilarMatches.map(match => (
                                                            <tr key={match.submissionId} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                                                                <td className="px-4 py-3">
                                                                    <p className="font-semibold text-[#001D4A] dark:text-white">{match.studentName}</p>
                                                                    <p className="text-xs font-mono text-gray-500 dark:text-zinc-400">{match.studentCode}</p>
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-gray-700 dark:text-zinc-300">
                                                                    {match.className || plagiarismResult.className || '—'}
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-gray-700 dark:text-zinc-300">
                                                                    {match.assignmentTitle || plagiarismResult.assignmentTitle || '—'}
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-gray-700 dark:text-zinc-300">
                                                                    {(match.fileNames || []).length > 0 ? (
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {(match.fileNames || []).map((fileName, index) => {
                                                                                const url = match.comparedFileLinks?.[index];
                                                                                if (!url) {
                                                                                    return <span key={`${fileName}-${index}`}>{fileName}</span>;
                                                                                }
                                                                                return (
                                                                                    <a
                                                                                        key={`${fileName}-${index}`}
                                                                                        href={getViewableFileUrl(url)}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-300"
                                                                                        title={fileName}
                                                                                    >
                                                                                        {fileName}
                                                                                    </a>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : '—'}
                                                                </td>
                                                                <td className="px-4 py-3 text-center font-black text-[#001D4A] dark:text-white">
                                                                    {match.plagiarismPercent ?? 0}%
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-gray-700 dark:text-zinc-300">
                                                                    <p>{(match.reasonTags || []).map(getReasonTagLabel).join(', ') || 'Cần đối chiếu thủ công'}</p>
                                                                    <p className="mt-1 text-gray-500 dark:text-zinc-400">{match.reasonSummary || match.matchComment || '—'}</p>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {showBatchResultModal && (
                <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-zinc-800">
                            <div>
                                <h3 className="flex items-center gap-2 text-lg font-bold text-[#001D4A] dark:text-white">
                                    <ShieldAlert className="h-5 w-5 text-fpt-orange" />
                                    Kết quả check đạo văn theo bài tập
                                </h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                                    Tiến trình: {batchDone}/{batchTotal} • Nghi ngờ: {batchSuspectCount} • Lỗi: {batchErrors}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isBatchChecking) return;
                                    setShowBatchResultModal(false);
                                }}
                                className="rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-fpt-orange disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                disabled={isBatchChecking}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="max-h-[80vh] overflow-y-auto p-6">
                            <div className="mb-4">
                                <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-zinc-800">
                                    <div
                                        className="h-2.5 rounded-full bg-gradient-to-r from-orange-400 to-fpt-orange transition-all"
                                        style={{ width: `${batchTotal > 0 ? Math.round((batchDone / batchTotal) * 100) : 0}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-zinc-400">
                                    {batchTotal > 0 ? Math.round((batchDone / batchTotal) * 100) : 0}% hoàn thành
                                </p>
                            </div>

                            <div className="mb-4 flex flex-wrap gap-2">
                                {[
                                    { id: 'ALL', label: `Tất cả (${batchRows.length})` },
                                    { id: 'SUSPECT', label: `Nghi ngờ (${batchSuspectCount})` },
                                    { id: 'ERROR', label: `Lỗi (${batchErrors})` },
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setBatchFilter(item.id as BatchCheckFilter)}
                                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                                            batchFilter === item.id
                                                ? 'bg-fpt-orange text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-zinc-800">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-zinc-800/40">
                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Assignment</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Sinh viên</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">% đạo văn</th>
                                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Trạng thái</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Ghi chú</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Thời gian</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {batchFilteredRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-zinc-400">
                                                    Chưa có kết quả theo bộ lọc hiện tại.
                                                </td>
                                            </tr>
                                        ) : (
                                            batchFilteredRows.map(row => (
                                                <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                                                    <td className="px-4 py-3">
                                                        <p className="font-semibold text-[#001D4A] dark:text-white">#{row.assignmentId}</p>
                                                        <p className="text-xs text-gray-500 dark:text-zinc-400">{row.assignmentTitle}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="font-semibold text-[#001D4A] dark:text-white">{row.studentName}</p>
                                                        <p className="text-xs font-mono text-gray-500 dark:text-zinc-400">{row.studentCode}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-black text-[#001D4A] dark:text-white">
                                                        {row.status === 'SUCCESS' ? `${row.plagiarismPercent ?? 0}%` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {row.status === 'ERROR' ? (
                                                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                                Lỗi
                                                            </span>
                                                        ) : row.plagiarized ? (
                                                            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                                                Nghi ngờ
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                                Bình thường
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-zinc-300">
                                                        {row.status === 'ERROR' ? (row.errorMessage || 'Lỗi không xác định') : 'Check thành công'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-400">
                                                        {formatDateTime(row.checkedAt)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPlagiarismConfigModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-zinc-800">
                            <h3 className="text-base font-bold text-[#001D4A] dark:text-white">Cấu hình ngưỡng đạo văn</h3>
                            <button
                                type="button"
                                onClick={() => setShowPlagiarismConfigModal(false)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4 p-6">
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Ngưỡng văn bản (%)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={configTextThreshold}
                                    onChange={e => setConfigTextThreshold(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Ngưỡng hình ảnh (%)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={configImageThreshold}
                                    onChange={e => setConfigImageThreshold(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">
                                Dùng để quyết định kết luận: điểm text/image lớn hơn hoặc bằng ngưỡng sẽ bị đánh dấu nghi ngờ đạo văn, dưới ngưỡng là không đạo văn.
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">Mặc định hệ thống: văn bản 70%, hình ảnh 95%.</p>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPlagiarismConfigModal(false)}
                                    className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSavePlagiarismConfig}
                                    disabled={savingPlagiarismConfig}
                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-fpt-orange px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
                                >
                                    {savingPlagiarismConfig && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Lưu cấu hình
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

