import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, Plus, Search, Filter, Loader2, ArrowLeft, X, Pencil, Trash2 } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { majorService } from '../../services/api/majorService';
import { specializationService } from '../../services/api/specializationService';
import toast from 'react-hot-toast';
import { StatusBadge, StatusFilter, Pagination, SelectionActionBar } from '../../components/academic-staff';

export const MajorDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [major, setMajor] = useState(null);
    const [specializations, setSpecializations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [selectedIds, setSelectedIds] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    const [page, setPage] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchSpecializations = useCallback(async () => {
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
        try {
            setLoading(true);
            const majorData = await majorService.getMajor(parseInt(id));
            setMajor(majorData);
            await fetchSpecializations(); // Fetch specializations using the new function
            setSelectedIds([]);
        } catch (error) {
            console.error('Failed to fetch details:', error);
            toast.error('Không thể tải thông tin chi tiết');
        } finally {
            setLoading(false);
        }
    }, [id, fetchSpecializations]); // Depend on fetchSpecializations

    // Fetch immediately when depedencies change (search is already debounced)
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(specializations.map(s => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // ... (existing debounce) ...

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} chuyên ngành đã chọn? hành động này không thể hoàn tác.`)) return;

        try {
            setIsDeleting(true);
            await Promise.all(selectedIds.map(id => specializationService.deleteSpecialization(id)));
            toast.success('Xóa chuyên ngành thành công');
            setSelectedIds([]);
            fetchSpecializations();
        } catch (error) {
            console.error('Delete error:', error);
            // toast.error('Không thể xóa chuyên ngành (có thể đang có sinh viên theo học)');
            // Using error from backend if available
            toast.error(error.response?.data || error.message || 'Có lỗi xảy ra khi xóa');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkStatusChange = async (newStatus) => {
        if (selectedIds.length === 0) return;

        const confirmMsg = newStatus === 'ACTIVE'
            ? `Bạn có chắc chắn muốn mở lại ${selectedIds.length} chuyên ngành đã chọn?`
            : `Bạn có chắc chắn muốn ngừng đào tạo ${selectedIds.length} chuyên ngành đã chọn?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            await Promise.all(selectedIds.map(id => specializationService.updateStatus(id, newStatus)));
            toast.success('Cập nhật trạng thái thành công');
            fetchData();
        } catch (error) {
            console.error('Bulk update error:', error);
            toast.error('Có lỗi xảy ra khi cập nhật trạng thái');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ACTIVE':
                return <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">Đang mở</span>;
            case 'INACTIVE':
                return <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">Ngừng đào tạo</span>;
            default:
                return <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400">{status}</span>;
        }
    };

    const getTableStatusBadge = (status) => {
        switch (status) {
            case 'ACTIVE':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-900/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Đang mở
                    </span>
                );
            case 'INACTIVE':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Ngừng đào tạo
                    </span>
                );
            default:
                return <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-400">{status}</span>;
        }
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
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <button
                                onClick={() => navigate('/academic-staff/majors')}
                                className="flex items-center gap-2 text-sm text-gray-500 hover:text-fpt-orange mb-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Quay lại danh sách
                            </button>
                            <div className="flex items-center gap-4">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{major?.name}</h1>
                                {major && getStatusBadge(major.status)}
                            </div>
                            {major && (
                                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-2xl flex flex-col gap-1">
                                    <span className="font-medium">Thời gian đào tạo: {major.programDuration}</span>
                                    <span className="font-medium">Mô tả: {major.description}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                className="flex items-center gap-2 rounded-lg border border-fpt-orange bg-orange-50 px-4 py-2 text-sm font-medium text-fpt-orange hover:bg-orange-100"
                            >
                                <Upload className="h-4 w-4" />
                                Import danh sách chuyên ngành
                            </button>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-2 rounded-lg bg-fpt-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                            >
                                <Plus className="h-4 w-4" />
                                Tạo chuyên ngành
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
                                        placeholder="Tìm kiếm..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-fpt-orange focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                    />
                                </div>

                                <StatusFilter
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    isOpen={isFilterOpen}
                                    onToggle={() => setIsFilterOpen(!isFilterOpen)}
                                />
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
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-fpt-orange text-white">
                                        <th className="px-6 py-3 text-left rounded-tl-lg">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-white/20 text-white focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                                                onChange={handleSelectAll}
                                                checked={specializations.length > 0 && selectedIds.length === specializations.length}
                                            />
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Mã chuyên ngành</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tên chuyên ngành</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tổng số tín chỉ</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Thời gian đào tạo</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                    {loading && (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-fpt-orange" />
                                            </td>
                                        </tr>
                                    )}

                                    {!loading && specializations.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-gray-500">
                                                Chưa có chuyên ngành nào
                                            </td>
                                        </tr>
                                    )}

                                    {!loading && specializations.map((spec) => (
                                        <tr
                                            key={spec.id}
                                            className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors ${selectedIds.includes(spec.id) ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange dark:border-zinc-600 dark:bg-zinc-700 cursor-pointer"
                                                    checked={selectedIds.includes(spec.id)}
                                                    onChange={() => handleSelectOne(spec.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                {spec.code}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-zinc-400">
                                                {spec.name}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-zinc-400">
                                                {spec.totalCredits || 0}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-zinc-400">
                                                {major?.programDuration || '9 kì'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getTableStatusBadge(spec.status)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <Pagination
                            page={page}
                            totalElements={totalElements}
                            pageSize={10}
                            onPageChange={setPage}
                            itemLabel="chuyên ngành"
                        />
                    </div>

                    <SpecializationCreateModal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        majorId={parseInt(id)}
                        onSuccess={fetchSpecializations}
                    />

                    {selectedIds.length === 1 && (
                        <SpecializationUpdateModal
                            isOpen={isUpdateModalOpen}
                            onClose={() => setIsUpdateModalOpen(false)}
                            onSuccess={fetchSpecializations}
                            specialization={specializations.find(s => s.id === selectedIds[0])}
                        />
                    )}
                </div>
            </div>
        </AcademicStaffLayout>
    );
};

const SpecializationCreateModal = ({ isOpen, onClose, majorId, onSuccess }) => {
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
                await specializationService.createSpecialization({
                    ...values,
                    majorId: majorId,
                    status: 'ACTIVE'
                });
                toast.success('Tạo chuyên ngành thành công');
                onSuccess();
                onClose();
                formik.resetForm();
            } catch (error) {
                console.error('Create spec error:', error);
                toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo chuyên ngành');
            } finally {
                setIsLoading(false);
            }
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tạo chuyên ngành mới</h2>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5 text-gray-500 dark:text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={formik.handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Mã chuyên ngành <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="code"
                            className={`w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:text-white ${formik.touched.code && formik.errors.code ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-fpt-orange focus:ring-fpt-orange dark:border-zinc-700'}`}
                            placeholder="VD: SE-SA"
                            value={formik.values.code}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.code && formik.errors.code && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.code}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Tên chuyên ngành <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="name"
                            className={`w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:text-white ${formik.touched.name && formik.errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-fpt-orange focus:ring-fpt-orange dark:border-zinc-700'}`}
                            placeholder="VD: Software Architecture"
                            value={formik.values.name}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.name && formik.errors.name && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Mô tả</label>
                        <textarea
                            rows="3"
                            name="description"
                            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-fpt-orange focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
                            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center justify-center rounded-lg bg-fpt-orange px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:opacity-50"
                        >
                            {isLoading ? 'Đang xử lý...' : 'Tạo chuyên ngành'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SpecializationUpdateModal = ({ isOpen, onClose, onSuccess, specialization }) => {
    const [isLoading, setIsLoading] = useState(false);

    const formik = useFormik({
        initialValues: {
            code: specialization?.code || '',
            name: specialization?.name || '',
            description: specialization?.description || ''
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
                await specializationService.updateSpecialization(specialization.id, {
                    ...values,
                    // keep status as is or pass active? API ignores status in update usually unless explicit. 
                    // My backend updateSpecialization logic checks status too.
                    status: specialization.status
                });
                toast.success('Cập nhật chuyên ngành thành công');
                onSuccess();
                onClose();
            } catch (error) {
                console.error('Update spec error:', error);
                toast.error(error.response?.data || error.message || 'Có lỗi xảy ra khi cập nhật');
            } finally {
                setIsLoading(false);
            }
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cập nhật chuyên ngành</h2>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5 text-gray-500 dark:text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={formik.handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Mã chuyên ngành <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="code"
                            className={`w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:text-white ${formik.touched.code && formik.errors.code ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-fpt-orange focus:ring-fpt-orange dark:border-zinc-700'}`}
                            value={formik.values.code}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.code && formik.errors.code && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.code}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Tên chuyên ngành <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="name"
                            className={`w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:text-white ${formik.touched.name && formik.errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-fpt-orange focus:ring-fpt-orange dark:border-zinc-700'}`}
                            value={formik.values.name}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.name && formik.errors.name && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Mô tả</label>
                        <textarea
                            rows="3"
                            name="description"
                            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-fpt-orange focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
                            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center justify-center rounded-lg bg-fpt-orange px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:opacity-50"
                        >
                            {isLoading ? 'Cập nhật' : 'Cập nhật'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
