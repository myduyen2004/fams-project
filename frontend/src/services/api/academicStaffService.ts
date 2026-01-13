import apiClient from './authService';
import { AcademicStaffDashboardResponse } from '../../types/dashboard';
import { UserResponse, PageResponse, UserRequest } from './userService';

export interface LecturerResponse extends UserResponse {
    department?: string;
    expertise?: string;
    bio?: string;
    startDate?: string;
    yearsOfExperience?: number;
}

export interface LecturerRequest extends Omit<UserRequest, 'role'> {
    department?: string;
    expertise?: string;
    bio?: string;
}

export const academicStaffService = {
    getDashboardData: async (): Promise<AcademicStaffDashboardResponse> => {
        const response = await apiClient.get<AcademicStaffDashboardResponse>('/academic-staff/dashboard');
        return response.data;
    },

    // Lecturers APIs
    getLecturers: async (params: { search?: string; status?: string; department?: string; hasProfile?: boolean; page?: number; size?: number; sort?: string }) => {
        const response = await apiClient.get<PageResponse<LecturerResponse>>('/academic-staff/lecturers', { params });
        return response.data;
    },

    getLecturerById: async (id: number): Promise<LecturerResponse> => {
        const response = await apiClient.get<LecturerResponse>(`/academic-staff/lecturers/${id}`);
        return response.data;
    },

    getDepartments: async (): Promise<string[]> => {
        const response = await apiClient.get<string[]>('/academic-staff/lecturers/departments');
        return response.data;
    },

    createLecturer: async (data: LecturerRequest, avatar?: File): Promise<UserResponse> => {
        const formData = new FormData();
        const userData = { ...data, role: 'LECTURER' };
        formData.append('user', new Blob([JSON.stringify(userData)], { type: 'application/json' }));
        if (avatar) {
            formData.append('avatar', avatar);
        }
        const response = await apiClient.post<UserResponse>('/academic-staff/lecturers', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    deleteLecturer: async (id: number): Promise<void> => {
        await apiClient.delete(`/academic-staff/lecturers/${id}`);
    },

    deleteLecturers: async (ids: number[]): Promise<void> => {
        await apiClient.delete('/academic-staff/lecturers', { data: ids });
    },

    registerLecturerProfile: async (id: number, data: { department: string; expertise?: string; bio?: string }): Promise<LecturerResponse> => {
        const response = await apiClient.post<LecturerResponse>(`/academic-staff/lecturers/${id}/profile`, data);
        return response.data;
    },

    updateLecturer: async (id: number, data: LecturerRequest, avatar?: File): Promise<LecturerResponse> => {
        const formData = new FormData();
        const userData = { ...data, role: 'LECTURER' };
        formData.append('user', new Blob([JSON.stringify(userData)], { type: 'application/json' }));
        if (avatar) {
            formData.append('avatar', avatar);
        }
        const response = await apiClient.put<LecturerResponse>(`/academic-staff/lecturers/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    importLecturers: async (file: File): Promise<{ created: number; updated: number; failed: number; errors?: string[] }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<{ created: number; updated: number; failed: number; errors?: string[] }>('/academic-staff/lecturers/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    previewImportLecturers: async (file: File): Promise<LecturerImportDTO[]> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<LecturerImportDTO[]>('/academic-staff/lecturers/import/preview', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    saveImportedLecturers: async (dtos: LecturerImportDTO[]): Promise<{ created: number; updated: number; failed: number; errors?: string[] }> => {
        const response = await apiClient.post<{ created: number; updated: number; failed: number; errors?: string[] }>('/academic-staff/lecturers/import/save', dtos);
        return response.data;
    },

    exportLecturers: async (params?: { department?: string; status?: string }): Promise<Blob> => {
        const response = await apiClient.get('/academic-staff/lecturers/export', {
            params,
            responseType: 'blob'
        });
        return response.data;
    },

    // Students APIs
    getStudents: async (params: { search?: string; status?: string; page?: number; size?: number; sort?: string }) => {
        const response = await apiClient.get<PageResponse<UserResponse>>('/academic-staff/students', { params });
        return response.data;
    },

    getStudentById: async (id: number): Promise<UserResponse> => {
        const response = await apiClient.get<UserResponse>(`/academic-staff/students/${id}`);
        return response.data;
    },
};

export interface LecturerImportDTO {
    rowNumber: number;
    code: string;
    fullName: string | null;
    email: string | null;
    phone?: string;
    department: string;
    expertise: string;
    bio: string;
    status: 'VALID' | 'ERROR';
    errorMessage?: string;
}
