import apiClient from './apiClient';
import { AcademicStaffDashboardResponse } from '../../types/dashboard';
import { UserResponse, PageResponse, UserRequest } from './userService';

export interface LecturerResponse extends UserResponse {
    department?: string;
    expertise?: string;
    bio?: string;
    startDate?: string;
    yearsOfExperience?: number;
    major?: string;
    specialization?: string;
}

export interface ScheduleRequestResponse {
    id: number;
    requesterId: number;
    requesterName: string;
    requesterCode: string;
    requesterAvatar: string;
    requesterRole: string;
    className: string;
    type: string;
    typeLabel: string; // Tiếng Việt
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
    statusLabel: string; // Tiếng Việt
    approverName?: string;
    approverAvatar?: string;
    createdAt: string;
    approvedAt?: string;
    approverNote?: string;
    originalSlotId?: number;
    originalSlotInfo?: string;
    originalSlotNumber?: number;
    originalRoomName?: string;
    originalDate?: string;
    requestedSlotId?: number;
    requestedSlotInfo?: string;
    requestedSlotNumber?: number;
    requestedRoomName?: string;
    requestedDate?: string;
    requesterEmail?: string;
    requesterMajor?: string;
    file?: string;
}

export interface AcademicRequestResponse {
    id: number;
    studentId: number;
    studentName: string;
    studentCode: string;
    studentAvatar: string;
    studentMajor: string;
    requestType: string;
    requestTypeLabel: string;
    requestTitle: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    statusLabel: string;
    createdAt: string;
    reason?: string;
    fileUrl?: string;
}

export interface LecturerRequest extends Omit<UserRequest, 'role'> {
    department?: string;
    expertise?: string;
    bio?: string;
    major?: string;
    specialization?: string;
}

export interface SystemLogItem {
    id: number;
    title: string;
    description: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error';
    source?: string;
    performerName?: string;
    performerAvatar?: string;
    performerRole?: string;
    ipAddress?: string;
    userAgent?: string;
    oldValue?: string;
    newValue?: string;
}

