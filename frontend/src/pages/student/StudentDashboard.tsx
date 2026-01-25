import React, { useState, useEffect } from 'react';
import { StudentLayout } from '../../layouts/StudentLayout';
import { Card } from '../../components/common/Card';
import {
    CheckCircle2,
    XCircle,
    ArrowUpRight,
    Bookmark,
    Clock,
    MapPin
} from 'lucide-react';

import { StudentNotificationsWidget } from './StudentNotificationsWidget';
import { MiniCalendar } from '../../components/common/MiniCalendar';
import { timetableService } from '../../services/api/timetableService';

export const StudentDashboard: React.FC = () => {
    const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedDaySchedule, setSelectedDaySchedule] = useState<any>(null);

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
        } catch (error) {
            console.error('Failed to fetch day schedule:', error);
            setSelectedDaySchedule(null);
        }
    };

    const fetchMonthlySlotCounts = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;

            const user = JSON.parse(userStr);
            const today = new Date();

            // Fetch timetable for current month
            const data = await timetableService.getStudentTimetable(user.id, today.toISOString().split('T')[0]);

            // Count slots per day
            const counts: Record<string, number> = {};
            if (data && data.days) {
                data.days.forEach(day => {
                    if (day.slots && day.slots.length > 0) {
                        counts[day.date] = day.slots.length;
                    }
                });
            }

            setSlotCounts(counts);
        } catch (error) {
            console.error('Failed to fetch slot counts:', error);
        }
    };

    return (
        <StudentLayout pageTitle="Tổng quan">
            <div className="space-y-6">

                {/* Top Section: GPA & AI Suggestions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* GPA Card */}
                    <Card className="p-6 bg-[#F37B24] text-white border-none relative overflow-hidden flex flex-col justify-between min-h-[200px] shadow-lg shadow-orange-500/20">
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
                                    <span className="text-6xl font-black tracking-tight">3.45</span>
                                    <span className="text-2xl text-white/90 font-medium">/ 4.0</span>
                                </div>

                                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-sm font-medium w-fit border border-white/10">
                                    <ArrowUpRight size={16} strokeWidth={3} />
                                    <span>+0.15 so với kỳ trước</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Calendar */}
                    <div className="lg:col-span-2">
                        <MiniCalendar
                            slotCounts={slotCounts}
                            onDateSelect={handleDateSelect}
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
                        <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> Có mặt</div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Vắng mặt</div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Chưa diễn ra</div>
                        </div>
                    </div>


                    <div className="relative">
                        {selectedDaySchedule && selectedDaySchedule.slots && selectedDaySchedule.slots.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {selectedDaySchedule.slots.map((slot: any, index: number) => (
                                    <div
                                        key={slot.id || index}
                                        className="border border-gray-100 dark:border-zinc-800 rounded-xl p-4 hover:shadow-md transition-shadow relative group bg-white dark:bg-zinc-900 h-full flex flex-col justify-between"
                                    >
                                        <div className="absolute top-4 right-4 text-xs font-bold text-gray-400">
                                            {slot.courseCode || 'N/A'}
                                        </div>
                                        <div className="mb-6">
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                                                {slot.courseName || slot.courseCode || 'Unknown Course'}
                                            </h4>
                                            <p className="text-sm text-gray-500">{slot.className || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={16} /> {slot.startTime || '00:00'} - {slot.endTime || '00:00'}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={16} /> {slot.roomName || slot.roomCode || 'TBA'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                                                <div className={`w-2.5 h-2.5 rounded-full ${slot.attendanceStatus === 'PRESENT' ? 'bg-green-500' :
                                                        slot.attendanceStatus === 'ABSENT' ? 'bg-red-500' :
                                                            'bg-blue-500'
                                                    }`}></div>
                                                <span>
                                                    {slot.attendanceStatus === 'PRESENT' ? 'Có mặt' :
                                                        slot.attendanceStatus === 'ABSENT' ? 'Vắng mặt' :
                                                            'Chưa diễn ra'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500 dark:text-gray-400">
                                    Không có lịch học trong ngày này
                                </p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Bottom Section: Absence Rate & Notifications */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tỷ lệ vắng mặt</h3>
                            <button className="text-xs text-fpt-orange hover:underline">Chi tiết</button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                            {/* Item 1 */}
                            <div>
                                <div className="flex justify-between text-base mb-1.5">
                                    <span className="font-medium text-gray-900 dark:text-white">Lập trình C++</span>
                                    <span className="font-bold text-green-500 text-sm">95%</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-2 uppercase tracking-wide">PRO192</p>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: '95%' }}></div>
                                </div>
                                <div className="flex items-center gap-1 mt-2 text-xs text-green-600 font-medium">
                                    <CheckCircle2 size={12} /> An toàn
                                </div>
                            </div>

                            {/* Item 2 */}
                            <div>
                                <div className="flex justify-between text-base mb-1.5">
                                    <span className="font-medium text-gray-900 dark:text-white">Toán cao cấp</span>
                                    <span className="font-bold text-yellow-500 text-sm">80%</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-2 uppercase tracking-wide">MAT101</p>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: '80%' }}></div>
                                </div>
                                <div className="flex items-center gap-1 mt-2 text-xs text-green-600 font-medium">
                                    <CheckCircle2 size={12} /> An toàn
                                </div>
                            </div>

                            {/* Item 3 */}
                            <div>
                                <div className="flex justify-between text-base mb-1.5">
                                    <span className="font-medium text-gray-900 dark:text-white">Kỹ năng mềm</span>
                                    <span className="font-bold text-green-500 text-sm">90%</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-2 uppercase tracking-wide">SSG104</p>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: '90%' }}></div>
                                </div>
                                <div className="flex items-center gap-1 mt-2 text-xs text-green-600 font-medium">
                                    <CheckCircle2 size={12} /> An toàn
                                </div>
                            </div>

                            {/* Item 4 */}
                            <div>
                                <div className="flex justify-between text-base mb-1.5">
                                    <span className="font-medium text-gray-900 dark:text-white">Triết học</span>
                                    <span className="font-bold text-red-500 text-sm">75%</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-2 uppercase tracking-wide">PHI102</p>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 rounded-full" style={{ width: '75%' }}></div>
                                </div>
                                <div className="flex items-center gap-1 mt-2 text-xs text-red-600 font-medium">
                                    <XCircle size={12} /> Cảnh báo cấm thi
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="h-full">
                        <StudentNotificationsWidget />
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
};
