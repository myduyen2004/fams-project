import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, ChevronDown, Clock } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, parseISO, isValid, setHours, setMinutes } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';

interface CustomDateTimePickerProps {
    value: string; // ISO format: YYYY-MM-DDTHH:mm
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
    disabled?: boolean;
}

export const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({
    value,
    onChange,
    className = '',
    label,
    disabled = false,
    placeholder = 'Chọn ngày và giờ'
}) => {
    const parseValue = (val: string): Date => {
        if (!val) return new Date();
        const parsed = parseISO(val);
        return isValid(parsed) ? parsed : new Date();
    };

    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(parseValue(value));
    const [selectedDate, setSelectedDate] = useState<Date | null>(value ? parseValue(value) : null);

    // Time states
    const [hours, setHoursState] = useState(selectedDate ? selectedDate.getHours() : 12);
    const [minutes, setMinutesState] = useState(selectedDate ? selectedDate.getMinutes() : 0);

    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' as 'top' | 'bottom' | 'left' | 'right' });
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                const portalElement = document.getElementById('datetimepicker-portal-root');
                if (portalElement && portalElement.contains(event.target as Node)) {
                    return;
                }
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updatePosition = () => {
        if (triggerRef.current && isOpen) {
            const rect = triggerRef.current.getBoundingClientRect();
            const dropdownHeight = 520;
            const dropdownWidth = 320;
            const margin = 8;

            const spaceBelow = window.innerHeight - rect.bottom - margin;
            const spaceAbove = rect.top - margin;

            let placement: 'top' | 'bottom' = 'bottom';
            let top = 0;
            let left = rect.left;

            if (spaceBelow > dropdownHeight || spaceBelow > spaceAbove) {
                placement = 'bottom';
                top = rect.bottom + margin;
            } else {
                placement = 'top';
                top = rect.top - dropdownHeight - margin;
            }

            // Boundary checks
            if (left + dropdownWidth > window.innerWidth - 10) {
                left = window.innerWidth - dropdownWidth - 10;
            }
            if (left < 10) left = 10;

            if (placement === 'top' && top < 10) top = 10;

            setDropdownPos({
                top: top,
                left: left,
                width: rect.width,
                placement
            });
        }
    };

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            updatePosition();

            const observer = new ResizeObserver(() => {
                updatePosition();
            });
            observer.observe(triggerRef.current);
            observer.observe(document.body);

            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);

            return () => {
                observer.disconnect();
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [viewDate]);

    const handleConfirm = () => {
        if (!selectedDate) return;
        const finalDate = setMinutes(setHours(selectedDate, hours), minutes);
        onChange(format(finalDate, "yyyy-MM-dd'T'HH:mm"));
        setIsOpen(false);
    };

    const nextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(addMonths(viewDate, 1));
    };

    const prevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(subMonths(viewDate, 1));
    };

    const displayValue = useMemo(() => {
        if (!value) return '';
        const date = parseISO(value);
        return isValid(date) ? format(date, 'dd/MM/yyyy HH:mm') : '';
    }, [value]);

    return (
        <div className={`relative inline-block ${className}`} ref={containerRef}>
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

            <div
                ref={triggerRef}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
                    group relative flex items-center bg-white dark:bg-zinc-900 border-2 rounded-2xl px-4 h-[52px] 
                    transition-all duration-300 cursor-pointer select-none
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5'}
                    ${isOpen ? 'border-fpt-orange ring-4 ring-fpt-orange/10' : 'border-gray-100 dark:border-zinc-800'}
                `}
            >
                <div className={`
                    p-1.5 rounded-lg mr-3 transition-colors
                    ${isOpen ? 'bg-fpt-orange text-white' : 'bg-orange-50 dark:bg-orange-950/20 text-fpt-orange'}
                `}>
                    <CalendarIcon className="w-4 h-4" />
                </div>

                <span className={`text-sm font-semibold flex-1 ${displayValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {displayValue || placeholder}
                </span>

                <div className="flex items-center gap-2">
                    {displayValue && !disabled && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-400 hover:text-red-500"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: dropdownPos.placement === 'bottom' ? -15 : 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: dropdownPos.placement === 'bottom' ? -10 : 10 }}
                            style={{
                                position: 'fixed',
                                top: dropdownPos.top,
                                left: dropdownPos.left,
                                width: '320px',
                                zIndex: 30,
                                pointerEvents: 'auto'
                            }}
                            className="bg-white dark:bg-zinc-900 rounded-[24px] shadow-[0_25px_70px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_70_rgba(0,0,0,0.4)] border border-gray-100 dark:border-zinc-800 p-5 overflow-hidden flex flex-col gap-4"
                        >
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
                                        <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-gray-600 dark:text-zinc-400">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-gray-600 dark:text-zinc-400">
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
                                                onClick={() => {
                                                    setSelectedDate(date);
                                                    setViewDate(date);
                                                }}
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
                                            onChange={e => setHoursState(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                                            className="no-spinner w-16 h-12 bg-white dark:bg-zinc-900 rounded-xl text-center font-bold text-2xl focus:ring-4 focus:ring-fpt-orange/10 border-2 border-transparent focus:border-fpt-orange outline-none transition-all"
                                        />
                                    </div>
                                    <span className="text-2xl font-bold text-gray-300 mt-4">:</span>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold">Phút</span>
                                        <input
                                            type="number" min="0" max="59" value={minutes}
                                            onChange={e => setMinutesState(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                                            className="no-spinner w-16 h-12 bg-white dark:bg-zinc-900 rounded-xl text-center font-bold text-2xl focus:ring-4 focus:ring-fpt-orange/10 border-2 border-transparent focus:border-fpt-orange outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="w-full py-4 bg-fpt-orange text-white text-sm font-bold rounded-2xl hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95"
                            >
                                Xác nhận thời gian
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

