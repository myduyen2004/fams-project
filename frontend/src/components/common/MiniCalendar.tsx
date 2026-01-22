import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const MiniCalendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Get current month details
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month (0-6, 0 is Sunday)
    const firstDay = new Date(year, month, 1).getDay();

    // Number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Generate calendar days array
    const calendarDays = [];

    // Add empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(null);
    }

    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(i);
    }

    const monthNames = [
        "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
        "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
    ];

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 h-full border border-gray-100 dark:border-zinc-800 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {monthNames[month]} {year}
                </h4>
                <div className="flex gap-1">
                    <button
                        onClick={() => setCurrentDate(new Date(year, month - 1))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <ChevronLeft size={16} className="text-gray-500" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date(year, month + 1))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <ChevronRight size={16} className="text-gray-500" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                    <div key={d} className="text-xs text-gray-400 font-bold mb-2">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center flex-1 content-start">
                {calendarDays.map((date, index) => (
                    <div key={index} className="aspect-square flex items-center justify-center">
                        {date && (
                            <div
                                className={`
                                    w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium cursor-pointer transition-all
                                    ${isToday(date)
                                        ? 'bg-fpt-orange text-white font-bold shadow-md shadow-orange-500/20'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                                    }
                                `}
                            >
                                {date}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
