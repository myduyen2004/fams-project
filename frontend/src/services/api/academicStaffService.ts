import apiClient from './authService';
import { AcademicStaffDashboardResponse } from '../../types/dashboard';

export const academicStaffService = {
    getDashboardData: async (): Promise<AcademicStaffDashboardResponse> => {
        const response = await apiClient.get<AcademicStaffDashboardResponse>('/academic-staff/dashboard');
        return response.data;
    },
};
