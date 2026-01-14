import { useState, useEffect, useCallback } from 'react';
import type { AxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  notificationService,
  AdminNotification
} from '../../services/api/notificationService';
import { NotificationStatus, TargetType } from '../../types/notification';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import {
  NotificationFilters,
  NotificationBulkActions,
  NotificationTableRow,
  ViewNotificationModal,
  NotificationFormModal
} from '../../components/admin/notifications';

export const NotificationManagementPage = () => {
  // Data states
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Selection states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Action states
  const [isPublishing, setIsPublishing] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
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
      
      // Handle both Page response format and direct array
      if (Array.isArray(response)) {
        // If response is directly an array (old format)
        setNotifications(response);
        setTotalElements(response.length);
      } else if (response && response.content) {
        // Spring Data Page format
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

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
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

  const handleView = useCallback((notification: AdminNotification) => {
    setSelectedNotification(notification);
    setIsViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((notification: AdminNotification) => {
    setSelectedNotification(notification);
    setIsEditModalOpen(true);
  }, []);

  const handleEditFromBulk = useCallback(() => {
    const notification = notifications.find(n => n.id === selectedIds[0]);
    if (notification) {
      if (notification.status === NotificationStatus.SENT) {
        toast.error('Không thể chỉnh sửa thông báo đã gửi');
        return;
      }
      handleEdit(notification);
    }
  }, [notifications, selectedIds, handleEdit]);

  const handlePublish = useCallback(async () => {
    try {
      setIsPublishing(true);
      await notificationService.publishNotifications(selectedIds);
      toast.success('Đã mở thông báo thành công');
      setSelectedIds([]);
      fetchNotifications();
    } catch {
      toast.error('Có lỗi xảy ra khi mở thông báo');
    } finally {
      setIsPublishing(false);
    }
  }, [selectedIds, fetchNotifications]);

  const handleHide = useCallback(async () => {
    try {
      setIsHiding(true);
      await notificationService.hideNotifications(selectedIds);
      toast.success('Đã ẩn thông báo thành công');
      setSelectedIds([]);
      fetchNotifications();
    } catch {
      toast.error('Có lỗi xảy ra khi ẩn thông báo');
    } finally {
      setIsHiding(false);
    }
  }, [selectedIds, fetchNotifications]);

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

  const handleModalSuccess = useCallback(() => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedNotification(null);
    setSelectedIds([]);
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <AdminLayout pageTitle="Quản lý thông báo">
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
          onPublish={handlePublish}
          onHide={handleHide}
          onDelete={() => setIsDeleteConfirmOpen(true)}
          isPublishing={isPublishing}
          isHiding={isHiding}
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">STT</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tiêu đề thông báo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Đối tượng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Ngày gửi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Hành động</th>
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
                    onView={handleView}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(totalElements / pageSize)}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <NotificationFormModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {isEditModalOpen && selectedNotification && (
        <NotificationFormModal
          notification={selectedNotification}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedNotification(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {isViewModalOpen && selectedNotification && (
        <ViewNotificationModal
          notification={selectedNotification}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedNotification(null);
          }}
        />
      )}

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
    </AdminLayout>
  );
};
