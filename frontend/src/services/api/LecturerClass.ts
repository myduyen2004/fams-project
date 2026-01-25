import apiClient from './authService';
import { PageResponse } from './userService';

export interface ClassSectionResponse {
    className: string;
    courseId: number;
    courseCode: string;
    courseName: string;
    semesterId: number;
    semesterCode: string;
    semesterName: string;
    lecturerId: number;
    lecturerName: string;
    numberOfSlots: number;
    maxStudents: number;
    currentEnrollment: number;
    status: string;
}

export interface SemesterResponse {
    id: number;
    code: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
}

export interface CourseOptionResponse {
    id: number;
    code: string;
    name: string;
}

export interface StudentEnrollmentDTO {
    studentName: string;
    email: string;
    phone: string;
    idCard: string;
    majorName: string;
    studentCode: string;
    status: string;
}

export interface ClassDetailResponse {
    className: string;
    courseCode: string;
    courseName: string;
    semesterName: string;
    majorName: string;
    courseYear: string;
    studentCount: number;
    academicYear: string;
    status: string;
    enrollments: StudentEnrollmentDTO[];
}

export const lecturerClassService = {
    getTeachingClasses: async (semesterCode: string, params: { search?: string; status?: string; lecturerId?: number; page?: number; size?: number }) => {
        const response = await apiClient.get<PageResponse<ClassSectionResponse>>(`/v1/class-sections/semester/${semesterCode}`, { params });
        return response.data;
    },

    getSemesters: async () => {
        const response = await apiClient.get<SemesterResponse[]>('/v1/semesters/active');
        return response.data;
    },

    getClassDetail: async (className: string) => {
        const response = await apiClient.get<ClassDetailResponse>(`/v1/class-sections/${className}/details`);
        return response.data;
    },

    getCourseOptions: async (semesterCode: string, lecturerId: number) => {
        const response = await apiClient.get<CourseOptionResponse[]>(`/v1/class-sections/semester/${semesterCode}/courses`, {
            params: { lecturerId }
        });
        return response.data;
    }
};
