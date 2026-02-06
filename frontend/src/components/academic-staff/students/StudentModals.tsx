import React, { useState, useEffect } from 'react';
import { X, Loader2, Upload, Mail, Phone, Calendar, GraduationCap, BookOpen, Stars } from 'lucide-react';
import { StudentResponse, academicStaffService, StudentImportDTO } from '../../../services/api/academicStaffService';
import toast from 'react-hot-toast';

// --- Helper functions ---
const formatDateTime = (date: unknown) => {
    if (!date) return '---';

    try {
        let d: Date;
        if (Array.isArray(date)) {
            const [year, month, day, hour = 0, minute = 0, second = 0] = date as any[];
            d = new Date(year, month - 1, day, hour, minute, second);
        } else {
            d = new Date(date as string | number | Date);
        }

        if (isNaN(d.getTime())) return '---';
        return d.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '---';
    }
};

const formatDate = (date: unknown) => {
    if (!date) return '---';

    try {
        let d: Date;
        if (Array.isArray(date)) {
            const [year, month, day] = date as any[];
            d = new Date(year, month - 1, day);
        } else {
            d = new Date(date as string | number | Date);
        }

        if (isNaN(d.getTime())) return '---';
        return d.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return '---';
    }
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'ACTIVE':
            return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Hoạt động</span>;
        case 'LOCKED':
            return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Đã khóa</span>;
        case 'INACTIVE':
            return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Chưa kích hoạt</span>;
        default:
            return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">{status}</span>;
    }
};

const getErrorMessage = (error: unknown, defaultMessage: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        return axiosError.response?.data?.message || defaultMessage;
    }
    return defaultMessage;
};

