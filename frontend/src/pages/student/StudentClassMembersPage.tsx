import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StudentLayout } from '../../layouts/StudentLayout';
import { lecturerClassService, ClassDetailResponse } from '../../services/api/LecturerClass';
import { chatGroupService } from '../../services/api/chatGroupService';
import { studentGradeService } from '../../services/api/studentGradeService';
import { Users, ArrowLeft, MessageCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const StudentClassMembersPage: React.FC = () => {
    const { className } = useParams<{ className: string }>();
    const navigate = useNavigate();
    const [detail, setDetail] = useState<ClassDetailResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [chatGroupId, setChatGroupId] = useState<number | null>(null);
    const [chatGroupLoading] = useState(false);
    const [headerAvatars, setHeaderAvatars] = useState<{ code: string; url: string | null; name: string }[]>([]);

    useEffect(() => {
        if (className) {
            fetchDetail();
            fetchChatGroupStatus();
        }
    }, [className]);

    useEffect(() => {
        const fetchHeaderAvatars = async () => {
            if (detail?.enrollments && detail.enrollments.length > 0) {
                const limit = Math.min(detail.enrollments.length, 2);
                const avatars: { code: string; url: string | null; name: string }[] = [];
                for (let i = 0; i < limit; i++) {
                    const student = detail.enrollments[i];
                    try {
                        const info = await studentGradeService.getStudentInfo(student.studentCode);
                        avatars.push({
                            code: student.studentCode,
                            url: info.avatar || null,
                            name: student.studentName
                        });
                    } catch (error) {
                        avatars.push({
                            code: student.studentCode,
                            url: null,
                            name: student.studentName
                        });
                    }
                }
                setHeaderAvatars(avatars);
            }
        };
        fetchHeaderAvatars();
    }, [detail?.enrollments]);

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
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate('/student/schedule')}
                        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-fpt-orange transition-colors w-fit group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Quay lại lịch học
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-6">
                            <div className="flex -space-x-8 -space-y-4">
                                {headerAvatars.length > 0 ? (
                                    headerAvatars.map((st, idx) => (
                                        <div
                                            key={st.code}
                                            className={`w-14 h-14 rounded-full border-4 border-white dark:border-zinc-950 overflow-hidden shadow-lg transition-transform hover:scale-110 relative ${idx === 0 ? 'z-20' : 'z-10 bg-orange-200'}`}
                                        >
                                            {st.url ? (
                                                <img
                                                    src={st.url}
                                                    alt={st.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-orange-100 flex items-center justify-center text-fpt-orange font-bold text-xl uppercase">
                                                    {st.name.split(' ').pop()?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="w-14 h-14 rounded-full border-4 border-white dark:border-zinc-900 bg-gray-50 flex items-center justify-center text-gray-300 shadow-inner">
                                        <Users size={24} />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`px-3 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-sm border ${
                                        detail?.status === 'UPCOMING'
                                            ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/40'
                                            : detail?.status === 'OPEN' || detail?.status === 'ONGOING'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900/40'
                                                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                                    }`}>
                                        {detail?.status === 'UPCOMING' ? 'SẮP DIỄN RA' : 
                                         detail?.status === 'OPEN' || detail?.status === 'ONGOING' ? 'ĐANG DIỄN RA' : 
                                         detail?.status === 'FINISHED' || detail?.status === 'COMPLETED' ? 'ĐÃ KẾT THÚC' : (detail?.status || 'ĐANG TẢI...')}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-zinc-800"></span>
                                    <span className="text-gray-400 dark:text-gray-500 text-[10px] font-bold tracking-widest uppercase">{detail?.semesterName}</span>
                                </div>
                                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                                    {detail?.className || className}
                                </h1>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {chatGroupId && (
                                <button
                                    onClick={handleChatGroup}
                                    disabled={chatGroupLoading}
                                    className="flex items-center gap-1.5 px-6 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-600 transition-all active:scale-95"
                                >
                                    {chatGroupLoading ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
                                    Nhóm chat lớp
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end px-1 gap-4">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white">Danh sách sinh viên</h4>
                            <p className="text-xs text-gray-500 font-medium mt-1">Tổng số {filteredEnrollments.length} thành viên lớp</p>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm sinh viên..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl text-xs font-medium transition-all shadow-sm outline-none focus:border-fpt-orange/50"
                            />
                            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-fpt-orange text-white">
                                        <th className="px-6 py-4 text-center text-[11px] font-bold uppercase tracking-widest w-20">STT</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest">Sinh viên</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest w-40">Mã sinh viên</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest">Chuyên ngành</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest">Chuyên ngành hẹp</th>
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
