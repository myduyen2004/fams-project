import apiClient from './apiClient';

export interface TimetableSlotDTO {
  id: number;
  className?: string;
  courseCode?: string;
  courseName?: string;
  lecturerId?: number;
  lecturerName?: string;
  lecturerEmail?: string;
  lecturerAvatar?: string;
  roomCode?: string;
  roomName?: string;
  date?: string; // ISO date
  dayOfWeek?: number; // 1=Mon .. 7=Sun
  slotNumber?: number;
  startTime?: string;
  endTime?: string;
  status?: string;
  attendanceStatus?: string;
  // Assignment info (populated for lecturer timetable)
  assignmentId?: number | null;
  assignmentTitle?: string | null;
  assignmentStatus?: string | null;
  // Student submission status (SUBMITTED / NOT_SUBMITTED)
  submissionStatus?: string | null;
  // Configured absent threshold from backend
  absentThresholdMinutes?: number;
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

  updateSlot: async (slotId: number, data: { date: string, slotNumber: number, roomId: number }) => {
    const resp = await apiClient.put(`/v1/timetable/slot/${slotId}`, data);
    return resp.data;
  },

  getAvailability: async (date: string, semesterCode: string) => {
    const resp = await apiClient.get(`/v1/timetable/availability`, {
      params: { date, semesterCode }
    });
    return resp.data;
  },

  // Lecturer: get ALL slots for a specific semester
  getLecturerSemesterSlots: async (lecturerId: number, semesterCode: string): Promise<TimetableSlotDTO[]> => {
    const resp = await apiClient.get<TimetableSlotDTO[]>(`/v1/timetable/lecturer/${lecturerId}/semester`, {
      params: { semesterCode }
    });
    return resp.data || [];
  },

  getLecturerTeachingDates: async (lecturerId: number, semesterCode: string): Promise<string[]> => {
    const resp = await apiClient.get<string[]>(`/v1/timetable/lecturer/${lecturerId}/semester-dates`, {
      params: { semesterCode }
    });
    return resp.data || [];
  },

  searchAssignments: async (
    lecturerId: number,
    semesterCode: string,
    params: { date?: string; className?: string; status?: string; page?: number; size?: number }
  ) => {
    const resp = await apiClient.get<{
      content: TimetableSlotDTO[];
      totalPages: number;
      totalElements: number;
      number: number;
    }>(`/v1/timetable/lecturer/${lecturerId}/assignments-search`, {
      params: {
        semesterCode,
        date: params.date,
        className: params.className,
        status: params.status,
        page: params.page,
        size: params.size
      }
    });
    return resp.data;
  },

  getTimetableByClass: async (className: string) => {
    const resp = await apiClient.get<TimetableSlotDTO[]>(`/v1/timetable/class/${className}`);
    return resp.data || [];
  }
};

export default timetableService;
