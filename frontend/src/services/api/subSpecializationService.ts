import axios from 'axios';
import { API_URL } from './config';
import { SubSpecialization, SubSpecializationSearchParams, SubSpecializationCreateRequest } from '../../types/subspecialization';
import { Course } from '../../types/course';
import { Page } from '../../types/major';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const subSpecializationService = {
    getSubSpecializationsBySpecialization: async (specId: number): Promise<SubSpecialization[]> => {
        const response = await axios.get(`${API_URL}/sub-specializations/by-specialization/${specId}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    getSubSpecializationsBySpecializationPaged: async (specId: number, params: SubSpecializationSearchParams): Promise<Page<SubSpecialization>> => {
        const response = await axios.get(`${API_URL}/sub-specializations/by-specialization/${specId}/paged`, {
            params,
            headers: getAuthHeader()
        });
        return response.data;
    },

    getSubSpecialization: async (id: number): Promise<SubSpecialization> => {
        const response = await axios.get(`${API_URL}/sub-specializations/${id}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    createSubSpecialization: async (data: SubSpecializationCreateRequest): Promise<SubSpecialization> => {
        const response = await axios.post(`${API_URL}/sub-specializations`, data, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    updateSubSpecialization: async (id: number, data: SubSpecializationCreateRequest): Promise<SubSpecialization> => {
        const response = await axios.put(`${API_URL}/sub-specializations/${id}`, data, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    updateStatus: async (id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<SubSpecialization> => {
        const response = await axios.put(`${API_URL}/sub-specializations/${id}/status`, null, {
            params: { status },
            headers: getAuthHeader()
        });
        return response.data;
    },

    deleteSubSpecialization: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/sub-specializations/${id}`, {
            headers: getAuthHeader()
        });
    },

    // Course management
    getCourses: async (subSpecId: number): Promise<Course[]> => {
        const response = await axios.get(`${API_URL}/sub-specializations/${subSpecId}/courses`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    addCourse: async (subSpecId: number, courseId: number, semester: number = 1): Promise<Course> => {
        const response = await axios.post(`${API_URL}/sub-specializations/${subSpecId}/courses/${courseId}`, null, {
            params: { semester },
            headers: getAuthHeader()
        });
        return response.data;
    },

    removeCourse: async (subSpecId: number, courseId: number): Promise<void> => {
        await axios.delete(`${API_URL}/sub-specializations/${subSpecId}/courses/${courseId}`, {
            headers: getAuthHeader()
        });
    },

    reorderCourses: async (subSpecId: number, courseIds: number[]): Promise<void> => {
        await axios.put(`${API_URL}/sub-specializations/${subSpecId}/courses/reorder`, { courseIds }, {
            headers: getAuthHeader()
        });
    }
};
