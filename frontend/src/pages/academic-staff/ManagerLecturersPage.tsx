import { useState, useEffect, useCallback } from 'react';
import { Loader2, GraduationCap } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { academicStaffService, LecturerResponse } from '../../services/api/academicStaffService';
import toast from 'react-hot-toast';
import {
  LecturerFilters,
  LecturerTableRow,
  ViewLecturerModal,
  EditLecturerModal,
  AddLecturerModal,
  ImportLecturerModal
} from '../../components/academic-staff/lecturers';

export const ManagerLecturersPage = () => {
  const [lecturers, setLecturers] = useState<LecturerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedLecturers, setSelectedLecturers] = useState<number[]>([]);

  const [isExporting, setIsExporting] = useState(false);

  // Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<LecturerResponse | null>(null);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await academicStaffService.getDepartments();
        setDepartments(data);
      } catch (error) {
        console.error('Failed to fetch departments');
      }
    };
    fetchDepartments();
  }, []);

  const fetchLecturers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await academicStaffService.getLecturers({
        // Hiển thị tất cả giảng viên (không filter theo hasProfile)
        status: statusFilter === 'all' ? undefined : statusFilter,
        department: departmentFilter === 'all' ? undefined : departmentFilter,
        search,
        page,
        size: 50,
        sort: 'id,asc'
      });
      setLecturers(data.content);
      setTotalElements(data.totalElements);
    } catch (error) {
      toast.error('Không thể tải danh sách giảng viên');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, departmentFilter, search, page]);

  useEffect(() => {
    fetchLecturers();
  }, [fetchLecturers]);

  // Handlers
  const handleView = useCallback((lecturer: LecturerResponse) => {
    setSelectedLecturer(lecturer);
    setIsViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((lecturer: LecturerResponse) => {
    setSelectedLecturer(lecturer);
    setIsEditModalOpen(true);
  }, []);



  const handleSelectLecturer = useCallback((id: number) => {
    setSelectedLecturers(prev =>
      prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]
    );
  }, []);



  // Export Excel handler
  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      const blob = await academicStaffService.exportLecturers({
        department: departmentFilter === 'all' ? undefined : departmentFilter,
        status: statusFilter === 'all' ? undefined : statusFilter
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `danh-sach-giang-vien-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Xuất Excel thành công');
    } catch (error) {
      toast.error('Lỗi khi xuất file Excel');
    } finally {
      setIsExporting(false);
    }
  }, [departmentFilter, statusFilter]);

  const handleAddSuccess = useCallback(() => {
    setIsAddModalOpen(false);
    fetchLecturers();
  }, [fetchLecturers]);

  const handleEditSuccess = useCallback(() => {
    setIsEditModalOpen(false);
    fetchLecturers();
  }, [fetchLecturers]);

  const handleImportSuccess = useCallback(() => {
    setIsImportModalOpen(false);
    fetchLecturers();
  }, [fetchLecturers]);

  const totalPages = Math.ceil(totalElements / 50);

  return (
    <AcademicStaffLayout pageTitle="Quản lý Giảng viên">
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">

        {/* Filters */}
        <LecturerFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}

          showImportButton={true}
          showDepartmentFilter={true}
          showExportButton={true}
          departments={departments}
          departmentFilter={departmentFilter}
          onDepartmentFilterChange={setDepartmentFilter}
          onExportClick={handleExport}
          onImportClick={() => setIsImportModalOpen(true)}

          isExporting={isExporting}
        />

        {/* Header */}
        {/* <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <GraduationCap className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Danh sách Giảng viên</h2>
            <p className="text-sm text-gray-500">Tổng cộng {totalElements} giảng viên đã có thông tin</p>
          </div>
        </div> */}

        {/* Bulk Actions */}


        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-fpt-orange text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-lg">
                  Giảng viên
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Mã GV
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Chuyên khoa
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                  Tiểu sử
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg">
                  Hành động
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : lecturers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">
                    <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    Không tìm thấy giảng viên nào
                  </td>
                </tr>
              ) : (
                lecturers.map((lecturer) => (
                  <LecturerTableRow
                    key={lecturer.id}
                    lecturer={lecturer}
                    isSelected={selectedLecturers.includes(lecturer.id)}
                    onSelect={handleSelectLecturer}
                    onView={handleView}
                    onEdit={handleEdit}
                    showRegisterButton={false}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalElements > 0 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800 text-sm text-gray-500">
            <div>
              Hiển thị <span className="font-medium text-gray-900 dark:text-white">{page * 50 + 1}</span> đến{' '}
              <span className="font-medium text-gray-900 dark:text-white">{Math.min((page + 1) * 50, totalElements)}</span> trong số{' '}
              <span className="font-medium text-gray-900 dark:text-white">{totalElements}</span> giảng viên
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
              >
                Trước
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum = i;
                if (totalPages > 5) {
                  if (page < 3) {
                    pageNum = i;
                  } else if (page > totalPages - 4) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-colors ${page === pageNum
                      ? 'bg-fpt-orange text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                      }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isViewModalOpen && selectedLecturer && (
        <ViewLecturerModal
          lecturer={selectedLecturer}
          onClose={() => setIsViewModalOpen(false)}
          showRegisterButton={false}
        />
      )}
      {isEditModalOpen && selectedLecturer && (
        <EditLecturerModal
          lecturer={selectedLecturer}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}
      {isAddModalOpen && (
        <AddLecturerModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      )}
      {isImportModalOpen && (
        <ImportLecturerModal
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </AcademicStaffLayout>
  );
};

export default ManagerLecturersPage;
