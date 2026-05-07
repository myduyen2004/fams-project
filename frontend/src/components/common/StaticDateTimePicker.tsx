import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, parseISO, isValid, setHours, setMinutes } from 'date-fns';
import { vi } from 'date-fns/locale';

interface StaticDateTimePickerProps {
    value: string; // ISO format: YYYY-MM-DDTHH:mm
    onChange: (value: string) => void;
    label?: string;
    disabled?: boolean;
}

export const StaticDateTimePicker: React.FC<StaticDateTimePickerProps> = ({
    value,
    onChange,
    label,
    disabled = false,
}) => {
    const parseValue = (val: string): Date => {
        if (!val) return new Date();
        const parsed = parseISO(val);
        return isValid(parsed) ? parsed : new Date();
    };

    const [viewDate, setViewDate] = useState(parseValue(value));
    const [selectedDate, setSelectedDate] = useState<Date | null>(value ? parseValue(value) : null);

    // Time states
    const [hours, setHoursState] = useState(selectedDate ? selectedDate.getHours() : 12);
    const [minutes, setMinutesState] = useState(selectedDate ? selectedDate.getMinutes() : 0);

    useEffect(() => {
        if (value) {
            const date = parseISO(value);
            if (isValid(date)) {
                setSelectedDate(date);
                setViewDate(date);
                setHoursState(date.getHours());
                setMinutesState(date.getMinutes());
            }
        }
    }, [value]);

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [viewDate]);

    const handleDateClick = (date: Date) => {
        if (disabled) return;
        setSelectedDate(date);
        const finalDate = setMinutes(setHours(date, hours), minutes);
        onChange(format(finalDate, "yyyy-MM-dd'T'HH:mm"));
    };

    const handleTimeChange = (h: number, m: number) => {
        if (disabled) return;
        setHoursState(h);
        setMinutesState(m);
        if (selectedDate) {
            const finalDate = setMinutes(setHours(selectedDate, h), m);
            onChange(format(finalDate, "yyyy-MM-dd'T'HH:mm"));
        }
    };

    const nextMonth = () => setViewDate(addMonths(viewDate, 1));
    const prevMonth = () => setViewDate(subMonths(viewDate, 1));

    return (
        <div className="flex flex-col gap-4">
            <style dangerouslySetInnerHTML={{
                __html: `
                .no-spinner::-webkit-inner-spin-button, 
                .no-spinner::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                .no-spinner { -moz-appearance: textfield; }
            `}} />
            {label && (
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-zinc-500 mb-2 ml-1">
                    {label}
                </label>
            )}
            <div className="bg-white dark:bg-zinc-900 rounded-[24px] border-2 border-gray-100 dark:border-zinc-800 p-5 overflow-hidden flex flex-col gap-4 shadow-sm">
                {/* Calendar Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-fpt-orange uppercase tracking-[0.2em] mb-0.5">Tháng</span>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize leading-none">
                                {format(viewDate, 'MMMM yyyy', { locale: vi })}
                            </h3>
                        </div>
                        <div className="flex gap-2 bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-xl">
                            <button type="button" onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-gray-600 dark:text-zinc-400 transition-all">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-gray-600 dark:text-zinc-400 transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 mb-2">
                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                            <div key={day} className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest">{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {days.map((date, i) => {
                            const isCurrentMonth = isSameMonth(date, viewDate);
                            const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleDateClick(date)}
                                    className={`
                                            h-9 text-[13px] font-bold rounded-xl transition-all
                                            flex items-center justify-center
                                            ${!isCurrentMonth ? 'text-gray-300 dark:text-zinc-700' : 'text-gray-700 dark:text-zinc-300'}
                                            ${isSelected ? 'bg-fpt-orange text-white shadow-lg' : 'hover:bg-orange-50 dark:hover:bg-orange-900/10'}
                                        `}
                                >
                                    {format(date, 'd')}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-zinc-800" />

                {/* Time Section */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Clock size={14} className="text-fpt-orange" />
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Thời gian</span>
                    </div>
                    <div className="flex items-center justify-center gap-6 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Giờ</span>
                            <input
                                type="number" min="0" max="23" value={hours}
                                onChange={e => handleTimeChange(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)), minutes)}
                                className="no-spinner w-20 h-12 bg-white dark:bg-zinc-900 rounded-xl text-center font-bold text-2xl focus:ring-4 focus:ring-fpt-orange/10 border-2 border-transparent focus:border-fpt-orange outline-none transition-all dark:text-white"
                            />
                        </div>
                        <span className="text-2xl font-bold text-gray-300 mt-4">:</span>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">Phút</span>
                            <input
                                type="number" min="0" max="59" value={minutes}
                                onChange={e => handleTimeChange(hours, Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                                className="no-spinner w-20 h-12 bg-white dark:bg-zinc-900 rounded-xl text-center font-bold text-2xl focus:ring-4 focus:ring-fpt-orange/10 border-2 border-transparent focus:border-fpt-orange outline-none transition-all dark:text-white"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
