import apiClient from './authService';

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
    const resp = await apiClient.get<TimetableSlotDTO[]>(`/v1/timetable/semester/${semesterCode}`);
    return resp.data || [];
  },

  getTimetableByDate: async (semesterCode: string, date: string) => {
    const resp = await apiClient.get<TimetableSlotDTO[]>(`/v1/timetable/semester/${semesterCode}/date/${date}`);
    return resp.data || [];
  },

  checkTimetableExists: async (semesterCode: string) => {
    const resp = await apiClient.get<{ exists: boolean, count: number }>(`/v1/timetable/semester/${semesterCode}/exists`);
    return resp.data;
  },

  startAsyncGeneration: async (semesterCode: string) => {
    const payload = { semesterCode };
    const resp = await apiClient.post(`/v1/timetable/generate/async`, payload);
    return resp.data;
  },

  getGenerationStatus: async (jobId: string) => {
    const resp = await apiClient.get(`/v1/timetable/generate/status/${jobId}`);
    return resp.data;
  },

  cancelGeneration: async (jobId: string) => {
    const resp = await apiClient.post(`/v1/timetable/generate/cancel/${jobId}`, {});
    return resp.data;
  },

  generateSync: async (semesterCode: string, config?: any) => {
    const payload = { semesterCode, config };
    const resp = await apiClient.post(`/v1/timetable/generate`, payload);
    return resp.data;
  },

  getStudentTimetable: async (studentId: number, date?: string) => {
    const params = date ? { date } : {};
    const resp = await apiClient.get<WeeklyTimetableDTO>(`/v1/timetable/student/${studentId}`, {
      params
    });
    return resp.data;
  },

  exportStudentTimetable: async (studentId: number, semesterCode: string) => {
    const resp = await apiClient.get(`/v1/timetable/export/student/${studentId}`, {
      params: { semesterCode },
      responseType: 'blob' // Important for file download
    });
    return resp;
  },

  getUnscheduledCount: async (semesterCode: string) => {
    const resp = await apiClient.get<{
      unscheduledCount: number;
      totalSchedulable: number;
      scheduledCount: number;
      unscheduledClassNames: string[];
    }>(`/v1/timetable/semester/${semesterCode}/unscheduled-count`);
    return resp.data;
  },

  getTimetableByWeek: async (semesterCode: string, startDate: string, endDate: string) => {
    try {
      // Use optimized date range API
      const resp = await apiClient.get<TimetableSlotDTO[]>(`/v1/timetable/semester/${semesterCode}/range`, {
        params: { startDate, endDate }
      });
      return resp.data || [];
    } catch (e) {
      console.error('Error fetching weekly timetable', e);
      return [];
    }
  },

  checkConfigChanged: async (semesterCode: string) => {
    const resp = await apiClient.get<{
      configChanged: boolean;
      hasTimetable: boolean;
      timetableCreatedAt?: string;
      configUpdatedAt?: string;
      message: string;
    }>(`/v1/timetable/semester/${semesterCode}/config-changed`);
    return resp.data;
  },

  getLecturerTimetable: async (lecturerId: number, date?: string) => {
    const params = date ? { date } : {};
    const resp = await apiClient.get<WeeklyTimetableDTO>(`/v1/timetable/lecturer/${lecturerId}`, {
      params
    });
    return resp.data;
  },

  exportLecturerTimetable: async (lecturerId: number, semesterCode?: string, date?: string) => {
    const params: any = {};
    if (semesterCode) params.semesterCode = semesterCode;
    if (date) params.date = date;

    const resp = await apiClient.get(`/v1/timetable/export/lecturer/${lecturerId}`, {
      params,
      responseType: 'blob' // Important for file download
    });
    return resp;
  },

  updateSlot: async (id: number, data: { date: string, slotNumber: number, roomId: number }) => {
    const resp = await apiClient.patch<TimetableSlotDTO>(`/v1/timetable/slot/${id}`, data);
    return resp.data;
  },

  getAvailability: async (date: string, semesterCode: string) => {
    const resp = await apiClient.get<{ availableSlots: number[], allRooms: any[], occupiedRoomIdsBySlot: any }>(`/v1/timetable/availability`, {
      params: { date, semesterCode }
    });
    return resp.data;
  }
};

export default timetableService;
