import React, { useState, useEffect } from 'react';
import { X, Loader2, Trash2, RefreshCw } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Enrollment {
  id: number;
  className: string;
  studentCode: string;
  studentName: string;
  status: string;
}

interface EnrollmentListModalProps {
  isOpen: boolean;
  className: string;
  onClose: () => void;
}

const getStatusLabel = (status: string) => {
  const statusConfig: { [key: string]: { label: string; className: string } } = {
    ENROLLED: { label: 'Đang học', className: 'bg-green-100 text-green-700' },
    DROPPED: { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
    COMPLETED: { label: 'Hoàn thành', className: 'bg-blue-100 text-blue-700' },
    FAILED: { label: 'Không đạt', className: 'bg-gray-100 text-gray-700' },
  };
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold ${config.className}`}>
      {config.label}
    </span>
  );
};

export const EnrollmentListModal: React.FC<EnrollmentListModalProps> = ({
  isOpen,
  className,
  onClose,
}) => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen && className) {
      fetchEnrollments();
    }
  }, [isOpen, className]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/class-sections/${encodeURIComponent(className)}/enrollments`);
      setEnrollments(response.data);
      setSelectedRows(new Set());
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      toast.error('Không thể tải danh sách đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === enrollments.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(enrollments.map(e => e.id)));
    }
  };

  const handleBulkDelete = () => {
    toast(`Xóa ${selectedRows.size} sinh viên đang được phát triển`, { icon: 'ℹ️' });
  };

  const handleBulkUpdateStatus = () => {
    toast(`Cập nhật trạng thái ${selectedRows.size} sinh viên đang được phát triển`, { icon: 'ℹ️' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Danh sách đăng ký</h3>
            <p className="text-sm text-gray-500 mt-1">
              Lớp học phần: <span className="font-medium text-orange-600">{className}</span>
              {!loading && (
                <span className="ml-2">• Tổng: <span className="font-medium">{enrollments.length}</span> sinh viên</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedRows.size > 0 && (
          <div className="px-6 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between shrink-0">
            <span className="text-sm font-medium text-orange-700">
              Đã chọn <span className="font-bold">{selectedRows.size}</span> sinh viên
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkUpdateStatus}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Cập nhật trạng thái
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Xóa
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-center w-12">
                  <input
                    type="checkbox"
                    checked={enrollments.length > 0 && selectedRows.size === enrollments.length}
                    onChange={handleSelectAll}
                    disabled={loading || enrollments.length === 0}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Mã lớp</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Mã sinh viên</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tên sinh viên</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                      <span className="text-sm text-gray-500">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                    Chưa có sinh viên đăng ký lớp học phần này
                  </td>
                </tr>
              ) : (
                enrollments.map((enrollment) => (
                  <tr
                    key={enrollment.id}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedRows.has(enrollment.id) ? 'bg-orange-50' : ''}`}
                    onClick={() => handleSelectRow(enrollment.id)}
                  >
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(enrollment.id)}
                        onChange={() => handleSelectRow(enrollment.id)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-orange-600">{enrollment.className}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-gray-900">{enrollment.studentCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{enrollment.studentName}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusLabel(enrollment.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
