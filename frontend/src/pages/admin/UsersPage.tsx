import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { userService, UserResponse } from '../../services/api/userService';
import toast from 'react-hot-toast';
import { UserTableRow } from '../../components/admin/users/UserTableRow';
import { UserFilters } from '../../components/admin/users/UserFilters';
import { BulkActions } from '../../components/admin/users/BulkActions';
import { AddUserModal, EditUserModal, ViewUserModal, ImportUserModal } from '../../components/admin/users/UserModals';

export const UsersPage = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedUserData, setSelectedUserData] = useState<UserResponse | null>(null);

  // Action states
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers({
        status: 'INACTIVE',
        role: roleFilter === 'all' ? undefined : roleFilter,
        search,
        page,
        size: 10,
        sort: 'id,asc'
      });
      setUsers(data.content);
      setTotalElements(data.totalElements);
    } catch (error) {
      toast.error('Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    if (!window.confirm('Bạn có chắc chắn muốn xóa các tài khoản đã chọn?')) return;
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
  }, [selectedUsers, fetchUsers]);

  const handleBulkActivate = useCallback(async () => {
    const usersToActivate = users.filter(u => selectedUsers.includes(u.id));
    const missingAvatars = usersToActivate.some(u => !u.avatar);
    
    if (missingAvatars) {
      toast.error('Một số tài khoản chưa có ảnh đại diện. Vui lòng cập nhật trước khi kích hoạt!');
      return;
    }

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
  }, [selectedUsers, users, fetchUsers]);

  const handleView = useCallback((user: UserResponse) => {
    setSelectedUserData(user);
    setIsViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((user: UserResponse) => {
    setSelectedUserData(user);
    setIsEditModalOpen(true);
  }, []);

  const handleModalSuccess = useCallback(() => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsImportModalOpen(false);
    fetchUsers();
  }, [fetchUsers]);

  // Memoized date formatter to avoid re-creating it
  const formatDateTime = useCallback((date: any) => {
    if (!date) return '---';
    
    try {
      let d: Date;
      if (Array.isArray(date)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = date;
        d = new Date(year, month - 1, day, hour, minute, second);
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
        
        <UserFilters 
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          onImportClick={() => setIsImportModalOpen(true)}
          onAddClick={() => setIsAddModalOpen(true)}
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Khuôn mặt</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Ngày tạo</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">Không có tài khoản nào chờ kích hoạt</td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserTableRow 
                    key={user.id}
                    user={user}
                    isSelected={selectedUsers.includes(user.id)}
                    onSelect={handleSelectUser}
                    onView={handleView}
                    onEdit={handleEdit}
                    formatDateTime={formatDateTime}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800 text-sm text-gray-500">
          <div>
            Hiển thị <span className="font-medium text-gray-900 dark:text-white">{page * 10 + 1}</span> đến <span className="font-medium text-gray-900 dark:text-white">{Math.min((page + 1) * 10, totalElements)}</span> trong số <span className="font-medium text-gray-900 dark:text-white">{totalElements}</span> người dùng
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500">Trước</button>
            {Array.from({ length: Math.ceil(totalElements / 10) }, (_, i) => (
              <button 
                key={i}
                onClick={() => setPage(i)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-colors ${
                  page === i ? 'bg-fpt-orange text-white' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 10 >= totalElements} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500">Sau</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAddModalOpen && <AddUserModal onClose={() => setIsAddModalOpen(false)} onSuccess={handleModalSuccess} />}
      {isEditModalOpen && selectedUserData && <EditUserModal user={selectedUserData} onClose={() => setIsEditModalOpen(false)} onSuccess={handleModalSuccess} />}
      {isViewModalOpen && selectedUserData && <ViewUserModal user={selectedUserData} onClose={() => setIsViewModalOpen(false)} />}
      {isImportModalOpen && <ImportUserModal onClose={() => setIsImportModalOpen(false)} onSuccess={handleModalSuccess} />}
    </AdminLayout>
  );
};
