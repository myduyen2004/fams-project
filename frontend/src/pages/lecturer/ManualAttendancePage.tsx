import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { ArrowLeft, Users, User, Loader2, Clock, MapPin, Camera } from 'lucide-react';
import attendanceService, { SessionDetailResponse } from '../../services/api/attendanceService';
import toast from "@utils/toast";
import dayjs from 'dayjs';

export const ManualAttendancePage: React.FC = () => {
    const { slotId } = useParams<{ slotId: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<SessionDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingStudentId, setUpdatingStudentId] = useState<number | null>(null);

    const isManualAllowed = React.useMemo(() => {
        if (!session || !session.date || !session.startTime) return false;
        const now = dayjs();
        const dateStr = dayjs(session.date).format('YYYY-MM-DD');
        const startDateTime = dayjs(`${dateStr}T${session.startTime}`);
        const endOfDay = dayjs(dateStr).endOf('day');
        return (now.isAfter(startDateTime) || now.isSame(startDateTime)) && now.isBefore(endOfDay);
    }, [session]);


    useEffect(() => {
        if (slotId) {
            fetchSession();
        }
    }, [slotId]);

    const fetchSession = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.getSessionBySlot(Number(slotId));
            setSession(data);
        } catch (error: any) {
            console.error('Failed to fetch session:', error);
            toast.error('Không tìm thấy phiên điểm danh cho slot này');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (studentId: number, status: string) => {
        if (!session) return;
        try {
            setUpdatingStudentId(studentId);
            const updatedSession = await attendanceService.updateManualAttendance(
                session.sessionId,
                studentId,
                status,
                Number(slotId)
            );
            setSession(updatedSession);
            toast.success('Cập nhật trạng thái thành công');
        } catch (error: any) {
            console.error('Failed to update attendance:', error);
            toast.error('Cập nhật thất bại. Vui lòng thử lại.');
        } finally {
            setUpdatingStudentId(null);
        }
    };

    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'PRESENT': 
                return (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                        Đã điểm danh
                    </span>
                );
            case 'ABSENT': 
                return (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                        Chưa điểm danh
                    </span>
                );
            case 'EXCUSED': 
                return (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        Vắng có phép
                    </span>
                );
            default: return null;
        }
    };

    if (loading) {
        return (
            <LecturerLayout pageTitle="Đang tải...">
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="w-8 h-8 animate-spin text-fpt-orange" />
                </div>
            </LecturerLayout>
        );
    }

    if (!session) {
        return (
            <LecturerLayout pageTitle="Không tìm thấy">
                <div className="text-center p-20">
                    <p className="text-gray-500 mb-4">Không tìm thấy phiên điểm danh cho buổi học này.</p>
                    <button onClick={() => navigate(-1)} className="text-fpt-orange font-bold flex items-center gap-2 mx-auto">
                        <ArrowLeft size={20} /> Quay lại
                    </button>
                </div>
            </LecturerLayout>
        );
    }

    const filteredStudents = session?.students || [];

    return (
        <LecturerLayout pageTitle="Báo cáo điểm danh">
            <div className="space-y-5 animate-in fade-in duration-500">
                {/* Header with Icons like screenshot */}
                <div className="mb-8 pl-2">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center gap-2 text-gray-400 hover:text-fpt-orange transition-colors text-sm font-medium mb-4"
                    >
                        <ArrowLeft size={16} /> Quay lại lịch giảng dạy
                    </button>
                    
                    <div className="text-fpt-orange text-sm font-bold mb-1">
                        {dayjs(session.date).format('DD/MM/YYYY')}
                    </div>
                    
                    <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                            {session.courseCode}
                        </h1>

                        <div className="flex items-center gap-8">
                             {/* Class Card */}
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-fpt-orange rounded-xl text-white shadow-sm">
                                    <Users size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-fpt-orange uppercase tracking-wider">LỚP</div>
                                    <div className="font-medium italic text-gray-700 dark:text-gray-300 text-sm">{session.className}</div>
                                </div>
                            </div>

                            {/* Time Card */}
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-fpt-orange rounded-xl text-white shadow-sm">
                                    <Clock size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-fpt-orange uppercase tracking-wider">KHUNG GIỜ</div>
                                    <div className="font-medium italic text-gray-700 dark:text-gray-300 text-sm">
                                        {session.startTime?.substring(0, 5)} - {session.endTime?.substring(0, 5)}
                                    </div>
                                </div>
                            </div>

                            {/* Room Card */}
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-fpt-orange rounded-xl text-white shadow-sm">
                                    <MapPin size={20} strokeWidth={2} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-fpt-orange uppercase tracking-wider">PHÒNG</div>
                                    <div className="font-medium italic text-gray-700 dark:text-gray-300 text-sm">{session.roomCode}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl shadow-gray-200/40 dark:shadow-none border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    {/* Filter and Summary Section */}
                    <div className="px-8 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/30 dark:bg-zinc-800/20">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Danh sách sinh viên</h3>
                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-lg text-sm font-bold text-gray-500">
                                <span className="text-fpt-orange">{session.presentCount}</span> / {session.totalStudents} Đã điểm danh
                            </div>
                        </div>


                    </div>

                    {/* Table Section */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-fpt-orange text-white">
                                    <th className="px-8 py-3 text-center text-[11px] font-black uppercase tracking-widest w-16">STT</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest w-20">Avatar</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest">Họ và tên</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest">Mã số SV</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Trạng thái</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Thời gian</th>
                                    <th className="px-8 py-3 text-center text-[11px] font-black uppercase tracking-widest w-24">Có mặt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {filteredStudents.map((student, index) => (
                                    <tr key={student.studentId} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-8 py-4 text-sm text-gray-500 font-medium text-center">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 dark:border-zinc-700 mx-auto">
                                                {student.avatarUrl ? (
                                                    <img src={student.avatarUrl} alt={student.fullName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <User size={20} />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {student.fullName}
                                            </div>
                                            {student.checkInMethod === 'FACE' && (
                                                <div className="flex items-center gap-1 text-[10px] text-blue-500 font-bold uppercase mt-0.5">
                                                    <Camera size={10} /> Face verified
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-sm font-bold text-gray-600 dark:text-zinc-400">
                                            {student.studentCode}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {getStatusDisplay(student.status)}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="text-xs font-bold text-gray-500 dark:text-zinc-400 tabular-nums">
                                                {student.checkInTime 
                                                    ? dayjs(student.checkInTime).format('HH:mm')
                                                    : '--:--'
                                                }
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <div className="flex justify-center">
                                                {updatingStudentId === student.studentId ? (
                                                    <Loader2 className="w-5 h-5 animate-spin text-fpt-orange" />
                                                ) : (
                                                        <button
                                                            onClick={() => handleUpdateStatus(
                                                                student.studentId, 
                                                                student.status === 'PRESENT' ? 'ABSENT' : 'PRESENT'
                                                            )}
                                                            disabled={!isManualAllowed}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                                                !isManualAllowed ? 'opacity-50 cursor-not-allowed' : ''
                                                            } ${
                                                                student.status === 'PRESENT' ? 'bg-fpt-orange' : 'bg-gray-200 dark:bg-zinc-700'
                                                            }`}
                                                        >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                                student.status === 'PRESENT' ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Users className="w-12 h-12 text-gray-200 dark:text-zinc-800" />
                                                <p className="text-gray-400 dark:text-zinc-600 font-medium uppercase tracking-widest text-xs">
                                                    Không tìm thấy sinh viên nào
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </LecturerLayout>
    );
};

export default ManualAttendancePage;


