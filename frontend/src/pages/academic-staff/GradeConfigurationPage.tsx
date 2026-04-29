import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Plus, Edit2, Trash2, ChevronLeft,
    Info, CheckCircle2, AlertCircle, Loader2, BookOpen
} from 'lucide-react';
import toast from "@utils/toast";
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { gradeComponentService, GradeComponent } from '../../services/api/gradeComponentService';
import { courseService } from '../../services/api/courseService';
import { Course, CoursePrerequisite } from '../../types/course';
import { ImportGradeComponentModal } from '../../components/academic-staff/ImportGradeComponentModal';
import { PrerequisiteSelectionModal } from '../../components/academic-staff/PrerequisiteSelectionModal';
import { sortGradeComponents } from '../../utils/gradeSortUtils';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { GradeComponentFormModal } from '../../components/academic-staff/GradeComponentFormModal';

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

// Grade type options - moved to modal

export const GradeConfigurationPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    const [course, setCourse] = useState<Course | null>(null);
    const [allComponents, setAllComponents] = useState<GradeComponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showImportModal, setShowImportModal] = useState(false);

    // Prerequisite state
    const [prerequisites, setPrerequisites] = useState<CoursePrerequisite[]>([]);
    const [isPrereqModalOpen, setIsPrereqModalOpen] = useState(false);
    const [prereqAdding, setPrereqAdding] = useState(false);
    const [prereqRemoving, setPrereqRemoving] = useState<number | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingComponent, setEditingComponent] = useState<GradeComponent | null>(null);

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

    const { mainComponents, totalWeight, isValidConfig, sortedComponents, weightByType } = useMemo(() => {
        const mainComponents = allComponents.filter(c => !c.isResit);
        const totalWeight = mainComponents.reduce((sum, c) => sum + c.weight, 0);
        const isValidConfig = Math.abs(totalWeight - 100) < 0.01;
        const sortedComponents = sortGradeComponents(allComponents);
        const weightByType = allComponents.reduce((acc, curr) => {
            if (!curr.isResit) {
                acc[curr.type] = (acc[curr.type] || 0) + curr.weight;
            }
            return acc;
        }, {} as Record<string, number>);
        return { mainComponents, totalWeight, isValidConfig, sortedComponents, weightByType };
    }, [allComponents]);

    // Modal handlers
    const openAddModal = () => {
        setEditingComponent(null);
        setShowModal(true);
    };

    const openEditModal = (component: GradeComponent) => {
        setEditingComponent(component);
        setShowModal(true);
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
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white line-clamp-2 break-words">
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
                                onClick={openAddModal}
                                className="flex h-[52px] items-center gap-2 px-6 rounded-2xl bg-fpt-orange text-white text-sm font-bold hover:bg-orange-600 hover:shadow-lg hover:shadow-fpt-orange/20 transition-all whitespace-nowrap shadow-lg shadow-fpt-orange/20 active:scale-95"
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
                                    <th className="px-5 py-5 text-left text-xs font-bold uppercase tracking-widest">Loại</th>
                                    <th className="px-5 py-5 text-left text-xs font-bold uppercase tracking-widest">Tên</th>
                                    <th className="px-5 py-5 text-center text-xs font-bold uppercase tracking-widest">Trọng số (%)</th>
                                    <th className="px-5 py-5 text-right text-xs font-bold uppercase tracking-widest">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {sortedComponents.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400 dark:text-zinc-500">
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
                                                <td className="px-5 py-5 text-center">
                                                    <span className={`text-sm font-bold ${component.isResit ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
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
                <GradeComponentFormModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSuccess={loadData}
                    courseId={parseInt(courseId!)}
                    editingComponent={editingComponent}
                    existingComponents={allComponents}
                />

                {/* Prerequisites Section */}
                <div className="rounded-2xl border-2 border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
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
                            className="flex h-[48px] sm:h-[52px] items-center gap-2 rounded-2xl bg-fpt-orange px-6 text-sm font-bold text-white hover:bg-orange-600 transition-all shadow-lg shadow-fpt-orange/20 active:scale-95"
                        >
                            <Plus className="h-[18px] w-[18px]" strokeWidth={3} />
                            Thêm từ kho
                        </button>
                    </div>

                    <div className="px-4 pt-3">
                        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                            Sinh viên phải hoàn thành (pass) các môn dưới đây trước khi được đăng ký môn <strong>{course.code}</strong>.
                        </div>
                    </div>

                    <div className="overflow-x-auto p-4 pt-2">
                        {prerequisites.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 dark:bg-zinc-800/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-zinc-800">
                                <div className="p-4 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm mb-4">
                                    <BookOpen className="h-8 w-8 text-gray-300 dark:text-zinc-600" />
                                </div>
                                <p className="text-sm font-bold text-gray-500 dark:text-zinc-400">
                                    Chưa có môn tiên quyết nào
                                </p>
                                <button
                                    onClick={() => setIsPrereqModalOpen(true)}
                                    className="mt-4 flex items-center gap-2 text-sm text-fpt-orange hover:text-orange-600 font-bold px-4 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all"
                                >
                                    <Plus className="h-4 w-4 stroke-[3]" />
                                    Thêm ngay
                                </button>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-zinc-800/50">
                                            <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Mã môn</th>
                                            <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Tên môn học</th>
                                            <th className="px-6 py-4 text-center text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest w-24">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                                        {prerequisites.map((prereq) => (
                                            <tr key={prereq.id} className="group hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center rounded-xl bg-orange-100 px-3 py-1 text-xs font-bold text-fpt-orange dark:bg-orange-950/40">
                                                        {prereq.code}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                                                        {prereq.name}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleRemovePrerequisite(prereq.id)}
                                                        disabled={prereqRemoving === prereq.id}
                                                        className="p-2 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 dark:bg-zinc-800 dark:hover:bg-red-950/30 transition-all active:scale-95 disabled:opacity-50"
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
                            </div>
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

