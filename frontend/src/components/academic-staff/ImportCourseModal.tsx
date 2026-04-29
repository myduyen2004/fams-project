import { useState } from 'react';
import { X, Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import toast from "@utils/toast";
import { courseService } from '../../services/api/courseService';
import { CourseImportDTO } from '../../types/course';

interface ImportCourseModalProps {
    isOpen: boolean;
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

export const ImportCourseModal: React.FC<ImportCourseModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<CourseImportDTO[] | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreviewData(null);
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
            const data = await courseService.previewImportCourses(file);
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
        if (!previewData || previewData.length === 0) return;

        try {
            setLoading(true);
            const result = await courseService.saveImportedCourses(previewData);

            if (result.created > 0) {
                toast.success(`Import thành công ${result.created} môn học`);
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${previewData ? 'w-full max-w-5xl max-h-[92vh]' : 'w-full max-w-lg'}`}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import danh sách môn học</h3>
                        {previewData && (
                            <p className="text-sm text-gray-500 mt-1">
                                Xem trước: <span className="text-green-600 font-medium">{validCount} hợp lệ</span>
                                {warningCount > 0 && <> • <span className="text-yellow-600 font-medium">{warningCount} cảnh báo</span></>}
                                {errorCount > 0 && <> • <span className="text-red-500 font-medium">{errorCount} lỗi</span></>}
                            </p>
                        )}
                    </div>
                    <button onClick={handleClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95"><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {!previewData ? (
                        // Upload Form
                        <form onSubmit={handlePreview} className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded-2xl text-sm border border-blue-100 dark:border-blue-900/20">
                                <p className="font-semibold mb-1">Hướng dẫn:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Tải lên file <strong>.xlsx</strong> chứa dữ liệu môn học.</li>
                                    <li>Cột theo thứ tự: Code, Name, Credits, Slots, Description, Calculated in GPA, Status</li>
                                    <li>Status: <strong>ACTIVE</strong> (đang mở) hoặc <strong>INACTIVE</strong> (ngừng đào tạo)</li>
                                    <li>Calculated in GPA: <strong>Yes/Có/True</strong> (tính GPA) hoặc <strong>No/Không/False</strong> (không tính)</li>
                                    <li>Mã môn học <strong>không được trùng</strong> với môn đã có trong hệ thống.</li>
                                    <li>Nhấn "Xem trước" để kiểm tra dữ liệu trước khi lưu.</li>
                                </ul>
                            </div>

                             <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        const blob = await courseService.downloadImportTemplate();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = 'template-import-mon-hoc.xlsx';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                    } catch (error) {
                                        toast.error('Lỗi khi tải template');
                                    }
                                }}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 h-[44px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all font-bold active:scale-95"
                            >
                                <FileSpreadsheet size={18} />
                                Tải file mẫu Excel
                            </button>

                            <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors relative">
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
                                <button type="button" onClick={handleClose} className="h-[44px] px-6 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-95">Hủy</button>
                                <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 h-[44px] px-6 rounded-2xl bg-fpt-orange text-sm font-bold text-white hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 disabled:opacity-50">
                                    {loading && <Loader2 size={16} className="animate-spin" />} Xem trước
                                </button>
                            </div>
                        </form>
                    ) : (
                        // Preview Table
                        <div className="space-y-4">
                            {/* Error alert if cannot import */}
                            {errorCount > 0 && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 rounded-2xl text-sm border border-red-100 dark:border-red-900/20">
                                    <p className="font-semibold">⚠️ Không thể import do có {errorCount} dòng bị lỗi. Vui lòng sửa file Excel và thử lại.</p>
                                </div>
                            )}

                            <div className="border rounded-2xl overflow-hidden border-gray-200 dark:border-zinc-700 shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-medium border-b border-gray-200 dark:border-zinc-700">
                                        <tr>
                                            <th className="px-4 py-3 w-12 text-center">#</th>
                                            <th className="px-4 py-3 w-24">Mã môn</th>
                                            <th className="px-4 py-3">Tên môn học</th>
                                            <th className="px-4 py-3 text-center w-24">Tín chỉ</th>
                                            <th className="px-4 py-3 text-center">Slots</th>
                                            <th className="px-4 py-3 text-center">Tính GPA</th>
                                            <th className="px-4 py-3 text-center">Trạng thái</th>
                                            <th className="px-4 py-3 text-center">Kiểm tra</th>
                                            <th className="px-4 py-3">Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {previewData.map((row, index) => (
                                            <tr key={index} className={row.status === 'ERROR' ? 'bg-red-50 dark:bg-red-900/10' : row.status === 'WARNING' ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                                                <td className="px-4 py-3 text-center text-gray-500">{row.rowNumber}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.code || '---'}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.name || '---'}</td>
                                                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{row.credits || '---'}</td>
                                                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{row.numberOfSlots || '---'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {row.isCalculatedInGpa ? (
                                                        <span className="text-green-600 font-medium">Có</span>
                                                    ) : (
                                                        <span className="text-red-500">Không</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {row.statusValue === 'ACTIVE' ? (
                                                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                            Đang mở
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                                                            Ngừng đào tạo
                                                        </span>
                                                    )}
                                                </td>
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
                                    className="h-[44px] px-6 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <Upload size={16} className="rotate-180" /> Quay lại upload
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={handleClose} className="h-[44px] px-6 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-95">Hủy</button>
                                    <button
                                        onClick={handleConfirmImport}
                                        disabled={loading || !canImport}
                                        className="flex items-center justify-center gap-2 h-[44px] px-6 rounded-2xl bg-fpt-orange text-sm font-bold text-white hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        {canImport ? `Xác nhận import (${validCount})` : 'Không thể import'}
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

