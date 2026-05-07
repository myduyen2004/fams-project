import { useState, useEffect, useCallback } from 'react';

interface UsePaginationOptions {
    initialPage?: number;
    resetDependencies?: unknown[];
}

interface UsePaginationReturn {
    page: number;
    setPage: (page: number) => void;
    resetPage: () => void;
}

/**
 * usePagination - Custom hook for pagination with automatic reset
 * 
 * When any of the resetDependencies change, the page will automatically reset to 0.
 * This prevents out-of-bounds pagination errors when filters change.
 * 
 * @param options - Configuration options
 * @param options.initialPage - Initial page number (default: 0)
 * @param options.resetDependencies - Array of dependencies that trigger page reset when changed
 * 
 * @example
 * const { page, setPage } = usePagination({
 *     resetDependencies: [status, searchTerm, selectedSemester]
 * });
 */
export const usePagination = (options: UsePaginationOptions = {}): UsePaginationReturn => {
    const { initialPage = 0, resetDependencies = [] } = options;
    const [page, setPageState] = useState(initialPage);

    // Reset page to initialPage when any of the resetDependencies change
    useEffect(() => {
        setPageState(initialPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, resetDependencies);

    const setPage = useCallback((newPage: number) => {
        setPageState(newPage);
    }, []);

    const resetPage = useCallback(() => {
        setPageState(initialPage);
    }, [initialPage]);

    return { page, setPage, resetPage };
};

export default usePagination;

