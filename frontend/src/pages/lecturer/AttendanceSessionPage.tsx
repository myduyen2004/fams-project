import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';

import attendanceService, { SessionDetailResponse } from '../../services/api/attendanceService';
import { toast } from 'react-hot-toast';
import { Loader2, ArrowLeft, Users } from 'lucide-react';

export const AttendanceSessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<SessionDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSession();
        
        // Start polling every 5 seconds (slightly slower since QR is gone)
        const interval = setInterval(() => {
            fetchSession(true);
        }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [sessionId]);

    const fetchSession = async (isPolling = false) => {
        if (!sessionId) return;
        try {
            if (!isPolling) setLoading(true);
            const data = await attendanceService.getSession(Number(sessionId));
            setSession(data);
        } catch (error) {
            console.error("Error fetching session:", error);
            if (!isPolling) toast.error("Không thể tải thông tin phiên điểm danh");
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };


    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-fpt-orange" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <p>Không tìm thấy phiên điểm danh</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-fpt-orange">Quay lại</button>
            </div>
        );
    }

    return (
        <LecturerLayout pageTitle="Điểm danh sinh viên">
            <div className="max-w-4xl mx-auto p-4">
                <button 
                    onClick={() => navigate('/lecturer/schedule')} 
                    className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
                >
                    <ArrowLeft size={16} className="mr-1" /> Quay lại lịch dạy
                </button>

                <div className="space-y-6">
                    {/* Header Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-50 rounded-xl">
                                    <Users className="text-fpt-orange h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 leading-tight">{session.courseName}</h2>
                                    <p className="text-gray-500 font-medium">{session.className} • Phòng {session.roomCode}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="text-center">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Sĩ số</span>
                                    <span className="text-xl font-bold text-gray-900">
                                        <span className="text-green-600">{session.presentCount}</span>
                                        <span className="text-gray-300 mx-1">/</span>
                                        {session.totalStudents}
                                    </span>
                                </div>
                                <div className="h-8 w-[1px] bg-gray-200"></div>
                                <div className="text-center">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Trạng thái</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${session.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {session.status === 'OPEN' ? 'ĐANG MỞ' : 'ĐÃ ĐÓNG'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Student List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                Danh sách sinh viên đã điểm danh
                                <span className="bg-orange-100 text-fpt-orange text-[10px] px-2 py-0.5 rounded-full uppercase">Thời gian thực</span>
                            </h3>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto">
                            {session.students && session.students.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                    {session.students.map((student) => (
                                        <div key={student.studentId} className="flex items-center justify-between p-4 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-bold overflow-hidden border border-gray-200">
                                                    {student.avatarUrl ? (
                                                        <img src={student.avatarUrl} alt={student.fullName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        student.fullName.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{student.fullName}</p>
                                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-tight">{student.studentCode}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                                <span className="text-xs font-mono text-gray-400">
                                                    {formatTime(new Date(student.checkInTime))}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 px-4">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                                        <Users className="text-gray-300 w-8 h-8" />
                                    </div>
                                    <p className="text-gray-400 text-sm font-medium">Chưa có sinh viên nào điểm danh khuôn mặt</p>
                                    <p className="text-xs text-gray-300 mt-1">Sinh viên cần mở app mobile để quét khuôn mặt tại lớp</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100">
                            <button 
                                onClick={() => navigate('/lecturer/schedule')}
                                className="w-full py-4 bg-fpt-orange hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 text-base"
                            >
                                <ArrowLeft size={20} /> Kết thúc phiên và quay lại lịch dạy
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </LecturerLayout>
    );
};
