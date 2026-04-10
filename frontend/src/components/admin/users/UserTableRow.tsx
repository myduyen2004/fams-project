import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { UserResponse } from '../../../services/api/userService';

interface UserTableRowProps {
  user: UserResponse;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onView: (user: UserResponse) => void;
  formatDateTime: (date: any) => string;
}

export const UserTableRow: React.FC<UserTableRowProps> = React.memo(({ 
  user, 
  isSelected, 
  onSelect, 
  onView, 
  formatDateTime 
}) => {
  return (
    <tr 
      onClick={() => onView(user)}
      className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-sm cursor-pointer group"
    >
      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
        <input 
          type="checkbox" 
          className="w-4 h-4 rounded border-gray-300 text-fpt-orange focus:ring-fpt-orange cursor-pointer"
          checked={isSelected}
          onChange={() => onSelect(user.id)}
        />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 flex-shrink-0 group-hover:ring-2 group-hover:ring-fpt-orange/30 transition-all">
            {user.avatar ? (
              <img 
                src={typeof user.avatar === 'string' && user.avatar.includes('cloudinary.com') 
                  ? user.avatar.replace('/upload/', '/upload/c_fill,w_80,h_80,q_auto,f_auto/') 
                  : user.avatar
                } 
                alt="avatar" 
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://res.cloudinary.com/dqirhvblt/image/upload/v1711811567/default-avatar_vqc8xq.png';
                }}
              />
            ) : (
              <UserIcon size={16} className="m-auto text-gray-400" />
            )}
          </div>
          <span className="font-medium text-gray-900 dark:text-white group-hover:text-fpt-orange transition-colors">{user.fullName}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{user.code}</td>
      <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{user.roleName}</td>
      <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
        {user.dob ? (typeof user.dob === 'string' ? user.dob : `${user.dob[2]}/${user.dob[1]}/${user.dob[0]}`) : '---'}
      </td>
      <td className="px-4 py-4 text-gray-500 dark:text-gray-500 rounded-tr-lg rounded-br-lg">{formatDateTime(user.createdAt)}</td>
    </tr>
  );
});

UserTableRow.displayName = 'UserTableRow';
