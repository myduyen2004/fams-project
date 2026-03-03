import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Search,
  Eye,
  Loader2,
  User as UserIcon,
  Edit2,
  ShieldAlert,
  X,
  Camera
} from 'lucide-react';
import { userService, UserResponse } from '../../services/api/userService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../components/common/Pagination';
import { usePagination } from '../../hooks/usePagination';

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
    if (!window.confirm(`Bạn có chắc chắn muốn khóa ${selectedUsers.length} tài khoản này?`)) return;
    try {
      setIsLocking(true);
      // Logic for bulk locking - assuming individual calls for now
      for (const id of selectedUsers) {
        const user = users.find(u => u.id === id);
        if (user) {
          await userService.updateUser(id, { ...user, status: 'LOCKED' } as any);
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
            Danh sách tài khoản bị khóa
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
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">Không tìm thấy tài khoản phù hợp</td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-sm">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange cursor-pointer"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 flex-shrink-0">
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
                      <span className="font-medium text-gray-900 dark:text-white">{user.fullName}</span>
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
                  <td className="px-4 py-4 text-gray-500 dark:text-gray-500">{formatDateTime(user.createdAt)}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setSelectedUserData(user); setIsViewModalOpen(true); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Xem chi tiết"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => { setSelectedUserData(user); setIsEditModalOpen(true); }}
                        className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors" title="Chỉnh sửa"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  </td>
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
          user={selectedUserData as UserResponse}
          onClose={() => setIsViewModalOpen(false)}
        />
      )}
    </AdminLayout>
  );
};

// --- Modals Components (Reuse existing logic) ---

const EditUserModal: React.FC<{ user: UserResponse; onClose: () => void; onSuccess: () => void }> = ({ user, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user.avatar || null);
  const ensureStringDate = (d: any) => {
    if (Array.isArray(d)) {
      const [year, month, day] = d;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    if (typeof d === 'string' && d.includes('/')) {
      const parts = d.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return d || '';
  };

  const [formData, setFormData] = useState({
    fullName: user.fullName,
    code: user.code,
    email: user.email,
    dob: ensureStringDate(user.dob),
    phone: user.phone || '',
    role: user.role as any,
    status: user.status as any
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Ensure date is in YYYY-MM-DD format before sending
      let submitDob = formData.dob;
      if (submitDob && submitDob.includes('/')) {
        const parts = submitDob.split('/');
        if (parts.length === 3) {
          submitDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      await userService.updateUser(user.id, { ...formData, dob: submitDob }, avatar || undefined);
      toast.success('Cập nhật thành công');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Chỉnh sửa tài khoản</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex flex-col items-center mb-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
              {preview ? <img src={preview} alt="preview" className="w-full h-full object-cover" /> : <UserIcon size={32} className="text-gray-300" />}
              <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors cursor-pointer group">
                <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
            <span className="text-xs text-gray-400 mt-2">Ảnh đại diện</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Họ và tên</label>
              <input required type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Mã số <span className="text-red-500">*</span></label>
              <input
                readOnly={!!user.code}
                type="text"
                className={`w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-fpt-orange/20 ${!!user.code ? 'bg-gray-100 dark:bg-zinc-800/50 cursor-not-allowed text-gray-500' : 'bg-gray-50 dark:bg-zinc-800'}`}
                value={formData.code || ''}
                onChange={e => !user.code && setFormData({ ...formData, code: e.target.value })}
                placeholder={!user.code ? "Nhập mã số cho Admin..." : ""}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Ngày sinh</label>
              <input required type="date" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Email</label>
              <input required type="email" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Số điện thoại</label>
              <input type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Trạng thái</label>
              <select disabled className="w-full px-4 py-2 bg-gray-100 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none cursor-not-allowed text-gray-500" value={formData.status}>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Chưa kích hoạt</option>
                <option value="LOCKED">Đã khóa</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Vai trò</label>
              <select className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}>
                <option value="STUDENT">Sinh viên</option>
                <option value="LECTURER">Giảng viên</option>
                <option value="ACADEMIC_STAFF">Phòng đào tạo</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />} Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ViewUserModal: React.FC<{ user: UserResponse; onClose: () => void }> = ({ user, onClose }) => {
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
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return '---'; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết tài khoản</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 border-orange-100 dark:border-fpt-orange/20">
              {user.avatar ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" /> : <UserIcon size={40} className="m-auto text-gray-300 dark:text-zinc-600 mt-6" />}
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white">{user.fullName}</h4>
              <p className="text-gray-500 dark:text-zinc-400">{user.roleName}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                Đã kích hoạt
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-zinc-400">Mã số</p>
              <p className="font-medium text-gray-900 dark:text-white">{user.code}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-zinc-400">Ngày sinh</p>
              <p className="font-medium text-gray-900 dark:text-white">{user.dob}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 dark:text-zinc-400">Email</p>
              <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-zinc-400">Số điện thoại</p>
              <p className="font-medium text-gray-900 dark:text-white">{user.phone || 'Chưa cập nhật'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-zinc-400">Khuôn mặt</p>
              <p className={`font-medium ${user.faceDataStatus === 'REGISTERED' ? 'text-green-600' : 'text-red-500'}`}>
                {user.faceDataStatus === 'REGISTERED' ? 'Đã đăng ký' : 'Chưa đăng ký'}
              </p>
            </div>
            <div className="col-span-2 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Cập nhật lần cuối</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {formatDateTime(user.updatedAt || user.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={onClose} className="px-6 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
};
