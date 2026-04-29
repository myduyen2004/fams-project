import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  type = 'info',
  isLoading = false
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const isBusy = isLoading || isConfirming;

  const handleConfirm = async () => {
    if (isBusy) return;

    setIsConfirming(true);
    try {
      await Promise.resolve(onConfirm());
    } finally {
      setIsConfirming(false);
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'danger':
        return {
          buttonBg: 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
        };
      case 'warning':
        return {
          buttonBg: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
        };
      case 'success':
        return {
          buttonBg: 'bg-green-600 hover:bg-green-700 shadow-green-500/20'
        };
      default:
        return {
          buttonBg: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
        };
    }
  };

  const styles = getStyles();

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={isBusy ? undefined : onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          {!isBusy && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap font-medium">
            {message}
          </p>
        </div>

        {/* Footer */}
        {(cancelLabel || confirmLabel) && (
          <div className="flex items-center gap-3 p-6 pt-0">
            {cancelLabel && (
              <button
                onClick={onClose}
                disabled={isBusy}
                className="flex-1 h-[44px] px-4 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            )}
            {confirmLabel && (
              <button
                onClick={handleConfirm}
                disabled={isBusy}
                className={`flex-1 h-[44px] px-4 rounded-2xl text-white font-bold shadow-lg active:scale-95 transition-all ${styles.buttonBg} disabled:opacity-70 flex items-center justify-center gap-2`}
              >
                {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                {isBusy ? 'Đang xử lý...' : confirmLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

