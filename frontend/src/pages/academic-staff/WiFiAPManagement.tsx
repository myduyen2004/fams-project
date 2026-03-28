import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { StatusFilter, Pagination, SelectionActionBar } from '../../components/academic-staff';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { usePagination } from '../../hooks/usePagination';
import apiClient from '../../services/api/authService';

// Types
interface WiFiAccessPoint {
    id: number;
    name: string;
    ssid: string;
    bssid: string;
    location: string;
    status: 'ACTIVE' | 'INACTIVE';
    roomCount?: number;
}

interface CreateWiFiApRequest {
    name: string;
    ssid: string;
    bssid: string;
    location: string;
}

// WiFi AP Form Modal
const WiFiApFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onEdit?: () => void;
    editingAp?: WiFiAccessPoint | null;
    mode: 'view' | 'edit' | 'create';
}> = ({ isOpen, onClose, onSuccess, onEdit, editingAp, mode }) => {
    const [form, setForm] = useState<CreateWiFiApRequest>({
        name: '',
        ssid: '',
        bssid: '',
        location: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editingAp) {
            setForm({
                name: editingAp.name,
                ssid: editingAp.ssid,
                bssid: editingAp.bssid,
                location: editingAp.location
            });
        } else {
            setForm({ name: '', ssid: '', bssid: '', location: '' });
        }
    }, [editingAp, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.ssid || !form.bssid) {
            toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }
        setSaving(true);
        try {
            if (editingAp) {
                await apiClient.put(`/wifi-access-points/${editingAp.id}`, form);
                toast.success('Cập nhật Access Point thành công');
            } else {
                await apiClient.post('/wifi-access-points', form);
                toast.success('Tạo Access Point thành công');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    {mode === 'view' ? 'Chi tiết Access Point' : mode === 'edit' ? 'Chỉnh sửa Access Point' : 'Thêm Access Point mới'}
                </h2>
                {mode === 'view' ? (
                    <div className="space-y-3 py-1">
                        {/* Status & Name Banner */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Tên Access Point</label>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate">{editingAp?.name}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 block">Trạng thái</label>
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                                    editingAp?.status === 'ACTIVE' 
                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/30'
                                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/30'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${editingAp?.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    {editingAp?.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động'}
                                </span>
                            </div>
                        </div>

                        {/* Network Details */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">SSID (Tên WiFi)</label>
                                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mt-0.5 truncate">{editingAp?.ssid}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Địa chỉ MAC (BSSID)</label>
                                <p className="text-sm font-mono text-gray-700 dark:text-zinc-300 mt-0.5 truncate">{editingAp?.bssid}</p>
                            </div>
                        </div>

                        {/* Location & Capacity */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Vị trí lắp đặt</label>
                                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mt-0.5 truncate">{editingAp?.location || 'Chưa xác định'}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Số lượng phòng kết nối</label>
                                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mt-0.5 truncate">{editingAp?.roomCount || 0} phòng học</p>
                            </div>
                        </div>
                    </div>
                ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                                    Tên Access Point <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="VD: AP-BE-T3"
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-fpt-orange focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                                    SSID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.ssid}
                                    onChange={(e) => setForm({ ...form, ssid: e.target.value })}
                                    placeholder="VD: FPTU-WiFi"
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-fpt-orange focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                                    BSSID (MAC Address) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.bssid}
                                    onChange={(e) => setForm({ ...form, bssid: e.target.value.toUpperCase() })}
                                    placeholder="VD: AC:23:3F:88:91:A2"
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-mono focus:border-fpt-orange focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                                    Vị trí
                                </label>
                                <input
                                    type="text"
                                    value={form.location}
                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    placeholder="VD: Beta - Tầng 3, Hành lang T3, gần BE-301"
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-fpt-orange focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                            </div>
                        </form>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            {mode === 'view' ? 'Đóng' : 'Hủy'}
                        </button>
                        {mode === 'view' && (
                            <button
                                type="button"
                                onClick={onEdit}
                                className="rounded-lg bg-fpt-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                            >
                                Cập nhật
                            </button>
                        )}
                        {mode !== 'view' && (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={saving}
                                className="rounded-lg bg-fpt-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                            >
                                {saving ? 'Đang lưu...' : mode === 'edit' ? 'Cập nhật' : 'Tạo mới'}
                            </button>
                        )}
                    </div>
            </div>
        </div>
    );
};

export const WiFiAPManagement: React.FC = () => {
    const [accessPoints, setAccessPoints] = useState<WiFiAccessPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalElements, setTotalElements] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const { page, setPage } = usePagination({ resetDependencies: [status, searchTerm] });

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
    const [editingAp, setEditingAp] = useState<WiFiAccessPoint | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Confirm Modal
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'danger' as 'info' | 'danger' | 'warning' | 'success',
        onConfirm: () => { },
        confirmLabel: 'Xác nhận'
    });

    const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));
    const showDeactivate = status === 'ACTIVE';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/wifi-access-points');
            let data = (response.data as WiFiAccessPoint[]).sort((a, b) => a.id - b.id);
            
            // Client-side filtering
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                data = data.filter(ap =>
                    ap.name.toLowerCase().includes(term) ||
                    ap.ssid.toLowerCase().includes(term) ||
                    ap.bssid.toLowerCase().includes(term) ||
                    (ap.location && ap.location.toLowerCase().includes(term))
                );
            }
            
            // Apply status filter
            data = data.filter(ap => ap.status === status);
            
            setTotalElements(data.length);
            
            // Pagination
            const start = page * 10;
            setAccessPoints(data.slice(start, start + 10));
        } catch (error) {
            console.error('Failed to fetch:', error);
            toast.error('Không thể tải danh sách Access Point');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, status, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setSelectedIds([]);
    }, [page, status, searchTerm]);

    const handleView = (ap: WiFiAccessPoint) => {
        setEditingAp(ap);
        setModalMode('view');
        setIsFormOpen(true);
    };


    const handleSelectOne = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };


    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: 'Xóa Access Point',
            message: `Bạn có chắc chắn muốn xóa ${selectedIds.length} Access Point đã chọn?`,
            type: 'danger',
            confirmLabel: 'Xóa',
            onConfirm: async () => {
                try {
                    await Promise.all(selectedIds.map(id => apiClient.delete(`/wifi-access-points/${id}`)));
                    toast.success('Xóa các Access Point thành công');
                    setSelectedIds([]);
                    fetchData();
                    closeConfirmModal();
                } catch (error: any) {
                    toast.error('Có lỗi xảy ra khi xóa');
                    closeConfirmModal();
                }
            }
        });
    };

    const handleBulkStatusChange = async (newStatus: 'ACTIVE' | 'INACTIVE') => {
        if (selectedIds.length === 0) return;

        try {
            await apiClient.patch('/wifi-access-points/bulk-status', {
                ids: selectedIds,
                status: newStatus
            });
            toast.success(newStatus === 'ACTIVE' ? 'Mở hoạt động các Access Point thành công' : 'Ngừng hoạt động các Access Point thành công');
            setSelectedIds([]);
            fetchData();
        } catch (error: any) {
            toast.error('Có lỗi xảy ra khi cập nhật trạng thái');
            console.error('Status update failed:', error);
        }
    };

    return (
        <AcademicStaffLayout pageTitle="Quản lý hạ tầng mạng">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                            Quản lý các WiFi Access Point trong hệ thống
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditingAp(null); setModalMode('create'); setIsFormOpen(true); }}
                        className="flex items-center gap-2 rounded-lg bg-fpt-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                    >
                        <Plus className="h-4 w-4" />
                        Thêm AP mới
                    </button>
                </div>

                {/* Section Title */}
                <div className="flex items-center gap-2 text-fpt-orange">
                    <Wifi className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">DANH SÁCH ACCESS-POINT</h2>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mb-4 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo tên, MAC, vị trí..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-fpt-orange focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                            </div>
                            <StatusFilter value={status} onChange={(v) => { setStatus(v); setPage(0); }} isOpen={isFilterOpen} onToggle={() => setIsFilterOpen(prev => !prev)} />
                        </div>

                        <SelectionActionBar
                            selectedCount={selectedIds.length}
                            showDeactivate={showDeactivate}
                            onDelete={handleBulkDelete}
                            onStatusChange={handleBulkStatusChange}
                            canDelete={true}
                            itemLabel="Access Point"
                        />
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-[40px_1.5fr_1.5fr_2fr_100px_140px] items-center gap-4 py-4 px-2 bg-fpt-orange text-white rounded-t-lg shadow-sm">
                        <div className="flex items-center justify-center">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-white/50 bg-white/20 text-fpt-orange focus:ring-white/50 cursor-pointer accent-white"
                                checked={accessPoints.length > 0 && selectedIds.length === accessPoints.length}
                                onChange={() => {
                                    if (selectedIds.length === accessPoints.length) {
                                        setSelectedIds([]);
                                    } else {
                                        setSelectedIds(accessPoints.map(ap => ap.id));
                                    }
                                }}
                            />
                        </div>
                        <div className="text-xs font-bold uppercase tracking-wider">Tên & SSID</div>
                        <div className="text-xs font-bold uppercase tracking-wider">BSSID & IP</div>
                        <div className="text-xs font-bold uppercase tracking-wider">Vị trí</div>
                        <div className="text-xs font-bold uppercase tracking-wider text-center">Phòng học</div>
                        <div className="text-xs font-bold uppercase tracking-wider">Trạng thái</div>
                    </div>

                    {/* List View - Fixed Grid Alignment */}
                    <div className="flex flex-col min-h-[400px]">
                        <div className="flex-1 divide-y divide-gray-100 dark:divide-zinc-800">
                            {loading && accessPoints.length === 0 ? (
                                <div className="py-10 text-center text-gray-400">
                                    <div className="flex justify-center mb-2">
                                        <svg className="h-8 w-8 animate-spin text-fpt-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                    Đang tải dữ liệu...
                                </div>
                            ) : accessPoints.length === 0 ? (
                                <div className="py-10 text-center text-gray-400">
                                    Không có Access Point nào
                                </div>
                            ) : (
                                accessPoints.map((ap) => (
                                    <div
                                        key={ap.id}
                                        onClick={() => handleView(ap)}
                                        className={`grid grid-cols-[40px_1.5fr_1.5fr_2fr_100px_140px] items-center gap-4 py-4 px-2 cursor-pointer transition-colors ${selectedIds.includes(ap.id) ? 'bg-orange-50 dark:bg-orange-900/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'}`}
                                    >
                                        {/* Checkbox */}
                                        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange dark:border-zinc-600 dark:bg-zinc-700 cursor-pointer"
                                                checked={selectedIds.includes(ap.id)}
                                                onChange={() => handleSelectOne(ap.id)}
                                            />
                                        </div>

                                        {/* Name & SSID */}
                                        <div className="min-w-0">
                                            <div className="font-semibold text-gray-900 dark:text-white truncate">{ap.name}</div>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400">
                                                <Wifi className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{ap.ssid}</span>
                                            </div>
                                        </div>

                                        {/* BSSID & IP */}
                                        <div className="min-w-0">
                                            <div className="font-mono text-sm text-gray-700 dark:text-zinc-300 truncate">{ap.bssid}</div>
                                            <div className="text-xs text-gray-400">192.168.10.101</div>
                                        </div>

                                        {/* Location */}
                                        <div className="min-w-0">
                                            <div className="text-sm text-gray-700 dark:text-zinc-300 truncate">{ap.location || 'Chưa xác định'}</div>
                                        </div>

                                        {/* Room Count Badge */}
                                        <div className="text-center">
                                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                                {ap.roomCount || 0} phòng
                                            </span>
                                        </div>

                                        {/* Status */}
                                        <div className="flex justify-start">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                                                ap.status === 'ACTIVE' 
                                                ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/30'
                                                : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/30'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${ap.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                {ap.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <Pagination page={page} totalElements={totalElements} pageSize={10} onPageChange={setPage} itemLabel="Access Point" />
                    </div>
                </div>
            </div>

            {/* Form Modal */}
            <WiFiApFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchData}
                onEdit={() => setModalMode('edit')}
                editingAp={editingAp}
                mode={modalMode}
            />

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmLabel={confirmModal.confirmLabel}
            />
        </AcademicStaffLayout>
    );
};
