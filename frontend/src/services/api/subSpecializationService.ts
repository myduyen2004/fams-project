import apiClient from './authService';
import { SubSpecialization, SubSpecializationSearchParams, SubSpecializationCreateRequest } from '../../types/subspecialization';
import { Course } from '../../types/course';
import { Page } from '../../types/major';

export const subSpecializationService = {
    getSubSpecializationsBySpecialization: async (specId: number): Promise<SubSpecialization[]> => {
        const response = await apiClient.get(`/sub-specializations/by-specialization/${specId}`);
        return response.data;
    },

    getSubSpecializationsBySpecializationPaged: async (specId: number, params: SubSpecializationSearchParams): Promise<Page<SubSpecialization>> => {
        const response = await apiClient.get(`/sub-specializations/by-specialization/${specId}/paged`, {
            params
        });
        return response.data;
    },

    getSubSpecialization: async (id: number): Promise<SubSpecialization> => {
        const response = await apiClient.get(`/sub-specializations/${id}`);
        return response.data;
    },

    createSubSpecialization: async (data: SubSpecializationCreateRequest): Promise<SubSpecialization> => {
        const response = await apiClient.post('/sub-specializations', data);
        return response.data;
    },

    updateSubSpecialization: async (id: number, data: SubSpecializationCreateRequest): Promise<SubSpecialization> => {
        const response = await apiClient.put(`/sub-specializations/${id}`, data);
        return response.data;
    },

    updateStatus: async (id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<SubSpecialization> => {
        const response = await apiClient.put(`/sub-specializations/${id}/status`, null, {
            params: { status }
        });
        return response.data;
    },

    deleteSubSpecialization: async (id: number): Promise<void> => {
        await apiClient.delete(`/sub-specializations/${id}`);
    },

    // Course management
    getCourses: async (subSpecId: number): Promise<Course[]> => {
        const response = await apiClient.get(`/sub-specializations/${subSpecId}/courses`);
        return response.data;
    },

    addCourse: async (subSpecId: number, courseId: number, semester: number = 1): Promise<Course> => {
        const response = await apiClient.post(`/sub-specializations/${subSpecId}/courses/${courseId}`, null, {
            params: { semester }
        });
        return response.data;
    },

    removeCourse: async (subSpecId: number, courseId: number): Promise<void> => {
        await apiClient.delete(`/sub-specializations/${subSpecId}/courses/${courseId}`);
    },

    reorderCourses: async (subSpecId: number, courseIds: number[]): Promise<void> => {
        await apiClient.put(`/sub-specializations/${subSpecId}/courses/reorder`, { courseIds });
    },

    addCoursesBulk: async (subSpecId: number, courseIds: number[], semester: number = 1): Promise<Course[]> => {
        const response = await apiClient.post(`/sub-specializations/${subSpecId}/courses/bulk`, {
            courseIds,
            semester
        });
        return response.data;
    }
};
