import apiClient from './apiClient';

export interface OtpStatusResponse {
    hasOtp: boolean;
    lastUsedAt: string | null;
}

export interface SessionStatusResponse {
    hasValidSession: boolean;
}

export const lecturerOtpService = {
    /**
     * Check if lecturer has OTP set up
     */
    getOtpStatus: async (): Promise<OtpStatusResponse> => {
        const response = await apiClient.get<OtpStatusResponse>('/v1/lecturer/grade-otp/status');
        return response.data;
    },

    /**
     * Check if lecturer has valid OTP session
     */
    checkSession: async (): Promise<SessionStatusResponse> => {
        const response = await apiClient.get<SessionStatusResponse>('/v1/lecturer/grade-otp/session');
        return response.data;
    },

    /**
     * Create new OTP for lecturer
     */
    createOtp: async (otp: string): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.post('/v1/lecturer/grade-otp/create', { otp });
        return response.data;
    },

    /**
     * Verify OTP to unlock grade editing
     */
    verifyOtp: async (otp: string): Promise<{ verified: boolean; message: string }> => {
        const response = await apiClient.post('/v1/lecturer/grade-otp/verify', { otp });
        return response.data;
    },

    /**
     * Regenerate (change) OTP
     */
    regenerateOtp: async (newOtp: string): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.put('/v1/lecturer/grade-otp/regenerate', { otp: newOtp });
        return response.data;
    },

    /**
     * Logout from OTP session
     */
    logoutSession: async (): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.post('/v1/lecturer/grade-otp/logout');
        return response.data;
    }
};
