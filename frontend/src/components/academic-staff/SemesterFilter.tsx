import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SemesterFilterProps {
    value: number;
    onChange: (semester: number) => void;
}

/**
 * SemesterFilter - Custom implementation that matches CustomSelect UI 
 * but doesn't use the component directly as requested.
 */
export const SemesterFilter: React.FC<SemesterFilterProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    const semesters = Array.from({ length: 9 }, (_, i) => ({
        label: `Học kỳ ${i + 1}`,
        value: i + 1
    }));

    const selectedSemester = semesters.find(s => s.value === value);

    const updatePosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const isInsideContainer = containerRef.current?.contains(event.target as Node);
            const isInsideDropdown = dropdownRef.current?.contains(event.target as Node);
            
            if (!isInsideContainer && !isInsideDropdown) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                Học kỳ
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full h-[52px] rounded-2xl border-2 px-4 text-left transition-all ${
                    isOpen 
                        ? 'border-fpt-orange ring-4 ring-fpt-orange/10 bg-white dark:bg-zinc-900 shadow-lg shadow-fpt-orange/5' 
                        : 'border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5'
                }`}
            >
                <span className={`text-sm font-bold ${selectedSemester ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {selectedSemester ? selectedSemester.label : 'Chọn học kỳ'}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
            </button>

            {isOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{
                            position: 'fixed',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            width: dropdownPos.width,
                            zIndex: 2000
                        }}
                        className="p-1.5 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                            {semesters.map((s) => (
                                <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(s.value);
                                        setIsOpen(false);
                                    }}
                                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                        value === s.value
                                            ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange'
                                            : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 hover:text-fpt-orange'
                                    }`}
                                >
                                    {s.label}
                                    {value === s.value && <Check className="h-4 w-4 stroke-[3]" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default SemesterFilter;