// --- ViewStudentModal ---
export const ViewStudentModal: React.FC<{
    student: StudentResponse;
    onClose: () => void;
}> = ({ student, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Thông tin Sinh viên</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-fpt-orange to-orange-400 border-2 border-orange-100 dark:border-orange-900/20 flex items-center justify-center text-white text-2xl font-bold">
                            {student.avatar ? (
                                <img src={`${student.avatar}${student.avatar.includes('?') ? '&' : '?'}t=${new Date().getTime()}`} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <GraduationCap size={40} />
                            )}
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white">{student.fullName}</h4>
                            <p className="text-gray-500 dark:text-zinc-400 font-mono">{student.code}</p>
                            <div className="mt-2">
                                {getStatusBadge(student.status)}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <span>{student.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                            <Phone className="w-5 h-5 text-gray-400" />
                            <span>{student.phone || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <span>Ngày sinh: {formatDate(student.dob)}</span>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                            <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <BookOpen size={16} className="text-fpt-orange" />
                                Thông tin học tập
                            </h5>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-400">Ngành học</p>
                                    <p className="font-medium text-gray-700 dark:text-gray-300">{student.major || '---'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Chuyên ngành</p>
                                    <p className="font-medium text-gray-700 dark:text-gray-300">{student.specialization || '---'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Khóa</p>
                                    <p className="font-medium text-gray-700 dark:text-gray-300">{student.course || '---'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">GPA</p>
                                    <p className="font-medium text-green-600 flex items-center gap-1">
                                        <Stars size={14} className="fill-green-600" />
                                        {student.gpa !== null && student.gpa !== undefined ? student.gpa.toFixed(2) : '---'}
                                    </p>
                                </div>
                                {student.subSpecialization && (
                                    <div className="col-span-2">
                                        <p className="text-gray-400">Chuyên ngành phụ/Combo</p>
                                        <p className="font-medium text-gray-700 dark:text-gray-300">{student.subSpecialization}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-400">Ngày tạo hệ thống</p>
                                    <p className="text-gray-700 dark:text-gray-300">{formatDateTime(student.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Lần đăng nhập cuối</p>
                                    <p className="text-gray-700 dark:text-gray-300">{formatDateTime(student.lastLogin)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4">
                        <button onClick={onClose} className="px-6 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">Đóng</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- EditStudentModal ---
export const EditStudentModal: React.FC<{ student: StudentResponse; onClose: () => void; onSuccess: () => void }> = ({ student, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [majors, setMajors] = useState<string[]>([]);
    const [specializations, setSpecializations] = useState<string[]>([]);
    const [subSpecializations, setSubSpecializations] = useState<string[]>([]);

    const ensureStringDate = (d: unknown): string => {
        if (Array.isArray(d)) {
            const [year, month, day] = d as unknown[];
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        return (d as string) || '';
    };

    const [formData, setFormData] = useState({
        fullName: student.fullName,
        code: student.code,
        email: student.email,
        dob: ensureStringDate(student.dob),
        phone: student.phone || '',
        status: student.status,
        major: student.major || '',
        specialization: student.specialization || '',
        subSpecialization: student.subSpecialization || '',
        course: student.course || '',
        gpa: student.gpa || 0
    });

    useEffect(() => {
        const fetchMajors = async () => {
            try {
                const m = await academicStaffService.getAllMajors();
                setMajors(m);
            } catch (error) {
                console.error('Failed to fetch majors');
            }
        };
        fetchMajors();
    }, []);

    useEffect(() => {
        const fetchSpecs = async () => {
            if (formData.major) {
                try {
                    const s = await academicStaffService.getSpecializationsByMajor(formData.major);
                    setSpecializations(s);
                } catch (error) {
                    console.error('Failed to fetch specializations');
                    setSpecializations([]);
                }
            } else {
                setSpecializations([]);
            }
        };
        fetchSpecs();
    }, [formData.major]);

    useEffect(() => {
        const fetchSubSpecs = async () => {
            if (formData.specialization) {
                try {
                    const ss = await academicStaffService.getSubSpecializationsBySpecialization(formData.specialization);
                    setSubSpecializations(ss);
                } catch (error) {
                    console.error('Failed to fetch combos');
                    setSubSpecializations([]);
                }
            } else {
                setSubSpecializations([]);
            }
        };
        fetchSubSpecs();
    }, [formData.specialization]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await academicStaffService.updateStudent(student.id, {
                fullName: formData.fullName,
                code: formData.code,
                email: formData.email,
                dob: formData.dob,
                phone: formData.phone,
                status: formData.status as any,
                role: 'STUDENT',
                major: formData.major,
                specialization: formData.specialization,
                subSpecialization: formData.subSpecialization,
                course: formData.course,
                gpa: formData.gpa
            });
            toast.success('Cập nhật thông tin sinh viên thành công');
            onSuccess();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi cập nhật sinh viên'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Chỉnh sửa hồ sơ sinh viên</h3>
                        <p className="text-xs text-gray-500 mt-1">Sinh viên: {student.fullName} ({student.code})</p>
                    </div>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 text-center mb-2">
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-fpt-orange mx-auto bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
                                {student.avatar ? <img src={student.avatar} alt="avatar" className="w-full h-full object-cover" /> : <GraduationCap size={32} className="text-gray-300" />}
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Họ và tên</label>
                            <input
                                disabled
                                type="text"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                                value={formData.fullName}
                                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Số điện thoại</label>
                            <input
                                disabled
                                type="text"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Ngày sinh</label>
                            <input
                                disabled
                                type="date"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                                value={formData.dob}
                                onChange={e => setFormData({ ...formData, dob: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Trạng thái</label>
                            <select
                                disabled
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            >
                                <option value="ACTIVE">Hoạt động</option>
                                <option value="LOCKED">Đã khóa</option>
                                <option value="INACTIVE">Chưa kích hoạt</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Mã sinh viên</label>
                            <input readOnly type="text" className="w-full px-4 py-2 bg-gray-100 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm outline-none cursor-not-allowed text-gray-500" value={formData.code} />
                        </div>

                        <div className="col-span-2 pt-2 pb-1">
                            <div className="h-px bg-gray-100 dark:bg-zinc-800 w-full"></div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Ngành học</label>
                            <select
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                                value={formData.major}
                                onChange={e => setFormData({ ...formData, major: e.target.value, specialization: '', subSpecialization: '' })}
                            >
                                <option value="">Chọn ngành</option>
                                {majors.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Chuyên ngành</label>
                            <select
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                                value={formData.specialization}
                                onChange={e => setFormData({ ...formData, specialization: e.target.value, subSpecialization: '' })}
                                disabled={!formData.major}
                            >
                                <option value="">Chọn chuyên ngành</option>
                                {specializations.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Chuyên ngành phụ / Combo</label>
                            <select
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white disabled:opacity-50"
                                value={formData.subSpecialization}
                                onChange={e => setFormData({ ...formData, subSpecialization: e.target.value })}
                                disabled={!formData.specialization}
                            >
                                <option value="">Chọn combo</option>
                                {subSpecializations.map(ss => <option key={ss} value={ss}>{ss}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Khóa học</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                                placeholder="VD: K18"
                                value={formData.course}
                                onChange={e => setFormData({ ...formData, course: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">GPA Hiện tại</label>
                            <input
                                disabled
                                type="number"
                                step="0.01"
                                min="0"
                                max="4"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                                value={formData.gpa}
                                onChange={e => setFormData({ ...formData, gpa: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                            {loading && <Loader2 size={16} className="animate-spin" />} Lưu thay đổi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Fast Preview Response type
interface FastPreviewResponse {
    success: boolean;
    totalRows: number;
    validRows: number;
    errorRows: number;
    canImport: boolean;
    sampleErrors: Array<{ row: string; code: string; error: string }>;
    durationMs: number;
    message: string;
}

// --- ImportStudentModal ---
export const ImportStudentModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewResult, setPreviewResult] = useState<FastPreviewResponse | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPreviewResult(null);
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
            const result = await academicStaffService.fastPreviewImportStudents(file);
            setPreviewResult(result);
            if (result.canImport) {
                toast.success(`${result.validRows} dòng hợp lệ, sẵn sàng import!`);
            } else if (result.errorRows > 0) {
                toast.error(`Có ${result.errorRows} lỗi. Vui lòng sửa file và thử lại.`);
            } else if (result.totalRows === 0) {
                toast('File không có dữ liệu hợp lệ', { icon: '⚠️' });
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi đọc file'));
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!file || !previewResult?.canImport) return;

        try {
            setLoading(true);
            const result = await academicStaffService.importStudents(file);

            const totalSuccess = result.created + result.updated;
            if (totalSuccess > 0) {
                toast.success(`Thành công: ${result.created} tạo mới, ${result.updated} cập nhật hồ sơ`);
            }

            if (result.failed > 0) {
                toast.error(`${result.failed} dòng bị lỗi`);
            }

            onSuccess();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi lưu dữ liệu'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import hồ sơ sinh viên</h3>
                        {previewResult && (
                            <p className="text-sm text-gray-500 mt-1">
                                Kiểm tra: <span className="text-green-600 font-medium">{previewResult.validRows} hợp lệ</span> • <span className="text-red-500 font-medium">{previewResult.errorRows} lỗi</span>
                            </p>
                        )}
                    </div>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {!previewResult ? (
                        <form onSubmit={handlePreview} className="space-y-4">
                            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 text-orange-800 dark:text-orange-300 rounded-lg text-sm">
                                <p className="font-semibold mb-1">Lưu ý khi import:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Chỉ cập nhật <strong>StudentProfile</strong> (ngành, GPA, khóa...).</li>
                                    <li><strong>FullName, Email, Phone</strong> phải khớp với tài khoản hiện có.</li>
                                    <li>Nếu MSSV chưa có profile, hệ thống sẽ tạo mới profile cho sinh viên đó.</li>
                                </ul>
                            </div>

                            <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors relative">
                                <input required type="file" accept=".xlsx, .xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                                <Upload size={32} className="text-fpt-orange mb-2" />
                                {file ? (
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Chọn file Excel (.xlsx)</p>
                                        <p className="text-xs text-gray-500 mt-1">Sử dụng file template được cung cấp</p>
                                    </>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                                <button type="submit" disabled={loading} className="px-6 py-2 bg-fpt-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {loading && <Loader2 size={16} className="animate-spin" />} Kiểm tra file
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-blue-600">{previewResult.totalRows}</p>
                                    <p className="text-xs text-blue-600/70">Tổng dòng</p>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-green-600">{previewResult.validRows}</p>
                                    <p className="text-xs text-green-600/70">Hợp lệ</p>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-red-600">{previewResult.errorRows}</p>
                                    <p className="text-xs text-red-600/70">Lỗi</p>
                                </div>
                            </div>

                            {/* Duration */}
                            <p className="text-xs text-gray-500 text-center">
                                Thời gian kiểm tra: {(previewResult.durationMs / 1000).toFixed(2)}s
                            </p>

                            {/* Sample Errors */}
                            {previewResult.sampleErrors.length > 0 && (
                                <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                                    <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 border-b border-red-200 dark:border-red-800">
                                        <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                            Mẫu lỗi (tối đa 10 dòng đầu)
                                        </p>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-red-50/50 dark:bg-red-900/10 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-red-600">Dòng</th>
                                                    <th className="px-3 py-2 text-left text-red-600">MSSV</th>
                                                    <th className="px-3 py-2 text-left text-red-600">Lỗi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-100 dark:divide-red-800">
                                                {previewResult.sampleErrors.map((err, idx) => (
                                                    <tr key={idx} className="text-red-700 dark:text-red-300">
                                                        <td className="px-3 py-2">{err.row}</td>
                                                        <td className="px-3 py-2 font-mono">{err.code}</td>
                                                        <td className="px-3 py-2">{err.error}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Can Import Message */}
                            {previewResult.canImport && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
                                    <div className="text-green-600">✓</div>
                                    <p className="text-sm text-green-700 dark:text-green-400">
                                        Tất cả {previewResult.validRows} dòng đều hợp lệ. Sẵn sàng import!
                                    </p>
                                </div>
                            )}

                            {previewResult.errorRows > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                                    <div className="text-red-600">✗</div>
                                    <p className="text-sm text-red-700 dark:text-red-400">
                                        Có {previewResult.errorRows} dòng lỗi. Vui lòng sửa file và thử lại.
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
                                <button onClick={() => setPreviewResult(null)} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
                                    <Upload size={16} className="rotate-180" /> Thử file khác
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                                    <button
                                        onClick={handleConfirmImport}
                                        disabled={loading || !previewResult.canImport}
                                        className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        Import {previewResult.validRows} sinh viên
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
