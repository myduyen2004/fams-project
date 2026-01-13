import axios from 'axios';
import { API_URL } from './config';
import { Specialization, SpecializationSearchParams, SpecializationCreateRequest, SpecializationImportDTO, SpecializationImportResult } from '../../types/specialization';
import { Page } from '../../types/major';
import { Course } from '../../types/course';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const specializationService = {
    getSpecializationsByMajor: async (majorId: number, params: SpecializationSearchParams): Promise<Page<Specialization>> => {
        const response = await axios.get(`${API_URL}/specializations/by-major/${majorId}`, {
            params,
            headers: getAuthHeader()
        });
        return response.data;
    },

    getSpecialization: async (id: number): Promise<Specialization> => {
        const response = await axios.get(`${API_URL}/specializations/${id}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    updateStatus: async (id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<Specialization> => {
        const response = await axios.put(`${API_URL}/specializations/${id}/status`, null, {
            params: { status },
            headers: getAuthHeader()
        });
        return response.data;
    },

    createSpecialization: async (data: SpecializationCreateRequest): Promise<Specialization> => {
        const response = await axios.post(`${API_URL}/specializations`, data, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    updateSpecialization: async (id: number, data: SpecializationCreateRequest): Promise<Specialization> => {
        const response = await axios.put(`${API_URL}/specializations/${id}`, data, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    deleteSpecialization: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/specializations/${id}`, {
            headers: getAuthHeader()
        });
    },

    // Import Specializations with Preview
    importSpecializations: async (majorId: number, file: File): Promise<SpecializationImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_URL}/specializations/import/${majorId}`, formData, {
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    previewImportSpecializations: async (majorId: number, file: File): Promise<SpecializationImportDTO[]> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_URL}/specializations/import/preview/${majorId}`, formData, {
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    saveImportedSpecializations: async (majorId: number, dtos: SpecializationImportDTO[]): Promise<SpecializationImportResult> => {
        const response = await axios.post(`${API_URL}/specializations/import/save/${majorId}`, dtos, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    downloadImportTemplate: async (): Promise<void> => {
        const response = await axios.get(`${API_URL}/specializations/import/template`, {
            headers: getAuthHeader(),
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
        const response = await axios.get(`${API_URL}/specializations/${specId}/courses`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    addCourse: async (specId: number, courseId: number, semester: number = 1): Promise<Course> => {
        const response = await axios.post(`${API_URL}/specializations/${specId}/courses/${courseId}`, null, {
            params: { semester },
            headers: getAuthHeader()
        });
        return response.data;
    },

    removeCourse: async (specId: number, courseId: number): Promise<void> => {
        await axios.delete(`${API_URL}/specializations/${specId}/courses/${courseId}`, {
            headers: getAuthHeader()
        });
    },

    reorderCourses: async (specId: number, courseIds: number[]): Promise<void> => {
        await axios.put(`${API_URL}/specializations/${specId}/courses/reorder`, { courseIds }, {
            headers: getAuthHeader()
        });
    }
};
