import { useState } from 'react';
import { X, Upload, Loader2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface EnrollmentImportDTO {
    rowNumber: number;
    studentCode: string;
    className: string;
    studentName: string | null;
    courseName: string | null;
    status: string;
    errorMessage: string | null;
    warningMessage: string | null;
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
    const [previewData, setPreviewData] = useState<EnrollmentImportDTO[] | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreviewData(null);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await axios.get(`/api/v1/class-sections/semester/${encodeURIComponent(semesterCode)}/enrollments/import/template`, {
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
            
            const response = await axios.post(
                `/api/v1/class-sections/semester/${encodeURIComponent(semesterCode)}/enrollments/import/preview`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            
            setPreviewData(response.data);
            if (response.data.length === 0) {
                toast('File không có dữ liệu hợp lệ', { icon: '⚠️' });
            } else {
                toast.success(`Đã đọc ${response.data.length} dòng`);
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi đọc file'));
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        console.log('handleConfirmImport called', { previewData, canImport, validCount, errorCount });
        if (!previewData || previewData.length === 0) {
            console.log('No preview data, returning');
            return;
        }

        try {
            setLoading(true);
            console.log('Sending import data:', previewData);
            const response = await axios.post(
                `/api/v1/class-sections/enrollments/import/save`,
                previewData
            );
            
            console.log('Import response:', response.data);
            const result = response.data;

            if (result.created > 0) {
                toast.success(result.message || `Import thành công ${result.created} sinh viên`);
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

    const validCount = previewData?.filter(item => item.status === 'VALID' || item.status === 'WARNING').length || 0;
    const warningCount = previewData?.filter(item => item.status === 'WARNING').length || 0;
    const errorCount = previewData?.filter(item => item.status === 'ERROR').length || 0;
    const canImport = errorCount === 0 && validCount > 0;

    // Debug log
    console.log('Import status:', { validCount, warningCount, errorCount, canImport, previewData: previewData?.map(d => ({ row: d.rowNumber, status: d.status })) });

    // Count unique class sections in preview
    const uniqueClassCount = previewData ? new Set(previewData.map(d => d.className)).size : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full ${previewData ? 'max-w-5xl' : 'max-w-md'} border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh]`}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import danh sách đăng ký</h3>
                        <p className="text-sm text-gray-500 mt-1">Học kỳ: <span className="font-medium text-orange-600">{semesterCode}</span></p>
                        {previewData && (
                            <p className="text-sm text-gray-500 mt-1">
                                Xem trước: <span className="text-green-600 font-medium">{validCount} hợp lệ</span>
                                {warningCount > 0 && <> • <span className="text-yellow-600 font-medium">{warningCount} cảnh báo</span></>}
                                {errorCount > 0 && <> • <span className="text-red-500 font-medium">{errorCount} lỗi</span></>}
                                {uniqueClassCount > 0 && <> • <span className="text-blue-600 font-medium">{uniqueClassCount} lớp học phần</span></>}
                            </p>
                        )}
                    </div>
                    <button onClick={handleClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {!previewData ? (
                        // Upload Form
                        <form onSubmit={handlePreview} className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded-lg text-sm">
                                <p className="font-semibold mb-1">Hướng dẫn:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Tải lên file <strong>.xlsx</strong> chứa danh sách sinh viên đăng ký.</li>
                                    <li>Cột theo thứ tự: <strong>MSSV, Mã lớp + Mã môn</strong></li>
                                    <li>MSSV: Mã số sinh viên (bắt buộc, phải tồn tại trong hệ thống)</li>
                                    <li>Mã lớp: Mã lớp học phần (bắt buộc, phải thuộc học kỳ {semesterCode})</li>
                                    <li className="text-green-700 dark:text-green-400 font-medium">✓ Hỗ trợ import nhiều lớp học phần cùng lúc!</li>
                                </ul>
                            </div>

                            {/* Download Template Button */}
                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                className="w-full px-4 py-2 border border-orange-200 rounded-lg text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={16} /> Tải xuống file mẫu (bao gồm danh sách lớp học phần)
                            </button>

                            <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors relative">
                                <input required type="file" accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                                <Upload size={32} className="text-fpt-orange mb-2" />
                                {file ? (
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Chọn file để tải lên</p>
                                        <p className="text-xs text-gray-500 mt-1">Hỗ trợ .xlsx</p>
                                    </>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={handleClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                                <button type="submit" disabled={loading} className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {loading && <Loader2 size={16} className="animate-spin" />} Xem trước
                                </button>
                            </div>
                        </form>
                    ) : (
                        // Preview Table
                        <div className="space-y-4">
                            {/* Error alert if cannot import */}
                            {errorCount > 0 && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 rounded-lg text-sm">
                                    <p className="font-semibold">⚠️ Không thể import do có {errorCount} dòng bị lỗi. Vui lòng sửa file Excel và thử lại.</p>
                                </div>
                            )}

                            <div className="border rounded-lg overflow-hidden border-gray-200 dark:border-zinc-700">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-medium border-b border-gray-200 dark:border-zinc-700">
                                        <tr>
                                            <th className="px-4 py-3 w-12 text-center">#</th>
                                            <th className="px-4 py-3">MSSV</th>
                                            <th className="px-4 py-3">Tên sinh viên</th>
                                            <th className="px-4 py-3">Mã lớp</th>
                                            <th className="px-4 py-3">Tên môn học</th>
                                            <th className="px-4 py-3 text-center">Kiểm tra</th>
                                            <th className="px-4 py-3">Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {previewData.map((row, index) => (
                                            <tr key={index} className={row.status === 'ERROR' ? 'bg-red-50 dark:bg-red-900/10' : row.status === 'WARNING' ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                                                <td className="px-4 py-3 text-center text-gray-500">{row.rowNumber}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.studentCode || '---'}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.studentName || '---'}</td>
                                                <td className="px-4 py-3 font-medium text-orange-600">{row.className || '---'}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.courseName || '---'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {row.status === 'ERROR' && (
                                                        <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                                                            ✕ Lỗi
                                                        </span>
                                                    )}
                                                    {row.status === 'WARNING' && (
                                                        <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                                            ⚠ Cảnh báo
                                                        </span>
                                                    )}
                                                    {row.status === 'VALID' && (
                                                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                            ✓ Hợp lệ
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {row.status === 'ERROR' && (
                                                        <span className="text-red-600">{row.errorMessage}</span>
                                                    )}
                                                    {row.status === 'WARNING' && (
                                                        <span className="text-yellow-600">{row.warningMessage}</span>
                                                    )}
                                                    {row.status === 'VALID' && (
                                                        <span className="text-green-600">Sẵn sàng import</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
                                <button
                                    onClick={() => setPreviewData(null)}
                                    className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Upload size={16} className="rotate-180" /> Quay lại upload
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={handleClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                                    <button
                                        onClick={handleConfirmImport}
                                        disabled={loading || !canImport}
                                        className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        {canImport ? `Xác nhận import (${validCount} SV vào ${uniqueClassCount} lớp)` : 'Không thể import'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
