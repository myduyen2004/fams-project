import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Search, X, Loader2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { majorService } from '../../services/api/majorService';
import { StatusFilter, Pagination, SelectionActionBar } from '../../components/academic-staff';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Major, MajorImportDTO } from '../../types/major';

// --- Types ---

interface MajorCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface MajorUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    major: Major;
}

interface ImportMajorModalProps {
    isOpen: boolean;
    onClose: () => void;
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

// --- Components ---

const ImportMajorModal: React.FC<ImportMajorModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<MajorImportDTO[] | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            // Reset preview when file changes
            setPreviewData(null);
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
            const data = await majorService.previewImportMajors(file);
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
            const result = await majorService.saveImportedMajors(previewData);

            if (result.created > 0) {
                toast.success(`Đã tạo thành công ${result.created} ngành mới`);
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
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import danh sách ngành</h3>
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
                                    <li>Tải lên file <strong>.xlsx</strong> chứa dữ liệu ngành học.</li>
                                    <li>File cần có các cột: Mã ngành, Tên ngành, Mô tả, Thời gian đào tạo, Trạng thái.</li>
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
                                            <th className="px-4 py-3">Mã ngành</th>
                                            <th className="px-4 py-3">Tên ngành</th>
                                            <th className="px-4 py-3">Mô tả</th>
                                            <th className="px-4 py-3">Thời gian</th>
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
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{row.programDuration || '---'}</td>
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

const MajorCreateModal: React.FC<MajorCreateModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);

    const validationSchema = Yup.object({
        code: Yup.string()
            .trim()
            .matches(/^[a-zA-Z0-9-]+$/, 'Mã ngành chỉ được chứa chữ cái, số và dấu gạch ngang')
            .matches(/[a-zA-Z]/, 'Mã ngành phải chứa ít nhất một chữ cái')
            .max(20, 'Mã ngành không được quá 20 ký tự')
            .required('Mã ngành là bắt buộc'),
        name: Yup.string()
            .trim()
            .matches(/[a-zA-ZÀ-ỹ]/, 'Tên ngành phải chứa ít nhất một chữ cái')
            .min(5, 'Tên ngành phải có ít nhất 5 ký tự')
            .max(100, 'Tên ngành không được quá 100 ký tự')
            .required('Tên ngành là bắt buộc'),
        description: Yup.string()
            .max(500, 'Mô tả không được quá 500 ký tự')
    });

