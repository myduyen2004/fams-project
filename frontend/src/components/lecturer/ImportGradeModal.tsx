import { useState } from 'react';
import { X, Upload, Loader2, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentGradeService, GradePreviewResponse, GradePreviewRow } from '../../services/api/studentGradeService';

// Custom Tooltip Component with better styling
const Tooltip: React.FC<{ content: string; children: React.ReactNode; className?: string }> = ({ content, children, className = '' }) => {
    const [isVisible, setIsVisible] = useState(false);

    if (!content) return <>{children}</>;

    return (
        <div
            className={`relative inline-block ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap animate-in fade-in duration-150">
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                </div>
            )}
        </div>
    );
};

interface ImportGradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    className: string;
    courseName: string;
}

interface ImportResult {
    success: number;
    failed: number;
    errors: string[];
}

export const ImportGradeModal: React.FC<ImportGradeModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    className,
    courseName
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewResult, setPreviewResult] = useState<GradePreviewResponse | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreviewResult(null);
            setImportResult(null);
            handleAutoPreview(selectedFile);
        }
    };

    const handleAutoPreview = async (selectedFile: File) => {
        try {
            setLoading(true);
            const result = await studentGradeService.previewGrades(className, selectedFile);
            setPreviewResult(result);

            if (result.canImport) {
                // Keep it quiet unless there are errors
            } else if (result.errorRows > 0) {
                toast.error(`Có ${result.errorRows} lỗi. Vui lòng sửa file và thử lại.`);
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi đọc file');
            setFile(null);
        } finally {
            setLoading(false);
        }
    };



    const handleConfirmImport = async () => {
        if (!file || !previewResult?.canImport) return;

        try {
            setLoading(true);
            const result = await studentGradeService.importGrades(className, file);
            setImportResult(result);

            if (result.success > 0) {
                onSuccess();
            } else if (result.failed > 0) {
                toast.error(`Import thất bại: ${result.failed} lỗi`);
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi import dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            setLoading(true);
            await studentGradeService.exportGrades(className);
            toast.success('Đã tải file mẫu');
        } catch {
            toast.error('Không thể tải file mẫu');
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

    const validCount = previewResult?.validRows || 0;
    const errorCount = previewResult?.errorRows || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full ${importResult ? 'max-w-md' : previewResult ? 'max-w-6xl' : 'max-w-md'} border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh]`}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {importResult ? 'Kết quả nhập điểm' : 'Nhập điểm từ Excel'}
                        </h3>
                        {!importResult && (
                            previewResult ? (
                                <p className="text-sm text-gray-500 mt-1">
                                    Xem trước: <span className="text-green-600 font-medium">{validCount} hợp lệ</span>
                                    {errorCount > 0 && <> • <span className="text-red-500 font-medium">{errorCount} lỗi</span></>}
                                    <span className="mx-2 text-gray-300">|</span> {className} • {courseName}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-500 mt-1">
                                    {className} • {courseName}
                                </p>
                            )
                        )}
                        {importResult && <p className="text-sm text-gray-500 mt-1">{className} • {courseName}</p>}
                    </div>
                    <button onClick={handleClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* Step 1: Upload Form */}
                    {!previewResult && !importResult && (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300 rounded-xl text-sm mb-4">
                                <div className="flex items-center gap-2 font-bold mb-2">
                                    <AlertCircle size={16} className="text-fpt-blue" />
                                    <span>Lưu ý quan trọng:</span>
                                </div>
                                <ul className="list-disc pl-5 space-y-1 text-xs opacity-90">
                                    <li>Sử dụng <span className="font-bold underline cursor-pointer" onClick={handleDownloadTemplate}>file mẫu</span> để đảm bảo cấu trúc cột chính xác (MSSV, Họ tên, Tên đầu điểm).</li>
                                    <li>Hệ thống chỉ import các điểm thành phần (Quiz, Assignment, Lab...). <span className="font-semibold text-fpt-blue">KHÔNG</span> hỗ trợ Midterm, Final, PE và Resit.</li>
                                    <li>Điểm nhập vào phải nằm trong khoảng từ <span className="font-bold">0 đến 10</span>.</li>
                                    <li className="font-semibold">Mỗi ô trống (không có dữ liệu) trong Excel sẽ XÓA điểm hiện tại của sinh viên đó trong hệ thống.</li>
                                </ul>
                            </div>

                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                            >
                                <Download size={18} />
                                Tải file mẫu
                            </button>

                            <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors relative">
                                <input required type="file" accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                                <Upload size={32} className="text-fpt-orange mb-2" />
                                {file ? (
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Chọn file để tải lên</p>
                                        <p className="text-xs text-gray-500 mt-1">Hỗ trợ .xlsx, .xls</p>
                                    </>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
                                <button type="button" onClick={handleClose}
                                    className="px-6 py-2.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-all">
                                    Hủy
                                </button>
                                <button
                                    onClick={() => file && handleAutoPreview(file)}
                                    disabled={loading || !file}
                                    className="group relative px-8 py-2.5 bg-fpt-orange text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:grayscale overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 relative z-10">
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                        <span>Xem trước</span>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Preview Table */}
                    {previewResult && !importResult && (
                        <div className="space-y-4">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Tổng số dòng</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{previewResult.totalRows}</div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-100 dark:border-green-900/30 flex flex-col items-center justify-center">
                                    <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1 flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        Hợp lệ
                                    </div>
                                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">{validCount}</div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-900/30 flex flex-col items-center justify-center">
                                    <div className="text-sm text-red-600 dark:text-red-400 font-medium mb-1 flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        Lỗi
                                    </div>
                                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">{errorCount}</div>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="border rounded-xl overflow-hidden border-gray-200 dark:border-zinc-700 shadow-sm">
                                <div className="overflow-x-auto max-h-[45vh]">
                                    <table className="w-full text-sm text-left min-w-max">
                                        <thead className="bg-gradient-to-r from-fpt-orange to-orange-500 text-white font-medium sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-3 w-12 text-center text-xs font-semibold">#</th>
                                                <th className="px-3 py-3 text-xs font-semibold whitespace-nowrap">MSSV</th>
                                                <th className="px-3 py-3 text-xs font-semibold whitespace-nowrap min-w-[140px]">Họ tên</th>
                                                {previewResult.componentNames.map((name, idx) => {
                                                    // Create abbreviated name - skip non-letter first chars
                                                    const words = name.split(/[\s\-_]+/).filter(w => w.length > 0);
                                                    let shortName = name;
                                                    if (name.length > 10) {
                                                        // Try to create abbreviation from first letters
                                                        const abbr = words.map(w => {
                                                            const firstLetter = w.match(/[A-Za-z]/)?.[0];
                                                            return firstLetter ? firstLetter.toUpperCase() : '';
                                                        }).join('');
                                                        // If name ends with a number, append it
                                                        const numMatch = name.match(/(\d+)$/);
                                                        shortName = abbr + (numMatch ? numMatch[1] : '');
                                                        // If abbr is too short, use first 6 chars + ...
                                                        if (shortName.length < 2) {
                                                            shortName = name.substring(0, 6) + '...';
                                                        }
                                                    }
                                                    return (
                                                        <th key={idx} className="px-3 py-3 text-center text-xs font-semibold whitespace-nowrap min-w-[60px]">
                                                            <Tooltip content={name}>
                                                                <span className="cursor-help">{shortName}</span>
                                                            </Tooltip>
                                                        </th>
                                                    );
                                                })}

                                                <th className="px-3 py-3 text-center text-xs font-semibold whitespace-nowrap bg-orange-600 sticky right-0">
                                                    Trạng thái
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                            {previewResult.previewRows.map((row: GradePreviewRow, index: number) => (
                                                <tr
                                                    key={index}
                                                    className={`hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${row.status === 'ERROR' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                                                >
                                                    <td className="px-3 py-2.5 text-center text-gray-400 text-xs font-medium">
                                                        {(index + 1).toString().padStart(2, '0')}
                                                    </td>
                                                    <td className="px-3 py-2.5 font-semibold text-fpt-orange text-xs whitespace-nowrap">
                                                        {row.studentCode}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap" title={row.studentName || ''}>
                                                        {row.studentName || '---'}
                                                    </td>
                                                    {previewResult.componentNames.map((name, idx) => {
                                                        const grade = row.grades[name];
                                                        const hasValue = grade !== null && grade !== undefined;
                                                        return (
                                                            <td key={idx} className="px-3 py-2.5 text-center text-xs">
                                                                {hasValue ? (
                                                                    <span className={`inline-block px-2 py-0.5 rounded font-medium ${grade! >= 5
                                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                        : grade! > 0
                                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                            : 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-gray-400'
                                                                        }`}>
                                                                        {grade!.toFixed(1)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-300 dark:text-gray-600">---</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-3 py-2.5 text-center sticky right-0 bg-white dark:bg-zinc-900 border-l border-gray-100 dark:border-zinc-700">
                                                        {row.status === 'VALID' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            </span>
                                                        ) : (
                                                            <Tooltip content={row.errorMessage || 'Lỗi'}>
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full cursor-help">
                                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                    </svg>
                                                                </span>
                                                            </Tooltip>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Error Details */}
                            {errorCount > 0 && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800/30">
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-sm mb-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Chi tiết lỗi ({errorCount} dòng)
                                    </div>
                                    <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 max-h-24 overflow-y-auto">
                                        {previewResult.previewRows
                                            .filter((row: GradePreviewRow) => row.status === 'ERROR')
                                            .slice(0, 5)
                                            .map((row: GradePreviewRow, idx: number) => (
                                                <li key={idx} className="flex gap-2">
                                                    <span className="font-medium text-red-700">{row.studentCode}:</span>
                                                    <span>{row.errorMessage}</span>
                                                </li>
                                            ))
                                        }
                                        {errorCount > 5 && (
                                            <li className="text-red-500 italic">... và {errorCount - 5} lỗi khác</li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Processing Time */}
                            <p className="text-xs text-gray-400 text-right">
                                Kiểm tra trong {(previewResult.durationMs / 1000).toFixed(2)} giây
                            </p>

                            {/* Actions */}
                            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Upload size={16} className="rotate-180" /> Quay lại upload
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={handleClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                                    <button
                                        onClick={handleConfirmImport}
                                        disabled={loading || !previewResult.canImport}
                                        className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        {previewResult.canImport ? `Xác nhận import (${validCount})` : 'Không thể import'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Import Result */}
                    {importResult && (
                        <div className="flex flex-col items-center text-center py-4 animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Import Thành Công!</h4>
                            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm font-medium">
                                Đã cập nhật bảng điểm cho lớp {className}
                            </p>

                            <div className="w-full bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-zinc-800">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-left">
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Thành công</p>
                                        <p className="text-2xl font-bold text-green-600 font-mono">{importResult.success}</p>
                                    </div>
                                    <div className="text-left border-l border-gray-200 dark:border-zinc-700 pl-4">
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Thất bại</p>
                                        <p className="text-2xl font-bold text-red-500 font-mono">{importResult.failed}</p>
                                    </div>
                                </div>
                            </div>

                            {importResult.errors.length > 0 && (
                                <div className="w-full max-h-32 overflow-y-auto text-xs text-red-600 text-left bg-red-50 dark:bg-red-900/10 rounded-lg p-4 mb-8 border border-red-100 dark:border-red-900/30">
                                    <p className="font-bold mb-1 underline">Chi tiết lỗi:</p>
                                    {importResult.errors.map((e, i) => <p key={i}>• {e}</p>)}
                                </div>
                            )}

                            <button
                                onClick={handleClose}
                                className="w-full py-3 bg-fpt-orange text-white rounded-xl font-bold shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition-all"
                            >
                                Hoàn tất
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
