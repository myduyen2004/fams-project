import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { lecturerClassService, ClassDetailResponse } from '../../services/api/LecturerClass';
import { assignmentService, AssignmentDTO, AssignmentSubmissionDTO } from '../../services/api/assignmentService';
import { timetableService, TimetableSlotDTO } from '../../services/api/timetableService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import { chatGroupService } from '../../services/api/chatGroupService';

import { Pagination } from '../../components/common/Pagination';
import { Users, Clock, ArrowLeft, FileText, ChevronDown, ChevronUp, ExternalLink, Lock, Loader2, MessageCircle, Phone, Mail } from 'lucide-react';
import { ViewStudentModal } from '../../components/academic-staff/students/StudentModals';
import { StudentResponse } from '../../services/api/academicStaffService';
import { studentGradeService } from '../../services/api/studentGradeService';
import toast from 'react-hot-toast';

export const LeturerClassDetailPage: React.FC = () => {
    const { className } = useParams<{ className: string }>();
    const navigate = useNavigate();
    const [detail, setDetail] = useState<ClassDetailResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [pagination, setPagination] = useState({
        page: 0,
        size: 30,
    });
    // List of student enrollments
    // Removed expandedStudentCode state
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Assignment section state
    const [showAssignments, setShowAssignments] = useState(false);
    const [headerAvatars, setHeaderAvatars] = useState<{ code: string; url: string | null; name: string }[]>([]);

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
    const [slots, setSlots] = useState<TimetableSlotDTO[]>([]);
    const [assignments, setAssignments] = useState<AssignmentDTO[]>([]);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [assignmentPage, setAssignmentPage] = useState(0);
    const ASSIGNMENT_PAGE_SIZE = 10;
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [submissions, setSubmissions] = useState<Record<number, AssignmentSubmissionDTO[]>>({});
    const [loadingSubmissions, setLoadingSubmissions] = useState<number | null>(null);

    // Chat group state
    const [chatGroupId, setChatGroupId] = useState<number | null>(null);
    const [chatGroupLoading, setChatGroupLoading] = useState(false);

    // View Student Modal State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<StudentResponse | null>(null);
    const [, setIsFetchingStudent] = useState(false);


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
            } else {
                setChatGroupId(null);
            }
        } catch (error) {
            console.error('Failed to check chat group status', error);
        }
    };

    const handleChatGroup = async () => {
        if (!className) return;
        setChatGroupLoading(true);
        try {
            if (chatGroupId) {
                navigate('/lecturer/messages', { state: { selectedGroupId: chatGroupId } });
            } else {
                const group = await chatGroupService.createGroupForClass(className);
                toast.success('Đã tạo nhóm chat cho lớp!');
                setChatGroupId(group.id);
                navigate('/lecturer/messages', { state: { selectedGroupId: group.id } });
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể thực hiện thao tác nhóm chat');
        } finally {
            setChatGroupLoading(false);
        }
    };

    const handleViewStudentDetail = async (studentCode: string) => {
        setIsFetchingStudent(true);
        try {
            const student = await studentGradeService.getStudentInfo(studentCode);
            setViewingStudent(student);
            setIsViewModalOpen(true);
        } catch (error) {
            toast.error('Lỗi khi tải thông tin sinh viên');
        } finally {
            setIsFetchingStudent(false);
        }
    };


    const maskValue = (value: string | undefined, visibleChars: number = 2) => {
        if (!value) return '';
        if (value.length <= visibleChars * 2) return value;
        return value.substring(0, visibleChars) + '****' + value.substring(value.length - visibleChars);
    };

    // Fetch assignment data for this class
    const fetchAssignmentData = useCallback(async () => {
        if (!className) return;
        setLoadingAssignments(true);
        try {
            const [slotsData, assignmentsData] = await Promise.all([
                timetableService.getTimetableByClass(className).catch(() => [] as TimetableSlotDTO[]),
                assignmentService.getAssignmentsByClass(className).catch(() => [] as AssignmentDTO[])
            ]);
            setSlots(slotsData);
            setAssignments(assignmentsData);
        } catch (err) {
            console.error('Failed to fetch assignment data', err);
        } finally {
            setLoadingAssignments(false);
        }
    }, [className]);

    const handleToggleAssignments = () => {
        if (!showAssignments) {
            fetchAssignmentData();
        }
        setShowAssignments(!showAssignments);
    };

    const toggleExpand = async (assignmentId: number) => {
        if (expandedId === assignmentId) {
            setExpandedId(null);
            return;
        }
        setExpandedId(assignmentId);
        if (!submissions[assignmentId]) {
            try {
                setLoadingSubmissions(assignmentId);
                const data = await assignmentService.getAssignmentSubmissions(assignmentId);
                setSubmissions(prev => ({ ...prev, [assignmentId]: data }));
            } catch {
                setSubmissions(prev => ({ ...prev, [assignmentId]: [] }));
            } finally {
                setLoadingSubmissions(null);
            }
        }
    };

    const handleCloseAssignment = async (assignmentId: number) => {
        try {
            await assignmentService.closeAssignment(assignmentId);
            toast.success('Đã đóng bài tập');
            fetchAssignmentData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể đóng bài tập');
        }
    };

    const formatSlotDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Render note text with clickable links
    const renderNoteWithLinks = (text?: string) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/;
        const parts = text.split(urlRegex);
        return parts.filter(Boolean).map((part, i) => {
            if (urlRegex.test(part)) {
                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-fpt-orange hover:underline break-all">{part}</a>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    // Build merged slot-assignment rows
    const assignmentBySlotId = new Map<number, AssignmentDTO>();
    assignments.forEach(a => {
        if (a.timetableSlotId) assignmentBySlotId.set(a.timetableSlotId, a);
    });
    const slotRows = slots.map(slot => ({
        slot,
        assignment: assignmentBySlotId.get(slot.id) || null
    }));
    const totalAssignmentPages = Math.ceil(slotRows.length / ASSIGNMENT_PAGE_SIZE);
    const paginatedSlotRows = slotRows.slice(assignmentPage * ASSIGNMENT_PAGE_SIZE, (assignmentPage + 1) * ASSIGNMENT_PAGE_SIZE);

    // Filter enrollments based on search query
    const filteredEnrollments = detail?.enrollments.filter(student =>
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // Pagination for the filtered enrollments list
    const currentEnrollments = filteredEnrollments.slice(
        pagination.page * pagination.size,
        (pagination.page + 1) * pagination.size
    );

    const totalPages = Math.ceil(filteredEnrollments.length / pagination.size);

    return (
        <LecturerLayout pageTitle="Chi tiết lớp học">
            <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Top Navigation & Breadcrumbs */}
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate('/lecturer/classes')}
                        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-fpt-orange transition-colors w-fit group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Quay lại danh sách lớp học
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="flex -space-x-8 -space-y-4">
                                {headerAvatars.length > 0 ? (
                                    headerAvatars.map((st, idx) => (
                                        <div
                                            key={st.code}
                                            className={`w-14 h-14 rounded-full border-4 border-white dark:border-zinc-950 overflow-hidden shadow-lg transition-transform hover:scale-110 relative ${idx === 0 ? 'z-20' : 'z-10 bg-orange-200'}`}
                                        >
                                            {st.url ? (
                                                <img
                                                    src={`${st.url}${st.url.includes('?') ? '&' : '?'}t=${new Date().getTime()}`}
                                                    alt={st.name}
                                                    className="w-full h-full object-cover"
                                                    onError={() => {
                                                        const newAvatars = [...headerAvatars];
                                                        newAvatars[idx].url = null;
                                                        setHeaderAvatars(newAvatars);
                                                    }}
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
                                        {detail?.status === 'UPCOMING' ? 'SẮP DIỄN RA' : detail?.status === 'ONGOING' ? 'ĐANG DIỄN RA' : detail?.status === 'FINISHED' ? 'ĐÃ KẾT THÚC' : detail?.status || 'ĐANG TẢI...'}
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
                            <button 
                                onClick={() => navigate('/lecturer/grades', { state: { className, semesterCode: detail?.semesterCode } })}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold border border-gray-100 transition-all shadow-sm hover:border-fpt-orange/50 hover:text-fpt-orange"
                            >
                                Quản lý điểm số
                            </button>
                            <button 
                                onClick={() => navigate(`/lecturer/classes/${className}/attendance-report`)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-fpt-orange text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/10 hover:bg-orange-600 transition-all">
                                Báo cáo điểm danh
                            </button>
                            <button
                                onClick={handleToggleAssignments}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition-all shadow-sm ${showAssignments
                                    ? 'bg-fpt-orange text-white border-fpt-orange'
                                    : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 border-gray-100 hover:border-fpt-orange/30 hover:text-fpt-orange'
                                    }`}
                            >
                                <FileText size={16} />
                                Bài tập
                            </button>
                            <button
                                onClick={handleChatGroup}
                                disabled={chatGroupLoading}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${chatGroupId
                                    ? 'bg-teal-500 text-white border-teal-500 hover:bg-teal-600'
                                    : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 border-gray-100 hover:border-teal-400/50 hover:text-teal-600'
                                    }`}
                            >
                                {chatGroupLoading
                                    ? <Loader2 size={16} className="animate-spin" />
                                    : <MessageCircle size={16} />}
                                {chatGroupId ? 'Nhóm chat' : 'Tạo nhóm chat'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Class Info Card */}
                {/* <div className="bg-[#fff9f5] dark:bg-zinc-900/50 p-10 rounded-[40px] border border-orange-100/50 dark:border-zinc-800/50 relative overflow-hidden"> */}
                {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
                        {[
                            { label: 'Mã lớp', value: detail?.className, icon: <BookOpen className="text-fpt-orange" size={22} /> },
                            { label: 'Chuyên ngành', value: detail?.majorName, icon: <GraduationCap className="text-fpt-orange" size={22} /> },
                            { label: 'Khoá học', value: detail?.courseYear, icon: <Calendar className="text-fpt-orange" size={22} /> },
                            { label: 'Thành viên', value: `${detail?.studentCount} Sinh viên`, icon: <Users className="text-fpt-orange" size={22} /> },
                            { label: 'Niên khoá', value: detail?.academicYear, icon: <Clock className="text-fpt-orange" size={22} /> }
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4 group/item transition-all hover:translate-x-1">
                                <div className="p-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-orange-50 dark:border-zinc-700 group-hover/item:border-fpt-orange/30 transition-colors">
                                    {item.icon}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                                        {item.label}
                                    </span>
                                    <span className="text-lg font-medium text-gray-900 dark:text-white leading-tight">
                                        {item.value || '---'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div> */}
                {/* </div> */}

                {/* Assignment Table Section (toggled) */}
                {showAssignments && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white px-1">Bài tập lớp {className}</h2>
                        {loadingAssignments ? (
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-12 text-center">
                                <Loader2 size={32} className="animate-spin mx-auto text-fpt-orange mb-4" />
                                <p className="text-gray-500">Đang tải dữ liệu...</p>
                            </div>
                        ) : slotRows.length === 0 ? (
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-12 text-center">
                                <FileText size={48} className="mx-auto text-gray-300 dark:text-zinc-600 mb-4" />
                                <p className="text-gray-500 dark:text-zinc-400">Chưa có buổi học nào</p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[13px]">
                                        <thead>
                                            <tr className="bg-fpt-orange text-white">
                                                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest">Ngày</th>
                                                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest w-20">Slot</th>
                                                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest w-24">Phòng</th>
                                                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest">Bài tập</th>
                                                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest w-28">Trạng thái</th>
                                                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest w-20">Nộp</th>
                                                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-widest w-24">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                            {paginatedSlotRows.map(({ slot, assignment }) => (
                                                <React.Fragment key={slot.id}>
                                                    <tr className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                                                        <td className="px-4 py-2.5 text-gray-900 dark:text-white whitespace-nowrap font-medium">
                                                            {formatSlotDate(slot.date)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-600 dark:text-zinc-400 whitespace-nowrap font-medium">
                                                            Slot {slot.slotNumber}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-600 dark:text-zinc-400 font-medium">{slot.roomCode || '—'}</td>
                                                        <td className="px-4 py-2.5">
                                                            {assignment ? (
                                                                <div>
                                                                    <div className="font-bold text-gray-900 dark:text-white leading-tight">{assignment.title}</div>
                                                                    {assignment.dueDate && (
                                                                        <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
                                                                            <Clock className="w-2.5 h-2.5 inline mr-1" />Hạn: {formatDate(assignment.dueDate)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 dark:text-zinc-500 italic font-medium">Chưa có bài tập</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            {assignment ? (
                                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${assignment.status === 'OPEN'
                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                                                                    : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700'
                                                                    }`}>
                                                                    {assignment.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300 dark:text-zinc-600">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-600 dark:text-zinc-400 font-bold font-mono">
                                                            {assignment ? `${assignment.totalSubmissions}/${assignment.totalStudents}` : '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {assignment ? (
                                                                    <>
                                                                        <button onClick={() => toggleExpand(assignment.id)}
                                                                            className="inline-flex items-center gap-1 px-1.5 py-1 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-400 rounded-lg text-[10px] font-bold transition-colors border border-gray-100 dark:border-zinc-700">
                                                                            <Users className="w-3 h-3" />
                                                                            {expandedId === assignment.id ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                                                                        </button>
                                                                        {assignment.status === 'OPEN' && (
                                                                            <button onClick={() => handleCloseAssignment(assignment.id)}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold transition-colors border border-red-100 dark:border-red-900/30">
                                                                                <Lock className="w-3 h-3" /> Đóng
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <span className="text-gray-300 dark:text-zinc-600 text-[10px] italic">—</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {assignment && expandedId === assignment.id && (
                                                        <tr>
                                                            <td colSpan={7} className="bg-gray-50 dark:bg-zinc-950 px-4 py-4">
                                                                {loadingSubmissions === assignment.id ? (
                                                                    <div className="text-center py-4">
                                                                        <Loader2 size={24} className="animate-spin mx-auto text-fpt-orange" />
                                                                    </div>
                                                                ) : (submissions[assignment.id]?.length || 0) === 0 ? (
                                                                    <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-3">Chưa có sinh viên nào nộp bài</p>
                                                                ) : (
                                                                    <div className="space-y-2">
                                                                        <div className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                                                                            {submissions[assignment.id]?.length} bài nộp
                                                                        </div>
                                                                        {submissions[assignment.id]?.map(sub => (
                                                                            <div key={sub.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg p-3 border border-gray-200 dark:border-zinc-800">
                                                                                <div>
                                                                                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                                                        {sub.studentCode} — {sub.studentName}
                                                                                    </div>
                                                                                    <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                                                                        {sub.fileNames && sub.fileNames.length > 0
                                                                                            ? sub.fileNames.join(', ')
                                                                                            : 'Không có file'} • Nộp lúc {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN') : '—'}
                                                                                    </div>
                                                                                    {sub.note && <div className="text-xs text-gray-400 mt-0.5">Ghi chú: {renderNoteWithLinks(sub.note)}</div>}
                                                                                </div>
                                                                                {sub.fileUrls && sub.fileUrls.length > 0 && (
                                                                                    <div className="flex flex-col gap-1">
                                                                                        {sub.fileUrls.map((url, idx) => (
                                                                                            <a key={idx} href={getViewableFileUrl(url)} target="_blank" rel="noopener noreferrer"
                                                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 text-fpt-orange rounded-lg text-xs transition-colors">
                                                                                                <ExternalLink className="w-3 h-3" />
                                                                                                {sub.fileNames?.[idx] || `File ${idx + 1}`}
                                                                                            </a>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-4 pb-4">
                                    <Pagination
                                        currentPage={assignmentPage}
                                        totalPages={totalAssignmentPages}
                                        totalElements={slotRows.length}
                                        pageSize={ASSIGNMENT_PAGE_SIZE}
                                        onPageChange={setAssignmentPage}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Student Table Section */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end px-1 gap-4">
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white">Danh sách sinh viên</h4>
                            <p className="text-xs text-gray-500 font-medium mt-1">Tổng số {detail?.enrollments.length || 0} sinh viên chính thức</p>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPagination(p => ({ ...p, page: 0 }));
                                }}
                                placeholder="Tìm sinh viên..."
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl text-xs font-medium transition-all shadow-sm outline-none focus:border-fpt-orange/50"
                            />
                            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-fpt-orange text-white">
                                        <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest w-16">STT</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest">Sinh viên</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest">Liên hệ</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest">Chuyên ngành</th>
                                        <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest w-32">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                    {loading ? (
                                        [...Array(5)].map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={5} className="px-4 py-6 bg-gray-50/50 dark:bg-zinc-800/30"></td>
                                            </tr>
                                        ))
                                    ) : currentEnrollments.length > 0 ? (
                                        currentEnrollments.map((student: any, index: number) => (
                                            <tr key={student.studentCode}
                                                onClick={() => handleViewStudentDetail(student.studentCode)}
                                                className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group">
                                                <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-zinc-400 font-medium font-mono">
                                                    {(pagination.page * pagination.size + index + 1).toString().padStart(2, '0')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full border border-orange-100 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-fpt-orange font-bold text-xs uppercase shadow-sm">
                                                            {student.studentName.split(' ').pop()?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">{student.studentName}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{student.studentCode}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-[13px] text-gray-600 dark:text-gray-400">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5 font-medium">
                                                            <Mail size={12} className="text-gray-400" />
                                                            <span>{maskValue(student.email, 4)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Phone size={12} className="text-gray-400" />
                                                            <span>{maskValue(student.phone, 3)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-[13px] text-gray-600 dark:text-gray-400">
                                                    <div className="flex flex-col">
                                                        <div className="font-bold text-gray-800 dark:text-zinc-300">{student.majorName}</div>
                                                        <div className="text-[11px] text-gray-400 font-medium">{student.specializationName}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase whitespace-nowrap ${student.status === 'ENROLLED'
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                                                        : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700'
                                                        }`}>
                                                        {student.status === 'ENROLLED' ? 'ĐANG HỌC' : student.status}
                                                    </span>
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

                        {/* Simplified Pagination */}
                        {totalPages > 1 && (
                            <div className="ml-10 mr-10 mb-10 flex items-center justify-between mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800 text-sm text-gray-500">
                                <div>
                                    Hiển thị <span className="font-medium text-gray-900 dark:text-white">
                                        {filteredEnrollments.length > 0 ? pagination.page * pagination.size + 1 : 0}
                                    </span> đến{' '}
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {Math.min((pagination.page + 1) * pagination.size, filteredEnrollments.length)}
                                    </span> trong số{' '}
                                    <span className="font-medium text-gray-900 dark:text-white">{filteredEnrollments.length}</span> sinh viên
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPagination(p => ({ ...p, page: Math.max(0, p.page - 1) }))}
                                        disabled={pagination.page === 0}
                                        className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
                                    >
                                        Trước
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPagination(p => ({ ...p, page: i }))}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-colors ${pagination.page === i
                                                ? 'bg-fpt-orange text-white'
                                                : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPagination(p => ({ ...p, page: Math.min(totalPages - 1, p.page + 1) }))}
                                        disabled={pagination.page >= totalPages - 1}
                                        className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isViewModalOpen && viewingStudent && (
                <ViewStudentModal
                    student={viewingStudent}
                    onClose={() => setIsViewModalOpen(false)}
                />
            )}
        </LecturerLayout >
    );
};
