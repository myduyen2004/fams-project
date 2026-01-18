import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Pen, Plus, Search, Trash2 } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { AddSemesterModal } from '../../components/academic-staff/AddSemesterModal';
import { UpdateSemesterModal } from '../../components/academic-staff/UpdateSemesterModal';
import { DeleteSemesterModal } from '../../components/academic-staff/DeleteSemesterModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import axios from 'axios';

interface Semester {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'ended';
}

export const SemestersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>([]);

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
      console.log('Fetching semesters...');
      const response = await axios.get('/api/v1/semesters/active');
      console.log('API Response:', response.data);
      // Ensure response.data is an array
      const data = Array.isArray(response.data) ? response.data : [];
      console.log('Semesters data:', data);
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
      setSemesters([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  // Handle add semester
  const handleAddSemester = async (semesterData: {
    code: string;
    name: string;
    startDate: string;
    endDate: string;
  }) => {
    try {
      await axios.post('/api/v1/semesters', semesterData);
      // Refresh list after adding
      await fetchSemesters();
    } catch (error) {
      throw error; // Let modal handle error display
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
      await axios.put(`/api/v1/semesters/${semesterData.code}`, semesterData);
      // Refresh list after updating
      await fetchSemesters();
    } catch (error) {
      throw error; // Let modal handle error display
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
      await axios.delete(`/api/v1/semesters/${selectedSemester.code}`);
      // Refresh list after deleting
      await fetchSemesters();
    } catch (error) {
      console.error('Error deleting semester:', error);
      throw error;
    }
  };

  // Safe filter operations - ensure semesters is always an array
  const upcomingCount = Array.isArray(semesters) ? semesters.filter(s => s.status === 'upcoming').length : 0;
  const activeCount = Array.isArray(semesters) ? semesters.filter(s => s.status === 'active').length : 0;
  const endedCount = Array.isArray(semesters) ? semesters.filter(s => s.status === 'ended').length : 0;

  const filteredSemesters = Array.isArray(semesters) ? semesters.filter(semester =>
    semester.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    semester.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    semester.startDate.includes(searchTerm)
  ) : [];

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredSemesters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSemesters = filteredSemesters.slice(startIndex, endIndex);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-orange-50 text-orange-600';
      case 'active':
        return 'bg-green-50 text-green-600';
      case 'ended':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'Sắp diễn ra';
      case 'active':
        return 'Đang diễn ra';
      case 'ended':
        return 'Đã kết thúc';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <AcademicStaffLayout pageTitle="Quản lý danh sách học kỳ">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Đang tải dữ liệu...</div>
        </div>
      </AcademicStaffLayout>
    );
  }

  if (error) {
    return (
      <AcademicStaffLayout pageTitle="Quản lý danh sách học kỳ">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </AcademicStaffLayout>
    );
  }

  return (
    <AcademicStaffLayout pageTitle="Quản lý danh sách học kỳ">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col gap-4">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Quản lý danh sách học kỳ</h1>
              <p className="text-sm text-gray-500 mt-1">Xem và quản lý các học kỳ trong hệ thống đào tạo</p>
            </div>

            {/* Filters and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
              <div className="flex items-center gap-8 flex-wrap">
                <span className="font-semibold text-gray-700 text-sm">FPTU - Đà Nẵng</span>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên học kỳ, năm..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full w-80 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 flex-wrap">
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

                {/* Add Button */}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-md font-medium text-xs flex items-center gap-2 transition shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Thêm học kỳ mới
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0" >
          {/* Bulk Delete Button */}
          {selectedSemesters.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-end gap-3">
              <span className="text-sm text-gray-500">Đã chọn {selectedSemesters.length} học kỳ</span>
              <button
                onClick={() => {
                  // Filter only upcoming semesters for bulk delete
                  const upcomingSemesters = semesters.filter(
                    s => selectedSemesters.includes(s.code) && s.status === 'upcoming'
                  );

                  if (upcomingSemesters.length === 0) {
                    setBulkDeleteConfig({
                      title: 'Không thể xóa',
                      message: 'Chỉ được xóa học kỳ có trạng thái "Sắp diễn ra"',
                      type: 'warning',
                      showConfirmButton: false
                    });
                    setIsBulkDeleteModalOpen(true);
                    return;
                  }

                  const handleBulkDelete = async () => {
                    try {
                      const deletePromises = upcomingSemesters.map(s =>
                        axios.delete(`/api/v1/semesters/${s.code}`)
                      );
                      await Promise.all(deletePromises);
                      // Refresh list after deleting
                      await fetchSemesters();
                      setSelectedSemesters([]);
                    } catch (error) {
                      console.error('Error bulk deleting semesters:', error);
                    } finally {
                      setIsBulkDeleteModalOpen(false);
                    }
                  };

                  if (upcomingSemesters.length < selectedSemesters.length) {
                    setBulkDeleteConfig({
                      title: 'Xác nhận xóa',
                      message: `Chỉ có ${upcomingSemesters.length}/${selectedSemesters.length} học kỳ có thể xóa (trạng thái "Sắp diễn ra"). Bạn có muốn tiếp tục?`,
                      type: 'warning',
                      action: handleBulkDelete,
                      showConfirmButton: true
                    });
                  } else {
                    setBulkDeleteConfig({
                      title: 'Xác nhận xóa',
                      message: `Bạn có chắc chắn muốn xóa ${upcomingSemesters.length} học kỳ đã chọn?`,
                      type: 'danger',
                      action: handleBulkDelete,
                      showConfirmButton: true
                    });
                  }
                  setIsBulkDeleteModalOpen(true);
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium text-xs flex items-center gap-2 transition shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                Xóa ({selectedSemesters.length})
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs text-white bg-orange-500 font-semibold tracking-wide">
                  <th className="py-4 pl-4 w-[5%]">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-2 border-white bg-white/20 checked:bg-white cursor-pointer accent-orange-500"
                      checked={selectedSemesters.length === paginatedSemesters.length && paginatedSemesters.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSemesters(paginatedSemesters.map(s => s.code));
                        } else {
                          setSelectedSemesters([]);
                        }
                      }}
                    />
                  </th>
                  <th className="py-4 w-[15%]">Mã học kỳ</th>
                  <th className="py-4 w-[20%]">Tên học kỳ</th>
                  <th className="py-4 w-[15%]">Ngày bắt đầu</th>
                  <th className="py-4 w-[15%]">Ngày kết thúc</th>
                  <th className="py-4 w-[15%]">Trạng thái</th>
                  <th className="py-4 w-[15%] text-left pr-2">Thao tác</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {paginatedSemesters.length > 0 ? (
                  paginatedSemesters.map((semester) => (
                    <tr
                      key={semester.code}
                      className="hover:bg-gray-50 transition border-b border-gray-50 group"
                    >
                      <td className="py-4 pl-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-2 border-gray-300 cursor-pointer accent-orange-500"
                          checked={selectedSemesters.includes(semester.code)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSemesters([...selectedSemesters, semester.code]);
                            } else {
                              setSelectedSemesters(selectedSemesters.filter(code => code !== semester.code));
                            }
                          }}
                        />
                      </td>
                      <td className="py-4 font-medium text-gray-800">{semester.code}</td>
                      <td className="py-4 font-bold text-gray-800">{semester.name}</td>
                      <td className="py-4">{formatDate(semester.startDate)}</td>
                      <td className="py-4">{formatDate(semester.endDate)}</td>
                      <td className="py-4">
                        <span
                          className={`${getStatusStyles(
                            semester.status
                          )} px-3 py-1.5 rounded text-xs font-bold`}
                        >
                          {getStatusLabel(semester.status)}
                        </span>
                      </td>
                      <td className="py-4 text-left pr-2 text-gray-300">
                        <button
                          onClick={() => navigate(`/academic-staff/semesters/${semester.code}/config`)}
                          className="hover:text-blue-500 mr-3 transition inline-flex"
                          title="Cấu hình kỳ học"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(semester)}
                          className="hover:text-orange-500 mr-3 transition inline-flex"
                        >
                          <Pen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(semester)}
                          className="hover:text-red-500 transition inline-flex"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      Không tìm thấy học kỳ nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredSemesters.length > 0 && (
            <div className="flex justify-between items-center mt-4 px-4 pb-4 text-xs text-gray-500">
              <div>
                Hiển thị {startIndex + 1} đến {Math.min(endIndex, filteredSemesters.length)} trong số{' '}
                <strong>{filteredSemesters.length}</strong> học kỳ
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 hover:text-orange-500 transition disabled:text-gray-300"
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded font-medium transition ${currentPage === page
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'hover:bg-gray-50 text-gray-600'
                      }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2 py-1 hover:text-orange-500 transition disabled:text-gray-300"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
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
          // The modal will be closed inside the action or here if no action
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
