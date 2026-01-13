import axios from 'axios';
import { API_URL } from './config';
import { Major, MajorCreateRequest, MajorSearchParams, MajorImportDTO, MajorImportResult } from '../../types/major';

// Generic Page interface (can be moved to common types later)
interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

// Helper to get auth header
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const majorService = {
    getMajors: async (params: MajorSearchParams): Promise<Page<Major>> => {
        const response = await axios.get(`${API_URL}/majors`, {
            params,
            headers: getAuthHeader()
        });
        return response.data;
    },

    getMajor: async (id: number): Promise<Major> => {
        const response = await axios.get(`${API_URL}/majors/${id}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    createMajor: async (majorData: MajorCreateRequest): Promise<Major> => {
        const response = await axios.post(`${API_URL}/majors`, majorData, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    updateMajor: async (id: number, majorData: MajorCreateRequest): Promise<Major> => {
        const response = await axios.put(`${API_URL}/majors/${id}`, majorData, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    deleteMajor: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/majors/${id}`, {
            headers: getAuthHeader()
        });
    },

    updateStatus: async (id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<Major> => {
        const response = await axios.put(`${API_URL}/majors/${id}/status`, null, {
            params: { status },
            headers: getAuthHeader()
        });
        return response.data;
    },

    importMajors: async (file: File): Promise<MajorImportResult> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post<MajorImportResult>(`${API_URL}/majors/import`, formData, {
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    previewImportMajors: async (file: File): Promise<MajorImportDTO[]> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post<MajorImportDTO[]>(`${API_URL}/majors/import/preview`, formData, {
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    saveImportedMajors: async (dtos: MajorImportDTO[]): Promise<MajorImportResult> => {
        const response = await axios.post<MajorImportResult>(`${API_URL}/majors/import/save`, dtos, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    downloadImportTemplate: async (): Promise<Blob> => {
        const response = await axios.get(`${API_URL}/majors/import/template`, {
            headers: getAuthHeader(),
            responseType: 'blob'
        });
        return response.data;
    }
};
