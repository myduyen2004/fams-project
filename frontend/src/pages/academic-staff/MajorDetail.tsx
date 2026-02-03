import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, Plus, Search, Loader2, ArrowLeft, X, Download } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { majorService } from '../../services/api/majorService';
import { specializationService } from '../../services/api/specializationService';
import { StatusFilter, Pagination, SelectionActionBar, StatusBadge } from '../../components/academic-staff';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Major } from '../../types/major';
import { Specialization, SpecializationImportDTO } from '../../types/specialization';
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
                            rows={3}
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

const SpecializationUpdateModal: React.FC<SpecializationUpdateModalProps> = ({ isOpen, onClose, onSuccess, specialization }) => {
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
                    majorId: specialization.majorId,
                    status: specialization.status
                });
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
                            rows={3}
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

interface ImportSpecializationModalProps {
    isOpen: boolean;
    onClose: () => void;
    majorId: number;
    onSuccess: () => void;
}

// Helper function to get error message from axios error
const getErrorMessage = (error: unknown, defaultMessage: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        return axiosError.response?.data?.message || defaultMessage;
    }
    return defaultMessage;
};

const ImportSpecializationModal: React.FC<ImportSpecializationModalProps> = ({ isOpen, onClose, majorId, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<SpecializationImportDTO[] | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreviewData(null); // Reset preview when file changes
        }
    };

    const handlePreview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error('Vui lòng chọn file Excel');
            return;
        }

        try {
            setLoading(true);
            const data = await specializationService.previewImportSpecializations(majorId, file);
            setPreviewData(data);
            if (data.length === 0) {
                toast('File không có dữ liệu hợp lệ', { icon: '⚠️' });
            } else {
                toast.success(`Đã đọc ${data.length} dòng`);
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi đọc file'));
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!previewData || previewData.length === 0 || errorCount > 0) return;

        try {
            setLoading(true);
            const result = await specializationService.saveImportedSpecializations(majorId, previewData);

            if (result.created > 0) {
                toast.success(`Đã tạo thành công ${result.created} chuyên ngành mới`);
            }

            if (result.failed > 0) {
                toast.error(`${result.failed} dòng bị lỗi`);
                if (result.errors && result.errors.length > 0) {
                    console.error('Import save errors:', result.errors);
                }
            }

            onSuccess();
            handleClose();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi lưu dữ liệu'));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreviewData(null);
        onClose();
    };

    const validCount = previewData?.filter(item => item.status === 'VALID' && !item.warningMessage).length || 0;
    const warningCount = previewData?.filter(item => item.status === 'VALID' && item.warningMessage).length || 0;
    const errorCount = previewData?.filter(item => item.status === 'ERROR').length || 0;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full ${previewData ? 'max-w-6xl' : 'max-w-md'} border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh]`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import danh sách chuyên ngành</h3>
                        {previewData && (
                            <p className="text-sm text-gray-500 mt-1">
                                Xem trước: <span className="text-green-600 font-medium">{validCount} hợp lệ</span>
                                {warningCount > 0 && <> • <span className="text-yellow-600 font-medium">{warningCount} cảnh báo</span></>}
                                {errorCount > 0 && <> • <span className="text-red-500 font-medium">{errorCount} lỗi</span></>}
                            </p>
                        )}
                    </div>
                    <button onClick={handleClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5 text-gray-500 dark:text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {!previewData ? (
                        // Upload Form
                        <form onSubmit={handlePreview} className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded-lg text-sm">
                                <p className="font-semibold mb-1">Hướng dẫn:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Tải lên file <strong>.xlsx</strong> chứa dữ liệu chuyên ngành.</li>
                                    <li>File cần có các cột: Mã ngành, Mã chuyên ngành, Tên chuyên ngành, Mô tả, Trạng thái.</li>
                                    <li>Nhấn "Xem trước" để kiểm tra dữ liệu trước khi lưu.</li>
                                </ul>
                            </div>

                            <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors relative">
                                <input
                                    required
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                                <Upload size={32} className="text-fpt-orange mb-2" />
                                {file ? (
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Chọn file để tải lên</p>
                                        <p className="text-xs text-gray-500 mt-1">Hỗ trợ .xlsx, .xls</p>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={loading}
                                    className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center justify-center rounded-lg bg-fpt-orange px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:opacity-50"
                                >
                                    {loading && <Loader2 size={16} className="animate-spin mr-2" />}
                                    Xem trước
                                </button>
                            </div>
                        </form>
                    ) : (
                        // Preview Table
                        <div className="space-y-4">
                            <div className="border rounded-lg overflow-hidden border-gray-200 dark:border-zinc-700">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-medium border-b border-gray-200 dark:border-zinc-700">
                                        <tr>
                                            <th className="px-4 py-3 w-12 text-center">#</th>
                                            <th className="px-4 py-3">Mã chuyên ngành</th>
                                            <th className="px-4 py-3">Tên chuyên ngành</th>
                                            <th className="px-4 py-3">Mô tả</th>
                                            <th className="px-4 py-3 text-center whitespace-nowrap">Trạng thái</th>
                                            <th className="px-4 py-3 text-center whitespace-nowrap">Kết quả</th>
                                            <th className="px-4 py-3">Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {previewData.map((row, index) => (
                                            <tr key={index} className={row.status === 'ERROR' ? 'bg-red-50 dark:bg-red-900/10' : row.warningMessage ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                                                <td className="px-4 py-3 text-center text-gray-500">{row.rowNumber}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.code || '---'}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.name || '---'}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate" title={row.description}>{row.description || '---'}</td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {row.statusStr === 'ACTIVE' ? (
                                                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full whitespace-nowrap">
                                                            Đang mở
                                                        </span>
                                                    ) : row.statusStr === 'INACTIVE' ? (
                                                        <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full whitespace-nowrap">
                                                            Ngừng đào tạo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full whitespace-nowrap">
                                                            {row.statusStr || '---'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {row.status === 'VALID' && !row.warningMessage ? (
                                                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full whitespace-nowrap">
                                                            Hợp lệ
                                                        </span>
                                                    ) : row.status === 'VALID' && row.warningMessage ? (
                                                        <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full whitespace-nowrap">
                                                            Cảnh báo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full whitespace-nowrap">
                                                            Lỗi
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {row.status === 'ERROR' ? (
                                                        <span className="text-red-600 dark:text-red-400">{row.errorMessage}</span>
                                                    ) : row.warningMessage ? (
                                                        <span className="text-yellow-600 dark:text-yellow-400">{row.warningMessage}</span>
                                                    ) : ''}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setPreviewData(null)}
                                    disabled={loading}
                                    className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50"
                                >
                                    Quay lại
                                </button>
                                {errorCount === 0 && (validCount + warningCount) > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleConfirmImport}
                                        disabled={loading}
                                        className="flex items-center justify-center rounded-lg bg-fpt-orange px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:opacity-50"
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin mr-2" />}
                                        Xác nhận Import ({validCount + warningCount} dòng)
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---

export const MajorDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
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

    const handleDownloadTemplate = async () => {
        try {
            await specializationService.downloadImportTemplate();
            toast.success('Tải file mẫu thành công');
        } catch (error) {
            console.error('Download template error:', error);
            toast.error('Lỗi khi tải file mẫu');
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;

        let confirmMsg = '';
        if (selectedIds.length === 1) {
            const selectedItem = specializations.find(s => s.id === selectedIds[0]);
            confirmMsg = `Bạn có chắc chắn muốn xóa chuyên ngành "${selectedItem?.name}"? hành động này không thể hoàn tác.`;
        } else {
            confirmMsg = `Bạn có chắc chắn muốn xóa ${selectedIds.length} chuyên ngành đã chọn? hành động này không thể hoàn tác.`;
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
                ? `Bạn có chắc chắn muốn mở lại chuyên ngành "${selectedItem?.name}"?`
                : `Bạn có chắc chắn muốn ngừng đào tạo chuyên ngành "${selectedItem?.name}"?`;
        } else {
            confirmMsg = newStatus === 'ACTIVE'
                ? `Bạn có chắc chắn muốn mở lại ${selectedIds.length} chuyên ngành đã chọn?`
                : `Bạn có chắc chắn muốn ngừng đào tạo ${selectedIds.length} chuyên ngành đã chọn?`;
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
                                {major && (
                                    <StatusBadge status={major.status} />
                                )}
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
                                onClick={handleDownloadTemplate}
                                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            >
                                <Download className="h-4 w-4" />
                                Tải file mẫu
                            </button>
                            <button
                                onClick={() => setIsImportModalOpen(true)}
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
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setPage(0);
                                        }}
                                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-fpt-orange focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                    />
                                </div>

                                <StatusFilter
                                    value={statusFilter}
                                    onChange={(value) => {
                                        setStatusFilter(value);
                                        setPage(0);
                                    }}
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
                                        <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Tổng số tín chỉ</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Trạng thái</th>
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

                        {/* Pagination */}
                        <Pagination
                            page={page}
                            totalElements={totalElements}
                            pageSize={10}
                            onPageChange={setPage}
                            itemLabel="chuyên ngành"
                        />
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
                </div>
            </div>
        </AcademicStaffLayout>
    );
};

export default MajorDetail;
