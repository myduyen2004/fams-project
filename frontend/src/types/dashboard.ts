export interface DashboardStats {
    totalStudents: number;
    totalUsers: number;
    totalAccounts: number;
    totalApplications: number;
    totalBehaviors: number;
}

export interface RecentAccess {
    id: number;
    email: string;
    role: string;
    accessTime: string;
    location: string;
    status: string;
    avatar?: string;
}

export interface Alert {
    id: number;
    title: string;
    description: string;
    level: string;
    isResolved: boolean;
    timestamp: string;
}

export interface AppNotification {
    id: number;
    title: string;
    description: string;
    isRead: boolean;
    timestamp: string;
    type?: 'SYSTEM' | 'ALERT' | 'IMPORT' | 'CHAT' | 'SCHEDULE' | 'ACADEMIC' | 'SUBMISSION' | 'NEWS' | 'NEW_ASSIGNMENT';
    targetUrl?: string;
    senderName?: string;
    senderFullName?: string;
    senderAvatar?: string;
    attachmentUrls?: string[];
}

export interface SystemLog {
    id: number;
    title: string;
    description: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error' | string;
    source?: string;
    performerName?: string;
    performerAvatar?: string;
    performerRole?: string;
    ipAddress?: string;
    userAgent?: string;
    oldValue?: string;
    newValue?: string;
}

export interface NotificationResponse {
    id: number;
    title: string;
    timestamp: string;
}

export interface AcademicStaffDashboardResponse {
    stats: {
        totalStudents: number;
        totalLecturers: number;
        totalRequests: number;
        studentStats: { name: string; value: number }[];
        lecturerStats: { name: string; value: number }[];
    };
    topStudents: {
        rank: number;
        name: string;
        className: string;
        email: string;
        course: string;
        gpa: number;
        attendance: number;
    }[];
    requests: {
        name: string;
        className: string;
        type: string;
        date: string;
        status: string;
    }[];
    notifications: AppNotification[];
    attendanceStats: {
        present: number;
        absent: number;
        date: string;
    };
    runningRooms: {
        roomName: string;
        lecturerName: string;
        attendancePercentage: number;
    }[];
    totalRunningRooms: number;
    roomRequests: {
        room: string;
        date: string;
    }[];
    unreadNotificationsCount?: number;
    weeklyAttendance?: {
        day: string;
        date: string;
        absencePercentage: number;
    }[];
}
