import React, { useState, useEffect } from 'react';
import { X, Lock, Info } from 'lucide-react';

interface Semester {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface UpdateSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (semesterData: {
    code: string;
    name: string;
    startDate: string;
    endDate: string;
  }) => Promise<void>;
  semester: Semester | null;
  existingSemesters?: Semester[];
}

export const UpdateSemesterModal: React.FC<UpdateSemesterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  semester,
  existingSemesters = [],
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form when semester prop changes
  useEffect(() => {
    if (semester) {
      setFormData({
        code: semester.code,
        name: semester.name,
        startDate: semester.startDate,
        endDate: semester.endDate,
      });
    }
  }, [semester]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const isActive = semester?.status === 'active';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.startDate || !formData.endDate) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    // For upcoming semesters, validate that start date is in the future
    if (semester?.status === 'upcoming') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [startYear, startMonth, startDay] = formData.startDate.split('-').map(Number);
      const startDate = new Date(startYear, startMonth - 1, startDay);

      if (startDate <= today) {
        setError('Ngày bắt đầu học kỳ phải sau ngày hôm nay');
        return;
      }
    }

    // Check for duplicate name (excluding current semester)
    const duplicateName = existingSemesters.find(
      s => s.name.toLowerCase() === formData.name.toLowerCase() && s.code !== semester?.code
    );
    if (duplicateName) {
      setError(`Tên học kỳ "${formData.name}" đã tồn tại trong hệ thống`);
      return;
    }

    // Check if semester can be updated (only upcoming or active)
    if (semester?.status !== 'upcoming' && semester?.status !== 'active') {
      setError('Chỉ có thể cập nhật các học kỳ sắp diễn ra hoặc đang diễn ra');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
      onClose();
    } catch (err: unknown) {
      let errorMessage = 'Có lỗi xảy ra khi cập nhật học kỳ';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string; error?: string }, status?: number } };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.response?.status === 409) {
          errorMessage = 'Tên học kỳ đã tồn tại trong hệ thống';
        } else if (axiosError.response?.status === 400) {
          errorMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin';
        } else if (axiosError.response?.status === 500) {
          // Default message for server errors related to date overlap
          errorMessage = 'Thời gian học kỳ bị trùng với học kỳ khác hoặc có lỗi hệ thống. Vui lòng kiểm tra lại';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  if (!isOpen || !semester) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Cập nhật học kỳ</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Tên học kỳ */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Tên hiện tại <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition shadow-sm bg-white"
              disabled={loading}
            />
          </div>

          {/* Ngày bắt đầu & Ngày kết thúc */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Ngày bắt đầu <span className="text-red-500">*</span>
                {isActive && <Lock className="w-3 h-3 inline ml-1 text-gray-400" />}
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition shadow-sm text-transparent caret-transparent ${isActive ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  disabled={loading || isActive}
                  style={{ colorScheme: 'light' }}
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-sm ${isActive ? 'text-gray-500' : 'text-gray-700'}`}>
                  {formData.startDate
                    ? formData.startDate.split('-').reverse().join('/')
                    : <span className="text-gray-400">dd/mm/yyyy</span>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Ngày kết thúc <span className="text-red-500">*</span>
                {isActive && <Lock className="w-3 h-3 inline ml-1 text-gray-400" />}
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition shadow-sm text-transparent caret-transparent ${isActive ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                    }`}
                  disabled={loading || isActive}
                  style={{ colorScheme: 'light' }}
                />
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-sm ${isActive ? 'text-gray-500' : 'text-gray-700'}`}>
                  {formData.endDate
                    ? formData.endDate.split('-').reverse().join('/')
                    : <span className="text-gray-400">dd/mm/yyyy</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Warning Note */}
          <div className="flex items-start gap-2 text-amber-600">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] font-medium">
              {isActive
                ? 'Học kỳ đang diễn ra: Không được phép thay đổi ngày bắt đầu và kết thúc. Chỉ có thể cập nhật tên học kỳ.'
                : 'Lưu ý: Ngày bắt đầu học kỳ phải sau ngày hôm nay.'}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-50">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-5 py-2.5 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold text-sm transition shadow-md disabled:opacity-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold text-sm transition shadow-md disabled:opacity-50"
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật học kỳ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
