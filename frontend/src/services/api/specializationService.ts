import axios from 'axios';
import { API_URL } from './config';
import { Specialization, SpecializationSearchParams, SpecializationCreateRequest } from '../../types/specialization';
import { Page } from '../../types/major';

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

    importSpecializations: async (majorId: number, file: File): Promise<Specialization[]> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_URL}/specializations/import/${majorId}`, formData, {
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};
