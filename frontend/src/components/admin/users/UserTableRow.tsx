import React from 'react';
import { User as UserIcon, Calendar, Hash, Shield } from 'lucide-react';
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
      className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-all text-sm cursor-pointer group"
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
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 flex-shrink-0 group-hover:ring-2 group-hover:ring-fpt-orange/30 transition-all border border-gray-100 dark:border-zinc-700 shadow-sm">
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
              <UserIcon size={18} className="m-auto text-gray-400" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 dark:text-white group-hover:text-fpt-orange transition-colors">
              {user.fullName}
            </span>
            <span className="text-[10px] text-gray-500 font-medium lowercase">
              {user.email}
            </span>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-mono text-xs font-bold">
            <Hash size={12} className="text-gray-400" />
            {user.code}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded-lg text-[11px] font-bold text-gray-600 dark:text-gray-400 w-fit border border-gray-200/50 dark:border-zinc-700/50">
            <Shield size={12} className="text-fpt-orange" />
            {user.roleName}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs font-medium">
            <Calendar size={12} className="text-gray-400" />
            {user.dob ? (typeof user.dob === 'string' ? user.dob : `${user.dob[2]}/${user.dob[1]}/${user.dob[0]}`) : '---'}
        </div>
      </td>
      <td className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
        {formatDateTime(user.createdAt)}
      </td>
    </tr>
  );
});

UserTableRow.displayName = 'UserTableRow';

