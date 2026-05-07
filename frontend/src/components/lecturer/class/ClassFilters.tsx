import React from 'react';
import { SemesterResponse, CourseOptionResponse } from '../../../services/api/LecturerClass';
import { CustomSelect } from '../../common/CustomSelect';

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
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-gray-100 dark:border-zinc-800 mb-8 shadow-sm animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 md:max-w-xs">
                    <CustomSelect
                        label="Học kỳ"
                        value={selectedSemester}
                        onChange={onSemesterChange}
                        options={[
                            { value: '', label: 'Chọn học kỳ' },
                            ...semesters.map((semester) => ({ value: semester.code, label: semester.name }))
                        ]}
                        placeholder="Chọn học kỳ"
                    />
                </div>

                <div className="flex-1 md:max-w-md">
                    <CustomSelect
                        label="Mã môn học"
                        value={selectedCourse}
                        onChange={onCourseChange}
                        options={[
                            { value: '', label: 'Tất cả môn học' },
                            ...courseOptions.map((course) => ({ value: course.code, label: course.code }))
                        ]}
                        placeholder="Tất cả môn học"
                    />
                </div>
            </div>
        </div>
    );
};

