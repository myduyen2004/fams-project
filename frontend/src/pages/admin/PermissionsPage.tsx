import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Search, Loader2, User as UserIcon
} from 'lucide-react';
import {
  permissionService,
  LecturerWithPermissions,
  PermissionInfo,
  PERMISSION_ROUTE_MAP
} from '../../services/api/permissionService';
import { authService } from '../../services/api/authService';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import toast from "@utils/toast";

// Updated metadata: Removed individual icons, using central orange theme
const PERMISSION_METADATA: Record<string, { desc: string }> = {
  MANAGE_MAJORS: { 
    desc: 'Cho phép thêm, sửa, xóa thông tin các ngành đào tạo trong hệ thống.'
  },
  MANAGE_COURSES: { 
    desc: 'Phê duyệt chương trình học và phân bổ giảng viên cho các môn học cụ thể.'
  },
  MANAGE_USERS: { 
    desc: 'Cấp quyền tạo tài khoản mới cho sinh viên và cán bộ nhân viên.'
  },
  MANAGE_SEMESTERS: { 
    desc: 'Thiết lập thời gian bắt đầu và kết thúc của các học kỳ chính, học kỳ phụ.'
  },
  VIEW_SYSTEM_LOGS: { 
    desc: 'Truy cập lịch sử hoạt động và các thay đổi quan trọng của hệ thống.'
  },
  MANAGE_SCHEDULE: { 
    desc: 'Sắp xếp lịch học, phòng học và xử lý các xung đột về thời gian giảng dạy.'
  },
  MANAGE_NOTIFICATIONS: { 
    desc: 'Gửi thông báo đẩy đến ứng dụng di động và email cho sinh viên, giảng viên.'
  }
};

