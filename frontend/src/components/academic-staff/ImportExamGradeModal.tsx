import React, { useState, useCallback } from 'react';
import { X, Upload, Loader2, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { examGradeService } from '../../services/api/examGradeService';
import toast from 'react-hot-toast';

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

    const handlePreview = async () => {
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

    const handleClose = () => {
        setFile(null);
        setPreviewData(null);
        onClose();
    };


    const isResit = type === 'RESIT';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full ${previewData ? 'max-w-5xl' : 'max-w-md'} border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh]`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0 bg-gradient-to-r ${isResit ? 'from-purple-50 to-white dark:from-purple-900/10 dark:to-zinc-900' : 'from-orange-50 to-white dark:from-orange-900/10 dark:to-zinc-900'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isResit ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                            <FileSpreadsheet size={20} className={isResit ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {isResit ? 'Nhập điểm thi lại' : 'Nhập điểm thi'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {courseCode} - {semesterCode}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5 text-gray-500 dark:text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {!previewData ? (
                        // Upload Form
                        <div className="space-y-4">
                            <div className={`p-4 rounded-lg text-sm ${isResit ? 'bg-purple-50 dark:bg-purple-900/10 text-purple-800 dark:text-purple-300' : 'bg-orange-50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300'}`}>
                                <p className="font-semibold mb-2">Hướng dẫn:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Tải lên file <strong>.xlsx</strong> chứa điểm {isResit ? 'thi lại' : 'thi'}</li>
                                    <li>File cần có cột: MSSV, Họ tên, Lớp, {isResit ? 'Resit' : 'Midterm, Final, PE'}</li>
                                    <li>Điểm phải từ 0-10, có thể có 1 chữ số thập phân</li>
                                </ul>
                            </div>

                            <div className="border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-xl p-8 text-center hover:border-gray-400 dark:hover:border-zinc-500 transition-colors">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <Upload size={48} className="mx-auto text-gray-400 mb-3" />
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {file ? file.name : 'Kéo thả hoặc click để chọn file'}
                                    </p>
                                </label>
                            </div>

                            <button
                                onClick={handlePreview}
                                disabled={!file || loading}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50 ${isResit ? 'bg-purple-600 hover:bg-purple-700' : 'bg-fpt-orange hover:bg-orange-600'}`}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                                Xem trước
                            </button>
                        </div>
                    ) : (
                        // Preview Table
                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                    <CheckCircle size={16} className="text-green-600" />
                                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                        {previewData.validRows} hợp lệ
                                    </span>
                                </div>
                                {previewData.errorRows > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                                        <AlertCircle size={16} className="text-red-600" />
                                        <span className="text-sm font-medium text-red-700 dark:text-red-400">
                                            {previewData.errorRows} lỗi
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Table */}
                            <div className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto max-h-[400px]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Dòng</th>
                                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">MSSV</th>
                                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Họ tên</th>
                                                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Lớp</th>
                                                {previewData.components.map(comp => (
                                                    <th key={comp.id} className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">
                                                        {comp.name}
                                                    </th>
                                                ))}
                                                <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                                            {previewData.rows.map((row) => (
                                                <tr key={row.rowNumber} className={`${row.status === 'ERROR' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.rowNumber}</td>
                                                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.studentCode}</td>
                                                    <td className="px-3 py-2 text-gray-900 dark:text-white">{row.studentName}</td>
                                                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.className}</td>
                                                    {previewData.components.map(comp => (
                                                        <td key={comp.id} className="px-3 py-2 text-center">
                                                            {row.grades[comp.id] !== null && row.grades[comp.id] !== undefined
                                                                ? row.grades[comp.id]?.toFixed(1)
                                                                : '-'}
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2 text-center">
                                                        {row.status === 'VALID' && (
                                                            <span className="inline-flex items-center gap-1 text-green-600">
                                                                <CheckCircle size={14} /> OK
                                                            </span>
                                                        )}
                                                        {row.status === 'ERROR' && (
                                                            <span className="inline-flex items-center gap-1 text-red-600" title={row.error}>
                                                                <AlertCircle size={14} /> Lỗi
                                                            </span>
                                                        )}
                                                        {row.status === 'SKIP' && (
                                                            <span className="text-gray-400">Bỏ qua</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {previewData && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-zinc-800 shrink-0">
                        <button
                            onClick={() => setPreviewData(null)}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            Quay lại
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={importing || previewData.validRows === 0}
                            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-all disabled:opacity-50 ${isResit ? 'bg-purple-600 hover:bg-purple-700' : 'bg-fpt-orange hover:bg-orange-600'}`}
                        >
                            {importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                            Nhập {previewData.validRows} điểm
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
