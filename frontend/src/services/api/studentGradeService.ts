import apiClient from './authService';

export interface GradeComponentInfo {
    id: number;
    name: string;
    type: string;
    weight: number;
    isRequired: boolean;
    isResit: boolean;
}

export interface StudentGradeRow {
    enrollmentId: number;
    studentCode: string;
    studentName: string;
    studentEmail: string;
    enrollmentStatus: string;
    grades: { [gradeComponentId: number]: number | null };
    finalGrade: number | null;
    isPassing: boolean;
}

export interface GradeOverviewResponse {
    className: string;
    courseName: string;
    courseCode: string;
    semesterName: string;
    status: string;
    totalStudents: number;
    gradeComponents: GradeComponentInfo[];
    studentGrades: StudentGradeRow[];
    averageGrade: number | null;
    passRate: number | null;
    lastUpdated: string;
    // Grade submission status
    gradesSubmitted: boolean;
    gradesSubmittedAt: string | null;
    gradesSubmittedByName: string | null;
}

export interface UpdateGradeRequest {
    enrollmentId: number;
    gradeComponentId: number;
    score: number | null;
    note?: string;
}

export interface GradePreviewRow {
    rowNumber: number;
    studentCode: string;
    studentName: string;
    grades: { [componentName: string]: number | null };
    status: 'VALID' | 'ERROR';
    errorMessage: string | null;
}

export interface GradePreviewResponse {
    success: boolean;
    totalRows: number;
    validRows: number;
    errorRows: number;
    canImport: boolean;
    previewRows: GradePreviewRow[];
    componentNames: string[];
    durationMs: number;
    message: string;
}

export const studentGradeService = {
    /**
     * Get grade overview for a class section
     */
    getGradeOverview: async (className: string): Promise<GradeOverviewResponse> => {
        const response = await apiClient.get<GradeOverviewResponse>(`/v1/class-sections/${className}/grades`);
        return response.data;
    },

    /**
     * Update a single student grade
     */
    updateGrade: async (request: UpdateGradeRequest): Promise<void> => {
        await apiClient.put('/v1/student-grades', request);
    },

    /**
     * Batch update student grades
     */
    updateGradesBatch: async (requests: UpdateGradeRequest[]): Promise<void> => {
        await apiClient.post('/v1/student-grades/batch', requests);
    },

    /**
     * Export grades to Excel
     */
    exportGrades: async (className: string): Promise<void> => {
        const response = await apiClient.get(`/v1/class-sections/${className}/grades/export`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `grades_${className}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    /**
     * Preview grades import (validation only)
     */
    previewGrades: async (className: string, file: File): Promise<GradePreviewResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<GradePreviewResponse>(`/v1/class-sections/${className}/grades/preview`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    /**
     * Import grades from Excel
     */
    importGrades: async (className: string, file: File): Promise<{ success: number; failed: number; errors: string[] }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post(`/v1/class-sections/${className}/grades/import`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    /**
     * Submit grades to academic office (locks grades for editing)
     */
    submitGrades: async (className: string): Promise<void> => {
        await apiClient.post(`/v1/class-sections/${className}/grades/submit`);
    }
};
