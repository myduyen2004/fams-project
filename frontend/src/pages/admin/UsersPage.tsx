import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { userService, UserResponse } from '../../services/api/userService';
import toast from 'react-hot-toast';
import { UserTableRow } from '../../components/admin/users/UserTableRow';
import { UserFilters } from '../../components/admin/users/UserFilters';
import { BulkActions } from '../../components/admin/users/BulkActions';
import { AddUserModal, EditUserModal, ViewUserModal, ImportUserModal } from '../../components/admin/users/UserModals';
import { useWebSocket } from '../../hooks/useWebSocket';
import { authService } from '../../services/api/authService';
import { usePagination } from '../../hooks/usePagination';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const UsersPage = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [totalElements, setTotalElements] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  // Use custom pagination hook - auto resets to page 0 when filters change
  const { page, setPage } = usePagination({ resetDependencies: [debouncedSearch, roleFilter] });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedUserData, setSelectedUserData] = useState<UserResponse | null>(null);

  // Action states
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationProgress, setActivationProgress] = useState<{
    status: string;
    current: number;
    total: number;
    message: string;
    percentage: number;
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // WebSocket for real-time updates during import

  useWebSocket(`/topic/import-progress/${authService.getUser()?.username}`, (data) => {
    console.log('Received WebSocket message:', data);
    if (data.newUsers && data.newUsers.length > 0) {
      console.log('Users update received:', data.newUsers.length);

      setUsers(prev => {
        const next = [...prev];
        let hasChanges = false;

        data.newUsers.forEach((updatedUser: UserResponse) => {
          const index = next.findIndex(u => u.id === updatedUser.id);
          
          // Ensure roleName exists so the table column isn't shockingly blank right after import
          if (!updatedUser.roleName && updatedUser.role) {
            const roleMap: Record<string, string> = {
              'ADMIN': 'Quản trị viên',
              'ACADEMIC_STAFF': 'Phòng đào tạo',
              'LECTURER': 'Giảng viên',
              'STUDENT': 'Sinh viên'
            };
            updatedUser.roleName = roleMap[updatedUser.role] || updatedUser.role;
          }

          if (index !== -1) {
            // Update existing user (e.g. background avatar upload)
            next[index] = { ...next[index], ...updatedUser };
            hasChanges = true;
          } else {
            // Prepend new user only if it matches current filter
            if (roleFilter === 'all' || updatedUser.role === roleFilter) {
              next.unshift(updatedUser);
              setTotalElements(total => total + 1);
              hasChanges = true;
            }
          }
        });

        return hasChanges ? next : prev;
      });
    }

    // Definitive Fix: Refresh the whole list when the job is fully completed
    // This catches any final avatar updates and ensures cache consistency.
    if (data.status === 'COMPLETED') {
      console.log('Import job COMPLETED - triggering silent refresh');
      setTimeout(() => {
        fetchUsers(true);
      }, 500); // Small delay to allow DB consistency
    }
  });

  useWebSocket(`/topic/activation-progress/${authService.getUser()?.username}`, (data) => {
    setActivationProgress(data);

    // 1. Process Batch Removals (Real-time Filter)
    if (data.activatedUserIds && data.activatedUserIds.length > 0) {
      const activatedSet = new Set(data.activatedUserIds.map(Number));
      
      setUsers(prev => prev.filter(u => !activatedSet.has(Number(u.id))));
      setTotalElements(prev => Math.max(0, prev - data.activatedUserIds.length));
    }

    // 2. Handle Completion (Cleanup & Resync)
    if (data.status === 'COMPLETED') {
        setIsActivating(false);
        // Force list to empty if this was a total activation
        if (data.current === data.total && data.total > 0) {
            setUsers([]);
            setTotalElements(0);
        }
        
        // Final sync with database (silent) to ensure UI is perfectly clean
        setTimeout(() => fetchUsers(true), 1000);

        setTimeout(() => {
            setActivationProgress(null);
        }, 5000);
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const data = await userService.getAllUsers({
        status: 'INACTIVE',
        role: roleFilter === 'all' ? undefined : roleFilter,
        search: debouncedSearch,
        page,
        size: 20,
        sort: 'id,desc'
      });
      setUsers(data.content);
      setTotalElements(data.totalElements);
    } catch (error) {
      if (!isSilent) toast.error('Không thể tải danh sách tài khoản');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [roleFilter, debouncedSearch, page]);

  useEffect(() => {
    fetchUsers();

    // Check for existing activation progress on mount (F5 resilience)
    const checkInitialProgress = async () => {
      try {
        const progress = await userService.getActivationProgress();
        if (progress && progress.status !== 'COMPLETED') {
          setActivationProgress(progress);
          setIsActivating(true);
        }
      } catch (e) {
        console.error('Failed to fetch initial activation progress');
      }
    };
    checkInitialProgress();
  }, [fetchUsers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, roleFilter]);

  // Handlers optimized with useCallback
  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  }, [users]);

  const handleSelectUser = useCallback((id: number) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  }, []);

  const handleBulkDelete = useCallback(async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa các tài khoản đã chọn?',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setIsDeleting(true);
          await Promise.all(selectedUsers.map(id => userService.deleteUser(id)));
          toast.success('Đã xóa thành công');
          setSelectedUsers([]);
          fetchUsers();
        } catch (error) {
          toast.error('Có lỗi xảy ra khi xóa');
        } finally {
          setIsDeleting(false);
        }
      }
    });
  }, [selectedUsers, fetchUsers]);

  const handleBulkActivate = useCallback(async () => {
    const usersToActivate = users.filter(u => selectedUsers.includes(u.id));
    const missingAvatars = usersToActivate.some(u => !u.avatar);

    if (missingAvatars) {
      toast.error('Một số tài khoản chưa có ảnh đại diện. Vui lòng cập nhật trước khi kích hoạt!');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Kích hoạt tài khoản',
      message: `Bạn có chắc chắn muốn kích hoạt ${selectedUsers.length} tài khoản này? Hệ thống sẽ gửi email thông báo thông tin đăng nhập cho người dùng.`,
      type: 'success',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setIsActivating(true);
          await userService.activateUsers(selectedUsers);
          toast.success('Đã kích hoạt thành công');
          setSelectedUsers([]);
          fetchUsers();
        } catch (error) {
          toast.error('Có lỗi xảy ra khi kích hoạt');
        } finally {
          setIsActivating(false);
        }
      }
    });
  }, [selectedUsers, users, fetchUsers]);

  const handleActivateAll = useCallback(async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Kích hoạt toàn bộ',
      message: 'Bạn có chắc chắn muốn kích hoạt TOÀN BỘ tài khoản chưa kích hoạt?\nHệ thống sẽ gửi email thông báo cho từng người dùng.',
      type: 'success',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setIsActivating(true);
          setActivationProgress({ status: 'STARTING', current: 0, total: 0, message: 'Đang khởi tạo...', percentage: 0 });
          await userService.activateAllUsers();
        } catch (error) {
          toast.error('Có lỗi xảy ra khi kích hoạt toàn bộ');
          setIsActivating(false);
          setActivationProgress(null);
        }
      }
    });
  }, []);

  const handleView = useCallback((user: UserResponse) => {
    setSelectedUserData(user);
    setIsViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((user: UserResponse) => {
    setSelectedUserData(user);
    setIsEditModalOpen(true);
  }, []);

  const handleModalSuccess = useCallback((isImport = false) => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsImportModalOpen(false);
    if (isImport === true) {
      // Delay fetching to allow DB sync while keeping the websocket data visible
      setTimeout(() => fetchUsers(true), 2500);
    } else {
      fetchUsers();
    }
  }, [fetchUsers]);

  // Memoized date formatter to avoid re-creating it
  const formatDateTime = useCallback((date: any) => {
    if (!date) return '---';

    try {
      let d: Date;
      if (Array.isArray(date)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = date;
        d = new Date(year, month - 1, day, hour, minute, second);
      } else if (typeof date === 'string') {
        // Safari fix: Replace space with 'T' to make it a valid ISO string
        d = new Date(date.replace(' ', 'T'));
      } else {
        d = new Date(date);
      }

      if (isNaN(d.getTime())) return '---';
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '---';
    }
  }, []);

  return (
    <AdminLayout pageTitle="Tài khoản chưa kích hoạt">
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">

        {activationProgress && (
          <div className="mb-6 p-5 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-2xl animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                <h4 className="text-sm font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
                  Tiến trình kích hoạt hệ thống
                  {activationProgress.status !== 'COMPLETED' && (
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  )}
                </h4>
                <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                  {activationProgress.message}
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-green-700 dark:text-green-300">
                  {activationProgress.percentage}%
                </span>
                <p className="text-[10px] font-bold text-green-600/60 dark:text-green-400/50 uppercase tracking-tighter">
                  {activationProgress.current} / {activationProgress.total} users
                </p>
              </div>
            </div>
            <div className="w-full bg-green-100 dark:bg-green-900/30 rounded-full h-3 overflow-hidden p-0.5 border border-green-200/30 dark:border-green-800/20">
              <div
                className="bg-green-500 h-full transition-all duration-150 ease-out rounded-full shadow-[0_0_12px_rgba(34,197,94,0.3)] relative overflow-hidden"
                style={{ width: `${activationProgress.percentage}%` }}
              >
                {activationProgress.percentage < 100 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                )}
              </div>
            </div>
          </div>
        )}

        <UserFilters
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          onImportClick={() => setIsImportModalOpen(true)}
          onAddClick={() => setIsAddModalOpen(true)}
          onActivateAllClick={handleActivateAll}
          showActivateAll={totalElements > 0}
        />

        <BulkActions
          selectedCount={selectedUsers.length}
          onDelete={handleBulkDelete}
          onActivate={handleBulkActivate}
          isDeleting={isDeleting}
          isActivating={isActivating}
        />

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-fpt-orange text-white">
                <th className="px-4 py-3 text-left rounded-tl-lg">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/20 text-white focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                    onChange={handleSelectAll}
                    checked={users.length > 0 && selectedUsers.length === users.length}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Họ và tên</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Mã số</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Ngày sinh</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">Không có tài khoản nào chờ kích hoạt</td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    isSelected={selectedUsers.includes(user.id)}
                    onSelect={handleSelectUser}
                    onView={handleView}
                    formatDateTime={formatDateTime}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(totalElements / 20)}
          totalElements={totalElements}
          pageSize={20}
          onPageChange={setPage}
        />
      </div>

      {/* Modals */}
      {isAddModalOpen && <AddUserModal onClose={() => setIsAddModalOpen(false)} onSuccess={() => handleModalSuccess(false)} />}
      {isEditModalOpen && selectedUserData && <EditUserModal user={selectedUserData} onClose={() => setIsEditModalOpen(false)} onSuccess={() => handleModalSuccess(false)} />}
      {isViewModalOpen && selectedUserData && (
        <ViewUserModal 
          user={selectedUserData} 
          onClose={() => setIsViewModalOpen(false)} 
          onEdit={() => handleEdit(selectedUserData)}
        />
      )}
      {isImportModalOpen && <ImportUserModal onClose={() => setIsImportModalOpen(false)} onSuccess={() => handleModalSuccess(true)} />}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmLabel="Xác nhận"
        cancelLabel="Hủy"
      />
    </AdminLayout>
  );
};
