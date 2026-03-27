import apiClient from './apiClient';

export interface ProvinceOnlineData {
    provinceName: string;
    onlineCount: number;
    latitude: number;
    longitude: number;
    usernames: string[];
}

export interface OnlineUsersResponse {
    totalOnline: number;
    provinces: ProvinceOnlineData[];
}

export const mapService = {
    /**
     * Get online users grouped by province
     */
    getOnlineUsers: async (): Promise<OnlineUsersResponse> => {
        const response = await apiClient.get<OnlineUsersResponse>(`/map/online-users`);
        return response.data;
    }
};
