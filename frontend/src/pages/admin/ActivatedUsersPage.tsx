import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Search,
  Loader2,
  User as UserIcon,
  ShieldAlert,
  ChevronDown,
  Check,
  Filter
} from 'lucide-react';
import { userService, UserResponse } from '../../services/api/userService';
import { EditUserModal, ViewUserModal } from '../../components/admin/users/UserModals';
import toast from "@utils/toast";
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

  // Dropdown states
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isFaceOpen, setIsFaceOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) setIsRoleOpen(false);
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) setIsStatusOpen(false);
      if (faceRef.current && !faceRef.current.contains(event.target as Node)) setIsFaceOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const roles = [
    { value: 'all', label: 'Tất cả vai trò' },
    { value: 'ADMIN', label: 'Quản trị viên' },
    { value: 'ACADEMIC_STAFF', label: 'Phòng đào tạo' },
    { value: 'LECTURER', label: 'Giảng viên' },
    { value: 'STUDENT', label: 'Sinh viên' }
  ];

  const statuses = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'ACTIVATED', label: 'Đã kích hoạt' },
    { value: 'ACTIVE', label: 'Đang hoạt động' }
  ];

  const faces = [
    { value: 'all', label: 'Tất cả khuôn mặt' },
    { value: 'REGISTERED', label: 'Đã đăng ký' },
    { value: 'NOT_REGISTERED', label: 'Chưa đăng ký' }
  ];

  return (
    <AdminLayout pageTitle="Tài khoản đã kích hoạt">
      <div className="space-y-4">
        {/* Rich Filters Bar */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Role Selector */}
            <div className="flex-1 min-w-[180px]" ref={roleRef}>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 ml-1">
                Vai trò
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsRoleOpen(!isRoleOpen)}
                  className="flex h-[52px] items-center justify-between w-full rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-left focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {roles.find(r => r.value === roleFilter)?.label}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isRoleOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
                </button>

                {isRoleOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl py-1 animate-in slide-in-from-top-2 duration-200">
                    {roles.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => {
                          setRoleFilter(r.value);
                          setIsRoleOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${roleFilter === r.value
                          ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange'
                          : 'text-gray-700 dark:text-zinc-300'
                          }`}
                      >
                        <span className="text-sm font-medium">{r.label}</span>
                        {roleFilter === r.value && <Check size={14} className="stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Status Selector */}
            <div className="flex-1 min-w-[180px]" ref={statusRef}>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 ml-1">
                Trạng thái
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsStatusOpen(!isStatusOpen)}
                  className="flex h-[52px] items-center justify-between w-full rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-left focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {statuses.find(s => s.value === statusFilter)?.label}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isStatusOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
                </button>

                {isStatusOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl py-1 animate-in slide-in-from-top-2 duration-200">
                    {statuses.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => {
                          setStatusFilter(s.value);
                          setIsStatusOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${statusFilter === s.value
                          ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange'
                          : 'text-gray-700 dark:text-zinc-300'
                          }`}
                      >
                        <span className="text-sm font-medium">{s.label}</span>
                        {statusFilter === s.value && <Check size={14} className="stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Face Selector */}
            <div className="flex-1 min-w-[180px]" ref={faceRef}>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 ml-1">
                Khuôn mặt
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsFaceOpen(!isFaceOpen)}
                  className="flex h-[52px] items-center justify-between w-full rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-left focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {faces.find(f => f.value === faceFilter)?.label}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isFaceOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
                </button>

                {isFaceOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl py-1 animate-in slide-in-from-top-2 duration-200">
                    {faces.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => {
                          setFaceFilter(f.value);
                          setIsFaceOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${faceFilter === f.value
                          ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange'
                          : 'text-gray-700 dark:text-zinc-300'
                          }`}
                      >
                        <span className="text-sm font-medium">{f.label}</span>
                        {faceFilter === f.value && <Check size={14} className="stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Search Box */}
            <div className="flex-[1.5] min-w-[250px]">
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 ml-1">
                Tìm kiếm tài khoản
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Họ tên, mã số, email..."
                  className="w-full pl-10 pr-4 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5 text-gray-900 dark:text-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/admin/locked-users')}
                className="flex h-[52px] items-center gap-2 px-6 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-2 border-red-100 dark:border-red-900/30 rounded-2xl text-sm font-bold hover:bg-red-100 transition-all shadow-sm active:scale-95"
              >
                <ShieldAlert size={18} />
                <span className="hidden sm:inline">Tài khoản bị khóa</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedUsers.length > 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 ml-2">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600">
                    <Filter size={16} />
                </div>
                <span className="text-sm font-bold text-red-700 dark:text-red-400">Đã chọn {selectedUsers.length} tài khoản</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedUsers([])}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Hủy chọn
              </button>
              <button
                onClick={handleBulkLock}
                disabled={isLocking}
                className="px-6 py-2 text-sm bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isLocking ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
                {selectedUsers.length === 1 ? 'Khóa tài khoản' : 'Khóa hàng loạt'}
              </button>
            </div>
          </div>
        )}

        {/* Users Table Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
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
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Họ và tên</th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Mã số</th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Vai trò</th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Khuôn mặt</th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Trạng thái</th>
                  <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-fpt-orange" />
                        <p className="text-sm font-bold">Đang tải dữ liệu người dùng...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-20">
                            <UserIcon size={48} />
                            <p className="text-lg font-bold">Không tìm thấy tài khoản phù hợp</p>
                        </div>
                    </td>
                  </tr>
                ) : filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    onClick={() => { setSelectedUserData(user); setIsViewModalOpen(true); }}
                    className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-all text-sm cursor-pointer group"
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
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 flex-shrink-0 group-hover:ring-2 group-hover:ring-fpt-orange/30 transition-all border border-gray-100 dark:border-zinc-700">
                          {user.avatar ? (
                            <img
                              src={typeof user.avatar === 'string' && user.avatar.includes('cloudinary.com')
                                ? user.avatar.replace('/upload/', '/upload/c_fill,w_80,h_80,q_auto,f_auto/')
                                : user.avatar
                              }
                              alt="avatar"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <UserIcon size={18} className="m-auto text-gray-400" />
                          )}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white group-hover:text-fpt-orange transition-colors">
                            {user.fullName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-gray-500 dark:text-gray-400 font-bold">{user.code}</td>
                    <td className="px-4 py-4">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded-lg text-[11px] font-bold text-gray-600 dark:text-gray-400">
                            {user.roleName}
                        </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[11px] font-bold uppercase tracking-tight flex items-center gap-1.5 ${user.faceDataStatus === 'REGISTERED' ? 'text-emerald-600' : 'text-rose-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${user.faceDataStatus === 'REGISTERED' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                        {user.faceDataStatus === 'REGISTERED' ? 'Đã đăng ký' : 'Chưa đăng ký'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {user.status === 'ACTIVE' ? (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tighter ${user.isPasswordChanged
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800/20 dark:text-emerald-400 border border-emerald-200/50'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400 border border-blue-200/50'
                          }`}>
                          {user.isPasswordChanged ? 'Đang hoạt động' : 'Đã kích hoạt'}
                        </span>
                      ) : user.status === 'LOCKED' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tighter bg-rose-100 text-rose-800 dark:bg-rose-800/20 dark:text-rose-400 border border-rose-200/50">
                          Đã khóa
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tighter bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400 border border-gray-200/50">
                          Chưa kích hoạt
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[11px] font-medium text-gray-400">{formatDateTime(user.createdAt)}</td>
                  </tr>
                ))}
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


