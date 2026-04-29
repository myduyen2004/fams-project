import { usePopupStore } from '../store/usePopupStore';

// This utility mimics the react-hot-toast API but triggers our custom popup instead
export const toast = {
  success: (message: string, options?: any) => {
    usePopupStore.getState().showPopup({
      type: 'success',
      message: message,
      title: options?.title || 'Thành công',
    });
    return message;
  },
  error: (message: string, options?: any) => {
    usePopupStore.getState().showPopup({
      type: 'error',
      message: message,
      title: options?.title || 'Lỗi',
    });
    return message;
  },
  loading: (message: string, options?: any) => {
    usePopupStore.getState().showPopup({
      type: 'loading',
      message: message,
      title: options?.title || 'Đang xử lý',
    });
    return message;
  },
  warning: (message: string, options?: any) => {
    usePopupStore.getState().showPopup({
      type: 'warning',
      message: message,
      title: options?.title || 'Cảnh báo',
    });
    return message;
  },
  info: (message: string, options?: any) => {
    usePopupStore.getState().showPopup({
      type: 'info',
      message: message,
      title: options?.title || 'Thông báo',
    });
    return message;
  },
  dismiss: () => {
    usePopupStore.getState().closePopup();
  }
};

export default toast;

