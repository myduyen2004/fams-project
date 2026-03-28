import axios from 'axios';
import { API_URL } from './config';

const API_BASE_URL = API_URL;

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
