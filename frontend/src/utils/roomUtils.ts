import { Room } from '../types/room';

export interface FloorConfig {
    lockedCells: { row: number; col: number }[];
}

export interface BuildingConfig {
    floors: Record<number, FloorConfig>;
    gridRows: number;
    gridCols: number;
    narrowColumns: number[];
    lockedRows: number[];
    lockedCells: { row: number; col: number }[];
    lockedColumns: number[];
    unlockedCells: { row: number; col: number }[];
    defaultRoomColSpan: number;
    defaultRoomRowSpan: number;
}

export const BUILDING_CONFIG: Record<string, BuildingConfig> = {
    'Gamma': {
        floors: {
            1: {
                lockedCells: [
                    { row: 9, col: 3 },
                    { row: 8, col: 3 },
                    { row: 9, col: 5 },
                    { row: 8, col: 5 },
                ]
            },
            2: { lockedCells: [] },
            3: { lockedCells: [] },
            4: { lockedCells: [] },
        },
        gridRows: 10,
        gridCols: 7,
        narrowColumns: [1, 5],
        lockedRows: [2, 7],
        lockedCells: [
            { row: 0, col: 3 },
            { row: 9, col: 3 },
        ],
        lockedColumns: [],
        unlockedCells: [],
        defaultRoomColSpan: 1,
        defaultRoomRowSpan: 1
    },
    'Alpha': {
        floors: {
            1: { lockedCells: [] },
            2: { lockedCells: [] },
            3: { lockedCells: [] },
            4: { lockedCells: [] },
            5: { lockedCells: [] },
            6: { lockedCells: [] },
            7: { lockedCells: [] },
        },
        gridRows: 9,
        gridCols: 8,
        narrowColumns: [2, 5],
        lockedRows: [4],
        lockedCells: [
            { row: 1, col: 3 },
            { row: 1, col: 4 },
            { row: 8, col: 3 },
            { row: 8, col: 4 },
            { row: 7, col: 3 },
            { row: 7, col: 4 },
        ],
        lockedColumns: [0, 7],
        unlockedCells: [],
        defaultRoomColSpan: 1,
        defaultRoomRowSpan: 2
    }
};

// Fixed floor plan elements (lobby, stairs, WC, etc.)
export type FloorElement = {
    id: string;
    name: string;
    type: 'STAIRS' | 'CORRIDOR' | 'ELEVATOR' | 'RESTROOM' | 'LOBBY' | 'LIBRARY' | 'SELF-STUDY' | 'DISPLAY';
    gridRow: number;
    gridCol: number;
    gridRowSpan: number;
    gridColSpan: number;
    color?: string;
    image?: string;
};