export const academicStaffService = {
    getDashboardData: async (startDate?: string): Promise<AcademicStaffDashboardResponse> => {
        const response = await apiClient.get<AcademicStaffDashboardResponse>('/v1/academic-staff/dashboard', {
            params: { startDate }
        });
        return response.data;
    },

    getWeeklyAttendance: async (startDate?: string): Promise<AcademicStaffDashboardResponse['weeklyAttendance']> => {
        const response = await apiClient.get<AcademicStaffDashboardResponse['weeklyAttendance']>('/v1/academic-staff/dashboard/weekly-attendance', {
            params: { startDate }
        });
        return response.data;
    },

    getDailyAttendance: async (date?: string): Promise<AcademicStaffDashboardResponse['attendanceStats']> => {
        const response = await apiClient.get<AcademicStaffDashboardResponse['attendanceStats']>('/v1/academic-staff/dashboard/daily-attendance', {
            params: { date }
        });
        return response.data;
    },

    getSystemLogs: async (params: {
        page?: number;
        size?: number;
        search?: string;
        type?: string;
        role?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{ content: SystemLogItem[]; totalPages: number; totalElements: number }> => {
        const response = await apiClient.get<{ content: SystemLogItem[]; totalPages: number; totalElements: number }>('/v1/academic-staff/dashboard/system-logs', {
            params
        });
        return response.data;
    },

    // Lecturers APIs
    getLecturers: async (params: { search?: string; status?: string; department?: string; major?: string; specialization?: string; hasProfile?: boolean; page?: number; size?: number; sort?: string }) => {
        const response = await apiClient.get<PageResponse<LecturerResponse>>('/v1/academic-staff/lecturers', { params });
        return response.data;
    },

    getLecturerById: async (id: number): Promise<LecturerResponse> => {
        const response = await apiClient.get<LecturerResponse>(`/v1/academic-staff/lecturers/${id}`);
        return response.data;
    },

    getDepartments: async (): Promise<string[]> => {
        const response = await apiClient.get<string[]>('/v1/academic-staff/lecturers/departments');
        return response.data;
    },

    createLecturer: async (data: LecturerRequest, avatar?: File): Promise<UserResponse> => {
        const formData = new FormData();
        const userData = { ...data, role: 'LECTURER' };
        formData.append('user', new Blob([JSON.stringify(userData)], { type: 'application/json' }));
        if (avatar) {
            formData.append('avatar', avatar);
        }
        const response = await apiClient.post<UserResponse>('/v1/academic-staff/lecturers', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    deleteLecturer: async (id: number): Promise<void> => {
        await apiClient.delete(`/v1/academic-staff/lecturers/${id}`);
    },

    deleteLecturers: async (ids: number[]): Promise<void> => {
        await apiClient.delete('/v1/academic-staff/lecturers', { data: ids });
    },

    registerLecturerProfile: async (id: number, data: { department: string; expertise?: string; bio?: string }): Promise<LecturerResponse> => {
        const response = await apiClient.post<LecturerResponse>(`/v1/academic-staff/lecturers/${id}/profile`, data);
        return response.data;
    },

    updateLecturer: async (id: number, data: LecturerRequest, avatar?: File): Promise<LecturerResponse> => {
        const formData = new FormData();
        const userData = { ...data, role: 'LECTURER' };
        formData.append('user', new Blob([JSON.stringify(userData)], { type: 'application/json' }));
        if (avatar) {
            formData.append('avatar', avatar);
        }
        const response = await apiClient.put<LecturerResponse>(`/v1/academic-staff/lecturers/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    importLecturers: async (file: File): Promise<{ created: number; updated: number; failed: number; errors?: string[] }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<{ created: number; updated: number; failed: number; errors?: string[] }>('/v1/academic-staff/lecturers/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    previewImportLecturers: async (file: File): Promise<LecturerImportDTO[]> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<LecturerImportDTO[]>('/v1/academic-staff/lecturers/import/preview', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    saveImportedLecturers: async (dtos: LecturerImportDTO[]): Promise<{ created: number; updated: number; failed: number; errors?: string[] }> => {
        const response = await apiClient.post<{ created: number; updated: number; failed: number; errors?: string[] }>('/v1/academic-staff/lecturers/import/save', dtos);
        return response.data;
    },

    exportLecturers: async (params?: { department?: string; major?: string; specialization?: string; status?: string }): Promise<Blob> => {
        const response = await apiClient.get('/v1/academic-staff/lecturers/export', {
            params,
            responseType: 'blob'
        });
        return response.data;
    },

    // Students APIs
    getStudents: async (params: { search?: string; status?: string; major?: string; specialization?: string; subSpecialization?: string; page?: number; size?: number; sort?: string }) => {
        const response = await apiClient.get<PageResponse<StudentResponse>>('/v1/academic-staff/students', { params });
        return response.data;
    },

    getStudentById: async (id: number): Promise<StudentResponse> => {
        const response = await apiClient.get<StudentResponse>(`/v1/academic-staff/students/${id}`);
        return response.data;
    },

    updateStudent: async (id: number, data: StudentUpdateRequest, avatar?: File): Promise<StudentResponse> => {
        const formData = new FormData();
        const userData = { ...data, role: 'STUDENT' };
        formData.append('user', new Blob([JSON.stringify(userData)], { type: 'application/json' }));
        if (avatar) {
            formData.append('avatar', avatar);
        }
        const response = await apiClient.put<StudentResponse>(`/v1/academic-staff/students/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    deleteStudent: async (id: number): Promise<void> => {
        await apiClient.delete(`/v1/academic-staff/students/${id}`);
    },

    deleteStudents: async (ids: number[]): Promise<void> => {
        await apiClient.delete('/v1/academic-staff/students', { data: ids });
    },

    importStudents: async (file: File): Promise<{ created: number; updated: number; failed: number; errors?: string[] }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<{ created: number; updated: number; failed: number; errors?: string[] }>('/v1/academic-staff/students/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    previewImportStudents: async (file: File): Promise<StudentImportDTO[]> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<StudentImportDTO[]>('/v1/academic-staff/students/import/preview', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    saveImportedStudents: async (dtos: StudentImportDTO[]): Promise<{ created: number; updated: number; failed: number; errors?: string[] }> => {
        const response = await apiClient.post<{ created: number; updated: number; failed: number; errors?: string[] }>('/v1/academic-staff/students/import/save', dtos);
        return response.data;
    },

    exportStudents: async (params?: { major?: string; specialization?: string; subSpecialization?: string; status?: string }): Promise<Blob> => {
        const response = await apiClient.get('/v1/academic-staff/students/export', {
            params,
            responseType: 'blob'
        });
        return response.data;
    },

    getAllMajors: async (): Promise<string[]> => {
        const response = await apiClient.get<string[]>('/v1/academic-staff/majors-list');
        return response.data;
    },

    getAllSpecializations: async (): Promise<string[]> => {
        const response = await apiClient.get<string[]>('/v1/academic-staff/specializations-list');
        return response.data;
    },

    getSpecializationsByMajor: async (majorName: string): Promise<string[]> => {
        const response = await apiClient.get<string[]>('/v1/academic-staff/specializations-by-major', { params: { majorName } });
        return response.data;
    },

    getSubSpecializationsBySpecialization: async (specializationName: string): Promise<string[]> => {
        const response = await apiClient.get<string[]>('/v1/academic-staff/sub-specializations-by-specialization', { params: { specializationName } });
        return response.data;
    },

    // Schedule Requests APIs
    getScheduleRequests: async (params: {
        search?: string;
        role?: string;
        reason?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        size?: number;
        sort?: string
    }) => {
        const response = await apiClient.get<PageResponse<ScheduleRequestResponse>>('/v1/academic-staff/schedule-requests', { params });
        return response.data;
    },

    getScheduleRequestStats: async () => {
        const response = await apiClient.get<Record<string, number>>('/v1/academic-staff/schedule-requests/stats');
        return response.data;
    },

    updateScheduleRequestStatus: async (id: number, status: string, note?: string): Promise<ScheduleRequestResponse> => {
        const response = await apiClient.put<ScheduleRequestResponse>(`/v1/academic-staff/schedule-requests/${id}/status`, { status, note });
        return response.data;
    },

    exportScheduleRequests: async (params?: any): Promise<Blob> => {
        console.log('[Service] Calling export with params:', params);
        const response = await apiClient.get('/v1/academic-staff/schedule-requests/export', {
            params,
            responseType: 'blob'
        });
        console.log('[Service] Response received:', response);
        console.log('[Service] Response data type:', response.data?.constructor?.name);
        console.log('[Service] Response data:', response.data);
        return response.data;
    },

    getScheduleRequestById: async (id: number): Promise<ScheduleRequestResponse> => {
        const response = await apiClient.get<ScheduleRequestResponse>(`/v1/academic-staff/schedule-requests/${id}`);
        return response.data;
    },

    getAcademicRequests: async (params: {
        search?: string;
        status?: string;
        requestType?: string;
        page?: number;
        size?: number;
        sort?: string
    }) => {
        const response = await apiClient.get<PageResponse<AcademicRequestResponse>>('/v1/academic-requests', { params });
        return response.data;
    },
};

export interface LecturerImportDTO {
    rowNumber: number;
    code: string;
    fullName: string | null;
    email: string | null;
    phone?: string;
    department?: string;
    major?: string;
    specialization?: string;
    expertise?: string;
    bio?: string;
    status: 'VALID' | 'ERROR';
    errorMessage?: string;
}

export interface StudentResponse extends UserResponse {
    major?: string;
    specialization?: string;
    subSpecialization?: string;
    course?: string;
    gpa?: number;
}

export interface StudentUpdateRequest extends UserRequest {
    major?: string;
    specialization?: string;
    subSpecialization?: string;
    course?: string;
    gpa?: number;
}

export interface StudentImportDTO {
    rowNumber: number;
    code: string;
    fullName: string | null;
    email: string | null;
    phone?: string;
    major?: string;
    specialization?: string;
    subSpecialization?: string;
    course?: string;
    gpa?: number;
    status: 'VALID' | 'ERROR';
    errorMessage?: string;
}
