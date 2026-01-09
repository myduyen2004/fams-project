import { useCallback, useState } from 'react';

/**
 * Custom hook to debounce a value
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 500)
 * @returns {any} - The debounced value
 */
export const useDebounce = (initialValue = '', delay = 500) => {
    const [value, setValue] = useState(initialValue);
    const [debouncedValue, setDebouncedValue] = useState(initialValue);
    const [timeoutId, setTimeoutId] = useState(null);

    const handleChange = useCallback((newValue) => {
        setValue(newValue);
        if (timeoutId) clearTimeout(timeoutId);
        const id = setTimeout(() => {
            setDebouncedValue(newValue);
        }, delay);
        setTimeoutId(id);
    }, [delay, timeoutId]);

    return { value, debouncedValue, setValue: handleChange };
};

export default useDebounce;
