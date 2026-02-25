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
    type?: 'SYSTEM' | 'ALERT' | 'IMPORT' | 'CHAT' | 'SCHEDULE' | 'ACADEMIC';
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
    type: string;
    timestamp: string;
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
    notifications: NotificationResponse[];
    attendanceStats: {
        present: number;
        absent: number;
        date: string;
    };
    roomRequests: {
        room: string;
        date: string;
    }[];
}
