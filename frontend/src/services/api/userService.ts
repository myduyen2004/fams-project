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
    getAllUsers: async (params: { search?: string; role?: string; status?: string; page?: number; size?: number }) => {
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
        await apiClient.post('/users/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
};
