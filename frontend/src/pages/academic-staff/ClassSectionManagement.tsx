import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Search, Download, FileText, Trash2, RefreshCw, Eye, Calendar } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { Pagination } from '../../components/common/Pagination';
import { ImportClassSectionModal } from '../../components/academic-staff/ImportClassSectionModal';
import { EnrollmentListModal } from '../../components/academic-staff/EnrollmentListModal';
import { ImportEnrollmentModal } from '../../components/academic-staff/ImportEnrollmentModal';
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
  lecturerName: string | null;
  enrollmentInfo: string;
  slots: number;
  status: string;
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
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

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
    }
  }, [semesterCode]);

  useEffect(() => {
    if (semesterCode) {
      fetchClassSections();
    }
  }, [fetchClassSections]);

  // Note: Page reset is now handled by usePagination hook

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

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get('/api/v1/class-sections/import/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'class_section_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Tải xuống template thành công');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Không thể tải xuống template');
    }
  };

  const handleImportList = () => {
    setIsImportModalOpen(true);
  };

  const handleImportSuccess = () => {
    setIsImportModalOpen(false);
    fetchClassSections();
  };

  const handleCreateClassSection = () => {
    toast('Chức năng tạo lớp học phần đang được phát triển', { icon: 'ℹ️' });
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
  const handleBulkDelete = () => {
    toast(`Xóa ${selectedRows.size} lớp học phần đang được phát triển`, { icon: 'ℹ️' });
  };

  // Handle bulk update
  const handleBulkUpdate = () => {
    toast(`Cập nhật ${selectedRows.size} lớp học phần đang được phát triển`, { icon: 'ℹ️' });
  };

  // Handle view enrollment list
  const handleViewEnrollment = () => {
    if (selectedRows.size === 1) {
      const className = Array.from(selectedRows)[0];
      setSelectedClassName(className);
      setIsEnrollmentModalOpen(true);
    }
  };

  // Handle download enrollment template
  const handleDownloadEnrollmentTemplate = async () => {
    try {
      const response = await axios.get(`/api/v1/class-sections/semester/${semesterCode}/enrollments/import/template`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `enrollment_import_template_${semesterCode}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Tải xuống template thành công');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Không thể tải xuống template');
    }
  };

  // Handle import enrollment (open modal)
  const handleImportEnrollment = () => {
    setIsImportEnrollmentModalOpen(true);
  };

  // Handle import enrollment success
  const handleImportEnrollmentSuccess = () => {
    setIsImportEnrollmentModalOpen(false);
    fetchClassSections();
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
            // onClick={() => navigate('/academic-staff/semesters/' + semesterCode)} 
            className="hover:text-orange-600 transition-colors flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span>{semesterCode || 'Học kỳ'}</span>
          </button>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className="text-gray-900 font-bold">Quản lý lớp học phần</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-3">
              <button
                onClick={handleDownloadEnrollmentTemplate}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Tải mẫu danh sách đăng ký
              </button>
              <button
                onClick={handleImportEnrollment}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <FileText className="w-4 h-4" /> Nhập danh sách đăng ký
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Tải mẫu danh sách lớp học phần
              </button>
              <button
                onClick={handleImportList}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <FileText className="w-4 h-4" /> Nhập danh sách lớp học phần
              </button>
              <button
                onClick={handleCreateClassSection}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2"
              >
                + Tạo lớp học phần
              </button>
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
                {selectedRows.size === 1 && (
                  <button
                    onClick={handleViewEnrollment}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" /> Xem danh sách đăng ký
                  </button>
                )}
                <button
                  onClick={handleBulkUpdate}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Cập nhật
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-orange-600 text-white">
                <tr>
                  <th className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={classSections.length > 0 && selectedRows.size === classSections.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-white/30 text-orange-600 focus:ring-orange-500 focus:ring-offset-orange-600 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Mã lớp</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Môn học</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Học kỳ</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Giảng viên</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Đăng ký</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Số slot</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase">Trạng thái</th>
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
                      onClick={() => handleSelectRow(classSection.className)}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
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
        onClose={() => setIsEnrollmentModalOpen(false)}
      />

      {/* Import Enrollment Modal */}
      <ImportEnrollmentModal
        isOpen={isImportEnrollmentModalOpen}
        semesterCode={semesterCode || ''}
        onClose={() => setIsImportEnrollmentModalOpen(false)}
        onSuccess={handleImportEnrollmentSuccess}
      />
    </AcademicStaffLayout>
  );
};

export default ClassSectionManagement;
