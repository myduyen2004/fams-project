import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Search,
  Loader2,
  Unlock,
  ChevronLeft,
  User as UserIcon
} from 'lucide-react';
import { userService, UserResponse } from '../../services/api/userService';
import { ViewUserModal, EditUserModal } from '../../components/admin/users/UserModals';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const LockedUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [totalElements, setTotalElements] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [selectedUserData, setSelectedUserData] = useState<UserResponse | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();

  // Use custom pagination hook - auto resets to page 0 when filters change
  const { page, setPage } = usePagination({ resetDependencies: [debouncedSearch] });

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

  // Search debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers({
        search: debouncedSearch,
        status: 'LOCKED',
        page,
        size: 20,
        sort: 'id,asc'
      });
      setUsers(data.content);
      setTotalElements(data.totalElements);
    } catch (error) {
      toast.error('Không thể tải danh sách tài khoản bị khóa');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const handleSelectUser = (id: number) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleUnlock = async (userId: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận mở khóa',
      message: 'Bạn có chắc chắn muốn mở khóa tài khoản này? Người dùng sẽ có thể đăng nhập lại vào hệ thống.',
      type: 'success',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const user = users.find(u => u.id === userId);
          if (user) {
            // Sanitize: Only send fields that UserRequest expects
            const updateData = {
              fullName: user.fullName,
              email: user.email,
              dob: typeof user.dob === 'string' ? user.dob : `${user.dob[0]}-${String(user.dob[1]).padStart(2, '0')}-${String(user.dob[2]).padStart(2, '0')}`,
              role: user.role as any,
              code: user.code,
              phone: user.phone,
              status: 'ACTIVE' as const
            };
            await userService.updateUser(userId, updateData);
            toast.success('Đã mở khóa tài khoản');
            fetchUsers();
          }
        } catch (error) {
          toast.error('Mở khóa thất bại');
        }
      }
    });
  };

  const handleBulkUnlock = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Mở khóa hàng loạt',
      message: `Bạn có chắc chắn muốn mở khóa ${selectedUsers.length} tài khoản này?`,
      type: 'success',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setIsUnlocking(true);
          for (const id of selectedUsers) {
            const user = users.find(u => u.id === id);
            if (user) {
              const updateData = {
                fullName: user.fullName,
                email: user.email,
                dob: typeof user.dob === 'string' ? user.dob : `${user.dob[0]}-${String(user.dob[1]).padStart(2, '0')}-${String(user.dob[2]).padStart(2, '0')}`,
                role: user.role as any,
                code: user.code,
                phone: user.phone,
                status: 'ACTIVE' as const
              };
              await userService.updateUser(id, updateData);
            }
          }
          toast.success('Đã mở khóa các tài khoản thành công');
          setSelectedUsers([]);
          fetchUsers();
        } catch (error) {
          toast.error('Mở khóa hàng loạt thất bại');
        } finally {
          setIsUnlocking(false);
        }
      }
    });
  };

  return (
    <AdminLayout pageTitle="Tài khoản bị khóa">
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <button
            onClick={() => navigate('/admin/activated-users')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft size={20} />
            <span>Quay lại danh sách đã kích hoạt</span>
          </button>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm tài khoản bị khóa..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-full text-sm outline-none focus:ring-2 focus:ring-fpt-orange/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-green-600">Đã chọn {selectedUsers.length} tài khoản</span>
            <button
              onClick={handleBulkUnlock}
              disabled={isUnlocking}
              className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              {isUnlocking && <Loader2 size={14} className="animate-spin" />}
              Mở khóa hàng loạt
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-red-600 text-white">
                <th className="px-4 py-3 text-left rounded-tl-lg w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/20 text-white focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                    onChange={handleSelectAll}
                    checked={users.length > 0 && selectedUsers.length === users.length}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Họ và tên</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Mã số</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Lý do (Mock)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-400">Không có tài khoản nào đang bị khóa</td>
                </tr>
              ) : users.map((user) => (
                <tr 
                  key={user.id} 
                  onClick={() => { setSelectedUserData(user); setIsViewModalOpen(true); }}
                  className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-sm cursor-pointer group"
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 flex-shrink-0 group-hover:ring-2 group-hover:ring-fpt-orange/30 transition-all">
                        {user.avatar ? (
                          <img
                            src={typeof user.avatar === 'string' && user.avatar.includes('cloudinary.com')
                              ? user.avatar.replace('/upload/', '/upload/c_fill,w_80,h_80,q_auto,f_auto/')
                              : user.avatar
                            }
                            alt="avatar"
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <UserIcon size={16} className="m-auto text-gray-400" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white group-hover:text-fpt-orange transition-colors">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{user.code}</td>
                  <td className="px-4 py-4">
                    <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium">
                      Đã khóa
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-500 italic rounded-tr-lg rounded-br-lg">Vi phạm quy định hệ thống</td>
                </tr>
              ))}
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

      {isEditModalOpen && selectedUserData && (
        <EditUserModal
          user={selectedUserData}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => { setIsEditModalOpen(false); fetchUsers(); }}
        />
      )}
      {isViewModalOpen && selectedUserData && (
        <ViewUserModal
          user={selectedUserData}
          onClose={() => setIsViewModalOpen(false)}
          onEdit={() => setIsEditModalOpen(true)}
          secondaryAction={{
            label: 'Mở khóa',
            icon: <Unlock size={16} />,
            onClick: () => {
              setIsViewModalOpen(false);
              handleUnlock(selectedUserData.id);
            },
            className: 'bg-green-600 text-white shadow-green-500/20 hover:bg-green-700'
          }}
        />
      )}
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
