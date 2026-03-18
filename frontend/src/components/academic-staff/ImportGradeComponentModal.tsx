import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { gradeComponentService, GradeComponent, GradeType } from '../../services/api/gradeComponentService';
import * as XLSX from 'xlsx';

// =========================================================================
// Types
// =========================================================================

const VALID_TYPES: GradeType[] = [
    'PROGRESS_TEST', 'MID_TERM', 'FINAL_EXAM', 'PRACTICAL_EXAM',
    'ASSIGNMENT', 'QUIZ', 'WORKSHOP', 'PROJECT', 'PRESENTATION',
    'PARTICIPATION', 'OTHER',
];

const TYPE_LABELS: Record<string, string> = {
    PROGRESS_TEST: 'Progress Test',
    MID_TERM: 'Midterm Exam',
    FINAL_EXAM: 'Final Exam',
    PRACTICAL_EXAM: 'Practical Exam',
    ASSIGNMENT: 'Assignment',
    QUIZ: 'Quiz',
    WORKSHOP: 'Workshop',
    PROJECT: 'Project',
    PRESENTATION: 'Presentation',
    PARTICIPATION: 'Participation',
    OTHER: 'Other',
};

type RowStatus = 'VALID' | 'WARNING' | 'ERROR';

interface PreviewRow {
    rowNumber: number;
    courseCode: string;
    name: string;
    type: string;
    weight: number | '';
    description: string;
    status: RowStatus;
    errors: string[];
    warnings: string[];
}

interface ImportGradeComponentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    /** Existing components for the course currently in view – used for weight/duplicate validation */
    existingComponents?: GradeComponent[];
}

// =========================================================================
// Helpers
// =========================================================================

function parseWeight(val: unknown): number | null {
    const n = typeof val === 'number' ? val : parseFloat(String(val ?? ''));
    return isNaN(n) ? null : n;
}


// =========================================================================
// Main Component
// =========================================================================

