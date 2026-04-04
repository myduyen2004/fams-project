import apiClient from './apiClient';
import { Course, CourseSearchParams, CourseCreateRequest, CourseImportDTO, CoursePrerequisite } from '../../types/course';
import { Page } from '../../types/major';

export const courseService = {
    getCourses: async (params: CourseSearchParams): Promise<Page<Course>> => {
        const response = await apiClient.get('/courses', {
            params
        });
        return response.data;
    },

    getCourse: async (id: number): Promise<Course> => {
        const response = await apiClient.get(`/courses/${id}`);
        return response.data;
    },

    createCourse: async (data: CourseCreateRequest): Promise<Course> => {
        const response = await apiClient.post('/courses', data);
        return response.data;
    },

    updateCourse: async (id: number, data: CourseCreateRequest): Promise<Course> => {
        const response = await apiClient.put(`/courses/${id}`, data);
        return response.data;
    },

    updateStatus: async (id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<Course> => {
        const response = await apiClient.put(`/courses/${id}/status`, null, {
            params: { status }
        });
        return response.data;
    },

    updateGpaStatus: async (id: number, isCalculatedInGpa: boolean): Promise<Course> => {
        const response = await apiClient.put(`/courses/${id}/gpa-status`, null, {
            params: { isCalculatedInGpa }
        });
        return response.data;
    },

    deleteCourse: async (id: number): Promise<void> => {
        await apiClient.delete(`/courses/${id}`);
    },

    searchCourses: async (keyword: string, limit: number = 1000): Promise<Course[]> => {
        const response = await apiClient.get('/courses/search', {
            params: { keyword, limit }
        });
        return response.data;
    },

    searchCoursesNotInSpecialization: async (specId: number, keyword: string, limit: number = 1000): Promise<Course[]> => {
        const response = await apiClient.get(`/courses/search/not-in-specialization/${specId}`, {
            params: { keyword, limit }
        });
        return response.data;
    },

    searchCoursesNotInSubSpecialization: async (subSpecId: number, keyword: string, limit: number = 1000): Promise<Course[]> => {
        const response = await apiClient.get(`/courses/search/not-in-sub-specialization/${subSpecId}`, {
            params: { keyword, limit }
        });
        return response.data;
    },

    // Import/Export methods
    previewImportCourses: async (file: File): Promise<CourseImportDTO[]> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<CourseImportDTO[]>('/courses/import/preview', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    saveImportedCourses: async (dtos: CourseImportDTO[]): Promise<{ created: number; failed: number; errors?: string[] }> => {
        const response = await apiClient.post<{ created: number; failed: number; errors?: string[] }>('/courses/import/save', dtos);
        return response.data;
    },

    exportCourses: async (params?: { status?: string }): Promise<Blob> => {
        const response = await apiClient.get('/courses/export', {
            params,
            responseType: 'blob'
        });
        return response.data;
    },

    // Prerequisite methods
    getPrerequisites: async (courseId: number): Promise<CoursePrerequisite[]> => {
        const response = await apiClient.get(`/courses/${courseId}/prerequisites`);
        return response.data;
    },

    addPrerequisite: async (courseId: number, prereqId: number): Promise<CoursePrerequisite[]> => {
        const response = await apiClient.post(`/courses/${courseId}/prerequisites/${prereqId}`, null);
        return response.data;
    },

    removePrerequisite: async (courseId: number, prereqId: number): Promise<CoursePrerequisite[]> => {
        const response = await apiClient.delete(`/courses/${courseId}/prerequisites/${prereqId}`);
        return response.data;
    },

    downloadImportTemplate: async (): Promise<Blob> => {
        const response = await apiClient.get('/courses/import/template', {
            responseType: 'blob'
        });
        return response.data;
    }
};
