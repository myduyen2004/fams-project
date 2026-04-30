import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Plus, Trash2, BookOpen, Search, Info } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Course, CourseCreateRequest, CoursePrerequisite } from '../../types/course';
import { courseService } from '../../services/api/courseService';
import toast from "@utils/toast";

interface CourseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    course?: Course | null;
}

const validationSchema = Yup.object({
    code: Yup.string()
        .trim()
        .matches(/^[a-zA-Z0-9-]+$/, 'Mã môn chỉ được chứa chữ cái, số và dấu gạch ngang')
        .matches(/[a-zA-Z]/, 'Mã môn phải chứa ít nhất một chữ cái')
        .max(20, 'Mã môn không được quá 20 ký tự')
        .required('Mã môn là bắt buộc'),
    name: Yup.string()
        .trim()
        .matches(/[a-zA-ZÀ-ỹ]/, 'Tên môn học phải chứa ít nhất một chữ cái')
        .min(5, 'Tên môn học phải có ít nhất 5 ký tự')
        .max(200, 'Tên môn học không được quá 200 ký tự')
        .required('Tên môn học là bắt buộc'),
    credits: Yup.number()
        .min(1, 'Số tín chỉ phải từ 1-10')
        .max(10, 'Số tín chỉ phải từ 1-10')
        .required('Số tín chỉ là bắt buộc'),
    numberOfSlots: Yup.number()
        .min(1, 'Số slot phải từ 1-100')
        .max(100, 'Số slot phải từ 1-100')
        .required('Số slot là bắt buộc'),
    description: Yup.string().max(500, 'Mô tả không được quá 500 ký tự')
});

