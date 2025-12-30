// Dashboard Statistics
export interface DashboardStats {
    totalStudents: number;
    totalUsers: number;
    totalAccounts: number;
    totalApplications: number;
    totalBehaviors: number;
}

// Recent Access Log
export interface RecentAccess {
    id: number;
    email: string;
    role: string;
    accessTime: string;
    location: string;
    status: 'Đang hoạt động' | 'Trạng thời' | 'Ngừng hoạt động';
}

// Alert
export interface Alert {
    id: number;
    title: string;
    description: string;
    timestamp: string;
    level: 'info' | 'warning' | 'error';
}

// Notification
export interface Notification {
    id: number;
    title: string;
    description: string;
    timestamp: string;
    isRead: boolean;
}

// System Log
export interface SystemLog {
    id: number;
    title: string;
    description: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

// Region Stats for Vietnam Map
export interface RegionStats {
    region: string;
    active: number;
    inactive: number;
    total: number;
}
