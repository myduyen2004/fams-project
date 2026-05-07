import React, { useState, useEffect, useMemo } from 'react';
import { StudentLayout } from '../../layouts/StudentLayout';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { GraduationCap, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import { studentMyGradeService, StudentCourseOption, StudentGradeDetailResponse, GradeCategory } from '../../services/api/studentMyGradeService';
import { sortGradeCategories } from '../../utils/gradeSortUtils';
import { CustomSelect } from '../../components/common/CustomSelect';
import { useWebSocket } from '../../hooks/useWebSocket';

interface SemesterOption {
    id: number;
    name: string;
    code: string;
}

export const StudentGradesPage: React.FC = () => {

    const [searchParams] = useSearchParams();
    const urlCourseCode = searchParams.get('courseCode');

    const [courses, setCourses] = useState<StudentCourseOption[]>([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
    const [selectedClassName, setSelectedClassName] = useState<string>('');
    const [gradeData, setGradeData] = useState<StudentGradeDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [gradeLoading, setGradeLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);



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
        if (courses.length > 0 && semesters.length > 0 && !selectedSemesterId) {
            // Priority 1: From URL
            if (urlCourseCode) {
                const targetCourse = courses.find(c => c.courseCode === urlCourseCode);
                if (targetCourse) {
                    setSelectedSemesterId(targetCourse.semesterId);
                    setSelectedClassName(targetCourse.className);
                    return;
                }
            }

            // Priority 2: Default to first semester
            setSelectedSemesterId(semesters[0].id);
        }
    }, [semesters, courses, selectedSemesterId, urlCourseCode]);

    useEffect(() => {
        if (filteredCourses.length > 0) {
            // Only auto-select if we don't already have a valid selection for this semester
            const currentIsValidForSemester = filteredCourses.some(c => c.className === selectedClassName);
            if (!currentIsValidForSemester) {
                // If we have a course from URL, it should already be set above, 
                // but this handles other cases or switching semesters
                const targetFromUrl = urlCourseCode ? filteredCourses.find(c => c.courseCode === urlCourseCode) : null;
                setSelectedClassName(targetFromUrl ? targetFromUrl.className : filteredCourses[0].className);
            }
        } else {
            setSelectedClassName('');
            setGradeData(null);
        }
    }, [filteredCourses, urlCourseCode]);

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

    // Real-time synchronization
    useWebSocket('/user/queue/notifications', (notifications: any[]) => {
        if (!notifications || notifications.length === 0) return;
        
        const hasRelevantUpdate = notifications.some(notif => 
            notif.type === 'GRADE_PUBLISHED'
        );

        if (hasRelevantUpdate && selectedClassName) {
            console.log('Real-time update: Refreshing grades due to publication');
            fetchGrades(selectedClassName);
            fetchCourses(); // Also refresh courses list as it might have changed
        }
    });

    const formatGrade = (value: number | null, isPublished: boolean): string => {
        if (!isPublished) return '-';
        if (value === null) return '-';
        return value.toFixed(1);
    };

    // Liệt: tổng tất cả các item trong cùng 1 category (cùng type) = 0 thì mới fail
    const hasZeroGrade = (gradeCategories: GradeCategory[]): boolean => {
        for (const category of gradeCategories) {
            const publishedItems = category.items.filter(
                item => item.itemName !== 'Total' && item.isPublished && item.value !== null
            );
            if (publishedItems.length === 0) continue;
            const categorySum = publishedItems.reduce((sum, item) => sum + (item.value ?? 0), 0);
            if (categorySum <= 0) {
                return true;
            }
        }
        return false;
    };

    // Determine pass status: average >= 5.0 AND no zero-sum categories (liệt)
    const calculatePassStatus = (average: number | null, gradeCategories: GradeCategory[]): 'PASSED' | 'FAILED' | 'PENDING' => {
        if (average === null) return 'PENDING';
        if (average >= 5 && !hasZeroGrade(gradeCategories)) {
            return 'PASSED';
        }
        return 'FAILED';
    };

    // Sort and prepare grade categories using centralized utility
    const sortedGradeCategories = useMemo(() => {
        if (!gradeData) return [];
        return sortGradeCategories(gradeData.gradeCategories);
    }, [gradeData]);

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
            <div className="space-y-6 pb-24">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-fpt-orange rounded-full" />
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Bảng điểm chi tiết</h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium ml-5 flex items-center gap-2">
                            <GraduationCap size={16} className="text-fpt-orange" /> Kết quả học tập của sinh viên
                        </p>
                    </div>
                </div>

                {/* Filter Section - Standardized with CustomSelect */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row items-end gap-6">
                        {/* Semester Selector */}
                        <div className="flex-1 w-full">
                            <CustomSelect
                                label="Học kỳ"
                                value={selectedSemesterId?.toString() || ''}
                                onChange={(val: string) => setSelectedSemesterId(Number(val))}
                                options={semesters.map(s => ({ label: s.name, value: s.id.toString() }))}
                                placeholder="Chọn học kỳ"
                            />
                        </div>

                        {/* Course Selector */}
                        <div className="flex-1 w-full">
                            <CustomSelect
                                label="Lớp học"
                                value={selectedClassName || ''}
                                onChange={(val: string) => setSelectedClassName(val)}
                                options={filteredCourses.map(c => ({ label: `${c.className} - ${c.courseName}`, value: c.className }))}
                                placeholder={filteredCourses.length === 0 ? "Không có lớp học" : "Chọn lớp học"}
                                disabled={filteredCourses.length === 0}
                            />
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
                        <div className="bg-white dark:bg-zinc-900 px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-zinc-700 flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white break-words">{gradeData.courseName}</h2>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <span className="bg-fpt-orange/10 text-fpt-orange px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">
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
                                        <th className="px-4 py-5 text-white text-left w-[20%] text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Loại điểm
                                        </th>
                                        <th className="px-4 py-5 text-white text-left w-[32%] text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Mục điểm
                                        </th>
                                        <th className="px-4 py-5 text-white text-center w-[12%] text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Trọng số
                                        </th>
                                        <th className="px-4 py-5 text-white text-center w-[12%] text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Điểm
                                        </th>
                                        <th className="px-4 py-5 text-white text-left w-[24%] text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Ghi chú
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedGradeCategories.map((category: GradeCategory, catIndex: number) => (
                                        <React.Fragment key={catIndex}>
                                            {category.items.map((item, itemIndex) => {
                                                const isTotal = item.itemName === 'Total';
                                                const displayValue = isTotal ? category.totalValue : item.value;
                                                const isPublished = isTotal
                                                    ? (item.isPublished || category.items.some(i => i.itemName !== 'Total' && i.isPublished))
                                                    : item.isPublished;

                                                return (
                                                    <tr
                                                        key={`${catIndex}-${itemIndex}`}
                                                        className={`${catIndex % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-white dark:bg-zinc-800/20'}`}
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
                                                        <td className={`px-4 py-3 border-b border-gray-100 dark:border-zinc-700 text-center font-bold text-base ${!isPublished ? 'text-gray-400' :
                                                            displayValue !== null && displayValue < 5 ? 'text-red-500' : 'text-gray-900 dark:text-white'
                                                            }`}>
                                                            {formatGrade(displayValue, isPublished)}
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


