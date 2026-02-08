import React, { useState, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { gradeComponentService } from '../../services/api/gradeComponentService';
import * as XLSX from 'xlsx';

interface ImportGradeComponentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const ImportGradeComponentModal: React.FC<ImportGradeComponentModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{
        created: number;
        updated: number;
        failed: number;
        errors: string[];
    } | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            setFile(droppedFile);
            setResult(null);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setImporting(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

            if (jsonData.length === 0) {
                setResult({ created: 0, updated: 0, failed: 0, errors: ['File rỗng hoặc không có dữ liệu hợp lệ'] });
                return;
            }

            const importResult = await gradeComponentService.importGradeComponents(jsonData);
            setResult(importResult);

            if (importResult.created > 0 || importResult.updated > 0) {
                onSuccess();
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
            setResult({ created: 0, updated: 0, failed: 1, errors: [`Lỗi khi import: ${errorMessage}`] });
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <FileSpreadsheet size={20} className="text-fpt-orange" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Import Thành phần điểm</h2>
                            <p className="text-xs text-gray-500">Nhập thành phần điểm từ file Excel</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Format Guide */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                        <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Định dạng file Excel:</p>
                        <p className="text-blue-700 dark:text-blue-400 text-xs">
                            Cột bắt buộc: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">courseCode</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">name</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">type</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">weight</code>
                        </p>
                        <p className="text-blue-700 dark:text-blue-400 text-xs mt-1">
                            Cột tùy chọn: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">description</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">isRequired</code>
                        </p>
                        <p className="text-blue-700 dark:text-blue-400 text-xs mt-1">
                            Type: PROGRESS_TEST, MID_TERM, FINAL_EXAM, PRACTICAL_EXAM, ASSIGNMENT, QUIZ, WORKSHOP, PROJECT, PRESENTATION
                        </p>
                    </div>

                    {/* Dropzone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${isDragging
                                ? 'border-fpt-orange bg-orange-50 dark:bg-orange-900/10'
                                : 'border-gray-200 dark:border-zinc-700 hover:border-fpt-orange'
                            }`}
                    >
                        <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Kéo thả file Excel vào đây hoặc
                        </p>
                        <label className="cursor-pointer">
                            <span className="text-fpt-orange hover:underline text-sm font-medium">chọn file từ máy</span>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                        {file && (
                            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <FileSpreadsheet size={16} className="text-green-500" />
                                <span className="font-medium">{file.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Result */}
                    {result && (
                        <div className={`rounded-lg p-3 ${result.failed > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                {result.failed > 0 ? (
                                    <AlertCircle size={18} className="text-red-500" />
                                ) : (
                                    <CheckCircle2 size={18} className="text-green-500" />
                                )}
                                <span className="font-medium text-gray-900 dark:text-white">Kết quả import</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                                <div className="bg-white dark:bg-zinc-800 rounded p-2 text-center">
                                    <div className="text-lg font-bold text-green-600">{result.created}</div>
                                    <div className="text-xs text-gray-500">Tạo mới</div>
                                </div>
                                <div className="bg-white dark:bg-zinc-800 rounded p-2 text-center">
                                    <div className="text-lg font-bold text-blue-600">{result.updated}</div>
                                    <div className="text-xs text-gray-500">Cập nhật</div>
                                </div>
                                <div className="bg-white dark:bg-zinc-800 rounded p-2 text-center">
                                    <div className="text-lg font-bold text-red-600">{result.failed}</div>
                                    <div className="text-xs text-gray-500">Thất bại</div>
                                </div>
                            </div>
                            {result.errors.length > 0 && (
                                <div className="mt-2 max-h-32 overflow-y-auto text-xs text-red-600 dark:text-red-400 space-y-1">
                                    {result.errors.map((error, index) => (
                                        <p key={index}>• {error}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-zinc-800">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        {result ? 'Đóng' : 'Hủy'}
                    </button>
                    {!result && (
                        <button
                            onClick={handleImport}
                            disabled={!file || importing}
                            className="flex items-center gap-2 px-4 py-2 bg-fpt-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                            {importing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Đang import...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} />
                                    Import
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
