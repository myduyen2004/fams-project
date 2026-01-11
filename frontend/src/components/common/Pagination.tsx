import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange
}) => {
  if (totalPages <= 1) return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800 text-sm text-gray-500">
      <div>
        Hiển thị <span className="font-medium text-gray-900 dark:text-white">{totalElements > 0 ? 1 : 0}</span> đến <span className="font-medium text-gray-900 dark:text-white">{totalElements}</span> trong số <span className="font-medium text-gray-900 dark:text-white">{totalElements}</span> bản ghi
      </div>
    </div>
  );

  const getPageNumbers = () => {
    const pages = [];
    const showMax = 5;
    
    if (totalPages <= showMax) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(0);

      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);

      if (start > 1) pages.push('...');

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 2) pages.push('...');

      // Always show last page
      pages.push(totalPages - 1);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800 text-sm text-gray-500">
      <div>
        Hiển thị <span className="font-medium text-gray-900 dark:text-white">{currentPage * pageSize + 1}</span> đến <span className="font-medium text-gray-900 dark:text-white">{Math.min((currentPage + 1) * pageSize, totalElements)}</span> trong số <span className="font-medium text-gray-900 dark:text-white">{totalElements}</span> bản ghi
      </div>
      <div className="flex items-center gap-1">
        <button 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 0} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500 flex items-center gap-1"
        >
          <ChevronLeft size={16} />
          Trước
        </button>
        
        {getPageNumbers().map((p, i) => (
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
          ) : (
            <button 
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-colors ${
                currentPage === p ? 'bg-red-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400'
              }`}
            >
              {(p as number) + 1}
            </button>
          )
        ))}

        <button 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages - 1} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500 flex items-center gap-1"
        >
          Sau
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
