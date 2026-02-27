import apiClient from './authService';

// Types for Exam Grade Overview (ME, FE, PE, Resit)
export interface ExamGradeComponentInfo {
    id: number;
    name: string;
    type: string;
    weight: number;
    isResit: boolean;
    referenceComponentId: number | null;
    isEditable: boolean; // true for ME, FE, PE - can be imported by academic staff
}

export interface ExamStudentGradeRow {
    enrollmentId: number;
    studentCode: string;
    studentName: string;
    className: string;
    grades: { [componentId: number]: number | null };
    finalGrade: number | null;
    status: 'PASSED' | 'FAILED' | 'PENDING';
}

export interface ExamGradeOverviewResponse {
    courseCode: string;
    courseName: string;
    semesterCode: string;
    semesterName: string;
    totalStudents: number;
    averageGrade: number | null;
    passRate: number | null;
    lastUpdated: string;
    gradeComponents: ExamGradeComponentInfo[];
    studentGrades: ExamStudentGradeRow[];
    // For publishing grades to students
    gradesPublished?: boolean;
    gradesPublishedAt?: string;
    gradesPublishedBy?: string;
}

export interface ExamGradePreviewRow {
    rowNumber: number;
    studentCode: string;
    studentName: string;
    className: string;
    grades: { [componentId: number]: number | null };
    status: 'VALID' | 'ERROR' | 'SKIP';
    error?: string;
}

export interface ExamGradePreviewResponse {
    rows: ExamGradePreviewRow[];
    totalRows: number;
    validRows: number;
    errorRows: number;
    components: { id: number; name: string; type: string }[];
}

export interface ExamGradeImportResponse {
    success: boolean;
    imported: number;
    updated: number;
    skipped: number;
    message: string;
}

export const examGradeService = {
    /**
     * Get exam grade overview for a course in a semester
     * @param courseCode Course code
     * @param semesterCode Semester code
     * @param type "EXAM" for ME/FE/PE, "RESIT" for resit grades
     */
    getExamGradeOverview: async (
        courseCode: string,
        semesterCode: string,
        type: 'EXAM' | 'RESIT' = 'EXAM'
    ): Promise<ExamGradeOverviewResponse> => {
        const response = await apiClient.get<ExamGradeOverviewResponse>('/v1/exam-grades', {
            params: { courseCode, semesterCode, type }
        });
        return response.data;
    },

    /**
     * Export exam grades to Excel
     */
    exportExamGrades: async (
        courseCode: string,
        semesterCode: string,
        type: 'EXAM' | 'RESIT' = 'EXAM'
    ): Promise<void> => {
        const response = await apiClient.get('/v1/exam-grades/export', {
            params: { courseCode, semesterCode, type },
            responseType: 'blob'
        });
        const filename = `diem_${type === 'RESIT' ? 'thi_lai' : 'thi'}_${courseCode}_${semesterCode}.xlsx`;
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    /**
     * Preview exam grade import
     */
    previewExamGradeImport: async (
        courseCode: string,
        semesterCode: string,
        type: 'EXAM' | 'RESIT',
        file: File
    ): Promise<ExamGradePreviewResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<ExamGradePreviewResponse>('/v1/exam-grades/preview', formData, {
            params: { courseCode, semesterCode, type },
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    /**
     * Import exam grades from Excel
     */
    importExamGrades: async (
        courseCode: string,
        semesterCode: string,
        type: 'EXAM' | 'RESIT',
        file: File
    ): Promise<ExamGradeImportResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<ExamGradeImportResponse>('/v1/exam-grades/import', formData, {
            params: { courseCode, semesterCode, type },
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    /**
     * Publish grades to students (makes grades visible to students)
     */
    publishGrades: async (
        courseCode: string,
        semesterCode: string,
        type: 'EXAM' | 'RESIT' = 'EXAM'
    ): Promise<{ message: string }> => {
        const response = await apiClient.post<{ message: string }>('/v1/exam-grades/publish', null, {
            params: { courseCode, semesterCode, type }
        });
        return response.data;
    }
};
