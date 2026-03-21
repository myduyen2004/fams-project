import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Loader2, Download, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../services/api/authService';

// Preview response from fast-preview endpoint
interface FastPreviewResponse {
    success: boolean;
    totalRows: number;
    validRows: number;
    errorRows: number;
    canImport: boolean;
    sampleErrors: Array<{
        row: number;
        studentCode: string;
        className: string;
        errors: string[];
    }>;
    durationMs: number;
    message: string;
}

// Import response from bulk-import endpoint  
interface BulkImportResponse {
    totalProcessed: number;
    created: number;
    failed: number;
    errors: string[];
    durationMs: number;
    message: string;
}

interface ImportEnrollmentModalProps {
    isOpen: boolean;
    semesterCode: string;
    onClose: () => void;
    onSuccess: () => void;
}

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        return axiosError.response?.data?.message || defaultMessage;
    }
    return defaultMessage;
};

export const ImportEnrollmentModal: React.FC<ImportEnrollmentModalProps> = ({
    isOpen,
    semesterCode,
    onClose,
    onSuccess
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewResult, setPreviewResult] = useState<FastPreviewResponse | null>(null);
    const [importResult, setImportResult] = useState<BulkImportResponse | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreviewResult(null);
            setImportResult(null);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await apiClient.get(`/v1/class-sections/semester/${encodeURIComponent(semesterCode)}/enrollments/import/template`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `enrollment_import_template_${semesterCode}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Tải xuống template thành công');
        } catch (error) {
            console.error('Error downloading template:', error);
            toast.error('Không thể tải xuống template');
        }
    };

    // Use fast-preview endpoint (returns summary only, not full data)
    const handlePreview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error('Vui lòng chọn file');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('file', file);

            const response = await apiClient.post<FastPreviewResponse>(
                `/v1/class-sections/semester/${encodeURIComponent(semesterCode)}/enrollments/fast-preview`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            setPreviewResult(response.data);

            if (response.data.canImport) {
                toast.success(`${response.data.validRows.toLocaleString()} dòng hợp lệ, sẵn sàng import!`);
            } else if (response.data.errorRows > 0) {
                toast.error(`Có ${response.data.errorRows.toLocaleString()} lỗi. Vui lòng sửa file và thử lại.`);
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi đọc file'));
        } finally {
            setLoading(false);
        }
    };

    // Use bulk-import endpoint (validates + inserts directly)
    const handleConfirmImport = async () => {
        if (!file || !previewResult?.canImport) return;

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('file', file);

            const response = await apiClient.post<BulkImportResponse>(
                `/v1/class-sections/semester/${encodeURIComponent(semesterCode)}/enrollments/bulk-import`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            setImportResult(response.data);

            if (response.data.created > 0) {
                toast.success(response.data.message);
                onSuccess();
            } else if (response.data.failed > 0) {
                toast.error(`Import thất bại: ${response.data.failed} lỗi`);
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi import dữ liệu'));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreviewResult(null);
        setImportResult(null);
        onClose();
    };

    const handleReset = () => {
        setFile(null);
        setPreviewResult(null);
        setImportResult(null);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import danh sách đăng ký</h3>
                        <p className="text-sm text-gray-500 mt-1">Học kỳ: <span className="font-medium text-orange-600">{semesterCode}</span></p>
                    </div>
                    <button onClick={handleClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* Step 1: Upload Form */}
                    {!previewResult && !importResult && (
                        <form onSubmit={handlePreview} className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded-lg text-sm">
                                <p className="font-semibold mb-1">Hướng dẫn:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Hỗ trợ file Excel lớn (đến <strong>300,000+ dòng</strong>)</li>
                                    <li>Cột theo thứ tự: <strong>MSSV, Mã lớp học phần</strong></li>
                                    <li>MSSV: Mã số sinh viên (phải tồn tại trong hệ thống)</li>
                                    <li>Mã lớp: Mã lớp học phần (phải thuộc học kỳ {semesterCode})</li>
                                </ul>
                            </div>

                            {/* Download Template Button */}
                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                className="w-full px-4 py-2 border border-orange-200 rounded-lg text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={16} /> Tải xuống file mẫu
                            </button>

                            <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors relative">
                                <input required type="file" accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                                <Upload size={32} className="text-fpt-orange mb-2" />
                                {file ? (
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Chọn file để tải lên</p>
                                        <p className="text-xs text-gray-500 mt-1">Hỗ trợ .xlsx (tối đa 500MB)</p>
                                    </>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={handleClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                                <button type="submit" disabled={loading || !file} className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {loading && <Loader2 size={16} className="animate-spin" />} Kiểm tra file
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 2: Preview Result */}
                    {previewResult && !importResult && (
                        <div className="space-y-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{previewResult.totalRows.toLocaleString()}</p>
                                    <p className="text-sm text-gray-500">Tổng số dòng</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-green-600">{previewResult.validRows.toLocaleString()}</p>
                                    <p className="text-sm text-green-700 dark:text-green-400">Hợp lệ</p>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-red-600">{previewResult.errorRows.toLocaleString()}</p>
                                    <p className="text-sm text-red-700 dark:text-red-400">Lỗi</p>
                                </div>
                            </div>

                            {/* Status Message */}
                            {previewResult.canImport ? (
                                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg">
                                    <CheckCircle size={24} />
                                    <div>
                                        <p className="font-semibold">Sẵn sàng import!</p>
                                        <p className="text-sm">{previewResult.message}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg">
                                    <XCircle size={24} />
                                    <div>
                                        <p className="font-semibold">Không thể import</p>
                                        <p className="text-sm">{previewResult.message}</p>
                                    </div>
                                </div>
                            )}

                            {/* Sample Errors */}
                            {previewResult.sampleErrors && previewResult.sampleErrors.length > 0 && (
                                <div className="space-y-2">
                                    <p className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <AlertTriangle size={16} className="text-red-500" />
                                        Một số lỗi mẫu (hiển thị tối đa 100):
                                    </p>
                                    <div className="max-h-60 overflow-y-auto border rounded-lg border-gray-200 dark:border-zinc-700">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Dòng</th>
                                                    <th className="px-3 py-2 text-left">MSSV</th>
                                                    <th className="px-3 py-2 text-left">Mã lớp</th>
                                                    <th className="px-3 py-2 text-left">Lỗi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                                {previewResult.sampleErrors.map((err, idx) => (
                                                    <tr key={idx} className="bg-red-50/50 dark:bg-red-900/10">
                                                        <td className="px-3 py-2 text-gray-600">{err.row}</td>
                                                        <td className="px-3 py-2 font-medium text-gray-900">{err.studentCode || '---'}</td>
                                                        <td className="px-3 py-2 font-medium text-orange-600">{err.className || '---'}</td>
                                                        <td className="px-3 py-2 text-red-600 text-xs">{err.errors.join('; ')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Processing Time */}
                            <p className="text-xs text-gray-400 text-right">
                                Kiểm tra trong {(previewResult.durationMs / 1000).toFixed(2)} giây
                            </p>

                            {/* Actions */}
                            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
                                <button onClick={handleReset} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
                                    <Upload size={16} className="rotate-180" /> Chọn file khác
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={handleClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                                    <button
                                        onClick={handleConfirmImport}
                                        disabled={loading || !previewResult.canImport}
                                        className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        {previewResult.canImport ? `Import ${previewResult.validRows.toLocaleString()} dòng` : 'Không thể import'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Import Result */}
                    {importResult && (
                        <div className="space-y-4 text-center py-8">
                            {importResult.created > 0 ? (
                                <>
                                    <CheckCircle size={64} className="text-green-500 mx-auto" />
                                    <h4 className="text-xl font-bold text-green-600">Import thành công!</h4>
                                    <p className="text-gray-600 dark:text-gray-400">{importResult.message}</p>
                                    <p className="text-sm text-gray-400">
                                        Thời gian: {(importResult.durationMs / 1000).toFixed(2)} giây
                                    </p>
                                </>
                            ) : (
                                <>
                                    <XCircle size={64} className="text-red-500 mx-auto" />
                                    <h4 className="text-xl font-bold text-red-600">Import thất bại</h4>
                                    <p className="text-gray-600 dark:text-gray-400">{importResult.message}</p>
                                </>
                            )}

                            <button onClick={handleClose} className="mt-4 px-8 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
                                Đóng
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};