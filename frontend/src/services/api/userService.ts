import apiClient from './authService';

export interface UserRequest {
    code: string;
    fullName: string;
    email: string;
    dob: string; // YYYY-MM-DD
    phone?: string;
    role: 'ADMIN' | 'ACADEMIC_STAFF' | 'LECTURER' | 'STUDENT';
    status?: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
    faceDataStatus?: 'REGISTERED' | 'NOT_REGISTERED';
}

export interface UserResponse {
    id: number;
    code: string;
    fullName: string;
    email: string;
    dob: string;
    phone: string;
    role: string;
    roleName: string;
    status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
    faceDataStatus: string;
    avatar?: string;
    isPasswordChanged?: boolean;
    createdAt: string;
    updatedAt: string;
    lastLogin: string;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export const userService = {
    getAllUsers: async (params: { search?: string; role?: string; status?: string; page?: number; size?: number; sort?: string }) => {
        const response = await apiClient.get<PageResponse<UserResponse>>('/users', { params });
        return response.data;
    },

    createUser: async (data: UserRequest, avatar?: File) => {
        const formData = new FormData();
        // Pack data as a JSON blob for @RequestPart("user")
        formData.append('user', new Blob([JSON.stringify(data)], { type: 'application/json' }));
        if (avatar) {
            formData.append('avatar', avatar);
        }
        const response = await apiClient.post<UserResponse>('/users', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    activateUsers: async (ids: number[]) => {
        await apiClient.post('/users/activate', ids);
    },

    updateUser: async (id: number, data: UserRequest, avatar?: File) => {
        const formData = new FormData();
        formData.append('user', new Blob([JSON.stringify(data)], { type: 'application/json' }));
        if (avatar) {
            formData.append('avatar', avatar);
        }
        const response = await apiClient.put<UserResponse>(`/users/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    deleteUser: async (id: number) => {
        await apiClient.delete(`/users/${id}`);
    },

    importUsers: async (formData: FormData) => {
        const response = await apiClient.post<{ type: 'sync' | 'async', jobId?: string, message: string }>('/users/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 600000 // 10 minutes for large imports with many images
        });
        return response;
    },

    getImportJobStatus: async (jobId: string) => {
        const response = await apiClient.get(`/users/import-job/${jobId}`);
        return response.data;
    },

    getActiveImportJob: async () => {
        const response = await apiClient.get('/users/import-job/active');
        if (response.status === 204) return null;
        return response.data;
    },

    cleanupStuckJobs: async () => {
        await apiClient.post('/users/import-job/cleanup');
    },

    previewImport: async (formData: FormData) => {
        const response = await apiClient.post<{
            totalRows: number;
            validRows: number;
            errorRows: number;
            previewData: {
                rowNumber: number;
                fullName: string;
                code: string;
                role: string;
                dob: string;
                email: string;
                phone: string;
                hasImage: boolean;
                status: string;
                errorMessage: string | null;
            }[];
            validationMessages: string[];
        }>('/users/import/preview', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    /**
     * Cancel the current user's active import job
     */
    cancelImportJob: async (): Promise<void> => {
        await apiClient.post('/users/import-job/cancel');
    },
};
