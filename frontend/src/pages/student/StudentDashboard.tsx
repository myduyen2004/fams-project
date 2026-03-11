import React, { useState, useEffect } from 'react';
import { StudentLayout } from '../../layouts/StudentLayout';
import { Card } from '../../components/common/Card';
import {
    ArrowUpRight,
    Bookmark,
    Clock,
    MapPin,
    Lock
} from 'lucide-react';

import { MiniCalendar } from '../../components/common/MiniCalendar';
import { timetableService } from '../../services/api/timetableService';
import { useNavigate } from 'react-router-dom';
import attendanceService, { StudentAttendanceSummaryResponse } from '../../services/api/attendanceService';
import { lecturerClassService } from '../../services/api/LecturerClass';
import { authService, UserInfo } from '../../services/api/authService';

export const StudentDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedDaySchedule, setSelectedDaySchedule] = useState<any>(null);
    const [isScheduleHidden, setIsScheduleHidden] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [attendanceSummaries, setAttendanceSummaries] = useState<StudentAttendanceSummaryResponse | null>(null);
    const [userProfile, setUserProfile] = useState<UserInfo | null>(null);

    useEffect(() => {
        fetchMonthlySlotCounts();
        fetchDaySchedule(new Date());
        fetchAttendanceData();
        fetchUserProfile();

        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchAttendanceData = async () => {
        try {
            const semesters = await lecturerClassService.getSemesters();
            let semesterCode: string | undefined = undefined;
            
            if (semesters && semesters.length > 0) {
                const ongoing = semesters.find(s => s.status === 'ONGOING');
                semesterCode = ongoing ? ongoing.code : semesters[0].code;
            }
            
            const data = await attendanceService.getStudentReport(semesterCode);
            setAttendanceSummaries(data);
        } catch (error) {
            console.error('Failed to fetch attendance data:', error);
            // Set empty summaries to clear loading state
            setAttendanceSummaries({
                studentName: '',
                studentCode: '',
                semesterName: 'N/A',
                classSummaries: []
            });
        }
    };

    const fetchUserProfile = async () => {
        try {
            const profile = await authService.getCurrentUser();
            setUserProfile(profile);
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        }
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();

    // Calculate indicator position
    const getIndicatorPosition = () => {
        if (!isToday) return null;
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        if (hours < 7 || hours >= 19) return null;
        return ((hours - 7) + minutes / 60) * (100 / 12);
    };

    const indicatorPos = getIndicatorPosition();

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        fetchDaySchedule(date);
    };

    const fetchDaySchedule = async (date: Date) => {
        try {
            setIsScheduleHidden(false);
            const userStr = localStorage.getItem('user');
            if (!userStr) return;

            const user = JSON.parse(userStr);
            // Format date as YYYY-MM-DD in local timezone to avoid timezone issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            console.log('Fetching schedule for date:', dateStr);
            const data = await timetableService.getStudentTimetable(user.id, dateStr);
            console.log('Received timetable data:', data);

            // Find the day matching the selected date
            if (data && data.days) {
                console.log('Days in response:', data.days.map((d: any) => d.date));
                const dayData = data.days.find((d: any) => d.date === dateStr);
                console.log('Matched day data:', dayData);
                setSelectedDaySchedule(dayData || null);
            } else {
                console.log('No days data in response');
                setSelectedDaySchedule(null);
            }
        } catch (error: any) {
            console.error('Failed to fetch day schedule:', error);
            if (error.response && error.response.status === 403) {
                setIsScheduleHidden(true);
            }
            setSelectedDaySchedule(null);
        }
    };

    const fetchMonthlySlotCounts = async (targetYear?: number, targetMonth?: number) => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;

            const user = JSON.parse(userStr);
            const now = new Date();
            const yr = targetYear ?? now.getFullYear();
            const mo = targetMonth ?? now.getMonth(); // 0-indexed

            // Generate Monday of each week that overlaps the month
            const firstOfMonth = new Date(yr, mo, 1);
            const lastOfMonth = new Date(yr, mo + 1, 0);

            // Get Monday of the week containing the 1st
            const getMonday = (d: Date) => {
                const copy = new Date(d);
                const day = copy.getDay();
                const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
                copy.setDate(diff);
                return copy;
            };

            let weekStart = getMonday(firstOfMonth);
            const weekDates: string[] = [];

            while (weekStart <= lastOfMonth) {
                const y = weekStart.getFullYear();
                const m = String(weekStart.getMonth() + 1).padStart(2, '0');
                const d = String(weekStart.getDate()).padStart(2, '0');
                weekDates.push(`${y}-${m}-${d}`);
                weekStart = new Date(weekStart);
                weekStart.setDate(weekStart.getDate() + 7);
            }

            // Fetch all weeks in parallel
            const results = await Promise.all(
                weekDates.map(date =>
                    timetableService.getStudentTimetable(user.id, date).catch(() => null)
                )
            );

            // Merge slot counts from all weeks
            const counts: Record<string, number> = {};
            results.forEach(data => {
                if (data && data.days) {
                    data.days.forEach(day => {
                        if (day.slots && day.slots.length > 0) {
                            counts[day.date] = day.slots.length;
                        }
                    });
                }
            });

            setSlotCounts(counts);
        } catch (error) {
            console.error('Failed to fetch slot counts:', error);
        }
    };

    return (
        <StudentLayout pageTitle="Tổng quan">
            <div className="space-y-6">

                {/* Top Section: GPA, Absence Rate & Calendar (Optimized Proportions) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* GPA Card */}
                    <Card className="p-6 lg:col-span-4 bg-[#F37B24] text-white border-none relative overflow-hidden flex flex-col justify-between min-h-[200px] shadow-lg shadow-orange-500/20">
                        {/* Decorative circles */}
                        <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-white/20 rounded-full"></div>
                        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full"></div>

                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-base font-medium text-white/95">Điểm trung bình (GPA)</h3>
                                    <p className="text-sm text-white/90 mt-1">Học kỳ Spring 2024</p>
                                </div>
                                <div className="p-3 bg-[#FFE4D6] rounded-xl shadow-sm">
                                    <Bookmark size={24} className="text-[#F37B24]" strokeWidth={2.5} />
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="flex items-baseline gap-3 mb-4">
                                    <span className="text-6xl font-black tracking-tight">
                                        {typeof userProfile?.gpa === 'number' ? userProfile.gpa.toFixed(2) : '0.00'}
                                    </span>
                                    <span className="text-2xl text-white/90 font-medium">/ 4.0</span>
                                </div>

                                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-sm font-medium w-fit border border-white/10">
                                    <ArrowUpRight size={16} strokeWidth={3} />
                                    <span>Danh hiệu: {
                                        typeof userProfile?.gpa === 'number' 
                                            ? userProfile.gpa >= 3.6 ? 'Xuất sắc' 
                                            : userProfile.gpa >= 3.2 ? 'Giỏi' 
                                            : userProfile.gpa >= 2.5 ? 'Khá' 
                                            : 'Trung bình'
                                            : 'Khá'
                                    }</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Participation Rate Card (Expanded) */}
                    <Card className="p-5 lg:col-span-5 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Tỉ lệ chuyên cần</h3>
                            <button className="text-[11px] text-fpt-orange hover:underline" onClick={() => navigate('/student/attendance')}>Chi tiết</button>
                        </div>
                        <div className="space-y-4 pr-1">
                            {attendanceSummaries?.classSummaries && attendanceSummaries.classSummaries.length > 0 ? (
                                attendanceSummaries.classSummaries.map((item, idx) => {
                                    const isWarning = (item.absentPercentage ?? 0) >= 10;
                                    const isDanger = (item.absentPercentage ?? 0) >= 20;
                                    const progressColor = isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-emerald-500';
                                    const textColor = isDanger ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-emerald-500';
                                    const statusText = isDanger ? 'Cảnh báo cấm thi' : isWarning ? 'Cảnh báo' : 'An toàn';
                                    
                                    const absPercent = typeof item.absentPercentage === 'number' ? item.absentPercentage : 0;
                                    const participationRate = (100 - absPercent).toFixed(1);

                                    return (
                                        <div key={idx} className="group">
                                            <div className="flex justify-between items-baseline text-xs mb-1.5">
                                                <button 
                                                    onClick={() => navigate('/student/attendance', { state: { selectedClassName: item.className } })}
                                                    className="font-bold text-gray-800 dark:text-gray-200 hover:text-fpt-orange transition-colors"
                                                >
                                                    {item.className.split('-')[0]}
                                                </button>
                                                <span className={`font-black ${textColor} text-xs`}>
                                                    {participationRate}%
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-gray-100 dark:bg-zinc-800/50 rounded-full overflow-hidden shadow-inner cursor-pointer"
                                                onClick={() => navigate('/student/attendance', { state: { selectedClassName: item.className } })}
                                            >
                                                <div 
                                                    className={`h-full ${progressColor} rounded-full transition-all duration-700 ease-out`} 
                                                    style={{ width: `${participationRate}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-[9px] font-medium text-gray-400 truncate max-w-[120px]" title={item.courseName}>{item.courseName}</span>
                                                <span className={`${textColor} text-[9px] font-bold tracking-tight uppercase`}>
                                                    {statusText} • Vắng {item.unexcusedAbsentCount}/{item.totalSlots}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-4 text-gray-400 text-xs">
                                    {attendanceSummaries ? 'Không có dữ liệu khóa học' : 'Đang tải...'}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Calendar */}
                    <div className="lg:col-span-3">
                        <MiniCalendar
                            slotCounts={slotCounts}
                            onDateSelect={handleDateSelect}
                            onMonthChange={(yr, mo) => fetchMonthlySlotCounts(yr, mo)}
                            selectedDate={selectedDate}
                        />
                    </div>
                </div>

                {/* Schedule Section */}
                <Card className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {selectedDate.toDateString() === new Date().toDateString()
                                    ? 'Lịch học hôm nay'
                                    : 'Lịch học ngày ' + selectedDate.getDate() + '/' + (selectedDate.getMonth() + 1)}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {selectedDate.getDate()}/{selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}
                            </p>
                        </div>

                    </div>

                    <div className="relative mt-2">
                        {isScheduleHidden ? (
                            <div className="text-center py-20 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                    <Lock className="w-8 h-8 text-gray-400" />
                                </div>
                                <div className="text-gray-900 dark:text-white font-bold text-lg">Lịch học chưa được công bố</div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                    Vui lòng quay lại sau khi nhà trường công bố lịch học chính thức.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Timeline Container */}
                                <div className="overflow-x-auto pb-6 no-scrollbar">
                                    <div className="min-w-[960px]">
                                        {/* Timeline Ruler - Evenly spaced */}
                                        <div className="flex items-center mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2">
                                            {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((hour) => (
                                                <div key={hour} className="flex-1 text-center">
                                                    <span className="text-xs text-slate-400 font-medium">{hour}:00</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Schedule Cards Container */}
                                        <div className="relative h-[380px]">
                                            {/* Vertical grid lines */}
                                            <div className="absolute inset-0 flex pointer-events-none">
                                                {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((hour, idx) => (
                                                    <div key={hour} className={`flex-1 h-full ${idx > 0 ? 'border-l border-gray-50 dark:border-zinc-800/30' : ''}`} />
                                                ))}
                                            </div>

                                            {/* Real-time indicator line */}
                                            {indicatorPos !== null && (
                                                <div 
                                                    className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                                    style={{ left: `${indicatorPos}%` }}
                                                >
                                                    <div className="absolute -top-1 -left-[5px] w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm" />
                                                </div>
                                            )}

                                            {selectedDaySchedule && selectedDaySchedule.slots && selectedDaySchedule.slots.length > 0 ? (
                                                selectedDaySchedule.slots.map((slot: any, index: number) => {
                                                    const isCurrentlyActive = () => {
                                                        if (!slot.startTime || !slot.endTime || !isToday) return false;
                                                        const timeStr = currentTime.getHours().toString().padStart(2, '0') + ':' + currentTime.getMinutes().toString().padStart(2, '0');
                                                        return timeStr >= slot.startTime.substring(0, 5) && timeStr <= slot.endTime.substring(0, 5);
                                                    };
                                                    const isActive = isCurrentlyActive();

                                                    // Calculate position based on time (each hour = 1/12 of container width = 8.333%)
                                                    const startHour = parseInt(slot.startTime?.substring(0, 2) || '7');
                                                    const startMin = parseInt(slot.startTime?.substring(3, 5) || '0');
                                                    const endHour = parseInt(slot.endTime?.substring(0, 2) || '9');
                                                    const endMin = parseInt(slot.endTime?.substring(3, 5) || '0');

                                                    const leftPercent = ((startHour - 7) + startMin / 60) * (100 / 12);
                                                    const duration = (endHour - startHour) + (endMin - startMin) / 60;
                                                    const widthPercent = Math.max(duration * (100 / 12), 12); // min 12% width



                                                    return (
                                                        <div
                                                            key={slot.id || index}
                                                            onClick={() => navigate('/student/schedule')}
                                                            style={{ left: `${leftPercent}%`, width: `calc(${widthPercent}% - 8px)` }}
                                                            className={`absolute top-2 bottom-2 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-lg hover:z-10 cursor-pointer ${isActive
                                                                ? 'bg-amber-50/90 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50 ring-2 ring-amber-500/20'
                                                                : 'bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800'
                                                                }`}
                                                        >
                                                            {/* Left Orange Accent Bar */}
                                                            <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-fpt-orange rounded-l-2xl" />

                                                            {/* Card Content */}
                                                            <div className="p-4 pl-5 h-full flex flex-col">
                                                                {/* Top Section - Course Info */}
                                                                <div className="mt-1">
                                                                    <h4 className={`text-lg font-bold leading-none ${isActive ? 'text-orange-800' : 'text-gray-800 dark:text-gray-200'}`}>
                                                                        {slot.courseCode || 'N/A'}
                                                                    </h4>
                                                                    <p className="text-slate-400 text-sm font-medium mt-1.5">{slot.className || 'N/A'}</p>
                                                                </div>

                                                                {/* Spacer */}
                                                                <div className="flex-grow" />

                                                                {/* Bottom Section - Time, Room */}
                                                                <div className="space-y-2 mb-1">
                                                                    <div className="flex items-center gap-2 text-slate-400">
                                                                        <Clock size={16} />
                                                                        <span className="text-sm font-medium">{slot.startTime?.substring(0, 5) || '00:00'} - {slot.endTime?.substring(0, 5) || '00:00'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-slate-400">
                                                                        <MapPin size={16} />
                                                                        <span className="text-sm font-medium">{slot.roomName || slot.roomCode || 'TBA'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="text-gray-500 font-bold">Không có lịch học trong ngày này</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </Card>

                {/* Schedule details or other widgets can go here */}
            </div >
        </StudentLayout >
    );
};
