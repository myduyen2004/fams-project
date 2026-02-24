import React, { useState, useEffect } from 'react';
import { Plus, Wifi, Signal, Trash2, Star, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../services/api/authService';

// Types
interface WiFiAccessPoint {
    id: number;
    name: string;
    ssid: string;
    bssid: string;
    location: string;
}

interface RoomWiFiAP {
    id: number;
    accessPoint: WiFiAccessPoint;
    signalStrength: number;
    isPrimary: boolean;
    positionNotes: string;
}

interface Props {
    roomId: number;
}

export const RoomAPAssignment: React.FC<Props> = ({ roomId }) => {
    const [assignedAPs, setAssignedAPs] = useState<RoomWiFiAP[]>([]);
    const [availableAPs, setAvailableAPs] = useState<WiFiAccessPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    // Add form state
    const [selectedApId, setSelectedApId] = useState<number | ''>('');
    const [signalStrength, setSignalStrength] = useState(-65);
    const [isPrimary, setIsPrimary] = useState(false);
    const [positionNotes, setPositionNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, [roomId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch assigned APs for this room
            const assignedRes = await apiClient.get(`/wifi-access-points/room/${roomId}/assign`);
            setAssignedAPs(assignedRes.data || []);

            // Fetch all available APs
            const allApsRes = await apiClient.get('/wifi-access-points');
            setAvailableAPs(allApsRes.data || []);
        } catch (error) {
            console.error('Failed to fetch AP data:', error);
            // Use mock data for demo
            setAssignedAPs([]);
            setAvailableAPs([
                { id: 1, name: 'AP-BE-T2-01', ssid: 'FPTU-WiFi', bssid: 'AC:23:3F:88:91:A1', location: 'Beta - Tầng 2' },
                { id: 2, name: 'AP-BE-T2-02', ssid: 'FPTU-WiFi', bssid: 'AC:23:3F:88:91:A2', location: 'Beta - Tầng 2' },
                { id: 3, name: 'AP-BE-T3-01', ssid: 'FPTU-WiFi', bssid: 'AC:23:3F:88:91:A3', location: 'Beta - Tầng 3' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignAP = async () => {
        if (!selectedApId) {
            toast.error('Vui lòng chọn Access Point');
            return;
        }

        setSaving(true);
        try {
            await apiClient.post(`/wifi-access-points/room/${roomId}/assign`, {
                accessPointId: selectedApId,
                signalStrength,
                isPrimary,
                positionNotes
            });
            toast.success('Gán AP thành công');
            setShowAddForm(false);
            resetForm();
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể gán AP');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveAP = async (assignmentId: number) => {
        try {
            await apiClient.delete(`/wifi-access-points/room/${roomId}/assign/${assignmentId}`);
            toast.success('Đã gỡ AP khỏi phòng');
            fetchData();
        } catch (error) {
            toast.error('Không thể gỡ AP');
        }
    };

    const handleSetPrimary = async (assignmentId: number) => {
        try {
            await apiClient.put(`/wifi-access-points/room/${roomId}/assign/${assignmentId}/primary`);
            toast.success('Đã đặt làm AP chính');
            fetchData();
        } catch (error) {
            toast.error('Không thể đặt làm AP chính');
        }
    };

    const resetForm = () => {
        setSelectedApId('');
        setSignalStrength(-65);
        setIsPrimary(false);
        setPositionNotes('');
    };

    const getSignalQuality = (rssi: number) => {
        if (rssi >= -50) return { label: 'Tuyệt vời', color: 'text-green-500', bg: 'bg-green-100' };
        if (rssi >= -60) return { label: 'Tốt', color: 'text-green-500', bg: 'bg-green-50' };
        if (rssi >= -70) return { label: 'Khá', color: 'text-yellow-500', bg: 'bg-yellow-50' };
        if (rssi >= -80) return { label: 'Yếu', color: 'text-orange-500', bg: 'bg-orange-50' };
        return { label: 'Rất yếu', color: 'text-red-500', bg: 'bg-red-50' };
    };

    // Filter out already assigned APs
    const unassignedAPs = availableAPs.filter(
        ap => !assignedAPs.some(assigned => assigned.accessPoint?.id === ap.id)
    );

    return (
        <div className="space-y-6">
            {/* Header section with nicer styling */}
            <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center text-fpt-orange">
                                <Wifi size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                    Access Points
                                </h3>
                                <p className="text-[10px] text-gray-500 font-medium">Quản lý kết nối WiFi</p>
                            </div>
                        </div>
                        {assignedAPs.length > 0 && (
                            <div className="flex flex-col items-end">
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-200 dark:border-green-800/30">
                                    {assignedAPs.length} Kết nối
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={`group flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform active:scale-95
                            ${showAddForm
                                ? 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700'
                                : 'bg-fpt-orange text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 hover:shadow-orange-500/40'
                            }`}
                    >
                        {showAddForm ? (
                            <>Đóng form</>
                        ) : (
                            <>
                                <Plus size={18} className="transition-transform group-hover:rotate-90" />
                                Thêm Access Point
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Add Form */}
            {
                showAddForm && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-900/30 space-y-3">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">Gán AP mới</div>

                        {/* AP Selection */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                                Chọn Access Point
                            </label>
                            <select
                                value={selectedApId}
                                onChange={(e) => setSelectedApId(e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-fpt-orange focus:border-fpt-orange"
                            >
                                <option value="">-- Chọn AP --</option>
                                {unassignedAPs.map(ap => (
                                    <option key={ap.id} value={ap.id}>
                                        {ap.name} ({ap.bssid})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Signal Strength */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                                Cường độ tín hiệu (dBm)
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="-100"
                                    max="-30"
                                    value={signalStrength}
                                    onChange={(e) => setSignalStrength(Number(e.target.value))}
                                    className="flex-1 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-fpt-orange"
                                />
                                <span className={`text-sm font-bold min-w-[60px] text-right ${getSignalQuality(signalStrength).color}`}>
                                    {signalStrength} dBm
                                </span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1">
                                Chất lượng: <span className={getSignalQuality(signalStrength).color}>{getSignalQuality(signalStrength).label}</span>
                            </div>
                        </div>

                        {/* Position Notes */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                                Ghi chú vị trí (tùy chọn)
                            </label>
                            <input
                                type="text"
                                value={positionNotes}
                                onChange={(e) => setPositionNotes(e.target.value)}
                                placeholder="VD: Góc trái phòng, gần cửa sổ..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-1 focus:ring-fpt-orange focus:border-fpt-orange"
                            />
                        </div>

                        {/* Primary Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                            <div className="flex items-center gap-2">
                                <Star size={14} className={isPrimary ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Đặt làm AP chính</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPrimary(!isPrimary)}
                                className={`w-10 h-5 rounded-full transition-colors relative ${isPrimary ? 'bg-fpt-orange' : 'bg-gray-300 dark:bg-zinc-600'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPrimary ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => { setShowAddForm(false); resetForm(); }}
                                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAssignAP}
                                disabled={saving || !selectedApId}
                                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-fpt-orange rounded-lg hover:bg-orange-600 disabled:opacity-50"
                            >
                                {saving ? 'Đang lưu...' : 'Gán AP'}
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Assigned APs List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="text-center py-4 text-gray-400 text-sm">Đang tải...</div>
                ) : assignedAPs.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                        <Wifi className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Chưa có AP nào được gán
                    </div>
                ) : (
                    assignedAPs.map((item) => {
                        const quality = getSignalQuality(item.signalStrength);
                        return (
                            <div
                                key={item.id}
                                className={`group/card p-4 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md
                                    ${item.isPrimary
                                        ? 'bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-zinc-900 border-orange-200 dark:border-orange-900/30'
                                        : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap text-wrap">
                                            <span className="font-bold text-[13px] text-gray-900 dark:text-white truncate">
                                                {item.accessPoint?.name || 'Unknown AP'}
                                            </span>
                                            {item.isPrimary && (
                                                <span className="px-2 py-0.5 text-[8px] font-black bg-orange-500 text-white rounded-full uppercase tracking-widest shadow-sm shadow-orange-500/30">
                                                    Primary
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono mt-1 flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                                            <Signal size={10} className="shrink-0" />
                                            {item.accessPoint?.bssid}
                                        </div>
                                        {item.positionNotes && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-2 bg-gray-50 dark:bg-zinc-800/50 p-1.5 rounded-lg border border-gray-100 dark:border-zinc-800/50">
                                                <MapPin size={10} className="text-fpt-orange shrink-0" />
                                                <span className="italic line-clamp-1">{item.positionNotes}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="shrink-0">
                                        <div className={`flex flex-col items-center gap-1 p-2 rounded-xl border ${quality.bg} ${quality.color.replace('text-', 'border-').replace('500', '200')}/30`}>
                                            <Signal size={14} className={quality.color} />
                                            <span className={`text-[10px] font-black ${quality.color}`}>
                                                {item.signalStrength}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                                    {!item.isPrimary && (
                                        <button
                                            onClick={() => handleSetPrimary(item.id)}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-yellow-600 transition-colors"
                                        >
                                            <Star size={12} />
                                            Set Primary
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRemoveAP(item.id)}
                                        className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors ml-auto"
                                    >
                                        <Trash2 size={12} />
                                        Remove
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div >
    );
};
