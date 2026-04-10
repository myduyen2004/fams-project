import React from 'react';
import { Link } from 'react-router-dom';
import { RecentAccess } from '../../../types/dashboard';

interface RecentAccessTableProps {
  data: RecentAccess[];
  isDashboard?: boolean;
}

export const RecentAccessTable: React.FC<RecentAccessTableProps> = ({ data, isDashboard = false }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đang hoạt động':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Trạng thời':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Ngừng hoạt động':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Lượt truy cập gần đây
        </h3>
        <Link to="/admin/recent-access" className="text-sm text-fpt-orange hover:text-orange-600 font-medium">
          Xem tất cả →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Thời gian
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Địa điểm
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
            {(isDashboard ? data.slice(0, 6) : data).map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img
                      src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.email)}&background=F37021&color=fff`}
                      alt=""
                      className="w-8 h-8 rounded-full mr-3 object-cover shadow-sm ring-1 ring-gray-100 dark:ring-zinc-800"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.email)}&background=F37021&color=fff`;
                      }}
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {item.email}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {item.accessTime}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {item.location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
