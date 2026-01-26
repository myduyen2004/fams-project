import apiClient from './authService';

export interface ScheduleRequest {
    id: number;
    className: string;
    originalSlotInfo: string;
    originalSlotNumber?: number;
    requestedSlotInfo: string;
    requestedSlotNumber?: number;
    type: string;
    typeLabel: string;
    reason: string;
    status: string;
    statusLabel: string;
    createdAt: string;
    approverNote?: string;
    originalRoomName?: string;
    file?: string;
    approverName?: string;
    approvedAt?: string;
}

export interface PageResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

export const scheduleRequestService = {
    getMyRequests: async (page = 0, size = 10): Promise<PageResponse<ScheduleRequest>> => {
        const response = await apiClient.get(`/lecturer/requests?page=${page}&size=${size}`);
        return response.data;
    },
    getRequestById: async (id: number): Promise<ScheduleRequest> => {
        const response = await apiClient.get(`/lecturer/requests/${id}`);
        return response.data;
    }
};
