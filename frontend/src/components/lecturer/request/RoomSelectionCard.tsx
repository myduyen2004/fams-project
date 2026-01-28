import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Users, Calendar, AlertCircle } from 'lucide-react';
import { roomService, RoomWithAvailability } from '../../../services/api/roomService';
import { Room } from '../../../types/room';
import toast from 'react-hot-toast';

// Building configuration for Gamma
const FLOORS = [2, 3, 4];

interface RoomSelectionCardProps {
    selectedRoom: Room | null;
    onRoomSelect: (room: Room | null) => void;
    selectedDate: string;
    selectedSlot: number | null;
}

export const RoomSelectionCard: React.FC<RoomSelectionCardProps> = ({
    selectedRoom,
    onRoomSelect,
    selectedDate,
    selectedSlot
}) => {
    const [rooms, setRooms] = useState<RoomWithAvailability[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeFloor, setActiveFloor] = useState(2);

    // Check if date and slot are selected
    const hasFilters = selectedDate && selectedSlot;

    // Fetch rooms with availability when date and slot change
    useEffect(() => {
        const fetchRooms = async () => {
            if (!selectedDate || !selectedSlot) {
                // If no date/slot selected, just fetch all rooms with all marked as unavailable
                try {
                    const data = await roomService.getAllRooms();
                    const gammaRooms = data.filter(room => room.building === 'Gamma');
                    setRooms(gammaRooms.map(room => ({ ...room, isAvailable: false })));
                } catch (error) {
                    console.error('Error fetching rooms:', error);
                }
                return;
            }

            try {
                setLoading(true);
                // Fetch rooms with availability from new API
                const data = await roomService.getRoomAvailability(selectedDate, selectedSlot);
                // Filter only Gamma building rooms
                const gammaRooms = data.filter(room => room.building === 'Gamma');
                setRooms(gammaRooms);
            } catch (error) {
                console.error('Error fetching room availability:', error);
                toast.error('Không thể tải trạng thái phòng học');
                // Fallback: fetch all rooms and mark as unknown
                try {
                    const data = await roomService.getAllRooms();
                    const gammaRooms = data.filter(room => room.building === 'Gamma');
                    setRooms(gammaRooms.map(room => ({ ...room, isAvailable: room.status === 'ACTIVE' })));
                } catch (fallbackError) {
                    console.error('Fallback error:', fallbackError);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
    }, [selectedDate, selectedSlot]);

    // Filter rooms by active floor
    const filteredRooms = useMemo(() => {
        return rooms.filter(room => room.floor === activeFloor);
    }, [rooms, activeFloor]);

    // Handle room click
    const handleRoomClick = (room: RoomWithAvailability) => {
        if (!room.isAvailable) return;

        if (selectedRoom?.id === room.id) {
            onRoomSelect(null); // Deselect if clicking the same room
        } else {
            onRoomSelect(room);
        }
    };

    // Count rooms per floor
    const getFloorStats = (floor: number) => {
        const floorRooms = rooms.filter(r => r.floor === floor);
        const availableCount = floorRooms.filter(r => r.isAvailable).length;
        return { total: floorRooms.length, available: availableCount };
    };

    return (
        <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Chọn phòng học mới</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Gamma Building • {hasFilters ? `Ngày ${selectedDate} - Slot ${selectedSlot}` : 'Chọn ngày và slot để xem phòng trống'}
                        </p>
                    </div>
                </div>
                {selectedRoom && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-fpt-orange/10 rounded-xl border border-fpt-orange/20">
                        <span className="text-sm text-fpt-orange font-semibold">
                            Đang chọn: <span className="font-bold">{selectedRoom.name}</span>
                        </span>
                    </div>
                )}
            </div>

            {/* Warning if no filters */}
            {!hasFilters && (
                <div className="mx-6 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/30 flex items-start gap-2">
                    <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                        Vui lòng chọn <strong>Ngày thay đổi</strong> và <strong>Slot mới</strong> ở trên để xem trạng thái phòng trống.
                    </p>
                </div>
            )}

            <div className="flex">
                {/* Floor Sidebar */}
                <aside className="w-20 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 gap-2 bg-slate-50/50 dark:bg-slate-950/30">
                    {FLOORS.map((floor) => {
                        const isActive = activeFloor === floor;
                        const stats = getFloorStats(floor);

                        return (
                            <button
                                key={floor}
                                type="button"
                                onClick={() => setActiveFloor(floor)}
                                className={`flex flex-col items-center gap-1 transition-all p-2 rounded-xl border-2 w-16 ${isActive
                                    ? 'border-fpt-orange bg-fpt-orange/10'
                                    : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive
                                    ? 'bg-fpt-orange text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-fpt-orange/10 hover:text-fpt-orange'
                                    }`}>
                                    <span className="font-bold text-lg">T{floor}</span>
                                </div>
                                <span className={`text-[10px] font-medium uppercase ${isActive ? 'text-fpt-orange font-bold' : 'text-slate-500'
                                    }`}>
                                    Tầng {floor}
                                </span>
                                {hasFilters && (
                                    <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">
                                        {stats.available}/{stats.total} trống
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </aside>

                {/* Room Grid */}
                <div className="flex-grow p-6 bg-slate-50/50 dark:bg-slate-950/20 max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fpt-orange"></div>
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Building2 size={48} className="mb-2 opacity-50" />
                            <p className="text-sm">Không có phòng học tại tầng này</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {filteredRooms.map((room) => {
                                const isSelected = selectedRoom?.id === room.id;

                                return (
                                    <div
                                        key={room.id}
                                        onClick={() => handleRoomClick(room)}
                                        className={`relative p-4 rounded-xl border-2 transition-all ${isSelected
                                            ? 'bg-fpt-orange/5 dark:bg-fpt-orange/10 border-fpt-orange shadow-md cursor-pointer'
                                            : room.isAvailable
                                                ? 'bg-white dark:bg-slate-800 border-transparent hover:border-fpt-orange cursor-pointer shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-900/50 border-transparent opacity-60 grayscale cursor-not-allowed'
                                            }`}
                                    >
                                        {/* Selected Checkmark */}
                                        {isSelected && (
                                            <span className="absolute -top-2 -right-2 bg-fpt-orange text-white w-6 h-6 flex items-center justify-center rounded-full shadow-lg ring-4 ring-white dark:ring-zinc-900">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </span>
                                        )}

                                        {/* Room Info */}
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-lg font-bold text-slate-800 dark:text-white">{room.name}</span>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ring-1 ${room.isAvailable
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ring-green-600/20'
                                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 ring-slate-400/20'
                                                }`}>
                                                {room.isAvailable ? 'TRỐNG' : 'BẬN'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                            {room.isAvailable ? (
                                                <>
                                                    <Users size={14} />
                                                    <span className="text-xs">{room.capacity} chỗ</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Calendar size={14} />
                                                    <span className="text-xs italic">Đang có lớp</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Legend */}
            <div className="flex items-center gap-6 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Phòng trống (Trống)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 shadow-sm"></span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Đã có lịch (Bận)</span>
                </div>
            </div>
        </section>
    );
};
