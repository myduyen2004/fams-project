import apiClient from './apiClient';

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
    semesterName?: string;
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

export interface ClassAttendanceSummary {
    className: string;
    courseCode: string;
    courseName: string;
    lecturerName: string;
    totalSlots: number;
    totalSessionsHeld: number;
    presentCount: number;
    unexcusedAbsentCount: number;
    excusedAbsentCount: number;
    attendancePercentage: number;
    absentPercentage: number;
}

export interface StudentAttendanceSummaryResponse {
    studentName: string;
    studentCode: string;
    semesterName: string;
    classSummaries: ClassAttendanceSummary[];
}

export interface IndividualSlotAttendance {
    slotId: number;
    slotIndex: number;
    date: string;
    startTime: string;
    endTime: string;
    roomCode: string;
    status: string; // 'PRESENT', 'ABSENT', 'EXCUSED', 'FUTURE'
    lecturerName: string;
}

export interface IndividualAttendanceDetail {
    className: string;
    courseCode: string;
    courseName: string;
    slots: IndividualSlotAttendance[];
}

const attendanceService = {
    startSession: async (request: StartSessionRequest): Promise<SessionDetailResponse> => {
        const response = await apiClient.post(`/v1/attendance/session/start`, request);
        return response.data;
    },

    getSession: async (sessionId: number): Promise<SessionDetailResponse> => {
        const response = await apiClient.get(`/v1/attendance/session/${sessionId}`);
        return response.data;
    },

    getSessionBySlot: async (slotId: number): Promise<SessionDetailResponse> => {
        const response = await apiClient.get(`/v1/attendance/session/slot/${slotId}`);
        return response.data;
    },

    updateManualAttendance: async (sessionId: number, studentId: number, status: string, slotId?: number, note?: string): Promise<SessionDetailResponse> => {
        const response = await apiClient.post(`/v1/attendance/session/manual`, {
            sessionId,
            slotId,
            studentId,
            status,
            note
        });
        return response.data;
    },

    getClassAttendanceReport: async (className: string): Promise<ClassAttendanceReportResponse> => {
        const response = await apiClient.get(`/v1/attendance/class/${className}/report`);
        return response.data;
    },

    getStudentReport: async (semesterCode?: string): Promise<StudentAttendanceSummaryResponse> => {
        const response = await apiClient.get(`/v1/attendance/student/report`, {
            params: { semesterCode }
        });
        return response.data;
    },

    getStudentClassAttendanceDetail: async (className: string): Promise<IndividualAttendanceDetail> => {
        const response = await apiClient.get(`/v1/attendance/student/class/${className}/detail`);
        return response.data;
    }
};

export default attendanceService;
