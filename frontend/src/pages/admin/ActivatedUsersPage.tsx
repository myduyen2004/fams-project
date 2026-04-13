import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Search,
  Loader2,
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';
import { userService, UserResponse } from '../../services/api/userService';
import { EditUserModal, ViewUserModal } from '../../components/admin/users/UserModals';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const ActivatedUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [faceFilter, setFaceFilter] = useState('all');
  const [totalElements, setTotalElements] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isLocking, setIsLocking] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUserData, setSelectedUserData] = useState<UserResponse | null>(null);
  const navigate = useNavigate();

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

  // Use custom pagination hook - auto resets to page 0 when filters change
  const { page, setPage } = usePagination({ resetDependencies: [debouncedSearch, roleFilter, statusFilter, faceFilter] });

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
        role: roleFilter === 'all' ? undefined : roleFilter,
        status: 'ACTIVE',
        page,
        size: 20,
        sort: 'id,asc'
      });
      setUsers(data.content);
      setTotalElements(data.totalElements);
    } catch (error) {
      toast.error('Không thể tải danh sách tài khoản đã kích hoạt');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, roleFilter, statusFilter, faceFilter]);

  // Client-side filtering logic
  const filteredUsers = users.filter(user => {
    // Face registration filter
    if (faceFilter !== 'all') {
      if (faceFilter === 'REGISTERED' && user.faceDataStatus !== 'REGISTERED') return false;
      if (faceFilter === 'NOT_REGISTERED' && user.faceDataStatus === 'REGISTERED') return false;
    }

    // Activity status filter (isPasswordChanged)
    if (statusFilter !== 'all') {
      if (statusFilter === 'ACTIVE' && !user.isPasswordChanged) return false;
      if (statusFilter === 'ACTIVATED' && user.isPasswordChanged) return false;
    }

    return true;
  });

  const formatDateTime = (date: any) => {
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
  };

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

  const handleBulkLock = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận khóa tài khoản',
      message: `Bạn có chắc chắn muốn khóa ${selectedUsers.length} tài khoản này? Người dùng sẽ không thể đăng nhập vào hệ thống.`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          setIsLocking(true);
          // Logic for bulk locking
          for (const id of selectedUsers) {
            const user = users.find(u => u.id === id);
            if (user) {
              // Sanitize: Only send fields that UserRequest expects
              const updateData = {
                fullName: user.fullName,
                email: user.email,
                dob: typeof user.dob === 'string' ? user.dob : `${user.dob[0]}-${String(user.dob[1]).padStart(2, '0')}-${String(user.dob[2]).padStart(2, '0')}`,
                role: user.role as any,
                code: user.code,
                phone: user.phone,
                status: 'LOCKED' as const
              };
              await userService.updateUser(id, updateData);
            }
          }
          toast.success('Đã khóa tài khoản thành công');
          setSelectedUsers([]);
          fetchUsers();
        } catch (error) {
          toast.error('Khóa tài khoản thất bại');
        } finally {
          setIsLocking(false);
        }
      }
    });
  };

  return (
    <AdminLayout pageTitle="Tài khoản đã kích hoạt">
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-10 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-fpt-orange/20"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">Tất cả vai trò</option>
                <option value="ADMIN">Quản trị viên</option>
                <option value="ACADEMIC_STAFF">Phòng đào tạo</option>
                <option value="LECTURER">Giảng viên</option>
                <option value="STUDENT">Sinh viên</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <div className="relative">
              <select
                className="appearance-none pl-3 pr-10 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-fpt-orange/20"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="ACTIVATED">Đã kích hoạt</option>
                <option value="ACTIVE">Đang hoạt động</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <div className="relative">
              <select
                className="appearance-none pl-3 pr-10 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-fpt-orange/20"
                value={faceFilter}
                onChange={(e) => setFaceFilter(e.target.value)}
              >
                <option value="all">Tất cả khuôn mặt</option>
                <option value="REGISTERED">Đã đăng ký</option>
                <option value="NOT_REGISTERED">Chưa đăng ký</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-full text-sm outline-none focus:ring-2 focus:ring-fpt-orange/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            onClick={() => navigate('/admin/locked-users')}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 border border-red-100 dark:border-red-900/20 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <ShieldAlert size={18} />
            Tài khoản bị khóa
          </button>
        </div>

        {selectedUsers.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-red-600">Đã chọn {selectedUsers.length} tài khoản</span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkLock}
                disabled={isLocking}
                className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {isLocking && <Loader2 size={14} className="animate-spin" />}
                {selectedUsers.length === 1 ? 'Khóa tài khoản' : 'Khóa hàng loạt'}
              </button>
            </div>
          </div>
        )}

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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Ngày tạo</th>
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
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">Không tìm thấy tài khoản phù hợp</td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  onClick={() => { setSelectedUserData(user); setIsViewModalOpen(true); }}
                  className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-sm cursor-pointer group"
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange cursor-pointer"
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
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{user.roleName}</td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-medium ${user.faceDataStatus === 'REGISTERED' ? 'text-green-600' : 'text-red-500'}`}>
                      {user.faceDataStatus === 'REGISTERED' ? '● Đã đăng ký' : '● Chưa đăng ký'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.status === 'ACTIVE' ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isPasswordChanged
                          ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400'
                        }`}>
                        {user.isPasswordChanged ? 'Đang hoạt động' : 'Đã kích hoạt'}
                      </span>
                    ) : user.status === 'LOCKED' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400">
                        Đã khóa
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400">
                        Chưa kích hoạt
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-500 dark:text-gray-500 rounded-tr-lg rounded-br-lg">{formatDateTime(user.createdAt)}</td>
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
          user={selectedUserData as UserResponse}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => { setIsEditModalOpen(false); fetchUsers(); }}
        />
      )}
      {isViewModalOpen && selectedUserData && (
        <ViewUserModal
          user={selectedUserData}
          onClose={() => setIsViewModalOpen(false)}
          onEdit={() => setIsEditModalOpen(true)}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmLabel="Xác nhận khóa"
        cancelLabel="Hủy"
      />
    </AdminLayout>
  );
};

