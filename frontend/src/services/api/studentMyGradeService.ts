import apiClient from './authService';

export interface StudentCourseOption {
    courseId: number;
    courseCode: string;
    courseName: string;
    className: string;
    semesterCode: string;
    semesterName: string;
    semesterId: number;
}

export interface GradeItem {
    itemName: string;
    weight: number;
    value: number | null;
    comment: string | null;
    isPublished: boolean;
}

export interface GradeCategory {
    categoryName: string;
    items: GradeItem[];
    totalWeight: number;
    totalValue: number | null;
}

export interface StudentGradeDetailResponse {
    className: string;
    courseName: string;
    courseCode: string;
    semesterName: string;
    semesterCode: string;
    gradeCategories: GradeCategory[];
    courseAverage: number | null;
    courseStatus: 'PASSED' | 'FAILED' | 'PENDING';
    gradesPublished: boolean;
    gradesPublishedAt: string | null;
    lastUpdatedAt: string;
}

export const studentMyGradeService = {
    /**
     * Get all courses a student is enrolled in
     */
    getMyCourses: async (studentId: number, semesterId?: number): Promise<StudentCourseOption[]> => {
        const params: Record<string, number> = {};
        if (semesterId) {
            params.semesterId = semesterId;
        }
        const response = await apiClient.get(`/v1/students/${studentId}/courses`, { params });
        return response.data;
    },

    /**
     * Get detailed grades for a student in a specific class
     */
    getMyGrades: async (studentId: number, className: string): Promise<StudentGradeDetailResponse> => {
        const response = await apiClient.get(`/v1/students/${studentId}/grades`, {
            params: { className }
        });
        return response.data;
    }
};

export default studentMyGradeService;
