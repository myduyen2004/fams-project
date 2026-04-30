import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StudentLayout } from '../../layouts/StudentLayout';
import { lecturerClassService, ClassDetailResponse } from '../../services/api/LecturerClass';
import { chatGroupService } from '../../services/api/chatGroupService';

import { Users, ArrowLeft, MessageCircle } from 'lucide-react';
import toast from "@utils/toast";

export const StudentClassMembersPage: React.FC = () => {
    const { className } = useParams<{ className: string }>();
    const navigate = useNavigate();
    const [detail, setDetail] = useState<ClassDetailResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [chatGroupId, setChatGroupId] = useState<number | null>(null);

    useEffect(() => {
        if (className) {
            fetchDetail();
            fetchChatGroupStatus();
        }
    }, [className]);



    const fetchDetail = async () => {
        setLoading(true);
        try {
            const data = await lecturerClassService.getClassDetail(className!);
            setDetail(data);
        } catch (error) {
            console.error("Failed to fetch class detail", error);
            toast.error("Không thể tải thông tin lớp học");
        } finally {
            setLoading(false);
        }
    };

    const fetchChatGroupStatus = async () => {
        if (!className) return;
        try {
            const exists = await chatGroupService.checkGroupExists(className);
            if (exists) {
                const groups = await chatGroupService.getMyGroups();
                const group = groups.find(g => g.className === className);
                if (group) setChatGroupId(group.id);
            }
        } catch (error) {
            console.error('Failed to check chat group status', error);
        }
    };

    const handleChatGroup = () => {
        if (chatGroupId) {
            navigate('/student/messages', { state: { selectedGroupId: chatGroupId } });
        }
    };

    const filteredEnrollments = detail?.enrollments.filter(student =>
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <StudentLayout pageTitle="Chi tiết lớp học">
            <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
                {/* Header Section Alignment with Lecturer Detail */}
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-fpt-orange rounded-full" />
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Danh sách thành viên</h1>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 ml-5">
                            <span className="px-3 py-1 bg-orange-50 dark:bg-orange-950/20 text-fpt-orange rounded-lg text-xs font-bold border border-orange-100 dark:border-orange-900/30">
                                {detail?.className || className}
                            </span>
                            <span className="px-3 py-1 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700">
                                {detail?.semesterName || 'Học kỳ'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {chatGroupId && (
                            <button
                                onClick={handleChatGroup}
                                className="flex items-center gap-2 px-6 py-3 bg-teal-500 text-white rounded-2xl hover:bg-teal-600 shadow-lg shadow-teal-500/20 active:scale-95 transition-all font-bold text-sm"
                            >
                                <MessageCircle size={18} />
                                Nhóm chat lớp
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/student/schedule')}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 rounded-2xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-all font-bold text-sm border-2 border-gray-100 dark:border-zinc-800 active:scale-95 group"
                        >
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            Quay lại lịch học
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end px-1 gap-4">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white">Danh sách sinh viên</h4>
                            <p className="text-xs text-gray-500 font-medium mt-1">Tổng số {filteredEnrollments.length} thành viên lớp</p>
                        </div>
                        <div className="relative w-full sm:w-80">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm sinh viên..."
                                className="w-full pl-12 pr-4 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm font-medium transition-all shadow-sm outline-none focus:border-fpt-orange/40"
                            />
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-fpt-orange">
                                        <th className="px-4 py-5 text-white text-center w-20 text-xs font-bold uppercase tracking-widest whitespace-nowrap">STT</th>
                                        <th className="px-4 py-5 text-white text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Sinh viên</th>
                                        <th className="px-4 py-5 text-white text-left w-40 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Mã sinh viên</th>
                                        <th className="px-4 py-5 text-white text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Chuyên ngành</th>
                                        <th className="px-4 py-5 text-white text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Chuyên ngành hẹp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                    {loading ? (
                                        [...Array(8)].map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={5} className="px-6 py-6 bg-gray-50/50 dark:bg-zinc-800/30">
                                                    <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-1/4 mx-auto"></div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : filteredEnrollments.length > 0 ? (
                                        filteredEnrollments.map((student, index) => (
                                            <tr key={student.studentCode} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                                                <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-zinc-400 font-medium font-mono">
                                                    {(index + 1).toString().padStart(2, '0')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full border border-orange-100 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-fpt-orange font-bold text-sm uppercase overflow-hidden shadow-sm">
                                                            {student.avatar ? (
                                                                <img 
                                                                    src={student.avatar} 
                                                                    alt={student.studentName} 
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : student.studentName.split(' ').pop()?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">{student.studentName}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-left">
                                                    <span className="inline-block px-3 py-1 bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-lg text-[11px] font-black uppercase tracking-widest border border-gray-100 dark:border-zinc-700">
                                                        {student.studentCode}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[13px] text-gray-600 dark:text-gray-400">
                                                    <div className="font-bold text-gray-800 dark:text-zinc-300">{student.majorName || '—'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-[13px] text-gray-600 dark:text-gray-400">
                                                    <div className="font-medium text-gray-600 dark:text-zinc-400">{student.specializationName || '—'}</div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-center">
                                                        <Users size={32} className="text-gray-200 dark:text-zinc-700" />
                                                    </div>
                                                    <p className="text-lg font-bold text-gray-400 dark:text-zinc-600 tracking-tight">Không tìm thấy sinh viên</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
};


