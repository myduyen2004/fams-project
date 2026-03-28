import React from 'react';

interface PaginationProps {
    page: number;
    totalElements: number;
    pageSize?: number;
    onPageChange: (page: number) => void;
    itemLabel?: string;
}

/**
 * Pagination - Reusable pagination controls
 */
export const Pagination: React.FC<PaginationProps> = ({
    page,
    totalElements,
    pageSize = 10,
    onPageChange,
    itemLabel = 'mục'
}) => {
    const totalPages = Math.ceil(totalElements / pageSize);
    const startItem = totalElements === 0 ? 0 : page * pageSize + 1;
    const endItem = Math.min((page + 1) * pageSize, totalElements);

    return (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800 text-sm text-gray-500">
            <div>
                Hiển thị{' '}
                <span className="font-medium text-gray-900 dark:text-white">{startItem}</span>
                {' '}đến{' '}
                <span className="font-medium text-gray-900 dark:text-white">{endItem}</span>
                {' '}trong số{' '}
                <span className="font-medium text-gray-900 dark:text-white">{totalElements}</span>
                {' '}{itemLabel}
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
                >
                    Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => onPageChange(i)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-colors ${page === i
                            ? 'bg-fpt-orange text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                            }`}
                    >
                        {i + 1}
                    </button>
                ))}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={(page + 1) * pageSize >= totalElements}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
                >
                    Sau
                </button>
            </div>
        </div>
    );
};

export default Pagination;
