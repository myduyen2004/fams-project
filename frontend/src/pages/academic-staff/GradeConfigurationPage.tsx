import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Plus, Download, Edit2, Copy, Trash2, ChevronLeft,
    Info, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { gradeComponentService, GradeComponent, GradeType, GradeComponentRequest } from '../../services/api/gradeComponentService';
import { courseService } from '../../services/api/courseService';
import { Course } from '../../types/course';

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

export const GradeConfigurationPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    const [course, setCourse] = useState<Course | null>(null);
    const [allComponents, setAllComponents] = useState<GradeComponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
    const [editingComponent, setEditingComponent] = useState<GradeComponent | null>(null);
    const [formData, setFormData] = useState<GradeComponentRequest>({
        name: '',
        description: '',
        type: 'ASSIGNMENT',
        weight: 0,
        isRequired: true,
        isResit: false,
    });

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

    // Calculate total weight for each type
    const weightByType = allComponents.reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + curr.weight;
        return acc;
    }, {} as Record<string, number>);

    // Ordered list for display: 
    // 1. Sort types by total weight (ascending)
    // 2. Final Exam at bottom (before Resit)
    // 3. Resit at very bottom
    const sortedComponents = [...allComponents].sort((a, b) => {
        // Priority 1: Resit is always last
        if (a.isResit !== b.isResit) return a.isResit ? 1 : -1;
        if (a.isResit && b.isResit) return a.id - b.id; // Both are resit (shouldn't happen for 1 course usually), sort by ID

        // Priority 2: Final Exam is second to last
        const isAFinal = a.type === 'FINAL_EXAM';
        const isBFinal = b.type === 'FINAL_EXAM';
        if (isAFinal !== isBFinal) return isAFinal ? 1 : -1;
        if (isAFinal && isBFinal) return a.id - b.id;

        // Priority 3: Sort by Total Weight of the Type
        const weightTotalA = weightByType[a.type] || 0;
        const weightTotalB = weightByType[b.type] || 0;

        // If weights are significantly different, sort by weight
        if (Math.abs(weightTotalA - weightTotalB) > 0.01) {
            return weightTotalA - weightTotalB;
        }

        // Priority 4: Group by Type (if weights are same)
        if (a.type !== b.type) {
            return a.type.localeCompare(b.type);
        }

        // Priority 5: Sort by ID within same type
        return a.id - b.id;
    });

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
            weight: 0,
            isRequired: true,
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
            isRequired: component.isRequired,
            isResit: component.isResit,
            referenceComponentId: component.referenceComponentId,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!courseId) return;

        // Rounding Logic: Round to nearest integer, 0.5 rounds down (3.5 -> 3)
        // Math.ceil(x - 0.5) achieves this: 3.5-0.5=3->3, 3.6-0.5=3.1->4, 3.4-0.5=2.9->3
        const roundedWeight = Math.ceil(formData.weight - 0.5);

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

    const handleDuplicateComponent = async (component: GradeComponent) => {
        try {
            await gradeComponentService.duplicateGradeComponent(component.id);
            toast.success('Đã nhân đôi thành phần điểm');
            loadData();
        } catch (error) {
            console.error('Failed to duplicate:', error);
            toast.error('Không thể nhân đôi thành phần điểm');
        }
    };

    const handleDeleteComponent = async (component: GradeComponent) => {
        if (!confirm(`Bạn có chắc muốn xóa "${component.name}"?`)) return;

        try {
            await gradeComponentService.deleteGradeComponent(component.id);
            toast.success('Đã xóa thành phần điểm');
            loadData();
        } catch (error) {
            console.error('Failed to delete:', error);
            toast.error('Không thể xóa thành phần điểm');
        }
    };

    const handleToggleRequired = async (component: GradeComponent) => {
        try {
            await gradeComponentService.toggleRequired(component.id);
            loadData();
        } catch (error) {
            console.error('Failed to toggle:', error);
            toast.error('Không thể thay đổi trạng thái');
        }
    };

    const handleExport = () => {
        toast.success('Xuất cấu hình điểm (Tính năng đang phát triển)');
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
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
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {course.name} ({course.code})
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                            Cấu hình các thành phần điểm, trọng số và yêu cầu đánh giá cho môn học này.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all duration-200 shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Xuất file
                        </button>
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fpt-orange to-orange-500 text-white text-sm font-medium hover:from-orange-600 hover:to-orange-600 transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm thành phần điểm
                        </button>
                    </div>
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
                                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider">Bắt buộc</th>
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
                                                <td className="px-5 py-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleRequired(component)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-fpt-orange focus:ring-offset-2 ${component.isRequired ? 'bg-fpt-orange' : 'bg-gray-200 dark:bg-zinc-700'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${component.isRequired ? 'translate-x-6' : 'translate-x-1'
                                                                }`}
                                                        />
                                                    </button>
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
                                                                    onClick={() => handleDuplicateComponent(component)}
                                                                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                                    title="Nhân bản"
                                                                >
                                                                    <Copy className="w-4 h-4" />
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
                                                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-fpt-orange focus:border-transparent"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="isRequired"
                                                checked={formData.isRequired}
                                                onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                                                className="h-4 w-4 text-fpt-orange focus:ring-fpt-orange border-gray-300 rounded"
                                            />
                                            <label htmlFor="isRequired" className="text-sm text-gray-700 dark:text-zinc-300">
                                                Bắt buộc
                                            </label>
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
                                            disabled={saving || !formData.name || formData.weight < 0}
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
            </div>
        </AcademicStaffLayout >
    );
};
