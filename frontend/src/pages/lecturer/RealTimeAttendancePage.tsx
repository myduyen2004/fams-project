import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { 
    Clock, 
    MapPin, 
    ChevronLeft, 
    CheckCircle2, 
    Loader2, 
    UserCheck,
    AlertCircle,
    Calendar,
    LogOut,
    Plus,
    Users
} from 'lucide-react';
import attendanceService, { SessionDetailResponse, StudentAttendanceResponse } from '../../services/api/attendanceService';
import { WS_URL } from '../../services/api/config';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { toast } from 'react-hot-toast';
import dayjs from 'dayjs';

export const RealTimeAttendancePage: React.FC = () => {
    const { slotId } = useParams<{ slotId: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<SessionDetailResponse | null>(null);
    const [students, setStudents] = useState<StudentAttendanceResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [newestStudentId, setNewestStudentId] = useState<number | null>(null);
    const stompClientRef = useRef<Client | null>(null);

    useEffect(() => {
        if (slotId) {
            fetchInitialData();
            connectWebSocket();
        }

        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
            }
        };
    }, [slotId]);

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
        const socket = new SockJS(WS_URL);
        const client = new Client({
            webSocketFactory: () => socket,
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
            return {
                ...prev,
                presentCount: prev.presentCount + 1
            };
        });

        toast.success(`Sinh viên ${newStudent.fullName} vừa điểm danh!`);
        
        // Clear "NEW" badge after 1 minute
        setTimeout(() => setNewestStudentId(null), 60000);
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
            <LecturerLayout pageTitle="Không tìm thấy phiên">
                <div className="text-center p-20">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Không tìm thấy phiên điểm danh</h2>
                    <button onClick={() => navigate(-1)} className="text-fpt-orange font-bold flex items-center gap-2 mx-auto">
                        <ChevronLeft size={20} /> Quay lại
                    </button>
                </div>
            </LecturerLayout>
        );
    }

    return (
        <LecturerLayout pageTitle="Điểm danh Real-time">
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Header Information - Clean & Modern */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-start gap-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3 text-gray-500 font-medium text-sm mb-1 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5"><Calendar size={14} /> {dayjs(session.openedAt).format('OCT DD, YYYY')}</span>
                            </div>
                            <h1 className="text-6xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
                                {session.courseCode}
                            </h1>
                            <div className="flex flex-wrap gap-6 items-center">
                                <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/10 px-4 py-2 rounded-2xl">
                                    <div className="p-2 bg-fpt-orange/10 rounded-xl">
                                        <Clock size={16} className="text-fpt-orange" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Time Slot</span>
                                        <span className="font-bold text-gray-900 dark:text-white">7:00 - 9:15</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/10 px-4 py-2 rounded-2xl">
                                    <div className="p-2 bg-blue-500/10 rounded-xl">
                                        <MapPin size={16} className="text-blue-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Room</span>
                                        <span className="font-bold text-gray-900 dark:text-white uppercase">{session.roomCode}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    {/* List Header */}
                    <div className="px-8 py-6 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Danh sách điểm danh thành công</h2>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black border ${connected ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`} />
                                {connected ? 'LIVE' : 'OFFLINE'}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-2xl border border-gray-100 dark:border-zinc-800 flex items-center gap-3 shadow-sm">
                             <Users size={16} className="text-fpt-orange" />
                             <span className="text-sm font-black text-gray-900 dark:text-white">
                                <span className="text-fpt-orange">{session.presentCount}</span> / {session.totalStudents} Present
                             </span>
                        </div>
                    </div>

                    {/* Student List */}
                    <div className="divide-y divide-gray-50 dark:divide-zinc-800">
                        {students.map((student) => {
                            const isNew = newestStudentId === student.studentId;
                            return (
                                <div 
                                    key={student.studentId} 
                                    className={`px-8 py-5 flex items-center justify-between transition-all duration-700 ${isNew ? 'bg-orange-50/30' : 'bg-transparent'} hover:bg-gray-50/50 dark:hover:bg-zinc-800/30`}
                                >
                                    <div className="flex items-center gap-6">
                                        {/* Status Checkmark */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${isNew ? 'bg-fpt-orange border-fpt-orange text-white' : 'bg-blue-50 border-blue-100 text-blue-500'}`}>
                                            <CheckCircle2 size={20} />
                                        </div>

                                        {/* Captured Image Thumbnail */}
                                        <div className="relative group">
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-700 shadow-md">
                                                {student.capturedFaceUrl ? (
                                                    <img 
                                                        src={student.capturedFaceUrl} 
                                                        alt={student.fullName} 
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Plus size={20} className="text-gray-300" />
                                                    </div>
                                                )}
                                                {/* Badge for Student's check-in source dot */}
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900 shadow-sm" />
                                            </div>
                                        </div>

                                        {/* Student Info */}
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{student.fullName}</h3>
                                                {isNew && (
                                                    <span className="px-2 py-0.5 bg-fpt-orange text-white text-[8px] font-black uppercase rounded tracking-widest">
                                                        NEW
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 font-medium">
                                                Điểm danh thành công qua khuôn mặt
                                            </p>
                                        </div>
                                    </div>

                                    {/* Check-in Time */}
                                    <div className="px-4 py-1.5 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-100 dark:border-zinc-700">
                                        <span className="text-xs font-bold text-gray-500 tabular-nums">
                                            {dayjs(student.checkInTime).format('hh:mm A')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Empty State */}
                        {students.length === 0 && (
                            <div className="p-24 text-center">
                                <div className="w-24 h-24 bg-orange-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <UserCheck size={48} className="text-fpt-orange animate-bounce" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Đang đợi sinh viên điểm danh...</h3>
                                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                                    Danh sách sẽ tự động cập nhật khi sinh viên quét mặt thành công.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer / Exit */}
                    <div className="p-8 flex flex-col items-center gap-6 border-t border-gray-50 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-800/20">
                        <button className="text-fpt-orange font-bold text-sm tracking-wide hover:underline">
                            Xem thêm lịch sử
                        </button>
                        
                        <div className="w-full flex justify-end mt-4">
                            <button 
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-3 px-8 py-4 bg-fpt-orange text-white rounded-[24px] font-black shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                <LogOut size={20} /> Thoát
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </LecturerLayout>
    );
};
