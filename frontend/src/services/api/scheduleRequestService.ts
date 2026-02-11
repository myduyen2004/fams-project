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
    originalDate?: string;
    requestedRoomName?: string;
    requestedDate?: string;
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

export interface CreateScheduleRequestPayload {
    originalSlotId: number;
    type: 'RESCHEDULE' | 'CANCEL' | 'SWAP' | 'ROOM_CHANGE';
    reason: string;
    file?: string;
    requestedDate?: string; // YYYY-MM-DD
    requestedSlotTypeId?: number; // Slot number (1-4)
    requestedRoomId?: number;
}

export const scheduleRequestService = {
    getMyRequests: async (page = 0, size = 10): Promise<PageResponse<ScheduleRequest>> => {
        const response = await apiClient.get(`/lecturer/requests?page=${page}&size=${size}`);
        return response.data;
    },
    getRequestById: async (id: number): Promise<ScheduleRequest> => {
        const response = await apiClient.get(`/lecturer/requests/${id}`);
        return response.data;
    },
    createRequest: async (payload: CreateScheduleRequestPayload): Promise<ScheduleRequest> => {
        const response = await apiClient.post('/lecturer/requests', payload);
        return response.data;
    },
    getSlotsForClass: async (className: string): Promise<ClassSlotResponse[]> => {
        const response = await apiClient.get(`/lecturer/classes/${className}/slots`);
        return response.data;
    },
    getClasses: async (): Promise<string[]> => {
        const response = await apiClient.get(`/lecturer/classes`);
        return response.data;
    },

    getRooms: async (): Promise<any[]> => {
        const response = await apiClient.get(`/v1/rooms`);
        return response.data;
    },

    checkConflicts: async (className: string, date: string, slotNumber: number, originalSlotId: number): Promise<ConflictCheckResponse> => {
        const response = await apiClient.get(`/lecturer/check-conflicts`, {
            params: { className, date, slotNumber, originalSlotId }
        });
        return response.data;
    }
};

export interface ConflictItem {
    type: 'LECTURER' | 'PENDING_REQUEST' | 'STUDENT';
    message: string;
    count?: number;
}

export interface ConflictCheckResponse {
    conflicts: ConflictItem[];
    hasConflict: boolean;
}

export interface ClassSlotResponse {
    id: number;
    slotNumber: number;
    roomId: number;
    roomName: string;
    date: string;
    dayOfWeek: number;
}
