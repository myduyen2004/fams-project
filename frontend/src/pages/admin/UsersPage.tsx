import { useState, useEffect, useCallback } from 'react';
import { Loader2, Users, ArrowRight } from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { userService, UserResponse } from '../../services/api/userService';
import toast from "@utils/toast";
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
    if (data.newUsers && data.newUsers.length > 0) {
      setUsers(prev => {
        const next = [...prev];
        let hasChanges = false;

        data.newUsers.forEach((updatedUser: UserResponse) => {
          const index = next.findIndex(u => u.id === updatedUser.id);
          
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
            next[index] = { ...next[index], ...updatedUser };
            hasChanges = true;
          } else {
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

    if (data.status === 'COMPLETED') {
      setTimeout(() => {
        fetchUsers(true);
      }, 500);
    }
  });

  useWebSocket(`/topic/activation-progress/${authService.getUser()?.username}`, (data) => {
    setActivationProgress(data);

    if (data.activatedUserIds && data.activatedUserIds.length > 0) {
      const activatedSet = new Set(data.activatedUserIds.map(Number));
      setUsers(prev => prev.filter(u => !activatedSet.has(Number(u.id))));
      setTotalElements(prev => Math.max(0, prev - data.activatedUserIds.length));
    }

    if (data.status === 'COMPLETED') {
        setIsActivating(false);
        if (data.current === data.total && data.total > 0) {
            setUsers([]);
            setTotalElements(0);
        }
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

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, roleFilter]);

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
      title: 'Xác nhận xóa tài khoản',
      message: `Bạn có chắc chắn muốn xóa ${selectedUsers.length} tài khoản đang chờ kích hoạt? Hành động này không thể hoàn tác.`,
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
      message: 'Bạn có chắc chắn muốn kích hoạt TOÀN BỘ tài khoản chưa kích hoạt? Hệ thống sẽ gửi email thông báo cho từng người dùng.',
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
      setTimeout(() => fetchUsers(true), 2500);
    } else {
      fetchUsers();
    }
  }, [fetchUsers]);

  const formatDateTime = useCallback((date: any) => {
    if (!date) return '---';
    try {
      let d: Date;
      if (Array.isArray(date)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = date;
        d = new Date(year, month - 1, day, hour, minute, second);
      } else if (typeof date === 'string') {
        d = new Date(date.replace(' ', 'T'));
      } else {
        d = new Date(date);
      }
      if (isNaN(d.getTime())) return '---';
      return d.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return '---'; }
  }, []);

  return (
    <AdminLayout pageTitle="Tài khoản chưa kích hoạt">
      <div className="space-y-6">
        {/* Progress Tracker */}
        {activationProgress && (
          <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl animate-in fade-in slide-in-from-top-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-100 flex items-center gap-2 uppercase tracking-tight">
                  Tiến trình kích hoạt hệ thống
                  {activationProgress.status !== 'COMPLETED' && (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                  {activationProgress.message}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  {activationProgress.percentage}%
                </span>
                <p className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400/50 uppercase tracking-tighter">
                  {activationProgress.current} / {activationProgress.total} tài khoản
                </p>
              </div>
            </div>
            <div className="w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full h-3 overflow-hidden p-0.5 border border-emerald-200/30 dark:border-emerald-800/20">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 ease-out rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)] relative overflow-hidden"
                style={{ width: `${activationProgress.percentage}%` }}
              >
                {activationProgress.percentage < 100 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
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

        {/* Bulk Selection Actions */}
        <BulkActions
          selectedCount={selectedUsers.length}
          onDelete={handleBulkDelete}
          onActivate={handleBulkActivate}
          isDeleting={isDeleting}
          isActivating={isActivating}
        />

        {/* Data Table Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in fade-in duration-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-fpt-orange text-white">
                  <th className="px-4 py-4 text-left w-12">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-white/20 text-white focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                      onChange={handleSelectAll}
                      checked={users.length > 0 && selectedUsers.length === users.length}
                    />
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-widest">Thông tin tài khoản</th>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-widest">Mã số</th>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-widest">Vai trò</th>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-widest">Ngày sinh</th>
                  <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-widest">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-12 h-12 animate-spin text-fpt-orange" />
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Đang tải dữ liệu...</p>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-10">
                            <Users size={64} />
                            <p className="text-xl font-black uppercase tracking-tighter">Hệ thống hiện tại sạch bóng tài khoản chưa kích hoạt</p>
                        </div>
                    </td>
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

          <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-800">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(totalElements / 20)}
              totalElements={totalElements}
              pageSize={20}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAddModalOpen && <AddUserModal onClose={() => setIsAddModalOpen(false)} onSuccess={() => handleModalSuccess(false)} />}
      {isEditModalOpen && selectedUserData && <EditUserModal user={selectedUserData} onClose={() => setIsEditModalOpen(false)} onSuccess={() => handleModalSuccess(false)} />}
      {isViewModalOpen && selectedUserData && (
        <ViewUserModal 
          user={selectedUserData} 
          onClose={() => setIsViewModalOpen(false)} 
          onEdit={() => handleEdit(selectedUserData)}
          secondaryAction={{
            label: 'Kích hoạt ngay',
            icon: <ArrowRight size={16} />,
            onClick: () => {
              setIsViewModalOpen(false);
              setSelectedUsers([selectedUserData.id]);
              handleBulkActivate();
            },
            className: 'bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-700'
          }}
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

