import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, X, Check } from 'lucide-react';
import { Course } from '../../types/course';
import { courseService } from '../../services/api/courseService';
import { SemesterFilter } from './SemesterFilter';

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
                // Initial fetch
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 max-h-[85vh] flex flex-col overflow-hidden transform transition-all duration-300 scale-100 zoom-in-95">
                <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-zinc-800">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thêm môn học vào chương trình</h2>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Chọn môn học và học kỳ để thêm vào</p>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
                        <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                <div className="p-6 border-b border-gray-100 dark:border-zinc-800 space-y-4 bg-gray-50/30 dark:bg-zinc-900/30">
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="relative flex-1 w-full">
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 ml-1">
                                Tìm kiếm
                            </label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo mã hoặc tên môn học..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-[52px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 px-12 text-sm focus:border-fpt-orange focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 transition-all hover:border-fpt-orange/40 dark:bg-zinc-900 dark:text-white outline-none"
                                />
                            </div>
                        </div>
                        <div className="w-full sm:w-56">
                            <SemesterFilter
                                value={semester}
                                onChange={setSemester}
                            />
                        </div>
                    </div>
                    {courses.length > 0 && (
                        <div className="flex items-center justify-between pt-2">
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-3 text-sm font-bold text-fpt-orange hover:text-orange-600 transition-all active:scale-95 ml-1"
                            >
                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedIds.length === courses.length
                                    ? 'bg-fpt-orange border-fpt-orange text-white'
                                    : 'border-gray-200 dark:border-zinc-700'
                                    }`}>
                                    {selectedIds.length === courses.length && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                                {selectedIds.length === courses.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả môn học'}
                            </button>
                            <span className="text-[11px] uppercase tracking-widest font-black text-gray-400">{selectedIds.length} / {courses.length} đã chọn</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
                    {loading && courses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-fpt-orange mb-4" />
                            <p className="text-sm font-medium text-gray-500">Đang tải danh sách môn học...</p>
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-full mb-4">
                                <Search className="h-8 w-8 text-gray-300" />
                            </div>
                            <p className="text-sm font-bold text-gray-500">Không tìm thấy môn học nào phù hợp</p>
                            <p className="text-xs text-gray-400 mt-1">Hãy thử tìm kiếm với từ khóa khác</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {courses.map((course) => {
                                const isSelected = selectedIds.includes(course.id);
                                return (
                                    <div
                                        key={course.id}
                                        onClick={() => handleSelect(course.id)}
                                        className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98] ${isSelected
                                            ? 'border-fpt-orange bg-orange-50 dark:bg-orange-950/20'
                                            : 'border-gray-100 hover:border-fpt-orange/40 hover:bg-gray-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`w-6 h-6 flex-shrink-0 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected
                                                ? 'bg-fpt-orange border-fpt-orange text-white'
                                                : 'border-gray-200 dark:border-zinc-700'
                                                }`}>
                                                {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-0.5">
                                                    <span className="truncate">{course.code}</span>
                                                    <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-black uppercase">
                                                        {course.credits} TC
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-zinc-400 truncate" title={course.name}>{course.name}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-zinc-900 gap-4">
                    <div className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                        Đã chọn: <span className="text-fpt-orange font-black text-lg">{selectedIds.length}</span> môn học
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none h-[48px] px-6 text-sm font-bold text-gray-500 bg-gray-100 dark:bg-zinc-800 rounded-2xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedIds.length === 0}
                            className="flex-1 sm:flex-none h-[48px] px-8 text-sm font-bold text-white bg-fpt-orange rounded-2xl hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            Thêm môn học
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};


