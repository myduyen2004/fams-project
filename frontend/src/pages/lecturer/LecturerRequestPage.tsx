import React, { useState, useEffect } from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { REQUEST_TYPE_LABELS } from '../../types/requestType';
import { Eye, Loader2, ArrowLeft, CheckCircle, XCircle, FileText, Plus } from 'lucide-react';
import { scheduleRequestService, ScheduleRequest } from '../../services/api/scheduleRequestService';
import toast from "@utils/toast";
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Pagination } from '../../components/common/Pagination';
import { useWebSocket } from '../../hooks/useWebSocket';

export const LecturerRequestPage: React.FC = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<ScheduleRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [revokingRequestId, setRevokingRequestId] = useState<number | null>(null);
    const [isRevoking, setIsRevoking] = useState(false);

    const handleRevokeConfirm = async () => {
        if (!revokingRequestId || isRevoking) {
            return;
        }

        const targetRequestId = revokingRequestId;
        setIsRevoking(true);
        setRevokingRequestId(null);

        try {
            await scheduleRequestService.revokeRequest(targetRequestId);
            toast.success('Đã thu hồi đơn yêu cầu thành công');
            await fetchRequests();
        } catch {
            toast.error('Lỗi khi thu hồi đơn yêu cầu');
        } finally {
            setIsRevoking(false);
        }
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await scheduleRequestService.getMyRequests(page);
            setRequests(data.content);
            setTotalPages(data.totalPages);
            setTotalElements(data.totalElements);
        } catch (error) {
            console.error(error);
            toast.error('Không thể tải danh sách yêu cầu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [page]);

    // WebSocket for real-time updates
    useWebSocket('/user/queue/notifications', (data: any) => {
        if (Array.isArray(data)) {
            const hasUpdate = data.some((notif: any) => 
                notif.type === 'ACADEMIC' || notif.type === 'SCHEDULE_CHANGE'
            );
            if (hasUpdate) {
                console.log('Real-time update: Request status changed');
                fetchRequests();
            }
        }
    });

    const getStatusBadge = (status: string, label: string) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/40">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {label}
                    </span>
                );
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/40">
                        <CheckCircle size={10} />
                        {label}
                    </span>
                );
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/40">
                        <XCircle size={10} />
                        {label}
                    </span>
                );
            case 'REVOKED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-900/40">
                        <ArrowLeft size={10} />
                        {label}
                    </span>
                );
            default:
                return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold uppercase rounded-full">{label}</span>;
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    return (
        <LecturerLayout pageTitle="Danh sách Yêu cầu">
            <div className="max-w-[1600px] mx-auto p-6 space-y-8 animate-in fade-in duration-500">
                {/* Header Section */}
                <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-fpt-orange">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Danh sách yêu cầu</h1>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Quản lý và theo dõi các yêu cầu thay đổi lịch dạy của bạn</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/lecturer/requests/create')}
                        className="flex h-[52px] items-center gap-2 rounded-2xl bg-fpt-orange px-8 text-sm font-bold text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-fpt-orange/20 transition-all whitespace-nowrap active:scale-95 shadow-lg shadow-fpt-orange/20"
                    >
                        <Plus size={20} strokeWidth={3} />
                        Tạo yêu cầu mới
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { 
                            label: 'Tổng yêu cầu', 
                            value: totalElements, 
                            icon: FileText, 
                            color: 'blue',
                            bg: 'bg-blue-50 dark:bg-blue-900/20',
                            text: 'text-blue-600 dark:text-blue-400'
                        },
                        { 
                            label: 'Đang chờ duyệt', 
                            value: requests.filter(r => r.status === 'PENDING').length, 
                            icon: Loader2, 
                            color: 'amber',
                            bg: 'bg-amber-50 dark:bg-amber-900/20',
                            text: 'text-amber-600 dark:text-amber-400',
                            animate: 'animate-spin'
                        },
                        { 
                            label: 'Đã phê duyệt', 
                            value: requests.filter(r => r.status === 'APPROVED').length, 
                            icon: CheckCircle, 
                            color: 'emerald',
                            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                            text: 'text-emerald-600 dark:text-emerald-400'
                        },
                        { 
                            label: 'Đã từ chối', 
                            value: requests.filter(r => r.status === 'REJECTED').length, 
                            icon: XCircle, 
                            color: 'rose',
                            bg: 'bg-rose-50 dark:bg-rose-900/20',
                            text: 'text-rose-600 dark:text-rose-400'
                        }
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 hover:border-orange-200 transition-all group">
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.text} group-hover:scale-110 transition-transform duration-300`}>
                                    <stat.icon size={26} className={stat.animate} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">
                                        {stat.label}
                                    </p>
                                    <h3 className="text-2xl font-black text-[#001D4A] dark:text-white">
                                        {stat.value}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table Container */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                                    <th className="px-4 py-5 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Lớp học</th>
                                    <th className="px-4 py-5 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Phòng hiện tại</th>
                                    <th className="px-4 py-5 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Slot hiện tại</th>
                                    <th className="px-4 py-5 text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Slot yêu cầu</th>
                                    <th className="px-4 py-5 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Loại thay đổi</th>
                                    <th className="px-4 py-5 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Trạng thái</th>
                                    <th className="px-4 py-5 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Ngày tạo</th>
                                    <th className="px-4 py-5 text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Tác vụ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="animate-spin text-fpt-orange w-10 h-10" />
                                                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                            Chưa có yêu cầu nào.
                                        </td>
                                    </tr>
                                ) : requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                {req.className}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                                                    {req.originalRoomName || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600 dark:text-zinc-400">
                                            {req.originalSlotNumber ? `Slot ${req.originalSlotNumber}` : '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-fpt-orange bg-fpt-orange/5 text-center">
                                            {req.requestedSlotNumber ? `Slot ${req.requestedSlotNumber}` : '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                                                {REQUEST_TYPE_LABELS[req.type] || req.typeLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(req.status, req.statusLabel)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(req.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/lecturer/requests/${req.id}`)}
                                                    className="p-2.5 text-gray-500 hover:text-fpt-orange hover:bg-orange-50 dark:hover:bg-zinc-800 rounded-xl transition-all border border-transparent hover:border-orange-100"
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {req.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => setRevokingRequestId(req.id)}
                                                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-100"
                                                        title="Thu hồi đơn"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Section */}
                    <div className="p-6 bg-gray-50/30 dark:bg-zinc-800/20 border-t border-gray-100 dark:border-zinc-800">
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            totalElements={totalElements}
                            pageSize={10}
                            onPageChange={(p) => setPage(p)}
                        />
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={revokingRequestId !== null}
                onClose={() => setRevokingRequestId(null)}
                onConfirm={handleRevokeConfirm}
                title="Xác nhận thu hồi"
                message="Bạn có chắc chắn muốn thu hồi đơn yêu cầu thay đổi lịch dạy này không? Hành động này không thể hoàn tác."
                confirmLabel="Thu hồi đơn"
                cancelLabel="Hủy"
                type="danger"
                isLoading={isRevoking}
            />
        </LecturerLayout>
    );
};

