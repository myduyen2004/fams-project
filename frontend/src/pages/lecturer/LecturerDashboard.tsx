import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { Card } from '../../components/common/Card';
import { dashboardService } from '../../services/api/dashboardService';
import { AppNotification } from '../../types/dashboard';
import {
    Clock,
    MapPin
} from 'lucide-react';

const QuickStats = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await dashboardService.getNotifications();
                // Sort by timestamp desc to be safe, though backend likely does it
                const sorted = (data || []).sort((a, b) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
                setNotifications(sorted);
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        };

        fetchNotifications();
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const latestNotification = notifications.length > 0 ? notifications[0] : null;

    const cardGradientClass = "bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-900/5 dark:to-amber-900/5 border-orange-100/50 dark:border-orange-800/20";
    const cardGreenGradientClass = "bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-900/5 dark:to-emerald-900/5 border-green-100/50 dark:border-green-800/20";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Classes */}
            <Card className={`p-5 flex flex-col justify-between min-h-[160px] hover:shadow-md transition-shadow ${cardGradientClass}`}>
                <div className="flex justify-between items-start">
                    {/* Icon removed */}
                </div>
                <div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">5</h3>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">Lớp học hôm nay</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tổng quan trong ngày</p>
                </div>
            </Card>

            {/* Card 2: Attendance Rate */}
            <Card className={`p-5 flex flex-col justify-between min-h-[160px] hover:shadow-md transition-shadow ${cardGreenGradientClass}`}>
                <div className="flex justify-between items-start">
                </div>
                <div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">92%</h3>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">Tỷ lệ điểm danh</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">+2% so với tuần trước</p>
                </div>
            </Card>

            {/* Card 3: New Notifications */}
            <Card className={`p-5 flex flex-col justify-between min-h-[160px] hover:shadow-md transition-shadow ${cardGradientClass}`}>
                <div className="flex justify-between items-start">
                    {/* Icon removed */}
                </div>
                <div>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {unreadCount}
                    </h3>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">Thông báo mới</p>

                    {latestNotification ? (
                        <div className="mt-2 flex flex-col gap-1">
                            <p
                                className="text-sm text-fpt-orange hover:underline cursor-pointer font-medium"
                                onClick={() => navigate('/notifications')}
                            >
                                Xem chi tiết
                            </p>
                        </div>
                    ) : (
                        <p
                            className="text-sm text-fpt-orange hover:underline cursor-pointer mt-1 font-medium"
                            onClick={() => navigate('/notifications')}
                        >
                            Xem tất cả
                        </p>
                    )}
                </div>
            </Card>

            {/* Card 4: Next Class Info */}
            <Card className={`p-5 flex flex-col justify-between min-h-[160px] hover:shadow-md transition-shadow ${cardGradientClass}`}>
                <div className="flex justify-between items-start">
                    {/* Icon removed */}
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">13:15</h3>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">Lớp tiếp theo</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">MAE101 (Gamma 101)</p>
                </div>
            </Card>
        </div>
    );
};

import { MiniCalendar } from '../../components/common/MiniCalendar';

const TeachingSchedule = () => {
    const timeSlots = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    // Updated data to match the image timeline
    const classes = [
        {
            id: 1,
            code: 'MAE101',
            name: 'SE18807',
            time: '09:00 - 10:15',
            location: 'Gamma - 101',
            status: 'completed',
            isNow: false,
            students: '28/30',
        },
        {
            id: 2,
            code: 'MAE101',
            name: 'SE18807',
            time: '10:30 - 11:45',
            location: 'Gamma - 101',
            status: 'now',
            isNow: true,
            students: '22/25',
        },
        {
            id: 3,
            code: 'MAE101',
            name: 'SE18807',
            time: '12:00 - 13:00',
            location: 'Gamma - 101',
            status: 'upcoming',
            isNow: false,
            students: '22/25',
        },
        {
            id: 4,
            code: 'MAE101',
            name: 'SE18807',
            time: '13:15 - 14:30',
            location: 'Gamma - 101',
            status: 'upcoming',
            isNow: false,
            students: '0/30',
        }
    ];

    return (
        <Card className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Lịch dạy hôm nay</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </p>
                </div>
                <div className="flex gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Đầy đủ</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Trung bình</div>
                    <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Thiếu nhiều</div>
                </div>
            </div>

            {/* Timeline Container */}
            <div className="relative overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                {/* Timeline Markers */}
                <div className="flex min-w-[800px] mb-8 pl-4 border-b border-gray-100 dark:border-zinc-800 pb-2">
                    {timeSlots.map(time => (
                        <div key={time} className="flex-1 text-center relative">
                            <span className="text-xs font-medium text-gray-400">{time}</span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-4 bg-gray-200 dark:bg-zinc-800 mt-1"></div>
                        </div>
                    ))}
                </div>

                {/* Class Cards Row */}
                <div className="flex gap-5 min-w-[800px] px-2">
                    {classes.map((cls) => (
                        <div
                            key={cls.id}
                            className={`
                                flex-1 min-w-[220px] p-5 rounded-2xl border relative flex flex-col justify-between min-h-[200px] transition-all hover:shadow-md
                                ${cls.isNow
                                    ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-500/30'
                                    : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800'
                                }
                            `}
                        >
                            {cls.isNow && (
                                <div className="absolute top-4 right-4 bg-fpt-orange/10 text-fpt-orange text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                    Đang diễn ra
                                </div>
                            )}

                            <div className="mb-4">
                                <h4 className={`text-lg font-bold ${cls.isNow ? 'text-fpt-orange' : 'text-gray-900 dark:text-white'}`}>
                                    {cls.code}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{cls.name}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                                    <Clock size={16} className="text-gray-400" />
                                    <span>{cls.time}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span>{cls.location}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-6 text-xs font-medium border-t border-gray-100 dark:border-zinc-800/50 pt-4">
                                <span className={`w-2.5 h-2.5 rounded-full ${cls.isNow ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' :
                                    cls.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                                    }`}></span>
                                <span className="text-gray-500 dark:text-gray-400">{cls.students} Sinh viên</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};

export const LecturerDashboard: React.FC = () => {
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
                            <MiniCalendar />
                        </div>
                    </div>
                </div>

                {/* Teaching Schedule */}
                <TeachingSchedule />

                {/* Bottom Section: Staff Meeting */}
                <div className="w-full">
                    {/* Staff Meeting Card Removed */}
                </div>
            </div>
        </LecturerLayout>
    );
};
