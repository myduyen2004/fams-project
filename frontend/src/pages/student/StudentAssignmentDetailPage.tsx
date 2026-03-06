import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { StudentLayout } from '../../layouts/StudentLayout';
import { assignmentService, AssignmentSubmissionDTO, SubmitAssignmentRequest } from '../../services/api/assignmentService';
import { uploadFile } from '../../services/utils/fileUploadService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import {
    ArrowLeft, Clock, BookOpen, FileText, Upload, CheckCircle, AlertCircle,
    XCircle, ExternalLink, Loader2, Trash2, Paperclip, MessageSquare, RotateCcw, Calendar, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import { timetableService, TimetableSlotDTO } from '../../services/api/timetableService';

export const StudentAssignmentDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const assignmentId = Number(id);

    const [submission, setSubmission] = useState<AssignmentSubmissionDTO | null>(null);
    const [slotInfo, setSlotInfo] = useState<TimetableSlotDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Upload state
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [note, setNote] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!assignmentId || isNaN(assignmentId)) return;
        fetchSubmission();
    }, [assignmentId]);

    const fetchSubmission = async () => {
        try {
            setLoading(true);
            const data = await assignmentService.getMySubmission(Number(id));
            setSubmission(data);

            if (data.timetableSlotId && data.className) {
                try {
                    const timetableData = await timetableService.getTimetableByClass(data.className);
                    const slot = timetableData.find(s => s.id === data.timetableSlotId);
                    if (slot) {
                        setSlotInfo(slot);
                    }
                } catch (err) {
                    console.error('Không thể tải thông tin slot:', err);
                }
            }
        } catch (error) {
            console.error('Error fetching submission:', error);
            toast.error('Không thể tải thông tin bài tập');
        } finally {
            setLoading(false);
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

    const isBeforeDeadline = (dueDate?: string) => {
        if (!dueDate) return true;
        return new Date(dueDate) > new Date();
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SUBMITTED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" /> Đã nộp
                    </span>
                );
            case 'NOT_SUBMITTED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <AlertCircle className="w-4 h-4" /> Chưa nộp
                    </span>
                );
            case 'OVERDUE':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle className="w-4 h-4" /> Quá hạn nộp
                    </span>
                );
            default:
                return null;
        }
    };

    const openUploadDialog = () => {
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
        if (selectedFiles.length === 0 && !note?.trim()) {
            toast.error('Vui lòng chọn file hoặc nhập ghi chú');
            return;
        }

        try {
            setSubmitting(true);

            const fileUrls: string[] = [];
            const fileNames: string[] = [];

            for (const file of selectedFiles) {
                try {
                    const uploadResult = await uploadFile(file);
                    fileUrls.push(uploadResult.url || uploadResult.secure_url);
                    fileNames.push(file.name);
                } catch (error) {
                    console.error('File upload failed:', error);
                    toast.error(`Không thể upload file ${file.name}. Vui lòng thử lại.`);
                    setSubmitting(false);
                    return;
                }
            }

            const request: SubmitAssignmentRequest = {
                assignmentId,
                fileUrls: fileUrls.length > 0 ? fileUrls : undefined,
                fileNames: fileNames.length > 0 ? fileNames : undefined,
                note: note || undefined
            };
            await assignmentService.submitAssignment(request);
            toast.success('Nộp bài thành công!');
            setShowUploadDialog(false);
            fetchSubmission();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Nộp bài thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <StudentLayout pageTitle="Chi tiết bài tập">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 size={32} className="animate-spin text-fpt-orange" />
                </div>
            </StudentLayout>
        );
    }

    if (!submission) {
        return (
            <StudentLayout pageTitle="Chi tiết bài tập">
                <div className="mt-4 ml-10 mr-10">
                    <button
                        onClick={() => navigate('/student/assignments')}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-zinc-400 hover:text-fpt-orange transition-colors mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại danh sách bài tập
                    </button>
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-16 text-center">
                        <div className="w-24 h-24 rounded-full bg-orange-50 dark:bg-zinc-800 mx-auto mb-6 flex items-center justify-center">
                            <FileText size={48} className="text-fpt-orange" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Không tìm thấy bài tập
                        </h3>
                        <p className="text-gray-500 dark:text-zinc-400">
                            Bài tập này không tồn tại hoặc bạn không có quyền truy cập.
                        </p>
                    </div>
                </div>
            </StudentLayout>
        );
    }

    const canSubmit = submission.status === 'NOT_SUBMITTED';
    const canResubmit = submission.status === 'SUBMITTED' && isBeforeDeadline(submission.assignmentDueDate);

    return (
        <StudentLayout pageTitle="Chi tiết bài tập">
            <div className="mt-4 ml-10 mr-10 space-y-4">

                {/* Back button */}
                <button
                    onClick={() => navigate('/student/assignments')}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-zinc-400 hover:text-fpt-orange transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại danh sách bài tập
                </button>

                {/* Assignment Header Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                    {/* Title bar */}
                    <div className="bg-orange-500 dark:bg-orange-600 px-5 py-3">
                        <h2 className="text-lg font-bold text-white">{submission.assignmentTitle}</h2>
                    </div>

                    {/* Info row */}
                    <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-5 gap-4 divide-x divide-gray-200 dark:divide-zinc-700 text-sm">
                        <div className="flex flex-col items-center gap-1 px-2">
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Lớp</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">{submission.className}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 px-2">
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Ngày học / Slot</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-sm inline-flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                {slotInfo ? (
                                    <>
                                        {formatDateTime(slotInfo.date).split(' ')[1]} - {slotInfo.slotNumber && `Slot ${slotInfo.slotNumber}`}
                                    </>
                                ) : (
                                    <span className="text-gray-400">Chưa xếp lịch</span>
                                )}
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 px-2">
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Phòng</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-sm inline-flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                {slotInfo?.roomName || slotInfo?.roomCode || <span className="text-gray-400">Chưa xếp phòng</span>}
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 px-2">
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Hạn nộp</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-sm inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                {formatDateTime(submission.assignmentDueDate)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 px-2">
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Trạng thái</span>
                            {getStatusBadge(submission.status)}
                        </div>
                    </div>
                </div>

                {/* Reference Material Card */}
                {submission.referenceUrl && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-fpt-orange" />
                            Tài liệu tham khảo
                        </h3>
                        <a
                            href={getViewableFileUrl(submission.referenceUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-fpt-orange hover:text-orange-600 transition-colors"
                        >
                            <Paperclip className="w-4 h-4" />
                            {submission.referenceName || 'Tài liệu tham khảo'}
                        </a>
                    </div>
                )}

                {/* Submission Detail Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-fpt-orange" />
                            Thông tin bài nộp
                        </h3>
                        {(canSubmit || canResubmit) && (
                            <button
                                onClick={openUploadDialog}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                {canResubmit ? <RotateCcw className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                                {canResubmit ? 'Nộp lại' : 'Nộp bài'}
                            </button>
                        )}
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Submitted time */}
                        {submission.submittedAt && (
                            <div>
                                <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Thời gian nộp</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                                    {formatDateTime(submission.submittedAt)}
                                </p>
                            </div>
                        )}

                        {/* Submitted files */}
                        <div>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wider">File đã nộp</p>
                            {submission.fileUrls && submission.fileUrls.length > 0 ? (
                                <div className="mt-1.5 space-y-1.5">
                                    {submission.fileUrls.map((url, idx) => (
                                        <a
                                            key={idx}
                                            href={getViewableFileUrl(url)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-zinc-800 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded bg-white dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                                                <FileText className="w-4 h-4 text-fpt-orange" />
                                            </div>
                                            <span className="text-sm text-gray-700 dark:text-zinc-300 group-hover:text-fpt-orange transition-colors truncate">
                                                {submission.fileNames?.[idx] || `File ${idx + 1}`}
                                            </span>
                                            <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-fpt-orange ml-auto flex-shrink-0" />
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 dark:text-zinc-500 mt-0.5">Chưa có file nào được nộp</p>
                            )}
                        </div>

                        {/* Note */}
                        <div>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Ghi chú</p>
                            <div className="text-sm text-gray-700 dark:text-zinc-300 mt-0.5">
                                {renderNoteWithLinks(submission.note)}
                            </div>
                        </div>

                        {/* Lecturer Comment */}
                        <div>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Nhận xét giảng viên</p>
                            {submission.lecturerComment ? (
                                <p className="text-sm text-gray-700 dark:text-zinc-300 mt-0.5">
                                    {submission.lecturerComment}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-400 dark:text-zinc-500 mt-0.5 italic">Chưa có nhận xét</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Dialog - Portal */}
            {showUploadDialog && createPortal(
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-zinc-800">
                        <div className="p-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-orange-500" />
                                {canResubmit ? 'Nộp lại bài tập' : 'Nộp bài tập'}
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
                                disabled={submitting || (selectedFiles.length === 0 && !note?.trim())}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                {submitting ? (
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
        </StudentLayout>
    );
};

export default StudentAssignmentDetailPage;