export const ImportGradeComponentModal: React.FC<ImportGradeComponentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    existingComponents = [],
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
    const [importResult, setImportResult] = useState<{
        created: number;
        updated: number;
        failed: number;
        errors: string[];
    } | null>(null);

    // -----------------------------------------------------------------------
    // File handler
    // -----------------------------------------------------------------------
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) { setFile(f); setPreviewRows(null); setImportResult(null); }
    };

    // -----------------------------------------------------------------------
    // Preview (read + validate client-side)
    // -----------------------------------------------------------------------
    const handlePreview = async () => {
        if (!file) return;
        setLoading(true);
        try {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer);
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

            if (raw.length === 0) {
                setPreviewRows([]);
                return;
            }

            // Track names & courseCode+type combos seen IN THIS FILE for duplicate detection
            const namesInFile = new Set<string>();
            const typesByCourse = new Map<string, Set<string>>(); // courseCode -> Set<type>

            // Also compute current total weight per courseCode from existing components
            const existingWeightByCourse: Record<string, number> = {};
            for (const comp of existingComponents) {
                if (comp.courseCode && !comp.isResit) {
                    existingWeightByCourse[comp.courseCode] = (existingWeightByCourse[comp.courseCode] || 0) + comp.weight;
                }
            }

            // Running accumulated weight for valid rows per courseCode
            const accumulatedWeight: Record<string, number> = {};

            const rows: PreviewRow[] = raw.map((r, idx) => {
                const rowNumber = idx + 2; // row 1 is header in Excel
                const errors: string[] = [];
                const warnings: string[] = [];

                const courseCode = String(r['courseCode'] ?? r['Mã môn'] ?? '').trim();
                const name = String(r['name'] ?? r['Tên'] ?? '').trim();
                const typeRaw = String(r['type'] ?? r['Loại'] ?? '').trim().toUpperCase();
                const weightRaw = r['weight'] ?? r['Trọng số'];
                const description = String(r['description'] ?? r['Mô tả'] ?? '').trim();
                const weight = parseWeight(weightRaw);

                // --- Mandatory fields ---
                if (!courseCode) errors.push('Thiếu mã môn học (courseCode)');
                if (!name) errors.push('Thiếu tên thành phần điểm (name)');

                if (!typeRaw) {
                    errors.push('Thiếu loại thành phần điểm (type)');
                } else if (!VALID_TYPES.includes(typeRaw as GradeType)) {
                    errors.push(`Loại không hợp lệ: "${typeRaw}". Hợp lệ: ${VALID_TYPES.join(', ')}`);
                }

                if (weight === null) {
                    errors.push('Trọng số (weight) phải là số');
                } else if (weight <= 0) {
                    errors.push('Trọng số phải lớn hơn 0');
                } else if (weight > 100) {
                    errors.push('Trọng số không được vượt quá 100');
                }

                // --- Duplicate name in file ---
                const nameKey = `${courseCode}::${name.toLowerCase()}`;
                if (name && namesInFile.has(nameKey)) {
                    errors.push(`Tên "${name}" bị trùng trong file`);
                } else if (name) {
                    namesInFile.add(nameKey);
                }

                // --- Duplicate type within same course in file (only single FINAL_EXAM allowed) ---
                if (courseCode && typeRaw && VALID_TYPES.includes(typeRaw as GradeType)) {
                    if (!typesByCourse.has(courseCode)) typesByCourse.set(courseCode, new Set());
                    const types = typesByCourse.get(courseCode)!;
                    if (typeRaw === 'FINAL_EXAM' && types.has('FINAL_EXAM')) {
                        warnings.push('Môn học này đã có Final Exam trong file (chỉ được 1)');
                    }
                    types.add(typeRaw);
                }

                // --- Weight exceeding 100% for course ---
                if (errors.length === 0 && weight !== null && courseCode) {
                    const existing = existingWeightByCourse[courseCode] || 0;
                    const accumulated = accumulatedWeight[courseCode] || 0;
                    const projected = existing + accumulated + weight;
                    if (projected > 100) {
                        errors.push(
                            `Thêm dòng này sẽ làm tổng trọng số vượt 100% (${projected.toFixed(1)}%).`
                        );
                    } else {
                        // Only accumulate for valid rows that won't exceed
                        accumulatedWeight[courseCode] = accumulated + weight;
                    }
                }

                let status: RowStatus = 'VALID';
                if (errors.length > 0) status = 'ERROR';
                else if (warnings.length > 0) status = 'WARNING';

                return {
                    rowNumber,
                    courseCode,
                    name,
                    type: typeRaw,
                    weight: weight ?? '',
                    description,
                    status,
                    errors,
                    warnings,
                };
            });

            setPreviewRows(rows);
        } catch (err) {
            console.error(err);
            setPreviewRows([]);
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------------------------------------------------
    // Confirm import (only VALID rows)
    // -----------------------------------------------------------------------
    const handleConfirmImport = async () => {
        if (!previewRows) return;
        const validRows = previewRows.filter(r => r.status === 'VALID');
        if (validRows.length === 0) return;

        setLoading(true);
        try {
            const payload = validRows.map(r => ({
                courseCode: r.courseCode,
                name: r.name,
                type: r.type,
                weight: r.weight,
                description: r.description,
            }));
            const result = await gradeComponentService.importGradeComponents(payload);
            setImportResult(result);
            if (result.created > 0 || result.updated > 0) {
                onSuccess();
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
            setImportResult({ created: 0, updated: 0, failed: validRows.length, errors: [msg] });
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------------------------------------------------
    // Reset & close
    // -----------------------------------------------------------------------
    const handleClose = () => {
        setFile(null);
        setPreviewRows(null);
        setImportResult(null);
        onClose();
    };

    // -----------------------------------------------------------------------
    // Generate Template Client-side
    // -----------------------------------------------------------------------
    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'courseCode': 'PRJ301',
                'name': 'Progress Test 1',
                'type': 'PROGRESS_TEST',
                'weight': 10,
                'description': 'Kiểm tra quá trình',
            },
            {
                'courseCode': 'PRJ301',
                'name': 'Final Exam',
                'type': 'FINAL_EXAM',
                'weight': 40,
                'description': 'Thi cuối kỳ',
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);

        // Cấu hình độ rộng cột cho đẹp
        const colWidths = [
            { wch: 15 }, // courseCode
            { wch: 25 }, // name
            { wch: 20 }, // type
            { wch: 10 }, // weight
            { wch: 30 }, // description
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'GradeComponentsTemplate');

        XLSX.writeFile(wb, 'Template_Import_ThanhPhanDiem.xlsx');
    };

    if (!isOpen) return null;

    // -----------------------------------------------------------------------
    // Derived counts
    // -----------------------------------------------------------------------
    const validCount = previewRows?.filter(r => r.status === 'VALID').length ?? 0;
    const warnCount = previewRows?.filter(r => r.status === 'WARNING').length ?? 0;
    const errorCount = previewRows?.filter(r => r.status === 'ERROR').length ?? 0;
    const hasPreview = previewRows !== null;
    const hasResult = importResult !== null;

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    const modal = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${hasPreview ? 'w-full max-w-5xl max-h-[92vh]' : 'w-full max-w-lg'}`}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                            <FileSpreadsheet size={20} className="text-fpt-orange" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Import Thành phần điểm</h2>
                            {hasPreview && !hasResult && (
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Xem trước:&nbsp;
                                    <span className="text-green-600 font-medium">{validCount} hợp lệ</span>
                                    {warnCount > 0 && <> • <span className="text-yellow-600 font-medium">{warnCount} cảnh báo</span></>}
                                    {errorCount > 0 && <> • <span className="text-red-500 font-medium">{errorCount} lỗi</span></>}
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {/* === STEP 1: Upload === */}
                    {!hasPreview && !hasResult && (
                        <>
                            {/* Format guide */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded-xl text-sm mb-4">
                                <div className="flex items-center gap-2 font-bold mb-2">
                                    <AlertCircle size={16} className="text-blue-600 dark:text-blue-400" />
                                    <span>Hướng dẫn quan trọng:</span>
                                </div>
                                <ul className="list-disc pl-5 space-y-1 text-xs opacity-90">
                                    <li>Sử dụng <span className="font-bold underline cursor-pointer" onClick={handleDownloadTemplate}>file mẫu Excel</span> để đảm bảo đúng cấu trúc (Mã môn, Tên, Loại, Trọng số).</li>
                                    <li>Các loại thành phần hợp lệ (Type): <span className="font-mono text-[10px] break-all">{VALID_TYPES.join(', ')}</span>.</li>
                                    <li>Mỗi môn học chỉ được phép có <span className="font-bold italic text-blue-700 dark:text-blue-400">duy nhất một</span> thành phần loại <span className="font-bold">FINAL_EXAM</span>.</li>
                                    <li>Tổng <span className="font-bold text-red-600 dark:text-red-400 underline">trọng số (%)</span> của tất cả đầu điểm trong cùng một môn không được vượt quá <span className="font-bold underline">100%</span>.</li>
                                </ul>
                            </div>

                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors font-semibold"
                            >
                                <FileSpreadsheet size={18} />
                                Tải file mẫu Excel
                            </button>

                            {/* Dropzone */}
                            <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors relative">
                                <input type="file" accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
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
                        </>
                    )}

                    {/* === STEP 2: Preview table === */}
                    {hasPreview && !hasResult && (
                        <>
                            {previewRows!.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <AlertCircle size={40} className="mb-3" />
                                    <p className="text-sm">File không có dữ liệu hợp lệ</p>
                                </div>
                            ) : (
                                <div className="border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-zinc-700">
                                            <tr>
                                                <th className="px-3 py-3 w-10 text-center">#</th>
                                                <th className="px-3 py-3">Mã môn</th>
                                                <th className="px-3 py-3">Tên</th>
                                                <th className="px-3 py-3">Loại</th>
                                                <th className="px-3 py-3 text-center">Trọng số</th>
                                                <th className="px-3 py-3 text-center">Bắt buộc</th>
                                                <th className="px-3 py-3 text-center">Kết quả</th>
                                                <th className="px-3 py-3">Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                            {previewRows!.map(row => (
                                                <tr key={row.rowNumber}
                                                    className={
                                                        row.status === 'ERROR'
                                                            ? 'bg-red-50 dark:bg-red-900/10'
                                                            : row.status === 'WARNING'
                                                                ? 'bg-yellow-50 dark:bg-yellow-900/10'
                                                                : ''
                                                    }
                                                >
                                                    <td className="px-3 py-2.5 text-center text-gray-400 text-xs">{row.rowNumber}</td>
                                                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300">{row.courseCode || <span className="text-red-400 italic">trống</span>}</td>
                                                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white max-w-[150px] truncate" title={row.name}>{row.name || <span className="text-red-400 italic">trống</span>}</td>
                                                    <td className="px-3 py-2.5">
                                                        {row.type && VALID_TYPES.includes(row.type as GradeType) ? (
                                                            <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                                                {TYPE_LABELS[row.type] ?? row.type}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-red-500 italic">{row.type || 'trống'}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        {row.weight !== '' ? (
                                                            <span className="font-semibold text-gray-900 dark:text-white">{row.weight}%</span>
                                                        ) : (
                                                            <span className="text-red-400 italic text-xs">trống</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        {row.status === 'VALID' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium rounded-full">
                                                                <CheckCircle2 size={11} /> Hợp lệ
                                                            </span>
                                                        )}
                                                        {row.status === 'WARNING' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium rounded-full">
                                                                <AlertTriangle size={11} /> Cảnh báo
                                                            </span>
                                                        )}
                                                        {row.status === 'ERROR' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium rounded-full">
                                                                <AlertCircle size={11} /> Lỗi
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 max-w-xs">
                                                        {row.errors.map((e, i) => (
                                                            <p key={i} className="text-xs text-red-600 dark:text-red-400">• {e}</p>
                                                        ))}
                                                        {row.warnings.map((w, i) => (
                                                            <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400">• {w}</p>
                                                        ))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {/* === STEP 3: Import result === */}
                    {hasResult && (
                        <div className={`rounded-xl p-5 ${importResult!.failed > 0 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}>
                            <div className="flex items-center gap-2 mb-4">
                                {importResult!.failed > 0
                                    ? <AlertCircle size={20} className="text-red-500" />
                                    : <CheckCircle2 size={20} className="text-green-500" />
                                }
                                <span className="font-semibold text-gray-900 dark:text-white text-lg">Kết quả Import</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-green-600">{importResult!.created}</div>
                                    <div className="text-xs text-gray-500 mt-1">Tạo mới</div>
                                </div>
                                <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-blue-600">{importResult!.updated}</div>
                                    <div className="text-xs text-gray-500 mt-1">Cập nhật</div>
                                </div>
                                <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-red-600">{importResult!.failed}</div>
                                    <div className="text-xs text-gray-500 mt-1">Thất bại</div>
                                </div>
                            </div>
                            {importResult!.errors.length > 0 && (
                                <div className="max-h-36 overflow-y-auto text-xs text-red-600 dark:text-red-400 space-y-1 bg-white dark:bg-zinc-800 rounded-lg p-3">
                                    {importResult!.errors.map((e, i) => <p key={i}>• {e}</p>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-100 dark:border-zinc-800 shrink-0">
                    <div className="text-xs text-gray-400">
                        {hasPreview && !hasResult && previewRows!.length > 0 && (
                            <>
                                {validCount > 0 && `${validCount} dòng sẽ được import`}
                                {warnCount > 0 && ` · ${warnCount} cảnh báo (không import những dòng này)`}
                                {errorCount > 0 && ` · ${errorCount} lỗi (bị bỏ qua)`}
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {hasResult ? (
                            <button onClick={handleClose} className="px-5 py-2.5 text-sm font-medium text-white bg-fpt-orange hover:bg-orange-600 rounded-xl transition-colors">
                                Đóng
                            </button>
                        ) : hasPreview ? (
                            <>
                                <button onClick={() => setPreviewRows(null)} disabled={loading}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50">
                                    Quay lại
                                </button>
                                <button onClick={handleConfirmImport} disabled={loading || validCount === 0}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-fpt-orange text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
                                    {loading ? <><Loader2 size={15} className="animate-spin" /> Đang import...</> : <>
                                        <CheckCircle2 size={15} />
                                        Xác nhận Import ({validCount} dòng)
                                    </>}
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={handleClose}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                                    Hủy
                                </button>
                                <button onClick={handlePreview} disabled={!file || loading}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-fpt-orange text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
                                    {loading ? <><Loader2 size={15} className="animate-spin" /> Đang đọc...</> : <><Upload size={15} /> Xem trước</>}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};
