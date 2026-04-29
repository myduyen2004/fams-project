import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, XCircle, Info, X, Loader2 } from 'lucide-react';
import { usePopupStore } from '../../store/usePopupStore';

export const PopupNotification: React.FC = () => {
  const { isOpen, type, title, message, confirmText, onConfirm, closePopup } = usePopupStore();

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-12 h-12 text-emerald-500" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-rose-500" />;
      case 'warning':
        return <AlertCircle className="w-12 h-12 text-amber-500" />;
      case 'info':
        return <Info className="w-12 h-12 text-blue-500" />;
      case 'loading':
        return <Loader2 className="w-12 h-12 text-zinc-500 animate-spin" />;
      default:
        return <CheckCircle2 className="w-12 h-12 text-emerald-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-500/10',
          button: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 dark:shadow-none',
        };
      case 'error':
        return {
          bg: 'bg-rose-50 dark:bg-rose-500/10',
          button: 'bg-rose-500 hover:bg-rose-600 shadow-rose-200 dark:shadow-none',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-500/10',
          button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-none',
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-500/10',
          button: 'bg-blue-500 hover:bg-blue-600 shadow-blue-200 dark:shadow-none',
        };
      case 'loading':
        return {
          bg: 'bg-zinc-100 dark:bg-zinc-500/10',
          button: 'hidden',
        };
      default:
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-500/10',
          button: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 dark:shadow-none',
        };
    }
  };

  const colors = getColors();

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    closePopup();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePopup}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[400px] bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden shadow-2xl border border-zinc-100 dark:border-zinc-800"
          >
            {/* Close Button */}
            {type !== 'loading' && (
              <button
                onClick={closePopup}
                className="absolute top-6 right-6 p-2 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={20} />
              </button>
            )}

            <div className="p-8 pt-10 flex flex-col items-center text-center">
              {/* Icon Container */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', damping: 12 }}
                className={`mb-6 p-4 rounded-3xl ${colors.bg}`}
              >
                {getIcon()}
              </motion.div>

              {/* Text Content */}
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 uppercase tracking-tight">
                {title}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-8">
                {message}
              </p>

              {/* Action Button */}
              {type !== 'loading' && (
                <button
                  onClick={handleConfirm}
                  className={`w-full py-4 rounded-2xl text-white font-bold text-lg transition-all duration-300 shadow-lg ${colors.button} active:scale-95`}
                >
                  {confirmText}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

