import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { REQUEST_TYPE_LABELS } from '../../types/requestType';
import { scheduleRequestService, ScheduleRequest } from '../../services/api/scheduleRequestService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import { 
    Loader2, 
    ArrowLeft, 
    FileText, 
    XCircle, 
    CheckCircle, 
    Clock, 
    User, 
    Mail, 
    GraduationCap
} from 'lucide-react';
import dayjs from 'dayjs';
import toast from "@utils/toast";
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const LecturerRequestDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<ScheduleRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);

    // Get user info from local storage since it's not in the request object for lecturers
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    const displayRequester = {
        name: user?.name || 'Giảng viên',
        code: user?.code || '---',
        avatar: user?.avatar || '',
        major: user?.major || 'Học viện FPT',
        email: user?.email || '---'
    };

    const handleRevokeConfirm = async () => {
        if (!request || isRevoking) {
            return;
        }

        setIsRevoking(true);
        // Close modal immediately to avoid repeated clicks while request is in-flight.
        setIsRevokeModalOpen(false);

        try {
            await scheduleRequestService.revokeRequest(request.id);
            toast.success('Đã thu hồi đơn yêu cầu thành công');
            const updatedRequest = await scheduleRequestService.getRequestById(Number(id));
            setRequest(updatedRequest);
        } catch {
            toast.error('Lỗi khi thu hồi đơn yêu cầu');
        } finally {
            setIsRevoking(false);
        }
    };

    useEffect(() => {
        const fetchRequest = async () => {
            if (!id) return;
            try {
                const data = await scheduleRequestService.getRequestById(Number(id));
                setRequest(data);
            } catch (error) {
                console.error(error);
                toast.error('Không thể tải chi tiết yêu cầu');
            } finally {
                setLoading(false);
            }
        };
        fetchRequest();
    }, [id]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Không có';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    if (loading) {
        return (
            <LecturerLayout pageTitle="Chi tiết yêu cầu">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-fpt-orange" size={32} />
                        <span className="text-gray-500">Đang tải thông tin...</span>
                    </div>
                </div>
            </LecturerLayout>
        );
    }

    if (!request) {
        return (
            <LecturerLayout pageTitle="Chi tiết yêu cầu">
                <div className="text-center py-10">
                    <p className="text-gray-500">Không tìm thấy yêu cầu.</p>
                    <Link to="/lecturer/requests" className="text-fpt-orange hover:underline mt-4 inline-block">
                        Quay lại danh sách
                    </Link>
                </div>
            </LecturerLayout>
        );
    }

    return (
        <LecturerLayout pageTitle="Chi tiết yêu cầu">
            <div className="max-w-7xl mx-auto w-full space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex flex-col gap-3">
                        <Link to="/lecturer/requests" className="flex items-center gap-2 text-sm text-gray-400 hover:text-fpt-orange transition-all w-fit group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Quay lại danh sách
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">Chi tiết yêu cầu thay đổi lịch dạy</h1>
                    </div>
                    {request.status === 'PENDING' && (
                        <button
                            onClick={() => setIsRevokeModalOpen(true)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-2.5 px-6 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2 border border-rose-100"
                        >
                            <XCircle size={18} />
                            Thu hồi đơn
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        {/* General Info */}
                        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                    Thông tin chung
                                </h2>
                                <span className="px-4 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100 dark:border-blue-800">
                                    {REQUEST_TYPE_LABELS[request.type] || request.typeLabel}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lớp học / Nhóm</p>
                                    <p className="text-lg font-bold text-gray-800 dark:text-zinc-200">{request.className}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ngày tạo đơn</p>
                                    <p className="text-lg font-bold text-gray-800 dark:text-zinc-200">{formatDate(request.createdAt)}</p>
                                </div>
                            </div>
                        </section>

                        {/* Change Details */}
                        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3 relative z-10">
                                <div className="w-1.5 h-6 bg-fpt-orange rounded-full" />
                                Chi tiết thay đổi
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                {/* Ban đầu */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                        Thông tin hiện tại
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-70">Ngày</p>
                                            <p className="font-bold text-gray-700 dark:text-zinc-300">
                                                {request.originalDate ? new Date(request.originalDate).toLocaleDateString('vi-VN') : '---'}
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

                                {/* Yêu cầu */}
                                <div className="space-y-6 bg-orange-50/30 dark:bg-orange-950/10 p-6 rounded-2xl border border-orange-100/50 dark:border-orange-900/20">
                                    <h3 className="text-xs font-bold text-fpt-orange uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-fpt-orange" />
                                        Thông tin đề xuất
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Ngày mới</p>
                                            <p className="font-bold text-orange-900 dark:text-orange-200">
                                                {request.requestedDate ? new Date(request.requestedDate).toLocaleDateString('vi-VN') : '---'}
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

                        {/* Content & Documents */}
                        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                Nội dung & Tài liệu
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Lý do thay đổi</p>
                                    <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl text-gray-600 dark:text-gray-300 text-sm leading-relaxed border border-gray-100 dark:border-zinc-700 italic">
                                        "{request.reason}"
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                                        TÀI LIỆU ĐÍNH KÈM ({request.file ? (request.file.startsWith('[') ? JSON.parse(request.file).length : 1) : 0})
                                    </h3>
                                    {request.file ? (() => {
                                        let fileUrls: string[] = [];
                                        try {
                                            const parsed = JSON.parse(request.file);
                                            fileUrls = Array.isArray(parsed) ? parsed : [request.file];
                                        } catch {
                                            fileUrls = [request.file];
                                        }

                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                                            className="bg-white dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 rounded-2xl p-4 hover:border-fpt-orange hover:shadow-md transition-all cursor-pointer group flex items-center gap-4"
                                                        >
                                                            <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 text-gray-400 group-hover:text-fpt-orange transition-colors">
                                                                <FileText size={20} />
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                                <span className="text-gray-900 dark:text-white font-bold text-sm truncate group-hover:text-fpt-orange transition-colors" title={fileName}>
                                                                    {fileName.length > 18 ? fileName.substring(0, 15) + '...' : fileName}
                                                                </span>
                                                                <span className="text-blue-500 dark:text-blue-400 text-[10px] font-bold uppercase">
                                                                    {extension} File
                                                                </span>
                                                            </div>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })() : (
                                        <div className="text-sm text-gray-400 italic">Không có file đính kèm</div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* History Card */}
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-orange-400 rounded-full" />
                                Lịch sử xử lý
                            </h3>

                            <div className="space-y-8 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-gray-100 dark:before:bg-zinc-800">
                                {/* Processed Step */}
                                {request.status !== 'PENDING' && request.status !== 'REVOKED' && (
                                    <div className="relative pl-12">
                                        <div className={`absolute left-0 top-0 w-10 h-10 rounded-2xl flex items-center justify-center z-10 shadow-sm border-2 ${
                                            request.status === 'APPROVED' 
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-800' 
                                            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 border-rose-100 dark:border-rose-800'
                                        }`}>
                                            {request.status === 'APPROVED' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                        </div>
                                        <div className={`p-5 rounded-2xl border ${
                                            request.status === 'APPROVED'
                                            ? 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-50 dark:border-emerald-900/20'
                                            : 'bg-rose-50/30 dark:bg-rose-900/10 border-rose-50 dark:border-rose-900/20'
                                        }`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wide">
                                                    {request.approverName || 'Phòng Đào Tạo'}
                                                </p>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {request.approvedAt ? dayjs(request.approvedAt).format('DD/MM/YYYY - HH:mm') : '---'}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                                {request.status === 'APPROVED' ? 'Đã phê duyệt yêu cầu' : 'Đã từ chối yêu cầu'}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-zinc-400 italic font-medium">
                                                "{request.approverNote || 'Không có ghi chú thêm.'}"
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
                                                <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wide">Giảng viên (Bạn)</p>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {dayjs(request.createdAt).format('DD/MM/YYYY - HH:mm')}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Đã thu hồi yêu cầu</p>
                                        </div>
                                    </div>
                                )}

                                {/* Pending Step (if still pending) */}
                                {request.status === 'PENDING' && (
                                    <div className="relative pl-12">
                                        <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-2 border-amber-100 dark:border-amber-800 flex items-center justify-center z-10 shadow-sm animate-pulse">
                                            <Clock size={18} />
                                        </div>
                                        <div className="bg-amber-50/30 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-50 dark:border-amber-900/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wide">Hệ thống</p>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hiện tại</span>
                                            </div>
                                            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Đang chờ xử lý từ Phòng Đào Tạo</p>
                                        </div>
                                    </div>
                                )}

                                {/* Initial Request */}
                                <div className="relative pl-12">
                                    <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 z-10 shadow-sm overflow-hidden">
                                        {displayRequester.avatar ? (
                                            <img src={displayRequester.avatar} alt={displayRequester.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="font-bold text-sm">{displayRequester.name.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/30 border border-gray-100 dark:border-zinc-800 transition-colors hover:border-blue-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wide">{displayRequester.name}</p>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dayjs(request.createdAt).format('DD/MM/YYYY - HH:mm')}</span>
                                        </div>
                                        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">Đã gửi yêu cầu thay đổi lịch dạy</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-8">
                        {/* Lecturer Info Card */}
                        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 transition-all hover:shadow-md">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-8">Thông tin giảng viên</h3>
                            
                            <div className="flex flex-col items-center mb-8">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-3xl bg-fpt-orange/10 flex items-center justify-center text-fpt-orange text-3xl font-bold border-2 border-fpt-orange/20 overflow-hidden mb-4 shadow-xl transition-transform group-hover:scale-105 duration-300">
                                        {displayRequester.avatar ? (
                                            <img src={displayRequester.avatar} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{displayRequester.name.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 border-4 border-white dark:border-zinc-900 rounded-full flex items-center justify-center text-white">
                                        <CheckCircle size={14} />
                                    </div>
                                </div>
                                <h4 className="text-xl font-black text-gray-900 dark:text-white mb-1 text-center">{displayRequester.name}</h4>
                                <p className="text-sm font-mono font-bold text-fpt-orange bg-orange-50 dark:bg-orange-900/20 px-4 py-1 rounded-full border border-orange-100 dark:border-orange-900/30">
                                    {displayRequester.code}
                                </p>
                            </div>

                            <div className="space-y-4 pt-8 border-t border-gray-100 dark:border-zinc-800">
                                <div className="flex items-center gap-4 text-sm group/item">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center text-gray-400 group-hover/item:text-fpt-orange transition-colors">
                                        <User size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vai trò</span>
                                        <span className="font-bold text-gray-900 dark:text-white">Giảng viên</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm group/item">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center text-gray-400 group-hover/item:text-fpt-orange transition-colors">
                                        <GraduationCap size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bộ môn</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{displayRequester.major}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm group/item">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center text-gray-400 group-hover/item:text-fpt-orange transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email liên hệ</span>
                                        <span className="font-bold text-fpt-orange truncate overflow-hidden" title={displayRequester.email}>
                                            {displayRequester.email}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Status Summary & Actions */}
                        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 sticky top-8">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-orange-400 rounded-full" />
                                Phê duyệt
                            </h2>

                            <div className="mb-8 text-center p-8 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 rounded-3xl border border-orange-100 dark:border-orange-900/30">
                                <p className="text-[10px] font-bold text-fpt-orange uppercase tracking-widest mb-4">TRẠNG THÁI HIỆN TẠI</p>
                                <span className={`inline-block px-8 py-3 rounded-2xl text-lg font-bold shadow-xl text-white ${
                                    request.status === 'APPROVED' ? 'bg-emerald-500 shadow-emerald-500/20' :
                                    request.status === 'REJECTED' ? 'bg-rose-500 shadow-rose-500/20' :
                                    request.status === 'REVOKED' ? 'bg-slate-500 shadow-slate-500/20' :
                                    'bg-fpt-orange shadow-orange-500/20'
                                }`}>
                                    {request.statusLabel}
                                </span>
                            </div>

                            <div className="space-y-6">
                                <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">NGƯỜI PHÊ DUYỆT</p>
                                    <p className="font-bold text-gray-700 dark:text-zinc-300">
                                        {request.approverName || <span className="italic text-gray-400 font-medium text-sm">Chưa có thông tin</span>}
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">THỜI GIAN PHÊ DUYỆT</p>
                                    <p className="font-bold text-gray-700 dark:text-zinc-300">
                                        {formatDate(request.approvedAt)}
                                    </p>
                                </div>

                                <div className="border-t border-gray-100 dark:border-zinc-800 pt-6">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">GHI CHÚ HỆ THỐNG</p>
                                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl text-sm text-gray-500 dark:text-zinc-400 italic leading-relaxed border border-slate-100 dark:border-zinc-700">
                                        {request.approverNote || (request.status === 'PENDING' ? 'Đang chờ xử lý từ Phòng Đào Tạo.' : 'Không có ghi chú thêm.')}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div >

            <ConfirmModal
                isOpen={isRevokeModalOpen}
                onClose={() => setIsRevokeModalOpen(false)}
                onConfirm={handleRevokeConfirm}
                title="Xác nhận thu hồi"
                message="Bạn có chắc chắn muốn thu hồi đơn yêu cầu thay đổi lịch dạy này không?"
                confirmLabel="Thu hồi"
                cancelLabel="Hủy"
                type="danger"
                isLoading={isRevoking}
            />
        </LecturerLayout >
    );
};

