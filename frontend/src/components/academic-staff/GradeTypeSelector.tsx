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
}

export const GradeTypeSelector: React.FC<GradeTypeSelectorProps> = ({
    value,
    onChange,
    options,
    isOpen,
    onToggle
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
            <div className="relative">
                <button
                    type="button"
                    onClick={onToggle}
                    className={`flex items-center justify-between w-full h-[52px] px-4 rounded-2xl border-2 transition-all outline-none bg-white dark:bg-zinc-900 ${isOpen ? 'border-fpt-orange ring-4 ring-fpt-orange/10 shadow-lg' : 'border-gray-100 dark:border-zinc-800 hover:border-fpt-orange/40 shadow-sm'}`}
                >
                    <span className={`text-sm font-medium ${selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-500'}`}>
                        {selectedOption ? selectedOption.label : 'Chọn loại điểm'}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] max-h-64 overflow-y-auto rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-2 space-y-1">
                            {options.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.value);
                                        onToggle();
                                    }}
                                    className={`w-full px-4 py-3 text-left text-sm font-medium rounded-xl flex items-center justify-between transition-all group
                                        ${value === opt.value
                                            ? 'bg-fpt-orange text-white shadow-md shadow-fpt-orange/20'
                                            : 'text-gray-600 dark:text-zinc-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 hover:text-fpt-orange'
                                        }`}
                                >
                                    <span>{opt.label}</span>
                                    {value === opt.value ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Check className="h-4 w-4 opacity-0 group-hover:opacity-20 transition-opacity" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

