import apiClient from './apiClient';
import {
  AdminNotification,
  NotificationRequest,
  NotificationPageResponse,
  NotificationFilter,
  NotificationStatus,
  NotificationType,
  NotificationPriority,
  TargetType
} from '../../types/notification';

export const notificationService = {
  // Get all notifications with pagination and filters
  getNotifications: async (filter: NotificationFilter): Promise<NotificationPageResponse> => {
    const params: Record<string, unknown> = {
      page: filter.page,
      size: filter.size
    };

    if (filter.search) {
      params.search = filter.search;
    }
    if (filter.type && filter.type !== 'ALL') {
      params.type = filter.type;
    }
    if (filter.targetType && filter.targetType !== 'ALL') {
      params.targetType = filter.targetType;
    }
    if (filter.status && filter.status !== 'ALL') {
      params.status = filter.status;
    }

    const response = await apiClient.get<NotificationPageResponse>('/admin/notifications', { params });
    return response.data;
  },

  // Get single notification by ID
  getNotificationById: async (id: number): Promise<AdminNotification> => {
    const response = await apiClient.get<AdminNotification>(`/admin/notifications/${id}`);
    return response.data;
  },

  // Create new notification
  createNotification: async (data: NotificationRequest): Promise<AdminNotification> => {
    const response = await apiClient.post<AdminNotification>('/admin/notifications', data);
    return response.data;
  },

  // Update existing notification
  updateNotification: async (id: number, data: NotificationRequest): Promise<AdminNotification> => {
    const response = await apiClient.put<AdminNotification>(`/admin/notifications/${id}`, data);
    return response.data;
  },

  // Delete notification
  deleteNotification: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/notifications/${id}`);
  },

  // Bulk delete notifications
  bulkDeleteNotifications: async (ids: number[]): Promise<void> => {
    await apiClient.post('/admin/notifications/bulk-delete', { ids });
  },

  // Bulk update status
  bulkUpdateStatus: async (ids: number[], status: NotificationStatus): Promise<void> => {
    await apiClient.post('/admin/notifications/bulk-status', { ids, status });
  },

  // Publish (set to OPEN) notifications
  publishNotifications: async (ids: number[]): Promise<void> => {
    await apiClient.post('/admin/notifications/publish', { ids });
  },

  // Hide notifications
  hideNotifications: async (ids: number[]): Promise<void> => {
    await apiClient.post('/admin/notifications/hide', { ids });
  }
};

export { NotificationStatus, NotificationType, NotificationPriority, TargetType };
export type { AdminNotification, NotificationRequest, NotificationPageResponse, NotificationFilter };
