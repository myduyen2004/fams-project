import React from 'react';
import { Eye, Clock, ShieldCheck, ShieldAlert, Paperclip } from 'lucide-react';
import { ScheduleRequestResponse } from '../../../services/api/academicStaffService';
import dayjs from 'dayjs';

interface RequestTableRowProps {
    request: ScheduleRequestResponse;
    onView: () => void;
}

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'PENDING':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full border border-orange-200">
                    <Clock size={12} />
                    Chờ xử lý
                </span>
            );
        case 'APPROVED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                    <ShieldCheck size={12} />
                    Đã phê duyệt
                </span>
            );
        case 'REJECTED':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                    <ShieldAlert size={12} />
                    Đã từ chối
                </span>
            );
        default:
            return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">{status}</span>;
    }
};

const getRoleBadge = (role: string) => {
    const isStudent = role === 'STUDENT';
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isStudent
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'bg-purple-100 text-purple-700 border border-purple-200'
            }`}>
            {isStudent ? 'Sinh viên' : 'Giảng viên'}
        </span>
    );
};

const RequestTableRow: React.FC<RequestTableRowProps> = ({ request, onView }) => {
    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-sm border-b border-gray-100 dark:border-zinc-800">
            <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-gray-500 font-bold overflow-hidden border border-gray-200 dark:border-zinc-600 flex-shrink-0">
                        {request.requesterAvatar ? (
                            <img src={request.requesterAvatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span>{request.requesterName?.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                            {request.requesterName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">
                            {request.requesterCode}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4">
                {getRoleBadge(request.requesterRole)}
            </td>
            <td className="px-4 py-4 font-medium text-gray-700 dark:text-gray-300">
                {request.className || '---'}
            </td>
            <td className="px-4 py-4">
                <span className="px-2 py-1 bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                    {request.typeLabel}
                </span>
            </td>
            <td className="px-4 py-4">
                <div className="flex flex-col">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {request.createdAt ? dayjs(request.createdAt).format('DD/MM/YYYY') : '---'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                        {request.createdAt ? dayjs(request.createdAt).format('HH:mm') : ''}
                    </span>
                </div>
            </td>
            <td className="px-4 py-4">
                {getStatusBadge(request.status)}
            </td>
            <td className="px-4 py-4 text-center">
                <button
                    onClick={onView}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group"
                    title="Xem chi tiết"
                >
                    <Eye size={18} className="group-hover:scale-110 transition-transform" />
                </button>
            </td>
        </tr>
    );
};

export default RequestTableRow;
