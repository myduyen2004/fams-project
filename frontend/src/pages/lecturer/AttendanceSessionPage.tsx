import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';

import QRCode from "react-qr-code";
import attendanceService, { SessionDetailResponse } from '../../services/api/attendanceService';
import { toast } from 'react-hot-toast';
import { Loader2, ArrowLeft } from 'lucide-react';

export const AttendanceSessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<SessionDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Polling interval ref
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchSession();
        
        // Start polling every 3 seconds
        intervalRef.current = setInterval(() => {
            fetchSession(true);
        }, 3000);

        // Timer for clock
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            clearInterval(timer);
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

    const getTimerData = () => {
        if (!session || !session.qrExpiresAt) return { text: "00:00", percent: 0, seconds: 0, minutes: 0 };
        const expires = new Date(session.qrExpiresAt).getTime();
        const now = currentTime.getTime();
        const diff = Math.max(0, Math.floor((expires - now) / 1000)); // seconds remaining

        // Assuming 5 minutes (300s) is the max duration for the progress bar
        const totalDuration = 300; 
        const percent = (diff / totalDuration) * 100;

        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        const text = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        return { text, percent, minutes, seconds };
    };

    const timerData = getTimerData();

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
            <div className="max-w-6xl mx-auto p-4">
                <button 
                    onClick={() => navigate('/lecturer/schedule')} 
                    className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
                >
                    <ArrowLeft size={16} className="mr-1" /> Quay lại lịch dạy
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Student List - simplified */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                             <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">{session.courseName}</h2>
                                    <p className="text-sm text-gray-500">{session.className} - {session.roomCode}</p>
                                </div>
                                <div className="text-right">
                                     <span className="text-xs text-gray-500 block uppercase">Sĩ số</span>
                                     <span className="text-xl font-bold text-gray-800">
                                        <span className="text-green-600">{session.presentCount}</span>/{session.totalStudents}
                                     </span>
                                </div>
                             </div>

                             <div className="h-[1px] bg-gray-100 mb-4"></div>

                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                                {session.students && session.students.length > 0 ? (
                                    session.students.map((student) => (
                                        <div key={student.studentId} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold overflow-hidden">
                                                    {student.avatarUrl ? (
                                                        <img src={student.avatarUrl} alt={student.fullName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        student.fullName.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 text-sm">{student.fullName}</p>
                                                    <p className="text-xs text-gray-500">{student.studentCode}</p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {formatTime(new Date(student.checkInTime))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        Chưa có sinh viên nào điểm danh
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: QR Code Card - Styled like reference */}
                    <div className="lg:col-span-5">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
                            <div className="p-8 text-center">
                                <h2 className="text-2xl font-bold text-[#F97316] mb-2">Mã QR điểm danh</h2>
                                <p className="text-sm text-gray-500 mb-8">Sinh viên vui lòng quét mã bên dưới<br/>để tiếp tục điểm danh</p>
                                
                                {/* Frame corners for visual effect similar to image (simplified with border) */}
                                <div className="relative inline-block p-4 rounded-xl border-2 border-dashed border-gray-200 mb-8">
                                    <div className="bg-white p-2">
                                        <QRCode
                                            size={200}
                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                            value={session.qrCodeData}
                                            viewBox={`0 0 256 256`}
                                        />
                                    </div>
                                    
                                    {/* Corner accents - Optional, using CSS borders for simplicity */}
                                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#F97316] -mt-1 -ml-1 rounded-tl-lg"></div>
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#F97316] -mt-1 -mr-1 rounded-tr-lg"></div>
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#F97316] -mb-1 -ml-1 rounded-bl-lg"></div>
                                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#F97316] -mb-1 -mr-1 rounded-br-lg"></div>
                                </div>

                                <div className="mb-2">
                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Mã sẽ hết hạn trong</p>
                                    <div className="text-4xl font-bold font-mono tracking-wider">
                                        <span className="text-gray-800">
                                            {timerData.minutes < 10 ? '0' : ''}{timerData.minutes}
                                        </span>
                                        <span className="text-gray-300 mx-1">:</span>
                                        <span className="text-[#F97316]">
                                            {timerData.seconds < 10 ? '0' : ''}{timerData.seconds}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4 mb-8 overflow-hidden">
                                    <div 
                                        className="h-full bg-[#F97316] transition-all duration-1000 ease-linear rounded-full"
                                        style={{ width: `${timerData.percent}%` }}
                                    ></div>
                                </div>

                                <button 
                                    onClick={() => navigate('/lecturer/schedule')}
                                    className="w-full py-3 bg-[#F97316] hover:bg-orange-600 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                                >
                                    Kết thúc điểm danh <ArrowLeft className="rotate-180" size={16}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </LecturerLayout>
    );
};
