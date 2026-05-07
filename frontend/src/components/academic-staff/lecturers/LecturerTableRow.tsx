import React from 'react';
import { Eye, Edit2, UserPlus, GraduationCap } from 'lucide-react';
import { LecturerResponse } from '../../../services/api/academicStaffService';

interface LecturerTableRowProps {
  lecturer: LecturerResponse;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onView: (lecturer: LecturerResponse) => void;
  onEdit?: (lecturer: LecturerResponse) => void;
  onRegister?: (lecturer: LecturerResponse) => void;
  showRegisterButton?: boolean;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Hoạt động</span>;
    case 'LOCKED':
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Đã khóa</span>;
    case 'INACTIVE':
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Chưa kích hoạt</span>;
    default:
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">{status}</span>;
  }
};

export const LecturerTableRow: React.FC<LecturerTableRowProps> = React.memo(({
  lecturer,
  onView,
  onEdit,
  onRegister,
  showRegisterButton = false
}) => {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-sm">

      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0">
            {lecturer.avatar ? (
              <img
                src={typeof lecturer.avatar === 'string' && lecturer.avatar.includes('cloudinary.com')
                  ? lecturer.avatar.replace('/upload/', '/upload/c_fill,w_100,h_100,q_auto,f_auto/')
                  : lecturer.avatar
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
            <p className="font-medium text-gray-900 dark:text-white">{lecturer.fullName}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{lecturer.code}</span>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {lecturer.major || <span className="text-gray-400 italic text-xs">Chưa cập nhật</span>}
          </span>
          {lecturer.specialization && (
            <span className="text-xs text-gray-400">{lecturer.specialization}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        {getStatusBadge(lecturer.status)}
      </td>
      <td className="px-4 py-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">{lecturer.bio || 'Chưa cập nhật'}</span>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onView(lecturer)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Xem chi tiết"
          >
            <Eye size={18} />
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(lecturer)}
              className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
              title="Chỉnh sửa"
            >
              <Edit2 size={18} />
            </button>
          )}
          {showRegisterButton && onRegister && (
            <button
              onClick={() => onRegister(lecturer)}
              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title="Đăng ký thông tin"
            >
              <UserPlus size={18} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

LecturerTableRow.displayName = 'LecturerTableRow';

