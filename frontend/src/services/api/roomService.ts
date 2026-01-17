import apiClient from './authService';
import { Room, RoomRequest } from '../../types/room';

export const roomService = {
    getAllRooms: async () => {
        const response = await apiClient.get<Room[]>('/v1/rooms');
        return response.data;
    },

    getRoom: async (id: number) => {
        const response = await apiClient.get<Room>(`/v1/rooms/${id}`);
        return response.data;
    },

    createRoom: async (data: RoomRequest) => {
        const response = await apiClient.post<Room>('/v1/rooms', data);
        return response.data;
    },

    updateRoom: async (id: number, data: RoomRequest) => {
        const response = await apiClient.put<Room>(`/v1/rooms/${id}`, data);
        return response.data;
    },

    deleteRoom: async (id: number) => {
        await apiClient.delete(`/v1/rooms/${id}`);
    }
};
