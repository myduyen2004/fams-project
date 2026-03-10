import axios from 'axios';
import { API_URL } from './config';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface StartSessionRequest {
    slotId: number;
    latitude?: number;
    longitude?: number;
}

export interface StudentAttendanceResponse {
    studentId: number;
    studentCode: string;
    fullName: string;
    avatarUrl?: string;
    status: string;
    checkInMethod?: string;
    checkInTime: string;
    capturedFaceUrl?: string;
}

export interface SessionDetailResponse {
    sessionId: number;
    slotId: number;
    courseCode: string;
    courseName: string;
    className: string;
    roomCode: string;
    lecturerName: string;
    status: string;
    openedAt: string;
    closedAt?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    totalStudents: number;
    presentCount: number;
    students: StudentAttendanceResponse[];
}

export interface ClassAttendanceReportResponse {
    className: string;
    courseCode: string;
    courseName: string;
    slots: {
        slotId: number;
        slotIndex: number;
        date: string;
    }[];
    studentReports: {
        studentId: number;
        studentCode: string;
        studentName: string;
        avatarUrl?: string;
        absentPercentage: number;
        attendanceDetails: {
            slotId: number;
            slotIndex: number;
            status?: string; // 'P', 'A', 'E' or null
        }[];
    }[];
}

const attendanceService = {
    startSession: async (request: StartSessionRequest): Promise<SessionDetailResponse> => {
        const response = await axios.post(`${API_URL}/v1/attendance/session/start`, request, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    getSession: async (sessionId: number): Promise<SessionDetailResponse> => {
        const response = await axios.get(`${API_URL}/v1/attendance/session/${sessionId}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    getSessionBySlot: async (slotId: number): Promise<SessionDetailResponse> => {
        const response = await axios.get(`${API_URL}/v1/attendance/session/slot/${slotId}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    updateManualAttendance: async (sessionId: number, studentId: number, status: string, slotId?: number, note?: string): Promise<SessionDetailResponse> => {
        const response = await axios.post(`${API_URL}/v1/attendance/session/manual`, {
            sessionId,
            slotId,
            studentId,
            status,
            note
        }, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    getClassAttendanceReport: async (className: string): Promise<ClassAttendanceReportResponse> => {
        const response = await axios.get(`${API_URL}/v1/attendance/class/${className}/report`, {
            headers: getAuthHeader()
        });
        return response.data;
    }
};

export default attendanceService;
