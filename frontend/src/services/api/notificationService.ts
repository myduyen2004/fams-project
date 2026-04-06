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

interface NewsAdminResponse {
  id: number;
  title: string;
  content: string;
  type?: string;
  priority?: string;
  senderName?: string | null;
  senderAvatar?: string | null;
  senderUsername?: string | null;
  senderRole?: string | null;
  senderId?: number | null;
  targetType?: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  publishedAt?: string | null;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  attachmentUrls?: string[];
}

interface NewsAdminPageResponse {
  content: NewsAdminResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

const mapTargetType = (targetType?: string): TargetType => {
  switch (targetType) {
    case TargetType.ALL:
    case TargetType.STUDENT:
    case TargetType.LECTURER:
    case TargetType.ACADEMIC_STAFF:
    case TargetType.ADMIN:
    case TargetType.CLASS:
    case TargetType.COURSE:
    case TargetType.USER:
      return targetType;
    default:
      return TargetType.ALL;
  }
};

const mapNotificationType = (type?: string): NotificationType => {
  switch (type) {
    case NotificationType.ACADEMIC:
    case NotificationType.ATTENDANCE:
    case NotificationType.GRADE:
    case NotificationType.CHAT:
    case NotificationType.SCHEDULE:
    case NotificationType.SYSTEM:
      return type;
    default:
      return NotificationType.SYSTEM;
  }
};

const mapNotificationStatus = (status?: string): NotificationStatus => {
  switch (status) {
    case NotificationStatus.DRAFT:
    case NotificationStatus.SCHEDULED:
    case NotificationStatus.SENT:
      return status;
    default:
      return NotificationStatus.DRAFT;
  }
};

const mapNotificationPriority = (priority?: string): NotificationPriority => {
  switch (priority) {
    case NotificationPriority.LOW:
    case NotificationPriority.MEDIUM:
    case NotificationPriority.HIGH:
    case NotificationPriority.URGENT:
      return priority;
    default:
      return NotificationPriority.MEDIUM;
  }
};

const mapAdminNotification = (item: NewsAdminResponse): AdminNotification => ({
  id: item.id,
  title: item.title,
  content: item.content,
  type: mapNotificationType(item.type),
  priority: mapNotificationPriority(item.priority),
  sender: item.senderName || item.senderUsername || item.senderRole
    ? {
        id: item.senderId ?? 0,
        username: item.senderUsername ?? '',
        fullName: item.senderName ?? 'Hệ thống',
        role: item.senderRole ?? '',
      }
    : null,
  targetType: mapTargetType(item.targetType),
  scheduledAt: item.scheduledAt ?? null,
  sentAt: item.publishedAt ?? item.sentAt ?? null,
  status: mapNotificationStatus(item.status),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt ?? item.createdAt,
  attachmentUrls: item.attachmentUrls ?? [],
});

const toNewsPayload = (data: NotificationRequest) => ({
  title: data.title,
  content: data.content,
  type: data.type,
  targetType: data.targetType,
  status: data.status,
  scheduledAt: data.scheduledAt ?? null,
  attachmentUrls: data.attachmentUrls ?? [],
});

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

    const response = await apiClient.get<NewsAdminPageResponse>('/v1/news/admin', { params });
    return {
      ...response.data,
      content: (response.data.content ?? []).map(mapAdminNotification),
    };
  },

  // Get single notification by ID
  getNotificationById: async (id: number): Promise<AdminNotification> => {
    const response = await apiClient.get<NewsAdminResponse>(`/v1/news/admin/${id}`);
    return mapAdminNotification(response.data);
  },

  // Create new notification
  createNotification: async (data: NotificationRequest): Promise<AdminNotification> => {
    const response = await apiClient.post<NewsAdminResponse>('/v1/news/admin', toNewsPayload(data));
    return mapAdminNotification(response.data);
  },

  // Update existing notification
  updateNotification: async (id: number, data: NotificationRequest): Promise<AdminNotification> => {
    const response = await apiClient.put<NewsAdminResponse>(`/v1/news/admin/${id}`, toNewsPayload(data));
    return mapAdminNotification(response.data);
  },

  // Delete notification
  deleteNotification: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/news/admin/${id}`);
  },

  // Bulk delete notifications
  bulkDeleteNotifications: async (ids: number[]): Promise<void> => {
    await apiClient.post('/v1/news/admin/bulk-delete', { ids });
  },

  // Bulk update status
  bulkUpdateStatus: async (ids: number[], status: NotificationStatus): Promise<void> => {
    await Promise.all(
      ids.map(async (id) => {
        const current = await notificationService.getNotificationById(id);
        await notificationService.updateNotification(id, {
          title: current.title,
          content: current.content,
          type: current.type,
          priority: current.priority,
          targetType: current.targetType,
          status,
          scheduledAt: current.scheduledAt,
          attachmentUrls: current.attachmentUrls,
        });
      }),
    );
  },

  // Publish (set to OPEN) notifications
  publishNotifications: async (ids: number[]): Promise<void> => {
    await Promise.all(ids.map((id) => apiClient.post(`/v1/news/admin/${id}/publish`)));
  },

  // Hide notifications
  hideNotifications: async (ids: number[]): Promise<void> => {
    await notificationService.bulkUpdateStatus(ids, NotificationStatus.DRAFT);
  }
};

export { NotificationStatus, NotificationType, NotificationPriority, TargetType };
export type { AdminNotification, NotificationRequest, NotificationPageResponse, NotificationFilter };
