import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Wifi, Loader2 } from 'lucide-react';
import toast from "@utils/toast";
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {mode === 'view' ? 'Chi tiết Access Point' : mode === 'edit' ? 'Chỉnh sửa Access Point' : 'Thêm Access Point mới'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Plus className="w-6 h-6 rotate-45" />
                    </button>
                </div>

                <div className="p-6">
                    {mode !== 'view' && (
                        <p className="mb-6 text-sm text-gray-500 dark:text-zinc-400 italic">
                            Những thông tin có <span className="text-red-500">*</span> là thông tin bắt buộc.
                        </p>
                    )}

                    {mode === 'view' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Tên Access Point</label>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{editingAp?.name}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Trạng thái</label>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${editingAp?.status === 'ACTIVE'
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : 'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${editingAp?.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        {editingAp?.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">SSID (Tên WiFi)</label>
                                    <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 truncate">{editingAp?.ssid}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">BSSID (MAC)</label>
                                    <p className="text-sm font-mono font-medium text-gray-700 dark:text-zinc-300">{editingAp?.bssid}</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Vị trí lắp đặt</label>
                                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">{editingAp?.location || 'Chưa xác định'}</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tên Access Point <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="VD: AP-BE-T3"
                                    className="w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 px-4 text-sm focus:outline-none focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10 transition-all dark:bg-zinc-800 dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">SSID <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={form.ssid}
                                        onChange={(e) => setForm({ ...form, ssid: e.target.value })}
                                        placeholder="VD: FPTU-WiFi"
                                        className="w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 px-4 text-sm focus:outline-none focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10 transition-all dark:bg-zinc-800 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">BSSID <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={form.bssid}
                                        onChange={(e) => setForm({ ...form, bssid: e.target.value.toUpperCase() })}
                                        placeholder="MAC Address"
                                        className="w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 px-4 text-sm font-mono focus:outline-none focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10 transition-all dark:bg-zinc-800 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Vị trí lắp đặt</label>
                                <input
                                    type="text"
                                    value={form.location}
                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    placeholder="VD: Beta - Tầng 3"
                                    className="w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 px-4 text-sm focus:outline-none focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10 transition-all dark:bg-zinc-800 dark:text-white"
                                />
                            </div>
                        </form>
                    )}
                </div>

                <div className="p-6 bg-gray-50 dark:bg-zinc-800/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-[52px] px-8 rounded-2xl text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all active:scale-95"
                    >
                        {mode === 'view' ? 'Đóng' : 'Hủy'}
                    </button>
                    {mode === 'view' ? (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="h-[52px] px-8 rounded-2xl bg-fpt-orange text-white text-sm font-bold shadow-lg shadow-fpt-orange/20 hover:bg-orange-600 transition-all active:scale-95"
                        >
                            Chỉnh sửa
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving}
                            className="h-[52px] px-8 rounded-2xl bg-fpt-orange text-white text-sm font-bold shadow-lg shadow-fpt-orange/20 hover:bg-orange-600 disabled:opacity-50 transition-all active:scale-95"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'edit' ? 'Lưu thay đổi' : 'Tạo mới')}
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

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                data = data.filter(ap =>
                    ap.name.toLowerCase().includes(term) ||
                    ap.ssid.toLowerCase().includes(term) ||
                    ap.bssid.toLowerCase().includes(term) ||
                    (ap.location && ap.location.toLowerCase().includes(term))
                );
            }

            data = data.filter(ap => ap.status === status);
            setTotalElements(data.length);
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
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setConfirmModal({
            isOpen: true,
            title: 'Xác nhận xóa',
            message: `Bạn có chắc chắn muốn xóa ${selectedIds.length} Access Point đã chọn?`,
            type: 'danger',
            confirmLabel: 'Xóa',
            onConfirm: async () => {
                try {
                    await Promise.all(selectedIds.map(id => apiClient.delete(`/wifi-access-points/${id}`)));
                    toast.success('Xóa thành công');
                    setSelectedIds([]);
                    fetchData();
                    closeConfirmModal();
                } catch {
                    toast.error('Có lỗi xảy ra khi xóa');
                    closeConfirmModal();
                }
            }
        });
    };

    const handleBulkStatusChange = async (newStatus: 'ACTIVE' | 'INACTIVE') => {
        if (selectedIds.length === 0) return;
        try {
            await apiClient.patch('/wifi-access-points/bulk-status', { ids: selectedIds, status: newStatus });
            toast.success('Cập nhật trạng thái thành công');
            setSelectedIds([]);
            fetchData();
        } catch {
            toast.error('Có lỗi xảy ra khi cập nhật');
        }
    };

    return (
        <AcademicStaffLayout pageTitle="Quản lý hạ tầng mạng">
            <div className="space-y-6 pb-8">

                {/* Header & Filter Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-8 shadow-sm animate-in fade-in duration-500">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Quản lý Access Point</h1>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 font-medium">Quản lý danh sách các WiFi Access Point trong hệ thống</p>
                        </div>
                        <button
                            onClick={() => { setEditingAp(null); setModalMode('create'); setIsFormOpen(true); }}
                            className="flex h-[52px] items-center gap-2 rounded-2xl bg-fpt-orange px-8 text-sm font-bold text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-fpt-orange/20 transition-all whitespace-nowrap active:scale-95"
                        >
                            <Plus className="h-[20px] w-[20px]" strokeWidth={3} />
                            Thêm AP mới
                        </button>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div className="flex-1 md:max-w-[320px]">
                            <label className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5 ml-1 block">Tìm kiếm</label>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-fpt-orange transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên, MAC, vị trí..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                                    className="w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 text-gray-900 dark:text-white shadow-sm"
                                />
                            </div>
                        </div>
                        <StatusFilter value={status} onChange={(v) => { setStatus(v); setPage(0); }} isOpen={isFilterOpen} onToggle={() => setIsFilterOpen(prev => !prev)} />
                    </div>
                </div>
                <SelectionActionBar
                    selectedCount={selectedIds.length}
                    showDeactivate={showDeactivate}
                    onDelete={handleBulkDelete}
                    onStatusChange={handleBulkStatusChange}
                    onUpdate={() => {
                        const selectedAp = accessPoints.find(ap => ap.id === selectedIds[0]);
                        if (selectedAp) handleView(selectedAp);
                    }}
                    canDelete={true}
                    itemLabel="Access Point"
                />
                {/* Table Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl overflow-hidden animate-in fade-in duration-700">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-fpt-orange text-white">
                                    <th className="px-6 py-5 w-16 text-center rounded-tl-2xl">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-lg border-white/30 bg-transparent text-white focus:ring-0 cursor-pointer accent-white transition-all"
                                            checked={accessPoints.length > 0 && selectedIds.length === accessPoints.length}
                                            onChange={() => setSelectedIds(selectedIds.length === accessPoints.length ? [] : accessPoints.map(ap => ap.id))}
                                        />
                                    </th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest">Tên & SSID</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest">BSSID & IP</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest">Vị trí</th>
                                    <th className="px-6 py-5 text-center text-[11px] font-black uppercase tracking-widest">Phòng</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-black uppercase tracking-widest rounded-tr-2xl">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                                {loading && accessPoints.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <Loader2 className="h-10 w-10 animate-spin text-fpt-orange mx-auto mb-3" />
                                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Đang tải dữ liệu...</p>
                                        </td>
                                    </tr>
                                ) : accessPoints.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Không tìm thấy Access Point nào</p>
                                        </td>
                                    </tr>
                                ) : (
                                    accessPoints.map((ap) => (
                                        <tr
                                            key={ap.id}
                                            onClick={() => handleView(ap)}
                                            className={`group hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-all cursor-pointer border-l-4 border-transparent ${selectedIds.includes(ap.id) ? 'bg-orange-50/50 dark:bg-orange-900/10 border-l-fpt-orange' : 'hover:border-l-fpt-orange/30'}`}
                                        >
                                            <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded-lg border-gray-300 text-fpt-orange focus:ring-fpt-orange dark:border-zinc-700 cursor-pointer accent-fpt-orange transition-all"
                                                    checked={selectedIds.includes(ap.id)}
                                                    onChange={() => handleSelectOne(ap.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="font-black text-gray-900 dark:text-white text-sm group-hover:text-fpt-orange transition-colors">{ap.name}</div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mt-1.5">
                                                    <Wifi className="h-3 w-3" />
                                                    <span>{ap.ssid}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="font-mono text-xs font-bold text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-lg w-fit">{ap.bssid}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 ml-1">192.168.10.101</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-xs font-bold text-gray-600 dark:text-zinc-400 max-w-[200px] leading-relaxed italic">
                                                    {ap.location || '—'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-xs font-black text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                                    {ap.roomCount || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold border ${ap.status === 'ACTIVE'
                                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
                                                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${ap.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                    {ap.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-8 py-8 border-t border-gray-50 dark:border-zinc-800/50 bg-gray-50/30">
                        <Pagination page={page} totalElements={totalElements} pageSize={10} onPageChange={setPage} itemLabel="Access Point" />
                    </div>
                </div>
            </div>

            <WiFiApFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchData}
                onEdit={() => setModalMode('edit')}
                editingAp={editingAp}
                mode={modalMode}
            />

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

