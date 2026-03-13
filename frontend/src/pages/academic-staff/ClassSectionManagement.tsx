import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Search, FileText, Trash2, RefreshCw, Calendar, Plus, Edit } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { Pagination } from '../../components/common/Pagination';
import { Tooltip } from '../../components/common/Tooltip';
import { ImportClassSectionModal } from '../../components/academic-staff/ImportClassSectionModal';
import { EnrollmentListModal } from '../../components/academic-staff/EnrollmentListModal';
import { ImportEnrollmentModal } from '../../components/academic-staff/ImportEnrollmentModal';
import { ClassSectionFormModal } from '../../components/academic-staff/ClassSectionFormModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { usePagination } from '../../hooks/usePagination';
import axios from 'axios';
import toast from 'react-hot-toast';

// Custom hook for debounce
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface ClassSection {
  className: string;
  courseCode: string;
  courseName: string;
  semesterCode: string;
  semesterName: string;
  lecturerName: string | null;
  lecturerUsername: string | null;
  enrollmentInfo: string;
  slots: number;
  maxStudents: number;
  status: string;
  semesterStatus: string; // UPCOMING, ONGOING, COMPLETED
}

interface LecturerOption {
  id: number;
  fullName: string;
  username: string;
}

interface PageResponse {
  content: ClassSection[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const ClassSectionManagement: React.FC = () => {
  const navigate = useNavigate();
  const { semesterCode } = useParams<{ semesterCode: string }>();
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [lecturers, setLecturers] = useState<LecturerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [lecturerFilter, setLecturerFilter] = useState('ALL');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isImportEnrollmentModalOpen, setIsImportEnrollmentModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedMaxStudents, setSelectedMaxStudents] = useState(0);
  const [selectedClassSection, setSelectedClassSection] = useState<ClassSection | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [semesterStatus, setSemesterStatus] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Use custom pagination hook - auto resets to page 0 when filters change
  const { page: currentPage, setPage: setCurrentPage } = usePagination({
    resetDependencies: [debouncedSearchTerm, statusFilter, lecturerFilter]
  });

  // Fetch lecturers for filter dropdown
  const fetchLecturers = async () => {
    try {
      const response = await axios.get(`/api/v1/class-sections/semester/${semesterCode}/lecturers`);
      setLecturers(response.data);
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    }
  };

  // Fetch semester info to get status even if no class sections exist
  const fetchSemesterInfo = useCallback(async () => {
    try {
      const response = await axios.get(`/api/v1/semesters/get-by-code/${semesterCode}`);
      // Map back to uppercase values used in this component
      const statusMap: { [key: string]: string } = {
        'upcoming': 'UPCOMING',
        'active': 'ONGOING',
        'ended': 'COMPLETED'
      };
      setSemesterStatus(statusMap[response.data.status] || response.data.status);
    } catch (error) {
      console.error('Error fetching semester info:', error);
    }
  }, [semesterCode]);

  // Fetch class sections from API
  const fetchClassSections = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        size: pageSize,
      };

      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (lecturerFilter !== 'ALL') params.lecturerId = lecturerFilter;

      const response = await axios.get(`/api/v1/class-sections/semester/${semesterCode}`, { params });
      const data: PageResponse = response.data;

      setClassSections(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);

