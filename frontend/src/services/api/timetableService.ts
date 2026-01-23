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
  }
};

export default timetableService;
