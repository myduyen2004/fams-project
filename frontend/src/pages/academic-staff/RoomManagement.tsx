import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { Plus, Loader2, Edit2, Trash2, GripVertical, Maximize2, Users, Check, ChevronDown, Search } from 'lucide-react';
import { roomService } from '../../services/api/roomService';
import { Room } from '../../types/room';
import { AddRoomModal, EditRoomModal } from '../../components/academic-staff/rooms/RoomModals';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import toast from "@utils/toast";
import { ROOM_TYPE_OPTIONS, getRoomTypeDisplayLabel } from '../../utils/roomUtils';
import { RoomCard } from '../../components/shared/RoomCard';

// Building configuration
interface FloorConfig {
    lockedCells: { row: number; col: number }[];
}

interface BuildingConfig {
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

const BUILDING_CONFIG: Record<string, BuildingConfig> = {
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

const BUILDINGS = Object.keys(BUILDING_CONFIG);

// Fixed floor plan elements (lobby, stairs, WC, etc.)
type FloorElement = {
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
const getFloorElements = (building: string, floor: number): FloorElement[] => {
    // Gamma Floor 1 - Special layout with large reception area
    if (building === 'Gamma' && floor === 1) {
        return [
            // Large lobby/reception area (spans more space on floor 1)
            { id: 'lobby', name: 'Sảnh tiếp tân', type: 'LOBBY', gridRow: 3, gridCol: 2, gridRowSpan: 4, gridColSpan: 3 },
            // Main stairs
            { id: 'stairs-left', name: 'Cầu thang', type: 'STAIRS', gridRow: 4, gridCol: 0, gridRowSpan: 2, gridColSpan: 1 },
            { id: 'stairs-right', name: 'Cầu thang', type: 'STAIRS', gridRow: 4, gridCol: 6, gridRowSpan: 2, gridColSpan: 1 },
            // WC on floor 1 (larger, near lobby)
            { id: 'wc-nu', name: 'WC nữ', type: 'RESTROOM', gridRow: 3, gridCol: 6, gridRowSpan: 1, gridColSpan: 1, color: 'bg-green-200 dark:bg-green-800/50' },
            { id: 'wc-nam', name: 'WC nam', type: 'RESTROOM', gridRow: 6, gridCol: 6, gridRowSpan: 1, gridColSpan: 1, color: 'bg-blue-200 dark:bg-blue-800/50' },
            // Library
            { id: 'library', name: 'Thư viện', type: 'LIBRARY', gridRow: 0, gridCol: 2, gridRowSpan: 2, gridColSpan: 3, color: 'bg-gray-200 dark:bg-gray-800/50' },
            // Phòng tự học
            { id: 'self-study', name: 'Phòng tự học', type: 'SELF-STUDY', gridRow: 0, gridCol: 0, gridRowSpan: 4, gridColSpan: 1, color: 'bg-gray-200 dark:bg-gray-800/50' },
            // Phòng trưng bày
            { id: 'display', name: 'Phòng trưng bày', type: 'DISPLAY', gridRow: 8, gridCol: 5, gridRowSpan: 2, gridColSpan: 2, color: 'bg-gray-200 dark:bg-gray-800/50' },
            // Trống đồng Đông Sơn (New decorative element)
            { id: 'trong-dong', name: 'Trống đồng Đông Sơn', type: 'LOBBY', gridRow: 7, gridCol: 3, gridRowSpan: 3, gridColSpan: 1, image: '/trong-dong-dong-son.png', color: 'bg-transparent' },
        ];
    }

    // Gamma - Other floors (standard layout)
    if (building === 'Gamma') {
        return [
            // Standard lobby
            { id: 'lobby', name: 'Sảnh', type: 'LOBBY', gridRow: 3, gridCol: 2, gridRowSpan: 4, gridColSpan: 3 },
            // Stairs
            { id: 'stairs-left', name: 'Cầu thang', type: 'STAIRS', gridRow: 4, gridCol: 0, gridRowSpan: 2, gridColSpan: 1 },
            { id: 'stairs-right', name: 'Cầu thang', type: 'STAIRS', gridRow: 4, gridCol: 6, gridRowSpan: 2, gridColSpan: 1 },
            // WC
            { id: 'wc-nu', name: 'WC nữ', type: 'RESTROOM', gridRow: 3, gridCol: 6, gridRowSpan: 1, gridColSpan: 1, color: 'bg-green-200 dark:bg-green-800/50' },
            { id: 'wc-nam', name: 'WC nam', type: 'RESTROOM', gridRow: 6, gridCol: 6, gridRowSpan: 1, gridColSpan: 1, color: 'bg-blue-200 dark:bg-blue-800/50' },
        ];
    }

    // Alpha - Different layout with elevator
    if (building === 'Alpha' && floor === 2) {
        return [
            //Lobby
            { id: 'lobby', name: 'Sảnh', type: 'LOBBY', gridRow: 5, gridCol: 3, gridRowSpan: 4, gridColSpan: 2 },
            // Stairs on both sides
            { id: 'stairs-left', name: 'Cầu thang A', type: 'STAIRS', gridRow: 2, gridCol: 0, gridRowSpan: 2, gridColSpan: 1 },
            { id: 'stairs-right', name: 'Cầu thang B', type: 'STAIRS', gridRow: 2, gridCol: 7, gridRowSpan: 2, gridColSpan: 1 },
            // Elevator (unique to Alpha)
            { id: 'elevator-left', name: 'Thang máy', type: 'ELEVATOR', gridRow: 2, gridCol: 3, gridRowSpan: 2, gridColSpan: 1, color: 'bg-indigo-200 dark:bg-indigo-800/50' },
            { id: 'elevator-right', name: 'Thang máy', type: 'ELEVATOR', gridRow: 2, gridCol: 4, gridRowSpan: 2, gridColSpan: 1, color: 'bg-indigo-200 dark:bg-indigo-800/50' },
            // WC positioned differently
            { id: 'wc-nu', name: 'WC nữ', type: 'RESTROOM', gridRow: 0, gridCol: 3, gridRowSpan: 1, gridColSpan: 1, color: 'bg-green-200 dark:bg-green-800/50' },
            { id: 'wc-nam', name: 'WC nam', type: 'RESTROOM', gridRow: 0, gridCol: 4, gridRowSpan: 1, gridColSpan: 1, color: 'bg-blue-200 dark:bg-blue-800/50' },
        ];
    }

    if (building === 'Alpha') {
        return [
            // Stairs on both sides
            { id: 'stairs-left', name: 'Cầu thang A', type: 'STAIRS', gridRow: 2, gridCol: 0, gridRowSpan: 2, gridColSpan: 1 },
            { id: 'stairs-right', name: 'Cầu thang B', type: 'STAIRS', gridRow: 2, gridCol: 7, gridRowSpan: 2, gridColSpan: 1 },
            // Elevator (unique to Alpha)
            { id: 'elevator-left', name: 'Thang máy', type: 'ELEVATOR', gridRow: 2, gridCol: 3, gridRowSpan: 2, gridColSpan: 1, color: 'bg-indigo-200 dark:bg-indigo-800/50' },
            { id: 'elevator-right', name: 'Thang máy', type: 'ELEVATOR', gridRow: 2, gridCol: 4, gridRowSpan: 2, gridColSpan: 1, color: 'bg-indigo-200 dark:bg-indigo-800/50' },
            // WC positioned differently
            { id: 'wc-nu', name: 'WC nữ', type: 'RESTROOM', gridRow: 0, gridCol: 3, gridRowSpan: 1, gridColSpan: 1, color: 'bg-green-200 dark:bg-green-800/50' },
            { id: 'wc-nam', name: 'WC nam', type: 'RESTROOM', gridRow: 0, gridCol: 4, gridRowSpan: 1, gridColSpan: 1, color: 'bg-blue-200 dark:bg-blue-800/50' },
        ];
    }

    // Default/fallback
    return [];
};

export const RoomManagement: React.FC = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBuilding, setSelectedBuilding] = useState<string>('Gamma');
    const [selectedFloor, setSelectedFloor] = useState<number>(1);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [draggedRoom, setDraggedRoom] = useState<Room | null>(null);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [inUseRoomIds, setInUseRoomIds] = useState<Set<number>>(new Set());

    // Dropdown states
    const [isBuildingFilterOpen, setIsBuildingFilterOpen] = useState(false);
    const [isFloorFilterOpen, setIsFloorFilterOpen] = useState(false);
    const [isRoomTypeFilterOpen, setIsRoomTypeFilterOpen] = useState(false);
    const [selectedRoomType, setSelectedRoomType] = useState<string>('ALL');
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'IN_USE' | 'EMPTY'>('ALL');

    // Search params
    const [searchParams, setSearchParams] = useSearchParams();

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

    // Navigation
    const navigate = useNavigate();

    // Current building configuration
    const currentBuildingConfig = useMemo(() => {
        if (selectedBuilding === 'ALL') return null;
        return BUILDING_CONFIG[selectedBuilding as keyof typeof BUILDING_CONFIG];
    }, [selectedBuilding]);

    const gridRows = currentBuildingConfig?.gridRows || 10;
    const gridCols = currentBuildingConfig?.gridCols || 7;

    // Column Configuration (read-only)
    const columnConfigs = useMemo(() => {
        if (!currentBuildingConfig) return [];
        const narrowCols = currentBuildingConfig.narrowColumns || [];
        return Array(gridCols).fill(null).map((_, idx) => ({
            isLocked: narrowCols.includes(idx),
            isNarrow: narrowCols.includes(idx)
        }));
    }, [currentBuildingConfig, gridCols]);

    // Helper function to check if a cell is locked
    const isCellLocked = (row: number, col: number): boolean => {
        if (!currentBuildingConfig) return false;

        // 1. Check if specific cell is UNLOCKED (overrides other locks)
        if (currentBuildingConfig.unlockedCells?.some(c => c.row === row && c.col === col)) return false;

        // 2. Check if column is locked (from columnConfigs OR lockedColumns)
        if (columnConfigs[col]?.isLocked) return true;
        if (currentBuildingConfig.lockedColumns?.includes(col)) return true;

        // 3. Check if row is locked
        if (currentBuildingConfig.lockedRows.includes(row)) return true;

        // 4. Check if cell is locked in building-wide config
        if (currentBuildingConfig.lockedCells.some(cell => cell.row === row && cell.col === col)) return true;

        // 5. Check if cell is locked in floor-specific config
        const floorConfig = currentBuildingConfig.floors[selectedFloor];
        if (floorConfig?.lockedCells.some(cell => cell.row === row && cell.col === col)) return true;

        return false;
    };

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const data = await roomService.getAllRooms();
            setRooms(data);

            // Fetch real-time occupancy based on actual slot times from database
            try {
                const occupiedIds = await roomService.getCurrentlyInUseRoomIds();
                setInUseRoomIds(occupiedIds);
            } catch (availabilityErr) {
                console.error('Failed to fetch room availability:', availabilityErr);
            }
        } catch (error) {
            toast.error('Không thể tải danh sách phòng học');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    // Sync state with URL params on initial load
    useEffect(() => {
        const buildingParam = searchParams.get('building');
        const statusParam = searchParams.get('status');

        if (buildingParam === 'ALL') {
            setSelectedBuilding('ALL');
        } else if (buildingParam && BUILDINGS.includes(buildingParam)) {
            setSelectedBuilding(buildingParam);
        }

        if (statusParam === 'IN_USE') {
            setSelectedStatus('IN_USE');
        } else if (statusParam === 'EMPTY') {
            setSelectedStatus('EMPTY');
        }
    }, []);

    // Update URL when filters change
    useEffect(() => {
        const params: Record<string, string> = {};
        if (selectedBuilding === 'ALL') params.building = 'ALL';
        if (selectedStatus !== 'ALL') params.status = selectedStatus;

        // Only set params if we have something to set
        if (Object.keys(params).length > 0) {
            setSearchParams(params, { replace: true });
        } else if (searchParams.toString() !== '') {
            setSearchParams({}, { replace: true });
        }
    }, [selectedBuilding, selectedStatus]);

    // Available floors based on selected building
    const availableFloors = useMemo(() => {
        if (selectedBuilding === 'ALL') return [];
        const building = BUILDING_CONFIG[selectedBuilding as keyof typeof BUILDING_CONFIG];
        if (!building) return [];
        return Object.keys(building.floors).map(Number).sort((a, b) => a - b);
    }, [selectedBuilding]);

    // Reset floor and search term when building changes
    useEffect(() => {
        if (selectedBuilding !== 'ALL') {
            setSearchTerm('');
            if (availableFloors.length > 0 && !availableFloors.includes(selectedFloor)) {
                setSelectedFloor(availableFloors[0]);
            }
        }
    }, [selectedBuilding, availableFloors, selectedFloor]);

    const filteredRooms = useMemo(() => {
        let result = rooms;

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(r => 
                r.name.toLowerCase().includes(lowerSearch) || 
                r.building.toLowerCase().includes(lowerSearch)
            );
        }

        if (selectedBuilding !== 'ALL') {
            result = result.filter(r => r.building === selectedBuilding && r.floor === selectedFloor);
        } else {
            result = [...result].sort((a, b) => a.building.localeCompare(b.building) || a.floor - b.floor || a.name.localeCompare(b.name));
        }

        if (selectedRoomType !== 'ALL') {
            result = result.filter(r => r.type === selectedRoomType);
        }

        if (selectedBuilding === 'ALL') {
            if (selectedStatus === 'IN_USE') {
                result = result.filter(r => inUseRoomIds.has(r.id));
            } else if (selectedStatus === 'EMPTY') {
                result = result.filter(r => !inUseRoomIds.has(r.id));
            }
        }

        return result;
    }, [rooms, searchTerm, selectedBuilding, selectedFloor, selectedRoomType, selectedStatus, inUseRoomIds]);

