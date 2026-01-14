// Admin Notification Management Types
// Synced with backend entity: Notification.java

// === ENUMS (matching backend exactly) ===

export enum NotificationType {
  SYSTEM = 'SYSTEM',           // Thông báo hệ thống
  ACADEMIC = 'ACADEMIC',       // Thông báo học vụ
  ATTENDANCE = 'ATTENDANCE',   // Thông báo điểm danh
  GRADE = 'GRADE',             // Thông báo điểm
  CHAT = 'CHAT',               // Thông báo chat
  SCHEDULE = 'SCHEDULE'        // Thông báo lịch học
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum TargetType {
  ALL = 'ALL',           // Tất cả
  STUDENT = 'STUDENT',   // Tất cả sinh viên
  LECTURER = 'LECTURER', // Tất cả giảng viên
  CLASS = 'CLASS',       // Theo lớp học phần
  COURSE = 'COURSE',     // Theo môn học
  USER = 'USER'          // Cá nhân cụ thể
}

export enum NotificationStatus {
  DRAFT = 'DRAFT',         // Bản nháp
  SCHEDULED = 'SCHEDULED', // Đã lên lịch
  SENT = 'SENT'            // Đã gửi
}

// === INTERFACES ===

export interface UserBasic {
  id: number;
  username: string;
  fullName: string;
}

export interface AdminNotification {
  id: number;
  title: string;
  content: string;
  type: NotificationType;
  priority: NotificationPriority;
  sender: UserBasic | null;
  targetType: TargetType;
  targetClassName: string | null;   // FK to ClassSection
  targetCourseId: number | null;    // FK to Course
  scheduledAt: string | null;
  sentAt: string | null;
  status: NotificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRequest {
  title: string;
  content: string;
  type: NotificationType;
  priority: NotificationPriority;
  targetType: TargetType;
  targetClassName?: string | null;
  targetCourseId?: number | null;
  scheduledAt?: string | null;
  status: NotificationStatus;
}

export interface NotificationPageResponse {
  content: AdminNotification[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface NotificationFilter {
  search?: string;
  type?: NotificationType | 'ALL';
  targetType?: TargetType | 'ALL';
  status?: NotificationStatus | 'ALL';
  page: number;
  size: number;
}

// === HELPER FUNCTIONS ===

export const getTypeLabel = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.SYSTEM:
      return 'Hệ thống';
    case NotificationType.ACADEMIC:
      return 'Học vụ';
    case NotificationType.ATTENDANCE:
      return 'Điểm danh';
    case NotificationType.GRADE:
      return 'Điểm số';
    case NotificationType.CHAT:
      return 'Chat';
    case NotificationType.SCHEDULE:
      return 'Lịch học';
    default:
      return type;
  }
};

export const getPriorityLabel = (priority: NotificationPriority): string => {
  switch (priority) {
    case NotificationPriority.LOW:
      return 'Thấp';
    case NotificationPriority.MEDIUM:
      return 'Trung bình';
    case NotificationPriority.HIGH:
      return 'Cao';
    case NotificationPriority.URGENT:
      return 'Khẩn cấp';
    default:
      return priority;
  }
};

export const getPriorityColor = (priority: NotificationPriority): string => {
  switch (priority) {
    case NotificationPriority.LOW:
      return 'bg-gray-500';
    case NotificationPriority.MEDIUM:
      return 'bg-blue-500';
    case NotificationPriority.HIGH:
      return 'bg-orange-500';
    case NotificationPriority.URGENT:
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

export const getStatusLabel = (status: NotificationStatus): string => {
  switch (status) {
    case NotificationStatus.DRAFT:
      return 'Nháp';
    case NotificationStatus.SCHEDULED:
      return 'Đã lên lịch';
    case NotificationStatus.SENT:
      return 'Đã gửi';
    default:
      return status;
  }
};

export const getStatusColor = (status: NotificationStatus): string => {
  switch (status) {
    case NotificationStatus.DRAFT:
      return 'bg-gray-400';
    case NotificationStatus.SCHEDULED:
      return 'bg-orange-500';
    case NotificationStatus.SENT:
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

export const getTargetTypeLabel = (targetType: TargetType): string => {
  switch (targetType) {
    case TargetType.ALL:
      return 'Toàn trường';
    case TargetType.STUDENT:
      return 'Sinh viên';
    case TargetType.LECTURER:
      return 'Giảng viên';
    case TargetType.CLASS:
      return 'Theo lớp';
    case TargetType.COURSE:
      return 'Theo môn học';
    case TargetType.USER:
      return 'Cá nhân';
    default:
      return targetType;
  }
};
