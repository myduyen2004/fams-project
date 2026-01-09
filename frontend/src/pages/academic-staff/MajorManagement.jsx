import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Search, Eye, X, Trash2, Pencil } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { majorService } from '../../services/api/majorService';
import { StatusBadge, StatusFilter, Pagination, SelectionActionBar } from '../../components/academic-staff';


const MajorTable = ({ majors = [] }) => {
    const getStatusBadge = (status) => {
        switch (status) {
            case 'ACTIVE':
                return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">Đang mở</span>;
            case 'INACTIVE':
                return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">Ngừng đào tạo</span>;
            default:
                return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">Đang mở</span>;
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-zinc-400">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <tr>
                        <th className="px-6 py-3">
                            <input type="checkbox" className="rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange dark:border-zinc-600 dark:bg-zinc-700" />
                        </th>
                        <th className="px-6 py-3">Mã ngành</th>
                        <th className="px-6 py-3">Tên ngành</th>
                        <th className="px-6 py-3">Thời gian đào tạo</th>
                        <th className="px-6 py-3">Trạng thái</th>
                        <th className="px-6 py-3">Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {majors.map((major) => (
                        <tr key={major.id} className="border-b bg-white hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50">
                            <td className="px-6 py-4">
                                <input type="checkbox" className="rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange dark:border-zinc-600 dark:bg-zinc-700" />
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{major.code}</td>
                            <td className="px-6 py-4">{major.name}</td>
                            <td className="px-6 py-4">{major.programDuration}</td>
                            <td className="px-6 py-4">{getStatusBadge(major.status)}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <button className="text-gray-500 hover:text-fpt-orange dark:text-zinc-400 dark:hover:text-fpt-orange">
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {majors.length === 0 && (
                <div className="py-10 text-center text-gray-500 dark:text-zinc-400">
                    Chưa có dữ liệu
                </div>
            )}
        </div>
    );
};

const MajorCreateModal = ({ isOpen, onClose, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);

    const validationSchema = Yup.object({
        code: Yup.string()
            .trim()
            .matches(/^[a-zA-Z0-9-]+$/, 'Mã ngành chỉ được chứa chữ cái, số và dấu gạch ngang')
            .max(20, 'Mã ngành không được quá 20 ký tự')
            .required('Mã ngành là bắt buộc'),
        name: Yup.string()
            .trim()
            .min(5, 'Tên ngành phải có ít nhất 5 ký tự')
            .max(100, 'Tên ngành không được quá 100 ký tự')
            .required('Tên ngành là bắt buộc'),
        programDuration: Yup.string().required('Thời gian đào tạo là bắt buộc'),
        description: Yup.string()
            .max(500, 'Mô tả không được quá 500 ký tự')
    });

    const formik = useFormik({
        initialValues: {
            code: '',
            name: '',
            programDuration: '',
            description: ''
        },
        validationSchema,
        onSubmit: async (values) => {
            setIsLoading(true);
            try {
                await majorService.createMajor(values);
                toast.success('Tạo ngành thành công');
                onSuccess();
                onClose();
                formik.resetForm();
            } catch (error) {
                console.error('Create major error:', error);
                toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo ngành');
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
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tạo ngành mới</h2>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5 text-gray-500 dark:text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={formik.handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Mã ngành <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="code"
                            className={`w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:text-white ${formik.touched.code && formik.errors.code ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-fpt-orange focus:ring-fpt-orange dark:border-zinc-700'}`}
                            placeholder="VD: SE, IA..."
                            value={formik.values.code}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.code && formik.errors.code && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.code}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Tên ngành <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="name"
                            className={`w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:text-white ${formik.touched.name && formik.errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-fpt-orange focus:ring-fpt-orange dark:border-zinc-700'}`}
                            placeholder="VD: Kỹ thuật phần mềm"
                            value={formik.values.name}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.name && formik.errors.name && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Thời gian đào tạo <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="programDuration"
                            className={`w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:text-white ${formik.touched.programDuration && formik.errors.programDuration ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-fpt-orange focus:ring-fpt-orange dark:border-zinc-700'}`}
                            placeholder="VD: 9 kì"
                            value={formik.values.programDuration}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.programDuration && formik.errors.programDuration && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.programDuration}</p>
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
                            {isLoading ? 'Đang xử lý...' : 'Tạo ngành'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const MajorUpdateModal = ({ isOpen, onClose, onSuccess, major }) => {
    const [isLoading, setIsLoading] = useState(false);

    const validationSchema = Yup.object({
        code: Yup.string()
            .trim()
            .matches(/^[a-zA-Z0-9-]+$/, 'Mã ngành chỉ được chứa chữ cái, số và dấu gạch ngang')
            .max(20, 'Mã ngành không được quá 20 ký tự')
            .required('Mã ngành là bắt buộc'),
        name: Yup.string()
            .trim()
            .min(5, 'Tên ngành phải có ít nhất 5 ký tự')
            .max(100, 'Tên ngành không được quá 100 ký tự')
            .required('Tên ngành là bắt buộc'),
        programDuration: Yup.string().required('Thời gian đào tạo là bắt buộc'),
        description: Yup.string()
            .max(500, 'Mô tả không được quá 500 ký tự')
    });

    const formik = useFormik({
        initialValues: {
            code: major?.code || '',
            name: major?.name || '',
            programDuration: major?.programDuration || '',
            description: major?.description || ''
        },
        enableReinitialize: true,
        validationSchema,
        onSubmit: async (values) => {
            setIsLoading(true);
            try {
                await majorService.updateMajor(major.id, values);
                toast.success('Cập nhật ngành thành công');
                onSuccess();
                onClose();
            } catch (error) {
                console.error('Update major error:', error);
                toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật ngành');
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
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cập nhật thông tin ngành</h2>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5 text-gray-500 dark:text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={formik.handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Mã ngành <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="code"
                            className={`w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:text-white ${formik.touched.code && formik.errors.code ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-fpt-orange focus:ring-fpt-orange dark:border-zinc-700'}`}
                            placeholder="VD: SE, IA..."
                            value={formik.values.code}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.code && formik.errors.code && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.code}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Tên ngành <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="name"
                            className={`w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:text-white ${formik.touched.name && formik.errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-fpt-orange focus:ring-fpt-orange dark:border-zinc-700'}`}
                            placeholder="VD: Kỹ thuật phần mềm"
                            value={formik.values.name}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.name && formik.errors.name && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Thời gian đào tạo <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="programDuration"
                            className={`w-full rounded-lg border p-2.5 text-sm dark:bg-zinc-800 dark:text-white ${formik.touched.programDuration && formik.errors.programDuration ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-fpt-orange focus:ring-fpt-orange dark:border-zinc-700'}`}
                            placeholder="VD: 9 kì"
                            value={formik.values.programDuration}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                        />
                        {formik.touched.programDuration && formik.errors.programDuration && (
                            <p className="mt-1 text-xs text-red-500">{formik.errors.programDuration}</p>
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
                            {isLoading ? 'Đang xử lý...' : 'Cập nhật'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Main Page Component ---

export const MajorManagement = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [page, setPage] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchMajors = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                keyword: debouncedSearchTerm,
                status: statusFilter, // Removed generic ALL check, strictly use validation
                page: page,
                size: 10
            };
            const response = await majorService.getMajors(params);
            setData(response.content || []);
            setTotalElements(response.totalElements || 0);
            setSelectedIds([]); // Reset selection on fetch
        } catch (error) {
            console.error('Failed to fetch majors:', error);
            toast.error('Không thể tải danh sách ngành');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchTerm, statusFilter, page]);

    useEffect(() => {
        fetchMajors();
    }, [fetchMajors]);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(data.map(m => m.id));
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

    const handleBulkStatusChange = async (newStatus) => {
        if (selectedIds.length === 0) return;

        const confirmMsg = newStatus === 'ACTIVE'
            ? `Bạn có chắc chắn muốn mở lại ${selectedIds.length} ngành đã chọn?`
            : `Bạn có chắc chắn muốn ngừng đào tạo ${selectedIds.length} ngành đã chọn?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            await Promise.all(selectedIds.map(id => majorService.updateStatus(id, newStatus)));
            toast.success('Cập nhật trạng thái thành công');
            fetchMajors();
        } catch (error) {
            console.error('Bulk update error:', error);
            toast.error('Có lỗi xảy ra khi cập nhật trạng thái');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} ngành đã chọn? Hành động này không thể hoàn tác.`)) return;

        try {
            await Promise.all(selectedIds.map(id => majorService.deleteMajor(id)));
            toast.success('Xóa ngành thành công');
            setSelectedIds([]);
            fetchMajors();
        } catch (error) {
            console.error('Bulk delete error:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa ngành');
        }
    };

    const activeMajorIds = selectedIds.filter(id => data.find(m => m.id === id)?.status === 'ACTIVE');
    const inactiveMajorIds = selectedIds.filter(id => data.find(m => m.id === id)?.status === 'INACTIVE');

    // Determine which action to show: if any active selected, assume user wants to deactivate them.
    // However, if we want to support Update, we should check if exactly 1 active item is selected.

    const showDeactivate = selectedIds.some(id => data.find(m => m.id === id)?.status === 'ACTIVE');

    return (
        <AcademicStaffLayout pageTitle="Quản lý ngành">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div></div> {/* Spacer */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            <Upload className="h-4 w-4" />
                            Import danh sách ngành
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg bg-fpt-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                        >
                            <Plus className="h-4 w-4" />
                            Tạo ngành
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
                                    onChange={handleSearch}
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
                            showDeactivate={showDeactivate}
                            onUpdate={() => setIsUpdateModalOpen(true)}
                            onDelete={handleBulkDelete}
                            onStatusChange={handleBulkStatusChange}
                            canDelete={selectedIds.every(id => {
                                const item = data.find(m => m.id === id);
                                return item?.status === 'INACTIVE' && item?.canDelete;
                            })}
                            itemLabel="ngành"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-fpt-orange text-white">
                                    <th className="px-4 py-3 text-left rounded-tl-lg">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-white/20 text-white focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                                            onChange={handleSelectAll}
                                            checked={data.length > 0 && selectedIds.length === data.length}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Mã ngành</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tên ngành</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Thời gian đào tạo</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Trạng thái</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Số chuyên ngành</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-gray-400">
                                            <div className="flex justify-center mb-2">
                                                <svg className="h-8 w-8 animate-spin text-fpt-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            </div>
                                            Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-gray-400">
                                            Không có dữ liệu
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((major) => (
                                        <tr
                                            key={major.id}
                                            onClick={() => navigate(`/academic-staff/majors/${major.id}`)}
                                            className={`border-b transition-colors cursor-pointer ${selectedIds.includes(major.id) ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50'} dark:border-zinc-800`}
                                        >
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange dark:border-zinc-600 dark:bg-zinc-700 cursor-pointer"
                                                    checked={selectedIds.includes(major.id)}
                                                    onChange={() => handleSelectOne(major.id)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{major.code}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{major.name}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{major.programDuration}</td>
                                            <td className="px-4 py-3">
                                                {major.status === 'ACTIVE' ? (
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
                                            <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-zinc-300">
                                                {major.numberOfSpecializations}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <Pagination
                        page={page}
                        totalElements={totalElements}
                        pageSize={10}
                        onPageChange={setPage}
                        itemLabel="ngành"
                    />

                    <MajorCreateModal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        onSuccess={fetchMajors}
                    />

                    {selectedIds.length === 1 && (
                        <MajorUpdateModal
                            isOpen={isUpdateModalOpen}
                            onClose={() => setIsUpdateModalOpen(false)}
                            onSuccess={fetchMajors}
                            major={data.find(m => m.id === selectedIds[0])}
                        />
                    )}
                </div>
            </div>
        </AcademicStaffLayout>
    );
};
