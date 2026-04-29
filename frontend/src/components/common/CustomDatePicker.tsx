import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, isToday, parseISO, isValid, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';

interface CustomDatePickerProps {
    value: string; // ISO format: YYYY-MM-DD
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
    min?: string;
    max?: string;
    disabled?: boolean;
    required?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
    value,
    onChange,
    className = '',
    label,
    min,
    max,
    disabled = false,
    placeholder = 'Chọn ngày'
}) => {
    const parseValue = (val: any): Date => {
        if (!val) return new Date();

        if (Array.isArray(val)) {
            const [year, month, day] = val;
            return new Date(year, month - 1, day);
        }

        const parsed = parseISO(val);
        return isValid(parsed) ? parsed : new Date();
    };

    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(parseValue(value));
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' as 'top' | 'bottom' | 'left' | 'right' });
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    // Sync viewDate when value changes externally
    useEffect(() => {
        if (value) {
            setViewDate(parseValue(value));
        }
    }, [value]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calculate position
    const updatePosition = () => {
        if (triggerRef.current && isOpen) {
            const rect = triggerRef.current.getBoundingClientRect();
            const dropdownHeight = 440;
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

    const handleDateSelect = (date: Date) => {
        if (disabled) return;
        onChange(format(date, 'yyyy-MM-dd'));
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
        return isValid(date) ? format(date, 'dd/MM/yyyy') : '';
    }, [value]);

    const minDate = min ? parseISO(min) : null;
    const maxDate = max ? parseISO(max) : null;

    const isDateDisabled = (date: Date) => {
        const d = startOfDay(date);
        if (minDate && d < startOfDay(minDate)) return true;
        if (maxDate && d > startOfDay(maxDate)) return true;
        return false;
    };

    return (
        <div className={`relative inline-block ${className}`} ref={containerRef}>
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
                            initial={{ opacity: 0, x: dropdownPos.placement === 'right' ? -15 : (dropdownPos.placement === 'left' ? 15 : 0), y: dropdownPos.placement === 'bottom' ? -15 : (dropdownPos.placement === 'top' ? 15 : 0), scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: dropdownPos.placement === 'right' ? -10 : (dropdownPos.placement === 'left' ? 10 : 0), y: dropdownPos.placement === 'bottom' ? -10 : (dropdownPos.placement === 'top' ? 10 : 0), scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 400 }}
                            style={{
                                position: 'fixed',
                                top: dropdownPos.top,
                                left: dropdownPos.left,
                                width: '320px',
                                zIndex: 30,
                                pointerEvents: 'auto'
                            }}
                            className="bg-white dark:bg-zinc-900 rounded-[24px] shadow-[0_25px_70px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_70_rgba(0,0,0,0.4)] border border-gray-100 dark:border-zinc-800 p-5 overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-fpt-orange uppercase tracking-[0.2em] mb-0.5">Tháng</span>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize leading-none">
                                        {format(viewDate, 'MMMM yyyy', { locale: vi })}
                                    </h3>
                                </div>
                                <div className="flex gap-2 bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-xl border border-gray-100 dark:border-zinc-800">
                                    <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all shadow-sm hover:shadow text-gray-600 dark:text-zinc-400">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all shadow-sm hover:shadow text-gray-600 dark:text-zinc-400">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 mb-3">
                                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                                    <div key={day} className="text-[10px] font-black text-gray-400 dark:text-zinc-600 text-center uppercase tracking-widest">{day}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1.5">
                                {days.map((date, i) => {
                                    const isCurrentMonth = isSameMonth(date, viewDate);
                                    const isSelected = value ? isSameDay(date, parseISO(value)) : false;
                                    const isDisabled = isDateDisabled(date);
                                    const isTodayDate = isToday(date);

                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => handleDateSelect(date)}
                                            className={`
                                                relative h-10 text-[13px] font-bold rounded-[14px] transition-all duration-300
                                                flex items-center justify-center
                                                ${!isCurrentMonth ? 'text-gray-300 dark:text-zinc-700' : 'text-gray-700 dark:text-zinc-300'}
                                                ${isDisabled ? 'opacity-10 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}
                                                ${!isSelected && !isDisabled ? 'hover:bg-orange-50 dark:hover:bg-orange-900/10 hover:text-fpt-orange' : ''}
                                                ${isSelected ? 'bg-fpt-orange text-white shadow-lg shadow-orange-500/40 ring-4 ring-fpt-orange/10' : ''}
                                                ${isTodayDate && !isSelected ? 'text-fpt-orange' : ''}
                                            `}
                                        >
                                            <span className="relative z-10">{format(date, 'd')}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-6 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleDateSelect(new Date())}
                                    className="flex-1 py-2.5 px-4 bg-orange-50 dark:bg-orange-950/20 text-fpt-orange text-xs font-black uppercase tracking-widest rounded-xl hover:bg-fpt-orange hover:text-white transition-all duration-300 active:scale-95"
                                >
                                    Hôm nay
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { onChange(''); setIsOpen(false); }}
                                    className="flex-1 py-2.5 px-4 bg-gray-50 dark:bg-zinc-800 text-gray-500 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-all duration-300 active:scale-95"
                                >
                                    Xóa
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

