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
    totalStudents: number;
    presentCount: number;
    students: StudentAttendanceResponse[];
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
    }
};

export default attendanceService;
