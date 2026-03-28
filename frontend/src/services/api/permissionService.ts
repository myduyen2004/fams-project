import apiClient from './apiClient';

export interface PermissionInfo {
  key: string;
  label: string;
}

export interface UserPermissionResponse {
  id: number;
  userId: number;
  userFullName: string;
  userCode: string;
  permission: string;
  permissionLabel: string;
  grantedByName: string;
  grantedAt: string;
}

export interface LecturerWithPermissions {
  userId: number;
  fullName: string;
  code: string;
  email: string;
  avatar: string;
  permissions: UserPermissionResponse[];
}

// Permission key to route mapping
export const PERMISSION_ROUTE_MAP: Record<string, { path: string; label: string }> = {
  MANAGE_MAJORS: { path: '/lecturer/granted/majors', label: 'Quản lý ngành' },
  MANAGE_COURSES: { path: '/lecturer/granted/courses', label: 'Quản lý môn học' },
  MANAGE_USERS: { path: '/lecturer/granted/users', label: 'Quản lý người dùng' },
  MANAGE_SEMESTERS: { path: '/lecturer/granted/semesters', label: 'Quản lý kỳ học' },
  VIEW_SYSTEM_LOGS: { path: '/lecturer/granted/logs', label: 'Xem nhật ký hệ thống' },
  MANAGE_SCHEDULE: { path: '/lecturer/granted/schedule', label: 'Quản lý thời khóa biểu' },
  MANAGE_NOTIFICATIONS: { path: '/lecturer/granted/notifications', label: 'Quản lý thông báo' },
};

// Academic staff path mapping (what page to actually reuse)
export const PERMISSION_ACADEMIC_PATH_MAP: Record<string, string> = {
  MANAGE_MAJORS: '/academic-staff/majors',
  MANAGE_COURSES: '/academic-staff/courses',
  MANAGE_USERS: '/academic-staff/students',
  MANAGE_SEMESTERS: '/academic-staff/semesters',
  VIEW_SYSTEM_LOGS: '/academic-staff/logs',
  MANAGE_SCHEDULE: '/academic-staff/schedule',
  MANAGE_NOTIFICATIONS: '/academic-staff/notification-management',
};

export const permissionService = {
  /**
   * Get all available permissions
   */
  getAvailablePermissions: async (): Promise<PermissionInfo[]> => {
    const response = await apiClient.get<PermissionInfo[]>('/permissions/available');
    return response.data;
  },

  /**
   * Get all lecturers with their permissions
   */
  getLecturersWithPermissions: async (): Promise<LecturerWithPermissions[]> => {
    const response = await apiClient.get<LecturerWithPermissions[]>('/permissions/lecturers');
    return response.data;
  },

  /**
   * Get permissions for a specific user
   */
  getUserPermissions: async (userId: number): Promise<UserPermissionResponse[]> => {
    const response = await apiClient.get<UserPermissionResponse[]>(`/permissions/user/${userId}`);
    return response.data;
  },

  /**
   * Grant a permission to a user
   */
  grantPermission: async (userId: number, permission: string): Promise<UserPermissionResponse> => {
    const response = await apiClient.post<UserPermissionResponse>('/permissions/grant', {
      userId,
      permission,
    });
    return response.data;
  },

  /**
   * Revoke a permission from a user
   */
  revokePermission: async (userId: number, permission: string): Promise<void> => {
    await apiClient.delete('/permissions/revoke', {
      data: { userId, permission },
    });
  },

  /**
   * Get my permissions (current logged-in user)
   */
  getMyPermissions: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/permissions/my');
    return response.data;
  },
};
