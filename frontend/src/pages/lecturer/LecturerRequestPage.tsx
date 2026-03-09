import React, { useState, useEffect } from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { REQUEST_TYPE_LABELS } from '../../types/requestType';
import { Eye, Loader2, ArrowLeft, XCircle } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { scheduleRequestService, ScheduleRequest } from '../../services/api/scheduleRequestService';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const LecturerRequestPage: React.FC = () => {
    const [requests, setRequests] = useState<ScheduleRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

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
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-white whitespace-nowrap">{label}</span>;
            case 'APPROVED':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white whitespace-nowrap">{label}</span>;
            case 'REJECTED':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white whitespace-nowrap">{label}</span>;
            case 'REVOKED':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-500 text-white whitespace-nowrap">{label}</span>;
            default:
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-400 text-white whitespace-nowrap">{label}</span>;
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
            <div className="flex flex-col gap-6">

                {/* Navigation and Title */}
                <div className="flex flex-col gap-2">
                    <Link to="/lecturer/dashboard" className="flex items-center gap-2 text-sm text-gray-500 hover:text-fpt-orange transition-colors w-fit">
                        <ArrowLeft size={16} />
                        Quay lại trang dashboard
                    </Link>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý yêu cầu</h1>
                        <Link to="/lecturer/requests/create" className="bg-fpt-orange hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                            Tạo yêu cầu
                        </Link>
                    </div>
                </div>

                {/* Stats Cards Removed */}

                {/* Table */}
                <Card className="border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-fpt-orange border-b border-fpt-orange">
                                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/20">Lớp học</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/20">Phòng ban đầu</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/20">Slot ban đầu</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/20">Slot yêu cầu</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/20">Loại yêu cầu</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/20">Trạng thái</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/20">Ngày tạo</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-white uppercase tracking-wider text-center w-24 whitespace-nowrap">Hành động</th>
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
                                                        onClick={() => {
                                                            if (window.confirm('Bạn có chắc chắn muốn thu hồi đơn yêu cầu này?')) {
                                                                scheduleRequestService.revokeRequest(req.id)
                                                                    .then(() => {
                                                                        toast.success('Đã thu hồi đơn yêu cầu thành công');
                                                                        fetchRequests();
                                                                    })
                                                                    .catch(() => toast.error('Lỗi khi thu hồi đơn yêu cầu'));
                                                            }
                                                        }}
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
                </Card>
            </div>
        </LecturerLayout>
    );
};
