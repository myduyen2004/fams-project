import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRoleAwareNavigate } from '../../hooks/useRoleAwareNavigate';
import { ArrowLeft, Search, FileText, Trash2, RefreshCw, Calendar, Plus, Edit } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { Pagination } from '../../components/common/Pagination';
import { Tooltip } from '../../components/common/Tooltip';
import { ImportClassSectionModal } from '../../components/academic-staff/ImportClassSectionModal';
import { EnrollmentListModal } from '../../components/academic-staff/EnrollmentListModal';
import { ImportEnrollmentModal } from '../../components/academic-staff/ImportEnrollmentModal';
import { ClassSectionFormModal } from '../../components/academic-staff/ClassSectionFormModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CustomSelect } from '../../components/common/CustomSelect';
import { usePagination } from '../../hooks/usePagination';
import apiClient from '../../services/api/authService';
import toast from "@utils/toast";

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
  const navigate = useRoleAwareNavigate();
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
  // Fetch lecturers for filter dropdown
  const fetchLecturers = async () => {
    try {
      const response = await apiClient.get(`/v1/class-sections/semester/${semesterCode}/lecturers`);
      setLecturers(response.data);
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    }
  };

  // Fetch semester info to get status even if no class sections exist
  const fetchSemesterInfo = useCallback(async () => {
    try {
      const response = await apiClient.get(`/v1/semesters/get-by-code/${semesterCode}`);
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
      const response = await apiClient.get<PageResponse>(`/v1/class-sections/semester/${semesterCode}`, {
        params: {
          search: debouncedSearchTerm,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          lecturerId: lecturerFilter === 'ALL' ? undefined : lecturerFilter,
          page: currentPage,
          size: pageSize
        }
      });
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
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${config.className}`}>
        {status === 'ONGOING' && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
        )}
        {status === 'UPCOMING' && (
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
        )}
        {status === 'FINISHED' && (
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
        )}
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
      await apiClient.delete('/v1/class-sections/bulk', {
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
      <div className="space-y-6 pb-8 pt-2">

        {/* Breadcrumb */}
        <div className="flex items-center gap-3 text-sm text-gray-500 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm p-3 rounded-2xl border border-gray-100 dark:border-zinc-800 w-fit">
          <button
            onClick={() => navigate('/academic-staff/semesters')}
            className="hover:text-fpt-orange transition-colors flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Quản lý học kỳ
          </button>
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-700" />
          <button
            className="hover:text-fpt-orange transition-colors flex items-center gap-1 font-medium"
          >
            <span>{semesterCode || 'Học kỳ'}</span>
          </button>
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-700" />
          <span className="text-gray-900 dark:text-white font-bold">Quản lý lớp học phần</span>
        </div>

        {/* Semester Status Banner */}
        {!canEdit && semesterStatus && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-amber-600 text-xl">⚠️</span>
            </div>
            <div>
              <p className="text-base font-bold text-amber-900 dark:text-amber-100 mb-1">
                Học kỳ đang trong trạng thái "{semesterStatus === 'ONGOING' ? 'Đang diễn ra' : 'Đã kết thúc'}"
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Không thể thêm, sửa hoặc xóa lớp học phần và đăng ký trong thời gian này.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div className="flex flex-wrap gap-4">
              <Tooltip content="1. Nhập danh sách lớp học phần từ file Excel" position="bottom">
                <button
                  onClick={handleImportList}
                  disabled={!canEdit}
                  className={`h-[52px] px-6 border-2 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 active:scale-95
                    ${canEdit ? 'text-gray-700 dark:text-zinc-300 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-fpt-orange hover:text-fpt-orange' : 'text-gray-400 bg-gray-50 border-gray-100 cursor-not-allowed opacity-50'}`}
                >
                  <FileText className="w-5 h-5" /> Nhập danh sách lớp học phần
                </button>
              </Tooltip>

              <Tooltip content="2. Nhập danh sách sinh viên vào các lớp từ file Excel" position="bottom">
                <button
                  onClick={handleImportEnrollment}
                  disabled={!canEdit}
                  className={`h-[52px] px-6 border-2 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 active:scale-95
                    ${canEdit ? 'text-gray-700 dark:text-zinc-300 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-fpt-orange hover:text-fpt-orange' : 'text-gray-400 bg-gray-50 border-gray-100 cursor-not-allowed opacity-50'}`}
                >
                  <FileText className="w-5 h-5" /> Nhập danh sách đăng ký
                </button>
              </Tooltip>
            </div>

            <div className="flex flex-wrap gap-4">
              <Tooltip content="Tạo mới một lớp học phần" position="bottom">
                <button
                  onClick={handleCreateClassSection}
                  disabled={!canEdit}
                  className={`h-[52px] px-8 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 active:scale-95
                    ${canEdit
                      ? 'bg-fpt-orange text-white shadow-lg shadow-fpt-orange/20 hover:bg-orange-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}`}
                >
                  <Plus className="w-5 h-5" strokeWidth={3} /> Tạo lớp học phần
                </button>
              </Tooltip>
              <button
                onClick={() => navigate('/academic-staff/schedule')}
                className="h-[52px] px-8 bg-blue-600 hover:bg-blue-700 rounded-2xl text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 active:scale-95"
              >
                <Calendar className="w-5 h-5" /> Tạo thời khóa biểu
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Tìm kiếm */}
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 ml-1 block">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã lớp, tên môn học..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 h-[52px] border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Lọc trạng thái */}
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 ml-1 block">Trạng thái</label>
              <CustomSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                options={[
                  { value: 'ALL', label: 'Tất cả trạng thái' },
                  { value: 'UPCOMING', label: 'Sắp diễn ra' },
                  { value: 'ONGOING', label: 'Đang diễn ra' },
                  { value: 'FINISHED', label: 'Đã kết thúc' }
                ]}
              />
            </div>

            {/* Lọc giảng viên */}
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 ml-1 block">Giảng viên</label>
              <CustomSelect
                value={lecturerFilter}
                onChange={(value) => setLecturerFilter(value)}
                options={[
                  { value: 'ALL', label: 'Tất cả giảng viên' },
                  ...lecturers.map(lecturer => ({ value: lecturer.id.toString(), label: lecturer.fullName }))
                ]}
              />
            </div>
          </div>

          {/* Xóa bộ lọc */}
          {(searchTerm || statusFilter !== 'ALL' || lecturerFilter !== 'ALL') && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setLecturerFilter('ALL');
                }}
                className="text-sm text-fpt-orange hover:text-orange-700 font-bold flex items-center gap-2 hover:underline decoration-2 underline-offset-4"
              >
                <RefreshCw className="w-4 h-4" /> Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Table Container */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          {/* Bulk Actions */}
          {selectedRows.size > 0 && (
            <div className="px-8 py-4 bg-orange-50 dark:bg-orange-900/10 border-b border-orange-100 dark:border-orange-900/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-fpt-orange">
                  Đã chọn <span className="bg-fpt-orange text-white px-2 py-0.5 rounded-lg mx-1">{selectedRows.size}</span> lớp học phần
                </span>
              </div>
              <div className="flex gap-3">
                {selectedRows.size === 1 && canEdit && (
                  <button
                    onClick={() => {
                      const className = Array.from(selectedRows)[0];
                      const classSection = classSections.find(cs => cs.className === className);
                      if (classSection) handleEditClassSection(classSection);
                    }}
                    className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95"
                  >
                    <Edit className="w-4 h-4" /> Sửa
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={deleting}
                    className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
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
              <thead className="bg-fpt-orange text-white">
                <tr>
                  <th className="px-4 py-5 text-center w-12">
                    <input
                      type="checkbox"
                      checked={classSections.length > 0 && selectedRows.size === classSections.length}
                      onChange={handleSelectAll}
                      className="w-5 h-5 rounded border-white/30 text-fpt-orange focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Mã lớp</th>
                  <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Môn học</th>
                  <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Học kỳ</th>
                  <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Giảng viên</th>
                  <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Đăng ký</th>
                  <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Số slot</th>
                  <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Trạng thái</th>
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
                      <td className="px-4 py-5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(classSection.className)}
                          onChange={() => handleSelectRow(classSection.className)}
                          className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-fpt-orange">{classSection.className}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-0.5">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{classSection.courseCode}</div>
                          <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">{classSection.courseName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">{classSection.semesterCode}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">{classSection.lecturerName || '-'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{classSection.enrollmentInfo}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">{classSection.slots}</span>
                      </td>
                      <td className="px-6 py-5">
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

