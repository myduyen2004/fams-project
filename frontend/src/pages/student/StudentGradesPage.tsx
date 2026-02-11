import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StudentLayout } from '../../layouts/StudentLayout';
import { Card } from '../../components/common/Card';
import { BookOpen, GraduationCap, AlertCircle, Loader2, ChevronDown, Check } from 'lucide-react';
import { studentMyGradeService, StudentCourseOption, StudentGradeDetailResponse, GradeCategory } from '../../services/api/studentMyGradeService';

interface SemesterOption {
    id: number;
    name: string;
    code: string;
}

export const StudentGradesPage: React.FC = () => {
    const [courses, setCourses] = useState<StudentCourseOption[]>([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
    const [selectedClassName, setSelectedClassName] = useState<string>('');
    const [gradeData, setGradeData] = useState<StudentGradeDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [gradeLoading, setGradeLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Dropdown states
    const [isSemesterOpen, setIsSemesterOpen] = useState(false);
    const [isCourseOpen, setIsCourseOpen] = useState(false);
    const semesterDropdownRef = useRef<HTMLDivElement>(null);
    const courseDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (semesterDropdownRef.current && !semesterDropdownRef.current.contains(event.target as Node)) {
                setIsSemesterOpen(false);
            }
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
                setIsCourseOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getUserId = (): number => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.id;
        }
        return 0;
    };

    const semesters: SemesterOption[] = useMemo(() => {
        const semesterMap = new Map<number, SemesterOption>();
        courses.forEach(course => {
            if (!semesterMap.has(course.semesterId)) {
                semesterMap.set(course.semesterId, {
                    id: course.semesterId,
                    name: course.semesterName,
                    code: course.semesterCode
                });
            }
        });
        return Array.from(semesterMap.values());
    }, [courses]);

    const filteredCourses = useMemo(() => {
        if (!selectedSemesterId) return courses;
        return courses.filter(c => c.semesterId === selectedSemesterId);
    }, [courses, selectedSemesterId]);

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        if (semesters.length > 0 && !selectedSemesterId) {
            setSelectedSemesterId(semesters[0].id);
        }
    }, [semesters, selectedSemesterId]);

    useEffect(() => {
        if (filteredCourses.length > 0) {
            setSelectedClassName(filteredCourses[0].className);
        } else {
            setSelectedClassName('');
            setGradeData(null);
        }
    }, [filteredCourses]);

    useEffect(() => {
        if (selectedClassName) {
            fetchGrades(selectedClassName);
        }
    }, [selectedClassName]);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            setError(null);
            const userId = getUserId();
            if (!userId) {
                setError('Không thể xác định thông tin người dùng');
                return;
            }
            const data = await studentMyGradeService.getMyCourses(userId);
            setCourses(data);
        } catch (err) {
            console.error('Error fetching courses:', err);
            setError('Không thể tải danh sách môn học');
        } finally {
            setLoading(false);
        }
    };

    const fetchGrades = async (className: string) => {
        try {
            setGradeLoading(true);
            const userId = getUserId();
            const data = await studentMyGradeService.getMyGrades(userId, className);
            setGradeData(data);
        } catch (err) {
            console.error('Error fetching grades:', err);
            setGradeData(null);
        } finally {
            setGradeLoading(false);
        }
    };

    const formatGrade = (value: number | null, isPublished: boolean): string => {
        if (!isPublished) return '-';
        if (value === null) return '-';
        return value.toFixed(1);
    };

    // Check if any grade item has 0 points (excluding Total rows)
    const hasZeroGrade = (gradeCategories: GradeCategory[]): boolean => {
        for (const category of gradeCategories) {
            for (const item of category.items) {
                if (item.itemName !== 'Total' && item.isPublished && item.value === 0) {
                    return true;
                }
            }
        }
        return false;
    };

    // Determine pass status: average >= 5.0 AND no zero grades
    const calculatePassStatus = (average: number | null, gradeCategories: GradeCategory[]): 'PASSED' | 'FAILED' | 'PENDING' => {
        if (average === null) return 'PENDING';
        if (average >= 5 && !hasZeroGrade(gradeCategories)) {
            return 'PASSED';
        }
        return 'FAILED';
    };

    // Extract number from item name (e.g., "Assignment 1" -> 1, "Progress Test 2" -> 2)
    const extractNumber = (name: string): number => {
        const match = name.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
    };

    // Sort and prepare grade categories (same logic as GradeConfigurationPage)
    const sortedGradeCategories = useMemo(() => {
        if (!gradeData) return [];

        // Calculate total weight for each category
        const weightByCategory = gradeData.gradeCategories.reduce((acc, curr) => {
            acc[curr.categoryName] = curr.totalWeight || 0;
            return acc;
        }, {} as Record<string, number>);

        return [...gradeData.gradeCategories]
            .sort((a, b) => {
                // Priority 1: Resit is always last
                const isAResit = a.categoryName.toLowerCase() === 'resit';
                const isBResit = b.categoryName.toLowerCase() === 'resit';
                if (isAResit !== isBResit) return isAResit ? 1 : -1;
                if (isAResit && isBResit) return 0;

                // Priority 2: Final Exam is second to last
                const isAFinal = a.categoryName.toLowerCase().includes('final');
                const isBFinal = b.categoryName.toLowerCase().includes('final');
                if (isAFinal !== isBFinal) return isAFinal ? 1 : -1;
                if (isAFinal && isBFinal) return 0;

                // Priority 3: Sort by Total Weight of the Category (ascending)
                const weightTotalA = weightByCategory[a.categoryName] || 0;
                const weightTotalB = weightByCategory[b.categoryName] || 0;

                if (Math.abs(weightTotalA - weightTotalB) > 0.01) {
                    return weightTotalA - weightTotalB;
                }

                // Priority 4: Sort by Type Priority (if total weights are equal)
                const CATEGORY_PRIORITY: Record<string, number> = {
                    'participation': 1,
                    'quiz': 2,
                    'progress test': 3,
                    'workshop': 4,
                    'project': 5,
                    'presentation': 6,
                    'assignment': 7,
                    'midterm test': 8, // Frontend mapping name
                    'practical exam': 9,
                };

                const priorityA = CATEGORY_PRIORITY[a.categoryName.toLowerCase()] || 99;
                const priorityB = CATEGORY_PRIORITY[b.categoryName.toLowerCase()] || 99;

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                // Priority 5: Sort alphabetically by category name
                return a.categoryName.localeCompare(b.categoryName);
            })
            .map(category => ({
                ...category,
                items: [...category.items].sort((a, b) => {
                    // "Total" always at the end
                    if (a.itemName === 'Total') return 1;
                    if (b.itemName === 'Total') return -1;

                    // Sort by number in name (1, 2, 3...)
                    const numA = extractNumber(a.itemName);
                    const numB = extractNumber(b.itemName);

                    if (numA !== numB) return numA - numB;

                    // If no numbers, sort alphabetically
                    return a.itemName.localeCompare(b.itemName);
                })
            }));
    }, [gradeData]);

    const getSelectedSemesterName = () => {
        const semester = semesters.find(s => s.id === selectedSemesterId);
        return semester ? semester.name : 'Chọn học kỳ';
    };

    const getSelectedCourseName = () => {
        if (!selectedClassName) return '-- Chọn môn học --';
        const course = filteredCourses.find(c => c.className === selectedClassName);
        return course ? `${course.className} - ${course.courseName}` : selectedClassName;
    };

    if (loading) {
        return (
            <StudentLayout pageTitle="Bảng Điểm">
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-fpt-orange" />
                    <p className="text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</p>
                </div>
            </StudentLayout>
        );
    }

    if (error) {
        return (
            <StudentLayout pageTitle="Bảng Điểm">
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <p className="text-gray-500 dark:text-gray-400">{error}</p>
                </div>
            </StudentLayout>
        );
    }

    if (courses.length === 0) {
        return (
            <StudentLayout pageTitle="Bảng Điểm">
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <BookOpen className="w-12 h-12 text-fpt-orange" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chưa có môn học nào</h3>
                    <p className="text-gray-500 dark:text-gray-400">Bạn chưa đăng ký môn học nào trong hệ thống.</p>
                </div>
            </StudentLayout>
        );
    }

    // Calculate actual pass status for current grade data
    const actualPassStatus = gradeData ? calculatePassStatus(gradeData.courseAverage, gradeData.gradeCategories) : 'PENDING';

    return (
        <StudentLayout pageTitle="Bảng Điểm">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 text-fpt-orange font-bold text-sm mb-1">
                        <GraduationCap size={16} /> Kết quả học tập
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Bảng điểm chi tiết
                    </h1>
                </div>

                {/* Filter Section - Like Lecturer Grade Management */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Semester Selector */}
                        <div className="flex-1" ref={semesterDropdownRef}>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Học kỳ
                            </label>
                            <div className="relative">
                                <button
                                    onClick={() => setIsSemesterOpen(!isSemesterOpen)}
                                    className="flex items-center justify-between w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-fpt-orange transition-all"
                                >
                                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {getSelectedSemesterName()}
                                    </span>
                                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isSemesterOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isSemesterOpen && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-60 overflow-y-auto">
                                        {semesters.map((semester) => (
                                            <button
                                                key={semester.id}
                                                onClick={() => {
                                                    setSelectedSemesterId(semester.id);
                                                    setIsSemesterOpen(false);
                                                }}
                                                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${selectedSemesterId === semester.id
                                                    ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange'
                                                    : 'text-gray-900 dark:text-white'
                                                    }`}
                                            >
                                                <span className="text-sm font-medium">{semester.name}</span>
                                                {selectedSemesterId === semester.id && <Check size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Course Selector */}
                        <div className="flex-1" ref={courseDropdownRef}>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Lớp học
                            </label>
                            <div className="relative">
                                <button
                                    onClick={() => !filteredCourses.length ? null : setIsCourseOpen(!isCourseOpen)}
                                    disabled={filteredCourses.length === 0}
                                    className={`flex items-center justify-between w-full rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-fpt-orange transition-all ${filteredCourses.length === 0
                                        ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white'
                                        }`}
                                >
                                    <span className="text-sm font-medium truncate">
                                        {getSelectedCourseName()}
                                    </span>
                                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isCourseOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isCourseOpen && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-60 overflow-y-auto">
                                        {filteredCourses.map((course) => (
                                            <button
                                                key={course.className}
                                                onClick={() => {
                                                    setSelectedClassName(course.className);
                                                    setIsCourseOpen(false);
                                                }}
                                                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${selectedClassName === course.className
                                                    ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange'
                                                    : 'text-gray-900 dark:text-white'
                                                    }`}
                                            >
                                                <span className="text-sm font-medium">{course.className} - {course.courseName}</span>
                                                {selectedClassName === course.className && <Check size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grade Table */}
                {gradeLoading ? (
                    <Card className="min-w-full overflow-hidden border-none shadow-sm dark:shadow-none bg-white dark:bg-zinc-900">
                        <div className="flex items-center justify-center p-12 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-fpt-orange" />
                            <p className="text-gray-500 dark:text-gray-400">Đang tải điểm...</p>
                        </div>
                    </Card>
                ) : gradeData ? (
                    <Card className="min-w-full overflow-hidden border-none shadow-sm dark:shadow-none bg-white dark:bg-zinc-900 p-0">
                        {/* Course Info Header - WHITE background */}
                        <div className="bg-white dark:bg-zinc-900 px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-zinc-700">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{gradeData.courseName}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="bg-fpt-orange/10 text-fpt-orange px-3 py-0.5 rounded-full text-xs font-bold">
                                        {gradeData.courseCode}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">{gradeData.className}</span>
                                </div>
                            </div>
                        </div>

                        {/* Grades Table - NO "Đạt" column */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-[700px]">
                                {/* ORANGE Table Header */}
                                <thead>
                                    <tr className="bg-gradient-to-r from-fpt-orange to-orange-500">
                                        <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wider w-[20%]">
                                            Loại điểm
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wider w-[32%]">
                                            Mục điểm
                                        </th>
                                        <th className="text-center px-4 py-3 text-xs font-bold text-white uppercase tracking-wider w-[12%]">
                                            Trọng số
                                        </th>
                                        <th className="text-center px-4 py-3 text-xs font-bold text-white uppercase tracking-wider w-[12%]">
                                            Điểm
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wider w-[24%]">
                                            Ghi chú
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedGradeCategories.map((category: GradeCategory, catIndex: number) => (
                                        <React.Fragment key={catIndex}>
                                            {category.items.map((item, itemIndex) => {
                                                const isTotal = item.itemName === 'Total';

                                                return (
                                                    <tr
                                                        key={`${catIndex}-${itemIndex}`}
                                                        className={`${isTotal ? '' : ''} ${catIndex % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-white dark:bg-zinc-800/20'}`}
                                                    >
                                                        {itemIndex === 0 && (
                                                            <td
                                                                className="px-4 py-3 border-b border-r border-gray-100 dark:border-zinc-700 font-semibold text-gray-700 dark:text-gray-300 align-top bg-gray-50/50 dark:bg-zinc-800/30"
                                                                rowSpan={category.items.length}
                                                            >
                                                                {category.categoryName}
                                                            </td>
                                                        )}
                                                        <td className={`px-4 py-3 border-b border-gray-100 dark:border-zinc-700 text-gray-700 dark:text-gray-300 ${isTotal ? 'font-semibold italic' : ''}`}>
                                                            {isTotal ? 'Tổng' : item.itemName}
                                                        </td>
                                                        <td className="px-4 py-3 border-b border-gray-100 dark:border-zinc-700 text-center text-gray-500 dark:text-gray-400">
                                                            {item.weight}%
                                                        </td>
                                                        <td className={`px-4 py-3 border-b border-gray-100 dark:border-zinc-700 text-center font-bold text-base ${!item.isPublished ? 'text-gray-400' :
                                                            item.value !== null && item.value < 5 ? 'text-red-500' : 'text-gray-900 dark:text-white'
                                                            }`}>
                                                            {formatGrade(item.value, item.isPublished)}
                                                        </td>
                                                        <td className="px-4 py-3 border-b border-gray-100 dark:border-zinc-700 text-gray-500 dark:text-gray-400 text-sm">
                                                            {item.comment || '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Course Total Footer - Exactly like the design */}
                        <div className="border-t border-gray-200 dark:border-zinc-700 dark:bg-zinc-800/50 px-6 py-4">
                            <div className="flex items-center justify-between">
                                {/* Left - COURSE TOTAL */}
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    Tổng điểm môn học
                                </span>

                                {/* Right - Average and Status */}
                                <div className="flex items-center gap-60">
                                    {/* Average */}
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Trung bình</p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                            {gradeData.courseAverage !== null ? gradeData.courseAverage.toFixed(1) : '-'}
                                        </p>
                                    </div>

                                    {/* Status */}
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Trạng thái</p>
                                        <p className={`text-lg font-bold ${actualPassStatus === 'PASSED'
                                            ? 'text-green-600 dark:text-green-400'
                                            : actualPassStatus === 'FAILED'
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-amber-600 dark:text-amber-400'
                                            }`}>
                                            {actualPassStatus === 'PASSED' ? 'PASSED' : actualPassStatus === 'FAILED' ? 'FAILED' : 'PENDING'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <Card className="min-w-full overflow-hidden border-none shadow-sm dark:shadow-none bg-white dark:bg-zinc-900">
                        <div className="flex flex-col items-center justify-center p-12 gap-4">
                            <AlertCircle className="w-8 h-8 text-gray-400" />
                            <p className="text-gray-500 dark:text-gray-400">Không thể tải dữ liệu điểm</p>
                        </div>
                    </Card>
                )}
            </div>
        </StudentLayout>
    );
};

export default StudentGradesPage;
