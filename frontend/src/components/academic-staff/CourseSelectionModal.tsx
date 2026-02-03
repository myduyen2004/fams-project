import { useState, useEffect } from 'react';
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
    const [isSemesterFilterOpen, setIsSemesterFilterOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        // Reset state when opening
        setSelectedIds([]);
        setSemester(1);
        setSearchTerm('');
        setIsSemesterFilterOpen(false);

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl dark:bg-zinc-900 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-zinc-800">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Thêm môn học vào chương trình</h2>
                        <p className="text-sm text-gray-500 dark:text-zinc-400">Chọn môn học và học kỳ để thêm vào</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5 text-gray-500 dark:text-zinc-400" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 dark:border-zinc-800 space-y-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo mã hoặc tên môn học..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-fpt-orange focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                        </div>
                        <div className="w-48">
                            <SemesterFilter
                                value={semester}
                                onChange={setSemester}
                                isOpen={isSemesterFilterOpen}
                                onToggle={() => setIsSemesterFilterOpen(!isSemesterFilterOpen)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading && courses.length === 0 ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-fpt-orange" />
                        </div>
                    ) : courses.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Không tìm thấy môn học nào phù hợp</p>
                    ) : (
                        <div className="grid gap-3">
                            {courses.map((course) => {
                                const isSelected = selectedIds.includes(course.id);
                                return (
                                    <div
                                        key={course.id}
                                        onClick={() => handleSelect(course.id)}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                                            ? 'border-fpt-orange bg-orange-50 dark:bg-orange-900/20'
                                            : 'border-gray-200 hover:border-fpt-orange/50 hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected
                                                ? 'bg-fpt-orange border-fpt-orange text-white'
                                                : 'border-gray-300 dark:border-zinc-600'
                                                }`}>
                                                {isSelected && <Check className="h-3 w-3" />}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                    {course.code}
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                        {course.credits} TC
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-zinc-400">{course.name}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-900/50 rounded-b-xl">
                    <div className="text-sm text-gray-500 dark:text-zinc-400">
                        Đã chọn: <span className="font-medium text-fpt-orange">{selectedIds.length}</span> môn học
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedIds.length === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-fpt-orange rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Thêm môn học
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
