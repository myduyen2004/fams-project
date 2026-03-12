import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { StudentLayout } from '../../layouts/StudentLayout';
import { assignmentService, AssignmentSubmissionDTO, SubmitAssignmentRequest } from '../../services/api/assignmentService';
import { uploadFile } from '../../services/utils/fileUploadService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import {
    ArrowLeft, BookOpen, FileText, Upload,
    Loader2, Trash2, Paperclip, RotateCcw, Calendar, MessageSquare, Download
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

                {/* Top Header Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden p-6 sm:px-8 sm:py-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 dark:border-zinc-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center text-sm">
                        
                        {/* Class & Subject */}
                        <div className="md:col-span-1">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">MÃ LỚP & MÔN HỌC</p>
                            <h2 className="font-extrabold text-[#001D4A] dark:text-white leading-tight">
                                {submission.className} - {submission.assignmentTitle.split('-')[0]?.trim() || submission.courseCode || 'N/A'}
                            </h2>
                        </div>

                        {/* Time */}
                        <div className="md:col-span-1">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">THỜI GIAN</p>
                            <p className="font-medium text-[#001D4A] dark:text-gray-300">
                                {slotInfo ? (
                                    <>
                                        {formatDateTime(slotInfo.date).split(' ')[1]} - {slotInfo.slotNumber && `Slot ${slotInfo.slotNumber}`}
                                    </>
                                ) : (
                                    <span className="text-gray-400">Chưa xếp lịch</span>
                                )}
                            </p>
                        </div>

                        {/* Room */}
                        <div className="md:col-span-1">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">PHÒNG HỌC</p>
                            <p className="font-medium text-[#001D4A] dark:text-gray-300">
                                {slotInfo?.roomName || slotInfo?.roomCode || <span className="text-gray-400">Chưa xếp phòng</span>}
                            </p>
                        </div>

                        {/* Right Deadline Box */}
                        <div className="md:col-span-1 md:justify-self-end">
                            <div className="bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/30 px-3.5 py-2.5 inline-block w-full md:w-auto">
                                <p className="text-[10px] font-bold text-fpt-orange uppercase tracking-widest mb-1.5">HẠN NỘP CUỐI CÙNG</p>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <p className="text-base font-bold text-[#001D4A] dark:text-white leading-none mb-0.5">
                                            {formatDateTime(submission.assignmentDueDate).split(' ')[1]}
                                        </p>
                                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 leading-none">
                                            {formatDateTime(submission.assignmentDueDate).split(' ')[0]}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column - Materials */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6">
                            <h3 className="text-base font-bold text-[#001D4A] dark:text-white mb-6 flex items-center gap-3">
                                <div className="text-fpt-orange">
                                    <BookOpen className="fill-current w-5 h-5" />
                                </div>
                                Tài liệu
                            </h3>
                            
                            <div className="space-y-4">
                                {submission.referenceUrl ? (
                                    <a
                                        href={getViewableFileUrl(submission.referenceUrl)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0 text-fpt-orange">
                                            <Paperclip size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-[#001D4A] dark:text-white truncate group-hover:text-fpt-orange transition-colors">
                                                {submission.referenceName || 'Tài liệu tham khảo'}
                                            </p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">Tài liệu đính kèm</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 group-hover:text-fpt-orange transition-colors shrink-0">
                                            <Download size={16} />
                                        </div>
                                    </a>
                                ) : (
                                    <p className="text-sm text-gray-400 px-2">Không có tài liệu đính kèm.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Submission & Feedback */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Submission Info Card */}
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <h3 className="text-base font-bold text-[#001D4A] dark:text-white flex items-center gap-3">
                                    <div className="w-6 h-6 rounded bg-fpt-orange flex items-center justify-center text-white">
                                        <Upload size={14} />
                                    </div>
                                    Thông tin bài nộp
                                </h3>
                                
                                {(canSubmit || canResubmit) && (
                                    <button
                                        onClick={openUploadDialog}
                                        className="inline-flex items-center justify-center px-6 py-2.5 bg-fpt-orange hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-orange-500/20"
                                    >
                                        {canResubmit ? 'Nộp lại' : 'Nộp bài'}
                                    </button>
                                )}
                            </div>

                            {submission.status === 'SUBMITTED' ? (
                                <div className="space-y-4">
                                    {submission.fileUrls && submission.fileUrls.length > 0 ? (
                                        submission.fileUrls.map((url, idx) => (
                                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50/80 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                                                        <FileText className="w-5 h-5 text-fpt-orange" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm text-[#001D4A] dark:text-white truncate" title={submission.fileNames?.[idx]}>
                                                            {submission.fileNames?.[idx] || `File ${idx + 1}`}
                                                        </p>
                                                        <p className="text-[11px] text-gray-400 mt-0.5">Đã tải lên</p>
                                                    </div>
                                                </div>
                                                {submission.submittedAt && (
                                                    <div className="text-right shrink-0 pr-2">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">THỜI GIAN NỘP</p>
                                                        <p className="text-sm font-medium text-[#001D4A] dark:text-gray-300">
                                                            {formatDateTime(submission.submittedAt).split(' ')[1]} {formatDateTime(submission.submittedAt).split(' ')[0]}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl">Không có file đính kèm, chỉ có ghi chú.</p>
                                    )}
                                    
                                    {submission.note && (
                                        <div className="mt-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/30 border border-gray-100 dark:border-zinc-800">
                                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">GHI CHÚ</p>
                                             <div className="text-sm text-gray-700 dark:text-zinc-300">
                                                 {renderNoteWithLinks(submission.note)}
                                             </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-2xl">
                                    <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400 mb-3">
                                        <Upload size={24} />
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium text-center">Bạn chưa nộp bài tập này.</p>
                                    <p className="text-xs text-gray-400 text-center mt-1">Hạn nộp: {formatDateTime(submission.assignmentDueDate)}</p>
                                </div>
                            )}
                        </div>

                        {/* Feedback Card */}
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-700 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 sm:p-8">
                            <h3 className="text-base font-bold text-[#001D4A] dark:text-white flex items-center gap-3 mb-6">
                                <div className="text-fpt-orange">
                                    <MessageSquare className="fill-current w-5 h-5" />
                                </div>
                                Nhận xét giảng viên
                            </h3>

                            {submission.lecturerComment ? (
                                <div className="p-5 rounded-2xl bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center text-orange-600 dark:text-orange-200 font-bold shrink-0">
                                        GV
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                                            {submission.lecturerComment}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 px-6 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-2xl bg-gray-50/30 dark:bg-zinc-800/20">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400 mb-3">
                                        <MessageSquare size={20} className="fill-current opacity-50" />
                                    </div>
                                    <p className="text-gray-400 dark:text-zinc-500 italic text-sm font-medium">Chưa có nhận xét từ giảng viên</p>
                                </div>
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
