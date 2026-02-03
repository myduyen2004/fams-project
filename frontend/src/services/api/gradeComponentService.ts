import axios from 'axios';
import { API_URL } from './config';

// Types
export interface GradeComponent {
    id: number;
    name: string;
    description?: string;
    type: GradeType;
    weight: number;
    isRequired: boolean;
    isResit: boolean;
    referenceComponentId?: number;
    referenceComponentName?: string;
    courseId: number;
    courseCode?: string;
    courseName?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type GradeType =
    | 'PROGRESS_TEST'
    | 'ASSIGNMENT'
    | 'QUIZ'
    | 'WORKSHOP'
    | 'PARTICIPATION'
    | 'MID_TERM'
    | 'PRACTICAL_EXAM'
    | 'FINAL_EXAM'
    | 'PROJECT'
    | 'PRESENTATION'
    | 'RESIT'
    | 'OTHER';

export interface GradeComponentRequest {
    name: string;
    description?: string;
    type: GradeType;
    weight: number;
    isRequired?: boolean;
    isResit?: boolean;
    referenceComponentId?: number;
}

export interface GradeConfigSummary {
    courseId: number;
    courseCode: string;
    courseName: string;
    mainComponents: GradeComponent[];
    resitComponents: GradeComponent[];
    totalWeight: number;
    isValidConfig: boolean;
}

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const gradeComponentService = {
    /**
     * Get all grade components for a course
     */
    getGradeComponents: async (courseId: number): Promise<GradeComponent[]> => {
        const response = await axios.get(`${API_URL}/courses/${courseId}/grade-components`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    /**
     * Get grade configuration summary for a course
     */
    getGradeConfigSummary: async (courseId: number): Promise<GradeConfigSummary> => {
        const response = await axios.get(`${API_URL}/courses/${courseId}/grade-config`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    /**
     * Get main (non-resit) grade components for a course
     */
    getMainComponents: async (courseId: number): Promise<GradeComponent[]> => {
        const response = await axios.get(`${API_URL}/courses/${courseId}/grade-components/main`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    /**
     * Get resit grade components for a course
     */
    getResitComponents: async (courseId: number): Promise<GradeComponent[]> => {
        const response = await axios.get(`${API_URL}/courses/${courseId}/grade-components/resit`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    /**
     * Get total weight of main components
     */
    getTotalWeight: async (courseId: number): Promise<{ courseId: number; totalWeight: number; isValid: boolean }> => {
        const response = await axios.get(`${API_URL}/courses/${courseId}/grade-components/total-weight`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    /**
     * Create a new grade component
     */
    createGradeComponent: async (courseId: number, data: GradeComponentRequest): Promise<GradeComponent> => {
        const response = await axios.post(`${API_URL}/courses/${courseId}/grade-components`, data, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    /**
     * Update a grade component
     */
    updateGradeComponent: async (id: number, data: GradeComponentRequest): Promise<GradeComponent> => {
        const response = await axios.put(`${API_URL}/grade-components/${id}`, data, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    /**
     * Delete a grade component
     */
    deleteGradeComponent: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/grade-components/${id}`, {
            headers: getAuthHeader()
        });
    },

    /**
     * Duplicate a grade component
     */
    duplicateGradeComponent: async (id: number): Promise<GradeComponent> => {
        const response = await axios.post(`${API_URL}/grade-components/${id}/duplicate`, null, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    /**
     * Toggle isRequired for a grade component
     */
    toggleRequired: async (id: number): Promise<GradeComponent> => {
        const response = await axios.patch(`${API_URL}/grade-components/${id}/toggle-required`, null, {
            headers: getAuthHeader()
        });
        return response.data;
    }
};
