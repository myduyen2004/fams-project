import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { ArrowLeft, Users, User, UserCheck, Clock, MapPin, Loader2, Edit3, ChevronLeft, History, Link2Off, XCircle, Camera, AlertCircle } from 'lucide-react';
import attendanceService, { SessionDetailResponse, StudentAttendanceResponse } from '../../services/api/attendanceService';
import { WS_URL } from '../../services/api/config';
import { Client } from '@stomp/stompjs';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';

export const RealTimeAttendancePage: React.FC = () => {
    const { slotId } = useParams<{ slotId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const isAcademicStaff = location.pathname.includes('/academic-staff/');
    const Layout = isAcademicStaff ? AcademicStaffLayout : LecturerLayout;
    const [session, setSession] = useState<SessionDetailResponse | null>(null);
    const [students, setStudents] = useState<StudentAttendanceResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [, setConnected] = useState(false);
    const [newestStudentId, setNewestStudentId] = useState<number | null>(null);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const stompClientRef = useRef<Client | null>(null);

    const isLiveSession = session?.status === 'OPEN';
    const isEnded = session?.status === 'CLOSED';

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
            fetchInitialData();
        }
        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
            }
        };
    }, [slotId]);

    useEffect(() => {
        if (session && session.status === 'OPEN' && slotId) {
            connectWebSocket();
        }
    }, [session?.status]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.getSessionBySlot(Number(slotId));
            setSession(data);
            const presentStudents = (data.students || [])
                .filter(s => s.status === 'PRESENT')
                .sort((a, b) => dayjs(b.checkInTime).valueOf() - dayjs(a.checkInTime).valueOf());
            setStudents(presentStudents);
        } catch (error: any) {
            console.error('Failed to fetch session:', error);
            toast.error('Không tìm thấy phiên điểm danh cho slot này');
        } finally {
            setLoading(false);
        }
    };

    const connectWebSocket = () => {
        const client = new Client({
            brokerURL: WS_URL,
            onConnect: () => {
                setConnected(true);
                client.subscribe(`/topic/attendance/slot/${slotId}`, (message) => {
                    const studentCheckIn: StudentAttendanceResponse = JSON.parse(message.body);
                    handleNewCheckIn(studentCheckIn);
                });
            },
            onDisconnect: () => setConnected(false),
        });
        client.activate();
        stompClientRef.current = client;
    };

    const handleNewCheckIn = (newStudent: StudentAttendanceResponse) => {
        if (newStudent.status !== 'PRESENT') return;
        setStudents(prev => {
            const index = prev.findIndex(s => s.studentId === newStudent.studentId);
            if (index !== -1) {
                const updated = [...prev];
                updated[index] = newStudent;
                return updated.sort((a, b) => dayjs(b.checkInTime).valueOf() - dayjs(a.checkInTime).valueOf());
            }
            return [newStudent, ...prev];
        });
        setNewestStudentId(newStudent.studentId);
        setSession(prev => {
            if (!prev) return null;
            const wasPresent = students.some(s => s.studentId === newStudent.studentId);
            if (wasPresent) return prev;
            return { ...prev, presentCount: prev.presentCount + 1 };
        });
        toast.success(`Sinh viên ${newStudent.fullName} vừa điểm danh!`);
        setTimeout(() => setNewestStudentId(null), 60000);
    };

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const formatSlotTime = (time?: string) => {
        if (!time) return '';
        const parts = time.split(':');
        return `${parts[0]}:${parts[1]}`;
    };

    if (loading) {
        return (
            <Layout pageTitle="Đang tải...">
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="w-8 h-8 animate-spin text-fpt-orange" />
                </div>
            </Layout>
        );
    }

    if (!session) {
        return (
            <Layout pageTitle="Không tìm thấy phiên">
                <div className="text-center p-20">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Không tìm thấy phiên điểm danh</h2>
                    <button onClick={() => navigate(-1)} className="text-fpt-orange font-bold flex items-center gap-2 mx-auto">
                        <ChevronLeft size={20} /> Quay lại
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout pageTitle="Điểm danh thời gian thực">
            <div className="space-y-5 animate-in fade-in duration-500">

                {/* Header with Icons similar to ManualAttendancePage */}
                <div className="mb-8 pl-2">
                    <button
                        onClick={() => navigate(isAcademicStaff ? '/academic-staff/schedule' : '/lecturer/schedule')}
                        className="flex items-center gap-2 text-gray-400 hover:text-fpt-orange transition-colors text-sm font-medium mb-4"
                    >
                        <ArrowLeft size={16} /> Quay lại lịch giảng dạy
                    </button>
                    
                    <div className="text-fpt-orange text-sm font-bold mb-1">
                        {session.date ? dayjs(session.date).format('DD/MM/YYYY') : 'Hôm nay'}
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
                                    <div className="font-medium italic text-gray-700 dark:text-gray-300 text-sm">
                                        {session.className.split('-')[0]}
                                    </div>
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
                                        {formatSlotTime(session.startTime)} - {formatSlotTime(session.endTime)}
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
                                    <div className="font-medium italic text-gray-700 dark:text-gray-300 text-sm uppercase">{session.roomCode}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== MAIN CARD ===== */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl shadow-gray-200/40 dark:shadow-none border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    {/* Card Header */}
                    <div className="px-8 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/30 dark:bg-zinc-800/20">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Danh sách điểm danh thành công</h2>
                                {isLiveSession ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        ĐANG DIỄN RA
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-gray-100 text-gray-500 border border-gray-200 dark:bg-zinc-800 dark:text-gray-400 dark:border-zinc-700">
                                        <History size={10} />
                                        {isEnded ? 'ĐÃ KẾT THÚC' : 'CHƯA MỞ'}
                                    </div>
                                )}
                            </div>
                            
                            </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-fpt-orange/30 bg-white dark:bg-zinc-900">
                                <Users size={14} className="text-fpt-orange" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 text-nowrap">
                                    <span className="text-fpt-orange text-sm font-black">{session.presentCount}</span>
                                    <span className="text-gray-400 mx-0.5"> /</span>{session.totalStudents} Đã điểm danh
                                </span>
                            </div>
                            <button 
                                onClick={() => isManualAllowed && navigate(`/lecturer/attendance/manual/${slotId}`)}
                                disabled={!isManualAllowed}
                                className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-xl font-bold text-sm shadow-md whitespace-nowrap ${
                                    isManualAllowed 
                                        ? 'bg-fpt-orange shadow-orange-500/20 hover:bg-orange-600 active:scale-[0.98] transition-all' 
                                        : 'bg-gray-400 dark:bg-zinc-700 cursor-not-allowed opacity-60'
                                }`}
                                title={!isManualAllowed ? 'Chỉ có thể điểm danh thủ công sau giờ bắt đầu và trong ngày diễn ra slot học' : ''}
                            >
                                <Edit3 size={16} />
                                Điểm danh thủ công
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-fpt-orange text-white">
                                    <th className="px-8 py-3 text-left text-[11px] font-black uppercase tracking-widest">Họ và tên</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest w-48">Mã số sinh viên</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest w-32">Phương thức</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest w-32">Ảnh check-in</th>
                                    <th className="px-8 py-3 text-right text-[11px] font-black uppercase tracking-widest w-40">Thời gian</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                {students
                                    .map((student) => {
                                        const isNew = newestStudentId === student.studentId;
                                        return (
                                            <tr 
                                                key={student.studentId} 
                                                className={`transition-all duration-500 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 ${isNew ? 'bg-orange-50/50 dark:bg-orange-900/5' : ''}`}
                                            >
                                                {/* Name & Avatar */}
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-4">
                                                        {student.avatarUrl ? (
                                                            <div 
                                                                className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 dark:border-zinc-700 shadow-sm cursor-pointer"
                                                                onClick={() => setZoomedImage(student.avatarUrl!)}
                                                            >
                                                                <img src={student.avatarUrl} alt={student.fullName} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-fpt-orange/10 flex items-center justify-center flex-shrink-0 border border-fpt-orange/20">
                                                                <span className="text-fpt-orange font-bold text-xs">{getInitials(student.fullName)}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-900 dark:text-white text-[15px]">{student.fullName}</span>
                                                                {isNew && (
                                                                    <span className="px-1.5 py-0.5 bg-fpt-orange text-white text-[7px] font-black uppercase rounded tracking-widest">MỚI</span>
                                                                )}
                                                            </div>
                                                            {student.checkInMethod === 'FACE' && (
                                                                <div className="flex items-center gap-1 text-[10px] text-blue-500 font-bold uppercase mt-0.5">
                                                                    <Camera size={10} /> Face verified
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Student Code */}
                                                <td className="px-4 py-4 text-center">
                                                    <span className="text-sm text-gray-600 dark:text-zinc-400 font-bold">{student.studentCode}</span>
                                                </td>
                                                {/* Method Display */}
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        {student.checkInMethod === 'FACE' ? (
                                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400" title="Face Recognition">
                                                                <Camera size={16} />
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-400 dark:bg-zinc-800/50 dark:text-zinc-500" title="Manual / QR">
                                                                <User size={16} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* Captured Face Image */}
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex justify-center items-center">
                                                        {student.capturedFaceUrl ? (
                                                            <div 
                                                                className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-zinc-700 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                                                                onClick={() => setZoomedImage(student.capturedFaceUrl!)}
                                                            >
                                                                <img src={student.capturedFaceUrl} alt="Check-in Face" className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-zinc-800/80 flex items-center justify-center flex-shrink-0 border border-gray-100 dark:border-zinc-700/50">
                                                                <User size={14} className="text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* Time */}
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-fpt-orange flex-shrink-0" />
                                                        <span className="text-sm font-black text-gray-700 dark:text-gray-300 tabular-nums">
                                                            {dayjs(student.checkInTime).format('HH:mm')}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {students.length === 0 && (
                        <div className="py-16 px-8 text-center">
                            {isLiveSession ? (
                                <>
                                    <div className="w-24 h-24 bg-orange-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-5">
                                        <UserCheck size={44} className="text-fpt-orange animate-bounce" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Đang đợi sinh viên điểm danh...</h3>
                                    <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
                                        Danh sách sẽ tự động cập nhật khi sinh viên quét mặt thành công.
                                    </p>
                                </>
                            ) : isEnded ? (
                                <>
                                    <div className="relative w-24 h-24 mx-auto mb-5">
                                        <div className="w-24 h-24 bg-orange-50 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                                            <Link2Off size={44} className="text-gray-300 dark:text-gray-600" />
                                        </div>
                                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-md">
                                            <XCircle size={20} className="text-red-500" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Phiên đã kết thúc</h3>
                                    <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
                                        Hệ thống đã ngừng nhận phản hồi điểm danh. Hiện tại không có sinh viên nào được ghi nhận trong phiên này.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-24 h-24 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-5">
                                        <History size={44} className="text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Chưa có phiên điểm danh</h3>
                                    <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
                                        Slot này chưa được mở phiên điểm danh nào.
                                    </p>
                                </>
                            )}
                        </div>
                    )}


                </div>
            </div>

            {/* Zoom Image Overlay */}
            {zoomedImage && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
                    onClick={() => setZoomedImage(null)}
                >
                    <div 
                        className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors z-10"
                            onClick={() => setZoomedImage(null)}
                        >
                            &times;
                        </button>
                        <img 
                            src={zoomedImage} 
                            alt="Zoomed" 
                            className="w-full h-full object-contain cursor-default" 
                        />
                    </div>
                </div>
            )}
        </Layout>
    );
};