      // Note: Semester status is now fetched via fetchSemesterInfo
    } catch (error) {
      console.error('Error fetching class sections:', error);
      toast.error('Không thể tải danh sách lớp học phần');
    } finally {
      setLoading(false);
    }
  }, [semesterCode, currentPage, pageSize, debouncedSearchTerm, statusFilter, lecturerFilter]);

  useEffect(() => {
    if (semesterCode) {
      fetchLecturers();
      fetchSemesterInfo();
    }
  }, [semesterCode, fetchSemesterInfo]);

  useEffect(() => {
    if (semesterCode) {
      fetchClassSections();
    }
  }, [fetchClassSections]);

  // Check if semester allows editing
  const canEdit = semesterStatus === 'UPCOMING';

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; className: string } } = {
      UPCOMING: { label: 'Sắp diễn ra', className: 'bg-orange-100 text-orange-700' },
      ONGOING: { label: 'Đang diễn ra', className: 'bg-blue-100 text-blue-700' },
      FINISHED: { label: 'Đã kết thúc', className: 'bg-gray-100 text-gray-700' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.className}`}>
        {config.label}
      </span>
    );
  };


  const handleImportList = () => {
    if (!canEdit) {
      toast.error('Chỉ có thể nhập danh sách khi học kỳ chưa bắt đầu');
      return;
    }
    setIsImportModalOpen(true);
  };

  const handleImportSuccess = () => {
    setIsImportModalOpen(false);
    fetchClassSections();
    fetchLecturers();
  };

  const handleCreateClassSection = () => {
    if (!canEdit) {
      toast.error('Chỉ có thể tạo lớp học phần khi học kỳ chưa bắt đầu');
      return;
    }
    setSelectedClassSection(null);
    setIsFormModalOpen(true);
  };

  const handleEditClassSection = (classSection: ClassSection) => {
    if (!canEdit) {
      toast.error('Chỉ có thể sửa lớp học phần khi học kỳ chưa bắt đầu');
      return;
    }
    setSelectedClassSection(classSection);
    setIsFormModalOpen(true);
  };

  // Handle row selection
  const handleSelectRow = (className: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(className)) {
        newSet.delete(className);
      } else {
        newSet.add(className);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.size === classSections.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(classSections.map(cs => cs.className)));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!canEdit) {
      toast.error('Chỉ có thể xóa lớp học phần khi học kỳ chưa bắt đầu');
      return;
    }
    setShowDeleteConfirm(true);
  };

  // Confirm delete action
  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      setDeleting(true);
      await axios.delete('/api/v1/class-sections/bulk', {
        data: Array.from(selectedRows)
      });
      toast.success(`Đã xóa ${selectedRows.size} lớp học phần`);
      setSelectedRows(new Set());
      fetchClassSections();
    } catch (error: any) {
      console.error('Error deleting class sections:', error);
      toast.error(error.response?.data?.message || 'Không thể xóa lớp học phần');
    } finally {
      setDeleting(false);
    }
  };

  // Handle double-click to view enrollment list
  const handleRowDoubleClick = (classSection: ClassSection) => {
    setSelectedClassName(classSection.className);
    setSelectedMaxStudents(classSection.maxStudents);
    setIsEnrollmentModalOpen(true);
  };


  // Handle import enrollment (open modal)
  const handleImportEnrollment = () => {
    if (!canEdit) {
      toast.error('Chỉ có thể nhập danh sách đăng ký khi học kỳ chưa bắt đầu');
      return;
    }
    setIsImportEnrollmentModalOpen(true);
  };

  // Handle import enrollment success
  const handleImportEnrollmentSuccess = () => {
    setIsImportEnrollmentModalOpen(false);
    fetchClassSections();
  };

  // Handle form modal success
  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    setSelectedClassSection(null);
    fetchClassSections();
    fetchLecturers();
  };

  // Clear selection when data changes
  useEffect(() => {
    setSelectedRows(new Set());
  }, [classSections]);

  return (
    <AcademicStaffLayout pageTitle="Quản lý lớp học phần">
      <div className="max-w-7xl mx-auto space-y-6 pb-8 pt-2">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => navigate('/academic-staff/semesters')}
            className="hover:text-orange-600 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Quản lý học kỳ
          </button>
          <button
            className="hover:text-orange-600 transition-colors flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span>{semesterCode || 'Học kỳ'}</span>
          </button>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className="text-gray-900 font-bold">Quản lý lớp học phần</span>
        </div>

        {/* Semester Status Banner */}
        {!canEdit && semesterStatus && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 text-lg">⚠️</span>
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Học kỳ đang trong trạng thái "{semesterStatus === 'ONGOING' ? 'Đang diễn ra' : 'Đã kết thúc'}"
              </p>
              <p className="text-xs text-yellow-600">
                Không thể thêm, sửa hoặc xóa lớp học phần và đăng ký trong thời gian này.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-3">
              <Tooltip content="1. Nhập danh sách lớp học phần từ file Excel" position="bottom">
                <button
                  onClick={handleImportList}
                  disabled={!canEdit}
                  className={`px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold transition-all flex items-center gap-2
                    ${canEdit ? 'text-gray-600 bg-white hover:bg-gray-50' : 'text-gray-400 bg-gray-100 cursor-not-allowed'}`}
                >
                  <FileText className="w-4 h-4" /> Nhập danh sách lớp học phần
                </button>
              </Tooltip>

              <Tooltip content="2. Nhập danh sách sinh viên vào các lớp từ file Excel" position="bottom">
                <button
                  onClick={handleImportEnrollment}
                  disabled={!canEdit}
                  className={`px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold transition-all flex items-center gap-2
                    ${canEdit ? 'text-gray-600 bg-white hover:bg-gray-50' : 'text-gray-400 bg-gray-100 cursor-not-allowed'}`}
                >
                  <FileText className="w-4 h-4" /> Nhập danh sách đăng ký
                </button>
              </Tooltip>
            </div>

            <div className="flex gap-3">
              <Tooltip content="Tạo mới một lớp học phần" position="bottom">
                <button
                  onClick={handleCreateClassSection}
                  disabled={!canEdit}
                  className={`px-4 py-2 rounded-lg text-xs font-bold shadow-lg transition-all flex items-center gap-2
                    ${canEdit
                      ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}`}
                >
                  <Plus className="w-4 h-4" /> Tạo lớp học phần
                </button>
              </Tooltip>
              <button
                onClick={() => navigate('/academic-staff/schedule')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" /> Tạo thời khóa biểu
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Tìm kiếm */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã lớp, tên môn học..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            {/* Lọc trạng thái */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Trạng thái</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition-all"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="UPCOMING">Sắp diễn ra</option>
                <option value="ONGOING">Đang diễn ra</option>
                <option value="FINISHED">Đã kết thúc</option>
              </select>
            </div>

            {/* Lọc giảng viên */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Giảng viên</label>
              <select
                value={lecturerFilter}
                onChange={(e) => setLecturerFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition-all"
              >
                <option value="ALL">Tất cả giảng viên</option>
                {lecturers.map((lecturer) => (
                  <option key={lecturer.id} value={lecturer.id}>
                    {lecturer.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Xóa bộ lọc */}
          {(searchTerm || statusFilter !== 'ALL' || lecturerFilter !== 'ALL') && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setLecturerFilter('ALL');
                }}
                className="text-xs text-orange-600 hover:text-orange-700 font-bold"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Bulk Actions */}
          {selectedRows.size > 0 && (
            <div className="px-6 py-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
              <span className="text-sm font-medium text-orange-700">
                Đã chọn <span className="font-bold">{selectedRows.size}</span> lớp học phần
              </span>
              <div className="flex gap-2">
                {selectedRows.size === 1 && canEdit && (
                  <button
                    onClick={() => {
                      const className = Array.from(selectedRows)[0];
                      const classSection = classSections.find(cs => cs.className === className);
                      if (classSection) handleEditClassSection(classSection);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Sửa
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {deleting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Xóa
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-orange-500 text-white">
                <tr>
                  <th className="px-4 py-4 text-center w-8">
                    <input
                      type="checkbox"
                      checked={classSections.length > 0 && selectedRows.size === classSections.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-white/30 text-orange-600 focus:ring-orange-500 focus:ring-offset-orange-600 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase w-36">Mã lớp</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase w-56">Môn học</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase w-16">Học kỳ</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase w-44">Giảng viên</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase w-24">Đăng ký</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase w-20">Số slot</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase w-28">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-500">Đang tải...</span>
                      </div>
                    </td>
                  </tr>
                ) : classSections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                      Không tìm thấy lớp học phần
                    </td>
                  </tr>
                ) : (
                  classSections.map((classSection) => (
                    <tr
                      key={classSection.className}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedRows.has(classSection.className) ? 'bg-orange-50' : ''}`}
                      onDoubleClick={() => handleRowDoubleClick(classSection)}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(classSection.className)}
                          onChange={() => handleSelectRow(classSection.className)}
                          className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-orange-600">{classSection.className}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{classSection.courseCode}</div>
                          <div className="text-xs text-gray-500">{classSection.courseName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{classSection.semesterCode}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{classSection.lecturerName || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">{classSection.enrollmentInfo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{classSection.slots}</span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(classSection.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Hint for double-click */}
          {!loading && classSections.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center">
              <span className="text-xs text-gray-500">
                💡 Double-click vào một lớp học phần để xem danh sách sinh viên đăng ký
              </span>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalElements > 0 && (
            <div className="px-6 pb-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalElements={totalElements}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      <ImportClassSectionModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
        semesterCode={semesterCode || ''}
      />

      {/* Enrollment List Modal */}
      <EnrollmentListModal
        isOpen={isEnrollmentModalOpen}
        className={selectedClassName}
        semesterStatus={semesterStatus}
        maxStudents={selectedMaxStudents}
        onClose={() => setIsEnrollmentModalOpen(false)}
        onUpdate={fetchClassSections}
      />

      {/* Import Enrollment Modal */}
      <ImportEnrollmentModal
        isOpen={isImportEnrollmentModalOpen}
        semesterCode={semesterCode || ''}
        onClose={() => setIsImportEnrollmentModalOpen(false)}
        onSuccess={handleImportEnrollmentSuccess}
      />

      {/* Class Section Form Modal */}
      <ClassSectionFormModal
        isOpen={isFormModalOpen}
        classSection={selectedClassSection}
        semesterCode={semesterCode || ''}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedClassSection(null);
        }}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Xóa lớp học phần"
        message={`Bạn có chắc chắn muốn xóa ${selectedRows.size} lớp học phần?\nHành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        type="danger"
      />
    </AcademicStaffLayout>
  );
};

export default ClassSectionManagement;
