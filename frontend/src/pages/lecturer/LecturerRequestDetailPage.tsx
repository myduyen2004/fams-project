import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { REQUEST_TYPE_LABELS } from '../../types/requestType';
import { scheduleRequestService, ScheduleRequest } from '../../services/api/scheduleRequestService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import { Loader2, ArrowLeft, FileText, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const LecturerRequestDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<ScheduleRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);

    const handleRevokeConfirm = () => {
        if (request) {
            setIsRevoking(true);
            scheduleRequestService.revokeRequest(request.id)
                .then(() => {
                    toast.success('Đã thu hồi đơn yêu cầu thành công');
                    setIsRevokeModalOpen(false);
                    scheduleRequestService.getRequestById(Number(id)).then(setRequest);
                })
                .catch(() => toast.error('Lỗi khi thu hồi đơn yêu cầu'))
                .finally(() => setIsRevoking(false));
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
            <div className="max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex flex-col gap-2">
                        <Link to="/lecturer/requests" className="flex items-center gap-2 text-sm text-gray-500 hover:text-fpt-orange transition-colors w-fit">
                            <ArrowLeft size={16} />
                            Quay lại danh sách
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chi tiết yêu cầu thay đổi lịch dạy</h1>
                    </div>
                    {request.status === 'PENDING' && (
                        <button
                            onClick={() => setIsRevokeModalOpen(true)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2 border border-red-200"
                        >
                            <XCircle size={18} />
                            Thu hồi đơn
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        {/* General Info */}
                        <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Thông tin chung</h2>
                                <span className="px-3 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {REQUEST_TYPE_LABELS[request.type] || request.typeLabel}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                                <div>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Lớp học</p>
                                    <p className="font-semibold text-gray-700 dark:text-gray-200">{request.className}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Ngày tạo</p>
                                    <p className="font-semibold text-gray-700 dark:text-gray-200">{formatDate(request.createdAt)}</p>
                                </div>
                            </div>
                        </section>

                        {/* Change Details */}
                        <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Chi tiết thay đổi</h2>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                                {/* Row 1: Thông tin ban đầu */}
                                <div>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Ngày ban đầu</p>
                                    <p className="font-semibold text-gray-700 dark:text-gray-200">
                                        {request.originalDate ? new Date(request.originalDate).toLocaleDateString('vi-VN') : 'Không có'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Slot ban đầu</p>
                                    <p className="font-semibold text-gray-700 dark:text-gray-200">
                                        {request.originalSlotNumber ? `Slot ${request.originalSlotNumber}` : 'Không có'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Phòng ban đầu</p>
                                    <p className="font-semibold text-gray-700 dark:text-gray-200">
                                        {request.originalRoomName || 'Không có'}
                                    </p>
                                </div>
                                {/* Row 2: Thông tin yêu cầu */}
                                <div>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Ngày yêu cầu</p>
                                    <p className="font-semibold text-gray-700 dark:text-gray-200">
                                        {request.requestedDate ? new Date(request.requestedDate).toLocaleDateString('vi-VN') : 'Không có'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Slot yêu cầu</p>
                                    <p className="font-semibold text-gray-700 dark:text-gray-200">
                                        {request.requestedSlotNumber ? `Slot ${request.requestedSlotNumber}` : 'Không có'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Phòng yêu cầu</p>
                                    <p className="font-semibold text-gray-700 dark:text-gray-200">
                                        {request.requestedRoomName || 'Không đổi'}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Content & Documents */}
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
                    </div>

                    <div className="lg:col-span-4">
                        <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 sticky top-8">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Trạng thái & Phê duyệt</h2>

                            <div className="mb-8 text-center p-8 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                <p className="text-xs font-bold text-fpt-orange uppercase tracking-widest mb-3">TRẠNG THÁI HIỆN TẠI</p>
                                <span className={`inline-block px-8 py-2.5 rounded-full text-lg font-bold shadow-lg text-white ${request.status === 'APPROVED' ? 'bg-green-500 shadow-green-500/30' :
                                    request.status === 'REJECTED' ? 'bg-red-500 shadow-red-500/30' :
                                        request.status === 'REVOKED' ? 'bg-gray-500 shadow-gray-500/30' :
                                            'bg-fpt-orange shadow-orange-500/30'
                                    }`}>
                                    {request.statusLabel}
                                </span>
                            </div>

                            <div className="space-y-6 px-2">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">NGƯỜI PHÊ DUYỆT</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">
                                        {request.approverName || <span className="italic text-slate-400">Chưa có thông tin</span>}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">THỜI GIAN PHÊ DUYỆT</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-300">
                                        {request.approvedAt ? formatDate(request.approvedAt) : <span className="italic text-slate-400">Chưa có thông tin</span>}
                                    </p>
                                </div>

                                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">GHI CHÚ PHÊ DUYỆT</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 italic leading-relaxed">
                                        {request.approverNote || 'Yêu cầu đang chờ quản lý xem xét và phê duyệt.'}
                                    </p>
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
