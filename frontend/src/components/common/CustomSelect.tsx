import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  isSearchable?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  label,
  isSearchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' as 'top' | 'bottom' | 'left' | 'right' });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) setSearchTerm('');
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const portalElement = document.getElementById('select-portal-root');
        if (portalElement && portalElement.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updatePosition = () => {
    if (triggerRef.current && isOpen) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 320; // Increased to account for search input
      const dropdownWidth = Math.max(rect.width, 240); // Match trigger width or min 240
      const margin = 8;

      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;

      let placement: 'top' | 'bottom' = 'bottom';
      let top = 0;
      let left = rect.left;

      if (spaceBelow > dropdownHeight || spaceBelow > spaceAbove) {
        placement = 'bottom';
        top = rect.bottom + margin;
      } else {
        placement = 'top';
        top = rect.top - dropdownHeight - margin;
      }

      // Horizontal boundary check
      if (left + dropdownWidth > window.innerWidth - 10) {
        left = window.innerWidth - dropdownWidth - 10;
      }
      if (left < 10) left = 10;

      // Vertical boundary check for 'top' placement
      if (placement === 'top' && top < 10) {
        top = 10;
      }

      setDropdownPos({
        top: top,
        left: left,
        width: dropdownWidth,
        placement
      });
    }
  };

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      updatePosition();

      const observer = new ResizeObserver(() => {
        updatePosition();
      });
      observer.observe(triggerRef.current);
      observer.observe(document.body);

      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        observer.disconnect();
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = isSearchable
    ? options.filter((opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opt.value.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : options;

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
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-left focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 transition-all ${disabled ? 'opacity-50 cursor-not-allowed text-gray-500' : 'hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5'
          } ${isOpen ? 'border-fpt-orange' : ''}`}
      >
        <span className={`text-sm font-semibold truncate ${selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div
              id="select-portal-root"
              initial={{
                opacity: 0,
                y: dropdownPos.placement === 'bottom' ? -10 : 10
              }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: dropdownPos.placement === 'bottom' ? -10 : 10
              }}
              style={{
                position: 'fixed',
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 1000, // High z-index for portal
                pointerEvents: 'auto'
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
              <div className="max-h-[250px] overflow-auto custom-scrollbar">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => {
                        if (!opt.disabled) {
                          onChange(opt.value);
                          setIsOpen(false);
                        }
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-all rounded-xl ${opt.disabled
                        ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-zinc-500'
                        : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                        } ${value === opt.value
                          ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange'
                          : opt.disabled ? '' : 'text-gray-700 dark:text-zinc-300 font-medium'
                        }`}
                    >
                      <span className="text-sm truncate pr-2">{opt.label}</span>
                      {value === opt.value && <Check size={14} className="stroke-[3] flex-shrink-0" />}
                    </button>
                  ))
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


