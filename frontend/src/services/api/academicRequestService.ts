import apiClient from './authService';

// Types
export interface AcademicRequest {
    id: number;
    studentId: number;
    studentCode: string;
    studentName: string;
    studentEmail: string;
    studentAvatar?: string;
    studentMajor?: string;
    studentSpecialization?: string;
    studentSubSpecialization?: string;
    requestType: string;
    requestTypeLabel: string;
    requestTitle: string;
    semesterId?: number;
    semesterCode?: string;
    semesterName?: string;
    courseId?: number;
    courseCode?: string;
    courseName?: string;
    classSectionId?: string;
    className?: string;
    toClassName?: string;
    toMajor?: string;
    toSpecialization?: string;
    toSubSpecialization?: string;
    reason: string;
    note?: string;
    fileUrl?: string;
    status: string;
    statusLabel: string;
    startDate?: string;
    dueDate?: string;
    isWithinDeadline?: boolean;
    isTransferPossible?: boolean;
    transferError?: string;
    isApprovable?: boolean;
    validationMessage?: string;
    approverId?: number;
    approverName?: string;
    approvedAt?: string;
    approverNote?: string;
    approverAvatar?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AcademicRequestType {
    value: string;
    label: string;
    description?: string;
    deadlineRule: string;
    startDate?: string;
    dueDate?: string;
    canSubmit: boolean;
    requiresClassSection?: boolean;
}

export interface PageResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

export interface CreateAcademicRequestPayload {
    requestType: string;
    requestTitle?: string;
    semesterId?: number;
    courseId?: number;
    classSectionId?: string;
    toClassName?: string;
    toMajor?: string;
    toSpecialization?: string;
    toSubSpecialization?: string;
    reason: string;
    note?: string;
}

export interface DeadlineCheckResponse {
    canSubmit: boolean;
    message: string;
    startDate?: string;
    dueDate?: string;
}

export interface RequestStats {
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
}

// Service
export const academicRequestService = {
    // Student APIs

    /**
     * Get all available request types with deadline info
     */
    getRequestTypes: async (): Promise<AcademicRequestType[]> => {
        const response = await apiClient.get('/v1/academic-requests/types');
        return response.data;
    },

    /**
     * Check if a request can be submitted (deadline validation)
     */
    checkDeadline: async (requestType: string, classSectionId?: string): Promise<DeadlineCheckResponse> => {
        const params: Record<string, string> = { requestType };
        if (classSectionId) {
            params.classSectionId = classSectionId;
        }
        const response = await apiClient.get('/v1/academic-requests/check-deadline', { params });
        return response.data;
    },

    /**
     * Create a new academic request with optional file attachment
     */
    createRequest: async (payload: CreateAcademicRequestPayload, file?: File): Promise<AcademicRequest> => {
        const formData = new FormData();
        formData.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
        if (file) {
            formData.append('file', file);
        }
        const response = await apiClient.post('/v1/academic-requests', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /**
     * Get my requests (student)
     */
    getMyRequests: async (
        page = 0,
        size = 10,
        sort = 'createdAt,desc',
        filters?: {
            status?: string;
            requestType?: string;
        }
    ): Promise<PageResponse<AcademicRequest>> => {
        const params: Record<string, string | number> = { page, size, sort };
        if (filters?.status) params.status = filters.status;
        if (filters?.requestType) params.requestType = filters.requestType;

        const response = await apiClient.get('/v1/academic-requests/my-requests', {
            params
        });
        return response.data;
    },

    /**
     * Cancel my request (student)
     */
    cancelRequest: async (id: number): Promise<AcademicRequest> => {
        const response = await apiClient.put(`/v1/academic-requests/my-requests/${id}/cancel`);
        return response.data;
    },

    // Academic Staff APIs

    /**
     * Get all requests with filters (staff only)
     */
    getRequests: async (
        page = 0,
        size = 10,
        sort = 'createdAt,desc',
        filters?: {
            search?: string;
            status?: string;
            requestType?: string;
        }
    ): Promise<PageResponse<AcademicRequest>> => {
        const params: Record<string, string | number> = { page, size, sort };
        if (filters?.search) params.search = filters.search;
        if (filters?.status) params.status = filters.status;
        if (filters?.requestType) params.requestType = filters.requestType;

        const response = await apiClient.get('/v1/academic-requests', { params });
        return response.data;
    },

    /**
     * Get request statistics (staff only)
     */
    getStats: async (): Promise<RequestStats> => {
        const response = await apiClient.get('/v1/academic-requests/stats');
        return response.data;
    },

    /**
     * Get request by ID
     */
    getRequestById: async (id: number): Promise<AcademicRequest> => {
        const response = await apiClient.get(`/v1/academic-requests/${id}`);
        return response.data;
    },

    /**
     * Update request status (approve/reject) - staff only
     */
    updateStatus: async (id: number, status: 'APPROVED' | 'REJECTED', note?: string): Promise<AcademicRequest> => {
        const response = await apiClient.put(`/v1/academic-requests/${id}/status`, { status, note });
        return response.data;
    },
};

export default academicRequestService;
