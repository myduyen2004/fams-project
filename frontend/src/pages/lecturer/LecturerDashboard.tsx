import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { Card } from '../../components/common/Card';
import timetableService, { TimetableSlotDTO } from '../../services/api/timetableService';
import {
    Clock,
    MapPin,
    Lock,
    Users,
    Activity,
    FastForward,
    ArrowUpRight
} from 'lucide-react';
import { MiniCalendar } from '../../components/common/MiniCalendar';

interface TodayScheduleData {
    todayClassCount: number;
    nextClass: TimetableSlotDTO | null;
}

const QuickStats = () => {
    const [scheduleData, setScheduleData] = useState<TodayScheduleData>({
        todayClassCount: 0,
        nextClass: null
    });
    const [loading, setLoading] = useState(true);
    const [isScheduleHidden, setIsScheduleHidden] = useState(false);

    // Helper to format date as YYYY-MM-DD (Local time)
    const formatDateToLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch timetable for today
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    const today = formatDateToLocal(new Date());
                    try {
                        const timetable = await timetableService.getLecturerTimetable(user.id, today);

                        // Find today's slots
                        const todayData = timetable?.days?.find(d => d.date?.startsWith(today));
                        const todaySlots = todayData?.slots?.filter(s => s.status === 'SCHEDULED') || [];

                        // Find next class (upcoming slot)
                        const now = new Date();
                        const currentTime = now.getHours() * 60 + now.getMinutes();

                        let nextClass: TimetableSlotDTO | null = null;
                        for (const slot of todaySlots) {
                            if (slot.startTime) {
                                const [hours, minutes] = slot.startTime.split(':').map(Number);
                                const slotTime = hours * 60 + minutes;
                                if (slotTime > currentTime) {
                                    nextClass = slot;
                                    break;
                                }
                            }
                        }

                        setScheduleData({
                            todayClassCount: todaySlots.length,
                            nextClass
                        });
                    } catch (timetableError: any) {
                        if (timetableError.response && timetableError.response.status === 403) {
                            setIsScheduleHidden(true);
                        }
                        console.error("Failed to fetch timetable", timetableError);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Format time for display
    const formatTime = (time?: string) => {
        if (!time) return '--:--';
        return time.substring(0, 5);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {/* Card 1: Today's Classes */}
            <div className="group relative overflow-hidden rounded-[32px] bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg shadow-orange-200 transition-all hover:scale-[1.02] hover:shadow-xl dark:shadow-none">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-all group-hover:scale-150"></div>
                <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-md">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                            <Activity className="h-3 w-3" />
                            <span>Hôm nay</span>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex items-baseline gap-1">
                            <h3 className="text-4xl font-black">
                                {loading ? '...' : isScheduleHidden ? '--' : scheduleData.todayClassCount}
                            </h3>
                            <span className="text-sm font-medium opacity-80">lớp</span>
                        </div>
                        <p className="mt-1 text-sm font-bold uppercase tracking-widest opacity-90">Lớp học hiện có</p>
                        <p className="mt-2 text-[11px] font-medium leading-tight opacity-70">
                            {isScheduleHidden ? 'Lịch chưa được công bố' : 'Dựa trên thời khóa biểu chính thức'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Card 2: Attendance Rate */}
            <div className="group relative overflow-hidden rounded-[32px] bg-white p-6 shadow-sm border border-gray-100 transition-all hover:scale-[1.02] hover:shadow-md dark:bg-zinc-900 dark:border-zinc-800">
                <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl transition-all group-hover:bg-emerald-500/10"></div>
                <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
                            <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <ArrowUpRight className="h-3 w-3" />
                            <span>+2.4%</span>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex items-baseline gap-1">
                            <h3 className="text-4xl font-black text-gray-900 dark:text-white">92.8<span className="text-xl">%</span></h3>
                        </div>
                        <p className="mt-1 text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400">Tỷ lệ điểm danh</p>
                        <p className="mt-2 text-[11px] font-medium leading-tight text-gray-400 dark:text-zinc-500">
                            Tăng nhẹ so với tuần trước
                        </p>
                    </div>
                </div>
            </div>

            {/* Card 3: Next Class (Modernized with Blue style) */}
            <div className="group relative overflow-hidden rounded-[32px] bg-white p-6 shadow-sm border border-gray-100 transition-all hover:scale-[1.02] hover:shadow-md dark:bg-zinc-900 dark:border-zinc-800">
                <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl transition-all group-hover:bg-blue-500/10"></div>
                <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="rounded-2xl bg-blue-50 p-3 dark:bg-blue-900/20">
                            <FastForward className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30">
                            {loading ? '---' : isScheduleHidden ? '--' : (scheduleData.nextClass ? formatTime(scheduleData.nextClass.startTime) : '---')}
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                            {loading ? '...' : isScheduleHidden ? '--' : (scheduleData.nextClass ? scheduleData.nextClass.courseCode : 'Hoàn thành')}
                        </h3>
                        <p className="mt-1 text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400">Lớp tiếp theo</p>
                        <p className="mt-2 text-[11px] font-medium leading-tight text-gray-400 dark:text-zinc-500 truncate">
                            {loading ? 'Đang tải...' : isScheduleHidden ? 'Lịch chưa công bố' : (
                                scheduleData.nextClass
                                    ? `Phòng: ${scheduleData.nextClass.roomCode || scheduleData.nextClass.roomName}`
                                    : 'Bạn đã hoàn thành lịch dạy!'
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface TeachingScheduleProps {
    selectedDate: Date;
    daySchedule: any;
    isScheduleHidden: boolean;
}

const TeachingSchedule: React.FC<TeachingScheduleProps> = ({ selectedDate, daySchedule, isScheduleHidden }) => {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const isToday = selectedDate.toDateString() === new Date().toDateString();

    // Calculate indicator position
    const getIndicatorPosition = () => {
        if (!isToday) return null;
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        
        if (hours < 7 || hours >= 19) return null; // Outside display range
        
        return ((hours - 7) + minutes / 60) * (100 / 12);
    };

    const indicatorPos = getIndicatorPosition();

    return (
        <Card className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedDate.toDateString() === new Date().toDateString()
                            ? 'Lịch dạy hôm nay'
                            : 'Lịch dạy ngày ' + selectedDate.getDate() + '/' + (selectedDate.getMonth() + 1)}
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
                        <div className="text-gray-900 dark:text-white font-bold text-lg">Lịch dạy chưa được công bố</div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            Vui lòng quay lại sau khi nhà trường công bố lịch dạy chính thức.
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

                                    {daySchedule && daySchedule.slots && daySchedule.slots.length > 0 ? (
                                        daySchedule.slots.filter((slot: any) => slot.status === 'SCHEDULED').map((slot: any, index: number) => {
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
                                                    onClick={() => navigate('/lecturer/schedule')}
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
                                            <div className="text-gray-500 font-bold">Không có lịch dạy trong ngày này</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Card>
    );
};

export const LecturerDashboard: React.FC = () => {
    const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedDaySchedule, setSelectedDaySchedule] = useState<any>(null);
    const [isScheduleHidden, setIsScheduleHidden] = useState(false);

    useEffect(() => {
        fetchMonthlySlotCounts();
        fetchDaySchedule(new Date());
    }, []);

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

            console.log('Fetching lecturer schedule for date:', dateStr);
            const data = await timetableService.getLecturerTimetable(user.id, dateStr);
            console.log('Received lecturer timetable data:', data);

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
                    timetableService.getLecturerTimetable(user.id, date).catch(() => null)
                )
            );

            // Merge slot counts from all weeks
            const counts: Record<string, number> = {};
            results.forEach(data => {
                if (data && data.days) {
                    data.days.forEach(day => {
                        if (day.slots && day.slots.length > 0) {
                            const scheduledSlots = day.slots.filter(s => s.status === 'SCHEDULED');
                            if (scheduledSlots.length > 0) {
                                counts[day.date] = scheduledSlots.length;
                            }
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
        <LecturerLayout pageTitle="Tổng quan">
            <div className="space-y-8">
                {/* Header: Quick Stats + Calendar */}
                <div className="flex flex-col xl:flex-row gap-6">
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Thống kê nhanh</h2>
                        </div>
                        <QuickStats />
                    </div>
                    <div className="w-full xl:w-96">
                        <div className="h-full">
                            <MiniCalendar
                                slotCounts={slotCounts}
                                onDateSelect={handleDateSelect}
                                onMonthChange={(yr, mo) => fetchMonthlySlotCounts(yr, mo)}
                                selectedDate={selectedDate}
                            />
                        </div>
                    </div>
                </div>

                {/* Teaching Schedule */}
                <TeachingSchedule
                    selectedDate={selectedDate}
                    daySchedule={selectedDaySchedule}
                    isScheduleHidden={isScheduleHidden}
                />

                {/* Bottom Section: Staff Meeting */}
                <div className="w-full">
                    {/* Staff Meeting Card Removed */}
                </div>
            </div>
        </LecturerLayout>
    );
};

