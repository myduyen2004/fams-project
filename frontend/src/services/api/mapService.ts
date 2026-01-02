import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080') + '/api';

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
        const response = await axios.get<OnlineUsersResponse>(`${API_BASE_URL}/map/online-users`);
        return response.data;
    }
};
