import React from 'react';
import { Eye, Edit2, User as UserIcon } from 'lucide-react';
import { UserResponse } from '../../../services/api/userService';

interface UserTableRowProps {
  user: UserResponse;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onView: (user: UserResponse) => void;
  onEdit: (user: UserResponse) => void;
  formatDateTime: (date: any) => string;
}

export const UserTableRow: React.FC<UserTableRowProps> = React.memo(({ 
  user, 
  isSelected, 
  onSelect, 
  onView, 
  onEdit, 
  formatDateTime 
}) => {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-sm">
      <td className="px-4 py-4">
        <input 
          type="checkbox" 
          className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange cursor-pointer"
          checked={isSelected}
          onChange={() => onSelect(user.id)}
        />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 flex-shrink-0">
            {user.avatar ? (
              <img 
                src={typeof user.avatar === 'string' && user.avatar.includes('cloudinary.com') 
                  ? user.avatar.replace('/upload/', '/upload/c_fill,w_100,h_100,q_auto,f_auto/') 
                  : user.avatar
                } 
                alt="avatar" 
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://res.cloudinary.com/dqirhvblt/image/upload/v1711811567/default-avatar_vqc8xq.png';
                }}
              />
            ) : (
              <UserIcon size={16} className="m-auto text-gray-400" />
            )}
          </div>
          <span className="font-medium text-gray-900 dark:text-white">{user.fullName}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{user.code}</td>
      <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{user.roleName}</td>
      <td className="px-4 py-4">
        <span className={`text-xs font-medium ${user.faceDataStatus === 'REGISTERED' ? 'text-green-600' : 'text-red-500'}`}>
          {user.faceDataStatus === 'REGISTERED' ? '● Đã đăng ký' : '● Chưa đăng ký'}
        </span>
      </td>
      <td className="px-4 py-4 text-gray-500 dark:text-gray-500">{formatDateTime(user.createdAt)}</td>
      <td className="px-4 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <button 
            onClick={() => onView(user)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" 
            title="Xem chi tiết"
          >
            <Eye size={18} />
          </button>
          <button 
            onClick={() => onEdit(user)}
            className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors" 
            title="Chỉnh sửa"
          >
            <Edit2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
});

UserTableRow.displayName = 'UserTableRow';
