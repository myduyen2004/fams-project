import apiClient from './apiClient';

// === Assignment (bài tập) ===

export interface AssignmentDTO {
    id: number;
    title: string;
    description?: string;
    timetableSlotId?: number | null;
    className: string;
    courseName: string;
    courseCode: string;
    lecturerName: string;
    dueDate?: string;
    referenceUrl?: string;
    referenceName?: string;
    status: 'OPEN' | 'CLOSED';
    totalSubmissions: number;
    totalStudents: number;
    createdAt: string;
}

export interface CreateAssignmentRequest {
    className: string;
    timetableSlotId?: number;
    title: string;
    description?: string;
    dueDate?: string;
    referenceUrl?: string;
    referenceName?: string;
}

// === Submission (bài nộp) ===

export interface AssignmentSubmissionDTO {
    id?: number;
    assignmentId: number;
    assignmentTitle: string;
    className: string;
    courseCode: string;
    courseName: string;
    studentCode?: string;
    studentName?: string;
    fileUrls?: string[];
    fileNames?: string[];
    note?: string;
    lecturerComment?: string;
    status: 'SUBMITTED' | 'NOT_SUBMITTED' | 'OVERDUE';
    submittedAt?: string;
    assignmentDueDate?: string;
    referenceUrl?: string;
    referenceName?: string;
    timetableSlotId?: number;
}

export interface SubmitAssignmentRequest {
    assignmentId: number;
    fileUrls?: string[];
    fileNames?: string[];
    note?: string;
}

export const assignmentService = {
    // === Lecturer APIs ===

    // Tạo bài tập mới
    createAssignment: async (request: CreateAssignmentRequest): Promise<AssignmentDTO> => {
        const resp = await apiClient.post<AssignmentDTO>(`/lecturer/assignments`, request);
        return resp.data;
    },

    // Đóng bài tập
    closeAssignment: async (assignmentId: number): Promise<void> => {
        await apiClient.post(`/lecturer/assignments/${assignmentId}/close`, {});
    },

    // Lấy danh sách bài tập theo lớp
    getAssignmentsByClass: async (className: string): Promise<AssignmentDTO[]> => {
        const resp = await apiClient.get<AssignmentDTO[]>(`/lecturer/assignments`, {
            params: { className }
        });
        return resp.data || [];
    },

    // Xem bài nộp của bài tập
    getAssignmentSubmissions: async (assignmentId: number): Promise<AssignmentSubmissionDTO[]> => {
        const resp = await apiClient.get<AssignmentSubmissionDTO[]>(
            `/lecturer/assignments/${assignmentId}/submissions`);
        return resp.data || [];
    },

    // Cập nhật hạn nộp bài tập
    updateDueDate: async (assignmentId: number, dueDate: string): Promise<AssignmentDTO> => {
        const resp = await apiClient.put<AssignmentDTO>(`/lecturer/assignments/${assignmentId}/due-date`, { dueDate });
        return resp.data;
    },

    // Cập nhật bài tập
    updateAssignment: async (assignmentId: number, data: {
        title?: string;
        description?: string;
        dueDate?: string;
        referenceUrl?: string;
        referenceName?: string;
    }): Promise<AssignmentDTO> => {
        const resp = await apiClient.put<AssignmentDTO>(`/lecturer/assignments/${assignmentId}`, data);
        return resp.data;
    },

    // Lấy trạng thái nộp bài của tất cả sinh viên trong lớp
    getAllSubmissionStatus: async (assignmentId: number): Promise<AssignmentSubmissionDTO[]> => {
        const resp = await apiClient.get<AssignmentSubmissionDTO[]>(
            `/lecturer/assignments/${assignmentId}/all-submissions`);
        return resp.data || [];
    },

    // Giảng viên nhận xét bài nộp
    updateLecturerComment: async (submissionId: number, comment: string): Promise<AssignmentSubmissionDTO> => {
        const resp = await apiClient.put<AssignmentSubmissionDTO>(
            `/lecturer/assignments/submissions/${submissionId}/comment`, { comment });
        return resp.data;
    },

    // Xóa bài tập
    deleteAssignment: async (assignmentId: number): Promise<void> => {
        await apiClient.delete(`/lecturer/assignments/${assignmentId}`);
    },

    // Tải tất cả bài nộp dưới dạng ZIP
    downloadAllSubmissions: async (assignmentId: number) => {
        const resp = await apiClient.get(`/lecturer/assignments/${assignmentId}/download-all-submissions`, {
            responseType: 'blob'
        });
        return resp;
    },

    // === Student APIs ===

    // Lấy danh sách bài tập cần nộp
    getMyAssignments: async (): Promise<AssignmentSubmissionDTO[]> => {
        const resp = await apiClient.get<AssignmentSubmissionDTO[]>(`/student/assignments`);
        return resp.data || [];
    },

    // Lấy danh sách tất cả lớp mà sinh viên đang đăng ký
    getEnrolledClasses: async (): Promise<string[]> => {
        const resp = await apiClient.get<string[]>(`/student/assignments/enrolled-classes`);
        return resp.data || [];
    },

    // Nộp bài tập
    submitAssignment: async (request: SubmitAssignmentRequest): Promise<AssignmentSubmissionDTO> => {
        const resp = await apiClient.post<AssignmentSubmissionDTO>(`/student/assignments/submit`, request);
        return resp.data;
    },

    // Xem bài đã nộp
    getMySubmission: async (assignmentId: number): Promise<AssignmentSubmissionDTO> => {
        const resp = await apiClient.get<AssignmentSubmissionDTO>(
            `/student/assignments/${assignmentId}/submission`);
        return resp.data;
    }
};

export default assignmentService;
