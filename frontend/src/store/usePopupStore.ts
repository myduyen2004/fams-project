import { create } from 'zustand';

export type PopupType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface PopupState {
  isOpen: boolean;
  type: PopupType;
  title: string;
  message: string;
  confirmText: string;
  onConfirm?: () => void;
  showPopup: (options: {
    type?: PopupType;
    title?: string;
    message: string;
    confirmText?: string;
    onConfirm?: () => void;
  }) => void;
  closePopup: () => void;
}

export const usePopupStore = create<PopupState>((set) => ({
  isOpen: false,
  type: 'success',
  title: '',
  message: '',
  confirmText: 'Đóng',
  onConfirm: undefined,
  showPopup: (options) => set({
    isOpen: true,
    type: options.type || 'success',
    title: options.title || (
      options.type === 'error' ? 'Lỗi' : 
      options.type === 'loading' ? 'Vui lòng đợi' : 'Thông báo'
    ),
    message: options.message,
    confirmText: options.confirmText || 'Đóng',
    onConfirm: options.onConfirm,
  }),
  closePopup: () => set({ isOpen: false }),
}));

