import React, { useState, useEffect } from 'react';
import { useRoleAwareNavigate } from '../../hooks/useRoleAwareNavigate';
import { Settings, Pen, Plus, Search, Trash2, Loader2 } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { AddSemesterModal } from '../../components/academic-staff/AddSemesterModal';
import { UpdateSemesterModal } from '../../components/academic-staff/UpdateSemesterModal';
import { DeleteSemesterModal } from '../../components/academic-staff/DeleteSemesterModal';
import { Pagination } from '../../components/academic-staff';
import { usePagination } from '../../hooks/usePagination';
import axios from 'axios';
import apiClient from '../../services/api/authService';
import toast from "@utils/toast";

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

  const { page, setPage } = usePagination({ resetDependencies: [searchTerm] });

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

  const handleAddSemester = async (semesterData: {
    code: string;
    name: string;
    startDate: string;
    endDate: string;
  }) => {
    try {
      await apiClient.post('/v1/semesters', semesterData);
      await fetchSemesters();
      toast.success('Thêm học kỳ thành công');
    } catch (error) {
      throw error;
    }
  };

  const handleUpdateSemester = async (semesterData: {
    code: string;
    name: string;
    startDate: string;
    endDate: string;
  }) => {
    try {
      await apiClient.put(`/v1/semesters/${semesterData.code}`, semesterData);
      await fetchSemesters();
      toast.success('Cập nhật học kỳ thành công');
    } catch (error) {
      throw error;
    }
  };

  const handleEditClick = (semester: Semester) => {
    setSelectedSemester(semester);
    setIsUpdateModalOpen(true);
  };

  const handleDeleteClick = (semester: Semester) => {
    setSelectedSemester(semester);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSemester = async () => {
    if (!selectedSemester) return;
    try {
      await apiClient.delete(`/v1/semesters/${selectedSemester.code}`);
      await fetchSemesters();
      toast.success('Xóa học kỳ thành công');
    } catch (error) {
      console.error('Error deleting semester:', error);
      throw error;
    }
  };

  const filteredSemesters = Array.isArray(semesters) ? semesters.filter(semester =>
    semester.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    semester.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    semester.startDate.includes(searchTerm)
  ) : [];

  const itemsPerPage = 10;
  const startIndex = page * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSemesters = filteredSemesters.slice(startIndex, endIndex);

  const upcomingCount = Array.isArray(semesters) ? semesters.filter(s => s.status === 'upcoming').length : 0;
  const activeCount = Array.isArray(semesters) ? semesters.filter(s => s.status === 'active').length : 0;
  const endedCount = Array.isArray(semesters) ? semesters.filter(s => s.status === 'ended').length : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-bold border border-orange-200 text-orange-700">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            Sắp diễn ra
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[10px] font-bold border border-green-200 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Đang diễn ra
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-[10px] font-bold border border-gray-200 text-gray-600">
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

  return (
    <AcademicStaffLayout pageTitle="Quản lý danh sách học kỳ">
      <div className="space-y-6 pb-8">

        {/* Header & Filter Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-8 shadow-sm animate-in fade-in duration-500">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Quản lý Học kỳ</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 font-medium">Quản lý danh sách học kỳ và cấu hình thời gian đào tạo</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex h-[52px] items-center gap-2 rounded-2xl bg-fpt-orange px-8 text-sm font-bold text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-fpt-orange/20 transition-all whitespace-nowrap active:scale-95"
            >
              <Plus className="h-[20px] w-[20px]" strokeWidth={3} />
              Thêm học kỳ mới
            </button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="flex-1 md:max-w-[320px]">
              <label className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5 ml-1 block">Tìm kiếm</label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-fpt-orange transition-colors" />
                <input
                  type="text"
                  placeholder="Tìm theo tên học kỳ, mã..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                  className="w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 text-gray-900 dark:text-white shadow-sm"
                />
              </div>
            </div>

            <div className="text-xs font-bold flex gap-6 text-gray-500 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>Đang diễn ra: <span className="text-gray-900 dark:text-white">{activeCount}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span>Sắp tới: <span className="text-gray-900 dark:text-white">{upcomingCount}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                <span>Đã kết thúc: <span className="text-gray-900 dark:text-white">{endedCount}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl overflow-hidden animate-in fade-in duration-700">

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-fpt-orange text-white">
                  <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest rounded-tl-2xl">Mã học kỳ</th>
                  <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest">Tên học kỳ</th>
                  <th className="px-6 py-5 text-center text-[11px] font-black uppercase tracking-widest">Ngày bắt đầu</th>
                  <th className="px-6 py-5 text-center text-[11px] font-black uppercase tracking-widest">Ngày kết thúc</th>
                  <th className="px-6 py-5 text-center text-[11px] font-black uppercase tracking-widest">Trạng thái</th>
                  <th className="px-6 py-5 text-center text-[11px] font-black uppercase tracking-widest rounded-tr-2xl">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                {loading && semesters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-fpt-orange mx-auto mb-3" />
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Đang tải dữ liệu...</p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <p className="text-sm font-bold text-red-500 uppercase tracking-widest">{error}</p>
                    </td>
                  </tr>
                ) : paginatedSemesters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Không có dữ liệu học kỳ</p>
                    </td>
                  </tr>
                ) : (
                  paginatedSemesters.map((semester) => (
                    <tr
                      key={semester.code}
                      className="group hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-all"
                    >
                      <td className="px-6 py-5">
                        <div className="font-black text-gray-900 dark:text-white text-sm group-hover:text-fpt-orange transition-colors uppercase tracking-tight">{semester.code}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-medium text-gray-700 dark:text-zinc-300">{semester.name}</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="text-sm font-medium text-gray-600 dark:text-zinc-400 px-3 py-1 rounded-lg inline-block">{formatDate(semester.startDate)}</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="text-sm font-medium text-gray-600 dark:text-zinc-400 px-3 py-1 rounded-lg inline-block">{formatDate(semester.endDate)}</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {getStatusBadge(semester.status)}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/academic-staff/semesters/${semester.code}/config`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all active:scale-90"
                            title="Cấu hình"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          {semester.status !== 'active' && (
                            <button
                              onClick={() => handleEditClick(semester)}
                              className="p-2 text-fpt-orange hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all active:scale-90"
                              title="Chỉnh sửa"
                            >
                              <Pen className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(semester)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-90"
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

          <div className="px-8 py-8 border-t border-gray-50 dark:border-zinc-800/50 bg-gray-50/30">
            <Pagination
              page={page}
              totalElements={filteredSemesters.length}
              pageSize={itemsPerPage}
              onPageChange={setPage}
              itemLabel="học kỳ"
            />
          </div>
        </div>
      </div>

      <AddSemesterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddSemester}
        existingSemesters={semesters}
      />

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
    </AcademicStaffLayout>
  );
};

