import { useState } from 'react';
import { X, Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import toast from "@utils/toast";
import { specializationService } from '../../services/api/specializationService';
import { SpecializationImportDTO } from '../../types/specialization';

interface ImportSpecializationModalProps {
    isOpen: boolean;
    onClose: () => void;
    majorId?: number;
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

export const ImportSpecializationModal: React.FC<ImportSpecializationModalProps> = ({ isOpen, onClose, majorId, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<SpecializationImportDTO[] | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
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
            let data;
            if (majorId) {
                data = await specializationService.previewImportSpecializations(majorId, file);
            } else {
                data = await specializationService.previewImportSpecializationsBulk(file);
            }
            setPreviewData(data);
            if (data.length === 0) {
                toast.warning('File không có dữ liệu hợp lệ', { icon: '⚠️' });
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
            let result;
            if (majorId) {
                result = await specializationService.saveImportedSpecializations(majorId, previewData);
            } else {
                result = await specializationService.saveImportedSpecializationsBulk(previewData);
            }

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
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${previewData ? 'w-full max-w-5xl max-h-[92vh]' : 'w-full max-w-lg'}`}>
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            Import danh sách chuyên ngành {majorId ? '' : '(Tất cả các ngành)'}
                        </h3>
                        {previewData && (
                            <p className="text-sm text-gray-500 mt-1">
                                Xem trước: <span className="text-green-600 font-medium">{validCount} hợp lệ</span>
                                {warningCount > 0 && <> • <span className="text-yellow-600 font-medium">{warningCount} cảnh báo</span></>}
                                {errorCount > 0 && <> • <span className="text-red-500 font-medium">{errorCount} lỗi</span></>}
                            </p>
                        )}
                    </div>
                    <button onClick={handleClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
                        <X className="h-5 w-5 text-gray-500 dark:text-zinc-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {!previewData ? (
                        <form onSubmit={handlePreview} className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded-2xl text-sm border border-blue-100 dark:border-blue-900/20">
                                <p className="font-semibold mb-1">Hướng dẫn:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Tải lên file <strong>.xlsx</strong> chứa dữ liệu chuyên ngành.</li>
                                    <li>File cần có các cột: {majorId ? '' : 'Mã ngành, '}Mã chuyên ngành, Tên chuyên ngành, Mô tả, Trạng thái.</li>
                                    <li>Nhấn "Xem trước" để kiểm tra dữ liệu trước khi lưu.</li>
                                </ul>
                            </div>

                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        await specializationService.downloadImportTemplate();
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
                                    className="h-[44px] px-6 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center justify-center h-[44px] px-6 rounded-2xl bg-fpt-orange text-sm font-bold text-white hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {loading && <Loader2 size={16} className="animate-spin mr-2" />}
                                    Xem trước
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="border rounded-2xl overflow-hidden border-gray-200 dark:border-zinc-700">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-medium border-b border-gray-200 dark:border-zinc-700">
                                        <tr>
                                            <th className="px-4 py-3 w-12 text-center">#</th>
                                            { !majorId && <th className="px-4 py-3">Mã ngành</th> }
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
                                                { !majorId && <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{row.majorCode || '---'}</td> }
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
                                    className="h-[44px] px-6 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    Quay lại
                                </button>
                                {errorCount === 0 && (validCount + warningCount) > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleConfirmImport}
                                        disabled={loading}
                                        className="flex items-center justify-center h-[44px] px-6 rounded-2xl bg-fpt-orange text-sm font-bold text-white hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 disabled:opacity-50"
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

