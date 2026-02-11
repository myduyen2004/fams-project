import React from 'react';
import { Eye, Edit2, GraduationCap } from 'lucide-react';
import { StudentResponse } from '../../../services/api/academicStaffService';

interface StudentTableRowProps {
    student: StudentResponse;
    isSelected: boolean;
    onSelect: (id: number) => void;
    onView: (student: StudentResponse) => void;
    onEdit?: (student: StudentResponse) => void;
}



export const StudentTableRow: React.FC<StudentTableRowProps> = React.memo(({
    student,
    onView,
    onEdit,
}) => {
    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-sm">

            <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fpt-orange to-orange-400 flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0">
                        {student.avatar ? (
                            <img
                                src={typeof student.avatar === 'string' && student.avatar.includes('cloudinary.com')
                                    ? student.avatar.replace('/upload/', '/upload/c_fill,w_100,h_100,q_auto,f_auto/')
                                    : student.avatar
                                }
                                alt="avatar"
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://res.cloudinary.com/dqirhvblt/image/upload/v1711811567/default-avatar_vqc8xq.png';
                                }}
                            />
                        ) : (
                            <GraduationCap size={18} />
                        )}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">{student.fullName}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4">
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{student.code}</span>
            </td>
            <td className="px-4 py-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">{student.major || '---'}</span>
            </td>
            <td className="px-4 py-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">{student.specialization || '---'}</span>
            </td>
            <td className="px-4 py-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">{student.course || '---'}</span>
            </td>
            <td className="px-4 py-4">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{student.gpa !== undefined ? student.gpa : '---'}</span>
            </td>
            <td className="px-4 py-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">{student.subSpecialization || '---'}</span>
            </td>
            <td className="px-4 py-4 text-center">
                <div className="flex items-center justify-center gap-1">
                    <button
                        onClick={() => onView(student)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Xem chi tiết"
                    >
                        <Eye size={18} />
                    </button>
                    {onEdit && (
                        <button
                            onClick={() => onEdit(student)}
                            className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                        >
                            <Edit2 size={18} />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
});

StudentTableRow.displayName = 'StudentTableRow';
