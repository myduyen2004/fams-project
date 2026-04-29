import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { useRoleAwareNavigate } from '../../hooks/useRoleAwareNavigate';
import { Upload, Plus, Search, Loader2, ArrowLeft, X } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from "@utils/toast";
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { majorService } from '../../services/api/majorService';
import { specializationService } from '../../services/api/specializationService';
import { StatusFilter, SelectionActionBar, StatusBadge, ImportSpecializationModal } from '../../components/academic-staff';
import { Pagination } from '../../components/common/Pagination';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CustomSelect } from '../../components/common/CustomSelect';
import { Major } from '../../types/major';
import { Specialization } from '../../types/specialization';
import { usePagination } from '../../hooks/usePagination';
// --- Types ---

interface SpecializationCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    majorId: number;
    onSuccess: () => void;
}

interface SpecializationUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    specialization: Specialization;
}

// --- Components ---

const SpecializationCreateModal: React.FC<SpecializationCreateModalProps> = ({ isOpen, onClose, majorId, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);

    const formik = useFormik({
        initialValues: {
            code: '',
            name: '',
            description: ''
        },
        validationSchema: Yup.object({
            code: Yup.string()
                .trim()
                .matches(/^[a-zA-Z0-9-]+$/, 'Mã chuyên ngành chỉ được chứa chữ cái, số và dấu gạch ngang')
                .matches(/[a-zA-Z]/, 'Mã chuyên ngành phải chứa ít nhất một chữ cái')
                .max(20, 'Mã chuyên ngành không được quá 20 ký tự')
                .required('Mã chuyên ngành là bắt buộc'),
            name: Yup.string()
                .trim()
                .matches(/[a-zA-ZÀ-ỹ]/, 'Tên chuyên ngành phải chứa ít nhất một chữ cái')
                .min(5, 'Tên chuyên ngành phải có ít nhất 5 ký tự')
                .max(100, 'Tên chuyên ngành không được quá 100 ký tự')
                .required('Tên chuyên ngành là bắt buộc'),
            description: Yup.string()
                .max(500, 'Mô tả không được quá 500 ký tự')
        }),
        onSubmit: async (values) => {
            setIsLoading(true);
            try {
                await specializationService.createSpecialization({
                    ...values,
                    majorId: majorId,
                    status: 'ACTIVE'
                });
                toast.success('Tạo chuyên ngành thành công');
                onSuccess();
                onClose();
                formik.resetForm();
            } catch (error: any) {
                console.error('Create spec error:', error);
                toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo chuyên ngành');
            } finally {
                setIsLoading(false);
            }
        }
    });

    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-zinc-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tạo chuyên ngành mới</h2>
                    <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
                        <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                <form onSubmit={formik.handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">
                            Mã chuyên ngành <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="code"
                            className={`w-full h-[52px] px-4 rounded-2xl border-2 text-sm transition-all focus:outline-none focus:ring-4 dark:bg-zinc-900 dark:text-white ${formik.touched.code && formik.errors.code ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-100 dark:border-zinc-800 focus:border-fpt-orange focus:ring-fpt-orange/10 hover:border-fpt-orange/40 outline-none text-gray-900'}`}
                            placeholder="VD: SE-SA"
                            value={formik.values.code}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.code && formik.errors.code && (
                            <p className="mt-1 text-xs text-red-500 ml-1">{formik.errors.code}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">
                            Tên chuyên ngành <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            className={`w-full h-[52px] px-4 rounded-2xl border-2 text-sm transition-all focus:outline-none focus:ring-4 dark:bg-zinc-900 dark:text-white ${formik.touched.name && formik.errors.name ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-100 dark:border-zinc-800 focus:border-fpt-orange focus:ring-fpt-orange/10 hover:border-fpt-orange/40 outline-none text-gray-900'}`}
                            placeholder="VD: Software Architecture"
                            value={formik.values.name}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.name && formik.errors.name && (
                            <p className="mt-1 text-xs text-red-500 ml-1">{formik.errors.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">Mô tả</label>
                        <textarea
                            rows={3}
                            name="description"
                            className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 text-sm transition-all focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange hover:border-fpt-orange/40 dark:bg-zinc-900 dark:text-white outline-none text-gray-900"
                            placeholder="Nhập mô tả chuyên ngành..."
                            value={formik.values.description}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        ></textarea>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="h-[44px] px-6 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-sm font-bold text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 h-[44px] px-8 rounded-2xl bg-fpt-orange text-sm font-bold text-white hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : 'Xác nhận'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

const SpecializationUpdateModal: React.FC<SpecializationUpdateModalProps> = ({ isOpen, onClose, onSuccess, specialization }) => {
    const [isLoading, setIsLoading] = useState(false);

    const formik = useFormik({
        initialValues: {
            code: specialization?.code || '',
            name: specialization?.name || '',
            description: specialization?.description || '',
            status: specialization?.status || 'ACTIVE',
            majorId: specialization?.majorId
        },
        enableReinitialize: true,
        validationSchema: Yup.object({
            code: Yup.string()
                .trim()
                .matches(/^[a-zA-Z0-9-]+$/, 'Mã chuyên ngành chỉ được chứa chữ cái, số và dấu gạch ngang')
                .max(20, 'Mã chuyên ngành không được quá 20 ký tự')
                .required('Mã chuyên ngành là bắt buộc'),
            name: Yup.string()
                .trim()
                .min(5, 'Tên chuyên ngành phải có ít nhất 5 ký tự')
                .max(100, 'Tên chuyên ngành không được quá 100 ký tự')
                .required('Tên chuyên ngành là bắt buộc'),
            description: Yup.string()
                .max(500, 'Mô tả không được quá 500 ký tự')
        }),
        onSubmit: async (values) => {
            setIsLoading(true);
            try {
                await specializationService.updateSpecialization(specialization.id, values);
                toast.success('Cập nhật chuyên ngành thành công');
                onSuccess();
                onClose();
            } catch (error: any) {
                console.error('Update spec error:', error);
                toast.error(error.response?.data || error.message || 'Có lỗi xảy ra khi cập nhật');
            } finally {
                setIsLoading(false);
            }
        }
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-zinc-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cập nhật chuyên ngành</h2>
                    <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
                        <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                <form onSubmit={formik.handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">
                            Mã chuyên ngành <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="code"
                            className={`w-full h-[52px] px-4 rounded-2xl border-2 text-sm transition-all focus:outline-none focus:ring-4 dark:bg-zinc-900 dark:text-white ${formik.touched.code && formik.errors.code ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-100 dark:border-zinc-800 focus:border-fpt-orange focus:ring-fpt-orange/10 hover:border-fpt-orange/40 outline-none text-gray-900'}`}
                            value={formik.values.code}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.code && formik.errors.code && (
                            <p className="mt-1 text-xs text-red-500 ml-1">{formik.errors.code}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">
                            Tên chuyên ngành <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            className={`w-full h-[52px] px-4 rounded-2xl border-2 text-sm transition-all focus:outline-none focus:ring-4 dark:bg-zinc-900 dark:text-white ${formik.touched.name && formik.errors.name ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-100 dark:border-zinc-800 focus:border-fpt-orange focus:ring-fpt-orange/10 hover:border-fpt-orange/40 outline-none text-gray-900'}`}
                            value={formik.values.name}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.name && formik.errors.name && (
                            <p className="mt-1 text-xs text-red-500 ml-1">{formik.errors.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">Mô tả</label>
                        <textarea
                            rows={3}
                            name="description"
                            className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 text-sm transition-all focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange hover:border-fpt-orange/40 dark:bg-zinc-900 dark:text-white outline-none text-gray-900"
                            value={formik.values.description}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">Trạng thái <span className="text-red-500">*</span></label>
                        <CustomSelect
                            value={formik.values.status}
                            onChange={(value) => formik.setFieldValue('status', value)}
                            options={[
                                { value: 'ACTIVE', label: 'Đang hoạt động' },
                                { value: 'INACTIVE', label: 'Ngừng hoạt động' }
                            ]}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="h-[44px] px-6 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-sm font-bold text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 h-[44px] px-8 rounded-2xl bg-fpt-orange text-sm font-bold text-white hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

// --- Main Page Component ---

export const MajorDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useRoleAwareNavigate();
    const [major, setMajor] = useState<Major | null>(null);
    const [specializations, setSpecializations] = useState<Specialization[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    const [totalElements, setTotalElements] = useState(0);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Use custom pagination hook - auto resets to page 0 when filters change
    const { page, setPage } = usePagination({ resetDependencies: [debouncedSearchTerm, statusFilter] });

    // Confirm Modal states
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info' as 'info' | 'danger' | 'warning' | 'success',
        onConfirm: () => { },
        confirmLabel: 'Xác nhận'
    });

    const closeConfirmModal = () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchSpecializations = useCallback(async () => {
        if (!id) return;
        try {
            const params = {
                keyword: debouncedSearchTerm,
                status: statusFilter,
                page: page,
                size: 10
            };
            const response = await specializationService.getSpecializationsByMajor(parseInt(id), params);
            setSpecializations(response.content || []);
            setTotalElements(response.totalElements || 0);
        } catch (error) {
            console.error('Failed to fetch specializations:', error);
            toast.error('Không thể tải danh sách chuyên ngành');
        }
    }, [id, debouncedSearchTerm, statusFilter, page]);

    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const majorData = await majorService.getMajor(parseInt(id));
            setMajor(majorData);
            await fetchSpecializations(); // Fetch specializations using the new function
            // setSelectedIds([]);
        } catch (error) {
            console.error('Failed to fetch details:', error);
            toast.error('Không thể tải thông tin chi tiết');
        } finally {
            setLoading(false);
        }
    }, [id, fetchSpecializations]); // Depend on fetchSpecializations

    // Clear selection when filters change
    useEffect(() => {
        setSelectedIds([]);
    }, [debouncedSearchTerm, statusFilter, page, id]);

    // Fetch immediately when depedencies change (search is already debounced)
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(specializations.map(s => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleRowClick = (specialization: Specialization) => {
        navigate(`/academic-staff/specializations/${specialization.id}`);
    };

    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);



    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;

        let confirmMsg = '';
        if (selectedIds.length === 1) {
            const selectedItem = specializations.find(s => s.id === selectedIds[0]);
            confirmMsg = `Bạn có chắc chắn muốn xóa chuyên ngành "${selectedItem?.name}"?\nHành động này không thể hoàn tác.`;
        } else {
            confirmMsg = `Bạn có chắc chắn muốn xóa ${selectedIds.length} chuyên ngành đã chọn?\nHành động này không thể hoàn tác.`;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Xóa chuyên ngành',
            message: confirmMsg,
            type: 'danger',
            confirmLabel: 'Xóa',
            onConfirm: async () => {
                try {
                    setIsDeleting(true);
                    await Promise.all(selectedIds.map(id => specializationService.deleteSpecialization(id)));
                    toast.success('Xóa chuyên ngành thành công');
                    setSelectedIds([]);
                    fetchSpecializations();
                    closeConfirmModal();
                } catch (error: any) {
                    console.error('Delete error:', error);
                    toast.error(error.response?.data || error.message || 'Có lỗi xảy ra khi xóa');
                    closeConfirmModal();
                } finally {
                    setIsDeleting(false);
                }
            }
        });
    };

    const handleBulkStatusChange = (newStatus: 'ACTIVE' | 'INACTIVE') => {
        if (selectedIds.length === 0) return;

        const confirmTitle = newStatus === 'ACTIVE' ? 'Mở lại chuyên ngành' : 'Ngừng đào tạo chuyên ngành';
        const type = newStatus === 'ACTIVE' ? 'success' : 'danger';
        const confirmLabel = newStatus === 'ACTIVE' ? 'Mở lại' : 'Ngừng đào tạo';

        let confirmMsg = '';
        if (selectedIds.length === 1) {
            const selectedItem = specializations.find(s => s.id === selectedIds[0]);
            confirmMsg = newStatus === 'ACTIVE'
                ? `Bạn có chắc chắn muốn mở lại chuyên ngành "${selectedItem?.name}"?\n Tất cả chuyên ngành hẹp trong chuyên ngành này cũng sẽ được mở lại.`
                : `Bạn có chắc chắn muốn ngừng đào tạo chuyên ngành "${selectedItem?.name}"?\n Tất cả chuyên ngành hẹp trong chuyên ngành này cũng sẽ bị ngừng đào tạo.`;
        } else {
            confirmMsg = newStatus === 'ACTIVE'
                ? `Bạn có chắc chắn muốn mở lại ${selectedIds.length} chuyên ngành đã chọn?\n Tất cả chuyên ngành hẹp trong các chuyên ngành này cũng sẽ được mở lại.`
                : `Bạn có chắc chắn muốn ngừng đào tạo ${selectedIds.length} chuyên ngành đã chọn?\n Tất cả chuyên ngành hẹp trong các chuyên ngành này cũng sẽ bị ngừng đào tạo.`;
        }

        setConfirmModal({
            isOpen: true,
            title: confirmTitle,
            message: confirmMsg,
            type: type as any,
            confirmLabel: confirmLabel,
            onConfirm: async () => {
                try {
                    await Promise.all(selectedIds.map(id => specializationService.updateStatus(id, newStatus)));
                    toast.success('Cập nhật trạng thái thành công');
                    setSelectedIds([]);
                    fetchData();
                    closeConfirmModal();
                } catch (error) {
                    console.error('Bulk update error:', error);
                    toast.error('Có lỗi xảy ra khi cập nhật trạng thái');
                    closeConfirmModal();
                }
            }
        });
    };

    if (!major && loading) {
        return (
            <AcademicStaffLayout pageTitle="Chi tiết ngành">
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-fpt-orange" />
                </div>
            </AcademicStaffLayout>
        );
    }

    return (
        <AcademicStaffLayout pageTitle="Quản lý chuyên ngành">
            <div className="space-y-6">
                {/* Header & Filter Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-8 shadow-sm mb-6 animate-in fade-in duration-500">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                        <div>
                            <button
                                onClick={() => navigate('/academic-staff/majors')}
                                className="flex items-center gap-2 text-sm text-gray-500 hover:text-fpt-orange mb-3 transition-colors group"
                            >
                                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                                Quay lại danh sách ngành
                            </button>
                            <div className="flex items-center gap-4">
                                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{major?.name}</h1>
                                {major && (
                                    <StatusBadge status={major.status} />
                                )}
                            </div>
                            {major && (
                                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                        Mã ngành: <span className="text-gray-900 dark:text-white font-bold">{major.code}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                        Thời gian đào tạo: <span className="text-gray-900 dark:text-white font-bold">{major.programDuration}</span>
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex h-[52px] items-center gap-2 rounded-2xl border-2 border-fpt-orange/20 bg-orange-50 dark:bg-orange-900/10 px-6 text-sm font-bold text-fpt-orange hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:border-fpt-orange/40 transition-all shadow-sm active:scale-95"
                            >
                                <Upload className="h-[18px] w-[18px]" />
                                Import chuyên ngành
                            </button>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex h-[52px] items-center gap-2 rounded-2xl bg-fpt-orange px-8 text-sm font-bold text-white hover:bg-orange-600 transition-all shadow-lg shadow-fpt-orange/20 active:scale-95"
                            >
                                <Plus className="h-[18px] w-[18px]" strokeWidth={3} />
                                Tạo chuyên ngành
                            </button>
                        </div>
                    </div>

                    {major?.description && (
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl p-5 mb-8">
                            <p className="text-sm text-blue-800/80 dark:text-blue-300/80 leading-relaxed italic">
                                &ldquo;{major.description}&rdquo;
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                            <div className="flex-1 md:max-w-lg">
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 ml-1">
                                    Tìm kiếm
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm chuyên ngành..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setPage(0);
                                        }}
                                        className="w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <StatusFilter
                                value={statusFilter}
                                onChange={(value) => {
                                    setStatusFilter(value);
                                    setPage(0);
                                }}
                                isOpen={isFilterOpen}
                                onToggle={() => setIsFilterOpen(!isFilterOpen)}
                                inactiveLabel="Ngừng đào tạo"
                            />
                        </div>

                    </div>
                </div>

                <SelectionActionBar
                    selectedCount={selectedIds.length}
                    showDeactivate={selectedIds.some(id => specializations.find(s => s.id === id)?.status === 'ACTIVE')}
                    onUpdate={() => setIsUpdateModalOpen(true)}
                    onDelete={handleBulkDelete}
                    onStatusChange={handleBulkStatusChange}
                    canDelete={selectedIds.every(id => {
                        const item = specializations.find(s => s.id === id);
                        return item?.status === 'INACTIVE' && item?.canDelete;
                    })}
                    isDeleting={isDeleting}
                    itemLabel="chuyên ngành"
                    activateLabel="Mở lại"
                    deactivateLabel="Ngừng đào tạo"
                />

                {/* Table Block */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden animate-in fade-in duration-700">
                    <div className="p-0"> {/* Removed padding to have table flush with edges */}


                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-fpt-orange text-white">
                                        <th className="w-12 px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-white/20 text-white focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                                                onChange={handleSelectAll}
                                                checked={specializations.length > 0 && selectedIds.length === specializations.length}
                                            />
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Mã chuyên ngành</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">Tên chuyên ngành</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Tổng số tín chỉ</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                    {loading && specializations.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-fpt-orange" />
                                            </td>
                                        </tr>
                                    ) : specializations.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-500">
                                                Chưa có chuyên ngành nào
                                            </td>
                                        </tr>
                                    ) : (
                                        specializations.map((spec) => (
                                            <tr
                                                key={spec.id}
                                                className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${selectedIds.includes(spec.id) ? 'bg-orange-50 dark:bg-orange-900/20' : ''} ${loading ? 'opacity-50' : ''}`}
                                                onClick={() => handleRowClick(spec)}
                                            >
                                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange dark:border-zinc-600 dark:bg-zinc-700 cursor-pointer"
                                                        checked={selectedIds.includes(spec.id)}
                                                        onChange={() => handleSelectOne(spec.id)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 font-medium font-semibold text-gray-900">
                                                    {spec.code}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 dark:text-zinc-400">
                                                    {spec.name}
                                                </td>
                                                <td className="px-6 py-4 text-center text-gray-600 dark:text-zinc-400">
                                                    {spec.totalCredits || 0}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <StatusBadge status={spec.status} variant="table" />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-8 pb-8">
                            <Pagination
                                currentPage={page}
                                totalPages={Math.ceil(totalElements / 10)}
                                totalElements={totalElements}
                                pageSize={10}
                                onPageChange={setPage}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {id && (
                <SpecializationCreateModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    majorId={parseInt(id)}
                    onSuccess={fetchSpecializations}
                />
            )}

            {selectedIds.length === 1 && (
                <SpecializationUpdateModal
                    isOpen={isUpdateModalOpen}
                    onClose={() => setIsUpdateModalOpen(false)}
                    onSuccess={fetchSpecializations}
                    specialization={specializations.find(s => s.id === selectedIds[0])!}
                />
            )}

            <ImportSpecializationModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                majorId={parseInt(id!)}
                onSuccess={fetchSpecializations}
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

export default MajorDetail;

