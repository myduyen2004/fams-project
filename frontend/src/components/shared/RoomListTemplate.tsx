import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, DoorOpen, Users } from 'lucide-react';
import { roomService } from '../../services/api/roomService';
import { Room } from '../../types/room';
import toast from "@utils/toast";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BUILDING_CONFIG, getFloorElements, getRoomTypeLabel, FloorElement, ROOM_TYPE_OPTIONS } from '../../utils/roomUtils';
import { RoomCard } from './RoomCard';
import { CustomSelect } from '../common/CustomSelect';

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
    const [inUseRoomIds, setInUseRoomIds] = useState<Set<number>>(new Set());

    const [selectedRoomType, setSelectedRoomType] = useState<string>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'IN_USE' | 'EMPTY'>('ALL');
    const [searchParams, setSearchParams] = useSearchParams();

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
            
            // Fetch real-time occupancy based on actual slot times from database
            try {
                const occupiedIds = await roomService.getCurrentlyInUseRoomIds();
                setInUseRoomIds(occupiedIds);
            } catch (availabilityErr) {
                console.error('Failed to fetch room availability:', availabilityErr);
            }
        } catch {
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

    // Show all rooms (positioned and unpositioned)
    const filteredRooms = useMemo(() => {
        let result = rooms;

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
    }, [rooms, selectedBuilding, selectedFloor, selectedRoomType, selectedStatus, inUseRoomIds]);

    // Rooms positioned on grid
    const positionedRooms = useMemo(() => {
        if (selectedBuilding === 'ALL') return [];
        return filteredRooms.filter(r => r.gridRow != null && r.gridCol != null);
    }, [filteredRooms, selectedBuilding]);

    // Sidebar rooms sorted by name, unpositioned first
    const sidebarRooms = useMemo(() => {
        return [...filteredRooms].sort((a, b) => {
            const aUnpositioned = a.gridRow == null || a.gridCol == null;
            const bUnpositioned = b.gridRow == null || b.gridCol == null;
            if (aUnpositioned && !bUnpositioned) return -1;
            if (!aUnpositioned && bUnpositioned) return 1;
            return a.name.localeCompare(b.name);
        });
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
                    <div className="flex flex-col gap-6 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Building Select */}
                            <CustomSelect
                                label="Tòa nhà"
                                value={selectedBuilding}
                                onChange={(val) => {
                                    setSelectedBuilding(val);
                                    if (val !== 'ALL') {
                                        // Reset floor when building changes
                                        const building = BUILDING_CONFIG[val as keyof typeof BUILDING_CONFIG];
                                        if (building) {
                                            const floors = Object.keys(building.floors).map(Number).sort((a, b) => a - b);
                                            if (floors.length > 0) setSelectedFloor(floors[0]);
                                        }
                                    }
                                }}
                                options={[
                                    { label: 'Tất cả', value: 'ALL' },
                                    ...BUILDINGS.map(b => ({ label: b, value: b }))
                                ]}
                            />

                            {/* Room Type Filter */}
                            <CustomSelect
                                label="Loại phòng"
                                value={selectedRoomType}
                                onChange={setSelectedRoomType}
                                options={[
                                    { label: 'Tất cả', value: 'ALL' },
                                    ...ROOM_TYPE_OPTIONS.map(type => ({ label: type.label, value: type.value }))
                                ]}
                            />

                            {/* Status Filter - Only functional in ALL mode */}
                            {selectedBuilding === 'ALL' ? (
                                <CustomSelect
                                    label="Trạng thái"
                                    value={selectedStatus}
                                    onChange={(val) => setSelectedStatus(val as any)}
                                    options={[
                                        { value: 'ALL', label: 'Tất cả' },
                                        { value: 'IN_USE', label: 'Đang học' },
                                        { value: 'EMPTY', label: 'Trống' }
                                    ]}
                                />
                            ) : (
                                /* Floor Filter */
                                <CustomSelect
                                    label="Tầng"
                                    value={selectedFloor.toString()}
                                    onChange={(val) => setSelectedFloor(Number(val))}
                                    options={availableFloors.map(floor => ({
                                        label: `Tầng ${floor}`,
                                        value: floor.toString()
                                    }))}
                                />
                            )}

                            {/* Summary Info */}
                            <div className="flex items-end pb-1 px-2">
                                <div className="text-sm text-gray-500 dark:text-zinc-400 font-medium">
                                    Hiển thị <span className="text-fpt-orange font-bold text-lg">{filteredRooms.length}</span> phòng
                                </div>
                            </div>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredRooms.map(room => (
                                    <RoomCard
                                        key={room.id}
                                        room={room}
                                        inUse={inUseRoomIds.has(room.id)}
                                        onClick={() => handleRoomClick(room)}
                                    />
                                ))}
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
                                        const isInUse = inUseRoomIds.has(room.id);

                                        return (
                                            <div
                                                key={`room-${room.id}`}
                                                onClick={() => handleRoomClick(room)}
                                                className={`rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all border relative group
                                                    ${isComputerLab ? 'bg-blue-100/90 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100 shadow-[0_2px_4px_rgba(59,130,246,0.1)]' :
                                                        isClassroom ? 'bg-orange-100/90 dark:bg-orange-900/40 border-orange-200 dark:border-orange-700 text-orange-900 dark:text-orange-100 shadow-[0_2px_4px_rgba(249,115,22,0.1)]' :
                                                            'bg-emerald-100/90 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 shadow-[0_2px_4px_rgba(16,185,129,0.1)]'}
                                                    ${isInUse ? 'ring-2 ring-rose-500/50 dark:ring-rose-500/30' : 'hover:ring-2 hover:ring-fpt-orange'} 
                                                    hover:z-10 shadow-sm`}
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
                                                <span className="text-[11px] font-bold text-center px-1 leading-tight">
                                                    {room.name}
                                                </span>
                                                {isInUse && (
                                                    <span className="text-[8px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity uppercase">Đang học</span>
                                                )}
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
                                const isPositioned = room.gridRow != null && room.gridCol != null;

                                return (
                                    <div
                                        key={room.id}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-md hover:border-fpt-orange/50 
                                                ${room.type === 'COMPUTER_LAB' ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' :
                                                room.type === 'CLASSROOM' ? 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900/30' :
                                                    'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'}
                                                ${!isPositioned ? 'border-dashed border-2 border-fpt-orange/50' : ''}
                                        `}
                                        onClick={() => handleRoomClick(room)}
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
                                            <div className={`p-1.5 rounded-lg transition-colors shadow-sm ${room.type === 'COMPUTER_LAB' ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : room.type === 'CLASSROOM' ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300' : 'bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300'} group-hover:bg-fpt-orange group-hover:text-white`}>
                                                <DoorOpen size={14} />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-2 text-[10px] opacity-60">
                                            {!isPositioned && (
                                                <span className="text-red-500 font-medium">Chưa xếp vị trí trên sơ đồ</span>
                                            )}
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

