import React from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SemesterFilterProps {
    value: number;
    onChange: (semester: number) => void;
    isOpen: boolean;
    onToggle: () => void;
}

/**
 * SemesterFilter - Dropdown filter for selecting semester (1-9)
 */
export const SemesterFilter: React.FC<SemesterFilterProps> = ({ value, onChange, isOpen, onToggle }) => {
    const semesters = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    return (
        <div className="flex items-center gap-2 relative">
            {/* <span className="text-gray-500 whitespace-nowrap">Học kỳ:</span> */}
            <div className="relative w-full">
                <button
                    onClick={onToggle}
                    className="flex items-center justify-between w-full gap-2 rounded-lg border border-gray-300 py-2 pl-3 pr-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 min-w-[140px]"
                >
                    <span className="text-left">Học kỳ {value}</span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-30"
                            onClick={onToggle}
                        ></div>
                        <div className="absolute right-0 top-full mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-40 dark:border-zinc-700 dark:bg-zinc-800 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-600">
                            {semesters.map((sem) => (
                                <button
                                    key={sem}
                                    onClick={() => {
                                        onChange(sem);
                                        onToggle();
                                    }}
                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center justify-between ${value === sem ? 'text-fpt-orange bg-orange-50 dark:bg-orange-900/10' : 'text-gray-700 dark:text-gray-200'}`}
                                >
                                    <span>Học kỳ {sem}</span>
                                    {value === sem && <Check className="h-4 w-4" />}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SemesterFilter;
