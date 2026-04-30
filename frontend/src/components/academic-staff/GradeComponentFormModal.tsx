import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { GradeComponent, GradeType, GradeComponentRequest, gradeComponentService } from '../../services/api/gradeComponentService';
import { GradeTypeSelector } from './GradeTypeSelector';
import toast from "@utils/toast";

interface GradeComponentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    courseId: number;
    editingComponent?: GradeComponent | null;
    existingComponents: GradeComponent[];
}

const gradeTypeOptions: { value: GradeType; label: string }[] = [
    { value: 'PARTICIPATION', label: 'Participation' },
    { value: 'PROGRESS_TEST', label: 'Progress Test' },
    { value: 'QUIZ', label: 'Quiz' },
    { value: 'WORKSHOP', label: 'Workshop' },
    { value: 'ASSIGNMENT', label: 'Assignment' },
    { value: 'MID_TERM', label: 'Midterm Exam' },
    { value: 'PRACTICAL_EXAM', label: 'Practical Exam' },
    { value: 'FINAL_EXAM', label: 'Final Exam' },
    { value: 'PROJECT', label: 'Project' },
    { value: 'PRESENTATION', label: 'Presentation' },
    { value: 'RESIT', label: 'Resit' },
    { value: 'OTHER', label: 'Other' },
];

export const GradeComponentFormModal: React.FC<GradeComponentFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    courseId,
    editingComponent,
    existingComponents
}) => {
    const [saving, setSaving] = useState(false);
    const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
    const [formData, setFormData] = useState<GradeComponentRequest>({
        name: '',
        description: '',
        type: 'ASSIGNMENT',
        weight: 0,
        isResit: false,
    });

    useEffect(() => {
        if (editingComponent) {
            setFormData({
                name: editingComponent.name,
                description: editingComponent.description || '',
                type: editingComponent.type,
                weight: editingComponent.weight,
                isResit: editingComponent.isResit,
                referenceComponentId: editingComponent.referenceComponentId,
            });
        } else {
            setFormData({
                name: 'Assignment',
                description: '',
                type: 'ASSIGNMENT',
                weight: 0,
                isResit: false,
            });
        }
    }, [editingComponent, isOpen]);

    const handleSave = async () => {
        const weightValue = Number(formData.weight) || 0;
        const roundedWeight = Math.ceil(weightValue - 0.5);

        const processedData = {
            ...formData,
            weight: roundedWeight,
            name: formData.name.trim()
        };

        if (!processedData.name) {
            toast.error('Tên đầu điểm không được để trống');
            return;
        }

        if (/^\d+$/.test(processedData.name)) {
            toast.error('Tên đầu điểm không được chỉ chứa mỗi số');
            return;
        }

        const isDuplicate = existingComponents.some(c =>
            c.name.toLowerCase() === processedData.name.toLowerCase() &&
            c.id !== editingComponent?.id
        );
        if (isDuplicate) {
            toast.error('Tên đầu điểm đã tồn tại');
            return;
        }

        if (processedData.weight <= 0) {
            toast.error('Trọng số phải lớn hơn 0%');
            return;
        }

        if (!processedData.isResit) {
            const currentTotal = existingComponents
                .filter(c => !c.isResit && c.id !== editingComponent?.id)
                .reduce((sum, c) => sum + c.weight, 0);

            if (currentTotal + processedData.weight > 100) {
                toast.error(`Tổng trọng số không được vượt quá 100%`);
                return;
            }
        }

        setSaving(true);
        try {
            if (editingComponent) {
                await gradeComponentService.updateGradeComponent(editingComponent.id, processedData);
                toast.success('Đã cập nhật thành phần điểm');
            } else {
                await gradeComponentService.createGradeComponent(courseId, processedData);
                toast.success('Đã thêm thành phần điểm');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save:', error);
            toast.error('Không thể lưu thành phần điểm');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-zinc-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {editingComponent ? 'Chỉnh sửa thành phần điểm' : 'Thêm thành phần điểm'}
                    </h2>
                    <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
                        <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">
                            Loại thành phần
                        </label>
                        <GradeTypeSelector
                            value={formData.type}
                            isOpen={isTypeSelectorOpen}
                            onToggle={() => setIsTypeSelectorOpen(!isTypeSelectorOpen)}
                            options={gradeTypeOptions
                                .filter(opt => opt.value !== 'RESIT')
                                .filter(opt => {
                                    if (opt.value === 'FINAL_EXAM') {
                                        const hasFE = existingComponents.some(c => c.type === 'FINAL_EXAM');
                                        if (hasFE && (!editingComponent || editingComponent.type !== 'FINAL_EXAM')) {
                                            return false;
                                        }
                                    }
                                    return true;
                                })
                            }
                            onChange={(newType) => {
                                const currentTypeLabel = gradeTypeOptions.find(opt => opt.value === formData.type)?.label;
                                const newTypeLabel = gradeTypeOptions.find(opt => opt.value === newType)?.label;

                                let newName = formData.name;
                                if (!newName || newName === currentTypeLabel || gradeTypeOptions.some(o => o.label === newName)) {
                                    newName = newTypeLabel || '';
                                }

                                setFormData({
                                    ...formData,
                                    type: newType,
                                    name: newName,
                                    isResit: false
                                });
                            }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">
                            Tên thành phần *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full h-[52px] px-4 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white"
                            placeholder="VD: Assignment 1, Quiz 2..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">
                            Mô tả
                        </label>
                        <textarea
                            rows={3}
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full p-4 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white"
                            placeholder="Mô tả chi tiết về thành phần điểm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">
                            Trọng số (%) *
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={formData.weight || ''}
                                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                                className="w-full h-[52px] px-4 pr-12 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white"
                                placeholder="0"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">%</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-[48px] px-6 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-sm font-bold text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || !formData.name || formData.weight <= 0}
                            className="flex items-center justify-center gap-2 h-[48px] px-8 rounded-2xl bg-fpt-orange text-sm font-bold text-white hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {editingComponent ? 'Lưu thay đổi' : 'Xác nhận'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

