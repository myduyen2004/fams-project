import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { scheduleRequestService, ScheduleRequest } from '../../services/api/scheduleRequestService';
import { Loader2, ArrowLeft, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const LecturerRequestDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<ScheduleRequest | null>(null);
    const [loading, setLoading] = useState(true);

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
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        {/* General Info */}
                        <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Thông tin chung</h2>
                                <span className="px-3 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {request.typeLabel}
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

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                {/* Original Room */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">PHÒNG BAN ĐẦU</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xl">
                                        {request.originalRoomName || 'Không có'}
                                    </p>
                                </div>

                                {/* Original Slot */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">SLOT BAN ĐẦU</p>
                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xl">
                                        {request.originalSlotNumber ? `Slot ${request.originalSlotNumber}` : 'Không có'}
                                    </p>
                                </div>

                                {/* New Slot */}
                                <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg border border-orange-100 dark:border-orange-900/20">
                                    <p className="text-xs font-bold text-fpt-orange uppercase tracking-wide mb-2">SLOT YÊU CẦU MỚI</p>
                                    <p className="font-bold text-fpt-orange text-xl">
                                        {request.requestedSlotNumber ? `Slot ${request.requestedSlotNumber}` : 'Không có'}
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
                                    <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg text-gray-600 dark:text-gray-300 italic text-sm leading-relaxed border border-gray-100 dark:border-zinc-700">
                                        "{request.reason}"
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Tệp đính kèm</p>
                                    {request.file ? (
                                        <a
                                            href="#"
                                            className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors w-fit group"
                                            onClick={(e) => { e.preventDefault(); toast.success('Đã tải xuống: ' + request.file); }}
                                        >
                                            <div className="p-2 bg-white dark:bg-zinc-900 rounded-md shadow-sm">
                                                <FileText size={18} />
                                            </div>
                                            <span className="font-medium text-sm underlineDecoration-blue-300 group-hover:underline">{request.file}</span>
                                        </a>
                                    ) : (
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
        </LecturerLayout >
    );
};
