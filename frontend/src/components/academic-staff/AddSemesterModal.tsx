import React, { useState } from 'react';
import { X } from 'lucide-react';

interface Semester {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface AddSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (semesterData: {
    code: string;
    name: string;
    startDate: string;
    endDate: string;
  }) => Promise<void>;
  existingSemesters?: Semester[];
}

export const AddSemesterModal: React.FC<AddSemesterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.code || !formData.name || !formData.startDate || !formData.endDate) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Parse input as local date to avoid timezone issues
    const [startYear, startMonth, startDay] = formData.startDate.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);

    if (startDate <= today) {
      setError('Ngày bắt đầu học kỳ phải sau ngày hôm nay');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    // Validate semester code format
    // Code must be 4 characters: 2 chars (SP/SU/FA) + 2 digits
    const codeRegex = /^(SP|SU|FA)\d{2}$/;
    if (!codeRegex.test(formData.code)) {
      setError('Vui lòng nhập đúng mã học kỳ, mã học kỳ phải bắt đầu SP, SU, FA. VD: SP26, SU26, FA26');
      return;
    }

    // Check for duplicate code
    const duplicateCode = existingSemesters.find(
      s => s.code.toLowerCase() === formData.code.toLowerCase()
    );
    if (duplicateCode) {
      setError(`Mã học kỳ "${formData.code}" đã tồn tại trong hệ thống`);
      return;
    }

    // Check for duplicate name
    const duplicateName = existingSemesters.find(
      s => s.name.toLowerCase() === formData.name.toLowerCase()
    );
    if (duplicateName) {
      setError(`Tên học kỳ "${formData.name}" đã tồn tại trong hệ thống`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
      // Reset form
      setFormData({
        code: '',
        name: '',
        startDate: '',
        endDate: '',
      });
      onClose();
    } catch (err: unknown) {
      let errorMessage = 'Có lỗi xảy ra khi thêm học kỳ';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string; error?: string }, status?: number } };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        } else if (axiosError.response?.status === 409) {
          errorMessage = 'Mã học kỳ hoặc tên học kỳ đã tồn tại trong hệ thống';
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
    setFormData({
      code: '',
      name: '',
      startDate: '',
      endDate: '',
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Thêm học kỳ</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Mã học kỳ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mã học kỳ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="Ví dụ: SP26, FA26"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Tên học kỳ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên học kỳ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên học kỳ"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Ngày bắt đầu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ngày bắt đầu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-transparent caret-transparent"
                disabled={loading}
                style={{ colorScheme: 'light' }}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-700">
                {formData.startDate
                  ? formData.startDate.split('-').reverse().join('/')
                  : <span className="text-gray-400">dd/mm/yyyy</span>}
              </div>
            </div>
          </div>

          {/* Ngày kết thúc */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ngày kết thúc <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-transparent caret-transparent"
                disabled={loading}
                style={{ colorScheme: 'light' }}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-700">
                {formData.endDate
                  ? formData.endDate.split('-').reverse().join('/')
                  : <span className="text-gray-400">dd/mm/yyyy</span>}
              </div>
            </div>
          </div>

          {/* Status Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-700">
              <span></span>   Mặc định trạng thái học kỳ mới sẽ là "Sắp diễn ra"
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Đang thêm...' : 'Thêm học kỳ'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