export const PermissionsPage: React.FC = () => {
  const user = authService.getUser();
  const isAdmin = user?.role === 'ADMIN';

  const Layout = isAdmin ? AdminLayout : AcademicStaffLayout;
  const [lecturers, setLecturers] = useState<LecturerWithPermissions[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<PermissionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Optimization: Map for O(1) lecturer lookup
  const lecturersMap = useMemo(() => {
    const map = new Map<number, LecturerWithPermissions>();
    lecturers.forEach(l => map.set(l.userId, l));
    return map;
  }, [lecturers]);

  // Optimization: Pre-calculate permission status for selected users
  const sharedPermissionsStatus = useMemo(() => {
    if (selectedUserIds.length === 0) return {} as Record<string, boolean>;

    const status: Record<string, boolean> = {};
    availablePermissions.forEach(perm => {
      status[perm.key] = selectedUserIds.every(id => {
        const lecturer = lecturersMap.get(id);
        return lecturer?.permissions.some((p: any) => p.permission === perm.key);
      });
    });
    return status;
  }, [selectedUserIds, lecturersMap, availablePermissions]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [lecturersData, permissionsData] = await Promise.all([
        permissionService.getLecturersWithPermissions(),
        permissionService.getAvailablePermissions()
      ]);
      setLecturers(lecturersData);
      setAvailablePermissions(permissionsData);
    } catch (error) {
      toast.error('Không thể tải dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTogglePermission = async (userId: number, permissionKey: string, currentHasPermission: boolean) => {
    setIsProcessing(true);
    try {
      if (currentHasPermission) {
        await permissionService.revokePermission(userId, permissionKey);
      } else {
        await permissionService.grantPermission(userId, permissionKey);
      }
      
      setLecturers(prev =>
        prev.map(l => {
          if (l.userId !== userId) return l;
          if (currentHasPermission) {
            return {
              ...l,
              permissions: l.permissions.filter(p => p.permission !== permissionKey)
            };
          } else {
            return {
              ...l,
              permissions: [
                ...l.permissions,
                {
                  id: Date.now(),
                  userId,
                  userFullName: l.fullName,
                  userCode: l.code,
                  permission: permissionKey,
                  permissionLabel: PERMISSION_ROUTE_MAP[permissionKey]?.label || permissionKey,
                  grantedByName: 'Admin',
                  grantedAt: new Date().toISOString()
                }
              ]
            };
          }
        })
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkTogglePermission = async (permissionKey: string, grant: boolean) => {
    if (selectedUserIds.length === 0) return;
    setIsProcessing(true);
    
    try {
      let successCount = 0;
      await Promise.all(selectedUserIds.map(async (userId) => {
        try {
          const l = lecturers.find(lect => lect.userId === userId);
          const hasPerm = l?.permissions.some(p => p.permission === permissionKey);
          
          if (grant && !hasPerm) {
            await permissionService.grantPermission(userId, permissionKey);
            successCount++;
          } else if (!grant && hasPerm) {
            await permissionService.revokePermission(userId, permissionKey);
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to update for user ${userId}`, err);
        }
      }));

      // Update state locally for bulk actions
      setLecturers(prev =>
        prev.map(l => {
          if (!selectedUserIds.includes(l.userId)) return l;
          const hasPerm = l.permissions.some(p => p.permission === permissionKey);
          
          if (grant && !hasPerm) {
            return {
              ...l,
              permissions: [
                ...l.permissions,
                {
                  id: Date.now(),
                  userId: l.userId,
                  userFullName: l.fullName,
                  userCode: l.code,
                  permission: permissionKey,
                  permissionLabel: PERMISSION_ROUTE_MAP[permissionKey]?.label || permissionKey,
                  grantedByName: 'Admin',
                  grantedAt: new Date().toISOString()
                }
              ]
            };
          } else if (!grant && hasPerm) {
            return {
              ...l,
              permissions: l.permissions.filter(p => p.permission !== permissionKey)
            };
          }
          return l;
        })
      );
    } catch (error) {
      toast.error('Có lỗi xảy ra khi cập nhật hàng loạt');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectLecturer = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const filteredLecturers = useMemo(() => {
    const s = search.toLowerCase();
    return lecturers.filter((l: LecturerWithPermissions) =>
      l.fullName.toLowerCase().includes(s) ||
      l.code.toLowerCase().includes(s) ||
      l.email.toLowerCase().includes(s)
    );
  }, [lecturers, search]);

  return (
    <Layout pageTitle="Quản lý phân quyền">
      <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
        {/* Left Side: Lecturer List */}
        <div className="w-80 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm shadow-orange-50 dark:shadow-none">
          <div className="p-4 border-b border-gray-50 dark:border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-fpt-orange uppercase tracking-wider">Danh sách giảng viên</h3>
            
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Tìm giảng viên..."
                className="w-full pl-10 pr-4 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5 text-gray-900 dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div 
              onClick={() => {
                if (filteredLecturers.length === 0) return;
                const allSelected = filteredLecturers.every(l => selectedUserIds.includes(l.userId));
                if (allSelected) {
                  const filteredIds = filteredLecturers.map(l => l.userId);
                  setSelectedUserIds(prev => prev.filter(id => !filteredIds.includes(id)));
                } else {
                  const filteredIds = filteredLecturers.map(l => l.userId);
                  setSelectedUserIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                }
              }}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900 transition-all border border-transparent border-b-gray-50 dark:border-b-zinc-800/50"
            >
              <input
                type="checkbox"
                checked={filteredLecturers.length > 0 && filteredLecturers.every(l => selectedUserIds.includes(l.userId))}
                onChange={() => {}}
                className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange cursor-pointer"
              />
              <span className="text-sm font-bold text-gray-700 dark:text-zinc-300">Chọn tất cả</span>
              <span className="ml-auto text-[10px] font-bold text-gray-400 uppercase tracking-tighter bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {filteredLecturers.length} GV
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {loading ? (
              <div className="py-10 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-fpt-orange" />
              </div>
            ) : filteredLecturers.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs text-gray-400">Không tìm thấy giảng viên</p>
              </div>
            ) : (
              filteredLecturers.map((lecturer) => {
                const isSelected = selectedUserIds.includes(lecturer.userId);
                return (
                  <div
                    key={lecturer.userId}
                    onClick={() => handleSelectLecturer(lecturer.userId)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${isSelected 
                      ? 'bg-orange-50 dark:bg-orange-900/10 ring-1 ring-orange-100 dark:ring-orange-800/30' 
                      : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange cursor-pointer"
                    />
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-gray-100 dark:border-zinc-700">
                      {lecturer.avatar ? (
                        <img 
                          src={lecturer.avatar} 
                          alt={lecturer.fullName} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                          <UserIcon size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isSelected ? 'text-fpt-orange' : 'text-gray-900 dark:text-white'}`}>
                        {lecturer.fullName}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-medium">{lecturer.code}</p>
                    </div>
                    {lecturer.permissions.length > 0 && (
                      <div className="w-5 h-5 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center border border-orange-100 dark:border-orange-900/40">
                        <span className="text-[10px] font-bold text-fpt-orange/60 group-hover:text-fpt-orange transition-colors">
                          {lecturer.permissions.length}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Permission Control */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Action Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Kiểm soát quyền</h2>
              <p className="text-sm text-gray-400">Quản lý và cập nhật quyền truy cập cho đội ngũ giảng viên.</p>
            </div>
            {/* Bulk actions removed as per request */}
          </div>

          {/* User Status Bar */}
          {selectedUserIds.length > 0 && (
            <div className="mb-6 p-4 bg-orange-50/50 dark:bg-orange-900/5 rounded-2xl border border-orange-100/50 dark:border-orange-800/20 flex items-center gap-4 shadow-sm animate-in zoom-in-95">
                <div className="flex -space-x-3 overflow-hidden">
                    {selectedUserIds.slice(0, 5).map(id => {
                        const l = lecturers.find(lect => lect.userId === id);
                        return (
                            <div key={id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-zinc-900 overflow-hidden bg-gray-200">
                                <img src={l?.avatar || ""} alt="" className="h-full w-full object-cover" />
                            </div>
                        );
                    })}
                    {selectedUserIds.length > 5 && (
                        <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-orange-100 text-[10px] font-bold text-fpt-orange">
                            +{selectedUserIds.length - 5}
                        </div>
                    )}
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                    Đã chọn <span className="text-fpt-orange font-bold text-base">{selectedUserIds.length}</span> giảng viên
                </p>
                <button 
                  onClick={() => setSelectedUserIds([])}
                  className="ml-auto text-xs font-bold text-gray-400 hover:text-fpt-orange transition-colors"
                >
                    Hủy chọn
                </button>
            </div>
          )}

          {/* Grid of Permissions */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {availablePermissions.map(perm => {
                const metadata = PERMISSION_METADATA[perm.key];
                
                const hasPerm = sharedPermissionsStatus[perm.key];
                
                return (
                  <div 
                    key={perm.key}
                    className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-orange-100 transition-all flex flex-col gap-4 group h-full"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                        {perm.label}
                      </h4>
                      <button
                        onClick={() => {
                          if (selectedUserIds.length === 1) {
                            handleTogglePermission(selectedUserIds[0], perm.key, hasPerm);
                          } else if (selectedUserIds.length > 1) {
                            handleBulkTogglePermission(perm.key, !hasPerm);
                          }
                        }}
                        disabled={selectedUserIds.length === 0 || isProcessing}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 outline-none ${hasPerm 
                          ? 'bg-fpt-orange' 
                          : 'bg-gray-200 dark:bg-zinc-800'
                        } ${selectedUserIds.length === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${hasPerm ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>

                    <p className="text-[11px] leading-relaxed text-gray-500 dark:text-zinc-500 line-clamp-3 italic">
                      {metadata?.desc || 'Cấp quyền truy cập cho tính năng này.'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

