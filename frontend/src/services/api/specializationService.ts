import apiClient from './apiClient';
import { Specialization, SpecializationSearchParams, SpecializationCreateRequest, SpecializationImportDTO, SpecializationImportResult } from '../../types/specialization';
import { Page } from '../../types/major';
import { Course } from '../../types/course';

export const specializationService = {
    getSpecializationsByMajor: async (majorId: number, params: SpecializationSearchParams): Promise<Page<Specialization>> => {
        const response = await apiClient.get(`/v1/specializations/by-major/${majorId}`, {
            params
        });
        return response.data;
    },

    getSpecialization: async (id: number): Promise<Specialization> => {
        const response = await apiClient.get(`/v1/specializations/${id}`);
        return response.data;
    },

    updateStatus: async (id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<Specialization> => {
        const response = await apiClient.put(`/v1/specializations/${id}/status`, null, {
            params: { status }
        });
        return response.data;
    },

    createSpecialization: async (data: SpecializationCreateRequest): Promise<Specialization> => {
        const response = await apiClient.post('/v1/specializations', data);
        return response.data;
    },

    updateSpecialization: async (id: number, data: SpecializationCreateRequest): Promise<Specialization> => {
        const response = await apiClient.put(`/v1/specializations/${id}`, data);
        return response.data;
    },

    deleteSpecialization: async (id: number): Promise<void> => {
        await apiClient.delete(`/v1/specializations/${id}`);
    },

    // Import Specializations with Preview
    importSpecializations: async (majorId: number, file: File): Promise<SpecializationImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post(`/v1/specializations/import/${majorId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    previewImportSpecializations: async (majorId: number, file: File): Promise<SpecializationImportDTO[]> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post(`/v1/specializations/import/preview/${majorId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    saveImportedSpecializations: async (majorId: number, dtos: SpecializationImportDTO[]): Promise<SpecializationImportResult> => {
        const response = await apiClient.post(`/v1/specializations/import/save/${majorId}`, dtos);
        return response.data;
    },

    previewImportSpecializationsBulk: async (file: File): Promise<SpecializationImportDTO[]> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/v1/specializations/import/preview-bulk', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    saveImportedSpecializationsBulk: async (dtos: SpecializationImportDTO[]): Promise<SpecializationImportResult> => {
        const response = await apiClient.post('/v1/specializations/import/save-bulk', dtos);
        return response.data;
    },

    downloadImportTemplate: async (): Promise<void> => {
        const response = await apiClient.get('/v1/specializations/import/template', {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'specialization_import_template.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    // Course management
    getCourses: async (specId: number): Promise<Course[]> => {
        const response = await apiClient.get(`/v1/specializations/${specId}/courses`);
        return response.data;
    },

    addCourse: async (specId: number, courseId: number, semester: number = 1): Promise<Course> => {
        const response = await apiClient.post(`/v1/specializations/${specId}/courses/${courseId}`, null, {
            params: { semester }
        });
        return response.data;
    },

    removeCourse: async (specId: number, courseId: number): Promise<void> => {
        await apiClient.delete(`/v1/specializations/${specId}/courses/${courseId}`);
    },

    reorderCourses: async (specId: number, courseIds: number[]): Promise<void> => {
        await apiClient.put(`/v1/specializations/${specId}/courses/reorder`, { courseIds });
    },

    addCoursesBulk: async (specId: number, courseIds: number[], semester: number = 1): Promise<Course[]> => {
        const response = await apiClient.post(`/v1/specializations/${specId}/courses/bulk`, {
            courseIds,
            semester
        });
        return response.data;
    }
};