export const CourseFormModal: React.FC<CourseFormModalProps> = ({ isOpen, onClose, onSuccess, course }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'prerequisites'>('info');

    // Prerequisite state
    const [prerequisites, setPrerequisites] = useState<CoursePrerequisite[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Course[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [prereqLoading, setPrereqLoading] = useState<number | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const formik = useFormik<CourseCreateRequest>({
        initialValues: {
            code: '',
            name: '',
            description: '',
            credits: 3,
            numberOfSlots: 45,
            isCalculatedInGpa: true
        },
        validationSchema,
        onSubmit: async (values) => {
            setLoading(true);
            try {
                if (course) {
                    await courseService.updateCourse(course.id, values);
                    toast.success('Cập nhật môn học thành công');
                } else {
                    await courseService.createCourse(values);
                    toast.success('Tạo môn học thành công');
                }
                onSuccess();
                onClose();
                formik.resetForm();
            } catch (error: any) {
                toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
            } finally {
                setLoading(false);
            }
        }
    });

    useEffect(() => {
        const loadPrerequisites = async () => {
            if (course?.id && isOpen) {
                try {
                    const data = await courseService.getPrerequisites(course.id);
                    setPrerequisites(data);
                } catch (error) {
                    console.error('Failed to load prerequisites:', error);
                    setPrerequisites(course.prerequisites || []);
                }
            }
        };

        if (isOpen) {
            if (course) {
                formik.setValues({
                    code: course.code,
                    name: course.name,
                    description: course.description || '',
                    credits: course.credits,
                    numberOfSlots: course.numberOfSlots,
                    isCalculatedInGpa: course.isCalculatedInGpa ?? true
                });
                loadPrerequisites();
            } else {
                formik.resetForm();
                setPrerequisites([]);
            }
            setActiveTab('info');
            setSearchQuery('');
            setSearchResults([]);
            setShowDropdown(false);
        }
    }, [course, isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (!value.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const results = await courseService.searchCourses(value, 20);
                // Filter out current course and already-added prerequisites
                const filtered = results.filter(r =>
                    r.id !== course?.id &&
                    !prerequisites.some(p => p.id === r.id) &&
                    !(r.prerequisites?.some(p => p.id === course?.id))
                );
                setSearchResults(filtered);
                setShowDropdown(true);
            } catch {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    const handleAddPrerequisite = async (prereq: Course) => {
        if (!course) {
            // For new course - just add locally, will need to save first
            toast.error('Vui lòng lưu môn học trước khi thêm môn tiên quyết');
            return;
        }
        setPrereqLoading(prereq.id);
        try {
            const updated = await courseService.addPrerequisite(course.id, prereq.id);
            setPrerequisites(updated);
            setSearchQuery('');
            setSearchResults([]);
            setShowDropdown(false);
            toast.success(`Đã thêm môn tiên quyết: ${prereq.name}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể thêm môn tiên quyết');
        } finally {
            setPrereqLoading(null);
        }
    };

    const handleRemovePrerequisite = async (prereqId: number) => {
        if (!course) return;
        setPrereqLoading(prereqId);
        try {
            const updated = await courseService.removePrerequisite(course.id, prereqId);
            setPrerequisites(updated);
            toast.success('Đã xóa môn tiên quyết');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể xóa môn tiên quyết');
        } finally {
            setPrereqLoading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex flex-col min-h-[580px] max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-zinc-800 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {course ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
                    </h2>
                    <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
                        <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                {/* Tabs - only show when editing */}
                {course && (
                    <div className="flex px-6 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`flex-1 py-3 text-sm font-bold transition-all relative ${activeTab === 'info' ? 'text-fpt-orange' : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                        >
                            Thông tin môn học
                            {activeTab === 'info' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-fpt-orange rounded-t-full" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('prerequisites')}
                            className={`flex-1 py-3 text-sm font-bold transition-all relative flex items-center justify-center gap-2 ${activeTab === 'prerequisites' ? 'text-fpt-orange' : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                        >
                            <BookOpen className="h-4 w-4" />
                            Môn tiên quyết
                            {prerequisites.length > 0 && (
                                <span className="ml-1 rounded-full bg-fpt-orange px-2 py-0.5 text-[10px] text-white">
                                    {prerequisites.length}
                                </span>
                            )}
                            {activeTab === 'prerequisites' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-fpt-orange rounded-t-full" />}
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto flex-1 min-h-[450px]">
                    {/* Info Tab */}
                    {activeTab === 'info' && (
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">Mã môn *</label>
                                <input type="text" name="code" value={formik.values.code} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                    className={`w-full h-[52px] px-4 rounded-2xl border-2 text-sm transition-all focus:outline-none focus:ring-4 dark:bg-zinc-900 dark:text-white ${formik.touched.code && formik.errors.code ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-100 dark:border-zinc-800 focus:border-fpt-orange focus:ring-fpt-orange/10 hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white'}`} placeholder="VD: PRF192" />
                                {formik.touched.code && formik.errors.code && <p className="mt-1 text-xs text-red-500">{formik.errors.code}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">Tên môn học *</label>
                                <input type="text" name="name" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                    className={`w-full h-[52px] px-4 rounded-2xl border-2 text-sm transition-all focus:outline-none focus:ring-4 dark:bg-zinc-900 dark:text-white ${formik.touched.name && formik.errors.name ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-100 dark:border-zinc-800 focus:border-fpt-orange focus:ring-fpt-orange/10 hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white'}`} placeholder="VD: Programming Fundamentals" />
                                {formik.touched.name && formik.errors.name && <p className="mt-1 text-xs text-red-500">{formik.errors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">Số tín chỉ *</label>
                                    <input type="number" name="credits" value={formik.values.credits} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                        className={`w-full h-[52px] px-4 rounded-2xl border-2 text-sm transition-all focus:outline-none focus:ring-4 dark:bg-zinc-900 dark:text-white ${formik.touched.credits && formik.errors.credits ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-100 dark:border-zinc-800 focus:border-fpt-orange focus:ring-fpt-orange/10 hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white'}`} min={1} max={10} />
                                    {formik.touched.credits && formik.errors.credits && <p className="mt-1 text-xs text-red-500">{formik.errors.credits}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">Số slot</label>
                                    <input type="number" name="numberOfSlots" value={formik.values.numberOfSlots} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                        className={`w-full h-[52px] px-4 rounded-2xl border-2 text-sm transition-all focus:outline-none focus:ring-4 dark:bg-zinc-900 dark:text-white ${formik.touched.numberOfSlots && formik.errors.numberOfSlots ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-100 dark:border-zinc-800 focus:border-fpt-orange focus:ring-fpt-orange/10 hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white'}`} min={1} max={100} />
                                    {formik.touched.numberOfSlots && formik.errors.numberOfSlots && <p className="mt-1 text-xs text-red-500">{formik.errors.numberOfSlots}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">Mô tả</label>
                                <textarea name="description" value={formik.values.description} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 text-sm transition-all focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange hover:border-fpt-orange/40 dark:bg-zinc-900 dark:text-white outline-none text-gray-900" rows={3} placeholder="Nhập mô tả môn học..." />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 mt-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl transition-all duration-300 ${formik.values.isCalculatedInGpa ? 'bg-orange-100 text-fpt-orange dark:bg-orange-950/40 shadow-sm' : 'bg-gray-200 text-gray-500 dark:bg-zinc-700'}`}>
                                        <Info className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Tính vào GPA</p>
                                        <p className="text-[11px] text-gray-500 dark:text-zinc-400">Môn học sẽ được dùng để tính điểm tích lũy</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => formik.setFieldValue('isCalculatedInGpa', !formik.values.isCalculatedInGpa)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 focus:outline-none ${formik.values.isCalculatedInGpa ? 'bg-fpt-orange shadow-lg shadow-fpt-orange/20' : 'bg-gray-300 dark:bg-zinc-700'}`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-300 ease-in-out ${formik.values.isCalculatedInGpa ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'prerequisites' && (
                        <div className="p-6 space-y-5 flex flex-col h-full min-h-[450px]">
                            {/* Info banner */}
                            <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-4 text-sm text-blue-700 dark:text-blue-300 flex items-center gap-3 flex-shrink-0">
                                <Info className="w-5 h-5 flex-shrink-0" />
                                <p className="font-medium">Sinh viên phải hoàn thành các môn tiên quyết trước khi đăng ký môn này.</p>
                            </div>

                            {/* Search */}
                            <div ref={searchRef} className="relative flex-shrink-0">
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">
                                    Tìm và thêm môn tiên quyết
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                        placeholder="Tìm môn học theo mã hoặc tên..."
                                        className="w-full h-[52px] px-4 pl-11 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white"
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                                    )}
                                </div>

                                {/* Dropdown */}
                                {showDropdown && searchResults.length > 0 && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800 max-h-52 overflow-y-auto">
                                        {searchResults.map(result => (
                                            <button
                                                key={result.id}
                                                onClick={() => handleAddPrerequisite(result)}
                                                disabled={prereqLoading === result.id}
                                                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors border-b border-gray-100 dark:border-zinc-700 last:border-0"
                                            >
                                                <div>
                                                    <span className="font-medium text-gray-900 dark:text-white">{result.code}</span>
                                                    <span className="ml-2 text-gray-500 dark:text-zinc-400">{result.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-fpt-orange flex-shrink-0 ml-2">
                                                    {prereqLoading === result.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Plus className="h-4 w-4" />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {showDropdown && searchResults.length === 0 && !isSearching && searchQuery.trim() && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800 p-3 text-sm text-gray-500 dark:text-zinc-400">
                                        Không tìm thấy môn học phù hợp
                                    </div>
                                )}
                            </div>

                            {/* Current prerequisites list */}
                            <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 ml-1">
                                    Danh sách môn tiên quyết ({prerequisites.length})
                                </label>
                                {prerequisites.length === 0 ? (
                                    <div className="flex-1 rounded-lg border-2 border-dashed border-gray-200 dark:border-zinc-700 p-6 flex flex-col items-center justify-center text-sm text-gray-400 dark:text-zinc-500">
                                        <BookOpen className="mb-2 h-10 w-10 opacity-30" />
                                        Chưa có môn tiên quyết nào
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden bg-gray-50/30 dark:bg-zinc-800/20">
                                        {prerequisites.map((prereq, index) => (
                                            <div
                                                key={prereq.id}
                                                className={`flex items-center justify-between px-4 py-3 ${index !== prerequisites.length - 1 ? 'border-b border-gray-100 dark:border-zinc-800' : ''} hover:bg-white dark:hover:bg-zinc-800/50 transition-colors`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="inline-flex items-center rounded-xl bg-orange-100 px-3 py-1 text-xs font-bold text-fpt-orange dark:bg-orange-950/40 flex-shrink-0">
                                                        {prereq.code}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 truncate">{prereq.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemovePrerequisite(prereq.id)}
                                                    disabled={prereqLoading === prereq.id}
                                                    className="flex-shrink-0 ml-2 rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all active:scale-95 disabled:opacity-50"
                                                    title="Xóa môn tiên quyết"
                                                >
                                                    {prereqLoading === prereq.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-zinc-800 flex-shrink-0">
                    <button type="button" onClick={onClose} className="h-[44px] px-6 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-sm font-bold text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all active:scale-95">
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={activeTab === 'info' ? () => formik.handleSubmit() : onClose}
                        disabled={loading && activeTab === 'info'}
                        className="flex items-center gap-2 h-[44px] px-8 rounded-2xl bg-fpt-orange text-sm font-bold text-white hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading && activeTab === 'info' && <Loader2 className="h-4 w-4 animate-spin" />}
                        {activeTab === 'info' ? (course ? 'Lưu thay đổi' : 'Xác nhận') : 'Đóng'}
                    </button>
                </div>
            </div>
        </div>
    );
};

