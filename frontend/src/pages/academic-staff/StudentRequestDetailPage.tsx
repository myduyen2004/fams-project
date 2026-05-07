import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    Mail,
    Loader2,
    BookOpen,
    GraduationCap,
    Download,
    AlertCircle
} from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { academicRequestService, AcademicRequest } from '../../services/api/academicRequestService';
import dayjs from 'dayjs';
import toast from "@utils/toast";
import { useWebSocket } from '../../hooks/useWebSocket';

export const StudentRequestDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [request, setRequest] = useState<AcademicRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [isApproverAvatarBroken, setIsApproverAvatarBroken] = useState(false);
    const [note, setNote] = useState('');

    const fetchRequest = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setIsApproverAvatarBroken(false);
            const data = await academicRequestService.getRequestById(parseInt(id));
            setRequest(data);
            setNote(data.approverNote || '');
        } catch (error) {
            console.error('Error fetching student request:', error);
            toast.error('Không tìm thấy yêu cầu');
            navigate('/academic-staff/requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequest();
    }, [id, navigate]);

    // WebSocket for real-time updates
    useWebSocket('/user/queue/notifications', (data: any) => {
        if (Array.isArray(data)) {
            const hasUpdate = data.some((notif: any) => notif.type === 'ACADEMIC');
            if (hasUpdate) {
                console.log('Real-time update: Academic request status changed');
                fetchRequest();
            }
        }
    });

    const handleUpdateStatus = async (status: 'APPROVED' | 'REJECTED') => {
        if (!request) return;
        try {
            setUpdating(true);
            await academicRequestService.updateStatus(request.id, status, note);
            toast.success(`Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} yêu cầu`);
            const updated = await academicRequestService.getRequestById(request.id);
            setRequest(updated);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Không thể cập nhật trạng thái');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <AcademicStaffLayout pageTitle="Chi tiết yêu cầu sinh viên">
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-fpt-orange" />
                </div>
            </AcademicStaffLayout>
        );
    }

    if (!request) return null;

    const currentUser = (() => {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw) as { fullName?: string; avatar?: string };
            return parsed;
        } catch {
            return null;
        }
    })();

    const approverAvatarUrl = request.approverAvatar
        || (request.approverName && currentUser?.fullName && request.approverName === currentUser.fullName ? currentUser.avatar : undefined);
    const showApproverAvatar = Boolean(approverAvatarUrl) && !isApproverAvatarBroken;
    const approverInitial = (request.approverName || '?').charAt(0).toUpperCase();

    const isPending = request.status === 'PENDING';
    const statusInfo = {
        label: request.statusLabel || request.status,
        color: request.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
            request.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-200' :
                request.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-200' :
                    'bg-gray-50 text-gray-600 border-gray-200',
        dot: request.status === 'PENDING' ? 'bg-amber-500' :
            request.status === 'APPROVED' ? 'bg-green-500' :
                request.status === 'REJECTED' ? 'bg-red-500' : 'bg-gray-500'
    };
    const isApproved = request.status === 'APPROVED';
    const isRejected = request.status === 'REJECTED';
    const approverActionText = isApproved ? 'Đã duyệt yêu cầu' : isRejected ? 'Đã từ chối yêu cầu' : 'Đã xử lý yêu cầu';
    const approverReasonText = request.approverNote?.trim()
        || (isApproved ? 'Yêu cầu đáp ứng điều kiện xử lý.' : isRejected ? 'Yêu cầu chưa đáp ứng điều kiện xử lý.' : 'Không có lý do.');
    const approverTheme = isRejected
        ? {
            avatar: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-600',
            card: 'bg-red-50/30 dark:bg-red-900/10 border-red-50 dark:border-red-900/20',
            action: 'text-red-600 dark:text-red-400'
        }
        : {
            avatar: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-600',
            card: 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-50 dark:border-emerald-900/20',
            action: 'text-emerald-600 dark:text-emerald-400'
        };

    return (
        <AcademicStaffLayout pageTitle="Chi tiết yêu cầu học thuật">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Top Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 no-print">
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/academic-staff/requests')}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-fpt-orange transition-all w-fit group"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Quay lại danh sách
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">Chi tiết yêu cầu học thuật</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content (Left) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Section 1: Thông tin yêu cầu */}
                        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-fpt-orange/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-fpt-orange rounded-full" />
                                    Thông tin yêu cầu
                                </h2>
                                <span className="px-4 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100 dark:border-blue-800 shadow-sm">
                                    {request.requestTypeLabel}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                <div className="space-y-1 md:col-span-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tiêu đề yêu cầu</p>
                                    <p className="text-lg font-bold text-gray-800 dark:text-zinc-200 leading-tight">{request.requestTitle}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thời gian tạo</p>
                                    <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">{dayjs(request.createdAt).format('DD/MM/YYYY HH:mm')}</p>
                                </div>
                                {request.semesterName && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Học kỳ</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">{request.semesterName} ({request.semesterCode})</p>
                                    </div>
                                )}
                                {request.courseName && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Môn học</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">{request.courseName} ({request.courseCode})</p>
                                    </div>
                                )}
                                {request.className && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lớp học hiện tại</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">{request.className}</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Section 2: Chi tiết nội dung */}
                        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3 relative z-10">
                                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                Nội dung chi tiết
                            </h2>

                            <div className="space-y-8 relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {request.toMajor && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ngành chuyển đến</p>
                                            <p className="text-sm font-bold text-gray-700 dark:text-zinc-200">{request.toMajor}</p>
                                        </div>
                                    )}
                                    {request.toSpecialization && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Chuyên ngành chuyển đến</p>
                                            <p className="text-sm font-bold text-gray-700 dark:text-zinc-200">{request.toSpecialization}</p>
                                        </div>
                                    )}
                                    {request.toSubSpecialization && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Chuyên ngành hẹp mục tiêu</p>
                                            <p className="text-sm font-bold text-gray-700 dark:text-zinc-200">{request.toSubSpecialization}</p>
                                        </div>
                                    )}
                                    {request.toClassName && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lớp chuyển đến</p>
                                            <p className="text-sm font-bold text-gray-700 dark:text-zinc-200">{request.toClassName}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lý do yêu cầu</p>
                                    <div className="p-5 bg-gray-50/50 dark:bg-zinc-800/50 rounded-2xl text-gray-700 dark:text-gray-300 text-sm leading-relaxed border border-gray-100 dark:border-zinc-800 italic">
                                        "{request.reason}"
                                    </div>
                                </div>

                                {request.fileUrl && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hồ sơ đính kèm</p>
                                        <a
                                            href={request.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-3 px-6 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all border border-blue-100 font-bold text-sm shadow-sm group/btn"
                                        >
                                            <Download size={18} className="group-hover/btn:translate-y-0.5 transition-transform" />
                                            Xem tài liệu minh chứng
                                        </a>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* History Card */}
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-orange-400 rounded-full" />
                                Lịch sử xử lý
                            </h3>

                            <div className="space-y-8 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-gray-100 dark:before:bg-zinc-800">
                                {request.status !== 'PENDING' && (
                                    <div className="relative pl-12">
                                        <div className={`absolute left-0 top-0 w-10 h-10 rounded-2xl border-2 flex items-center justify-center z-10 shadow-sm overflow-hidden ${approverTheme.avatar}`}>
                                            {showApproverAvatar ? (
                                                <img
                                                    src={approverAvatarUrl}
                                                    alt={request.approverName || 'avatar'}
                                                    className="w-full h-full object-cover"
                                                    onError={() => setIsApproverAvatarBroken(true)}
                                                />
                                            ) : (
                                                <span className="font-bold text-sm">{approverInitial}</span>
                                            )}
                                        </div>
                                        <div className={`p-5 rounded-2xl border ${approverTheme.card}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wide">
                                                    {request.approverName || 'Phòng Đào Tạo'}
                                                </p>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {request.approvedAt ? dayjs(request.approvedAt).format('DD/MM/YYYY - HH:mm') : '---'}
                                                </span>
                                            </div>
                                            <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${approverTheme.action}`}>
                                                {approverActionText}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-zinc-400 italic font-medium">
                                                Lý do: {approverReasonText}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {request.status === 'PENDING' && (
                                    <div className="relative pl-12">
                                        <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-2 border-amber-100 dark:border-amber-800 flex items-center justify-center z-10 shadow-sm animate-pulse">
                                            <Clock size={18} />
                                        </div>
                                        <div className="bg-amber-50/30 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-50 dark:border-amber-900/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wide">Hệ thống</p>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Đang chờ</span>
                                            </div>
                                            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Đang chờ bạn xử lý</p>
                                        </div>
                                    </div>
                                )}

                                <div className="relative pl-12">
                                    <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 z-10 shadow-sm overflow-hidden">
                                        {request.studentAvatar ? (
                                            <img src={request.studentAvatar} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="font-bold text-sm">{request.studentName?.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/30 border border-gray-100 dark:border-zinc-800 transition-colors hover:border-blue-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wide">{request.studentName}</p>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dayjs(request.createdAt).format('DD/MM/YYYY - HH:mm')}</span>
                                        </div>
                                        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">Đã tạo yêu cầu học thuật</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar (Right) */}
                    <div className="space-y-6">
                        {/* Student Info */}
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-all hover:shadow-md">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-8">Thông tin sinh viên</h3>
                            
                            <div className="flex flex-col items-center mb-8">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-3xl bg-fpt-orange/10 flex items-center justify-center text-fpt-orange text-3xl font-bold border-2 border-fpt-orange/20 overflow-hidden mb-4 shadow-xl transition-transform group-hover:scale-105 duration-300">
                                        {request.studentAvatar ? (
                                            <img src={request.studentAvatar} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{request.studentName?.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 border-4 border-white dark:border-zinc-900 rounded-full flex items-center justify-center text-white">
                                        <CheckCircle size={14} />
                                    </div>
                                </div>
                                <h4 className="text-xl font-black text-gray-900 dark:text-white mb-1 text-center">{request.studentName}</h4>
                                <p className="text-sm font-mono font-bold text-fpt-orange bg-orange-50 dark:bg-orange-900/20 px-4 py-1 rounded-full border border-orange-100 dark:border-orange-900/30">
                                    {request.studentCode}
                                </p>
                            </div>

                            <div className="space-y-4 pt-8 border-t border-gray-100 dark:border-zinc-800">
                                <div className="flex items-center gap-4 text-sm group/item">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center text-gray-400 group-hover/item:text-fpt-orange transition-colors">
                                        <GraduationCap size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lớp học - Ngành</span>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {request.className ? `${request.className} - ` : ''}{request.studentMajor || '---'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm group/item">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center text-gray-400 group-hover/item:text-fpt-orange transition-colors">
                                        <BookOpen size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Chuyên ngành</span>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {request.studentSpecialization || '---'} 
                                            {request.studentSubSpecialization ? ` (${request.studentSubSpecialization})` : ''}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm group/item">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center text-gray-400 group-hover/item:text-fpt-orange transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email liên hệ</span>
                                        <span className="font-bold text-fpt-orange truncate overflow-hidden" title={request.studentEmail}>
                                            {request.studentEmail || '---'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Processing Card */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6">Xử lý yêu cầu</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-2">Trạng thái hiện tại</label>
                                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${statusInfo.color}`}>
                                        <div className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                                        <span className="font-bold text-sm tracking-wide">{statusInfo.label}</span>
                                    </div>
                                </div>

                                {/* Universal Validation Info */}
                                {isPending && request.isApprovable === false && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl flex gap-3">
                                        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-red-700 dark:text-red-400">Không thể thực hiện phê duyệt</p>
                                            <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed">
                                                {request.validationMessage || request.transferError || 'Gặp lỗi trong quá trình kiểm tra điều kiện.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {isPending && request.isApprovable === true && request.requestType === 'CHANGE_CLASS' && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-xl flex gap-3">
                                        <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-green-700 dark:text-green-400">Điều kiện hợp lệ</p>
                                            <p className="text-xs text-green-600 dark:text-green-300 leading-relaxed">
                                                Sinh viên có thể chuyển qua lớp mới.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {isPending ? (
                                    <>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 block mb-2">Ghi chú / Phản hồi</label>
                                            <textarea
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                placeholder="Nhập lý do phê duyệt hoặc từ chối..."
                                                className="w-full h-32 p-4 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-fpt-orange focus:border-transparent outline-none transition-all resize-none"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-3 pt-2">
                                            <button
                                                onClick={() => handleUpdateStatus('APPROVED')}
                                                disabled={updating || request.isApprovable === false}
                                                className="w-full py-3 bg-fpt-orange hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg border border-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:border-gray-400 disabled:shadow-none"
                                            >
                                                {updating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                                Duyệt yêu cầu
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus('REJECTED')}
                                                disabled={updating}
                                                className="w-full py-3 bg-white dark:bg-zinc-800 text-red-600 font-bold rounded-xl border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                Từ chối
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-700">
                                        <p className="text-xs text-gray-500 mb-2">Ghi chú từ người phê duyệt</p>
                                        <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                                            {request.approverNote || 'Không có ghi chú.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AcademicStaffLayout>
    );
};

