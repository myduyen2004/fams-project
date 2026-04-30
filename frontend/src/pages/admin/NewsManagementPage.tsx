import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2, Pencil, Search, Newspaper } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { authService } from '../../services/api/authService';
import { newsService } from '../../services/api/newsService';
import { NewsItem } from '../../types/news';
import { Pagination } from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import toast from "@utils/toast";
import { CustomSelect } from '../../components/common/CustomSelect';

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
      <div className="space-y-6 pb-8">

        {/* Header & Filter Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-8 shadow-sm animate-in fade-in duration-500">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Quản lý Tin Tức</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 font-medium">Đăng tải và quản lý thông báo, tin tức cho sinh viên và giảng viên</p>
            </div>
            <button
              onClick={() => navigate(`${basePath}/news/create`)}
              className="flex h-[52px] items-center gap-2 rounded-2xl bg-fpt-orange px-8 text-sm font-bold text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-fpt-orange/20 transition-all whitespace-nowrap active:scale-95"
            >
              <Plus className="h-[20px] w-[20px]" strokeWidth={3} />
              Tạo tin tức mới
            </button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="flex-1 md:max-w-[320px]">
              <label className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5 ml-1 block">Tìm kiếm</label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-fpt-orange transition-colors" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tin tức..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 text-gray-900 dark:text-white shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="w-48">
                <label className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5 ml-1 block">Đối tượng</label>
                <CustomSelect
                  value={targetFilter}
                  onChange={(value) => setTargetFilter(value)}
                  options={[
                    { value: 'ALL', label: 'Tất cả đối tượng' },
                    { value: 'STUDENT', label: 'Sinh viên' },
                    { value: 'LECTURER', label: 'Giảng viên' },
                    { value: 'USER', label: 'Cá nhân' }
                  ]}
                />
              </div>

              <div className="w-48">
                <label className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5 ml-1 block">Trạng thái</label>
                <CustomSelect
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value)}
                  options={[
                    { value: 'ALL', label: 'Tất cả trạng thái' },
                    { value: 'DRAFT', label: 'Bản nháp' },
                    { value: 'SCHEDULED', label: 'Đã lên lịch' },
                    { value: 'SENT', label: 'Đã xuất bản' }
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl overflow-hidden animate-in fade-in duration-700">
          <div className="p-8 border-b border-gray-50 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                  <Newspaper className="h-5 w-5 text-fpt-orange" />
                </div>
                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">DANH SÁCH BẢN TIN</h2>
              </div>

              <div className="flex items-center gap-2">
                {selectedIds.length === 1 && (
                  <button
                    onClick={() => navigate(`${basePath}/news/edit/${selectedIds[0]}`)}
                    className="h-[44px] px-5 rounded-2xl bg-blue-50 text-blue-600 text-sm font-bold hover:bg-blue-100 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Pencil size={16} /> Chỉnh sửa
                  </button>
                )}
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleBulkDeleteSelect}
                    className="h-[44px] px-5 rounded-2xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Xóa {selectedIds.length} mục
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-fpt-orange text-white">
                  <th className="px-6 py-5 w-16 text-center rounded-tl-2xl">
                    <input
                      type="checkbox"
                      checked={news.length > 0 && selectedIds.length === news.length}
                      onChange={handleSelectAll}
                      className="w-5 h-5 rounded-lg border-white/30 bg-transparent text-white focus:ring-0 cursor-pointer accent-white transition-all"
                    />
                  </th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Tiêu đề</th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Danh mục</th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Đối tượng</th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Trạng thái</th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap rounded-tr-2xl">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-fpt-orange mx-auto mb-3" />
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Đang tải dữ liệu...</p>
                    </td>
                  </tr>
                ) : news.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Không tìm thấy tin tức nào</p>
                    </td>
                  </tr>
                ) : (
                  news.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`${basePath}/news/${item.id}`)}
                      className={`group hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-all cursor-pointer border-l-4 border-transparent ${selectedIds.includes(item.id) ? 'bg-orange-50/50 dark:bg-orange-900/10 border-l-fpt-orange' : 'hover:border-l-fpt-orange/30'}`}
                    >
                      <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelect(item.id)}
                          className="w-5 h-5 rounded-lg border-gray-300 text-fpt-orange focus:ring-fpt-orange dark:border-zinc-700 cursor-pointer accent-fpt-orange transition-all"
                        />
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-black text-gray-900 dark:text-white text-sm group-hover:text-fpt-orange transition-colors max-w-md truncate">
                          {item.title}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${item.type === 'FEATURED' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          item.type === 'IMPORTANT' ? 'bg-red-50 text-red-700 border-red-100' :
                            item.type === 'EVENT' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              'bg-gray-50 text-gray-700 border-gray-100'
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
                      <td className="px-6 py-5 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                        {item.targetType === 'ALL' ? 'Toàn trường' :
                          item.targetType === 'STUDENT' ? 'Sinh viên' :
                            item.targetType === 'LECTURER' ? 'Giảng viên' :
                              item.targetType === 'CLASS' ? 'Theo lớp' :
                                item.targetType === 'COURSE' ? 'Theo môn học' :
                                  item.targetType === 'ACADEMIC_STAFF' ? 'Đào tạo' :
                                    item.targetType === 'ADMIN' ? 'Quản trị' : 'Cá nhân'}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold border ${item.status === 'SENT' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400' :
                          item.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400' :
                            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'SENT' ? 'bg-green-500' : item.status === 'SCHEDULED' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                          {item.status === 'SENT' ? 'Đã xuất bản' : item.status === 'SCHEDULED' ? 'Đã lên lịch' : 'Bản nháp'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-xs font-bold text-gray-500 dark:text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-8 border-t border-gray-50 dark:border-zinc-800/50 bg-gray-50/30">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(totalElements / 10)}
              totalElements={totalElements}
              pageSize={10}
              onPageChange={setPage}
            />
          </div>
        </div>
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


