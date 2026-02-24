export type RoomType = 'CLASSROOM' | 'COMPUTER_LAB' | 'PSEUDO_ROOM';
export type RoomStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

export interface Room {
    id: number;
    code: string;
    name: string;
    description?: string;
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
    description?: string;
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
