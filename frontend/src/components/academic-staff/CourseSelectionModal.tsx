import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Check, BookOpen, Layers } from 'lucide-react';
import { Course } from '../../types/course';
import { courseService } from '../../services/api/courseService';
import { SemesterFilter } from './SemesterFilter';
import { motion, AnimatePresence } from 'framer-motion';

interface CourseSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedCourses: { courseId: number; semester: number }[]) => void;
    excludeType: 'specialization' | 'subspecialization';
    excludeId: number;
}

export const CourseSelectionModal: React.FC<CourseSelectionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    excludeType,
    excludeId
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [semester, setSemester] = useState<number>(1);

    useEffect(() => {
        if (!isOpen) return;

        // Reset state when opening
        setSelectedIds([]);
        setSemester(1);
        setSearchTerm('');

        const fetchCourses = async () => {
            setLoading(true);
            try {
                const result = excludeType === 'specialization'
                    ? await courseService.searchCoursesNotInSpecialization(excludeId, '')
                    : await courseService.searchCoursesNotInSubSpecialization(excludeId, '');
                setCourses(result);
            } catch (error) {
                console.error('Initial fetch error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [isOpen, excludeType, excludeId]);

    // Debounced search effect
    useEffect(() => {
        if (!isOpen) return;

        const fetchCourses = async () => {
            setLoading(true);
            try {
                const result = excludeType === 'specialization'
                    ? await courseService.searchCoursesNotInSpecialization(excludeId, searchTerm)
                    : await courseService.searchCoursesNotInSubSpecialization(excludeId, searchTerm);
                setCourses(result);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchCourses, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, isOpen, excludeType, excludeId]);

    const handleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === courses.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(courses.map(c => c.id));
        }
    };

    const handleConfirm = () => {
        if (selectedIds.length === 0) return;

        const selection = selectedIds.map(id => ({
            courseId: id,
            semester: semester
        }));

        onConfirm(selection);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-4xl rounded-[32px] bg-white shadow-2xl dark:bg-zinc-900 border border-white/20 dark:border-zinc-800 max-h-[90vh] flex flex-col overflow-hidden shadow-orange-500/10"
            >
                {/* Header */}
                <div className="relative flex items-center justify-between p-8 border-b border-gray-100 dark:border-zinc-800 bg-gradient-to-br from-white to-gray-50/50 dark:from-zinc-900 dark:to-zinc-900/50">
                    <div className="flex items-center gap-5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-fpt-orange">
                            <BookOpen className="h-7 w-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Thêm môn học vào chương trình</h2>
                            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mt-0.5">
                                Chọn môn học từ kho và gán vào học kỳ tương ứng
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="group flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 active:scale-95"
                    >
                        <X className="h-6 w-6 text-gray-400 group-hover:text-red-500 transition-colors" />
                    </button>
                </div>

                {/* Filters & Actions */}
                <div className="p-8 border-b border-gray-100 dark:border-zinc-800 space-y-6 bg-white dark:bg-zinc-900">
                    <div className="flex flex-col lg:flex-row items-end gap-6">
                        <div className="relative flex-1 w-full">
                            <label className="block text-[10px] uppercase tracking-widest font-black text-gray-400 mb-2 ml-1">
                                Tìm kiếm môn học
                            </label>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-fpt-orange transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo mã hoặc tên môn học..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-[56px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 px-12 text-sm font-semibold focus:border-fpt-orange focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 transition-all hover:border-fpt-orange/40 dark:bg-zinc-900 dark:text-white outline-none"
                                />
                            </div>
                        </div>
                        <div className="w-full lg:w-72">
                            <SemesterFilter
                                value={semester}
                                onChange={setSemester}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={toggleSelectAll}
                            className="group flex items-center gap-3 text-sm font-black text-fpt-orange hover:text-orange-600 transition-all active:scale-95 px-4 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        >
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${selectedIds.length === courses.length
                                ? 'bg-fpt-orange border-fpt-orange text-white shadow-lg shadow-fpt-orange/30'
                                : 'border-gray-200 dark:border-zinc-700'
                                }`}>
                                {selectedIds.length === courses.length && <Check className="h-3.5 w-3.5 stroke-[4]" />}
                            </div>
                            {selectedIds.length === courses.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả môn học'}
                        </button>

                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800">
                            <Layers className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-500">
                                {selectedIds.length} / {courses.length} đã chọn
                            </span>
                        </div>
                    </div>
                </div>

                {/* Course List */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50 dark:bg-zinc-900/30 custom-scrollbar">
                    {loading && courses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="relative">
                                <div className="h-16 w-16 rounded-full border-4 border-fpt-orange/10 border-t-fpt-orange animate-spin" />
                                <BookOpen className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-fpt-orange" />
                            </div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white mt-6">Đang truy xuất kho dữ liệu...</p>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Vui lòng chờ trong giây lát</p>
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-24 w-24 bg-gray-100 dark:bg-zinc-800 rounded-[32px] flex items-center justify-center mb-6">
                                <Search className="h-10 w-10 text-gray-300" />
                            </div>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">Không tìm thấy môn học nào</p>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 max-w-xs mx-auto">
                                Thử thay đổi từ khóa tìm kiếm hoặc kiểm tra xem môn học đã được thêm chưa.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AnimatePresence mode="popLayout">
                                {courses.map((course) => {
                                    const isSelected = selectedIds.includes(course.id);
                                    return (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            key={course.id}
                                            onClick={() => handleSelect(course.id)}
                                            className={`group relative flex items-center justify-between p-5 rounded-[24px] border-2 cursor-pointer transition-all duration-300 hover:shadow-xl ${isSelected
                                                ? 'border-fpt-orange bg-orange-50/50 dark:bg-orange-950/20 shadow-lg shadow-orange-500/10'
                                                : 'border-white dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-fpt-orange/40'
                                                }`}
                                        >
                                            <div className="flex items-center gap-5 min-w-0">
                                                <div className={`w-7 h-7 flex-shrink-0 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${isSelected
                                                    ? 'bg-fpt-orange border-fpt-orange text-white shadow-lg shadow-fpt-orange/30 rotate-0'
                                                    : 'border-gray-200 dark:border-zinc-700 -rotate-90 group-hover:rotate-0'
                                                    }`}>
                                                    {isSelected ? <Check className="h-4 w-4 stroke-[4]" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-700" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{course.code}</span>
                                                        <span className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-black uppercase tracking-wider">
                                                            {course.credits} Tín chỉ
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-zinc-400 truncate pr-4" title={course.name}>{course.name}</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-zinc-900 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                            Bạn đã chọn <span className="text-fpt-orange font-black text-2xl mx-1">{selectedIds.length}</span> môn học
                        </div>
                        {selectedIds.length > 0 && (
                            <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />
                        )}
                        {selectedIds.length > 0 && (
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                                Gán vào <span className="px-3 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-fpt-orange ml-1">Học kỳ {semester}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none h-[60px] px-10 text-sm font-bold text-gray-500 bg-gray-100 dark:bg-zinc-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all duration-300 active:scale-95"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedIds.length === 0}
                            className="flex-1 sm:flex-none h-[60px] px-12 text-sm font-extrabold text-white bg-fpt-orange rounded-2xl hover:bg-orange-600 shadow-xl shadow-fpt-orange/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-95 relative overflow-hidden group"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Thêm môn học
                                <BookOpen className="h-5 w-5" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-fpt-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};
