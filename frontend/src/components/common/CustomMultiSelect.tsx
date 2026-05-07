import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  isSearchable?: boolean;
  maxDisplay?: number;
  icon?: React.ElementType;
}

export const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  disabled = false,
  className = '',
  label,
  isSearchable = true,
  maxDisplay = 2,
  icon: Icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
    placement: 'top' | 'bottom';
  }>({ top: 0, left: 0, width: 0, placement: 'bottom' });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) setSearchTerm('');
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !portalRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const computePos = useCallback(() => {
    if (!triggerRef.current) return null;

    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = Math.max(rect.width, 280);
    const margin = 6;

    const actualHeight = portalRef.current?.offsetHeight ?? 350;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;

    const placement: 'top' | 'bottom' =
      spaceBelow >= actualHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 10) left = window.innerWidth - dropdownWidth - 10;
    if (left < 10) left = 10;

    const top = placement === 'bottom' ? rect.bottom + margin : rect.top - margin;

    return { top, left, width: dropdownWidth, placement };
  }, []);

  const startTracking = useCallback(() => {
    const loop = () => {
      const pos = computePos();
      if (pos) setDropdownPos(pos);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [computePos]);

  const stopTracking = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startTracking();
    } else {
      stopTracking();
    }
    return stopTracking;
  }, [isOpen, startTracking, stopTracking]);

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
    } else {
      const pos = computePos();
      if (pos) setDropdownPos(pos);
      setIsOpen(true);
    }
  };

  const handleSelect = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const filteredOptions = isSearchable
    ? options.filter((opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opt.value.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : options;

  const displayLabel = () => {
    if (value.length === 0) return placeholder;
    if (value.length <= maxDisplay) {
      return options
        .filter(opt => value.includes(opt.value))
        .map(opt => opt.label)
        .join(', ');
    }
    return `Đã chọn ${value.length}`;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 mb-2 ml-1">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`flex items-center justify-between w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-left focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 transition-all ${disabled
          ? 'opacity-50 cursor-not-allowed text-gray-500'
          : 'hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5'
          } ${isOpen ? 'border-fpt-orange' : ''}`}
      >
        <div className="flex items-center gap-2 truncate mr-2 min-w-0">
          {Icon && <Icon size={18} className="text-gray-400 shrink-0" />}
          <span
            className={`text-sm font-semibold truncate ${value.length > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-500'
              }`}
          >
            {displayLabel()}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {value.length > 0 && !disabled && (
            <div
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-fpt-orange' : ''
              }`}
          />
        </div>
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && !disabled && (
              <motion.div
                ref={portalRef}
                initial={{ opacity: 0, y: dropdownPos.placement === 'bottom' ? -8 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: dropdownPos.placement === 'bottom' ? -8 : 8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: dropdownPos.width,
                  transform: dropdownPos.placement === 'top' ? 'translateY(-100%)' : 'none',
                  zIndex: 100,
                  pointerEvents: 'auto',
                }}
                className="rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-1.5 overflow-hidden flex flex-col"
              >
                {isSearchable && (
                  <div className="p-2 mb-1 border-b border-gray-50 dark:border-zinc-800">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Tìm kiếm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800/50 border border-transparent focus:border-fpt-orange rounded-xl outline-none transition-all dark:text-white"
                      />
                    </div>
                  </div>
                )}
                <div className="max-h-[300px] overflow-auto custom-scrollbar">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt) => {
                      const isSelected = value.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={opt.disabled}
                          onClick={() => handleSelect(opt.value)}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-all rounded-xl ${opt.disabled
                            ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-zinc-500'
                            : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                            } ${isSelected
                              ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange'
                              : 'text-gray-700 dark:text-zinc-300 font-medium'
                            }`}
                        >
                          <div className="flex items-center gap-3 truncate pr-2">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-fpt-orange border-fpt-orange' : 'border-gray-300 dark:border-zinc-700'}`}>
                              {isSelected && <Check size={10} className="text-white stroke-[4]" />}
                            </div>
                            <span className="text-sm truncate">{opt.label}</span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-sm text-gray-400">
                      Không tìm thấy kết quả
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
