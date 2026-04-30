import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { Pagination } from '../../components/academic-staff/Pagination';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { authService } from '../../services/api/authService';
import {
  notificationService,
  AdminNotification
} from '../../services/api/notificationService';
import { NotificationStatus, TargetType } from '../../types/notification';
import toast from "@utils/toast";
import { ConfirmModal } from '../../components/common/ConfirmModal';
import {
  NotificationFilters,
  NotificationBulkActions,
  NotificationTableRow
} from '../../components/admin/notifications';
import { usePagination } from '../../hooks/usePagination';

export const NotificationManagementPage = () => {
  const location = useLocation();
  const [userRole, setUserRole] = useState<string>('');
  const isLecturerGranted = location.pathname.startsWith('/lecturer/granted');

  // Determine base path based on user role and current path
  const basePath = useMemo(() => {
    if (isLecturerGranted) return '/lecturer/granted';
    return userRole === 'ACADEMIC_STAFF' ? '/academic-staff' : '/admin';
  }, [userRole, isLecturerGranted]);

  // Get user role on mount
  useEffect(() => {
    const user = authService.getUser();
    if (user) {
      setUserRole(user.role);
    }
  }, []);

  // Data states
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);

  // Filter states
  const [search, setSearch] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const pageSize = 10;

  // Use custom pagination hook - auto resets to page 0 when filters change
  const { page, setPage } = usePagination({
    resetDependencies: [search, targetTypeFilter, statusFilter]
  });

  // Selection states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Action states

  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);

      // Call real API
      const response = await notificationService.getNotifications({
        search: search || undefined,
        targetType: targetTypeFilter !== 'ALL' ? (targetTypeFilter as TargetType) : undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as NotificationStatus) : undefined,
        page,
        size: pageSize
      });

      console.log('API Response:', response);
      console.log('Raw response data:', JSON.stringify(response, null, 2));

      // Handle both Page response format and direct array
      if (Array.isArray(response)) {
        // If response is directly an array (old format)
        console.log('Setting notifications from array format');
        setNotifications(response);
        setTotalElements(response.length);
      } else if (response && response.content) {
        // Spring Data Page format
        console.log('Setting notifications from Page format, content:', response.content);
        setNotifications(response.content);
        setTotalElements(response.totalElements);
      } else {
        console.warn('Unexpected response format:', response);
        setNotifications([]);
        setTotalElements(0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      const err = error as AxiosError;
      if (err?.response?.status === 401) {
        toast.error('Bạn cần đăng nhập để xem danh sách thông báo');
      } else if (err?.response?.status === 403) {
        toast.error('Tài khoản không có quyền Admin để xem danh sách');
      } else {
        toast.error('Không thể tải danh sách thông báo');
      }
      setNotifications([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [search, targetTypeFilter, statusFilter, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Note: Page reset is now handled by usePagination hook
  useEffect(() => {
    setSelectedIds([]);
  }, [search, targetTypeFilter, statusFilter]);

  // Handlers
  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(notifications.map(n => n.id));
    } else {
      setSelectedIds([]);
    }
  }, [notifications]);

  const handleSelect = useCallback((id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  }, []);


  const handleDelete = useCallback(async () => {
    try {
      setIsDeleting(true);
      await notificationService.bulkDeleteNotifications(selectedIds);
      toast.success('Đã xóa thông báo thành công');
      setSelectedIds([]);
      setIsDeleteConfirmOpen(false);
      fetchNotifications();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra khi xóa thông báo';
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, fetchNotifications]);

  // Check if any selected notification has SENT status
  const hasSentNotification = selectedIds.some(id => {
    const notification = notifications.find(n => n.id === id);
    return notification && notification.status === NotificationStatus.SENT;
  });

  const Layout = (userRole === 'ACADEMIC_STAFF' || isLecturerGranted) ? AcademicStaffLayout : AdminLayout;

  return (
    <Layout pageTitle="Quản lý thông báo">
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">

        {/* Filters */}
        <NotificationFilters
          search={search}
          onSearchChange={setSearch}
          targetTypeFilter={targetTypeFilter}
          onTargetTypeFilterChange={setTargetTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Bulk Actions */}
        <NotificationBulkActions
          selectedCount={selectedIds.length}
          onDelete={() => setIsDeleteConfirmOpen(true)}
          isDeleting={isDeleting}
          canDelete={!hasSentNotification}
          hasSentNotification={hasSentNotification}
        />

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
                    checked={notifications.length > 0 && selectedIds.length === notifications.length}
                  />
                </th>
                <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">STT</th>
                <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Tiêu đề thông báo</th>
                <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Đối tượng</th>
                <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Ngày gửi</th>
                <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Trạng thái</th>
                <th className="px-4 py-5 text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap rounded-tr-lg">Hành động</th>
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
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">
                    Không có thông báo nào
                  </td>
                </tr>
              ) : (
                notifications.map((notification, index) => (
                  <NotificationTableRow
                    key={notification.id}
                    notification={notification}
                    index={page * pageSize + index}
                    isSelected={selectedIds.includes(notification.id)}
                    onSelect={handleSelect}
                    basePath={basePath}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          itemLabel="thông báo"
        />
      </div>


      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa ${selectedIds.length} thông báo đã chọn? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        type="danger"
      />
    </Layout>
  );
};


