import React, { useState, useCallback } from 'react';
import { X, Upload, Loader2, Download, AlertCircle } from 'lucide-react';
import { examGradeService } from '../../services/api/examGradeService';
import toast from 'react-hot-toast';

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

interface ImportExamGradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    courseCode: string;
    semesterCode: string;
    type: 'EXAM' | 'RESIT';
}

interface PreviewRow {
    rowNumber: number;
    studentCode: string;
    studentName: string;
    className: string;
    grades: { [componentId: number]: number | null };
    status: 'VALID' | 'ERROR' | 'SKIP';
    error?: string;
}

export const ImportExamGradeModal: React.FC<ImportExamGradeModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    courseCode,
    semesterCode,
    type
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [previewData, setPreviewData] = useState<{
        rows: PreviewRow[];
        totalRows: number;
        validRows: number;
        errorRows: number;
        components: { id: number; name: string; type: string }[];
    } | null>(null);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreviewData(null);
        }
    }, []);

    const handlePreview = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!file) {
            toast.error('Vui lòng chọn file Excel');
            return;
        }

        setLoading(true);
        try {
            const result = await examGradeService.previewExamGradeImport(courseCode, semesterCode, type, file);
            setPreviewData(result);
            if (result.validRows === 0) {
                toast.error('Không có dữ liệu hợp lệ để nhập');
            } else {
                toast.success(`Đã đọc ${result.totalRows} dòng, ${result.validRows} hợp lệ`);
            }
        } catch (error) {
            console.error('Preview error:', error);
            toast.error('Lỗi khi đọc file');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!file || !previewData || previewData.validRows === 0) return;

        setImporting(true);
        try {
            const result = await examGradeService.importExamGrades(courseCode, semesterCode, type, file);
            if (result.success) {
                toast.success(result.message);
                onSuccess();
                handleClose();
            } else {
                toast.error('Có lỗi xảy ra khi nhập điểm');
            }
        } catch (error) {
            console.error('Import error:', error);
            toast.error('Lỗi khi nhập điểm');
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            setLoading(true);
            await examGradeService.exportExamGrades(courseCode, semesterCode, type);
            toast.success('Đã tải file mẫu');
        } catch {
            toast.error('Không thể tải file mẫu');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreviewData(null);
        onClose();
    };

    const isResit = type === 'RESIT';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${previewData ? 'w-full max-w-6xl max-h-[92vh]' : 'w-full max-w-lg'}`}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {isResit ? 'Nhập điểm thi lại' : 'Nhập điểm thi'}
                        </h3>
                        {previewData ? (
                            <p className="text-sm text-gray-500 mt-1">
                                Xem trước: <span className="text-green-600 font-medium">{previewData.validRows} hợp lệ</span>
                                {previewData.errorRows > 0 && <> • <span className="text-red-500 font-medium">{previewData.errorRows} lỗi</span></>}
                                <span className="mx-2 text-gray-300">|</span> {courseCode} • {semesterCode}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-500 mt-1">
                                {courseCode} • {semesterCode}
                            </p>
                        )}
                    </div>
                    <button onClick={handleClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {!previewData ? (
                        // Step 1: Upload Form
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded-xl text-sm mb-4">
                                <div className="flex items-center gap-2 font-bold mb-2">
                                    <AlertCircle size={16} className="text-blue-600 dark:text-blue-400" />
                                    <span>Hướng dẫn quan trọng:</span>
                                </div>
                                <ul className="list-disc pl-5 space-y-1 text-xs opacity-90">
                                    <li>Sử dụng <span className="font-bold underline cursor-pointer" onClick={handleDownloadTemplate}>file mẫu Excel</span> để đảm bảo đúng cấu trúc cột (MSSV, Họ tên, Lớp, Tên điểm).</li>
                                    <li>Hệ thống hỗ trợ nhập: {isResit ? <span className="font-bold">Điểm Thi lại (Resit)</span> : <span className="font-bold">Điểm Midterm, Final và Practical Exam</span>}.</li>
                                    <li>Điểm nhập vào phải nằm trong dải từ <span className="font-bold">0.0 đến 10.0</span>.</li>
                                    <li>Những ô trống (không có dữ liệu) trong file Excel sẽ được <span className="font-semibold italic">BỎ QUA</span> (không cập nhật và không ghi đè dữ liệu cũ).</li>
                                </ul>
                            </div>

                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors font-semibold"
                            >
                                <Download size={18} />
                                Tải file mẫu Excel
                            </button>

                            <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-8 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors relative">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                                <Upload size={40} className="text-fpt-orange mb-3" />
                                {file ? (
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{file.name}</p>
                                        <p className="text-xs text-gray-500 mt-1 font-mono uppercase">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Chọn hoặc kéo thả file để tải lên</p>
                                        <p className="text-xs text-gray-400 mt-1">Chấp nhận định dạng Excel (.xlsx, .xls)</p>
                                    </>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={handleClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                                <button
                                    onClick={() => handlePreview()}
                                    disabled={loading || !file}
                                    className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading && <Loader2 size={16} className="animate-spin" />} Xem trước
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Step 2: Preview Table
                        <div className="space-y-4">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Tổng số dòng</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{previewData.totalRows}</div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-100 dark:border-green-900/30 flex flex-col items-center justify-center">
                                    <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1 flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        Hợp lệ
                                    </div>
                                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">{previewData.validRows}</div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-900/30 flex flex-col items-center justify-center">
                                    <div className="text-sm text-red-600 dark:text-red-400 font-medium mb-1 flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        Lỗi
                                    </div>
                                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">{previewData.errorRows}</div>
                                </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden border-gray-200 dark:border-zinc-700 shadow-sm">
                                <div className="overflow-x-auto max-h-[45vh]">
                                    <table className="w-full text-sm text-left min-w-max">
                                        <thead className="bg-gradient-to-r from-fpt-orange to-orange-500 text-white font-medium sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-3 w-12 text-center text-xs font-semibold">#</th>
                                                <th className="px-3 py-3 text-xs font-semibold whitespace-nowrap">MSSV</th>
                                                <th className="px-3 py-3 text-xs font-semibold whitespace-nowrap min-w-[140px]">Họ tên</th>
                                                <th className="px-3 py-3 text-xs font-semibold whitespace-nowrap">Lớp</th>
                                                {previewData.components.map(comp => (
                                                    <th key={comp.id} className="px-3 py-3 text-center text-xs font-semibold whitespace-nowrap min-w-[60px]">
                                                        <Tooltip content={comp.name}>
                                                            <span className="cursor-help">{comp.name}</span>
                                                        </Tooltip>
                                                    </th>
                                                ))}
                                                <th className="px-3 py-3 text-center text-xs font-semibold whitespace-nowrap bg-orange-600 sticky right-0">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                            {previewData.rows.map((row, index) => (
                                                <tr
                                                    key={index}
                                                    className={`hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${row.status === 'ERROR' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                                                >
                                                    <td className="px-3 py-2.5 text-center text-gray-400 text-xs font-medium">
                                                        {row.rowNumber.toString().padStart(2, '0')}
                                                    </td>
                                                    <td className="px-3 py-2.5 font-semibold text-fpt-orange text-xs whitespace-nowrap">
                                                        {row.studentCode}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap" title={row.studentName || ''}>
                                                        {row.studentName || '---'}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                                                        {row.className}
                                                    </td>
                                                    {previewData.components.map(comp => {
                                                        const grade = row.grades[comp.id];
                                                        const hasValue = grade !== null && grade !== undefined;
                                                        return (
                                                            <td key={comp.id} className="px-3 py-2.5 text-center text-xs">
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
                                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                            </span>
                                                        ) : row.status === 'SKIP' ? (
                                                            <span className="text-xs text-gray-400 font-medium italic">Bỏ qua</span>
                                                        ) : (
                                                            <Tooltip content={row.error || 'Lỗi dữ liệu'}>
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full cursor-help">
                                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
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
                            {previewData.errorRows > 0 && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800/30">
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-sm mb-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Chi tiết lỗi ({previewData.errorRows} dòng)
                                    </div>
                                    <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 max-h-24 overflow-y-auto">
                                        {previewData.rows
                                            .filter(row => row.status === 'ERROR')
                                            .slice(0, 5)
                                            .map((row, idx) => (
                                                <li key={idx} className="flex gap-2">
                                                    <span className="font-medium text-red-700">{row.studentCode}:</span>
                                                    <span>{row.error}</span>
                                                </li>
                                            ))
                                        }
                                        {previewData.errorRows > 5 && (
                                            <li className="text-red-500 italic">... và {previewData.errorRows - 5} lỗi khác</li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Actions */}
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
                                        onClick={handleImport}
                                        disabled={importing || previewData.validRows === 0}
                                        className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {importing && <Loader2 size={16} className="animate-spin" />}
                                        {previewData.validRows > 0 ? `Xác nhận import (${previewData.validRows})` : 'Không thể import'}
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

