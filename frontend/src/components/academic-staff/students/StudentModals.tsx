import React, { useState, useEffect } from 'react';
import { X, Loader2, Upload, Mail, Phone, Calendar, GraduationCap, BookOpen, Stars } from 'lucide-react';
import { StudentResponse, StudentUpdateRequest, academicStaffService, StudentImportDTO } from '../../../services/api/academicStaffService';
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
                                        {student.gpa !== undefined ? student.gpa.toFixed(2) : '---'}
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

    const [formData, setFormData] = useState<StudentUpdateRequest>({
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
            await academicStaffService.updateStudent(student.id, formData);
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-1">Ngành học</label>
                            <select
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-fpt-orange/20 outline-none text-gray-900 dark:text-white"
                                value={formData.major}
                                onChange={e => setFormData({ ...formData, major: e.target.value })}
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

// --- ImportStudentModal ---
export const ImportStudentModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<StudentImportDTO[] | null>(null);

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
            const data = await academicStaffService.previewImportStudents(file);
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
            const result = await academicStaffService.saveImportedStudents(previewData);

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

    const validCount = previewData?.filter(item => item.status === 'VALID').length || 0;
    const errorCount = previewData?.filter(item => item.status === 'ERROR').length || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full ${previewData ? 'max-w-6xl' : 'max-w-md'} border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh]`}>
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import hồ sơ sinh viên</h3>
                        {previewData && (
                            <p className="text-sm text-gray-500 mt-1">
                                Xem trước: <span className="text-green-600 font-medium">{validCount} hợp lệ</span> • <span className="text-red-500 font-medium">{errorCount} lỗi</span>
                            </p>
                        )}
                    </div>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {!previewData ? (
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
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
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
                                    {loading && <Loader2 size={16} className="animate-spin" />} Xem trước
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="border rounded-lg overflow-hidden border-gray-200 dark:border-zinc-700">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-medium border-b border-gray-200 dark:border-zinc-700">
                                        <tr>
                                            <th className="px-4 py-3 w-12 text-center">#</th>
                                            <th className="px-4 py-3">MSSV</th>
                                            <th className="px-4 py-3">Họ tên</th>
                                            <th className="px-4 py-3">Ngành / Chuyên ngành</th>
                                            <th className="px-4 py-3">Khóa</th>
                                            <th className="px-4 py-3">GPA</th>
                                            <th className="px-4 py-3">Combo</th>
                                            <th className="px-4 py-3">Ghi chú lỗi</th>
                                            <th className="px-4 py-3 text-center">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {previewData.map((row, index) => (
                                            <tr key={index} className={row.status === 'ERROR' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                                <td className="px-4 py-3 text-center text-gray-400">{row.rowNumber}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.code}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.fullName || '---'}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                    <div>{row.major || '---'}</div>
                                                    <div className="text-xs text-gray-400">{row.specialization || ''}</div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.course || '---'}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono">{row.gpa?.toFixed(2) || '0.00'}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono">{row.subSpecialization || '---'}</td>
                                                <td className="px-4 py-3 text-red-500 text-xs italic max-w-xs">{row.errorMessage || ''}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {row.status === 'VALID' ? (
                                                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Khớp dữ liệu</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Lỗi</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800">
                                <button onClick={() => setPreviewData(null)} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2">
                                    <Upload size={16} className="rotate-180" /> Thử file khác
                                </button>
                                <div className="flex gap-3">
                                    <button onClick={onClose} className="px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                                    <button
                                        onClick={handleConfirmImport}
                                        disabled={loading || validCount === 0 || errorCount > 0}
                                        className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        Cập nhật ({validCount}) sinh viên
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
