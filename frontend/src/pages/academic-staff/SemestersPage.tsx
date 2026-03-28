import React, { useState, useEffect } from 'react';
import { useRoleAwareNavigate } from '../../hooks/useRoleAwareNavigate';
import { Settings, Pen, Plus, Search, Trash2, Info } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { AddSemesterModal } from '../../components/academic-staff/AddSemesterModal';
import { UpdateSemesterModal } from '../../components/academic-staff/UpdateSemesterModal';
import { DeleteSemesterModal } from '../../components/academic-staff/DeleteSemesterModal';
import { Pagination } from '../../components/academic-staff';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { usePagination } from '../../hooks/usePagination';
import axios from 'axios';
import apiClient from '../../services/api/authService';

interface Semester {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'ended';
}

export const SemestersPage: React.FC = () => {
  const navigate = useRoleAwareNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>([]);

  // Use custom pagination hook - 0-indexed to match Pagination component
  const { page, setPage } = usePagination({ resetDependencies: [searchTerm] });

  // Bulk delete confirmation state
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteConfig, setBulkDeleteConfig] = useState<{
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    action?: () => Promise<void>;
    showConfirmButton: boolean;
  }>({
    title: '',
    message: '',
    type: 'info',
    showConfirmButton: true
  });

  // Fetch semesters from API
  const fetchSemesters = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/v1/semesters/active');
      const data = Array.isArray(response.data) ? response.data : [];
      setSemesters(data);
      setError(null);
    } catch (err: unknown) {
      console.error('Error fetching semesters:', err);
      let errorMessage = 'Không thể tải danh sách học kỳ';
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setSemesters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  // Reset selection when filters/page change
  useEffect(() => {
    setSelectedSemesters([]);
  }, [searchTerm, page]);

  // Handle add semester
  const handleAddSemester = async (semesterData: {
    code: string;
    name: string;
    startDate: string;
    endDate: string;
  }) => {
    try {
      await apiClient.post('/v1/semesters', semesterData);
      await fetchSemesters();
    } catch (error) {
      throw error;
    }
  };

  // Handle update semester
  const handleUpdateSemester = async (semesterData: {
    code: string;
    name: string;
    startDate: string;
    endDate: string;
  }) => {
    try {
      await apiClient.put(`/v1/semesters/${semesterData.code}`, semesterData);
      await fetchSemesters();
    } catch (error) {
      throw error;
    }
  };

  // Open update modal
  const handleEditClick = (semester: Semester) => {
    setSelectedSemester(semester);
    setIsUpdateModalOpen(true);
  };

  // Open delete modal
  const handleDeleteClick = (semester: Semester) => {
    setSelectedSemester(semester);
    setIsDeleteModalOpen(true);
  };

  // Handle delete semester
  const handleDeleteSemester = async () => {
    if (!selectedSemester) return;
    try {
      await apiClient.delete(`/v1/semesters/${selectedSemester.code}`);
      await fetchSemesters();
    } catch (error) {
      console.error('Error deleting semester:', error);
      throw error;
    }
  };

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const upcomingCodes = paginatedSemesters
        .filter(s => s.status === 'upcoming')
        .map(s => s.code);
      setSelectedSemesters(upcomingCodes);
    } else {
      setSelectedSemesters([]);
    }
  };

  const handleSelectOne = (code: string) => {
    if (selectedSemesters.includes(code)) {
      setSelectedSemesters(selectedSemesters.filter(c => c !== code));
    } else {
      setSelectedSemesters([...selectedSemesters, code]);
    }
  };

  // Filtering
  const filteredSemesters = Array.isArray(semesters) ? semesters.filter(semester =>
    semester.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    semester.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    semester.startDate.includes(searchTerm)
  ) : [];

  // Pagination
  const itemsPerPage = 10;
  const startIndex = page * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSemesters = filteredSemesters.slice(startIndex, endIndex);

  // Status counts
  const upcomingCount = Array.isArray(semesters) ? semesters.filter(s => s.status === 'upcoming').length : 0;
  const activeCount = Array.isArray(semesters) ? semesters.filter(s => s.status === 'active').length : 0;
  const endedCount = Array.isArray(semesters) ? semesters.filter(s => s.status === 'ended').length : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 border border-orange-100">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            Sắp diễn ra
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-100">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Đang diễn ra
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            Đã kết thúc
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Bulk delete check
  const hasNonUpcoming = semesters.some(
    s => selectedSemesters.includes(s.code) && s.status !== 'upcoming'
  );

  return (
    <AcademicStaffLayout pageTitle="Quản lý danh sách học kỳ">
      <div className="space-y-6">
        {/* Top actions bar */}
        <div className="flex items-center justify-between">
          <div></div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-fpt-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Thêm học kỳ mới
            </button>
          </div>
        </div>

        {/* Main card */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Search + Status Summary */}
          <div className="mb-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên học kỳ, mã..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-fpt-orange focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              {/* Status Summary */}
              <div className="text-xs font-medium flex gap-4 text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Đang diễn ra: <span className="text-gray-700 font-semibold">{activeCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  Sắp tới: <span className="text-gray-700 font-semibold">{upcomingCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  Đã kết thúc: <span className="text-gray-700 font-semibold">{endedCount}</span>
                </div>
              </div>
            </div>

            {/* Selection Action Bar */}
            {selectedSemesters.length > 0 && (
              <div className={`p-3 ${hasNonUpcoming ? 'bg-orange-50 border-orange-100' : 'bg-red-50 border-red-100'} border rounded-lg flex flex-col gap-2 animate-in fade-in slide-in-from-top-2`}>
                {/* Warning banner */}
                {hasNonUpcoming && (
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span className="text-sm text-orange-700">
                      Không thể xóa học kỳ với trạng thái đang diễn ra hoặc đã kết thúc. Vui lòng chỉ chọn học kỳ sắp diễn ra
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${hasNonUpcoming ? 'text-orange-600' : 'text-red-600'}`}>
                    Đã chọn {selectedSemesters.length} học kỳ
                  </span>
                  <button
                    disabled={hasNonUpcoming}
                    onClick={() => {
                      if (hasNonUpcoming) return;
                      const upcomingSemesters = semesters.filter(
                        s => selectedSemesters.includes(s.code) && s.status === 'upcoming'
                      );

                      const handleBulkDelete = async () => {
                        try {
                          const deletePromises = upcomingSemesters.map(s =>
                            apiClient.delete(`/v1/semesters/${s.code}`)
                          );
                          await Promise.all(deletePromises);
                          await fetchSemesters();
                          setSelectedSemesters([]);
                        } catch (error) {
                          console.error('Error bulk deleting semesters:', error);
                        } finally {
                          setIsBulkDeleteModalOpen(false);
                        }
                      };

                      setBulkDeleteConfig({
                        title: 'Xác nhận xóa',
                        message: `Bạn có chắc chắn muốn xóa ${upcomingSemesters.length} học kỳ đã chọn?`,
                        type: 'danger',
                        action: handleBulkDelete,
                        showConfirmButton: true
                      });
                      setIsBulkDeleteModalOpen(true);
                    }}
                    className={`px-4 py-1.5 text-sm rounded-lg font-medium flex items-center gap-2 transition-colors ${hasNonUpcoming
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-fpt-orange text-white">
                  <th className="px-4 py-3 text-left rounded-tl-lg">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-white/20 text-white focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                      onChange={handleSelectAll}
                      checked={
                        paginatedSemesters.filter(s => s.status === 'upcoming').length > 0 &&
                        paginatedSemesters.filter(s => s.status === 'upcoming').every(s => selectedSemesters.includes(s.code))
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Mã học kỳ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tên học kỳ</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Ngày bắt đầu</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Ngày kết thúc</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Trạng thái</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {loading && semesters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      <div className="flex justify-center mb-2">
                        <svg className="h-8 w-8 animate-spin text-fpt-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : paginatedSemesters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  paginatedSemesters.map((semester) => (
                    <tr
                      key={semester.code}
                      className={`border-b transition-colors ${selectedSemesters.includes(semester.code)
                        ? 'bg-orange-50 dark:bg-orange-900/20'
                        : 'bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50'
                        } dark:border-zinc-800`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange dark:border-zinc-600 dark:bg-zinc-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          checked={selectedSemesters.includes(semester.code)}
                          onChange={() => handleSelectOne(semester.code)}
                          disabled={semester.status !== 'upcoming'}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium font-semibold text-gray-900">{semester.code}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{semester.name}</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-600 dark:text-zinc-400">{formatDate(semester.startDate)}</td>
                      <td className="px-4 py-3 text-center font-medium text-gray-600 dark:text-zinc-400">{formatDate(semester.endDate)}</td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(semester.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-400">
                          <button
                            onClick={() => navigate(`/academic-staff/semesters/${semester.code}/config`)}
                            className="hover:text-blue-500 transition inline-flex"
                            title="Cấu hình kỳ học"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          {semester.status !== 'active' && (
                            <button
                              onClick={() => handleEditClick(semester)}
                              className="hover:text-orange-500 transition inline-flex"
                              title="Cập nhật"
                            >
                              <Pen className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(semester)}
                            className="hover:text-red-500 transition inline-flex"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination - 0-indexed like MajorManagement */}
          <Pagination
            page={page}
            totalElements={filteredSemesters.length}
            pageSize={itemsPerPage}
            onPageChange={setPage}
            itemLabel="học kỳ"
          />
        </div>
      </div>

      {/* Add Semester Modal */}
      <AddSemesterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddSemester}
        existingSemesters={semesters}
      />

      {/* Update Semester Modal */}
      <UpdateSemesterModal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setSelectedSemester(null);
        }}
        onSubmit={handleUpdateSemester}
        semester={selectedSemester}
        existingSemesters={semesters}
      />

      {/* Delete Semester Modal */}
      <DeleteSemesterModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSemester(null);
        }}
        onConfirm={handleDeleteSemester}
        semesterName={selectedSemester?.name || ''}
        semesterStatus={selectedSemester?.status || ''}
      />

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={async () => {
          if (bulkDeleteConfig.action) {
            await bulkDeleteConfig.action();
          }
          if (!bulkDeleteConfig.action) {
            setIsBulkDeleteModalOpen(false);
          }
        }}
        title={bulkDeleteConfig.title}
        message={bulkDeleteConfig.message}
        type={bulkDeleteConfig.type}
        confirmLabel={bulkDeleteConfig.showConfirmButton ? "Xác nhận" : ""}
        cancelLabel={bulkDeleteConfig.showConfirmButton ? "Hủy" : ""}
      />
    </AcademicStaffLayout>
  );
};
