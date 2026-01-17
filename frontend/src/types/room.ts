export type RoomType = 'LECTURE' | 'LAB' | 'MEETING' | 'AUDITORIUM';
export type RoomStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

export interface Room {
    id: number;
    code: string;
    name: string;
    capacity: number;
    building: string;
    floor: number;
    type: RoomType;
    status: RoomStatus;
    gridRow?: number | null;
    gridCol?: number | null;
    gridRowSpan?: number;
    gridColSpan?: number;
    createdAt: string;
    updatedAt: string;
}

export interface RoomRequest {
    code: string;
    name: string;
    capacity: number;
    building: string;
    floor: number;
    type: RoomType;
    status: RoomStatus;
    gridRow?: number | null;
    gridCol?: number | null;
    gridRowSpan?: number;
    gridColSpan?: number;
}
