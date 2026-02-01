import axios from 'axios';
import { API_URL } from './config';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface TimetableSlotDTO {
  id: number;
  className?: string;
  courseCode?: string;
  courseName?: string;
  lecturerName?: string | null;
  roomCode?: string;
  roomName?: string;
  date?: string; // ISO date
  dayOfWeek?: number; // 1=Mon .. 7=Sun
  slotNumber?: number;
  startTime?: string;
  endTime?: string;
  status?: string;
  attendanceStatus?: string;
}

export interface DailyTimetableDTO {
  date: string;
  dayOfWeek: number;
  dayName: string;
  slots: TimetableSlotDTO[];
}

export interface WeeklyTimetableDTO {
  weekStartDate: string;
  weekEndDate: string;
  days: DailyTimetableDTO[];
}

export const timetableService = {
  getTimetableBySemester: async (semesterCode: string) => {
    const resp = await axios.get<TimetableSlotDTO[]>(`${API_URL}/v1/timetable/semester/${semesterCode}`, {
      headers: getAuthHeader()
    });
    return resp.data || [];
  },

  getTimetableByDate: async (semesterCode: string, date: string) => {
    const resp = await axios.get<TimetableSlotDTO[]>(`${API_URL}/v1/timetable/semester/${semesterCode}/date/${date}`, {
      headers: getAuthHeader()
    });
    return resp.data || [];
  },

  checkTimetableExists: async (semesterCode: string) => {
    const resp = await axios.get<{ exists: boolean, count: number }>(`${API_URL}/v1/timetable/semester/${semesterCode}/exists`, {
      headers: getAuthHeader()
    });
    return resp.data;
  },

  startAsyncGeneration: async (semesterCode: string) => {
    const payload = { semesterCode };
    const resp = await axios.post(`${API_URL}/v1/timetable/generate/async`, payload, {
      headers: getAuthHeader()
    });
    return resp.data;
  },

  getGenerationStatus: async (jobId: string) => {
    const resp = await axios.get(`${API_URL}/v1/timetable/generate/status/${jobId}`, {
      headers: getAuthHeader()
    });
    return resp.data;
  },

  cancelGeneration: async (jobId: string) => {
    const resp = await axios.post(`${API_URL}/v1/timetable/generate/cancel/${jobId}`, {}, {
      headers: getAuthHeader()
    });
    return resp.data;
  },

  generateSync: async (semesterCode: string, config?: any) => {
    const payload = { semesterCode, config };
    const resp = await axios.post(`${API_URL}/v1/timetable/generate`, payload, {
      headers: getAuthHeader()
    });
    return resp.data;
  },

  getStudentTimetable: async (studentId: number, date?: string) => {
    const params = date ? { date } : {};
    const resp = await axios.get<WeeklyTimetableDTO>(`${API_URL}/v1/timetable/student/${studentId}`, {
      headers: getAuthHeader(),
      params
    });
    return resp.data;
  },

  exportStudentTimetable: async (studentId: number, semesterCode: string) => {
    const resp = await axios.get(`${API_URL}/v1/timetable/export/student/${studentId}`, {
      headers: getAuthHeader(),
      params: { semesterCode },
      responseType: 'blob' // Important for file download
    });
    return resp;
  },

  getUnscheduledCount: async (semesterCode: string) => {
    const resp = await axios.get<{
      unscheduledCount: number;
      totalSchedulable: number;
      scheduledCount: number;
      unscheduledClassNames: string[];
    }>(`${API_URL}/v1/timetable/semester/${semesterCode}/unscheduled-count`, {
      headers: getAuthHeader()
    });
    return resp.data;
  },

  getTimetableByWeek: async (semesterCode: string, startDate: string, endDate: string) => {
    try {
      // Use optimized date range API
      const resp = await axios.get<TimetableSlotDTO[]>(`${API_URL}/v1/timetable/semester/${semesterCode}/range`, {
        headers: getAuthHeader(),
        params: { startDate, endDate }
      });
      return resp.data || [];
    } catch (e) {
      console.error('Error fetching weekly timetable', e);
      return [];
    }
  },

  checkConfigChanged: async (semesterCode: string) => {
    const resp = await axios.get<{
      configChanged: boolean;
      hasTimetable: boolean;
      timetableCreatedAt?: string;
      configUpdatedAt?: string;
      message: string;
    }>(`${API_URL}/v1/timetable/semester/${semesterCode}/config-changed`, {
      headers: getAuthHeader()
    });
    return resp.data;
  },

  getLecturerTimetable: async (lecturerId: number, date?: string) => {
    const params = date ? { date } : {};
    const resp = await axios.get<WeeklyTimetableDTO>(`${API_URL}/v1/timetable/lecturer/${lecturerId}`, {
      headers: getAuthHeader(),
      params
    });
    return resp.data;
  },

  exportLecturerTimetable: async (lecturerId: number, semesterCode?: string, date?: string) => {
    const params: any = {};
    if (semesterCode) params.semesterCode = semesterCode;
    if (date) params.date = date;

    const resp = await axios.get(`${API_URL}/v1/timetable/export/lecturer/${lecturerId}`, {
      headers: getAuthHeader(),
      params,
      responseType: 'blob' // Important for file download
    });
    return resp;
  },

  updateSlot: async (slotId: number, data: { date: string, slotNumber: number, roomId: number }) => {
    const resp = await axios.put(`${API_URL}/v1/timetable/slot/${slotId}`, data, {
      headers: getAuthHeader()
    });
    return resp.data;
  },

  getAvailability: async (date: string, semesterCode: string) => {
    const resp = await axios.get(`${API_URL}/v1/timetable/availability`, {
      headers: getAuthHeader(),
      params: { date, semesterCode }
    });
    return resp.data;
  }
};

export default timetableService;
