import React, { useState, useEffect } from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { ClassFilters } from '../../components/lecturer/class/ClassFilters';
import { ClassRowTable } from '../../components/lecturer/class/ClassRowTable';
import { lecturerClassService, ClassSectionResponse, SemesterResponse, CourseOptionResponse } from '../../services/api/LecturerClass';
import { authService } from '../../services/api/authService';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const LeturerClassManagementPage: React.FC = () => {
    const [classes, setClasses] = useState<ClassSectionResponse[]>([]);
    const [semesters, setSemesters] = useState<SemesterResponse[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [courseOptions, setCourseOptions] = useState<CourseOptionResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [pagination, setPagination] = useState({
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0
    });

    const user = authService.getUser();

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const semesterData = await lecturerClassService.getSemesters();
                setSemesters(semesterData);
                if (semesterData.length > 0) {
                    setSelectedSemester(semesterData[0].code);
                }
            } catch (error) {
                console.error("Failed to fetch semesters", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedSemester && user?.id) {
            fetchClasses();
            fetchCourseOptions();
        }
    }, [selectedSemester, searchTerm, pagination.page, user?.id]);

    const fetchCourseOptions = async () => {
        if (!selectedSemester || !user?.id) return;
        try {
            const data = await lecturerClassService.getCourseOptions(selectedSemester, user.id);
            setCourseOptions(data);
        } catch (error) {
            console.error("Failed to fetch course options", error);
        }
    };

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const data = await lecturerClassService.getTeachingClasses(selectedSemester, {
                lecturerId: user?.id,
                search: searchTerm,
                page: pagination.page,
                size: pagination.size
            });
            setClasses(data.content);
            setPagination(prev => ({
                ...prev,
                totalElements: data.totalElements,
                totalPages: data.totalPages
            }));
        } catch (error) {
            console.error("Failed to fetch classes", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSemesterChange = (semesterCode: string) => {
        setSelectedSemester(semesterCode);
        setPagination(prev => ({ ...prev, page: 0 }));
    };

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setPagination(prev => ({ ...prev, page: 0 }));
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && newPage < pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    return (
        <LecturerLayout pageTitle="Danh sách lớp học giảng dạy">
            <div className="mt-5 ml-10 mr-10 space-y-6">
                <ClassFilters
                    semesters={semesters}
                    selectedSemester={selectedSemester}
                    onSemesterChange={handleSemesterChange}
                    courseOptions={courseOptions}
                    selectedCourse={searchTerm}
                    onCourseChange={handleSearchChange}
                />

                <div className=" bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#f97316] text-white">
                                <tr>
                                    <th className="px-4 py-5 text-center w-20 text-xs font-bold uppercase tracking-widest whitespace-nowrap">STT</th>
                                    <th className="px-4 py-5 text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Học kỳ</th>
                                    <th className="px-4 py-5 text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Mã môn học</th>
                                    <th className="px-4 py-5 text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Lớp học</th>
                                    <th className="px-4 py-5 text-center text-xs font-bold uppercase tracking-widest whitespace-nowrap">Tên môn học</th>
                                    <th className="px-4 py-5 text-center w-40 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                                {loading ? (
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-fpt-orange/20 border-t-fpt-orange rounded-full animate-spin"></div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">Đang tải dữ liệu...</p>
                                        </div>
                                    </td>
                                ) : classes.length > 0 ? (
                                    classes.map((cls, index) => (
                                        <ClassRowTable
                                            key={cls.className}
                                            index={pagination.page * pagination.size + index + 1}
                                            classSection={cls}
                                        />
                                    ))
                                ) : (
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center">
                                                <span className="text-gray-300 dark:text-zinc-700 text-xs font-bold uppercase tracking-widest">Trống</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium tracking-tight">Không có dữ liệu lớp học cho học kỳ này.</p>
                                        </div>
                                    </td>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="px-6 py-4 bg-gray-50/50 dark:bg-zinc-800/30 border-t border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Hiển thị <span className="font-medium text-gray-900 dark:text-white">
                                    {classes.length > 0 ? pagination.page * pagination.size + 1 : 0}
                                </span> đến <span className="font-medium text-gray-900 dark:text-white">
                                    {pagination.page * pagination.size + classes.length}
                                </span> trong số <span className="font-medium text-gray-900 dark:text-white">
                                    {pagination.totalElements}
                                </span> môn
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 0}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                {[...Array(pagination.totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handlePageChange(i)}
                                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${pagination.page === i
                                            ? 'bg-fpt-orange text-white shadow-lg shadow-orange-500/30'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages - 1}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </LecturerLayout>
    );
};


