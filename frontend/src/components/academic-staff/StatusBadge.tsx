import React from 'react';

interface StatusBadgeProps {
    status: 'ACTIVE' | 'INACTIVE' | string;
    variant?: 'default' | 'compact' | 'table';
}

/**
 * StatusBadge - Displays ACTIVE/INACTIVE status with appropriate styling
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'default' }) => {
    const baseClasses = 'inline-flex items-center rounded-full font-medium';

    const sizeClasses = {
        default: 'px-3 py-1 text-sm',
        compact: 'px-2.5 py-0.5 text-xs',
        table: 'gap-1.5 px-2.5 py-0.5 text-xs border'
    };

    if (status === 'ACTIVE') {
        if (variant === 'table') {
            return (
                <span className={`${baseClasses} ${sizeClasses[variant]} bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-100 dark:border-green-900/30`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Đang mở
                </span>
            );
        }
        return (
            <span className={`${baseClasses} ${sizeClasses[variant]} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`}>
                Đang mở
            </span>
        );
    }

    if (status === 'INACTIVE') {
        if (variant === 'table') {
            return (
                <span className={`${baseClasses} ${sizeClasses[variant]} bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-100 dark:border-red-900/30`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    Ngừng đào tạo
                </span>
            );
        }
        return (
            <span className={`${baseClasses} ${sizeClasses[variant]} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`}>
                Ngừng đào tạo
            </span>
        );
    }

    return (
        <span className={`${baseClasses} ${sizeClasses[variant]} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400`}>
            {status}
        </span>
    );
};

export default StatusBadge;
