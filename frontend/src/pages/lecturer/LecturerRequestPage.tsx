import React, { useState, useEffect } from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { REQUEST_TYPE_LABELS } from '../../types/requestType';
import { Eye, Loader2, ArrowLeft, XCircle, CheckCircle, FileText } from 'lucide-react';
import { scheduleRequestService, ScheduleRequest } from '../../services/api/scheduleRequestService';
import toast from "@utils/toast";
import { Link } from 'react-router-dom';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const LecturerRequestPage: React.FC = () => {
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
        // Close modal immediately to prevent repeated confirm clicks while waiting API.
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
                        <CheckCircle size={12} />
                        {label}
                    </span>
                );
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/40">
                        <XCircle size={12} />
                        {label}
                    </span>
                );
            case 'REVOKED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-900/40">
                        <ArrowLeft size={12} />
                        {label}
                    </span>
                );
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold uppercase rounded-full">{label}</span>;
        }
    };

    // Format Date: dd/MM/yyyy HH:mm
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
        <LecturerLayout pageTitle="Quản lý Yêu cầu">
            <div className="flex flex-col gap-8">

                {/* Header Section */}
                <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-fpt-orange">
                            <Eye size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Danh sách yêu cầu</h1>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">Quản lý và theo dõi các yêu cầu thay đổi lịch dạy của bạn</p>
                        </div>
                    </div>
                    <Link to="/lecturer/requests/create" className="bg-gradient-to-r from-fpt-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-2">
                        Tạo yêu cầu mới
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 group hover:border-orange-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tổng yêu cầu</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalElements}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 group hover:border-amber-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                                <Loader2 size={20} className="animate-spin" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đang chờ</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{requests.filter(r => r.status === 'PENDING').length}</h3>
                                <p className="text-[10px] text-gray-400 italic">Trang hiện tại</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 group hover:border-emerald-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đã duyệt</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{requests.filter(r => r.status === 'APPROVED').length}</h3>
                                <p className="text-[10px] text-gray-400 italic">Trang hiện tại</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 group hover:border-rose-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600">
                                <XCircle size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bị từ chối</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{requests.filter(r => r.status === 'REJECTED').length}</h3>
                                <p className="text-[10px] text-gray-400 italic">Trang hiện tại</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Lớp học</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Phòng hiện tại</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Slot hiện tại</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap text-orange-600">Slot yêu cầu</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Loại thay đổi</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Trạng thái</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Ngày tạo</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Tác vụ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="animate-spin text-fpt-orange" /> Đang tải dữ liệu...
                                            </div>
                                        </td>
                                    </tr>
                                ) : requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                                            Chưa có yêu cầu nào.
                                        </td>
                                    </tr>
                                ) : requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{req.className}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium text-center">
                                            {req.originalRoomName || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium text-center">
                                            {req.originalSlotNumber ? `Slot ${req.originalSlotNumber}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium text-center">
                                            {req.requestedSlotNumber ? `Slot ${req.requestedSlotNumber}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-700 dark:text-white">
                                                {REQUEST_TYPE_LABELS[req.type] || req.typeLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(req.status, req.statusLabel)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(req.createdAt)}</td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link to={`/lecturer/requests/${req.id}`} className="text-gray-500 hover:text-fpt-orange transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800" title="Xem chi tiết">
                                                    <Eye size={20} />
                                                </Link>
                                                {req.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => setRevokingRequestId(req.id)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        title="Thu hồi đơn"
                                                    >
                                                        <XCircle size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalElements > 0 && (
                        <div className="flex justify-between items-center mt-4 px-4 pb-4 text-xs text-gray-500">
                            <div>
                                Hiển thị {page * 10 + 1} đến {Math.min((page + 1) * 10, totalElements)} trong số{' '}
                                <strong>{totalElements}</strong> yêu cầu
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(Math.max(0, page - 1))}
                                    disabled={page === 0}
                                    className="px-2 py-1 hover:text-orange-500 transition disabled:text-gray-300"
                                >
                                    Trước
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-8 h-8 flex items-center justify-center rounded font-medium transition ${page === p
                                            ? 'bg-orange-500 text-white shadow-sm'
                                            : 'hover:bg-gray-50 text-gray-600'
                                            }`}
                                    >
                                        {p + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="px-2 py-1 hover:text-orange-500 transition disabled:text-gray-300"
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={revokingRequestId !== null}
                onClose={() => setRevokingRequestId(null)}
                onConfirm={handleRevokeConfirm}
                title="Xác nhận thu hồi"
                message="Bạn có chắc chắn muốn thu hồi đơn yêu cầu thay đổi lịch dạy này không?"
                confirmLabel="Thu hồi"
                cancelLabel="Hủy"
                type="danger"
                isLoading={isRevoking}
            />
        </LecturerLayout>
    );
};

