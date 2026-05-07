import apiClient from './apiClient';
import { StudentResponse } from './academicStaffService';
import { encryptScore, EncryptedScorePayload } from '../../utils/gradeEncryption';

export interface GradeComponentInfo {
    id: number;
    name: string;
    type: string;
    weight: number;
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

/** Encrypted payload sent over the wire instead of raw score */
export interface EncryptedUpdateGradeRequest {
    enrollmentId: number;
    gradeComponentId: number;
    encryptedScore: string | null; // base64 AES-GCM ciphertext + 16-byte auth tag
    iv: string | null;             // base64 12-byte random IV
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

/** Encrypt a single UpdateGradeRequest → EncryptedUpdateGradeRequest */
async function encryptGradeRequest(request: UpdateGradeRequest): Promise<EncryptedUpdateGradeRequest> {
    const payload: EncryptedScorePayload | null = await encryptScore(request.score);
    return {
        enrollmentId: request.enrollmentId,
        gradeComponentId: request.gradeComponentId,
        encryptedScore: payload?.encryptedScore ?? null,
        iv: payload?.iv ?? null,
        note: request.note,
    };
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
     * Update a single student grade (score encrypted with AES-256-GCM before sending)
     */
    updateGrade: async (request: UpdateGradeRequest): Promise<void> => {
        const encrypted = await encryptGradeRequest(request);
        await apiClient.put('/v1/student-grades', encrypted);
    },

    /**
     * Batch update student grades (each score encrypted with AES-256-GCM)
     */
    updateGradesBatch: async (requests: UpdateGradeRequest[]): Promise<void> => {
        const encrypted = await Promise.all(requests.map(encryptGradeRequest));
        await apiClient.post('/v1/student-grades/batch', encrypted);
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
     * Preview grades import (validation only, no DB changes)
     */
    previewGrades: async (className: string, file: File): Promise<GradePreviewResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<GradePreviewResponse>(
            `/v1/class-sections/${className}/grades/preview`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    /**
     * Import grades from Excel
     */
    importGrades: async (className: string, file: File): Promise<{ success: number; failed: number; errors: string[] }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post(
            `/v1/class-sections/${className}/grades/import`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    /**
     * Submit grades to academic office (locks grades for editing)
     */
    submitGrades: async (className: string): Promise<void> => {
        await apiClient.post(`/v1/class-sections/${className}/grades/submit`);
    },

    /**
     * Get basic student information for profile popup
     */
    getStudentInfo: async (studentCode: string): Promise<StudentResponse> => {
        const response = await apiClient.get<StudentResponse>(`/v1/students/${studentCode}/info`);
        return response.data;
    }
};
