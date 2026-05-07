import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Loader2, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Room, RoomRequest } from '../../../types/room';
import { roomService } from '../../../services/api/roomService';
import toast from "@utils/toast";

// --- Inline Modal Components (Non-portal versions for z-index stability) ---

interface ModalSelectProps {
    label?: string;
    value: string | number;
    options: { value: string | number; label: string }[];
    onChange: (value: any) => void;
    placeholder?: string;
    disabled?: boolean;
}

const ModalSelect: React.FC<ModalSelectProps> = ({ label, value, options, onChange, placeholder = 'Chọn...', disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">{label}</label>}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 h-[52px] border-2 rounded-2xl text-sm transition-all outline-none
                    ${disabled ? 'bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-800 text-gray-500 cursor-not-allowed font-medium' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange hover:border-fpt-orange/40 text-gray-900 dark:text-white'}
                `}
            >
                <span className={selectedOption ? 'font-medium' : 'text-gray-400'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-2xl z-[70] py-2 max-h-60 overflow-y-auto custom-scrollbar"
                    >
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/10
                                    ${value === opt.value ? 'text-fpt-orange bg-orange-50/50 dark:bg-orange-900/5 font-bold' : 'text-gray-700 dark:text-gray-300'}
                                `}
                            >
                                <span>{opt.label}</span>
                                {value === opt.value && <Check size={16} className="text-fpt-orange" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Building configuration
interface BuildingConfig {
    floors: number[];
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
        floors: [1, 2, 3, 4],
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
        floors: [1, 2, 3, 4, 5, 6, 7],
        gridRows: 10,
        gridCols: 8,
        narrowColumns: [2, 5],
        lockedRows: [2, 5],
        lockedCells: [
            { row: 0, col: 0 },
            { row: 1, col: 0 },
            { row: 0, col: 7 },
            { row: 1, col: 7 },
        ],
        lockedColumns: [],
        unlockedCells: [
            { row: 2, col: 2 },
            { row: 2, col: 5 },
        ],
        defaultRoomColSpan: 1,
        defaultRoomRowSpan: 2
    }
};

const BUILDINGS = Object.keys(BUILDING_CONFIG);

interface ModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface EditModalProps extends ModalProps {
    room: Room;
}


export const AddRoomModal: React.FC<ModalProps> = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<RoomRequest>({
        code: '',
        name: '',
        description: '',
        capacity: 30,
        building: 'Gamma',
        floor: 1,
        type: 'CLASSROOM',
        status: 'ACTIVE',
        gridColSpan: BUILDING_CONFIG['Gamma']?.defaultRoomColSpan || 1,
        gridRowSpan: BUILDING_CONFIG['Gamma']?.defaultRoomRowSpan || 1
    });
    const [errors, setErrors] = useState<{ code?: string }>({});

    const availableFloors = useMemo(() => {
        return BUILDING_CONFIG[formData.building as keyof typeof BUILDING_CONFIG]?.floors || [];
    }, [formData.building]);

    const handleBuildingChange = (building: string) => {
        const config = BUILDING_CONFIG[building];
        const floors = config?.floors || [];
        setFormData({
            ...formData,
            building,
            floor: floors[0] || 1,
            gridColSpan: config?.defaultRoomColSpan || 1,
            gridRowSpan: config?.defaultRoomRowSpan || 1
        });
    };

    const validate = (): boolean => {
        const newErrors: { code?: string } = {};
        if (!formData.code || formData.code.trim() === '') {
            newErrors.code = 'Mã phòng không được để trống';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCodeChange = (code: string) => {
        setFormData({ ...formData, code, name: code });
        setErrors({ ...errors, code: undefined });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            setLoading(true);
            await roomService.createRoom(formData);
            toast.success('Thêm phòng học thành công');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Thêm phòng học mới</h3>
                    <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
                        <X size={20} className="text-gray-400 hover:text-gray-600" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Mã phòng</label>
                            <input required type="text" className={`w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 ${errors.code ? 'border-red-500' : 'border-gray-100 dark:border-zinc-800'} rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white uppercase font-bold`}
                                value={formData.code} onChange={e => handleCodeChange(e.target.value)} placeholder="VD: A201, G301" />
                            {errors.code && <p className="text-xs text-red-500 mt-1 ml-1">{errors.code}</p>}
                        </div>
                        
                        <ModalSelect
                            label="Tòa nhà"
                            value={formData.building}
                            options={BUILDINGS.map(b => ({ value: b, label: b }))}
                            onChange={handleBuildingChange}
                        />

                        <ModalSelect
                            label="Tầng"
                            value={formData.floor}
                            options={availableFloors.map(f => ({ value: f, label: `Tầng ${f}` }))}
                            onChange={value => setFormData({ ...formData, floor: value })}
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Sức chứa</label>
                            <input required type="number" min="1" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white font-bold"
                                value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} />
                        </div>

                        <ModalSelect
                            label="Loại phòng"
                            value={formData.type}
                            options={[
                                { value: 'CLASSROOM', label: 'Lớp học' },
                                { value: 'COMPUTER_LAB', label: 'Phòng máy' },
                                { value: 'PSEUDO_ROOM', label: 'Phòng giả' }
                            ]}
                            onChange={value => setFormData({ ...formData, type: value })}
                        />

                        <div className="col-span-2">
                            <ModalSelect
                                label="Trạng thái"
                                value={formData.status}
                                options={[
                                    { value: 'ACTIVE', label: 'Hoạt động' },
                                    { value: 'MAINTENANCE', label: 'Bảo trì' },
                                    { value: 'INACTIVE', label: 'Ngưng sử dụng' }
                                ]}
                                onChange={value => setFormData({ ...formData, status: value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Mô tả</label>
                            <textarea className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none resize-none h-24 text-gray-900 dark:text-white"
                                value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="VD: Phòng có máy chiếu, sức chứa lớn..." />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8 pb-2">
                        <button type="button" onClick={onClose} className="h-[44px] px-6 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95">Hủy</button>
                        <button type="submit" disabled={loading} className="h-[44px] px-8 bg-fpt-orange text-white text-sm font-bold rounded-2xl hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                            {loading && <Loader2 size={16} className="animate-spin" />} Xác nhận
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const EditRoomModal: React.FC<EditModalProps> = ({ room, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<RoomRequest>({
        code: room.code,
        name: room.name,
        description: room.description || '',
        capacity: room.capacity,
        building: room.building,
        floor: room.floor,
        type: room.type,
        status: room.status,
        gridRowSpan: room.gridRowSpan,
        gridColSpan: room.gridColSpan
    });
    const [errors, setErrors] = useState<{ code?: string }>({});

    const availableFloors = useMemo(() => {
        return BUILDING_CONFIG[formData.building as keyof typeof BUILDING_CONFIG]?.floors || [];
    }, [formData.building]);

    const handleBuildingChange = (building: string) => {
        const config = BUILDING_CONFIG[building];
        const floors = config?.floors || [];
        const newFloor = floors.includes(formData.floor) ? formData.floor : floors[0];
        setFormData({
            ...formData,
            building,
            floor: newFloor,
            gridRowSpan: config?.defaultRoomRowSpan || 1,
            gridColSpan: config?.defaultRoomColSpan || 1
        });
    };

    const validate = (): boolean => {
        const newErrors: { code?: string } = {};
        if (!formData.code || formData.code.trim() === '') {
            newErrors.code = 'Mã phòng không được để trống';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCodeChange = (code: string) => {
        setFormData({ ...formData, code, name: code });
        setErrors({ ...errors, code: undefined });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            setLoading(true);
            await roomService.updateRoom(room.id, formData);
            toast.success('Cập nhật phòng học thành công');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cập nhật phòng học</h3>
                    <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
                        <X size={20} className="text-gray-400 hover:text-gray-600" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Mã phòng</label>
                            <input required type="text" className={`w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 ${errors.code ? 'border-red-500' : 'border-gray-100 dark:border-zinc-800'} rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white uppercase font-bold`}
                                value={formData.code} onChange={e => handleCodeChange(e.target.value)} placeholder="VD: A201, G301" />
                            {errors.code && <p className="text-xs text-red-500 mt-1 ml-1">{errors.code}</p>}
                        </div>

                        <ModalSelect
                            label="Tòa nhà"
                            value={formData.building}
                            options={BUILDINGS.map(b => ({ value: b, label: b }))}
                            onChange={handleBuildingChange}
                        />

                        <ModalSelect
                            label="Tầng"
                            value={formData.floor}
                            options={availableFloors.map(f => ({ value: f, label: `Tầng ${f}` }))}
                            onChange={value => setFormData({ ...formData, floor: value })}
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Sức chứa</label>
                            <input required type="number" min="1" className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white font-bold"
                                value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} />
                        </div>

                        <ModalSelect
                            label="Loại phòng"
                            value={formData.type}
                            options={[
                                { value: 'CLASSROOM', label: 'Lớp học' },
                                { value: 'COMPUTER_LAB', label: 'Phòng máy' },
                                { value: 'PSEUDO_ROOM', label: 'Phòng giả' }
                            ]}
                            onChange={value => setFormData({ ...formData, type: value })}
                        />

                        <div className="col-span-2">
                            <ModalSelect
                                label="Trạng thái"
                                value={formData.status}
                                options={[
                                    { value: 'ACTIVE', label: 'Hoạt động' },
                                    { value: 'MAINTENANCE', label: 'Bảo trì' },
                                    { value: 'INACTIVE', label: 'Ngưng sử dụng' }
                                ]}
                                onChange={value => setFormData({ ...formData, status: value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1 ml-1">Mô tả</label>
                            <textarea className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none resize-none h-24 text-gray-900 dark:text-white"
                                value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8 pb-2">
                        <button type="button" onClick={onClose} className="h-[44px] px-6 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95">Hủy</button>
                        <button type="submit" disabled={loading} className="h-[44px] px-8 bg-fpt-orange text-white text-sm font-bold rounded-2xl hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                            {loading && <Loader2 size={16} className="animate-spin" />} Lưu thay đổi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

