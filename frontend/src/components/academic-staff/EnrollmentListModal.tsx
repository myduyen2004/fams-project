import React, { useState, useEffect } from 'react';
import { X, Loader2, Trash2, Plus, Search, UserPlus, ArrowRightLeft } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Enrollment {
  id: number;
  className: string;
  studentCode: string;
  studentName: string;
  email?: string;
  major?: string;
  specialization?: string;
  status: string;
}

interface StudentOption {
  id: number;
  code: string;
  fullName: string;
  email: string;
  major: string;
  specialization: string;
}

interface TransferTarget {
  className: string;
  courseCode: string;
  courseName: string;
  enrollmentInfo: string;
  maxStudents: number;
  slots: number;
}
interface EnrollmentListModalProps {
  isOpen: boolean;
  className: string;
  semesterStatus: string;
  maxStudents: number; // Maximum number of students allowed in the class
  onClose: () => void;
  onUpdate?: () => void;
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
    <span className={`px-4 py-1.5 rounded-full text-xs font-bold inline-block text-center min-w-[100px] ${config.className}`}>
      {config.label}
    </span>
  );
};

export const EnrollmentListModal: React.FC<EnrollmentListModalProps> = ({
  isOpen,
  className,
  semesterStatus,
  maxStudents,
  onClose,
  onUpdate,
}) => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Add student modal
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<StudentOption[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set()); // Multi-select by code
  const [addingStudent, setAddingStudent] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  // Delete confirm modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargets, setTransferTargets] = useState<TransferTarget[]>([]);
  const [loadingTransferTargets, setLoadingTransferTargets] = useState(false);
  const [selectedTransferTarget, setSelectedTransferTarget] = useState<string>('');
  const [transferring, setTransferring] = useState(false);

  const canEdit = semesterStatus === 'UPCOMING';

  useEffect(() => {
    if (isOpen && className) {
      fetchEnrollments();
    }
  }, [isOpen, className]);

  useEffect(() => {
    if (showAddStudent) {
      fetchAvailableStudents();
    }
  }, [showAddStudent]);

  useEffect(() => {
    // Filter students based on search
    if (studentSearch.trim()) {
      const search = studentSearch.toLowerCase();
      setFilteredStudents(
        availableStudents.filter(
          s =>
            s.code.toLowerCase().includes(search) ||
            s.fullName.toLowerCase().includes(search) ||
            s.email.toLowerCase().includes(search)
        )
      );
    } else {
      setFilteredStudents(availableStudents.slice(0, 50)); // Show first 50
    }
  }, [studentSearch, availableStudents]);

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

  const fetchAvailableStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await axios.get(`/api/v1/class-sections/${encodeURIComponent(className)}/available-students`);
      setAvailableStudents(response.data);
      setFilteredStudents(response.data.slice(0, 50));
    } catch (error) {
      console.error('Error fetching available students:', error);
      toast.error('Không thể tải danh sách sinh viên');
    } finally {
      setLoadingStudents(false);
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

  const handleBulkDelete = async () => {
    if (!canEdit) {
      toast.error('Chỉ có thể xóa đăng ký khi học kỳ chưa bắt đầu');
      return;
    }
    setShowDeleteConfirm(true);
  };

  // Confirm delete action
  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      setDeleting(true);
      await axios.delete('/api/v1/class-sections/enrollments/bulk', {
        data: Array.from(selectedRows)
      });
      toast.success(`Đã xóa ${selectedRows.size} đăng ký`);
      setSelectedRows(new Set());
      fetchEnrollments();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error deleting enrollments:', error);
      toast.error(error.response?.data?.message || 'Không thể xóa đăng ký');
    } finally {
      setDeleting(false);
    }
  };

  // Fetch available transfer targets
  const fetchTransferTargets = async () => {
    try {
      setLoadingTransferTargets(true);
      const response = await axios.get(`/api/v1/class-sections/${encodeURIComponent(className)}/transfer-targets`);
      setTransferTargets(response.data);
      setSelectedTransferTarget('');
    } catch (error) {
      console.error('Error fetching transfer targets:', error);
      toast.error('Không thể tải danh sách lớp đích');
    } finally {
      setLoadingTransferTargets(false);
    }
  };

  // Handle opening transfer modal
  const handleOpenTransfer = () => {
    if (!canEdit) {
      toast.error('Chỉ có thể chuyển sinh viên khi học kỳ chưa bắt đầu');
      return;
    }
    if (selectedRows.size === 0) {
      toast.error('Vui lòng chọn sinh viên để chuyển');
      return;
    }
    setShowTransferModal(true);
    fetchTransferTargets();
  };

  // Handle transfer enrollments
  const handleTransfer = async () => {
    if (!selectedTransferTarget) {
      toast.error('Vui lòng chọn lớp đích');
      return;
    }

    try {
      setTransferring(true);
      await axios.post('/api/v1/class-sections/enrollments/transfer', {
        enrollmentIds: Array.from(selectedRows),
        targetClassName: selectedTransferTarget
      });
      toast.success(`Đã chuyển ${selectedRows.size} sinh viên sang lớp ${selectedTransferTarget}`);
      setShowTransferModal(false);
      setSelectedRows(new Set());
      setSelectedTransferTarget('');
      fetchEnrollments();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error transferring enrollments:', error);
      toast.error(error.response?.data?.message || 'Không thể chuyển sinh viên');
    } finally {
      setTransferring(false);
    }
  };

  const handleUpdateStatus = async (enrollmentId: number, newStatus: string, studentCode: string) => {
    if (!canEdit) {
      toast.error('Chỉ có thể cập nhật trạng thái khi học kỳ chưa bắt đầu');
      return;
    }

    try {
      setUpdatingStatus(enrollmentId);
      await axios.put(`/api/v1/class-sections/enrollments/${enrollmentId}`, {
        className,
        studentCode: studentCode,
        status: newStatus
      });
      toast.success('Cập nhật trạng thái thành công');
      fetchEnrollments();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating enrollment status:', error);
      toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleAddStudent = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Vui lòng chọn sinh viên');
      return;
    }

    // Check if there's enough capacity BEFORE adding any students
    const currentCount = enrollments.length;
    const availableSlots = maxStudents - currentCount;

    if (selectedStudents.size > availableSlots) {
      if (availableSlots <= 0) {
        toast.error(`Lớp học phần đã đủ sinh viên (${currentCount}/${maxStudents}). Không thể thêm sinh viên.`);
      } else {
        toast.error(
          `Không thể thêm ${selectedStudents.size} sinh viên. Lớp chỉ còn ${availableSlots} chỗ trống (${currentCount}/${maxStudents}).`
        );
      }
      return;
    }

    try {
      setAddingStudent(true);
      const studentCodes = Array.from(selectedStudents);
      let successCount = 0;
      let errorMessages: string[] = [];

      // Add students sequentially to avoid race conditions
      for (const code of studentCodes) {
        try {
          await axios.post('/api/v1/class-sections/enrollments', {
            className,
            studentCode: code
          });
          successCount++;
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || 'Lỗi không xác định';
          errorMessages.push(`${code}: ${errorMsg}`);
          // Stop immediately if class is full
          if (errorMsg.includes('đủ sinh viên') || errorMsg.includes('đầy')) {
            break;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Đã thêm ${successCount} sinh viên`);
      }
      if (errorMessages.length > 0) {
        toast.error(`${errorMessages.length} sinh viên không thể thêm`);
      }

      setShowAddStudent(false);
      setSelectedStudents(new Set());
      setStudentSearch('');
      fetchEnrollments();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error adding students:', error);
      toast.error(error.response?.data?.message || 'Không thể thêm sinh viên');
    } finally {
      setAddingStudent(false);
    }
  };

  // Toggle student selection
  const toggleStudentSelection = (code: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  // Select all filtered students
  const selectAllStudents = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.code)));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Danh sách sinh viên đăng ký</h3>
            <p className="text-sm text-gray-500 mt-1">
              Lớp học phần: <span className="font-medium text-orange-600">{className}</span>
              {!loading && (
                <span className="ml-2">• Tổng: <span className="font-medium">{enrollments.length}</span> sinh viên</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && (
              <button
                onClick={() => setShowAddStudent(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Thêm sinh viên
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        </div>

        {/* Semester Status Warning */}
        {!canEdit && (
          <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2 shrink-0">
            <span className="text-yellow-600">⚠️</span>
            <span className="text-sm text-yellow-700">
              Học kỳ đang diễn ra hoặc đã kết thúc. Không thể thêm, sửa hoặc xóa đăng ký.
            </span>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedRows.size > 0 && canEdit && (
          <div className="px-6 py-3 bg-orange-50 border-b border-orange-100 flex items-center justify-between shrink-0">
            <span className="text-sm font-medium text-orange-700">
              Đã chọn <span className="font-bold">{selectedRows.size}</span> sinh viên
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleOpenTransfer}
                disabled={transferring}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {transferring ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-3 h-3" />
                )}
                Chuyển lớp
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                Xóa
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {canEdit && (
                  <th className="px-4 py-3 text-center w-12">
                    <input
                      type="checkbox"
                      checked={enrollments.length > 0 && selectedRows.size === enrollments.length}
                      onChange={handleSelectAll}
                      disabled={loading || enrollments.length === 0}
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Mã SV</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Họ tên</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Chuyên ngành</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                      <span className="text-sm text-gray-500">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-6 py-12 text-center text-sm text-gray-500">
                    Chưa có sinh viên đăng ký lớp học phần này
                  </td>
                </tr>
              ) : (
                enrollments.map((enrollment) => (
                  <tr
                    key={enrollment.id}
                    className={`hover:bg-gray-50 transition-colors ${selectedRows.has(enrollment.id) ? 'bg-orange-50' : ''}`}
                  >
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(enrollment.id)}
                          onChange={() => handleSelectRow(enrollment.id)}
                          className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-gray-900">{enrollment.studentCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{enrollment.studentName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{enrollment.email || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{enrollment.specialization || enrollment.major || '-'}</span>
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

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Thêm sinh viên</h4>
                {selectedStudents.size > 0 && (
                  <span className="text-sm text-orange-600 font-medium">
                    Đã chọn {selectedStudents.size} sinh viên
                  </span>
                )}
              </div>
              <button onClick={() => { setShowAddStudent(false); setSelectedStudents(new Set()); setStudentSearch(''); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Search & Select All */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo mã SV, tên, email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                {filteredStudents.length > 0 && (
                  <button
                    onClick={selectAllStudents}
                    className="px-3 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg border border-orange-200 whitespace-nowrap"
                  >
                    {selectedStudents.size === filteredStudents.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                )}
              </div>

              {/* Student List */}
              <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
                {loadingStudents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">Đang tải danh sách...</span>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    {availableStudents.length === 0 ? 'Không còn sinh viên nào để thêm' : 'Không tìm thấy sinh viên'}
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => toggleStudentSelection(student.code)}
                      className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors flex items-center gap-3
                        ${selectedStudents.has(student.code) ? 'bg-orange-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.code)}
                        onChange={() => toggleStudentSelection(student.code)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{student.code}</span>
                          <span className="text-sm text-gray-600 truncate">{student.fullName}</span>
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {student.email} {student.specialization && `• ${student.specialization}`}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Selected Count */}
              {selectedStudents.size > 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between">
                  <div className="text-sm font-medium text-green-700">
                    <UserPlus className="w-4 h-4 inline mr-2" />
                    Sẵn sàng thêm {selectedStudents.size} sinh viên
                  </div>
                  <button
                    onClick={() => setSelectedStudents(new Set())}
                    className="text-xs text-green-600 hover:underline"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
              <button
                onClick={() => { setShowAddStudent(false); setSelectedStudents(new Set()); setStudentSearch(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleAddStudent}
                disabled={selectedStudents.size === 0 || addingStudent}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                {addingStudent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Thêm {selectedStudents.size > 0 ? `(${selectedStudents.size})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Xóa đăng ký"
        message={`Bạn có chắc chắn muốn xóa ${selectedRows.size} đăng ký? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        type="danger"
      />

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Chuyển sinh viên sang lớp khác</h4>
                <p className="text-sm text-gray-500">
                  Chuyển <span className="font-bold text-orange-600">{selectedRows.size}</span> sinh viên
                </p>
              </div>
              <button
                onClick={() => { setShowTransferModal(false); setSelectedTransferTarget(''); }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {loadingTransferTargets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                  <span className="ml-2 text-sm text-gray-500">Đang tải danh sách lớp...</span>
                </div>
              ) : transferTargets.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500">Không có lớp nào cùng môn học còn chỗ trống</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {transferTargets.map((target) => (
                    <label
                      key={target.className}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors
                        ${selectedTransferTarget === target.className
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="transferTarget"
                          value={target.className}
                          checked={selectedTransferTarget === target.className}
                          onChange={(e) => setSelectedTransferTarget(e.target.value)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-sm font-bold text-gray-900">{target.className}</div>
                          <div className="text-xs text-gray-500">{target.courseCode} - {target.courseName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-700">{target.enrollmentInfo}</div>
                        <div className="text-xs text-gray-400">Sĩ số</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-100">
              <button
                onClick={() => { setShowTransferModal(false); setSelectedTransferTarget(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleTransfer}
                disabled={!selectedTransferTarget || transferring}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                {transferring ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4" />
                )}
                Chuyển
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