    // Rooms positioned on grid (only relevant for map view of specific building/floor)
    const positionedRooms = useMemo(() => {
        if (selectedBuilding === 'ALL') return [];
        return filteredRooms.filter(r => r.gridRow != null && r.gridCol != null);
    }, [filteredRooms, selectedBuilding]);

    // All rooms for sidebar display (combined list), sorted: Unpositioned first
    const sidebarRooms = useMemo(() => {
        return [...filteredRooms].sort((a, b) => {
            const aUnpositioned = a.gridRow == null || a.gridCol == null;
            const bUnpositioned = b.gridRow == null || b.gridCol == null;
            if (aUnpositioned && !bUnpositioned) return -1;
            if (!aUnpositioned && bUnpositioned) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [filteredRooms]);

    const handleDelete = async () => {
        if (!roomToDelete) return;
        try {
            await roomService.deleteRoom(roomToDelete.id);
            toast.success('Đã xóa phòng học');
            fetchRooms();
            if (selectedRoom?.id === roomToDelete.id) setSelectedRoom(null);
        } catch (error) {
            toast.error('Không thể xóa phòng học');
        } finally {
            setRoomToDelete(null);
        }
    };

    const getRoomTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'LECTURE': 'Lý thuyết',
            'LAB': 'Thực hành',
            'MEETING': 'Họp',
            'AUDITORIUM': 'Hội trường'
        };
        return labels[type] || type;
    };

    const handleRoomDoubleClick = (room: Room) => {
        navigate(`/academic-staff/rooms/${room.id}`);
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, room: Room) => {
        setDraggedRoom(room);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, row?: number, col?: number) => {
        e.preventDefault();
        // Check if cell is locked (column, row, or specific cell)
        if (row !== undefined && col !== undefined && isCellLocked(row, col)) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, row: number, col: number) => {
        e.preventDefault();
        if (!draggedRoom || !currentBuildingConfig) return;

        // Determine span - prefer building default if current is 1 or missing
        const colSpan = (draggedRoom.gridColSpan && draggedRoom.gridColSpan > 1)
            ? draggedRoom.gridColSpan
            : (currentBuildingConfig.defaultRoomColSpan || 1);
        const rowSpan = (draggedRoom.gridRowSpan && draggedRoom.gridRowSpan > 1)
            ? draggedRoom.gridRowSpan
            : (currentBuildingConfig.defaultRoomRowSpan || 1);

        // Check bounds
        if (col + colSpan > gridCols || row + rowSpan > gridRows) {
            toast.error('Không đủ không gian để đặt phòng');
            return;
        }

        // Check if ANY cell in the span is locked
        for (let r = row; r < row + rowSpan; r++) {
            for (let c = col; c < col + colSpan; c++) {
                if (isCellLocked(r, c)) {
                    toast.error('Khu vực này có ô bị khóa');
                    return;
                }
            }
        }

        // Check if ANY cell in the span is occupied by another room or element
        for (let r = row; r < row + rowSpan; r++) {
            for (let c = col; c < col + colSpan; c++) {
                // Room collision
                const collidedRoom = positionedRooms.find(other => {
                    if (other.id === draggedRoom.id) return false;
                    const oRS = other.gridRowSpan || 1;
                    const oCS = other.gridColSpan || 1;
                    return other.gridRow != null && other.gridCol != null &&
                        r >= other.gridRow && r < other.gridRow + oRS &&
                        c >= other.gridCol && c < other.gridCol + oCS;
                });

                if (collidedRoom) {
                    toast.error(`Khu vực này đã bị chiếm bởi ${collidedRoom.name}`);
                    return;
                }

                // Element collision
                if (isOccupiedByElement(r, c)) {
                    toast.error('Khu vực này đã có vật thể cố định');
                    return;
                }
            }
        }

        try {
            setSaving(true);
            await roomService.updateRoom(draggedRoom.id, {
                ...draggedRoom,
                gridRow: row,
                gridCol: col,
                gridRowSpan: rowSpan, // Ensure spans are saved
                gridColSpan: colSpan
            });
            toast.success(`Đã di chuyển ${draggedRoom.name}`);
            fetchRooms();
        } catch (error) {
            toast.error('Không thể cập nhật vị trí phòng');
        } finally {
            setSaving(false);
            setDraggedRoom(null);
        }
    };

    const handleRemoveFromGrid = async (room: Room) => {
        try {
            setSaving(true);
            await roomService.updateRoom(room.id, {
                ...room,
                gridRow: null,
                gridCol: null
            });
            toast.success(`Đã gỡ ${room.name} khỏi sơ đồ`);
            fetchRooms();
        } catch (error) {
            toast.error('Không thể gỡ phòng');
        } finally {
            setSaving(false);
        }
    };

    // Get floor elements for current building/floor
    const floorElements = useMemo(() => {
        return getFloorElements(selectedBuilding, selectedFloor);
    }, [selectedBuilding, selectedFloor]);

    // Check if a cell is occupied by a floor element
    const isOccupiedByElement = (row: number, col: number) => {
        return floorElements.some(el =>
            row >= el.gridRow && row < el.gridRow + el.gridRowSpan &&
            col >= el.gridCol && col < el.gridCol + el.gridColSpan
        );
    };

    // Check if a cell is occupied by a room (including span)
    const isOccupiedByRoom = (row: number, col: number) => {
        return positionedRooms.some(r => {
            const roomRowSpan = r.gridRowSpan || 1;
            const roomColSpan = r.gridColSpan || 1;
            return r.gridRow != null && r.gridCol != null &&
                row >= r.gridRow && row < r.gridRow + roomRowSpan &&
                col >= r.gridCol && col < r.gridCol + roomColSpan;
        });
    };

    // Generate grid cells (excluding cells that are part of a span)
    const gridCells = useMemo(() => {
        const cells: Array<{ row: number; col: number; room: Room | undefined; element: FloorElement | undefined; isSpanned: boolean }> = [];
        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                // Check if this is the start of a floor element
                const element = floorElements.find(el => el.gridRow === row && el.gridCol === col);
                // Check if this is the start of a room
                const room = positionedRooms.find(r => r.gridRow === row && r.gridCol === col);
                // Check if this cell is spanned by another element/room
                const isSpanned = !element && !room && (isOccupiedByElement(row, col) || isOccupiedByRoom(row, col));

                cells.push({ row, col, room, element, isSpanned });
            }
        }
        return cells;
    }, [positionedRooms, floorElements, gridRows, gridCols]);

    return (
        <AcademicStaffLayout pageTitle="Quản lý phòng học">
            <div className="flex gap-6 h-[calc(100vh-120px)]">
                {/* Main Content - Floor Plan Grid */}
                <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 overflow-auto">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">
                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                            {/* Search Input - Only show in ALL mode */}
                            {selectedBuilding === 'ALL' && (
                                <div className="w-full sm:w-64">
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 ml-1">
                                        Tìm kiếm
                                    </label>
                                    <div className="relative">
                                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Tìm phòng..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full h-[52px] pl-12 pr-4 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Building Select */}
                            <div className="flex-1 min-w-[140px]">
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 ml-1">
                                    Tòa nhà
                                </label>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsBuildingFilterOpen(!isBuildingFilterOpen)}
                                        className="flex h-[52px] items-center justify-between w-full gap-3 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-left focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40"
                                    >
                                        <span className="text-sm font-semibold text-gray-700 dark:text-white truncate">
                                            {selectedBuilding === 'ALL' ? 'Tất cả' : selectedBuilding}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isBuildingFilterOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
                                    </button>

                                    {isBuildingFilterOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsBuildingFilterOpen(false)}></div>
                                            <div className="absolute left-0 top-full mt-2 w-full min-w-[160px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-1.5 z-20 animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={() => { setSelectedBuilding('ALL'); setIsBuildingFilterOpen(false); }}
                                                    className={`flex w-full items-center justify-between px-4 py-3 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selectedBuilding === 'ALL' ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange' : 'text-gray-700 dark:text-gray-300'}`}
                                                >
                                                    <span className="text-sm font-semibold">Tất cả</span>
                                                    {selectedBuilding === 'ALL' && <Check size={16} />}
                                                </button>
                                                {BUILDINGS.map(b => (
                                                    <button
                                                        key={b}
                                                        onClick={() => { setSelectedBuilding(b); setIsBuildingFilterOpen(false); }}
                                                        className={`flex w-full items-center justify-between px-4 py-3 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selectedBuilding === b ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange' : 'text-gray-700 dark:text-gray-300'}`}
                                                    >
                                                        <span className="text-sm font-semibold">{b}</span>
                                                        {selectedBuilding === b && <Check size={16} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Room Type Filter */}
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 ml-1">
                                    Loại phòng
                                </label>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsRoomTypeFilterOpen(!isRoomTypeFilterOpen)}
                                        className="flex h-[52px] items-center justify-between w-full gap-3 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-left focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40"
                                    >
                                        <span className="text-sm font-semibold text-gray-700 dark:text-white truncate">
                                            {getRoomTypeDisplayLabel(selectedRoomType)}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isRoomTypeFilterOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
                                    </button>

                                    {isRoomTypeFilterOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsRoomTypeFilterOpen(false)}></div>
                                            <div className="absolute left-0 top-full mt-2 w-full min-w-[180px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-1.5 z-20 animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={() => { setSelectedRoomType('ALL'); setIsRoomTypeFilterOpen(false); }}
                                                    className={`flex w-full items-center justify-between px-4 py-3 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selectedRoomType === 'ALL' ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange' : 'text-gray-700 dark:text-gray-300'}`}
                                                >
                                                    <span className="text-sm font-semibold">Tất cả loại</span>
                                                    {selectedRoomType === 'ALL' && <Check size={16} />}
                                                </button>
                                                {ROOM_TYPE_OPTIONS.map(type => (
                                                    <button
                                                        key={type.value}
                                                        onClick={() => { setSelectedRoomType(type.value); setIsRoomTypeFilterOpen(false); }}
                                                        className={`flex w-full items-center justify-between px-4 py-3 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selectedRoomType === type.value ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange' : 'text-gray-700 dark:text-gray-300'}`}
                                                    >
                                                        <span className="text-sm font-semibold">{type.label}</span>
                                                        {selectedRoomType === type.value && <Check size={16} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Status Filter */}
                            {selectedBuilding === 'ALL' && (
                                <div className="flex-1 min-w-[150px]">
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 ml-1">
                                        Trạng thái
                                    </label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                                            className="flex h-[52px] items-center justify-between w-full gap-3 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-left focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40"
                                        >
                                            <span className="text-sm font-semibold text-gray-700 dark:text-white truncate">
                                                {selectedStatus === 'ALL' ? 'Tất cả trạng thái' : selectedStatus === 'IN_USE' ? 'Đang học' : 'Trống'}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isStatusFilterOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
                                        </button>

                                        {isStatusFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsStatusFilterOpen(false)}></div>
                                                <div className="absolute left-0 top-full mt-2 w-full min-w-[160px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-1.5 z-20 animate-in fade-in zoom-in-95 duration-200">
                                                    {[
                                                        { value: 'ALL', label: 'Tất cả trạng thái' },
                                                        { value: 'IN_USE', label: 'Đang học' },
                                                        { value: 'EMPTY', label: 'Trống' }
                                                    ].map(option => (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => { setSelectedStatus(option.value as any); setIsStatusFilterOpen(false); }}
                                                            className={`flex w-full items-center justify-between px-4 py-3 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selectedStatus === option.value ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange' : 'text-gray-700 dark:text-gray-300'}`}
                                                        >
                                                            <span className="text-sm font-semibold">{option.label}</span>
                                                            {selectedStatus === option.value && <Check size={16} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Floor Filter */}
                            {selectedBuilding !== 'ALL' && (
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 ml-1">
                                        Tầng
                                    </label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsFloorFilterOpen(!isFloorFilterOpen)}
                                            className="flex h-[52px] items-center justify-between w-full gap-3 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-left focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40"
                                        >
                                            <span className="text-sm font-semibold text-gray-700 dark:text-white truncate">Tầng {selectedFloor}</span>
                                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isFloorFilterOpen ? 'rotate-180 text-fpt-orange' : ''}`} />
                                        </button>

                                        {isFloorFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsFloorFilterOpen(false)}></div>
                                                <div className="absolute left-0 top-full mt-2 w-full min-w-[140px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-1.5 z-20 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                                    {availableFloors.map(floor => (
                                                        <button
                                                            key={floor}
                                                            onClick={() => { setSelectedFloor(floor); setIsFloorFilterOpen(false); }}
                                                            className={`flex w-full items-center justify-between px-4 py-3 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${selectedFloor === floor ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange' : 'text-gray-700 dark:text-gray-300'}`}
                                                        >
                                                            <span className="text-sm font-semibold">Tầng {floor}</span>
                                                            {selectedFloor === floor && <Check size={16} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            {selectedBuilding !== 'ALL' && (
                                <button
                                    onClick={() => setIsEditMode(!isEditMode)}
                                    className={`h-[52px] px-6 rounded-2xl flex items-center gap-2 text-sm font-bold transition-all ${isEditMode
                                        ? 'bg-fpt-orange text-white shadow-lg shadow-fpt-orange/20'
                                        : 'bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-gray-300 hover:border-fpt-orange/40'
                                        }`}
                                >
                                    <GripVertical size={18} /> 
                                    <span>{isEditMode ? 'Đang chỉnh sửa' : 'Chế độ kéo thả'}</span>
                                </button>
                            )}
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="h-[52px] bg-fpt-orange text-white px-6 rounded-2xl flex items-center gap-2 hover:bg-orange-600 hover:shadow-lg hover:shadow-fpt-orange/20 transition-all text-sm font-bold whitespace-nowrap"
                            >
                                <Plus size={20} /> 
                                <span>Thêm phòng</span>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span>Đang tải dữ liệu...</span>
                        </div>
                    ) : selectedBuilding === 'ALL' ? (
                        // Full Screen Grid View for ALL
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 overflow-auto min-h-[500px]">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Tất cả danh sách phòng ({sidebarRooms.length} phòng)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {sidebarRooms.map(room => (
                                    <RoomCard
                                        key={room.id}
                                        room={room}
                                        inUse={inUseRoomIds.has(room.id)}
                                        onEdit={(e) => {
                                            e.stopPropagation();
                                            setEditingRoom(room);
                                        }}
                                        onDelete={(e) => {
                                            e.stopPropagation();
                                            setRoomToDelete(room);
                                        }}
                                        onClick={() => setSelectedRoom(room)}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-zinc-800/30 rounded-2xl p-4 min-h-[500px] overflow-auto">

                            {/* Grid Layout */}
                            <div
                                className="grid gap-1"
                                style={{
                                    gridTemplateColumns: columnConfigs.map(c => c.isNarrow ? '60px' : 'minmax(80px, 1fr)').join(' '),
                                    gridTemplateRows: `repeat(${gridRows}, 60px)`
                                }}
                            >
                                {gridCells.map(({ row, col, room, element, isSpanned }) => {
                                    // Skip spanned cells
                                    if (isSpanned) return null;

                                    // Floor element (stairs, lobby, WC, etc.)
                                    if (element) {
                                        const elementColor = element.color || (
                                            element.type === 'STAIRS' ? 'bg-gray-300 dark:bg-zinc-500 bg-stripes' :
                                                element.type === 'LOBBY' ? 'bg-fpt-orange rounded-lg' :
                                                    element.type === 'ELEVATOR' ? 'bg-indigo-200 dark:bg-indigo-800/50' :
                                                        element.type === 'CORRIDOR' ? 'bg-transparent' :
                                                            'bg-teal-200 dark:bg-teal-800/50'
                                        );
                                        return (
                                            <div
                                                key={`element-${element.id}`}
                                                className={`flex flex-col items-center justify-center overflow-hidden ${elementColor} ${element.type === 'LOBBY' ? 'p-0' : 'rounded-lg'}`}
                                                style={{
                                                    gridRow: `${row + 1} / span ${element.gridRowSpan}`,
                                                    gridColumn: `${col + 1} / span ${element.gridColSpan}`
                                                }}
                                            >
                                                {element.type === 'LOBBY' ? (
                                                    <img src={element.image || "/assets/images/fpt-university-logo.png"} alt={element.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-medium text-gray-700 dark:text-white">
                                                        {element.name}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Room
                                    if (room) {
                                        const rowSpan = room.gridRowSpan || 1;
                                        const colSpan = room.gridColSpan || 1;
                                        const isInUse = inUseRoomIds.has(room.id);
                                        const isComputerLab = room.type === 'COMPUTER_LAB';
                                        const isClassroom = room.type === 'CLASSROOM';

                                        return (
                                            <div
                                                key={`room-${room.id}`}
                                                draggable={isEditMode}
                                                onDragStart={isEditMode ? (e) => handleDragStart(e, room) : undefined}
                                                onClick={() => setSelectedRoom(room)}
                                                onDoubleClick={() => handleRoomDoubleClick(room)}
                                                className={`rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all border relative group
                                                    ${isEditMode ? 'cursor-move' : ''}
                                                    ${selectedRoom?.id === room.id ? 'ring-2 ring-fpt-orange z-10' : ''}
                                                    ${isComputerLab ? 'bg-blue-100/90 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100 shadow-[0_2px_4px_rgba(59,130,246,0.1)]' :
                                                        isClassroom ? 'bg-orange-100/90 dark:bg-orange-900/40 border-orange-200 dark:border-orange-700 text-orange-900 dark:text-orange-100 shadow-[0_2px_4px_rgba(249,115,22,0.1)]' :
                                                            'bg-emerald-100/90 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 shadow-[0_2px_4px_rgba(16,185,129,0.1)]'}
                                                    ${isInUse ? 'ring-2 ring-rose-500/50 dark:ring-rose-500/30' : ''}`}
                                                style={{
                                                    gridRow: `${row + 1} / span ${rowSpan}`,
                                                    gridColumn: `${col + 1} / span ${colSpan}`
                                                }}
                                            >
                                                {isInUse && (
                                                    <div className="absolute top-1 right-1 flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                                    </div>
                                                )}
                                                <span className={`text-[11px] font-bold text-center px-1 leading-tight text-gray-800 dark:text-white`}>
                                                    {room.name}
                                                </span>
                                                {isEditMode && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveFromGrid(room); }}
                                                        className="mt-0.5 text-[9px] text-red-500 hover:underline"
                                                    >
                                                        Gỡ
                                                    </button>
                                                )}
                                                {isInUse && !isEditMode && (
                                                    <span className="text-[8px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity uppercase">Đang học</span>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Empty cell
                                    const cellLocked = isCellLocked(row, col);
                                    return (
                                        <div
                                            key={`${row}-${col}`}
                                            className={`rounded-lg flex items-center justify-center transition-all
                                                ${isEditMode && !cellLocked ? 'border border-dashed border-gray-200 dark:border-zinc-700' : ''}
                                                ${isEditMode && !cellLocked ? 'hover:border-fpt-orange hover:bg-orange-50 dark:hover:bg-orange-900/10' : ''}
                                                ${draggedRoom && !cellLocked ? 'border-fpt-orange bg-orange-50 dark:bg-orange-900/10' : ''}`}
                                            style={{
                                                gridRow: row + 1,
                                                gridColumn: col + 1
                                            }}
                                            onDragOver={(e) => isEditMode ? handleDragOver(e, row, col) : undefined}
                                            onDrop={isEditMode ? (e) => handleDrop(e, row, col) : undefined}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar - Room List (Hidden in ALL mode) */}
                {selectedBuilding !== 'ALL' && (
                    <div className="w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 overflow-auto">
                        <div className="mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                                Danh sách phòng
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">
                                {sidebarRooms.length} phòng
                            </p>
                        </div>

                        <div className="space-y-2">
                            {sidebarRooms.map(room => {
                                const isPositioned = room.gridRow != null && room.gridCol != null;

                                return (
                                    <div
                                        key={room.id}
                                        draggable={isEditMode && selectedBuilding !== 'ALL'}
                                        onDragStart={isEditMode && selectedBuilding !== 'ALL' ? (e) => handleDragStart(e, room) : undefined}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-md
                                            ${selectedRoom?.id === room.id ? 'ring-2 ring-fpt-orange' : ''}
                                            ${room.type === 'COMPUTER_LAB' ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' :
                                                room.type === 'CLASSROOM' ? 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900/30' :
                                                    'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'}
                                            ${!isPositioned ? 'border-dashed border-fpt-orange/40' : ''}
                                            ${isEditMode && selectedBuilding !== 'ALL' ? 'cursor-move' : ''}
                                        `}
                                        onClick={() => setSelectedRoom(room)}
                                        onDoubleClick={() => handleRoomDoubleClick(room)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-bold ${room.type === 'COMPUTER_LAB' ? 'text-blue-700 dark:text-blue-400' : room.type === 'CLASSROOM' ? 'text-orange-700 dark:text-orange-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                                        {room.name}
                                                    </span>
                                                    {inUseRoomIds.has(room.id) && (
                                                        <span className="relative flex h-2 w-2" title="Đang sử dụng">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] opacity-70 italic">{getRoomTypeLabel(room.type)}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                {/* Show edit/delete buttons */}
                                                <button onClick={(e) => { e.stopPropagation(); setEditingRoom(room); }} className="p-1 text-gray-400 hover:text-fpt-orange"><Edit2 size={14} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setRoomToDelete(room); }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-2 text-[10px] text-gray-500 dark:text-zinc-400">
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center gap-1">
                                                    <Maximize2 size={12} /> {room.capacity} m²
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users size={12} /> {room.capacity} người
                                                </span>
                                            </div>
                                            {room.description && (
                                                <span className="italic line-clamp-1 border-t border-gray-100 dark:border-zinc-700/30 pt-1">
                                                    {room.description}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {sidebarRooms.length === 0 && !loading && (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    Không tìm thấy phòng nào
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {isAddModalOpen && (
                <AddRoomModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => { setIsAddModalOpen(false); fetchRooms(); }}
                />
            )}

            {editingRoom && (
                <EditRoomModal
                    room={editingRoom}
                    onClose={() => setEditingRoom(null)}
                    onSuccess={() => { setEditingRoom(null); fetchRooms(); }}
                />
            )}

            <ConfirmModal
                isOpen={!!roomToDelete}
                onClose={() => setRoomToDelete(null)}
                onConfirm={handleDelete}
                title="Xóa phòng học"
                message={`Bạn có chắc chắn muốn xóa phòng "${roomToDelete?.name}" không?\nHành động này không thể hoàn tác.`}
                confirmLabel="Xóa"
                cancelLabel="Hủy"
                type="danger"
            />

            {/* Saving indicator */}
            {saving && (
                <div className="fixed bottom-4 right-4 bg-fpt-orange text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
                    <Loader2 size={16} className="animate-spin" /> Đang lưu...
                </div>
            )}
        </AcademicStaffLayout>
    );
};

