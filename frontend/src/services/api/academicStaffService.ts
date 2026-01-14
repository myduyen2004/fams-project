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
    getStudents: async (params: { search?: string; status?: string; major?: string; specialization?: string; page?: number; size?: number; sort?: string }) => {
        const response = await apiClient.get<PageResponse<StudentResponse>>('/academic-staff/students', { params });
        return response.data;
    },

    getStudentById: async (id: number): Promise<StudentResponse> => {
        const response = await apiClient.get<StudentResponse>(`/academic-staff/students/${id}`);
        return response.data;
    },

    updateStudent: async (id: number, data: StudentUpdateRequest, avatar?: File): Promise<StudentResponse> => {
        const formData = new FormData();
        const userData = { ...data, role: 'STUDENT' };
        formData.append('user', new Blob([JSON.stringify(userData)], { type: 'application/json' }));
        if (avatar) {
            formData.append('avatar', avatar);
        }
        const response = await apiClient.put<StudentResponse>(`/academic-staff/students/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    deleteStudent: async (id: number): Promise<void> => {
        await apiClient.delete(`/academic-staff/students/${id}`);
    },

    deleteStudents: async (ids: number[]): Promise<void> => {
        await apiClient.delete('/academic-staff/students', { data: ids });
    },

    importStudents: async (file: File): Promise<{ created: number; updated: number; failed: number; errors?: string[] }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<{ created: number; updated: number; failed: number; errors?: string[] }>('/academic-staff/students/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    previewImportStudents: async (file: File): Promise<StudentImportDTO[]> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<StudentImportDTO[]>('/academic-staff/students/import/preview', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    saveImportedStudents: async (dtos: StudentImportDTO[]): Promise<{ created: number; updated: number; failed: number; errors?: string[] }> => {
        const response = await apiClient.post<{ created: number; updated: number; failed: number; errors?: string[] }>('/academic-staff/students/import/save', dtos);
        return response.data;
    },

    exportStudents: async (params?: { major?: string; specialization?: string; subSpecialization?: string; status?: string }): Promise<Blob> => {
        const response = await apiClient.get('/academic-staff/students/export', {
            params,
            responseType: 'blob'
        });
        return response.data;
    },

    getAllMajors: async (): Promise<string[]> => {
        const response = await apiClient.get<string[]>('/academic-staff/majors-list');
        return response.data;
    },

    getAllSpecializations: async (): Promise<string[]> => {
        const response = await apiClient.get<string[]>('/academic-staff/specializations-list');
        return response.data;
    },

    getSpecializationsByMajor: async (majorName: string): Promise<string[]> => {
        const response = await apiClient.get<string[]>('/academic-staff/specializations-by-major', { params: { majorName } });
        return response.data;
    },

    getSubSpecializationsBySpecialization: async (specializationName: string): Promise<string[]> => {
        const response = await apiClient.get<string[]>('/academic-staff/sub-specializations-by-specialization', { params: { specializationName } });
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

export interface StudentResponse extends UserResponse {
    major?: string;
    specialization?: string;
    subSpecialization?: string;
    course?: string;
    gpa?: number;
}

export interface StudentUpdateRequest extends Partial<Omit<UserRequest, 'role'>> {
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
