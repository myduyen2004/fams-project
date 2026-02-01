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
