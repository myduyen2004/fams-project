import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { 
  Search,
  Loader2,
  User as UserIcon,
  Unlock,
  ChevronLeft
} from 'lucide-react';
import { userService, UserResponse } from '../../services/api/userService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '../../components/common/Pagination';

export const LockedUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers({
        search,
        status: 'LOCKED',
        page,
        size: 30,
        sort: 'id,asc'
      });
      setUsers(data.content);
      setTotalElements(data.totalElements);
    } catch (error) {
      toast.error('Không thể tải danh sách tài khoản bị khóa');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    if (!window.confirm('Bạn có chắc chắn muốn mở khóa tài khoản này?')) return;
    try {
      const user = users.find(u => u.id === userId);
      if (user) {
        await userService.updateUser(userId, { ...user, status: 'ACTIVE' } as any);
        toast.success('Đã mở khóa tài khoản');
        fetchUsers();
      }
    } catch (error) {
      toast.error('Mở khóa thất bại');
    }
  };

  const handleBulkUnlock = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn mở khóa ${selectedUsers.length} tài khoản này?`)) return;
    try {
      setIsUnlocking(true);
      for (const id of selectedUsers) {
        const user = users.find(u => u.id === id);
        if (user) {
          await userService.updateUser(id, { ...user, status: 'ACTIVE' } as any);
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Lý do (Mock)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Hành động</th>
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
                  <td colSpan={6} className="py-10 text-center text-gray-400">Không có tài khoản nào đang bị khóa</td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-sm">
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 flex-shrink-0">
                        {user.avatar ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" /> : <UserIcon size={16} className="m-auto text-gray-400" />}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{user.code}</td>
                  <td className="px-4 py-4">
                    <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium">
                      Đã khóa
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-500 italic">Vi phạm quy định hệ thống</td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <button 
                        onClick={() => handleUnlock(user.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Mở khóa"
                      >
                        <Unlock size={18} />
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
          totalPages={Math.ceil(totalElements / 30)}
          totalElements={totalElements}
          pageSize={30}
          onPageChange={setPage}
        />
      </div>
    </AdminLayout>
  );
};
