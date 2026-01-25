import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Printer,
    User,
    Clock,
    CheckCircle,
    Loader2,
    MessageSquare,
    Paperclip
} from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { academicStaffService, ScheduleRequestResponse } from '../../services/api/academicStaffService';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

// Helper function to generate request title based on type
const getRequestTitle = (request: ScheduleRequestResponse): string => {
    switch (request.type) {
        case 'ROOM_CHANGE':
            return `Đơn yêu cầu đổi phòng - Lớp ${request.className}${request.requestedRoomName ? ` - Phòng muốn đổi: ${request.requestedRoomName}` : ''}`;
        case 'RESCHEDULE':
            return `Đơn yêu cầu đổi lịch - Lớp ${request.className}${request.requestedSlotInfo ? ` - ${request.requestedSlotInfo}` : ''}`;
        case 'CANCEL':
            return `Đơn yêu cầu hủy buổi học - Lớp ${request.className}${request.originalSlotInfo ? ` - ${request.originalSlotInfo}` : ''}`;
        case 'SWAP':
            return `Đơn yêu cầu đổi slot với giảng viên khác - Lớp ${request.className}`;
        default:
            return `Đơn yêu cầu ${request.typeLabel} - Lớp ${request.className}`;
    }
};

export const RequestDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [request, setRequest] = useState<ScheduleRequestResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [note, setNote] = useState('');

    useEffect(() => {
        const fetchRequest = async () => {
            if (!id) return;
            try {
                setLoading(true);
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

    const isPending = request.status === 'PENDING';
    const statusInfo = {
        label: request.status === 'PENDING' ? 'Đang xử lý' : request.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối',
        color: request.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
            request.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-200' :
                'bg-red-50 text-red-600 border-red-200',
        dot: request.status === 'PENDING' ? 'bg-amber-500' : request.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'
    };

    return (
        <AcademicStaffLayout pageTitle="Chi tiết yêu cầu">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Print Header */}
                <div className="print-header hidden">
                    <div>
                        <h1 className="text-xl font-bold">TRƯỜNG ĐẠI HỌC FPT</h1>
                        <p className="text-xs">Phòng Quản lý Đào tạo - Academic Staff</p>
                    </div>
                    <div className="text-right text-xs">
                        <p>Số: #REQ-{dayjs(request.createdAt).format('YYYY')}-{request.id.toString().padStart(4, '0')}</p>
                        <p>Ngày: {dayjs().format('DD/MM/YYYY')}</p>
                    </div>
                </div>

                {/* Top Actions */}
                <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/academic-staff/requests')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết yêu cầu</h1>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Quản lý yêu cầu {request.requesterRole === 'STUDENT' ? 'sinh viên' : 'giảng viên'} /
                                <span className="text-fpt-orange font-mono font-medium ml-1">#REQ-{dayjs(request.createdAt).format('YYYY')}-{request.id.toString().padStart(4, '0')}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-fpt-orange font-semibold text-sm rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all border border-amber-100 dark:border-amber-900/30"
                    >
                        <Printer size={18} />
                        In phiếu
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content (Left) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Content Card */}
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-red-100">
                                    {request.typeLabel}
                                </span>
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                    <Clock size={16} />
                                    <span>{dayjs(request.createdAt).format('DD/MM/YYYY - HH:mm')}</span>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                {getRequestTitle(request)}
                            </h2>

                            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 mb-8 whitespace-pre-wrap leading-relaxed">
                                {request.reason}
                            </div>

                            {/* Additional Info Grid */}
                            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-zinc-800 pt-8 mt-8">

                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">File/ tệp đính kèm</p>
                                    {request.file ? (
                                        <a
                                            href={request.file}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                        >
                                            <Paperclip size={16} />
                                            Xem tệp đính kèm
                                        </a>
                                    ) : (
                                        <p className="text-sm font-semibold text-gray-400 italic">Không có tệp đính kèm</p>
                                    )}
                                </div>

                            </div>
                        </div>

                        {/* History Card */}
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <MessageSquare size={20} className="text-fpt-orange" />
                                Lịch sử xử lý
                            </h3>

                            <div className="space-y-6 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-gray-100 dark:before:bg-zinc-800">
                                {/* Approver feedback if processed */}
                                {request.approverName && (
                                    <div className="relative pl-12">
                                        <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 border-4 border-white dark:border-zinc-900 flex items-center justify-center text-blue-600 z-10">
                                            <User size={18} />
                                        </div>
                                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-50 dark:border-blue-900/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-bold text-sm text-gray-900 dark:text-white">{request.approverName} (Admin)</p>
                                                <span className="text-[10px] text-gray-500">{dayjs(request.approvedAt).format('DD/MM/YYYY - HH:mm')}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-zinc-400 italic">
                                                "{request.approverNote || 'Đã duyệt yêu cầu.'}"
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Initial Request */}
                                <div className="relative pl-12">
                                    <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 border-4 border-white dark:border-zinc-900 flex items-center justify-center text-purple-600 z-10 font-bold">
                                        {request.requesterName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white">{request.requesterName}</p>
                                            <span className="text-[10px] text-gray-500">{dayjs(request.createdAt).format('DD/MM/YYYY - HH:mm')}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">Đã tạo yêu cầu</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Print Signature Box */}
                        <div className="print-signature hidden">
                            <div className="print-signature-box">
                                <p className="font-bold mb-16">Người gửi yêu cầu</p>
                                <p>{request.requesterName}</p>
                            </div>
                            <div className="print-signature-box">
                                <p className="font-bold mb-16">Người phê duyệt</p>
                                <p>{request.approverName || '................................'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar (Right) */}
                    <div className="space-y-6">
                        {/* Requester Info */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6">Thông tin {request.requesterRole === 'STUDENT' ? 'sinh viên' : 'giảng viên'}</h3>
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-20 h-20 rounded-2xl bg-fpt-orange/10 flex items-center justify-center text-fpt-orange text-2xl font-bold border-2 border-fpt-orange/20 overflow-hidden mb-3 shadow-lg group-hover:scale-105 transition-transform">
                                    {request.requesterAvatar ? (
                                        <img src={request.requesterAvatar} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{request.requesterName.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">{request.requesterName}</h4>
                                <p className="text-sm font-mono text-gray-500">{request.requesterCode}</p>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-zinc-800">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Vai trò</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{request.requesterRole === 'STUDENT' ? 'Sinh viên' : 'Giảng viên'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Lớp</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{request.className || '---'}</span>
                                </div>
                                <div className="flex justify-between items-start text-sm">
                                    <span className="text-gray-500">{request.requesterRole === 'STUDENT' ? 'Ngành' : 'Bộ môn'}</span>
                                    <span className="font-semibold text-gray-900 dark:text-white text-right max-w-[150px]">{request.requesterMajor || '---'}</span>
                                </div>
                                <div className=" flex-col gap-1 text-sm">
                                    <span className="text-gray-500">Email</span>
                                    <span className="ml-30 font-semibold text-fpt-orange truncate">{request.requesterEmail || '---'}</span>
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
                                                onClick={() => handleUpdateStatus('APPROVED')}
                                                disabled={updating}
                                                className="w-full py-3 bg-fpt-orange text-white font-bold rounded-xl shadow-lg border border-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                {updating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                                Cập nhật trạng thái
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus('REJECTED')}
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
            </div>

            {/* Print-only specialized Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        margin: 2cm;
                    }
                    nav, aside, button, .no-print {
                        display: none !important;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                        font-family: "Times New Roman", serif;
                    }
                    .max-w-7xl {
                        max-width: 100% !important;
                        margin: 0 !important;
                    }
                    .shadow-sm, .shadow-lg {
                        box-shadow: none !important;
                    }
                    .rounded-2xl, .rounded-xl {
                        border-radius: 0 !important;
                    }
                    .bg-white, .dark\\:bg-zinc-900 {
                        background: white !important;
                    }
                    .text-gray-900, .text-gray-600, .dark\\:text-white, .dark\\:text-zinc-400 {
                        color: black !important;
                    }
                    .border {
                        border: 1px solid #eee !important;
                    }
                    .grid {
                        display: block !important;
                    }
                    .lg\\:col-span-2 {
                        width: 100% !important;
                    }
                    /* Custom Header for Print */
                    .print-header {
                        display: flex !important;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 2px solid #333;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .print-signature {
                        display: flex !important;
                        justify-content: space-between;
                        margin-top: 50px;
                        gap: 40px;
                    }
                    .print-signature-box {
                        text-align: center;
                        flex: 1;
                    }
                }
                @media screen {
                    .print-header, .print-signature {
                        display: none !important;
                    }
                }
            `}} />
        </AcademicStaffLayout>
    );
};

export default RequestDetailPage;