    const formik = useFormik({
        initialValues: {
            code: '',
            name: '',
            programDuration: '9 kỳ',
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
            } catch (error: any) {
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
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Thời gian đào tạo</label>
                        <input
                            type="text"
                            name="programDuration"
                            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-gray-100 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-700 cursor-not-allowed"
                            value={formik.values.programDuration}
                            disabled
                            readOnly
                        />
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
                            {isLoading ? 'Đang xử lý...' : 'Tạo ngành'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const MajorUpdateModal: React.FC<MajorUpdateModalProps> = ({ isOpen, onClose, onSuccess, major }) => {
    const [isLoading, setIsLoading] = useState(false);

    const validationSchema = Yup.object({
        code: Yup.string()
            .trim()
            .matches(/^[a-zA-Z0-9-]+$/, 'Mã ngành chỉ được chứa chữ cái, số và dấu gạch ngang')
            .matches(/[a-zA-Z]/, 'Mã ngành phải chứa ít nhất một chữ cái')
            .max(20, 'Mã ngành không được quá 20 ký tự')
            .required('Mã ngành là bắt buộc'),
        name: Yup.string()
            .trim()
            .matches(/[a-zA-ZÀ-ỹ]/, 'Tên ngành phải chứa ít nhất một chữ cái')
            .min(5, 'Tên ngành phải có ít nhất 5 ký tự')
            .max(100, 'Tên ngành không được quá 100 ký tự')
            .required('Tên ngành là bắt buộc'),
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
            } catch (error: any) {
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
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Thời gian đào tạo</label>
                        <input
                            type="text"
                            name="programDuration"
                            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-gray-100 dark:bg-zinc-700 dark:text-zinc-400 dark:border-zinc-700 cursor-not-allowed"
                            value={formik.values.programDuration}
                            disabled
                            readOnly
                        />
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

// --- Main Page Component ---

export const MajorManagement: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [page, setPage] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [data, setData] = useState<Major[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

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
            // setSelectedIds([]); // Removed to persist selection after update
        } catch (error) {
            console.error('Failed to fetch majors:', error);
            toast.error('Không thể tải danh sách ngành');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchTerm, statusFilter, page]);

    useEffect(() => {
        setSelectedIds([]);
    }, [debouncedSearchTerm, statusFilter, page]);

    useEffect(() => {
        fetchMajors();
    }, [fetchMajors]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(0);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(data.map(m => m.id));
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

    const handleRowClick = (major: Major) => {
        navigate(`/academic-staff/majors/${major.id}`);
    };

    const handleBulkStatusChange = (newStatus: 'ACTIVE' | 'INACTIVE') => {
        if (selectedIds.length === 0) return;

        const confirmTitle = newStatus === 'ACTIVE' ? 'Mở lại ngành' : 'Ngừng đào tạo ngành';
        const type = newStatus === 'ACTIVE' ? 'success' : 'danger';
        const confirmLabel = newStatus === 'ACTIVE' ? 'Mở lại' : 'Ngừng đào tạo';

        let confirmMsg = '';
        if (selectedIds.length === 1) {
            const selectedItem = data.find(m => m.id === selectedIds[0]);
            confirmMsg = newStatus === 'ACTIVE'
                ? `Bạn có chắc chắn muốn mở lại ngành "${selectedItem?.name}"?\n\n⚠️ Tất cả chuyên ngành trong ngành này cũng sẽ được mở lại.`
                : `Bạn có chắc chắn muốn ngừng đào tạo ngành "${selectedItem?.name}"?\n\n⚠️ Tất cả chuyên ngành trong ngành này cũng sẽ bị ngừng đào tạo.`;
        } else {
            confirmMsg = newStatus === 'ACTIVE'
                ? `Bạn có chắc chắn muốn mở lại ${selectedIds.length} ngành đã chọn?\n\n⚠️ Tất cả chuyên ngành trong các ngành này cũng sẽ được mở lại.`
                : `Bạn có chắc chắn muốn ngừng đào tạo ${selectedIds.length} ngành đã chọn?\n\n⚠️ Tất cả chuyên ngành trong các ngành này cũng sẽ bị ngừng đào tạo.`;
        }

        setConfirmModal({
            isOpen: true,
            title: confirmTitle,
            message: confirmMsg,
            type: type as any,
            confirmLabel: confirmLabel,
            onConfirm: async () => {
                try {
                    await Promise.all(selectedIds.map(id => majorService.updateStatus(id, newStatus)));
                    toast.success('Cập nhật trạng thái thành công');
                    setSelectedIds([]);
                    fetchMajors();
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

        let confirmMsg = '';
        if (selectedIds.length === 1) {
            const selectedItem = data.find(m => m.id === selectedIds[0]);
            confirmMsg = `Bạn có chắc chắn muốn xóa ngành "${selectedItem?.name}"? Hành động này không thể hoàn tác.`;
        } else {
            confirmMsg = `Bạn có chắc chắn muốn xóa ${selectedIds.length} ngành đã chọn? Hành động này không thể hoàn tác.`;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Xóa ngành',
            message: confirmMsg,
            type: 'danger',
            confirmLabel: 'Xóa',
            onConfirm: async () => {
                try {
                    await Promise.all(selectedIds.map(id => majorService.deleteMajor(id)));
                    toast.success('Xóa ngành thành công');
                    setSelectedIds([]);
                    fetchMajors();
                    closeConfirmModal();
                } catch (error: any) {
                    console.error('Bulk delete error:', error);
                    // Extract exact error message from backend if available
                    const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi xóa ngành';
                    toast.error(errorMessage);
                    closeConfirmModal();
                }
            }
        });
    };

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
                            onClick={async () => {
                                try {
                                    const blob = await majorService.downloadImportTemplate();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'major_import_template.xlsx';
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                } catch (error) {
                                    toast.error('Lỗi khi tải template');
                                }
                            }}
                            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                            <Download className="h-4 w-4" />
                            Tải template
                        </button>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg border border-fpt-orange bg-orange-50 px-4 py-2 text-sm font-medium text-fpt-orange hover:bg-orange-100"
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
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Thời gian đào tạo</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Trạng thái</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Số chuyên ngành</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {loading && data.length === 0 ? (
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
                                            className={`border-b transition-colors cursor-pointer ${selectedIds.includes(major.id) ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50'} dark:border-zinc-800`}
                                            onClick={() => handleRowClick(major)}
                                        >
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange dark:border-zinc-600 dark:bg-zinc-700 cursor-pointer"
                                                    checked={selectedIds.includes(major.id)}
                                                    onChange={() => handleSelectOne(major.id)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium font-semibold text-gray-900">{major.code}</td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{major.name}</td>
                                            <td className="px-4 py-3 text-center font-medium text-gray-600 dark:text-zinc-400 ">{major.programDuration}</td>
                                            <td className="px-4 py-3 text-center">
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
                            major={data.find(m => m.id === selectedIds[0])!}
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

                    <ImportMajorModal
                        isOpen={isImportModalOpen}
                        onClose={() => setIsImportModalOpen(false)}
                        onSuccess={fetchMajors}
                    />
                </div>
            </div>
        </AcademicStaffLayout>
    );
};

export default MajorManagement;
