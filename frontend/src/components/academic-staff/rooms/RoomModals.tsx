import React, { useState, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Room, RoomRequest, RoomStatus, RoomType } from '../../../types/room';
import { roomService } from '../../../services/api/roomService';
import toast from 'react-hot-toast';

// Building configuration
const BUILDING_CONFIG = {
    'Gamma': { floors: [1, 2, 3, 4] },
    'Alpha': { floors: [1, 2, 3, 4, 5, 6, 7] }
};

const BUILDINGS = Object.keys(BUILDING_CONFIG) as Array<keyof typeof BUILDING_CONFIG>;

interface ModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface EditModalProps extends ModalProps {
    room: Room;
}

// Validation: must NOT contain letters (only numbers/symbols allowed)
const hasLetter = (str: string) => /[a-zA-Z]/.test(str);

export const AddRoomModal: React.FC<ModalProps> = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<RoomRequest>({
        code: '',
        name: '',
        capacity: 30,
        building: 'Gamma',
        floor: 1,
        type: 'LECTURE',
        status: 'ACTIVE'
    });
    const [errors, setErrors] = useState<{ code?: string; name?: string }>({});

    const availableFloors = useMemo(() => {
        return BUILDING_CONFIG[formData.building as keyof typeof BUILDING_CONFIG]?.floors || [];
    }, [formData.building]);

    const handleBuildingChange = (building: string) => {
        const floors = BUILDING_CONFIG[building as keyof typeof BUILDING_CONFIG]?.floors || [];
        setFormData({
            ...formData,
            building,
            floor: floors[0] || 1
        });
    };

    const validate = (): boolean => {
        const newErrors: { code?: string; name?: string } = {};
        if (hasLetter(formData.code)) {
            newErrors.code = 'Mã phòng không được chứa chữ cái';
        }
        if (hasLetter(formData.name)) {
            newErrors.name = 'Tên phòng không được chứa chữ cái';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            setLoading(true);
            await roomService.createRoom(formData);
            toast.success('Thêm phòng học thành công');
            onSuccess();
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
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Mã phòng</label>
                            <input required type="text" className={`w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border ${errors.code ? 'border-red-500' : 'border-gray-200 dark:border-zinc-700'} rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none`}
                                value={formData.code} onChange={e => { setFormData({ ...formData, code: e.target.value }); setErrors({ ...errors, code: undefined }); }} placeholder="VD: P.101" />
                            {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Tên phòng</label>
                            <input required type="text" className={`w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-zinc-700'} rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none`}
                                value={formData.name} onChange={e => { setFormData({ ...formData, name: e.target.value }); setErrors({ ...errors, name: undefined }); }} placeholder="VD: P.101" />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Tòa nhà</label>
                            <select className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none"
                                value={formData.building} onChange={e => handleBuildingChange(e.target.value)}>
                                {BUILDINGS.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Tầng</label>
                            <select className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none"
                                value={formData.floor} onChange={e => setFormData({ ...formData, floor: parseInt(e.target.value) })}>
                                {availableFloors.map(f => (
                                    <option key={f} value={f}>Tầng {f}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Sức chứa</label>
                            <input required type="number" min="1" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none"
                                value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Loại phòng</label>
                            <select className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none"
                                value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as RoomType })}>
                                <option value="LECTURE">Lý thuyết</option>
                                <option value="LAB">Thực hành</option>
                                <option value="MEETING">Họp</option>
                                <option value="AUDITORIUM">Hội trường</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Trạng thái</label>
                            <select className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none"
                                value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as RoomStatus })}>
                                <option value="ACTIVE">Hoạt động</option>
                                <option value="MAINTENANCE">Bảo trì</option>
                                <option value="INACTIVE">Ngưng sử dụng</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
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
        capacity: room.capacity,
        building: room.building,
        floor: room.floor,
        type: room.type,
        status: room.status
    });
    const [errors, setErrors] = useState<{ code?: string; name?: string }>({});

    const availableFloors = useMemo(() => {
        return BUILDING_CONFIG[formData.building as keyof typeof BUILDING_CONFIG]?.floors || [];
    }, [formData.building]);

    const handleBuildingChange = (building: string) => {
        const floors = BUILDING_CONFIG[building as keyof typeof BUILDING_CONFIG]?.floors || [];
        const newFloor = floors.includes(formData.floor) ? formData.floor : floors[0];
        setFormData({ ...formData, building, floor: newFloor });
    };

    const validate = (): boolean => {
        const newErrors: { code?: string; name?: string } = {};
        if (hasLetter(formData.code)) {
            newErrors.code = 'Mã phòng không được chứa chữ cái';
        }
        if (hasLetter(formData.name)) {
            newErrors.name = 'Tên phòng không được chứa chữ cái';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            setLoading(true);
            // FIX: Use room.id to update, not create
            await roomService.updateRoom(room.id, formData);
            toast.success('Cập nhật phòng học thành công');
            onSuccess();
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
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Mã phòng</label>
                            <input required type="text" className={`w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border ${errors.code ? 'border-red-500' : 'border-gray-200 dark:border-zinc-700'} rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none`}
                                value={formData.code} onChange={e => { setFormData({ ...formData, code: e.target.value }); setErrors({ ...errors, code: undefined }); }} />
                            {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Tên phòng</label>
                            <input required type="text" className={`w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-zinc-700'} rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none`}
                                value={formData.name} onChange={e => { setFormData({ ...formData, name: e.target.value }); setErrors({ ...errors, name: undefined }); }} />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Tòa nhà</label>
                            <select className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none"
                                value={formData.building} onChange={e => handleBuildingChange(e.target.value)}>
                                {BUILDINGS.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Tầng</label>
                            <select className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none"
                                value={formData.floor} onChange={e => setFormData({ ...formData, floor: parseInt(e.target.value) })}>
                                {availableFloors.map(f => (
                                    <option key={f} value={f}>Tầng {f}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Sức chứa</label>
                            <input required type="number" min="1" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none"
                                value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Loại phòng</label>
                            <select className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none"
                                value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as RoomType })}>
                                <option value="LECTURE">Lý thuyết</option>
                                <option value="LAB">Thực hành</option>
                                <option value="MEETING">Họp</option>
                                <option value="AUDITORIUM">Hội trường</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Trạng thái</label>
                            <select className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none"
                                value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as RoomStatus })}>
                                <option value="ACTIVE">Hoạt động</option>
                                <option value="MAINTENANCE">Bảo trì</option>
                                <option value="INACTIVE">Ngưng sử dụng</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                            {loading && <Loader2 size={16} className="animate-spin" />} Lưu thay đổi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
