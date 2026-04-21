import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Printer,
    CheckCircle,
    XCircle,
    Clock,
    User,
    Mail,
    GraduationCap,
    Loader2,
    FileText
} from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { academicStaffService, ScheduleRequestResponse } from '../../services/api/academicStaffService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

export const RequestDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [request, setRequest] = useState<ScheduleRequestResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [isRequesterAvatarBroken, setIsRequesterAvatarBroken] = useState(false);
    const [isApproverAvatarBroken, setIsApproverAvatarBroken] = useState(false);
    const [note, setNote] = useState('');
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        status: 'APPROVED' | 'REJECTED' | null;
    }>({ isOpen: false, status: null });

    useEffect(() => {
        const fetchRequest = async () => {
            if (!id) return;
            try {
                setLoading(true);
                setIsRequesterAvatarBroken(false);
                setIsApproverAvatarBroken(false);
                const data = await academicStaffService.getScheduleRequestById(parseInt(id));
                setRequest(data);
                setNote(data.approverNote || '');
            } catch (error) {
                console.error('Error fetching request:', error);
                toast.error('Không tìm thấy yêu cầu');
                navigate('/academic-staff/requests');
            } finally {
                setLoading(false);
            }
        };
        fetchRequest();
    }, [id, navigate]);

    const handleUpdateStatus = async (status: 'APPROVED' | 'REJECTED') => {
        if (!request) return;
        setConfirmModal({ isOpen: false, status: null });
        try {
            setUpdating(true);
            await academicStaffService.updateScheduleRequestStatus(request.id, status, note);
            toast.success(`Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} yêu cầu`);
            const updated = await academicStaffService.getScheduleRequestById(request.id);
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
            <AcademicStaffLayout pageTitle="Chi tiết yêu cầu">
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

    const requesterInitial = (request.requesterName || '?').charAt(0).toUpperCase();
    const approverInitial = (request.approverName || '?').charAt(0).toUpperCase();
    const showRequesterAvatar = Boolean(request.requesterAvatar) && !isRequesterAvatarBroken;
    const approverAvatarUrl = request.approverAvatar
        || (request.approverName && currentUser?.fullName && request.approverName === currentUser.fullName ? currentUser.avatar : undefined);
    const showApproverAvatar = Boolean(approverAvatarUrl) && !isApproverAvatarBroken;

    const isPending = request.status === 'PENDING';
    const statusInfo = {
        label: request.status === 'PENDING' ? 'Đang xử lý' : request.status === 'APPROVED' ? 'Đã duyệt' : request.status === 'REVOKED' ? 'Đã thu hồi' : 'Đã từ chối',
        color: request.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
            request.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-200' :
                request.status === 'REVOKED' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                    'bg-red-50 text-red-600 border-red-200',
        dot: request.status === 'PENDING' ? 'bg-amber-500' : request.status === 'APPROVED' ? 'bg-green-500' : request.status === 'REVOKED' ? 'bg-gray-500' : 'bg-red-500'
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
        <AcademicStaffLayout pageTitle="Chi tiết yêu cầu thay đổi lịch dạy">
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
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">Chi tiết yêu cầu thay đổi lịch dạy</h1>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-fpt-orange font-bold text-sm rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 shadow-sm transition-all border border-amber-100 dark:border-amber-900/30 active:scale-95"
                    >
                        <Printer size={18} />
                        In phiếu yêu cầu
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content (Left) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Section 1: Thông tin chung */}
                        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                    Thông tin chung
                                </h2>
                                <span className="px-4 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100 dark:border-blue-800 shadow-sm">
                                    {request.typeLabel}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lớp học / Nhóm</p>
                                    <p className="text-lg font-bold text-gray-800 dark:text-zinc-200">{request.className}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thời gian tạo</p>
                                    <p className="text-lg font-bold text-gray-800 dark:text-zinc-200">{dayjs(request.createdAt).format('DD/MM/YYYY HH:mm')}</p>
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Chi tiết thay đổi */}
                        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3 relative z-10">
                                <div className="w-1.5 h-6 bg-fpt-orange rounded-full" />
                                Chi tiết thay đổi
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                {/* Hiện tại */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                        Thông tin hiện tại
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-70">Ngày</p>
                                            <p className="font-bold text-gray-700 dark:text-zinc-300">
                                                {request.originalDate ? dayjs(request.originalDate).format('DD/MM/YYYY') : '---'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-70">Slot</p>
                                            <p className="font-bold text-gray-700 dark:text-zinc-300">
                                                {request.originalSlotNumber ? `Slot ${request.originalSlotNumber}` : (request.originalSlotInfo || '---')}
                                            </p>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-70">Phòng học</p>
                                            <p className="font-bold text-gray-700 dark:text-zinc-300">
                                                {request.originalRoomName || '---'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Đề xuất */}
                                <div className="space-y-6 bg-orange-50/30 dark:bg-orange-950/10 p-6 rounded-2xl border border-orange-100/50 dark:border-orange-900/20">
                                    <h3 className="text-xs font-bold text-fpt-orange uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-fpt-orange" />
                                        Thông tin đề xuất
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Ngày mới</p>
                                            <p className="font-bold text-orange-900 dark:text-orange-200">
                                                {request.requestedDate ? dayjs(request.requestedDate).format('DD/MM/YYYY') : '---'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Slot mới</p>
                                            <p className="font-bold text-orange-900 dark:text-orange-200">
                                                {request.requestedSlotNumber ? `Slot ${request.requestedSlotNumber}` : (request.requestedSlotInfo || '---')}
                                            </p>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Phòng mới</p>
                                            <p className="font-bold text-orange-900 dark:text-orange-200">
                                                {request.requestedRoomName || 'Không đổi'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 3: Nội dung & Tài liệu */}
                        <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Nội dung & Tài liệu</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Lý do thay đổi</p>
                                    <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg text-gray-600 dark:text-gray-300 text-sm leading-relaxed border border-gray-100 dark:border-zinc-700">
                                        {request.reason}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">
                                        Tài liệu đính kèm ({request.file ? (request.file.startsWith('[') ? JSON.parse(request.file).length : 1) : 0})
                                    </h3>
                                    {request.file ? (() => {
                                        // Try to parse as JSON array, fallback to single file
                                        let fileUrls: string[] = [];
                                        try {
                                            const parsed = JSON.parse(request.file);
                                            fileUrls = Array.isArray(parsed) ? parsed : [request.file];
                                        } catch {
                                            fileUrls = [request.file];
                                        }

                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {fileUrls.map((url, index) => {
                                                    let fileName = 'unknown-file';
                                                    try {
                                                        const decodedUrl = decodeURIComponent(url);
                                                        fileName = decodedUrl.split('/').pop()?.split('?')[0] || 'unknown-file';
                                                    } catch (e) {
                                                        fileName = url.split('/').pop() || 'unknown-file';
                                                    }
                                                    const extension = fileName.split('.').pop()?.toUpperCase() || 'FILE';

                                                    return (
                                                        <a
                                                            key={index}
                                                            href={getViewableFileUrl(url)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-800 dark:to-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-4 hover:border-fpt-orange hover:shadow-md transition-all cursor-pointer group flex items-center gap-3"
                                                        >
                                                            <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-slate-500 group-hover:text-fpt-orange transition-colors">
                                                                <FileText size={22} />
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                                <span className="text-slate-800 dark:text-white font-medium text-sm truncate group-hover:text-fpt-orange transition-colors" title={fileName}>
                                                                    {fileName.length > 18 ? fileName.substring(0, 15) + '...' : fileName}
                                                                </span>
                                                                <span className="text-blue-500 dark:text-blue-400 text-xs font-medium">
                                                                    {extension} File
                                                                </span>
                                                            </div>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })() : (
                                        <div className="text-sm text-gray-500 dark:text-gray-400 italic">Không có file đính kèm</div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Section 4: History Card */}
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-orange-400 rounded-full" />
                                Lịch sử xử lý
                            </h3>

                            <div className="space-y-8 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-gray-100 dark:before:bg-zinc-800">
                                {/* Processed Step */}
                                {request.status !== 'PENDING' && request.status !== 'REVOKED' && (
                                    <div className="relative pl-12">
                                        <div className={`absolute left-0 top-0 w-10 h-10 rounded-2xl border-2 flex items-center justify-center z-10 shadow-sm overflow-hidden font-bold text-sm ${approverTheme.avatar}`}>
                                            {showApproverAvatar ? (
                                                <img
                                                    src={getViewableFileUrl(approverAvatarUrl || '')}
                                                    alt={request.approverName || 'avatar'}
                                                    className="w-full h-full object-cover"
                                                    onError={() => setIsApproverAvatarBroken(true)}
                                                />
                                            ) : (
                                                <span>{approverInitial}</span>
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

                                {/* Revoked Step */}
                                {request.status === 'REVOKED' && (
                                    <div className="relative pl-12">
                                        <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-900 text-zinc-600 border-2 border-zinc-100 dark:border-zinc-800 flex items-center justify-center z-10 shadow-sm">
                                            <XCircle size={18} />
                                        </div>
                                        <div className="bg-zinc-50/50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wide">Người yêu cầu</p>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {dayjs(request.createdAt).format('DD/MM/YYYY - HH:mm')}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Đã thu hồi yêu cầu</p>
                                        </div>
                                    </div>
                                )}

                                {/* Pending Step (Visual indicator for Staff) */}
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

                                {/* Initial Request */}
                                <div className="relative pl-12">
                                    <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 z-10 shadow-sm font-bold text-sm overflow-hidden">
                                        {showRequesterAvatar ? (
                                            <img
                                                src={getViewableFileUrl(request.requesterAvatar)}
                                                alt={request.requesterName || 'avatar'}
                                                className="w-full h-full object-cover"
                                                onError={() => setIsRequesterAvatarBroken(true)}
                                            />
                                        ) : (
                                            <span>{requesterInitial}</span>
                                        )}
                                    </div>
                                    <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/30 border border-gray-100 dark:border-zinc-800">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wide">{request.requesterName}</p>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dayjs(request.createdAt).format('DD/MM/YYYY - HH:mm')}</span>
                                        </div>
                                        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">Đã tạo yêu cầu thay đổi lịch dạy</p>
                                    </div>
                                </div>
                            </div>
                        </div>




                    </div>

                    {/* Sidebar (Right) */}
                    <div className="space-y-6">
                        {/* Requester Info */}
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-all hover:shadow-md">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-8">Thông tin {request.requesterRole === 'STUDENT' ? 'sinh viên' : 'giảng viên'}</h3>
                            <div className="flex flex-col items-center mb-8">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-3xl bg-fpt-orange/10 flex items-center justify-center text-fpt-orange text-3xl font-bold border-2 border-fpt-orange/20 overflow-hidden mb-4 shadow-xl transition-transform group-hover:scale-105 duration-300">
                                        {showRequesterAvatar ? (
                                            <img
                                                src={request.requesterAvatar}
                                                alt={request.requesterName || 'avatar'}
                                                className="w-full h-full object-cover"
                                                onError={() => setIsRequesterAvatarBroken(true)}
                                            />
                                        ) : (
                                            <span>{requesterInitial}</span>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 border-4 border-white dark:border-zinc-900 rounded-full flex items-center justify-center text-white">
                                        <CheckCircle size={14} />
                                    </div>
                                </div>
                                <h4 className="text-xl font-black text-gray-900 dark:text-white mb-1 text-center">{request.requesterName}</h4>
                                <p className="text-sm font-mono font-bold text-fpt-orange bg-orange-50 dark:bg-orange-900/20 px-4 py-1 rounded-full border border-orange-100 dark:border-orange-900/30">
                                    {request.requesterCode}
                                </p>
                            </div>

                            <div className="space-y-4 pt-8 border-t border-gray-100 dark:border-zinc-800">
                                <div className="flex items-center gap-4 text-sm group/item">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center text-gray-400 group-hover/item:text-fpt-orange transition-colors">
                                        <User size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vai trò</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{request.requesterRole === 'STUDENT' ? 'Sinh viên' : 'Giảng viên'}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm group/item">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center text-gray-400 group-hover/item:text-fpt-orange transition-colors">
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lớp học</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{request.className || '---'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm group/item">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center text-gray-400 group-hover/item:text-fpt-orange transition-colors">
                                        <GraduationCap size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{request.requesterRole === 'STUDENT' ? 'Ngành học' : 'Bộ môn'}</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{request.requesterMajor || '---'}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 text-sm bg-gray-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-zinc-800 mt-2 min-w-0">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase">Email liên hệ</span>
                                    <span className="font-semibold text-fpt-orange break-all leading-5" title={request.requesterEmail}>
                                        {request.requesterEmail || '---'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Control Panel */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6">Xử lý yêu cầu</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-2">Trạng thái hiện tại</label>
                                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${statusInfo.color}`}>
                                        <div className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`} />
                                        <span className="font-bold text-sm tracking-wide">{statusInfo.label}</span>
                                    </div>
                                </div>

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
                                                onClick={() => setConfirmModal({ isOpen: true, status: 'APPROVED' })}
                                                disabled={updating}
                                                className="w-full py-3 bg-fpt-orange hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg border border-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle size={18} />
                                                Duyệt
                                            </button>
                                            <button
                                                onClick={() => setConfirmModal({ isOpen: true, status: 'REJECTED' })}
                                                disabled={updating}
                                                className="w-full py-3 bg-white dark:bg-zinc-800 text-red-600 font-bold rounded-xl border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-95 transition-all flex items-center justify-center gap-2"
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

                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal({ isOpen: false, status: null })}
                    onConfirm={() => {
                        if (confirmModal.status) {
                            handleUpdateStatus(confirmModal.status);
                        }
                    }}
                    title={confirmModal.status === 'APPROVED' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                    message={confirmModal.status === 'APPROVED'
                        ? 'Bạn có chắc chắn muốn duyệt đơn yêu cầu thay đổi lịch dạy này không? Lịch dạy chính thức sẽ được cập nhật ngay lập tức.'
                        : 'Bạn có chắc chắn muốn từ chối đơn yêu cầu này không?'}
                    confirmLabel={confirmModal.status === 'APPROVED' ? 'Duyệt yêu cầu' : 'Từ chối yêu cầu'}
                    cancelLabel="Hủy"
                    type={confirmModal.status === 'APPROVED' ? 'success' : 'danger'}
                    isLoading={updating}
                />
            </div>

            {/* Print-only specialized Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        margin: 0.5cm 1cm;
                        size: A4;
                    }
                    
                    /* Reset body and html */
                    html, body {
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                        color: black !important;
                        font-family: Arial, sans-serif !important;
                        font-size: 12px !important;
                    }
                    
                    /* Hide the entire sidebar component */
                    .fixed.left-0.top-0.h-screen,
                    [class*="Sidebar"],
                    nav {
                        display: none !important;
                    }
                    
                    /* Hide sidebar spacer */
                    .w-16.flex-shrink-0 {
                        display: none !important;
                    }
                    
                    /* Hide CommonHeader */
                    .sticky.top-0.z-30,
                    header,
                    [class*="Header"] {
                        display: none !important;
                    }
                    
                    /* Hide buttons, no-print elements */
                    button, .no-print {
                        display: none !important;
                    }
                    
                    /* Fix layout container - remove flex and overflow */
                    .flex.h-screen.overflow-hidden {
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    
                    /* Fix main content container */
                    .flex.flex-col.flex-1.overflow-hidden {
                        display: block !important;
                        overflow: visible !important;
                    }
                    
                    /* Fix main element - remove overflow scrollbar */
                    main.flex-1.overflow-auto {
                        overflow: visible !important;
                        padding: 0 !important;
                    }
                    
                    /* Hide right sidebar column */
                    .grid.grid-cols-1.lg\\:grid-cols-3 > div:last-child:not(.lg\\:col-span-2) {
                        display: none !important;
                    }
                    
                    .max-w-7xl, .max-w-\\[1600px\\] {
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    .shadow-sm, .shadow-lg {
                        box-shadow: none !important;
                    }
                    .rounded-2xl, .rounded-xl {
                        border-radius: 4px !important;
                    }
                    .bg-white, .dark\\:bg-zinc-900, .bg-gray-50, .dark\\:bg-zinc-950 {
                        background: white !important;
                    }
                    .text-gray-900, .text-gray-600, .text-gray-700, .dark\\:text-white, .dark\\:text-zinc-400, .dark\\:text-gray-200 {
                        color: black !important;
                    }
                    .text-gray-400, .text-gray-500, .dark\\:text-gray-500 {
                        color: #666 !important;
                    }
                    .border, .border-gray-200, .border-gray-100, .dark\\:border-zinc-800 {
                        border: 1px solid #ddd !important;
                    }
                    
                    /* Grid layout for print */
                    .grid.grid-cols-1.lg\\:grid-cols-3 {
                        display: block !important;
                    }
                    .lg\\:col-span-2 {
                        width: 100% !important;
                    }
                    
                    /* Section spacing */
                    section, .space-y-6 > div {
                        margin-bottom: 16px !important;
                        page-break-inside: avoid !important;
                    }
                    
                    /* Hide avatar */
                    .w-20.h-20, .w-10.h-10 {
                        display: none !important;
                    }
                    
                    /* Badges */
                    .bg-amber-50, .bg-green-50, .bg-red-50, .bg-blue-100 {
                        background: #f5f5f5 !important;
                    }
                    .text-fpt-orange, .text-amber-600, .text-green-600, .text-red-600, .text-blue-600 {
                        color: black !important;
                        font-weight: bold !important;
                    }
                    
                    h2, h3 {
                        color: black !important;
                        font-weight: bold !important;
                        font-size: 14px !important;
                    }
                    
                    .p-6, .p-8 {
                        padding: 12px !important;
                    }
                }
            `}} />
        </AcademicStaffLayout>
    );
};

export default RequestDetailPage;
