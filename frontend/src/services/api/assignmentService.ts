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
    referenceUrl?: string; // Keep for backward compatibility
    referenceName?: string; // Keep for backward compatibility
    referenceUrls?: string[];
    referenceNames?: string[];
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
    referenceUrls?: string[];
    referenceNames?: string[];
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
    referenceUrls?: string[];
    referenceNames?: string[];
    timetableSlotId?: number;
}

export interface SubmitAssignmentRequest {
    assignmentId: number;
    fileUrls?: string[];
    fileNames?: string[];
    note?: string;
}

export interface AssignmentPlagiarismMatchDTO {
    submissionId: number;
    studentCode: string;
    studentName: string;
    plagiarismPercent: number;
    probability: number;
    textScore: number;
    imageScore: number;
    metadataScore: number;
    fileNameScore: number;
    submittedAt?: string;
    notePreview?: string;
    fileNames?: string[];
    sharedSignals: string[];
}

export interface AssignmentPlagiarismDTO {
    assignmentId: number;
    submissionId: number;
    assignmentTitle: string;
    className: string;
    courseCode: string;
    courseName: string;
    studentCode: string;
    studentName: string;
    scope: string;
    model: string;
    strategy: string;
    plagiarismPercent: number;
    originalityPercent: number;
    probability: number;
    plagiarized: boolean;
    comparedSubmissionCount: number;
    textScore: number;
    imageScore: number;
    metadataScore: number;
    fileNameScore: number;
    keySignals: string[];
    topMatches: AssignmentPlagiarismMatchDTO[];
}

export const assignmentService = {
    // === Lecturer APIs ===

    // Tạo bài tập mới
    createAssignment: async (data: CreateAssignmentRequest): Promise<AssignmentDTO> => {
        const response = await apiClient.post<AssignmentDTO>('/v1/lecturer/assignments', data);
        return response.data;
    },

    // Đóng bài tập
    closeAssignment: async (id: number): Promise<void> => {
        await apiClient.post(`/v1/lecturer/assignments/${id}/close`, {});
    },

    // Cập nhật hạn nộp bài tập
    updateDueDate: async (id: number, dueDate: string): Promise<AssignmentDTO> => {
        const response = await apiClient.put<AssignmentDTO>(`/v1/lecturer/assignments/${id}/due-date`, { dueDate });
        return response.data;
    },

    // Cập nhật bài tập
    updateAssignment: async (id: number, data: any): Promise<AssignmentDTO> => {
        const response = await apiClient.put<AssignmentDTO>(`/v1/lecturer/assignments/${id}`, data);
        return response.data;
    },

    // Lấy danh sách bài tập theo lớp
    getAssignmentsByClass: async (className: string): Promise<AssignmentDTO[]> => {
        const response = await apiClient.get<AssignmentDTO[]>('/v1/lecturer/assignments', {
            params: { className }
        });
        return response.data;
    },

    // Xem bài nộp của bài tập
    getAssignmentSubmissions: async (assignmentId: number): Promise<AssignmentSubmissionDTO[]> => {
        const response = await apiClient.get<AssignmentSubmissionDTO[]>(`/v1/lecturer/assignments/${assignmentId}/submissions`);
        return response.data;
    },

    // Lấy trạng thái nộp bài của tất cả sinh viên trong lớp
    getAllSubmissionStatus: async (assignmentId: number): Promise<AssignmentSubmissionDTO[]> => {
        const response = await apiClient.get<AssignmentSubmissionDTO[]>(`/v1/lecturer/assignments/${assignmentId}/all-submissions`);
        return response.data;
    },

    // Giảng viên nhận xét bài nộp
    updateLecturerComment: async (submissionId: number, comment: string): Promise<AssignmentSubmissionDTO> => {
        const response = await apiClient.put<AssignmentSubmissionDTO>(`/v1/lecturer/assignments/submissions/${submissionId}/comment`, { comment });
        return response.data;
    },

    checkSubmissionPlagiarism: async (assignmentId: number, submissionId: number): Promise<AssignmentPlagiarismDTO> => {
        const response = await apiClient.get<AssignmentPlagiarismDTO>(
            `/v1/lecturer/assignments/${assignmentId}/submissions/${submissionId}/plagiarism`
        );
        return response.data;
    },

    // Tải tất cả bài nộp dưới dạng ZIP
    downloadAllSubmissions: async (assignmentId: number): Promise<Blob> => {
        const response = await apiClient.get<Blob>(`/v1/lecturer/assignments/${assignmentId}/download-all-submissions`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Xóa bài tập
    deleteAssignment: async (id: number): Promise<void> => {
        await apiClient.delete(`/v1/lecturer/assignments/${id}`);
    },

    // === Student Student Methods ===

    // Lấy danh sách bài tập cần nộp
    getMyAssignments: async (): Promise<AssignmentSubmissionDTO[]> => {
        const response = await apiClient.get<AssignmentSubmissionDTO[]>('/v1/student/assignments');
        return response.data;
    },

    // Lấy danh sách tất cả lớp mà sinh viên đang đăng ký
    getEnrolledClasses: async (): Promise<string[]> => {
        const response = await apiClient.get<string[]>('/v1/student/assignments/enrolled-classes');
        return response.data;
    },

    // Nộp bài tập
    submitAssignment: async (data: SubmitAssignmentRequest): Promise<AssignmentSubmissionDTO> => {
        const response = await apiClient.post<AssignmentSubmissionDTO>('/v1/student/assignments/submit', data);
        return response.data;
    },

    // Xem bài đã nộp
    getMySubmission: async (assignmentId: number): Promise<AssignmentSubmissionDTO> => {
        const response = await apiClient.get<AssignmentSubmissionDTO>(`/v1/student/assignments/${assignmentId}/submission`);
        return response.data;
    }
};

export default assignmentService;
