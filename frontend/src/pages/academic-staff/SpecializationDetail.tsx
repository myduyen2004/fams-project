import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Loader2, ArrowLeft, GripVertical, Trash2, BookOpen, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { specializationService } from '../../services/api/specializationService';
import { subSpecializationService } from '../../services/api/subSpecializationService';
// Removed courseService import
import { StatusBadge } from '../../components/academic-staff';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CourseSelectionModal } from '../../components/academic-staff/CourseSelectionModal';
import { SubSpecFormModal } from '../../components/academic-staff/SubSpecFormModal';
import { Specialization } from '../../types/specialization';
import { SubSpecialization } from '../../types/subspecialization';
import { Course } from '../../types/course';


// ========== Draggable Course Row ==========
interface DraggableCourseRowProps {
    course: Course;
    index: number;
    onRemove: (courseId: number) => void;
    onDragStart: (index: number) => void;
    onDragOver: (index: number) => void;
    onDragEnd: () => void;
    isDragging: boolean;
    isSelected?: boolean;
    onSelect?: (checked: boolean) => void;
    onClick?: (e: React.MouseEvent) => void;
}

const DraggableCourseRow: React.FC<DraggableCourseRowProps> = ({
    course, index, onRemove, onDragStart, onDragOver, onDragEnd, isDragging, isSelected, onSelect, onClick
}) => {
    return (
        <tr
            draggable
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
            onDragEnd={onDragEnd}
            className={`group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-move ${isDragging ? 'opacity-50 bg-orange-50' : ''} ${isSelected ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}
            onClick={onClick}
        >
            <td className="px-4 py-3 text-left w-10">
                {onSelect && (
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange"
                        checked={isSelected || false}
                        onChange={(e) => onSelect(e.target.checked)}
                    />
                )}
            </td>
            <td className="px-4 py-3">
                <GripVertical className="h-4 w-4 text-gray-400 group-hover:text-fpt-orange transition-colors" />
            </td>
            <td className="px-4 py-3 font-medium font-semibold text-gray-900">{course.code}</td>
            <td className="px-4 py-3 text-gray-900 dark:text-white">{course.name}</td>
            <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {course.credits} Tín chỉ
                </span>
            </td>
            <td className="px-4 py-3 text-center text-gray-600 dark:text-zinc-400">
                Học kỳ {course.semester || '-'}
            </td>
            <td className="px-4 py-3 text-center">
                <StatusBadge status={course.status} />
            </td>
            <td className="px-4 py-3 text-center">
                <button
                    onClick={() => onRemove(course.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 shadow-sm border border-gray-100 hover:border-red-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0"
                    title="Xóa khỏi chương trình"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </td>
        </tr>
    );
};

// ========== Main Page Component ==========
export const SpecializationDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [specialization, setSpecialization] = useState<Specialization | null>(null);
    const [subSpecializations, setSubSpecializations] = useState<SubSpecialization[]>([]);
    const [specCourses, setSpecCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    // Tab state
    const [activeTab, setActiveTab] = useState<number | null>(null);
    const [subSpecCourses, setSubSpecCourses] = useState<Course[]>([]);
    const [loadingSubSpecCourses, setLoadingSubSpecCourses] = useState(false);

    const [selectedSubSpecCourses, setSelectedSubSpecCourses] = useState<number[]>([]);
    const [selectedSpecCourses, setSelectedSpecCourses] = useState<number[]>([]);

    // State for range selection
    const [lastSelectedSpecCourseId, setLastSelectedSpecCourseId] = useState<number | null>(null);
    const [lastSelectedSubSpecCourseId, setLastSelectedSubSpecCourseId] = useState<number | null>(null);

    const handleSpecCourseRowClick = (course: Course, e: React.MouseEvent) => {
        if (e.shiftKey) {
            document.getSelection()?.removeAllRanges();
        }

        if (e.shiftKey && lastSelectedSpecCourseId !== null) {
            const currentIndex = specCourses.findIndex(c => c.id === course.id);
            const lastIndex = specCourses.findIndex(c => c.id === lastSelectedSpecCourseId);

            if (currentIndex !== -1 && lastIndex !== -1) {
                const start = Math.min(currentIndex, lastIndex);
                const end = Math.max(currentIndex, lastIndex);
                const rangeIds = specCourses.slice(start, end + 1).map(c => c.id);
                // Union with existing
                const newSelected = Array.from(new Set([...selectedSpecCourses, ...rangeIds]));
                setSelectedSpecCourses(newSelected);
            }
        } else if (e.ctrlKey || e.metaKey) {
            if (selectedSpecCourses.includes(course.id)) {
                setSelectedSpecCourses(selectedSpecCourses.filter(id => id !== course.id));
            } else {
                setSelectedSpecCourses([...selectedSpecCourses, course.id]);
            }
            setLastSelectedSpecCourseId(course.id);
        } else {
            setSelectedSpecCourses([course.id]);
            setLastSelectedSpecCourseId(course.id);
        }
    };

    const handleSubSpecCourseRowClick = (course: Course, e: React.MouseEvent) => {
        if (e.shiftKey) {
            document.getSelection()?.removeAllRanges();
        }

        if (e.shiftKey && lastSelectedSubSpecCourseId !== null) {
            const currentIndex = subSpecCourses.findIndex(c => c.id === course.id);
            const lastIndex = subSpecCourses.findIndex(c => c.id === lastSelectedSubSpecCourseId);

            if (currentIndex !== -1 && lastIndex !== -1) {
                const start = Math.min(currentIndex, lastIndex);
                const end = Math.max(currentIndex, lastIndex);
                const rangeIds = subSpecCourses.slice(start, end + 1).map(c => c.id);
                // Union
                const newSelected = Array.from(new Set([...selectedSubSpecCourses, ...rangeIds]));
                setSelectedSubSpecCourses(newSelected);
            }
        } else if (e.ctrlKey || e.metaKey) {
            if (selectedSubSpecCourses.includes(course.id)) {
                setSelectedSubSpecCourses(selectedSubSpecCourses.filter(id => id !== course.id));
            } else {
                setSelectedSubSpecCourses([...selectedSubSpecCourses, course.id]);
            }
            setLastSelectedSubSpecCourseId(course.id);
        } else {
            setSelectedSubSpecCourses([course.id]);
            setLastSelectedSubSpecCourseId(course.id);
        }
    };

    const handleSelectOneSpecCourse = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedSpecCourses([...selectedSpecCourses, id]);
        } else {
            setSelectedSpecCourses(selectedSpecCourses.filter(item => item !== id));
        }
        setLastSelectedSpecCourseId(id);
    };

    const handleSelectOneSubSpecCourse = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedSubSpecCourses([...selectedSubSpecCourses, id]);
        } else {
            setSelectedSubSpecCourses(selectedSubSpecCourses.filter(item => item !== id));
        }
        setLastSelectedSubSpecCourseId(id);
    };

    // Modal state
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [courseModalTarget, setCourseModalTarget] = useState<{ type: 'specialization' | 'subspecialization'; id: number } | null>(null);

    // CRUD Modals
    const [isSubSpecFormOpen, setIsSubSpecFormOpen] = useState(false);
    const [editingSubSpec, setEditingSubSpec] = useState<SubSpecialization | null>(null);

    // Drag state
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

    // Fetch main data
    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const [specData, subSpecs, courses] = await Promise.all([
                specializationService.getSpecialization(parseInt(id)),
                subSpecializationService.getSubSpecializationsBySpecialization(parseInt(id)),
                specializationService.getCourses(parseInt(id))
            ]);
            setSpecialization(specData);
            setSubSpecializations(subSpecs);
            setSpecCourses(courses);
            if (subSpecs.length > 0 && activeTab === null) {
                setActiveTab(subSpecs[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch:', error);
            toast.error('Không thể tải thông tin chuyên ngành');
        } finally {
            setLoading(false);
        }
    }, [id, activeTab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Fetch courses for active tab
    useEffect(() => {
        if (activeTab === null) return;
        const fetchSubSpecCourses = async () => {
            setLoadingSubSpecCourses(true);
            setSelectedSubSpecCourses([]); // Reset selection
            try {
                const courses = await subSpecializationService.getCourses(activeTab);
                setSubSpecCourses(courses);
            } catch (error) {
                console.error('Failed to fetch sub-spec courses:', error);
            } finally {
                setLoadingSubSpecCourses(false);
            }
        };
        fetchSubSpecCourses();
    }, [activeTab]);

    // Handle add course selection
    const handleConfirmSelection = async (selection: { courseId: number; semester: number }[]) => {
        if (!courseModalTarget) return;
        try {
            const promises = selection.map(item =>
                courseModalTarget.type === 'specialization'
                    ? specializationService.addCourse(courseModalTarget.id, item.courseId, item.semester)
                    : subSpecializationService.addCourse(courseModalTarget.id, item.courseId, item.semester)
            );

            // Wait for all additions
            await Promise.all(promises);

            // Fetch data again to ensure correctness and order
            if (courseModalTarget.type === 'specialization') {
                const updatedCourses = await specializationService.getCourses(courseModalTarget.id);
                setSpecCourses(updatedCourses);
            } else {
                const updatedCourses = await subSpecializationService.getCourses(courseModalTarget.id);
                setSubSpecCourses(updatedCourses);
            }

            toast.success(`Đã thêm ${selection.length} môn học`);
            setIsCourseModalOpen(false);
        } catch (error: any) {
            console.error('Add courses error:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi thêm môn học');
        }
    };

    // Handle remove course
    const handleRemoveCourse = (courseId: number, type: 'specialization' | 'subspecialization', targetId: number) => {
        const course = type === 'specialization'
            ? specCourses.find(c => c.id === courseId)
            : subSpecCourses.find(c => c.id === courseId);

        setConfirmModal({
            isOpen: true,
            title: 'Xóa môn học',
            message: `Bạn có chắc chắn muốn xóa môn "${course?.name}" khỏi chương trình?`,
            type: 'danger',
            confirmLabel: 'Xóa',
            onConfirm: async () => {
                try {
                    if (type === 'specialization') {
                        await specializationService.removeCourse(targetId, courseId);
                        setSpecCourses(prev => prev.filter(c => c.id !== courseId));
                    } else {
                        await subSpecializationService.removeCourse(targetId, courseId);
                        setSubSpecCourses(prev => prev.filter(c => c.id !== courseId));
                    }
                    toast.success('Đã xóa môn học');
                    closeConfirmModal();
                } catch (error: any) {
                    toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
                    closeConfirmModal();
                }
            }
        });
    };

    const handleBulkRemove = (subSpecId: number) => {
        if (selectedSubSpecCourses.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: 'Xóa hàng loạt',
            message: `Bạn có chắc chắn muốn xóa ${selectedSubSpecCourses.length} môn học đã chọn khỏi chuyên ngành hẹp?`,
            type: 'danger',
            confirmLabel: 'Xóa',
            onConfirm: async () => {
                try {
                    await Promise.all(selectedSubSpecCourses.map(id =>
                        subSpecializationService.removeCourse(subSpecId, id)
                    ));
                    setSubSpecCourses(prev => prev.filter(c => !selectedSubSpecCourses.includes(c.id)));
                    setSelectedSubSpecCourses([]);
                    toast.success('Đã xóa các môn học đã chọn');
                    closeConfirmModal();
                } catch (error: any) {
                    toast.error('Có lỗi xảy ra khi xóa môn học');
                    closeConfirmModal();
                }
            }
        });
    };

    const handleBulkRemoveSpecCourses = () => {
        if (!specialization || selectedSpecCourses.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: 'Xóa hàng loạt',
            message: `Bạn có chắc chắn muốn xóa ${selectedSpecCourses.length} môn học đã chọn khỏi chuyên ngành?`,
            type: 'danger',
            confirmLabel: 'Xóa',
            onConfirm: async () => {
                try {
                    await Promise.all(selectedSpecCourses.map(id =>
                        specializationService.removeCourse(specialization.id, id)
                    ));
                    setSpecCourses(prev => prev.filter(c => !selectedSpecCourses.includes(c.id)));
                    setSelectedSpecCourses([]);
                    toast.success('Đã xóa các môn học đã chọn');
                    closeConfirmModal();
                } catch (error: any) {
                    toast.error('Có lỗi xảy ra khi xóa môn học');
                    closeConfirmModal();
                }
            }
        });
    };

    // Handle drag & drop reorder
    const handleDragEnd = async (type: 'specialization' | 'subspecialization', targetId: number) => {
        if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
            setDragIndex(null);
            setDragOverIndex(null);
            return;
        }

        const courses = type === 'specialization' ? [...specCourses] : [...subSpecCourses];
        const [movedItem] = courses.splice(dragIndex, 1);
        courses.splice(dragOverIndex, 0, movedItem);

        if (type === 'specialization') {
            setSpecCourses(courses);
        } else {
            setSubSpecCourses(courses);
        }

        setDragIndex(null);
        setDragOverIndex(null);

        try {
            const courseIds = courses.map(c => c.id);
            if (type === 'specialization') {
                await specializationService.reorderCourses(targetId, courseIds);
            } else {
                await subSpecializationService.reorderCourses(targetId, courseIds);
            }
        } catch (error) {
            console.error('Reorder failed:', error);
            toast.error('Không thể lưu thứ tự');
            // Revert on error
            if (type === 'specialization') {
                fetchData();
            }
        }
    };

    // Calculate totals
    const totalSpecCredits = specCourses.reduce((sum, c) => sum + c.credits, 0);
    const totalSubSpecCredits = subSpecCourses.reduce((sum, c) => sum + c.credits, 0);

    if (loading && !specialization) {
        return (
            <AcademicStaffLayout pageTitle="Chi tiết chuyên ngành">
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-fpt-orange" />
                </div>
            </AcademicStaffLayout>
        );
    }

    return (
        <AcademicStaffLayout pageTitle="Chi tiết chuyên ngành">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-fpt-orange mb-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Quay lại
                        </button>


                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{specialization?.name} · Mã chuyên ngành: {specialization?.code}</h1>
                            {specialization && <StatusBadge status={specialization.status} />}
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-gradient-to-r from-fpt-orange to-orange-500 p-6 text-white">
                    <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-white/20 p-3">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Tổng quan chương trình</h3>
                            <p className="text-sm text-white/80">Cập nhật lần cuối vừa xong</p>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-3xl font-bold">{specCourses.length + subSpecCourses.length}</p>
                            <p className="text-sm text-white/80">Tổng số môn học</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold">{totalSpecCredits + totalSubSpecCredits}</p>
                            <p className="text-sm text-white/80">Tổng tín chỉ</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold">{subSpecializations.length}</p>
                            <p className="text-sm text-white/80">Chuyên ngành hẹp</p>
                        </div>
                    </div>
                </div>


                <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange"
                                    checked={specCourses.length > 0 && selectedSpecCourses.length === specCourses.length}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedSpecCourses(specCourses.map(c => c.id));
                                        } else {
                                            setSelectedSpecCourses([]);
                                        }
                                    }}
                                    disabled={specCourses.length === 0}
                                />
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-fpt-orange" />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Môn học bắt buộc của chuyên ngành
                                    </h2>
                                    <span className="text-sm text-gray-500">({specCourses.length} môn · {totalSpecCredits} TC)</span>
                                </div>
                            </div>
                            {selectedSpecCourses.length > 0 && (
                                <>
                                    <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700" />
                                    <button
                                        onClick={handleBulkRemoveSpecCourses}
                                        className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {selectedSpecCourses.length > 1 ? 'Xóa hàng loạt' : 'Xóa'}
                                    </button>
                                </>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setCourseModalTarget({ type: 'specialization', id: parseInt(id!) });
                                setIsCourseModalOpen(true);
                            }}
                            className="flex items-center gap-2 rounded-lg bg-fpt-orange px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
                        >
                            <Plus className="h-4 w-4" />
                            Thêm từ kho
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-zinc-800">
                                    <th className="px-4 py-3 text-left w-10"></th>
                                    <th className="px-4 py-3 text-left w-10"></th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400">Mã</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400">Tên môn học</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400">Số tín chỉ</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400">Học kỳ</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400">Trạng thái</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400 w-20 whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {specCourses.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-gray-500">
                                            Chưa có môn học nào. Nhấn "Thêm từ kho môn học" để bắt đầu.
                                        </td>
                                    </tr>
                                ) : (
                                    specCourses.map((course, index) => (
                                        <DraggableCourseRow
                                            key={course.id}
                                            index={index}
                                            course={course}
                                            onRemove={(courseId) => handleRemoveCourse(courseId, 'specialization', parseInt(id!))}
                                            onDragStart={setDragIndex}
                                            onDragOver={setDragOverIndex}
                                            onDragEnd={() => handleDragEnd('specialization', parseInt(id!))}
                                            isDragging={dragIndex === index}
                                            isSelected={selectedSpecCourses.includes(course.id)}
                                            onSelect={(checked) => handleSelectOneSpecCourse(course.id, checked)}
                                            onClick={(e) => handleSpecCourseRowClick(course, e)}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Section 2: Chuyên ngành hẹp */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-fpt-orange" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Chuyên ngành hẹp
                            </h2>
                            <span className="text-sm text-gray-500">({subSpecializations.length} combo)</span>
                        </div>
                        <button
                            onClick={() => { setEditingSubSpec(null); setIsSubSpecFormOpen(true); }}
                            className="flex items-center gap-2 rounded-lg bg-fpt-orange px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
                        >
                            <Plus className="h-4 w-4" />
                            Thêm chuyên ngành hẹp
                        </button>
                    </div>
                </div>

                {/* Sub-specialization Cards */}
                {subSpecializations.length > 0 && (
                    <div className="mb-6">
                        <div className="flex flex-wrap gap-4">
                            {subSpecializations.map((subSpec) => (
                                <div
                                    key={subSpec.id}
                                    className={`group relative flex flex-col rounded-xl border-2 bg-white dark:bg-zinc-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg cursor-pointer min-w-[200px] max-w-[280px] ${activeTab === subSpec.id
                                        ? 'border-fpt-orange shadow-orange-100 dark:shadow-orange-900/20'
                                        : 'border-gray-200 dark:border-zinc-700 hover:border-fpt-orange/50'
                                        }`}
                                    onClick={() => setActiveTab(subSpec.id)}
                                >
                                    {/* Card Header */}
                                    <div className="p-4 pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`font-semibold truncate transition-colors ${activeTab === subSpec.id
                                                    ? 'text-fpt-orange'
                                                    : 'text-gray-900 dark:text-white group-hover:text-fpt-orange'
                                                    }`}>
                                                    {subSpec.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                                    {subSpec.code}
                                                </p>
                                            </div>
                                            {activeTab === subSpec.id && (
                                                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-fpt-orange animate-pulse" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Stats */}
                                    <div className="px-4 pb-2">
                                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400">
                                            <span className="inline-flex items-center gap-1">
                                                <BookOpen className="h-3.5 w-3.5" />
                                                {subSpec.courseCount || 0} môn
                                            </span>
                                            <span>·</span>
                                            <span>{subSpec.totalCredits || 0} TC</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons - Hidden by default, shown on hover */}
                                    <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-900 dark:via-zinc-900 rounded-b-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingSubSpec(subSpec);
                                                    setIsSubSpecFormOpen(true);
                                                }}
                                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400"
                                                title="Chỉnh sửa"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (subSpec.canDelete === false) {
                                                        toast.error('Không thể xóa chuyên ngành hẹp đang có sinh viên theo học');
                                                        return;
                                                    }
                                                    setConfirmModal({
                                                        isOpen: true,
                                                        title: 'Xóa chuyên ngành hẹp',
                                                        message: `Bạn có chắc chắn muốn xóa "${subSpec.name}"?`,
                                                        type: 'danger',
                                                        confirmLabel: 'Xóa',
                                                        onConfirm: async () => {
                                                            try {
                                                                await subSpecializationService.deleteSubSpecialization(subSpec.id);
                                                                toast.success('Đã xóa chuyên ngành hẹp');
                                                                fetchData();
                                                                closeConfirmModal();
                                                            } catch (error: any) {
                                                                toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
                                                                closeConfirmModal();
                                                            }
                                                        }
                                                    });
                                                }}
                                                className={`p-1.5 rounded-lg transition-colors ${subSpec.canDelete === false
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
                                                    : 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400'
                                                    }`}
                                                title={subSpec.canDelete === false ? 'Không thể xóa khi có sinh viên theo học' : 'Xóa'}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab content */}
                {activeTab !== null && (
                    <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-4">
                                {subSpecCourses.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange"
                                            checked={subSpecCourses.length > 0 && selectedSubSpecCourses.length === subSpecCourses.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedSubSpecCourses(subSpecCourses.map(c => c.id));
                                                } else {
                                                    setSelectedSubSpecCourses([]);
                                                }
                                            }}
                                        />
                                        <span className="text-sm text-gray-600 dark:text-zinc-400">Chọn tất cả</span>
                                    </div>
                                )}
                                {selectedSubSpecCourses.length > 0 && (
                                    <>
                                        <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700" />
                                        <button
                                            onClick={() => handleBulkRemove(activeTab)}
                                            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            {selectedSubSpecCourses.length > 1 ? 'Xóa hàng loạt' : 'Xóa'}
                                        </button>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Tổng số tín chỉ: {totalSubSpecCredits} TC</span>
                                {/* <div className="w-24 h-2 bg-gray-200 rounded-full dark:bg-zinc-700 overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${Math.min((totalSubSpecCredits / 24) * 100, 100)}%` }}
                                    />
                                </div> */}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-zinc-900/50 border-b border-gray-100 dark:border-zinc-800">
                                        <th className="px-4 py-3 text-left w-10"></th>
                                        <th className="px-4 py-3 text-left w-10"></th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Mã môn</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Tên môn học</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Số tín chỉ</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Học kỳ</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Trạng thái</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 w-24 whitespace-nowrap">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                    {loadingSubSpecCourses ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-fpt-orange" />
                                            </td>
                                        </tr>
                                    ) : subSpecCourses.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-gray-500">
                                                Chưa có môn học nào trong chuyên ngành hẹp này.
                                            </td>
                                        </tr>
                                    ) : (
                                        subSpecCourses.map((course, index) => (
                                            <DraggableCourseRow
                                                key={course.id}
                                                index={index}
                                                course={course}
                                                onRemove={(courseId) => handleRemoveCourse(courseId, 'subspecialization', activeTab)}
                                                onDragStart={setDragIndex}
                                                onDragOver={setDragOverIndex}
                                                onDragEnd={() => handleDragEnd('subspecialization', activeTab)}
                                                isDragging={dragIndex === index}
                                                isSelected={selectedSubSpecCourses.includes(course.id)}
                                                onSelect={(checked) => handleSelectOneSubSpecCourse(course.id, checked)}
                                                onClick={(e) => handleSubSpecCourseRowClick(course, e)}
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Add Button Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-900/30">
                            <button
                                onClick={() => {
                                    setCourseModalTarget({ type: 'subspecialization', id: activeTab });
                                    setIsCourseModalOpen(true);
                                }}
                                className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-fpt-orange hover:text-fpt-orange hover:bg-orange-50/50 transition-all dark:border-zinc-700 dark:hover:border-fpt-orange dark:hover:bg-orange-900/20"
                            >
                                <Plus className="h-4 w-4" />
                                Thêm môn tự chọn cho chuyên ngành hẹp này
                            </button>
                        </div>
                    </div >
                )}

                {
                    subSpecializations.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            Chưa có chuyên ngành hẹp nào. Vui lòng tạo chuyên ngành hẹp trước.
                        </div>
                    )
                }
            </div >

            {/* Course Selection Modal */}
            {
                courseModalTarget && (
                    <CourseSelectionModal
                        isOpen={isCourseModalOpen}
                        onClose={() => setIsCourseModalOpen(false)}
                        onConfirm={handleConfirmSelection}
                        excludeType={courseModalTarget.type}
                        excludeId={courseModalTarget.id}
                    />
                )
            }

            {/* SubSpec CRUD Modal */}
            <SubSpecFormModal
                isOpen={isSubSpecFormOpen}
                onClose={() => setIsSubSpecFormOpen(false)}
                onSuccess={fetchData}
                specializationId={parseInt(id!)}
                subSpec={editingSubSpec}
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
        </AcademicStaffLayout >
    );
};
