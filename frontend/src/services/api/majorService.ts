import apiClient from './apiClient';
import { Major, MajorCreateRequest, MajorSearchParams, MajorImportDTO, MajorImportResult, Page } from '../../types/major';
import { Course } from '../../types/course';

export const majorService = {
    getMajors: async (params: MajorSearchParams): Promise<Page<Major>> => {
        const response = await apiClient.get('/v1/majors', {
            params
        });
        return response.data;
    },

    getMajor: async (id: number): Promise<Major> => {
        const response = await apiClient.get(`/v1/majors/${id}`);
        return response.data;
    },

    createMajor: async (majorData: MajorCreateRequest): Promise<Major> => {
        const response = await apiClient.post('/v1/majors', majorData);
        return response.data;
    },

    updateMajor: async (id: number, majorData: MajorCreateRequest): Promise<Major> => {
        const response = await apiClient.put(`/v1/majors/${id}`, majorData);
        return response.data;
    },

    deleteMajor: async (id: number): Promise<void> => {
        await apiClient.delete(`/v1/majors/${id}`);
    },

    updateStatus: async (id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<Major> => {
        const response = await apiClient.put(`/v1/majors/${id}/status`, null, {
            params: { status }
        });
        return response.data;
    },

    importMajors: async (file: File): Promise<MajorImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<MajorImportResult>('/v1/majors/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    previewImportMajors: async (file: File): Promise<MajorImportDTO[]> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<MajorImportDTO[]>('/v1/majors/import/preview', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    saveImportedMajors: async (dtos: MajorImportDTO[]): Promise<MajorImportResult> => {
        const response = await apiClient.post<MajorImportResult>('/v1/majors/import/save', dtos);
        return response.data;
    },

    downloadImportTemplate: async (): Promise<Blob> => {
        const response = await apiClient.get('/v1/majors/import/template', {
            responseType: 'blob'
        });
        return response.data;
    },

    searchMajors: async (keyword: string, size: number = 20): Promise<Page<Major>> => {
        const response = await apiClient.get('/v1/majors', {
            params: { keyword, size }
        });
        return response.data;
    },

    getCourses: async (majorId: number): Promise<Course[]> => {
        const response = await apiClient.get(`/v1/majors/${majorId}/courses`);
        return response.data;
    }
};
