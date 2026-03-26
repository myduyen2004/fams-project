import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, Pencil, Search } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { authService } from '../../services/api/authService';
import { newsService } from '../../services/api/newsService';
import { NewsItem } from '../../types/news';
import { Pagination } from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import toast from 'react-hot-toast';

export const NewsManagementPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [userRole, setUserRole] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [targetFilter, setTargetFilter] = useState('ALL');
  const [totalElements, setTotalElements] = useState(0);

  const { page, setPage } = usePagination({ resetDependencies: [debouncedSearch, statusFilter, targetFilter] });

  const basePath = useMemo(() => userRole === 'ACADEMIC_STAFF' ? '/academic-staff' : '/admin', [userRole]);

  useEffect(() => {
    const user = authService.getUser();
    setUserRole(user?.role || '');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, statusFilter, targetFilter, setPage]);

  const loadNews = useCallback(async () => {
    try {
      setLoading(true);
      const data = await newsService.getAdminNews({
        page,
        size: 10,
        search: debouncedSearch,
        status: statusFilter === 'ALL' ? undefined : (statusFilter as any),
        targetType: targetFilter === 'ALL' ? undefined : (targetFilter as any)
      });
      setNews(data.content || []);
      setTotalElements(data.totalElements || 0);
    } catch {
      toast.error('Không thể tải danh sách tin tức');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, targetFilter]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const handleBulkDeleteSelect = () => {
    if (selectedIds.length === 0) return;
    setIsDeleteModalOpen(true);
  };

  const executeBulkDelete = async () => {
    try {
      await newsService.bulkDeleteNews(selectedIds);
      setSelectedIds([]);
      toast.success('Đã xóa các tin tức đã chọn');
      setIsDeleteModalOpen(false);
      loadNews();
    } catch {
      toast.error('Không thể xóa nhiều tin tức');
      setIsDeleteModalOpen(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(news.map(n => n.id));
    else setSelectedIds([]);
  };

  const handleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  };

  const Layout = userRole === 'ACADEMIC_STAFF' ? AcademicStaffLayout : AdminLayout;

  return (
    <Layout pageTitle="Quản lý tin tức">
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="Tìm kiếm tin tức..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-fpt-orange/20 transition-all text-sm outline-none text-gray-900 dark:text-gray-100"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            </div>

            {/* Target Filter */}
            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 text-sm outline-none text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">Tất cả đối tượng</option>
              <option value="STUDENT">Sinh viên</option>
              <option value="LECTURER">Giảng viên</option>
              <option value="USER">Cá nhân</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 text-sm outline-none text-gray-900 dark:text-gray-100"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="SCHEDULED">Đã lên lịch</option>
              <option value="SENT">Đã xuất bản</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length === 1 && (
              <button
                onClick={() => navigate(`${basePath}/news/edit/${selectedIds[0]}`)}
                className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors flex items-center text-sm"
              >
                <Pencil size={16} className="mr-2" /> Chỉnh sửa
              </button>
            )}
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDeleteSelect}
                className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center text-sm"
              >
                <Trash2 size={16} className="mr-2" /> Xóa ({selectedIds.length})
              </button>
             )}
            <button
              onClick={() => navigate(`${basePath}/news/create`)}
              className="px-4 py-2 rounded-xl bg-fpt-orange hover:bg-[#e06912] text-white font-medium shadow-sm shadow-orange-500/20 transition-colors flex items-center text-sm"
            >
              <Plus size={16} className="mr-2" /> Tạo tin tức mới
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-zinc-800">
          <table className="w-full">
            <thead>
              <tr className="bg-fpt-orange text-white">
                <th className="px-4 py-3 text-left w-12 rounded-tl-lg">
                  <input
                    type="checkbox"
                    checked={news.length > 0 && selectedIds.length === news.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-white/20 text-white focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tiêu đề</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Danh mục</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Đối tượng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : news.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">
                    Không tìm thấy tin tức nào.
                  </td>
                </tr>
              ) : (
                news.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => navigate(`${basePath}/news/${item.id}`)}
                    className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelect(item.id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-fpt-orange focus:ring-fpt-orange"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 max-w-md truncate">
                      {item.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.type === 'FEATURED' ? 'bg-orange-100 text-orange-700' :
                        item.type === 'IMPORTANT' ? 'bg-red-100 text-red-700' :
                        item.type === 'EVENT' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.type === 'FEATURED' ? 'Sự kiện nổi bật' :
                         item.type === 'IMPORTANT' ? 'Quan trọng' :
                         item.type === 'EVENT' ? 'Sự kiện' :
                         item.type === 'ACADEMIC' ? 'Học tập' :
                         item.type === 'SYSTEM' ? 'Hệ thống' :
                         item.type === 'ATTENDANCE' ? 'Điểm danh' :
                         item.type === 'GRADE' ? 'Điểm số' :
                         item.type === 'CHAT' ? 'Tin nhắn' :
                         item.type === 'SCHEDULE' ? 'Lịch trình' : 'Khác'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {item.targetType === 'ALL' ? 'Toàn trường' : 
                       item.targetType === 'STUDENT' ? 'Sinh viên' : 
                       item.targetType === 'LECTURER' ? 'Giảng viên' : 'Cá nhân'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex flex-shrink-0 items-center px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        item.status === 'SENT'
                          ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' 
                          : item.status === 'SCHEDULED'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}>
                        {item.status === 'SENT' ? 'Đã xuất bản' 
                         : item.status === 'SCHEDULED' ? 'Đã lên lịch' 
                         : 'Bản nháp'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalElements > 0 && (
          <div className="mt-4 flex justify-end">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(totalElements / 10)}
              totalElements={totalElements}
              pageSize={10}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeBulkDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa ${selectedIds.length} bản tin đã chọn không? Hành động này không thể hoàn tác.`}
        confirmLabel="Khóa và Xóa"
        cancelLabel="Hủy"
        type="danger"
      />
    </Layout>
  );
};

export default NewsManagementPage;
