export enum NewsStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT'
}

export enum NewsType {
  SYSTEM = 'SYSTEM',
  ACADEMIC = 'ACADEMIC',
  ATTENDANCE = 'ATTENDANCE',
  GRADE = 'GRADE',
  CHAT = 'CHAT',
  SCHEDULE = 'SCHEDULE',
  EVENT = 'EVENT',
  IMPORTANT = 'IMPORTANT',
  OTHER = 'OTHER'
}

export enum NewsTargetType {
  ALL = 'ALL',
  STUDENT = 'STUDENT',
  LECTURER = 'LECTURER',
  ACADEMIC_STAFF = 'ACADEMIC_STAFF',
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface NewsItem {
  id: number;
  title: string;
  content: string;
  targetType: NewsTargetType;
  type?: NewsType;
  senderName: string;
  senderAvatar?: string | null;
  status: NewsStatus;
  publishedAt?: string | null;
  createdAt: string;
  scheduledAt?: string | null;
  thumbnailImage?: string | null;
  attachmentUrls: string[];
}

export interface NewsRequest {
  title: string;
  content: string;
  targetType: NewsTargetType;
  type?: NewsType;
  status?: NewsStatus;
  scheduledAt?: string;
  thumbnailImage?: string;
  attachmentUrls?: string[];
}

export interface NewsPageResponse {
  content: NewsItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface NewsAdminFilter {
  search?: string;
  targetType?: NewsTargetType | 'ALL';
  status?: NewsStatus | 'ALL';
  page: number;
  size: number;
}
