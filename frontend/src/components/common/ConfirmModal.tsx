import { X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  type = 'info'
}) => {
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* Footer */}
        {(cancelLabel || confirmLabel) && (
          <div className="flex items-center gap-3 p-6 pt-0">
            {cancelLabel && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700 transition-all duration-200"
              >
                {cancelLabel}
              </button>
            )}
            {confirmLabel && (
              <button
                onClick={onConfirm}
                className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold shadow-lg active:scale-95 transition-all duration-200 ${styles.buttonBg}`}
              >
                {confirmLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
