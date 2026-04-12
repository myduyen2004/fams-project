import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { AcademicRequest } from '../../../services/api/academicRequestService';
import dayjs from 'dayjs';

interface StudentRequestTableRowProps {
    request: AcademicRequest;
    onView: () => void;
}

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
        case 'CANCELLED':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-900/40">
                    <AlertCircle size={12} />
                    {label}
                </span>
            );
        default:
            return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold uppercase rounded-full">{label || status}</span>;
    }
};

const StudentRequestTableRow: React.FC<StudentRequestTableRowProps> = ({ request, onView }) => {
    return (
        <tr
            onDoubleClick={onView}
            className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors text-sm border-b border-gray-100 dark:border-zinc-800 cursor-pointer group"
        >
            <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-gray-500 font-bold overflow-hidden border border-gray-200 dark:border-zinc-600 flex-shrink-0">
                        {request.studentAvatar ? (
                            <img src={request.studentAvatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span>{request.studentName?.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                            {request.studentName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">
                            {request.studentCode}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                    Sinh viên
                </span>
            </td>
            <td className="px-4 py-4 font-medium text-gray-700 dark:text-gray-300">
                {request.requestTitle || '---'}
            </td>
            <td className="px-4 py-4">
                <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded text-xs font-medium">
                    {request.requestTypeLabel}
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
            <td className="px-6 py-4 text-center whitespace-nowrap text-center">
                {getStatusBadge(request.status, request.statusLabel)}
            </td>
        </tr>
    );
};

export default StudentRequestTableRow;
