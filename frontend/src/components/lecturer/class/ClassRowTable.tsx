import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClassSectionResponse } from '../../../services/api/LecturerClass';

interface ClassRowTableProps {
    index: number;
    classSection: ClassSectionResponse;
}

export const ClassRowTable: React.FC<ClassRowTableProps> = ({ index, classSection }) => {
    const navigate = useNavigate();

    return (
        <tr
            onClick={() => navigate(`/lecturer/classes/${classSection.className}`)}
            className="mt-20 mb-20 border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
        >
            <td className="px-6 py-6 font-medium py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                {index}
            </td>
            <td className="px-6 py-6 text-base font-semibold text-gray-500 dark:text-white text-center">
                {classSection.semesterName}
            </td>
            <td className="px-6 py-6 font-medium py-4 text-sm text-gray-600 dark:text-gray-300 text-center">
                {classSection.courseCode}
            </td>
            <td className='px-6 py-6 font-medium py-4 text-sm text-gray-600 dark:text-gray-300 text-center'>
                {classSection.className}
            </td>
            <td className="px-20 py-6 font-medium py-4 text-sm text-gray-600 dark:text-gray-300">
                {classSection.courseName}
            </td>
        </tr>
    );
};
