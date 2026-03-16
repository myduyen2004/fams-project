import React from 'react';
import { Room } from '../../types/room';
import { DoorOpen, Users, Edit2, Trash2, MapPin, Monitor } from 'lucide-react';
import { getRoomTypeLabel } from '../../utils/roomUtils';

interface RoomCardProps {
    room: Room;
    inUse?: boolean;
    onClick?: () => void;
    onEdit?: (e: React.MouseEvent) => void;
    onDelete?: (e: React.MouseEvent) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, inUse, onClick, onEdit, onDelete }) => {
    const isComputerLab = room.type === 'COMPUTER_LAB';
    const isClassroom = room.type === 'CLASSROOM';
    const isPositioned = room.gridRow != null && room.gridCol != null;

    const getTypeColor = () => {
        if (isComputerLab) return 'bg-blue-500';
        if (isClassroom) return 'bg-fpt-orange';
        return 'bg-emerald-500';
    };

    const getTypeBg = () => {
        if (inUse) return 'bg-rose-50 dark:bg-rose-900/10';
        if (isComputerLab) return 'bg-blue-50 dark:bg-blue-900/20';
        if (isClassroom) return 'bg-orange-50 dark:bg-orange-900/10';
        return 'bg-emerald-50 dark:bg-emerald-900/10';
    };

    const getTypeBorder = () => {
        if (inUse) return 'border-rose-200 dark:border-rose-800/50';
        if (isComputerLab) return 'border-blue-100 dark:border-blue-800/50';
        if (isClassroom) return 'border-orange-100 dark:border-orange-800/50';
        return 'border-emerald-100 dark:border-emerald-800/50';
    };

    const getIconBg = () => {
        if (isComputerLab) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50';
        if (isClassroom) return 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/50';
        return 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50';
    };

    const inUseShadow = inUse
        ? 'shadow-[0_0_0_1.5px_rgba(244,63,94,0.4),0_4px_24px_rgba(244,63,94,0.18),0_1px_4px_rgba(0,0,0,0.06)]'
        : 'shadow-[0_1px_4px_rgba(0,0,0,0.05)]';

    return (
        <div
            onClick={onClick}
            className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${getTypeBg()} ${getTypeBorder()} ${inUseShadow}`}
        >
            {/* Subtle red glow overlay when in-use */}
            {inUse && (
                <div className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse at top right, rgba(244,63,94,0.07) 0%, transparent 70%)'
                    }}
                />
            )}

            {/* Background Decorative Element */}
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition-all duration-500 group-hover:scale-150 ${inUse ? 'bg-rose-500' : getTypeColor()}`}></div>

            <div className="relative flex flex-col h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    {/* Icon + Status row — slides on hover */}
                    <div className="relative flex items-center gap-2 overflow-hidden" style={{ minWidth: 0 }}>
                        {/* Room icon — shifts left on hover when inUse */}
                        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-inner shadow-black/5 transition-transform duration-300 ${inUse ? 'group-hover:-translate-x-1' : ''} ${getIconBg()}`}>
                            {isComputerLab ? (
                                <Monitor className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            ) : (
                                <DoorOpen className={`h-6 w-6 ${inUse ? 'text-rose-500' : 'text-fpt-orange'}`} />
                            )}
                        </div>

                        {/* "Đang sử dụng" badge — slides in from left on hover, only when inUse */}
                        {inUse && (
                            <span
                                className="flex items-center gap-1.5 rounded-full bg-rose-100/90 dark:bg-rose-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 whitespace-nowrap
                                    opacity-0 -translate-x-3 transition-all duration-300
                                    group-hover:opacity-100 group-hover:translate-x-0"
                            >
                                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
                                </span>
                                Đang sử dụng
                            </span>
                        )}
                    </div>

                    <div className="flex gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex-shrink-0 ml-2">
                        {onEdit && (
                            <button
                                onClick={onEdit}
                                className="p-2 rounded-lg bg-white/80 dark:bg-zinc-800/80 text-gray-600 hover:text-fpt-orange shadow-sm backdrop-blur-sm transition-colors"
                                title="Chỉnh sửa"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={onDelete}
                                className="p-2 rounded-lg bg-white/80 dark:bg-zinc-800/80 text-gray-600 hover:text-rose-500 shadow-sm backdrop-blur-sm transition-colors"
                                title="Xóa"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className={`text-lg font-bold text-gray-900 dark:text-white transition-colors line-clamp-1 ${inUse ? 'group-hover:text-rose-600 dark:group-hover:text-rose-400' : 'group-hover:text-fpt-orange'}`}>
                            {room.name}
                        </h3>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {/* Static dot indicator when NOT hovered */}
                            {inUse && (
                                <span className="flex items-center gap-1 rounded-full bg-rose-100/80 dark:bg-rose-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30
                                    group-hover:opacity-0 transition-opacity duration-300">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
                                    </span>
                                    Live
                                </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isComputerLab ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : isClassroom ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>
                                {getRoomTypeLabel(room.type)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 mb-4">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium">{room.building} • Tầng {room.floor}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="rounded-xl bg-white/50 dark:bg-zinc-800/50 p-2.5 border border-white/20 dark:border-zinc-700/50">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-bold tracking-tight mb-0.5">
                                <Users className="h-3 w-3" />
                                <span>Sức chứa</span>
                            </div>
                            <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">{room.capacity} chỗ</p>
                        </div>
                        <div className="rounded-xl bg-white/50 dark:bg-zinc-800/50 p-2.5 border border-white/20 dark:border-zinc-700/50">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-bold tracking-tight mb-0.5">
                                <MapPin className="h-3 w-3" />
                                <span>Trạng thái</span>
                            </div>
                            <p className={`text-sm font-bold ${!isPositioned ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {!isPositioned ? 'Chưa xếp' : 'Đã xếp'}
                            </p>
                        </div>
                    </div>

                    {room.description && (
                        <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                            Ghi chú: {room.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Bottom accent bar on hover */}
            <div className={`absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-300 ${inUse ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-fpt-orange to-amber-400'}`} />
        </div>
    );
};
