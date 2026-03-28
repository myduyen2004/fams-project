import apiClient from './apiClient';

// Types
export interface GradeComponent {
    id: number;
    name: string;
    description?: string;
    type: GradeType;
    weight: number;
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

export const gradeComponentService = {
    /**
     * Get all grade components for a course
     */
    getGradeComponents: async (courseId: number): Promise<GradeComponent[]> => {
        const response = await apiClient.get(`/courses/${courseId}/grade-components`);
        return response.data;
    },

    /**
     * Get grade configuration summary for a course
     */
    getGradeConfigSummary: async (courseId: number): Promise<GradeConfigSummary> => {
        const response = await apiClient.get(`/courses/${courseId}/grade-config`);
        return response.data;
    },

    /**
     * Get main (non-resit) grade components for a course
     */
    getMainComponents: async (courseId: number): Promise<GradeComponent[]> => {
        const response = await apiClient.get(`/courses/${courseId}/grade-components/main`);
        return response.data;
    },

    /**
     * Get resit grade components for a course
     */
    getResitComponents: async (courseId: number): Promise<GradeComponent[]> => {
        const response = await apiClient.get(`/courses/${courseId}/grade-components/resit`);
        return response.data;
    },

    /**
     * Get total weight of main components
     */
    getTotalWeight: async (courseId: number): Promise<{ courseId: number; totalWeight: number; isValid: boolean }> => {
        const response = await apiClient.get(`/courses/${courseId}/grade-components/total-weight`);
        return response.data;
    },

    /**
     * Create a new grade component
     */
    createGradeComponent: async (courseId: number, data: GradeComponentRequest): Promise<GradeComponent> => {
        const response = await apiClient.post(`/courses/${courseId}/grade-components`, data);
        return response.data;
    },

    /**
     * Update a grade component
     */
    updateGradeComponent: async (id: number, data: GradeComponentRequest): Promise<GradeComponent> => {
        const response = await apiClient.put(`/grade-components/${id}`, data);
        return response.data;
    },

    /**
     * Delete a grade component
     */
    deleteGradeComponent: async (id: number): Promise<void> => {
        await apiClient.delete(`/grade-components/${id}`);
    },

    /**
     * Duplicate a grade component
     */
    duplicateGradeComponent: async (id: number): Promise<GradeComponent> => {
        const response = await apiClient.post(`/grade-components/${id}/duplicate`);
        return response.data;
    },

    /**
     * Import grade components from Excel data
     */
    importGradeComponents: async (rows: Record<string, unknown>[]): Promise<{
        created: number;
        updated: number;
        failed: number;
        errors: string[];
    }> => {
        const response = await apiClient.post(`/grade-components/import`, rows);
        return response.data;
    }
};
