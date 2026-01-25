import React from 'react';
import { SemesterResponse, CourseOptionResponse } from '../../../services/api/LecturerClass';

interface ClassFiltersProps {
    semesters: SemesterResponse[];
    selectedSemester: string;
    onSemesterChange: (semesterCode: string) => void;
    courseOptions: CourseOptionResponse[];
    selectedCourse: string;
    onCourseChange: (value: string) => void;
}

export const ClassFilters: React.FC<ClassFiltersProps> = ({
    semesters,
    selectedSemester,
    onSemesterChange,
    courseOptions,
    selectedCourse,
    onCourseChange
}) => {
    return (
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 max-w-sm">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Học kỳ
                    </label>
                    <select
                        value={selectedSemester}
                        onChange={(e) => onSemesterChange(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-2 transition-all outline-none text-gray-900 dark:text-white"
                    >
                        <option value="">Chọn học kỳ</option>
                        {semesters.map((semester) => (
                            <option key={semester.id} value={semester.code}>
                                {semester.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 max-w-md">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Mã môn học
                    </label>
                    <select
                        value={selectedCourse}
                        onChange={(e) => onCourseChange(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:ring-2 transition-all outline-none text-gray-900 dark:text-white"
                    >
                        <option value="">Tất cả môn học</option>
                        {courseOptions.map((course) => (
                            <option key={course.id} value={course.code}>
                                {course.code}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};
