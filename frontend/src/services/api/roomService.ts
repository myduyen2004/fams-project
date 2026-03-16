import apiClient from './authService';
import { Room, RoomRequest } from '../../types/room';

// Room with availability status
export interface RoomWithAvailability extends Room {
    isAvailable: boolean;
}

export const roomService = {
    getAllRooms: async () => {
        const response = await apiClient.get<Room[]>('/v1/rooms');
        return response.data;
    },

    getRoom: async (id: number) => {
        const response = await apiClient.get<Room>(`/v1/rooms/${id}`);
        return response.data;
    },

    // Get rooms with availability status for a specific date and slot
    getRoomAvailability: async (date: string, slotNumber: number): Promise<RoomWithAvailability[]> => {
        const response = await apiClient.get<RoomWithAvailability[]>('/v1/rooms/availability', {
            params: { date, slotNumber }
        });
        return response.data;
    },

    // Get IDs of rooms currently in use based on actual slot times from database
    getCurrentlyInUseRoomIds: async (): Promise<Set<number>> => {
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const response = await apiClient.get<number[]>('/v1/rooms/currently-in-use', {
            params: { date, time }
        });
        return new Set(response.data);
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

