import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { SubSpecialization, SubSpecializationCreateRequest } from '../../types/subspecialization';
import { subSpecializationService } from '../../services/api/subSpecializationService';
import toast from 'react-hot-toast';

interface SubSpecFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    specializationId: number;
    subSpec?: SubSpecialization | null;
}

export const SubSpecFormModal: React.FC<SubSpecFormModalProps> = ({ isOpen, onClose, onSuccess, specializationId, subSpec }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<SubSpecializationCreateRequest>({
        code: '', name: '', description: '', specializationId
    });

    useEffect(() => {
        if (subSpec) {
            setFormData({ code: subSpec.code, name: subSpec.name, description: subSpec.description || '', specializationId });
        } else {
            setFormData({ code: '', name: '', description: '', specializationId });
        }
    }, [subSpec, isOpen, specializationId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.name) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }
        setLoading(true);
        try {
            if (subSpec) {
                await subSpecializationService.updateSubSpecialization(subSpec.id, formData);
                toast.success('Cập nhật chuyên ngành hẹp thành công');
            } else {
                await subSpecializationService.createSubSpecialization(formData);
                toast.success('Tạo chuyên ngành hẹp thành công');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {subSpec ? 'Chỉnh sửa chuyên ngành hẹp' : 'Thêm chuyên ngành hẹp'}
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Mã chuyên ngành hẹp *</label>
                        <input type="text" value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-fpt-orange focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" placeholder="VD: SE-AI" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Tên chuyên ngành hẹp *</label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-fpt-orange focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" placeholder="VD: Công nghệ AI" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Mô tả</label>
                        <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-fpt-orange focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" rows={3} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg dark:text-zinc-300 dark:hover:bg-zinc-800">Hủy</button>
                        <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-fpt-orange rounded-lg hover:bg-orange-600 disabled:opacity-50">
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {subSpec ? 'Cập nhật' : 'Tạo mới'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
