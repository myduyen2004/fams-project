import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Plus, Download, Edit2, Trash2, ChevronLeft,
    Info, CheckCircle2, AlertCircle, Loader2, Upload, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { gradeComponentService, GradeComponent, GradeType, GradeComponentRequest } from '../../services/api/gradeComponentService';
import { courseService } from '../../services/api/courseService';
import { Course, CoursePrerequisite } from '../../types/course';
import { ImportGradeComponentModal } from '../../components/academic-staff/ImportGradeComponentModal';
import { PrerequisiteSelectionModal } from '../../components/academic-staff/PrerequisiteSelectionModal';
import { sortGradeComponents } from '../../utils/gradeSortUtils';

// Type colors mapping
const typeColors: Record<string, { bg: string; text: string; label: string; bar: string }> = {
    'PARTICIPATION': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Participation', bar: 'bg-emerald-500' },
    'PROGRESS_TEST': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Progress Test', bar: 'bg-blue-500' },
    'QUIZ': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', label: 'Quiz', bar: 'bg-cyan-500' },
    'WORKSHOP': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Workshop', bar: 'bg-purple-500' },
    'MID_TERM': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Midterm Exam', bar: 'bg-amber-500' },
    'PRACTICAL_EXAM': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Practical Exam', bar: 'bg-orange-500' },
    'FINAL_EXAM': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', label: 'Final Exam', bar: 'bg-rose-500' },
    'PROJECT': { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', label: 'Project', bar: 'bg-indigo-500' },
    'PRESENTATION': { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', label: 'Presentation', bar: 'bg-pink-500' },
    'RESIT': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', label: 'Resit', bar: 'bg-gray-500' },
    'ASSIGNMENT': { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', label: 'Assignment', bar: 'bg-teal-500' },
    'OTHER': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', label: 'Other', bar: 'bg-gray-500' },
};



// Grade type options for the modal
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

import { GradeTypeSelector } from '../../components/academic-staff/GradeTypeSelector';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const GradeConfigurationPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    const [course, setCourse] = useState<Course | null>(null);
    const [allComponents, setAllComponents] = useState<GradeComponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Prerequisite state
    const [prerequisites, setPrerequisites] = useState<CoursePrerequisite[]>([]);
    const [isPrereqModalOpen, setIsPrereqModalOpen] = useState(false);
    const [prereqAdding, setPrereqAdding] = useState(false);
    const [prereqRemoving, setPrereqRemoving] = useState<number | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
    const [editingComponent, setEditingComponent] = useState<GradeComponent | null>(null);
    const [formData, setFormData] = useState<GradeComponentRequest | any>({
        name: '',
        description: '',
        type: 'ASSIGNMENT',
        weight: '',
        isResit: false,
    });

    // Confirm Modal
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'danger' as 'danger' | 'warning' | 'info' | 'success',
        onConfirm: () => { },
        confirmLabel: 'Xác nhận'
    });

    const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    // Load data
    const loadData = useCallback(async () => {
        if (!courseId) return;

        setLoading(true);
        try {
            const [courseData, componentsData] = await Promise.all([
                courseService.getCourse(parseInt(courseId)),
                gradeComponentService.getGradeComponents(parseInt(courseId)),
            ]);
            setCourse(courseData);
            setAllComponents(componentsData);
            setPrerequisites(courseData.prerequisites || []);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const mainComponents = allComponents.filter(c => !c.isResit);
    const totalWeight = mainComponents.reduce((sum, c) => sum + c.weight, 0);
    const isValidConfig = Math.abs(totalWeight - 100) < 0.01;

    // Ordered list for display using centralized sorting utility
    const sortedComponents = sortGradeComponents(allComponents);

    // Calculate total weight for each type for visualization (progress bar and legend)
    const weightByType = allComponents.reduce((acc, curr) => {
        if (!curr.isResit) {
            acc[curr.type] = (acc[curr.type] || 0) + curr.weight;
        }
        return acc;
    }, {} as Record<string, number>);

    // Better sort: All components sorted by ID, but maybe keep Final Exam and Resit together?
    // User requested "Resit linked to FE". 
    // Let's just sort by ID for now as that usually reflects creation order. 
    // Or if user wants to see types grouped, we can sort by Type.

    // Let's stick to: Type matches Name as user requested.

    // Modal handlers
    const openAddModal = () => {
        setEditingComponent(null);
        setFormData({
            name: 'Assignment', // Default name matches default type
            description: '',
            type: 'ASSIGNMENT',
            weight: '',
            isResit: false,
        });
        setShowModal(true);
    };

    const openEditModal = (component: GradeComponent) => {
        setEditingComponent(component);
        setFormData({
            name: component.name,
            description: component.description || '',
            type: component.type,
            weight: component.weight,
            isResit: component.isResit,
            referenceComponentId: component.referenceComponentId,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!courseId) return;

        // Rounding Logic: Round to nearest integer, 0.5 rounds down (3.5 -> 3)
        // Math.ceil(x - 0.5) achieves this: 3.5-0.5=3->3, 3.6-0.5=3.1->4, 3.4-0.5=2.9->3
        const weightValue = Number(formData.weight) || 0;
        const roundedWeight = Math.ceil(weightValue - 0.5);

        // Create processed data object to ensure consistency
        const processedData = {
            ...formData,
            weight: roundedWeight,
            name: formData.name.trim()
        };

        // Validation
        if (!processedData.name) {
            toast.error('Tên đầu điểm không được để trống');
            return;
        }

        // 1. Check if name is ONLY numbers (must contain at least one non-digit)
        if (/^\d+$/.test(processedData.name)) {
            toast.error('Tên đầu điểm không được chỉ chứa mỗi số');
            return;
        }

        // 2. Check for duplicate names
        const isDuplicate = allComponents.some(c =>
            c.name.toLowerCase() === processedData.name.toLowerCase() &&
            c.id !== editingComponent?.id
        );
        if (isDuplicate) {
            toast.error('Tên đầu điểm đã tồn tại');
            return;
        }

        // 3. Weight Validation
        if (processedData.weight <= 0) {
            toast.error('Trọng số phải lớn hơn 0%');
            return;
        }

        // 4. Total Weight Validation (Only for main components)
        if (!processedData.isResit) {
            const currentTotal = mainComponents
                .filter(c => c.id !== editingComponent?.id)
                .reduce((sum, c) => sum + c.weight, 0);

            // Check if adding this weight exceeds 100
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
                await gradeComponentService.createGradeComponent(parseInt(courseId), processedData);
                toast.success('Đã thêm thành phần điểm');
            }
            setShowModal(false);
            loadData();
        } catch (error) {
            console.error('Failed to save:', error);
            toast.error('Không thể lưu thành phần điểm');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteComponent = (component: GradeComponent) => {
        setConfirmModal({
            isOpen: true,
            title: 'Xóa thành phần điểm',
            message: `Bạn có chắc chắn muốn xóa "${component.name}"?\nHành động này không thể hoàn tác.`,
            type: 'danger',
            confirmLabel: 'Xóa',
            onConfirm: async () => {
                try {
                    await gradeComponentService.deleteGradeComponent(component.id);
                    toast.success('Đã xóa thành phần điểm');
                    loadData();
                    closeConfirmModal();
                } catch (error) {
                    console.error('Failed to delete:', error);
                    toast.error('Không thể xóa thành phần điểm');
                    closeConfirmModal();
                }
            }
        });
    };


    const handleExport = () => {
        toast.success('Xuất cấu hình điểm (Tính năng đang phát triển)');
    };

    // Handlers for prerequisites
    const handleAddPrerequisites = async (selectedIds: number[]) => {
        if (!course) return;
        setPrereqAdding(true);
        try {
            let updated: CoursePrerequisite[] = prerequisites;
            for (const prereqId of selectedIds) {
                updated = await courseService.addPrerequisite(course.id, prereqId);
            }
            setPrerequisites(updated);
            setIsPrereqModalOpen(false);
            toast.success(`Đã thêm ${selectedIds.length} môn tiên quyết`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể thêm môn tiên quyết');
        } finally {
            setPrereqAdding(false);
        }
    };

    const handleRemovePrerequisite = async (prereqId: number) => {
        if (!course) return;
        setPrereqRemoving(prereqId);
        try {
            const updated = await courseService.removePrerequisite(course.id, prereqId);
            setPrerequisites(updated);
            toast.success('Đã xóa môn tiên quyết');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể xóa môn tiên quyết');
        } finally {
            setPrereqRemoving(null);
        }
    };

    if (loading) {
        return (
            <AcademicStaffLayout pageTitle="Cấu hình điểm">
                <div className="flex items-center justify-center h-96">
                    <Loader2 className="w-8 h-8 text-fpt-orange animate-spin" />
                </div>
            </AcademicStaffLayout>
        );
    }

    if (!course) {
        return (
            <AcademicStaffLayout pageTitle="Cấu hình điểm">
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Không tìm thấy môn học</p>
                    </div>
                </div>
            </AcademicStaffLayout>
        );
    }

    return (
        <AcademicStaffLayout pageTitle="Cấu hình điểm">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/academic-staff/courses')}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${course.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                            {course.status}
                        </span>
                    </div>

                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                        <div className="flex items-center gap-4 flex-wrap flex-1 min-w-0">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white line-clamp-2 break-words">
                                {course.name} ({course.code})
                            </h1>

                            {/* GPA Toggle */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30 transition-all hover:border-orange-200 shrink-0">
                                <span className="text-[11px] uppercase tracking-wider font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">Tính GPA:</span>
                                <button
                                    onClick={async () => {
                                        if (!course) return;
                                        try {
                                            const updated = await courseService.updateGpaStatus(course.id, !course.isCalculatedInGpa);
                                            setCourse({ ...course, isCalculatedInGpa: updated.isCalculatedInGpa });
                                            toast.success(`Đã ${updated.isCalculatedInGpa ? 'bật' : 'tắt'} tính GPA cho môn ${course.code}`);
                                        } catch (error) {
                                            toast.error('Không thể cập nhật trạng thái GPA');
                                        }
                                    }}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0 ${course.isCalculatedInGpa ? 'bg-fpt-orange' : 'bg-gray-300 dark:bg-zinc-600'}`}
                                >
                                    <span
                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${course.isCalculatedInGpa ? 'translate-x-[18px]' : 'translate-x-[2px]'}`}
                                    />
                                </button>
                                <span className={`text-[11px] font-bold min-w-[24px] ${course.isCalculatedInGpa ? 'text-fpt-orange' : 'text-gray-400 dark:text-zinc-500'}`}>
                                    {course.isCalculatedInGpa ? 'BẬT' : 'TẮT'}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all duration-200 shadow-sm whitespace-nowrap"
                            >
                                <Download className="w-4 h-4" />
                                Xuất file
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-fpt-orange bg-orange-50 dark:bg-orange-900/20 text-fpt-orange text-sm font-medium hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all duration-200 shadow-sm whitespace-nowrap"
                            >
                                <Upload className="w-4 h-4" />
                                Import thành phần điểm
                            </button>
                            <button
                                onClick={openAddModal}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fpt-orange to-orange-500 text-white text-sm font-medium hover:from-orange-600 hover:to-orange-600 transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm thành phần điểm
                            </button>
                        </div>
                    </div>

                    <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                        Cấu hình các thành phần điểm, trọng số và yêu cầu đánh giá cho môn học này.
                    </p>
                </div>

                {/* Automation Info Alert */}
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Quản lý thi lại tự động</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            Điểm &quot;Resit&quot; sẽ được tự động tạo và đồng bộ với &quot;Final Exam&quot;.
                            Bạn không thể tạo, sửa hoặc xóa trực tiếp thành phần điểm &quot;Resit&quot;.
                            Mọi thay đổi về trọng số của &quot;Final Exam&quot; sẽ tự động cập nhật cho thành phần điểm &quot;Resit&quot;.
                        </p>
                    </div>
                </div>

                {/* Total Weight Progress */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Tổng trọng số
                            </h3>
                            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
                                <Info className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${isValidConfig ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {totalWeight.toFixed(1)}%
                            </span>
                            <span className={`text-xs font-medium ${isValidConfig ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {isValidConfig ? 'Hợp lệ' : 'Không hợp lệ - Tổng phải bằng 100%'}
                            </span>
                            {isValidConfig ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                        </div>
                    </div>
                    {/* Segmented Progress Bar */}
                    <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                        {Object.entries(weightByType)
                            .filter(([type]) => type !== 'RESIT')
                            .filter(([type]) => {
                                return mainComponents.some(c => c.type === type);
                            })
                            .sort((a, b) => a[1] - b[1])
                            .map(([type, weight]) => {
                                const color = typeColors[type]?.bar || typeColors['OTHER'].bar;
                                const label = typeColors[type]?.label || type;
                                return (
                                    <div
                                        key={type}
                                        className={`${color} transition-all duration-500 ease-out`}
                                        style={{ width: `${weight}%` }}
                                        title={`${label}: ${weight}%`}
                                    />
                                );
                            })}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                        {Object.entries(weightByType)
                            .filter(([type]) => type !== 'RESIT' && mainComponents.some(c => c.type === type))
                            .sort((a, b) => a[1] - b[1])
                            .map(([type]) => {
                                const color = typeColors[type]?.bar || typeColors['OTHER'].bar;
                                const label = typeColors[type]?.label || type;
                                return (
                                    <div key={type} className="flex items-center gap-1.5">
                                        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                                        <span className="text-xs text-gray-600 dark:text-zinc-400">{label}</span>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Unified Grade Components Table */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            Danh sách thành phần điểm
                        </h3>
                        <span className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-2.5 py-1 rounded-full">
                            {allComponents.length} mục
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-fpt-orange text-white">
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-lg">Loại</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tên</th>
                                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider">Trọng số (%)</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {sortedComponents.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400 dark:text-zinc-500">
                                            Chưa có thành phần điểm nào. Click "Thêm thành phần điểm" để thêm.
                                        </td>
                                    </tr>
                                ) : (
                                    sortedComponents.map((component) => {
                                        const typeStyle = typeColors[component.type] || typeColors['OTHER'];
                                        return (
                                            <tr
                                                key={component.id}
                                                className={`group transition-colors ${component.isResit ? 'bg-gray-50/50 dark:bg-zinc-800/30' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'}`}
                                            >
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                                                        {typeStyle.label}
                                                    </span>
                                                    {component.isResit && (
                                                        <span className="ml-2 text-xs text-gray-400 italic">(Resit Logic)</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{component.name}</p>
                                                        {component.description && (
                                                            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">{component.description}</p>
                                                        )}
                                                        {component.referenceComponentName && (
                                                            <p className="text-xs text-blue-500 mt-0.5">Tham chiếu: {component.referenceComponentName}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`text-sm font-semibold ${component.isResit ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                        {component.weight}%
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {component.type !== 'RESIT' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => openEditModal(component)}
                                                                    className="p-2 rounded-lg text-gray-400 hover:text-fpt-orange hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                                                                    title="Sửa"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteComponent(component)}
                                                                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                    title="Xóa"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded">
                                                                Tự động quản lý theo Final Exam
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal */}
                {
                    showModal && (
                        <div className="fixed inset-0 z-50 overflow-y-auto">
                            <div className="flex min-h-full items-center justify-center p-4">
                                <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowModal(false)} />
                                <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-md w-full p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                        {editingComponent ? 'Chỉnh sửa thành phần điểm' : 'Thêm thành phần điểm'}
                                    </h2>

                                    <div className="space-y-4">
                                        <div>
                                            <GradeTypeSelector
                                                value={formData.type}
                                                isOpen={isTypeSelectorOpen}
                                                onToggle={() => setIsTypeSelectorOpen(!isTypeSelectorOpen)}
                                                options={gradeTypeOptions
                                                    .filter(opt => opt.value !== 'RESIT') // Hide RESIT
                                                    .filter(opt => {
                                                        // Hide FINAL_EXAM if it already exists (unless we are editing the FE itself)
                                                        if (opt.value === 'FINAL_EXAM') {
                                                            const hasFE = allComponents.some(c => c.type === 'FINAL_EXAM');
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

                                                    // Logic: If user hasn't changed name manually (matches label), update it
                                                    let newName = formData.name;
                                                    if (!newName || newName === currentTypeLabel) {
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
                                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                                Tên *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-fpt-orange focus:border-transparent"
                                                placeholder="e.g., Final Exam"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                                Mô tả
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.description || ''}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-fpt-orange focus:border-transparent"
                                                placeholder="Mô tả ngắn gọn"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                                                Trọng số (%) *
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={formData.weight}
                                                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-fpt-orange focus:border-transparent"
                                            />
                                        </div>

                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving || !formData.name || Number(formData.weight) < 0}
                                            className="px-4 py-2 text-sm font-medium text-white bg-fpt-orange hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {editingComponent ? 'Cập nhật' : 'Thêm'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Prerequisites Section */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    {/* Section header */}
                    <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-fpt-orange" />
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                Môn tiên quyết
                            </h2>
                            <span className="text-sm text-gray-500 dark:text-zinc-400">
                                ({prerequisites.length} môn)
                            </span>
                        </div>
                        <button
                            onClick={() => setIsPrereqModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg bg-fpt-orange px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Thêm từ kho
                        </button>
                    </div>

                    {/* Info banner */}
                    <div className="px-4 pt-3">
                        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                            Sinh viên phải hoàn thành (pass) các môn dưới đây trước khi được đăng ký môn <strong>{course.code}</strong>.
                        </div>
                    </div>

                    <div className="overflow-x-auto p-4">
                        {prerequisites.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <BookOpen className="h-10 w-10 text-gray-300 dark:text-zinc-600 mb-3" />
                                <p className="text-sm text-gray-500 dark:text-zinc-400">
                                    Chưa có môn tiên quyết nào.
                                </p>
                                <button
                                    onClick={() => setIsPrereqModalOpen(true)}
                                    className="mt-3 flex items-center gap-1.5 text-sm text-fpt-orange hover:text-orange-600 font-medium"
                                >
                                    <Plus className="h-4 w-4" />
                                    Thêm môn tiên quyết
                                </button>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-fpt-orange text-white">
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-lg">Mã môn</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tên môn học</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg w-24">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                    {prerequisites.map((prereq) => (
                                        <tr key={prereq.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center rounded-md bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                                    {prereq.code}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-zinc-300">
                                                {prereq.name}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleRemovePrerequisite(prereq.id)}
                                                    disabled={prereqRemoving === prereq.id}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 shadow-sm border border-gray-100 hover:border-red-100 transition-all duration-200 disabled:opacity-50"
                                                    title="Xóa khỏi môn tiên quyết"
                                                >
                                                    {prereqRemoving === prereq.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>

            <ImportGradeComponentModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={() => { loadData(); }}
                existingComponents={allComponents}
            />

            {course && (
                <PrerequisiteSelectionModal
                    isOpen={isPrereqModalOpen}
                    onClose={() => setIsPrereqModalOpen(false)}
                    onConfirm={handleAddPrerequisites}
                    excludeCourseId={course.id}
                    existingPrerequisiteIds={prerequisites.map(p => p.id)}
                    loading={prereqAdding}
                />
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmLabel={confirmModal.confirmLabel}
            />
        </AcademicStaffLayout >
    );
};
