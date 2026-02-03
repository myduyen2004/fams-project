import React, { useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { GradeType } from '../../services/api/gradeComponentService';

interface GradeTypeOption {
    value: GradeType;
    label: string;
}

interface GradeTypeSelectorProps {
    value: GradeType;
    onChange: (type: GradeType) => void;
    options: GradeTypeOption[];
    isOpen: boolean;
    onToggle: () => void;
    label?: string;
}

export const GradeTypeSelector: React.FC<GradeTypeSelectorProps> = ({
    value,
    onChange,
    options,
    isOpen,
    onToggle,
    label = "Loại *"
}) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                if (isOpen) onToggle();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onToggle]);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                {label}
            </label>
            <div className="relative">
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex items-center justify-between w-full rounded-lg border border-gray-300 dark:border-zinc-700 py-2.5 px-3 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange transition-all"
                >
                    <span className={`text-left ${selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                        {selectedOption ? selectedOption.label : 'Chọn loại điểm'}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl z-50 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-600">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    onToggle();
                                }}
                                className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between transition-colors
                                    ${value === opt.value
                                        ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange'
                                        : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700'
                                    }`}
                            >
                                <span>{opt.label}</span>
                                {value === opt.value && <Check className="h-4 w-4" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
