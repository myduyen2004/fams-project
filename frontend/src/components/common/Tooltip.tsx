import React, { useState } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    className?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * A reusable Tooltip component for displaying additional information on hover.
 */
export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    className = '',
    position = 'top'
}) => {
    const [isVisible, setIsVisible] = useState(false);

    if (!content) return <>{children}</>;

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-gray-900',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-gray-900',
        left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-gray-900',
        right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-gray-900'
    };

    return (
        <div
            className={`relative inline-block ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className={`absolute z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap animate-in fade-in duration-150 ${positionClasses[position]}`}>
                    {content}
                    <div className={`absolute border-4 border-transparent ${arrowClasses[position]}`}></div>
                </div>
            )}
        </div>
    );
};
