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
            <td className="px-6 py-4 font-medium text-sm text-gray-500 dark:text-gray-400 text-center">
                {index.toString().padStart(2, '0')}
            </td>
            <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-zinc-200 text-center">
                {classSection.semesterName}
            </td>
            <td className="px-6 py-4 font-medium text-sm text-gray-600 dark:text-zinc-400 text-center">
                <span className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded font-mono text-xs">
                    {classSection.courseCode}
                </span>
            </td>
            <td className='px-6 py-4 font-bold text-sm text-fpt-orange text-center'>
                {classSection.className}
            </td>
            <td className="px-6 py-4 font-medium text-sm text-gray-600 dark:text-zinc-300 text-center">
                {classSection.courseName}
            </td>
            <td className="px-6 py-4 text-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest ${
                    classSection.status === 'UPCOMING'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : classSection.status === 'OPEN' || classSection.status === 'ONGOING'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                    {classSection.status === 'UPCOMING' ? 'SẮP DIỄN RA' : classSection.status === 'ONGOING' ? 'ĐANG DIỄN RA' : classSection.status === 'FINISHED' ? 'ĐÃ KẾT THÚC' : classSection.status === 'OPEN' ? 'ĐANG MỞ' : classSection.status || '---'}
                </span>
            </td>
        </tr>
    );
};
