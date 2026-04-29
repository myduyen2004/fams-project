import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import toast from "@utils/toast";

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title: string;
    templateUrl?: string;
    onImport: (file: File) => Promise<{ success: number; failed: number; errors?: string[] }>;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess, title, templateUrl, onImport }) => {
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<{ success: number; failed: number; errors?: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.csv')) {
                toast.error('Chỉ hỗ trợ file Excel (.xlsx) hoặc CSV');
                return;
            }
            setFile(selectedFile);
            setResult(null);
        }
    };

    const handleImport = async () => {
        if (!file) {
            toast.error('Vui lòng chọn file');
            return;
        }
        setLoading(true);
        try {
            const importResult = await onImport(file);
            setResult(importResult);
            if (importResult.success > 0) {
                toast.success(`Import thành công ${importResult.success} bản ghi`);
                onSuccess();
            }
            if (importResult.failed > 0) {
                toast.error(`Có ${importResult.failed} bản ghi lỗi`);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Import thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
                    <button onClick={handleClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    {/* Template Download */}
                    {templateUrl && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/10">
                            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-blue-900 dark:text-blue-300">Tải file mẫu</p>
                                <p className="text-xs text-blue-700 dark:text-blue-400">Sử dụng file mẫu để đảm bảo định dạng đúng</p>
                            </div>
                            <a href={templateUrl} download className="text-sm font-bold text-blue-600 hover:underline">Tải xuống</a>
                        </div>
                    )}

                    {/* File Upload */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-2xl p-8 text-center cursor-pointer hover:border-fpt-orange hover:bg-orange-50/10 transition-all group relative"
                    >
                        <input ref={fileInputRef} type="file" accept=".xlsx,.csv" onChange={handleFileChange} className="hidden" />
                        <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                        {file ? (
                            <p className="text-sm font-medium text-fpt-orange">{file.name}</p>
                        ) : (
                            <>
                                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">Kéo thả hoặc click để chọn file</p>
                                <p className="text-xs text-gray-500 mt-1">Hỗ trợ .xlsx, .csv</p>
                            </>
                        )}
                    </div>

                    {/* Result */}
                    {result && (
                        <div className={`p-4 rounded-2xl border ${result.failed > 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' : 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className={`h-4 w-4 ${result.failed > 0 ? 'text-red-600' : 'text-green-600'}`} />
                                <span className={`text-sm font-bold ${result.failed > 0 ? 'text-red-700' : 'text-green-700'}`}>Thành công: {result.success} | Lỗi: {result.failed}</span>
                            </div>
                            {result.errors && result.errors.length > 0 && (
                                <ul className="text-xs text-red-600/80 space-y-1 max-h-32 overflow-y-auto font-medium">
                                    {result.errors.slice(0, 5).map((err, i) => <li key={i} className="flex gap-1"><span>•</span> <span>{err}</span></li>)}
                                    {result.errors.length > 5 && <li className="pl-3 font-bold underline cursor-help">... và {result.errors.length - 5} lỗi khác</li>}
                                </ul>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <button type="button" onClick={handleClose} className="h-[44px] px-6 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all active:scale-95">Đóng</button>
                        <button onClick={handleImport} disabled={loading || !file} className="flex items-center justify-center gap-2 h-[44px] px-6 rounded-2xl bg-fpt-orange text-sm font-bold text-white hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 disabled:opacity-50">
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Bắt đầu Import
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

