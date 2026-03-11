import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Upload, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { courseService } from '../../services/api/courseService';
import { StatusFilter, Pagination, SelectionActionBar } from '../../components/academic-staff';
import { CourseFormModal } from '../../components/academic-staff/CourseFormModal';
import { ImportCourseModal } from '../../components/academic-staff/ImportCourseModal';
import { ImportGradeComponentModal } from '../../components/academic-staff/ImportGradeComponentModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Course } from '../../types/course';
import { usePagination } from '../../hooks/usePagination';

export const CourseManagement: React.FC = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalElements, setTotalElements] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Use custom pagination hook - auto resets to page 0 when filters change
    const { page, setPage } = usePagination({ resetDependencies: [status, searchTerm] });

    // Modals
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isImportGradeComponentOpen, setIsImportGradeComponentOpen] = useState(false);

    // Selection
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
            const result = await courseService.getCourses({
                keyword: searchTerm || undefined,
                status: status,
                page,
                size: 10
            });
            setCourses(result.content);
            setTotalElements(result.totalElements);
        } catch (error) {
            console.error('Failed to fetch:', error);
            toast.error('Không thể tải danh sách môn học');
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

    const handleEdit = (course: Course) => {
        setEditingCourse(course);
        setIsFormOpen(true);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(courses.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    // State for range selection
    const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);

    const handleSelectOne = (id: number, e: React.MouseEvent) => {
        // Handle shift+click for range selection
        if (e.shiftKey && lastSelectedId !== null) {
            const currentIndex = courses.findIndex(c => c.id === id);
            const lastIndex = courses.findIndex(c => c.id === lastSelectedId);

            if (currentIndex !== -1 && lastIndex !== -1) {
                const start = Math.min(currentIndex, lastIndex);
                const end = Math.max(currentIndex, lastIndex);
                const rangeIds = courses.slice(start, end + 1).map(c => c.id);
                const newSelected = Array.from(new Set([...selectedIds, ...rangeIds]));
                setSelectedIds(newSelected);
            }
        } else {
            // Toggle single selection
            if (selectedIds.includes(id)) {
                setSelectedIds(selectedIds.filter(itemId => itemId !== id));
            } else {
                setSelectedIds([...selectedIds, id]);
            }
        }
        setLastSelectedId(id);
    };

    const handleRowClick = (course: Course) => {
        // Navigate to grade configuration page
        navigate(`/academic-staff/courses/${course.id}/grades`);
    };

    const handleBulkStatusChange = (newStatus: 'ACTIVE' | 'INACTIVE') => {
        if (selectedIds.length === 0) return;

        const confirmTitle = newStatus === 'ACTIVE' ? 'Kích hoạt môn học' : 'Ngừng đào tạo môn học';
        const type = newStatus === 'ACTIVE' ? 'success' : 'danger';
        const confirmLabel = newStatus === 'ACTIVE' ? 'Kích hoạt' : 'Ngừng đào tạo';

        let confirmMsg = '';
        if (selectedIds.length === 1) {
            const selectedItem = courses.find(c => c.id === selectedIds[0]);
            confirmMsg = newStatus === 'ACTIVE'
                ? `Bạn có chắc chắn muốn kích hoạt môn "${selectedItem?.name}"?`
                : `Bạn có chắc chắn muốn ngừng đào tạo môn "${selectedItem?.name}"?`;
        } else {
            confirmMsg = newStatus === 'ACTIVE'
                ? `Bạn có chắc chắn muốn kích hoạt ${selectedIds.length} môn đã chọn?`
                : `Bạn có chắc chắn muốn ngừng đào tạo ${selectedIds.length} môn đã chọn?`;
        }

        setConfirmModal({
            isOpen: true,
            title: confirmTitle,
            message: confirmMsg,
            type: type as any,
            confirmLabel: confirmLabel,
            onConfirm: async () => {
                try {
                    await Promise.all(selectedIds.map(id => courseService.updateStatus(id, newStatus)));
                    toast.success('Cập nhật trạng thái thành công');
                    setSelectedIds([]); // Clear selection after status change
                    await fetchData();
                    closeConfirmModal();
                } catch (error) {
                    console.error('Bulk update error:', error);
                    toast.error('Có lỗi xảy ra khi cập nhật trạng thái');
                    closeConfirmModal();
                }
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;

        // Check if all selected items can be deleted
        const allCanDelete = selectedIds.every(id => {
            const item = courses.find(c => c.id === id);
            return item?.canDelete !== false; // Default to true if undefined
        });

        if (!allCanDelete) {
            toast.error('Không thể xóa một số môn học vì đang có sinh viên theo học hoặc đang được sử dụng trong chương trình đào tạo');
            return;
        }

        let confirmMsg = '';
        if (selectedIds.length === 1) {
            const selectedItem = courses.find(c => c.id === selectedIds[0]);
            confirmMsg = `Bạn có chắc chắn muốn xóa môn "${selectedItem?.name}"? Hành động này không thể hoàn tác.`;
        } else {
            confirmMsg = `Bạn có chắc chắn muốn xóa ${selectedIds.length} môn đã chọn? Hành động này không thể hoàn tác.`;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Xóa môn học',
            message: confirmMsg,
            type: 'danger',
            confirmLabel: 'Xóa',
            onConfirm: async () => {
                try {
                    await Promise.all(selectedIds.map(id => courseService.deleteCourse(id)));
                    toast.success('Xóa môn học thành công');
                    setSelectedIds([]); // Clear selection after successful delete
                    await fetchData();
                    closeConfirmModal();
                } catch (error: any) {
                    toast.error(error.response?.data?.message || 'Không thể xóa một số môn học');
                    closeConfirmModal();
                }
            }
        });
    };

    return (
        <AcademicStaffLayout pageTitle="Quản lý Môn học">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý Môn học</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                            Quản lý tất cả môn học trong hệ thống
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsImportOpen(true)}
                            className="flex items-center gap-2 rounded-lg border border-fpt-orange bg-orange-50 px-4 py-2 text-sm font-medium text-fpt-orange hover:bg-orange-100"
                        >
                            <Upload className="h-4 w-4" />
                            Import môn học
                        </button>
                        <button
                            onClick={() => setIsImportGradeComponentOpen(true)}
                            className="flex items-center gap-2 rounded-lg border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
                        >
                            <Layers className="h-4 w-4" />
                            Import thành phần điểm
                        </button>
                        <button
                            onClick={() => { setEditingCourse(null); setIsFormOpen(true); }}
                            className="flex items-center gap-2 rounded-lg bg-fpt-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                        >
                            <Plus className="h-4 w-4" />
                            Tạo môn học
                        </button>
                    </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mb-4 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo mã hoặc tên môn học..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-fpt-orange focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                />
                            </div>
                            <StatusFilter
                                value={status}
                                onChange={(v) => { setStatus(v); setPage(0); }}
                                isOpen={isFilterOpen}
                                onToggle={() => setIsFilterOpen(prev => !prev)}
                                inactiveLabel="Ngừng đào tạo"
                            />
                        </div>

                        <SelectionActionBar
                            selectedCount={selectedIds.length}
                            showDeactivate={showDeactivate}
                            onUpdate={() => handleEdit(courses.find(c => c.id === selectedIds[0])!)}
                            onDelete={handleBulkDelete}
                            onStatusChange={handleBulkStatusChange}
                            canDelete={selectedIds.every(id => {
                                const item = courses.find(c => c.id === id);
                                return item?.canDelete !== false;
                            })}
                            itemLabel="môn học"
                            activateLabel="Kích hoạt"
                            deactivateLabel="Ngừng đào tạo"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed">
                            <thead>
                                <tr className="bg-fpt-orange text-white">
                                    <th className="w-12 px-4 py-3 text-left rounded-tl-lg">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-white/20 text-white focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                                            onChange={handleSelectAll}
                                            checked={courses.length > 0 && selectedIds.length === courses.length}
                                        />
                                    </th>
                                    <th className="w-28 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Mã môn</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Tên môn học</th>
                                    <th className="w-28 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Số tín chỉ</th>
                                    <th className="w-36 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Tổng trọng số</th>
                                    <th className="w-28 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Tính GPA</th>
                                    <th className="w-40 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg whitespace-nowrap">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {loading && courses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-gray-400">
                                            <div className="flex justify-center mb-2">
                                                <svg className="h-8 w-8 animate-spin text-fpt-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            </div>
                                            Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                ) : courses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-gray-400">
                                            Không có dữ liệu môn học
                                        </td>
                                    </tr>
                                ) : (
                                    courses.map((course) => (
                                        <tr
                                            key={course.id}
                                            className={`border-b transition-colors cursor-pointer ${selectedIds.includes(course.id) ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50'} dark:border-zinc-800 ${loading ? 'opacity-50' : ''}`}
                                            onClick={() => handleRowClick(course)}
                                        >
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange dark:border-zinc-600 dark:bg-zinc-700 cursor-pointer"
                                                    checked={selectedIds.includes(course.id)}
                                                    onClick={(e) => handleSelectOne(course.id, e)}
                                                    onChange={() => { }} // controlled by onClick
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center font-medium font-semibold text-gray-900 dark:text-white truncate" title={course.code}>{course.code}</td>
                                            <td className="px-4 py-3 text-left text-gray-600 dark:text-zinc-400 truncate" title={course.name}>{course.name}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {course.credits} TC
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {course.totalWeight !== undefined && (
                                                    <span className={`text-sm font-semibold ${Math.abs(course.totalWeight - 100) < 0.01 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                        {course.totalWeight}%
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const newStatus = !course.isCalculatedInGpa;
                                                                await courseService.updateGpaStatus(course.id, newStatus);
                                                                toast.success(`Đã ${newStatus ? 'bật' : 'tắt'} tính GPA cho môn ${course.code}`);
                                                                fetchData();
                                                            } catch (error) {
                                                                toast.error('Không thể cập nhật trạng thái GPA');
                                                            }
                                                        }}
                                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange focus-visible:ring-offset-2 ${course.isCalculatedInGpa ? 'bg-fpt-orange shadow-[0_0_10px_rgba(242,113,37,0.3)]' : 'bg-gray-200 dark:bg-zinc-700'}`}
                                                        title={course.isCalculatedInGpa ? 'Đang tính GPA' : 'Không tính GPA'}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${course.isCalculatedInGpa ? 'translate-x-4' : 'translate-x-0'}`}
                                                        />
                                                    </button>
                                                    <span className={`text-[10px] font-bold w-6 text-left ${course.isCalculatedInGpa ? 'text-fpt-orange' : 'text-gray-400 dark:text-zinc-500'}`}>
                                                        {course.isCalculatedInGpa ? 'ON' : 'OFF'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {course.status === 'ACTIVE' ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-900/30">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                        Đang mở
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                        Ngừng đào tạo
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={page} totalElements={totalElements} pageSize={10} onPageChange={setPage} itemLabel="môn học" />
                </div>
            </div>

            {/* Course Form Modal */}
            <CourseFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchData}
                course={editingCourse}
            />

            {/* Import Modal */}
            <ImportCourseModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={fetchData}
            />

            {/* Import Grade Component Modal */}
            <ImportGradeComponentModal
                isOpen={isImportGradeComponentOpen}
                onClose={() => setIsImportGradeComponentOpen(false)}
                onSuccess={fetchData}
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
