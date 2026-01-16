import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { Plus, Loader2, Edit2, Trash2, GripVertical, Maximize2, Users, Check, ChevronDown } from 'lucide-react';
import { roomService } from '../../services/api/roomService';
import { Room } from '../../types/room';
import { AddRoomModal, EditRoomModal } from '../../components/academic-staff/rooms/RoomModals';
import toast from 'react-hot-toast';

// Building configuration
const BUILDING_CONFIG = {
    'Gamma': { floors: [1, 2, 3, 4] },
    'Alpha': { floors: [1, 2, 3, 4, 5, 6, 7] }
};

const BUILDINGS = Object.keys(BUILDING_CONFIG) as Array<keyof typeof BUILDING_CONFIG>;
const GRID_ROWS = 10;
const GRID_COLS = 7;

// Fixed floor plan elements (lobby, stairs, WC, etc.)
type FloorElement = {
    id: string;
    name: string;
    type: 'STAIRS' | 'CORRIDOR' | 'ELEVATOR' | 'RESTROOM' | 'LOBBY';
    gridRow: number;
    gridCol: number;
    gridRowSpan: number;
    gridColSpan: number;
    color?: string;
};

// Default floor elements matching the image layout
const getFloorElements = (_building: string, _floor: number): FloorElement[] => {
    return [
        // Lobby in center (spans 3 cols, 2 rows)
        { id: 'lobby', name: 'Sảnh', type: 'LOBBY', gridRow: 3, gridCol: 2, gridRowSpan: 4, gridColSpan: 3 },
        // Stairs on left (spans 2 rows)
        { id: 'stairs', name: 'Cầu thang', type: 'STAIRS', gridRow: 4, gridCol: 0, gridRowSpan: 2, gridColSpan: 1 },
        { id: 'stairs', name: 'Cầu thang', type: 'STAIRS', gridRow: 4, gridCol: 6, gridRowSpan: 2, gridColSpan: 1 },
        // WC nữ (top right, green)
        { id: 'wc-nu', name: 'WC nữ', type: 'RESTROOM', gridRow: 3, gridCol: 6, gridRowSpan: 1, gridColSpan: 1, color: 'bg-green-200 dark:bg-green-800/50' },
        // WC nam (bottom right, blue)
        { id: 'wc-nam', name: 'WC nam', type: 'RESTROOM', gridRow: 6, gridCol: 6, gridRowSpan: 1, gridColSpan: 1, color: 'bg-blue-200 dark:bg-blue-800/50' },
    ];
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

    // Dropdown states
    const [isBuildingFilterOpen, setIsBuildingFilterOpen] = useState(false);
    const [isFloorFilterOpen, setIsFloorFilterOpen] = useState(false);

    // Modal states
    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);

    // Navigation
    const navigate = useNavigate();

    // Column Configuration (read-only)
    const columnConfigs = useMemo(() => {
        const initial = Array(GRID_COLS).fill(null).map(() => ({ isLocked: false, isNarrow: false }));
        // Default: Shrink and lock columns 1 and 5 only
        if (initial[1]) {
            initial[1].isNarrow = true;
            initial[1].isLocked = true;
        }
        if (initial[5]) {
            initial[5].isNarrow = true;
            initial[5].isLocked = true;
        }
        return initial;
    }, []);

    // Locked rows (entire row is locked)
    const LOCKED_ROWS = [2, 7];

    // Locked specific cells (row, col pairs)
    const LOCKED_CELLS: Array<{ row: number; col: number }> = [
        { row: 0, col: 3 },
        { row: 9, col: 3 },
    ];

    // Helper function to check if a cell is locked
    const isCellLocked = (row: number, col: number): boolean => {
        // Check if column is locked
        if (columnConfigs[col]?.isLocked) return true;
        // Check if row is locked
        if (LOCKED_ROWS.includes(row)) return true;
        // Check if specific cell is locked
        if (LOCKED_CELLS.some(cell => cell.row === row && cell.col === col)) return true;
        return false;
    };

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const data = await roomService.getAllRooms();
            setRooms(data);
        } catch (error) {
            toast.error('Không thể tải danh sách phòng học');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    // Available floors based on selected building
    const availableFloors = useMemo(() => {
        if (selectedBuilding === 'ALL') return [];
        return BUILDING_CONFIG[selectedBuilding as keyof typeof BUILDING_CONFIG]?.floors || [];
    }, [selectedBuilding]);

    // Reset floor when building changes
    useEffect(() => {
        if (selectedBuilding !== 'ALL' && !availableFloors.includes(selectedFloor)) {
            setSelectedFloor(availableFloors[0] || 1);
        }
    }, [selectedBuilding, availableFloors, selectedFloor]);

    const filteredRooms = useMemo(() => {
        if (selectedBuilding === 'ALL') {
            return [...rooms].sort((a, b) => a.building.localeCompare(b.building) || a.floor - b.floor || a.name.localeCompare(b.name));
        }
        return rooms.filter(r => r.building === selectedBuilding && r.floor === selectedFloor);
    }, [rooms, selectedBuilding, selectedFloor]);

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

    const handleDelete = async (id: number) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa phòng này?')) return;
        try {
            await roomService.deleteRoom(id);
            toast.success('Đã xóa phòng học');
            fetchRooms();
            if (selectedRoom?.id === id) setSelectedRoom(null);
        } catch (error) {
            toast.error('Không thể xóa phòng học');
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
        if (!draggedRoom) return;

        // Check if cell is locked
        if (isCellLocked(row, col)) {
            toast.error('Ô này đã bị khóa');
            return;
        }

        // Check if cell is occupied
        const occupiedRoom = positionedRooms.find(r =>
            r.id !== draggedRoom.id &&
            r.gridRow === row &&
            r.gridCol === col
        );
        if (occupiedRoom) {
            toast.error('Ô này đã có phòng khác');
            return;
        }

        try {
            setSaving(true);
            await roomService.updateRoom(draggedRoom.id, {
                ...draggedRoom,
                gridRow: row,
                gridCol: col
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
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
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
    }, [positionedRooms, floorElements]);

    return (
        <AcademicStaffLayout pageTitle="Quản lý phòng học">
            <div className="flex gap-6 h-[calc(100vh-120px)]">
                {/* Main Content - Floor Plan Grid */}
                <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 overflow-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div className="flex items-center gap-6">
                            {/* Building Select - Custom Dropdown */}
                            <div className="flex items-center gap-2 relative">
                                <span className="text-xs font-medium text-gray-500 dark:text-zinc-500">Tòa nhà:</span>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsBuildingFilterOpen(!isBuildingFilterOpen)}
                                        className="flex items-center gap-2 rounded-lg border border-gray-300 py-2 pl-3 pr-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 min-w-[120px]"
                                    >
                                        <span className="flex-1 text-left">{selectedBuilding === 'ALL' ? 'Tất cả' : selectedBuilding}</span>
                                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isBuildingFilterOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isBuildingFilterOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsBuildingFilterOpen(false)}></div>
                                            <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-20 dark:border-zinc-700 dark:bg-zinc-800">
                                                <button
                                                    onClick={() => { setSelectedBuilding('ALL'); setIsBuildingFilterOpen(false); }}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center justify-between ${selectedBuilding === 'ALL' ? 'text-fpt-orange bg-orange-50 dark:bg-orange-900/10' : 'text-gray-700 dark:text-gray-200'}`}
                                                >
                                                    <span>Tất cả</span>
                                                    {selectedBuilding === 'ALL' && <Check className="h-4 w-4" />}
                                                </button>
                                                {BUILDINGS.map(b => (
                                                    <button
                                                        key={b}
                                                        onClick={() => { setSelectedBuilding(b); setIsBuildingFilterOpen(false); }}
                                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center justify-between ${selectedBuilding === b ? 'text-fpt-orange bg-orange-50 dark:bg-orange-900/10' : 'text-gray-700 dark:text-gray-200'}`}
                                                    >
                                                        <span>{b}</span>
                                                        {selectedBuilding === b && <Check className="h-4 w-4" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Floor Filters - Only show if not ALL */}
                            {selectedBuilding !== 'ALL' && (
                                <div className="flex items-center gap-2 relative">
                                    <span className="text-xs font-medium text-gray-500 dark:text-zinc-500">Tầng:</span>
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsFloorFilterOpen(!isFloorFilterOpen)}
                                            className="flex items-center gap-2 rounded-lg border border-gray-300 py-2 pl-3 pr-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 min-w-[100px]"
                                        >
                                            <span className="flex-1 text-left">Tầng {selectedFloor}</span>
                                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isFloorFilterOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isFloorFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsFloorFilterOpen(false)}></div>
                                                <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-20 dark:border-zinc-700 dark:bg-zinc-800 max-h-60 overflow-y-auto">
                                                    {availableFloors.map(floor => (
                                                        <button
                                                            key={floor}
                                                            onClick={() => { setSelectedFloor(floor); setIsFloorFilterOpen(false); }}
                                                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center justify-between ${selectedFloor === floor ? 'text-fpt-orange bg-orange-50 dark:bg-orange-900/10' : 'text-gray-700 dark:text-gray-200'}`}
                                                        >
                                                            <span>Tầng {floor}</span>
                                                            {selectedFloor === floor && <Check className="h-4 w-4" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Hide edit mode toggle if ALL */}
                            {selectedBuilding !== 'ALL' && (
                                <button
                                    onClick={() => setIsEditMode(!isEditMode)}
                                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${isEditMode
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                                        }`}
                                >
                                    <GripVertical size={18} /> {isEditMode ? 'Đang chỉnh sửa' : 'Chế độ kéo thả'}
                                </button>
                            )}
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-fpt-orange text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-600 transition-colors text-sm font-medium"
                            >
                                <Plus size={18} /> Thêm phòng
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {sidebarRooms.map(room => {
                                    const isPositioned = room.gridRow != null && room.gridCol != null;
                                    return (
                                        <div
                                            key={room.id}
                                            className={`p-4 rounded-xl border transition-all hover:shadow-md
                                                ${!isPositioned ? 'bg-orange-50 border-orange-200 text-gray-900' : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'}
                                            `}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {room.name}
                                                </span>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingRoom(room)} className="text-gray-400 hover:text-fpt-orange"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDelete(room.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            <div className="space-y-1 text-sm text-gray-600 dark:text-zinc-400">
                                                <div className="flex justify-between">
                                                    <span>Loại:</span>
                                                    <span className="font-medium text-gray-900 dark:text-gray-200">{getRoomTypeLabel(room.type)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Tòa nhà:</span>
                                                    <span className="font-medium text-gray-900 dark:text-gray-200">{room.building} - Tầng {room.floor}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Sức chứa:</span>
                                                    <span className="font-medium text-gray-900 dark:text-gray-200">{room.capacity} người</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Trạng thái:</span>
                                                    <span className={`font-medium ${!isPositioned ? 'text-red-500' : 'text-green-500'}`}>
                                                        {!isPositioned ? 'Chưa xếp vị trí' : 'Đã xếp vị trí'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-zinc-800/30 rounded-2xl p-4 min-h-[500px] overflow-auto">

                            {/* Grid Layout */}
                            <div
                                className="grid gap-1"
                                style={{
                                    gridTemplateColumns: columnConfigs.map(c => c.isNarrow ? '60px' : 'minmax(80px, 1fr)').join(' '),
                                    gridTemplateRows: `repeat(${GRID_ROWS}, 60px)`
                                }}
                            >
                                {gridCells.map(({ row, col, room, element, isSpanned }) => {
                                    // Skip spanned cells
                                    if (isSpanned) return null;

                                    // Floor element (stairs, lobby, WC, etc.)
                                    if (element) {
                                        const elementColor = element.color || (
                                            element.type === 'STAIRS' ? 'bg-gray-300 dark:bg-zinc-500 bg-stripes' :
                                                element.type === 'LOBBY' ? 'bg-fpt-orange' :
                                                    element.type === 'ELEVATOR' ? 'bg-indigo-200 dark:bg-indigo-800/50' :
                                                        element.type === 'CORRIDOR' ? 'bg-transparent' :
                                                            'bg-teal-200 dark:bg-teal-800/50'
                                        );
                                        return (
                                            <div
                                                key={`element-${element.id}`}
                                                className={`rounded-lg flex flex-col items-center justify-center overflow-hidden ${elementColor} ${element.type === 'LOBBY' ? 'p-0' : ''}`}
                                                style={{
                                                    gridRow: `${row + 1} / span ${element.gridRowSpan}`,
                                                    gridColumn: `${col + 1} / span ${element.gridColSpan}`
                                                }}
                                            >
                                                {element.type === 'LOBBY' ? (
                                                    <img src="/assets/images/fpt-university-logo.png" alt="FPT Logo" className="w-full h-full object-cover" />
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
                                        return (
                                            <div
                                                key={`room-${room.id}`}
                                                draggable={isEditMode}
                                                onDragStart={isEditMode ? (e) => handleDragStart(e, room) : undefined}
                                                onClick={() => setSelectedRoom(room)}
                                                onDoubleClick={() => handleRoomDoubleClick(room)}
                                                className={`rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all
                                                    ${isEditMode ? 'cursor-move' : ''}
                                                    ${selectedRoom?.id === room.id ? 'ring-2 ring-fpt-orange' : ''}
                                                    ${room.type === 'LAB' ? 'bg-blue-200 dark:bg-blue-800/50' :
                                                        room.status === 'MAINTENANCE' ? 'bg-yellow-200 dark:bg-yellow-800/50' :
                                                            room.status === 'INACTIVE' ? 'bg-red-200 dark:bg-red-800/50' :
                                                                'bg-gray-300 dark:bg-zinc-600'}`}
                                                style={{
                                                    gridRow: `${row + 1} / span ${rowSpan}`,
                                                    gridColumn: `${col + 1} / span ${colSpan}`
                                                }}
                                            >
                                                <span className="text-xs font-bold text-gray-800 dark:text-white">{room.name}</span>
                                                {isEditMode && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveFromGrid(room); }}
                                                        className="mt-1 text-xs text-red-500 hover:underline"
                                                    >
                                                        Gỡ
                                                    </button>
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
                    <div className="w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-4 overflow-auto">
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
                                        className={`p-3 rounded-xl border transition-all cursor-pointer
                                            ${selectedRoom?.id === room.id ? 'ring-2 ring-fpt-orange' : ''}
                                            ${!isPositioned ? 'bg-orange-50 border-orange-200 text-gray-900' : 'bg-gray-50 border-gray-200 text-gray-500'}
                                            ${isEditMode && selectedBuilding !== 'ALL' ? 'cursor-move hover:shadow-md' : ''}
                                        `}
                                        onClick={() => setSelectedRoom(room)}
                                        onDoubleClick={() => handleRoomDoubleClick(room)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-semibold ${!isPositioned ? 'text-gray-900 dark:text-gray-900' : 'text-gray-500 dark:text-zinc-500'}`}>
                                                    {room.name} ({getRoomTypeLabel(room.type)})
                                                </span>
                                            </div>
                                            <div className="flex gap-1">
                                                {/* Show edit/delete buttons */}
                                                <button onClick={(e) => { e.stopPropagation(); setEditingRoom(room); }} className="p-1 text-gray-400 hover:text-fpt-orange"><Edit2 size={14} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(room.id); }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-zinc-400">
                                            <span className="flex items-center gap-1">
                                                <Maximize2 size={12} /> {room.capacity} m²
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users size={12} /> {room.capacity} người
                                            </span>
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

            {/* Saving indicator */}
            {saving && (
                <div className="fixed bottom-4 right-4 bg-fpt-orange text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
                    <Loader2 size={16} className="animate-spin" /> Đang lưu...
                </div>
            )}
        </AcademicStaffLayout>
    );
};
