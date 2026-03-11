import React from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface StatusFilterProps {
    value: 'ACTIVE' | 'INACTIVE';
    onChange: (status: 'ACTIVE' | 'INACTIVE') => void;
    isOpen: boolean;
    onToggle: () => void;
    activeLabel?: string;
    inactiveLabel?: string;
}

/**
 * StatusFilter - Dropdown filter for ACTIVE/INACTIVE status
 */
export const StatusFilter: React.FC<StatusFilterProps> = ({
    value,
    onChange,
    isOpen,
    onToggle,
    activeLabel = 'Đang mở',
    inactiveLabel = 'Ngừng hoạt động'
}) => {
    const getLabel = (status: 'ACTIVE' | 'INACTIVE') => {
        return status === 'ACTIVE' ? activeLabel : inactiveLabel;
    };

    return (
        <div className="flex items-center gap-2 relative">
            <span className="text-gray-500 text-sm">Trạng thái:</span>
            <div className="relative">
                <button
                    onClick={onToggle}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 py-2 pl-3 pr-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 min-w-[150px]"
                >
                    <span className="flex-1 text-left">{getLabel(value)}</span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={onToggle}
                        ></div>
                        <div className="absolute right-0 top-full mt-1 min-w-[180px] sm:w-max rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-20 dark:border-zinc-700 dark:bg-zinc-800">
                            <button
                                onClick={() => {
                                    onChange('ACTIVE');
                                    onToggle();
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center justify-between whitespace-nowrap ${value === 'ACTIVE' ? 'text-fpt-orange bg-orange-50 dark:bg-orange-900/10' : 'text-gray-700 dark:text-gray-200'}`}
                            >
                                <span>{activeLabel}</span>
                                {value === 'ACTIVE' && <Check className="h-4 w-4 ml-2" />}
                            </button>
                            <button
                                onClick={() => {
                                    onChange('INACTIVE');
                                    onToggle();
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center justify-between whitespace-nowrap ${value === 'INACTIVE' ? 'text-fpt-orange bg-orange-50 dark:bg-orange-900/10' : 'text-gray-700 dark:text-gray-200'}`}
                            >
                                <span>{inactiveLabel}</span>
                                {value === 'INACTIVE' && <Check className="h-4 w-4 ml-2" />}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StatusFilter;
