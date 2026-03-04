import axios from 'axios';
import { API_URL } from './config';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

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
        const resp = await axios.post<AssignmentDTO>(`${API_URL}/lecturer/assignments`, request, {
            headers: getAuthHeader()
        });
        return resp.data;
    },

    // Đóng bài tập
    closeAssignment: async (assignmentId: number): Promise<void> => {
        await axios.post(`${API_URL}/lecturer/assignments/${assignmentId}/close`, {}, {
            headers: getAuthHeader()
        });
    },

    // Lấy danh sách bài tập theo lớp
    getAssignmentsByClass: async (className: string): Promise<AssignmentDTO[]> => {
        const resp = await axios.get<AssignmentDTO[]>(`${API_URL}/lecturer/assignments`, {
            headers: getAuthHeader(),
            params: { className }
        });
        return resp.data || [];
    },

    // Xem bài nộp của bài tập
    getAssignmentSubmissions: async (assignmentId: number): Promise<AssignmentSubmissionDTO[]> => {
        const resp = await axios.get<AssignmentSubmissionDTO[]>(
            `${API_URL}/lecturer/assignments/${assignmentId}/submissions`, {
            headers: getAuthHeader()
        });
        return resp.data || [];
    },

    // Cập nhật hạn nộp bài tập
    updateDueDate: async (assignmentId: number, dueDate: string): Promise<AssignmentDTO> => {
        const resp = await axios.put<AssignmentDTO>(`${API_URL}/lecturer/assignments/${assignmentId}/due-date`, { dueDate }, {
            headers: getAuthHeader()
        });
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
        const resp = await axios.put<AssignmentDTO>(`${API_URL}/lecturer/assignments/${assignmentId}`, data, {
            headers: getAuthHeader()
        });
        return resp.data;
    },

    // Lấy trạng thái nộp bài của tất cả sinh viên trong lớp
    getAllSubmissionStatus: async (assignmentId: number): Promise<AssignmentSubmissionDTO[]> => {
        const resp = await axios.get<AssignmentSubmissionDTO[]>(
            `${API_URL}/lecturer/assignments/${assignmentId}/all-submissions`, {
            headers: getAuthHeader()
        });
        return resp.data || [];
    },

    // Giảng viên nhận xét bài nộp
    updateLecturerComment: async (submissionId: number, comment: string): Promise<AssignmentSubmissionDTO> => {
        const resp = await axios.put<AssignmentSubmissionDTO>(
            `${API_URL}/lecturer/assignments/submissions/${submissionId}/comment`, { comment }, {
            headers: getAuthHeader()
        });
        return resp.data;
    },

    // Xóa bài tập
    deleteAssignment: async (assignmentId: number): Promise<void> => {
        await axios.delete(`${API_URL}/lecturer/assignments/${assignmentId}`, {
            headers: getAuthHeader()
        });
    },

    // Tải tất cả bài nộp dưới dạng ZIP
    downloadAllSubmissions: async (assignmentId: number) => {
        const resp = await axios.get(`${API_URL}/lecturer/assignments/${assignmentId}/download-all-submissions`, {
            headers: getAuthHeader(),
            responseType: 'blob'
        });
        return resp;
    },

    // === Student APIs ===

    // Lấy danh sách bài tập cần nộp
    getMyAssignments: async (): Promise<AssignmentSubmissionDTO[]> => {
        const resp = await axios.get<AssignmentSubmissionDTO[]>(`${API_URL}/student/assignments`, {
            headers: getAuthHeader()
        });
        return resp.data || [];
    },

    // Lấy danh sách tất cả lớp mà sinh viên đang đăng ký
    getEnrolledClasses: async (): Promise<string[]> => {
        const resp = await axios.get<string[]>(`${API_URL}/student/assignments/enrolled-classes`, {
            headers: getAuthHeader()
        });
        return resp.data || [];
    },

    // Nộp bài tập
    submitAssignment: async (request: SubmitAssignmentRequest): Promise<AssignmentSubmissionDTO> => {
        const resp = await axios.post<AssignmentSubmissionDTO>(`${API_URL}/student/assignments/submit`, request, {
            headers: getAuthHeader()
        });
        return resp.data;
    },

    // Xem bài đã nộp
    getMySubmission: async (assignmentId: number): Promise<AssignmentSubmissionDTO> => {
        const resp = await axios.get<AssignmentSubmissionDTO>(
            `${API_URL}/student/assignments/${assignmentId}/submission`, {
            headers: getAuthHeader()
        });
        return resp.data;
    }
};

export default assignmentService;
