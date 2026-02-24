import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Check, ChevronDown, Users, DoorOpen } from 'lucide-react';
import { roomService } from '../../services/api/roomService';
import { Room } from '../../types/room';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { BUILDING_CONFIG, getFloorElements, getRoomTypeLabel, filterPositionedRooms, FloorElement, ROOM_TYPE_OPTIONS, getRoomTypeDisplayLabel } from '../../utils/roomUtils';

const BUILDINGS = Object.keys(BUILDING_CONFIG);

interface RoomListTemplateProps {
    Layout: React.ComponentType<{ children: React.ReactNode; pageTitle: string }>;
    basePath: string;
}

export const RoomListTemplate: React.FC<RoomListTemplateProps> = ({ Layout, basePath }) => {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBuilding, setSelectedBuilding] = useState<string>('Gamma');
    const [selectedFloor, setSelectedFloor] = useState<number>(1);

    // Dropdown states
    const [isBuildingFilterOpen, setIsBuildingFilterOpen] = useState(false);
    const [isFloorFilterOpen, setIsFloorFilterOpen] = useState(false);
    const [isRoomTypeFilterOpen, setIsRoomTypeFilterOpen] = useState(false);
    const [selectedRoomType, setSelectedRoomType] = useState<string>('ALL');

    const currentBuildingConfig = useMemo(() => {
        if (selectedBuilding === 'ALL') return null;
        return BUILDING_CONFIG[selectedBuilding as keyof typeof BUILDING_CONFIG];
    }, [selectedBuilding]);

    const gridRows = currentBuildingConfig?.gridRows || 10;
    const gridCols = currentBuildingConfig?.gridCols || 7;

    // Column Configuration
    const columnConfigs = useMemo(() => {
        if (!currentBuildingConfig) return [];
        const narrowCols = currentBuildingConfig.narrowColumns || [];
        return Array(gridCols).fill(null).map((_, idx) => ({
            isNarrow: narrowCols.includes(idx)
        }));
    }, [currentBuildingConfig, gridCols]);

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const data = await roomService.getAllRooms();
            setRooms(data);
        } catch {
            toast.error('Không thể tải danh sách phòng học');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const availableFloors = useMemo(() => {
        if (selectedBuilding === 'ALL') return [];
        const building = BUILDING_CONFIG[selectedBuilding as keyof typeof BUILDING_CONFIG];
        if (!building) return [];
        return Object.keys(building.floors).map(Number).sort((a, b) => a - b);
    }, [selectedBuilding]);

    useEffect(() => {
        if (selectedBuilding !== 'ALL' && availableFloors.length > 0 && !availableFloors.includes(selectedFloor)) {
            setSelectedFloor(availableFloors[0]);
        }
    }, [selectedBuilding, availableFloors, selectedFloor]);

    // Only show positioned rooms for student/lecturer
    const filteredRooms = useMemo(() => {
        let result = filterPositionedRooms(rooms);

        if (selectedBuilding !== 'ALL') {
            result = result.filter(r => r.building === selectedBuilding && r.floor === selectedFloor);
        } else {
            result = [...result].sort((a, b) => a.building.localeCompare(b.building) || a.floor - b.floor || a.name.localeCompare(b.name));
        }

        if (selectedRoomType !== 'ALL') {
            result = result.filter(r => r.type === selectedRoomType);
        }

        return result;
    }, [rooms, selectedBuilding, selectedFloor, selectedRoomType]);

    // Rooms positioned on grid
    const positionedRooms = useMemo(() => {
        if (selectedBuilding === 'ALL') return [];
        return filteredRooms.filter(r => r.gridRow != null && r.gridCol != null);
    }, [filteredRooms, selectedBuilding]);

    // Sidebar rooms sorted by name
    const sidebarRooms = useMemo(() => {
        return [...filteredRooms].sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredRooms]);

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

    // Generate grid cells (matching Academic Staff logic exactly)
    const gridCells = useMemo(() => {
        const cells: Array<{ row: number; col: number; room: Room | undefined; element: FloorElement | undefined; isSpanned: boolean }> = [];
        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                const element = floorElements.find(el => el.gridRow === row && el.gridCol === col);
                const room = positionedRooms.find(r => r.gridRow === row && r.gridCol === col);
                const isSpanned = !element && !room && (isOccupiedByElement(row, col) || isOccupiedByRoom(row, col));
                cells.push({ row, col, room, element, isSpanned });
            }
        }
        return cells;
    }, [positionedRooms, floorElements, gridRows, gridCols]);

    const handleRoomClick = (room: Room) => {
        navigate(`${basePath}/rooms/${room.id}`);
    };

    return (
        <Layout pageTitle="Danh sách phòng học">
            <div className="flex gap-6 h-[calc(100vh-120px)]">
                {/* Main Content - Floor Plan Grid */}
                <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 overflow-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div className="flex items-center gap-6">
                            {/* Building Select */}
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

                            {/* Room Type Filter */}
                            <div className="flex items-center gap-2 relative">
                                <span className="text-xs font-medium text-gray-500 dark:text-zinc-500">Loại phòng:</span>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsRoomTypeFilterOpen(!isRoomTypeFilterOpen)}
                                        className="flex items-center gap-2 rounded-lg border border-gray-300 py-2 pl-3 pr-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 min-w-[140px]"
                                    >
                                        <span className="flex-1 text-left">
                                            {getRoomTypeDisplayLabel(selectedRoomType)}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isRoomTypeFilterOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isRoomTypeFilterOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsRoomTypeFilterOpen(false)}></div>
                                            <div className="absolute left-0 top-full mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-20 dark:border-zinc-700 dark:bg-zinc-800 transition-all duration-200">
                                                <button
                                                    onClick={() => { setSelectedRoomType('ALL'); setIsRoomTypeFilterOpen(false); }}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center justify-between ${selectedRoomType === 'ALL' ? 'text-fpt-orange bg-orange-50 dark:bg-orange-900/10' : 'text-gray-700 dark:text-gray-200'}`}
                                                >
                                                    <span>Tất cả loại phòng</span>
                                                    {selectedRoomType === 'ALL' && <Check className="h-4 w-4" />}
                                                </button>
                                                {ROOM_TYPE_OPTIONS.map(type => (
                                                    <button
                                                        key={type.value}
                                                        onClick={() => { setSelectedRoomType(type.value); setIsRoomTypeFilterOpen(false); }}
                                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center justify-between ${selectedRoomType === type.value ? 'text-fpt-orange bg-orange-50 dark:bg-orange-900/10' : 'text-gray-700 dark:text-gray-200'}`}
                                                    >
                                                        <span>{type.label}</span>
                                                        {selectedRoomType === type.value && <Check className="h-4 w-4" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Floor Filters */}
                            {selectedBuilding !== 'ALL' && (
                                <div className="flex items-center gap-2 relative">
                                    <span className="text-xs font-medium text-gray-500 dark:text-zinc-500">Tầng:</span>
                                    <div className="relative w-48">
                                        <button
                                            onClick={() => setIsFloorFilterOpen(!isFloorFilterOpen)}
                                            className="flex items-center gap-2 rounded-lg border border-gray-300 py-2 pl-3 pr-2 text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 w-full"
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

                        <div className="text-sm text-gray-500 dark:text-zinc-400">
                            Hiển thị <span className="font-semibold text-fpt-orange">{filteredRooms.length}</span> phòng
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span>Đang tải dữ liệu...</span>
                        </div>
                    ) : selectedBuilding === 'ALL' ? (
                        /* Card list view for ALL buildings */
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-auto min-h-[500px]">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Tất cả phòng học ({filteredRooms.length} phòng)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredRooms.map(room => {
                                    const isComputerLab = room.type === 'COMPUTER_LAB';
                                    const isClassroom = room.type === 'CLASSROOM';

                                    return (
                                        <div
                                            key={room.id}
                                            onClick={() => handleRoomClick(room)}
                                            className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer group
                                                ${isComputerLab ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800' :
                                                    isClassroom ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/40' :
                                                        'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800'}
                                            `}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className={`p-2 rounded-lg ${isComputerLab ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : isClassroom ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300' : 'bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300'}`}>
                                                    <DoorOpen className="w-5 h-5" />
                                                </div>
                                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${isComputerLab ? 'bg-blue-100 text-blue-700' : isClassroom ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {getRoomTypeLabel(room.type)}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-fpt-orange transition-colors">{room.name}</h4>
                                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-700/50 space-y-1 text-xs text-gray-500 dark:text-zinc-400">
                                                <div className="flex justify-between">
                                                    <span>Vị trí:</span>
                                                    <span className="font-medium text-gray-700 dark:text-gray-200">{room.building} - Tầng {room.floor}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Sức chứa:</span>
                                                    <span className="font-medium text-gray-700 dark:text-gray-200">{room.capacity} người</span>
                                                </div>
                                                {room.description && (
                                                    <div className="flex flex-col gap-1 mt-1 border-t border-gray-100 dark:border-zinc-700/30 pt-1">
                                                        <span className="text-[10px] text-gray-400">Mô tả:</span>
                                                        <span className="font-medium text-gray-700 dark:text-gray-200 line-clamp-2 italic">{room.description}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* Visual Grid for specific building/floor - matching Academic Staff structure */
                        <div className="bg-gray-50 dark:bg-zinc-800/30 rounded-2xl p-4 min-h-[500px] overflow-auto">
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
                                        const isComputerLab = room.type === 'COMPUTER_LAB';
                                        const isClassroom = room.type === 'CLASSROOM';

                                        return (
                                            <div
                                                key={`room-${room.id}`}
                                                onClick={() => handleRoomClick(room)}
                                                className={`rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all border
                                                    ${isComputerLab ? 'bg-blue-100/90 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100 shadow-[0_2px_4px_rgba(59,130,246,0.1)]' :
                                                        isClassroom ? 'bg-orange-100/90 dark:bg-orange-900/40 border-orange-200 dark:border-orange-700 text-orange-900 dark:text-orange-100 shadow-[0_2px_4px_rgba(249,115,22,0.1)]' :
                                                            'bg-emerald-100/90 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 shadow-[0_2px_4px_rgba(16,185,129,0.1)]'}
                                                    hover:ring-2 hover:ring-fpt-orange hover:z-10 shadow-sm`}
                                                style={{
                                                    gridRow: `${row + 1} / span ${rowSpan}`,
                                                    gridColumn: `${col + 1} / span ${colSpan}`
                                                }}
                                            >
                                                <span className="text-[11px] font-bold text-center px-1 leading-tight">{room.name}</span>
                                            </div>
                                        );
                                    }

                                    // Empty cell
                                    return (
                                        <div
                                            key={`${row}-${col}`}
                                            className="rounded-lg"
                                            style={{
                                                gridRow: row + 1,
                                                gridColumn: col + 1
                                            }}
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
                            <h3 className="font-bold text-gray-900 dark:text-white">Danh sách phòng</h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">{sidebarRooms.length} phòng</p>
                        </div>

                        <div className="space-y-2">
                            {sidebarRooms.map(room => {

                                return (
                                    <div
                                        key={room.id}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-md hover:border-fpt-orange/50 
                                                ${room.type === 'COMPUTER_LAB' ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' :
                                                room.type === 'CLASSROOM' ? 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900/30' :
                                                    'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'}
                                        `}
                                        onClick={() => handleRoomClick(room)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-bold ${room.type === 'COMPUTER_LAB' ? 'text-blue-700 dark:text-blue-400' : room.type === 'CLASSROOM' ? 'text-orange-700 dark:text-orange-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                                    {room.name}
                                                </span>
                                                <span className="text-[10px] opacity-70 italic">{getRoomTypeLabel(room.type)}</span>
                                            </div>
                                            <div className={`p-1.5 rounded-lg transition-colors shadow-sm ${room.type === 'COMPUTER_LAB' ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : room.type === 'CLASSROOM' ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300' : 'bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300'} group-hover:bg-fpt-orange group-hover:text-white`}>
                                                <DoorOpen size={14} />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-2 text-[10px] opacity-60">
                                            <span className="flex items-center gap-1">
                                                <Users size={12} /> {room.capacity} người
                                            </span>
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
        </Layout>
    );
};