// Default floor elements matching the image layout
export const getFloorElements = (building: string, floor: number): FloorElement[] => {
    // Gamma Floor 1 - Special layout with large reception area
    if (building === 'Gamma' && floor === 1) {
        return [
            { id: 'lobby', name: 'Sảnh tiếp tân', type: 'LOBBY', gridRow: 3, gridCol: 2, gridRowSpan: 4, gridColSpan: 3 },
            { id: 'stairs-left', name: 'Cầu thang', type: 'STAIRS', gridRow: 4, gridCol: 0, gridRowSpan: 2, gridColSpan: 1 },
            { id: 'stairs-right', name: 'Cầu thang', type: 'STAIRS', gridRow: 4, gridCol: 6, gridRowSpan: 2, gridColSpan: 1 },
            { id: 'wc-nu', name: 'WC nữ', type: 'RESTROOM', gridRow: 3, gridCol: 6, gridRowSpan: 1, gridColSpan: 1, color: 'bg-green-200 dark:bg-green-800/50' },
            { id: 'wc-nam', name: 'WC nam', type: 'RESTROOM', gridRow: 6, gridCol: 6, gridRowSpan: 1, gridColSpan: 1, color: 'bg-blue-200 dark:bg-blue-800/50' },
            { id: 'library', name: 'Thư viện', type: 'LIBRARY', gridRow: 0, gridCol: 2, gridRowSpan: 2, gridColSpan: 3, color: 'bg-gray-200 dark:bg-gray-800/50' },
            { id: 'self-study', name: 'Phòng tự học', type: 'SELF-STUDY', gridRow: 0, gridCol: 0, gridRowSpan: 4, gridColSpan: 1, color: 'bg-gray-200 dark:bg-gray-800/50' },
            { id: 'display', name: 'Phòng trưng bày', type: 'DISPLAY', gridRow: 8, gridCol: 5, gridRowSpan: 2, gridColSpan: 2, color: 'bg-gray-200 dark:bg-gray-800/50' },
            { id: 'trong-dong', name: 'Trống đồng Đông Sơn', type: 'LOBBY', gridRow: 7, gridCol: 3, gridRowSpan: 3, gridColSpan: 1, image: '/trong-dong-dong-son.png', color: 'bg-transparent' },
        ];
    }

    // Gamma - Other floors (standard layout)
    if (building === 'Gamma') {
        return [
            { id: 'lobby', name: 'Sảnh', type: 'LOBBY', gridRow: 3, gridCol: 2, gridRowSpan: 4, gridColSpan: 3 },
            { id: 'stairs-left', name: 'Cầu thang', type: 'STAIRS', gridRow: 4, gridCol: 0, gridRowSpan: 2, gridColSpan: 1 },
            { id: 'stairs-right', name: 'Cầu thang', type: 'STAIRS', gridRow: 4, gridCol: 6, gridRowSpan: 2, gridColSpan: 1 },
            { id: 'wc-nu', name: 'WC nữ', type: 'RESTROOM', gridRow: 3, gridCol: 6, gridRowSpan: 1, gridColSpan: 1, color: 'bg-green-200 dark:bg-green-800/50' },
            { id: 'wc-nam', name: 'WC nam', type: 'RESTROOM', gridRow: 6, gridCol: 6, gridRowSpan: 1, gridColSpan: 1, color: 'bg-blue-200 dark:bg-blue-800/50' },
        ];
    }

    // Alpha - Floor 2 special layout
    if (building === 'Alpha' && floor === 2) {
        return [
            { id: 'lobby', name: 'Sảnh', type: 'LOBBY', gridRow: 5, gridCol: 3, gridRowSpan: 4, gridColSpan: 2 },
            { id: 'stairs-left', name: 'Cầu thang A', type: 'STAIRS', gridRow: 2, gridCol: 0, gridRowSpan: 2, gridColSpan: 1 },
            { id: 'stairs-right', name: 'Cầu thang B', type: 'STAIRS', gridRow: 2, gridCol: 7, gridRowSpan: 2, gridColSpan: 1 },
            { id: 'elevator-left', name: 'Thang máy', type: 'ELEVATOR', gridRow: 2, gridCol: 3, gridRowSpan: 2, gridColSpan: 1, color: 'bg-indigo-200 dark:bg-indigo-800/50' },
            { id: 'elevator-right', name: 'Thang máy', type: 'ELEVATOR', gridRow: 2, gridCol: 4, gridRowSpan: 2, gridColSpan: 1, color: 'bg-indigo-200 dark:bg-indigo-800/50' },
            { id: 'wc-nu', name: 'WC nữ', type: 'RESTROOM', gridRow: 0, gridCol: 3, gridRowSpan: 1, gridColSpan: 1, color: 'bg-green-200 dark:bg-green-800/50' },
            { id: 'wc-nam', name: 'WC nam', type: 'RESTROOM', gridRow: 0, gridCol: 4, gridRowSpan: 1, gridColSpan: 1, color: 'bg-blue-200 dark:bg-blue-800/50' },
        ];
    }

    // Alpha - Other floors
    if (building === 'Alpha') {
        return [
            { id: 'stairs-left', name: 'Cầu thang A', type: 'STAIRS', gridRow: 2, gridCol: 0, gridRowSpan: 2, gridColSpan: 1 },
            { id: 'stairs-right', name: 'Cầu thang B', type: 'STAIRS', gridRow: 2, gridCol: 7, gridRowSpan: 2, gridColSpan: 1 },
            { id: 'elevator-left', name: 'Thang máy', type: 'ELEVATOR', gridRow: 2, gridCol: 3, gridRowSpan: 2, gridColSpan: 1, color: 'bg-indigo-200 dark:bg-indigo-800/50' },
            { id: 'elevator-right', name: 'Thang máy', type: 'ELEVATOR', gridRow: 2, gridCol: 4, gridRowSpan: 2, gridColSpan: 1, color: 'bg-indigo-200 dark:bg-indigo-800/50' },
            { id: 'wc-nu', name: 'WC nữ', type: 'RESTROOM', gridRow: 0, gridCol: 3, gridRowSpan: 1, gridColSpan: 1, color: 'bg-green-200 dark:bg-green-800/50' },
            { id: 'wc-nam', name: 'WC nam', type: 'RESTROOM', gridRow: 0, gridCol: 4, gridRowSpan: 1, gridColSpan: 1, color: 'bg-blue-200 dark:bg-blue-800/50' },
        ];
    }

    return [];
};

export const getRoomTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
        'CLASSROOM': 'Lớp học',
        'COMPUTER_LAB': 'Phòng máy',
        'PSEUDO_ROOM': 'Phòng giả'
    };
    return labels[type] || type;
};

// Room type filter options
export const ROOM_TYPE_OPTIONS = [
    { value: 'CLASSROOM', label: 'Lớp học' },
    { value: 'COMPUTER_LAB', label: 'Phòng máy' },
    { value: 'PSEUDO_ROOM', label: 'Phòng giả' }
] as const;

export const getRoomTypeDisplayLabel = (selectedType: string): string => {
    if (selectedType === 'ALL') return 'Tất cả loại phòng';
    return ROOM_TYPE_OPTIONS.find(opt => opt.value === selectedType)?.label || 'Phòng giả';
};

export const filterPositionedRooms = (rooms: Room[]) => {
    return rooms.filter(r => r.gridRow != null && r.gridCol != null);
};
