import React from 'react';
import { X, Trash2, AlertCircle, XCircle } from 'lucide-react';

interface DeleteSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  semesterName: string;
  semesterStatus: string;
}

export const DeleteSemesterModal: React.FC<DeleteSemesterModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  semesterName,
  semesterStatus,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const canDelete = semesterStatus === 'upcoming';

  const handleConfirm = async () => {
    if (!canDelete) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      await onConfirm();
      onClose();
    } catch (error: any) {
      let msg = error?.response?.data?.message || error?.message || 'Không thể xóa học kỳ. Vui lòng thử lại sau.';
      
      // Friendly message for DB foreign key constraint violation
      if (msg.includes('class_sections_semester_id_fkey') || msg.includes('vi phạm ràng buộc')) {
        msg = 'Không thể xóa học kỳ này vì đã có lớp học phần được tạo trong học kỳ. Vui lòng xóa các lớp học phần trước.';
      }
      
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Reset error when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) setErrorMessage(null);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-full max-w-[400px] overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-10 flex flex-col items-center relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon with Animation */}
          <div className="relative mb-6">
            <div className={`absolute inset-0 ${canDelete ? 'bg-red-100' : 'bg-amber-100'} rounded-full animate-pulse`}></div>
            <div className={`relative w-20 h-20 ${canDelete ? 'bg-gradient-to-tr from-red-500 to-orange-400 shadow-red-200' : 'bg-gradient-to-tr from-amber-500 to-yellow-400 shadow-amber-200'} rounded-full flex items-center justify-center shadow-lg`}>
              {canDelete ? <Trash2 className="text-white w-8 h-8" /> : <XCircle className="text-white w-8 h-8" />}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            {canDelete ? 'Xác nhận xóa' : 'Không thể xóa'}
          </h2>

          {/* Message */}
          <p className="text-slate-500 leading-relaxed text-center px-2">
            {canDelete ? (
              <>Bạn có chắc chắn muốn xóa học kỳ này không?</>
            ) : (
              <>Không thể xóa học kỳ này vì học kỳ đã bắt đầu hoặc đã kết thúc.</>
            )}
            <span className="block mt-1 font-semibold text-slate-700 underline decoration-red-300 decoration-2">
              {semesterName}
            </span>
          </p>

          {/* Warning Box */}
          {canDelete ? (
            <div className="mt-6 w-full py-3 px-4 bg-slate-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3">
              <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />
              <p className="text-xs text-slate-600 font-medium italic">
                Lưu ý: Hành động này không thể hoàn tác.
              </p>
            </div>
          ) : (
            <div className="mt-6 w-full py-3 px-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl flex items-center gap-3">
              <AlertCircle className="text-amber-500 w-5 h-5 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium">
                Chỉ có thể xóa học kỳ có trạng thái "Sắp diễn ra"
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 w-full py-3 px-4 bg-red-50 border-l-4 border-red-600 rounded-r-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <XCircle className="text-red-600 w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {canDelete ? (
            <div className="grid grid-cols-2 gap-4 w-full mt-10">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-2xl font-bold text-sm transition-all duration-200 shadow-lg shadow-red-200 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Đang xóa...' : 'Đồng ý xóa'}
              </button>
            </div>
          ) : (
            <div className="w-full mt-10">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-95"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

