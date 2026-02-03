import axios from 'axios';
import { API_URL } from './config';
import { Course, CourseSearchParams, CourseCreateRequest, CourseImportDTO } from '../../types/course';
import { Page } from '../../types/major';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const courseService = {
    getCourses: async (params: CourseSearchParams): Promise<Page<Course>> => {
        const response = await axios.get(`${API_URL}/courses`, {
            params,
            headers: getAuthHeader()
        });
        return response.data;
    },

    getCourse: async (id: number): Promise<Course> => {
        const response = await axios.get(`${API_URL}/courses/${id}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    createCourse: async (data: CourseCreateRequest): Promise<Course> => {
        const response = await axios.post(`${API_URL}/courses`, data, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    updateCourse: async (id: number, data: CourseCreateRequest): Promise<Course> => {
        const response = await axios.put(`${API_URL}/courses/${id}`, data, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    updateStatus: async (id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<Course> => {
        const response = await axios.put(`${API_URL}/courses/${id}/status`, null, {
            params: { status },
            headers: getAuthHeader()
        });
        return response.data;
    },

    deleteCourse: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/courses/${id}`, {
            headers: getAuthHeader()
        });
    },

    searchCourses: async (keyword: string, limit: number = 1000): Promise<Course[]> => {
        const response = await axios.get(`${API_URL}/courses/search`, {
            params: { keyword, limit },
            headers: getAuthHeader()
        });
        return response.data;
    },

    searchCoursesNotInSpecialization: async (specId: number, keyword: string, limit: number = 1000): Promise<Course[]> => {
        const response = await axios.get(`${API_URL}/courses/search/not-in-specialization/${specId}`, {
            params: { keyword, limit },
            headers: getAuthHeader()
        });
        return response.data;
    },

    searchCoursesNotInSubSpecialization: async (subSpecId: number, keyword: string, limit: number = 1000): Promise<Course[]> => {
        const response = await axios.get(`${API_URL}/courses/search/not-in-sub-specialization/${subSpecId}`, {
            params: { keyword, limit },
            headers: getAuthHeader()
        });
        return response.data;
    },

    // Import/Export methods
    previewImportCourses: async (file: File): Promise<CourseImportDTO[]> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post<CourseImportDTO[]>(`${API_URL}/courses/import/preview`, formData, {
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    saveImportedCourses: async (dtos: CourseImportDTO[]): Promise<{ created: number; failed: number; errors?: string[] }> => {
        const response = await axios.post<{ created: number; failed: number; errors?: string[] }>(`${API_URL}/courses/import/save`, dtos, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    exportCourses: async (params?: { status?: string }): Promise<Blob> => {
        const response = await axios.get(`${API_URL}/courses/export`, {
            params,
            headers: getAuthHeader(),
            responseType: 'blob'
        });
        return response.data;
    },

    downloadImportTemplate: async (): Promise<Blob> => {
        const response = await axios.get(`${API_URL}/courses/import/template`, {
            headers: getAuthHeader(),
            responseType: 'blob'
        });
        return response.data;
    }
};
