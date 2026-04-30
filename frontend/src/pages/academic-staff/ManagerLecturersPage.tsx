import { useState, useEffect, useCallback } from 'react';
import { Loader2, GraduationCap } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { academicStaffService, LecturerResponse } from '../../services/api/academicStaffService';
import toast from "@utils/toast";
import {
  LecturerFilters,
  LecturerTableRow,
  ViewLecturerModal,
  EditLecturerModal,
  AddLecturerModal,
  ImportLecturerModal
} from '../../components/academic-staff/lecturers';
import { usePagination } from '../../hooks/usePagination';

export const ManagerLecturersPage = () => {
  const [lecturers, setLecturers] = useState<LecturerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [majorFilter, setMajorFilter] = useState('all');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [totalElements, setTotalElements] = useState(0);
  const [selectedLecturers, setSelectedLecturers] = useState<number[]>([]);

  // Use custom pagination hook - auto resets to page 0 when filters change
  const { page, setPage } = usePagination({
    resetDependencies: [statusFilter, majorFilter, specializationFilter, search]
  });

  const [isExporting, setIsExporting] = useState(false);

  // Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<LecturerResponse | null>(null);


  const fetchLecturers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await academicStaffService.getLecturers({
        status: statusFilter === 'all' ? undefined : statusFilter,
        major: majorFilter === 'all' ? undefined : majorFilter,
        specialization: specializationFilter === 'all' ? undefined : specializationFilter,
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
  }, [statusFilter, majorFilter, specializationFilter, search, page]);

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
        major: majorFilter === 'all' ? undefined : majorFilter,
        specialization: specializationFilter === 'all' ? undefined : specializationFilter,
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
  }, [majorFilter, specializationFilter, statusFilter]);

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
      <div className="space-y-6">
        {/* Header & Filter Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-8 shadow-sm mb-6 animate-in fade-in duration-500">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Quản lý giảng viên</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Quản lý hồ sơ và thông tin giảng dạy của giảng viên</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex h-[52px] items-center gap-2 px-6 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm text-gray-700 dark:text-gray-200 font-bold hover:border-fpt-orange/40 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <GraduationCap className="h-[18px] w-[18px]" />}
                {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex h-[52px] items-center gap-2 rounded-2xl bg-fpt-orange px-8 text-sm font-bold text-white hover:bg-orange-600 transition-all shadow-lg shadow-fpt-orange/20 active:scale-95"
              >
                <GraduationCap className="h-[18px] w-[18px]" />
                Import giảng viên
              </button>
            </div>
          </div>

          <LecturerFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            showImportButton={false}
            showMajorFilter={true}
            showExportButton={false}
            majorFilter={majorFilter}
            onMajorFilterChange={(val) => {
              setMajorFilter(val);
              setSpecializationFilter('all');
            }}
            specializationFilter={specializationFilter}
            onSpecializationFilterChange={setSpecializationFilter}
            onExportClick={handleExport}
            onImportClick={() => setIsImportModalOpen(true)}
            isExporting={isExporting}
          />
        </div>

        {/* Table Block */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in fade-in duration-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-fpt-orange text-white">
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                    Giảng viên
                  </th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                    Mã GV
                  </th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                    Ngành / Chuyên ngành
                  </th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                    Trạng thái
                  </th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                    Tiểu sử
                  </th>
                  <th className="px-4 py-5 text-center w-24 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                    Thao tác
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
            <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-sm text-gray-500">
              <div>
                Hiển thị <span className="font-bold text-gray-900 dark:text-white">{page * 50 + 1}</span> đến{' '}
                <span className="font-bold text-gray-900 dark:text-white">{Math.min((page + 1) * 50, totalElements)}</span> trong số{' '}
                <span className="font-bold text-gray-900 dark:text-white">{totalElements}</span> giảng viên
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
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
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
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


