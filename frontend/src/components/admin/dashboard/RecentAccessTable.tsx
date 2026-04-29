import React from 'react';
import { Link } from 'react-router-dom';
import { RecentAccess } from '../../../types/dashboard';
import { ArrowRight } from 'lucide-react';

interface RecentAccessTableProps {
  data: RecentAccess[];
  isDashboard?: boolean;
}

export const RecentAccessTable: React.FC<RecentAccessTableProps> = ({ data, isDashboard = false }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Đang hoạt động':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
      case 'Trạm thời':
      case 'Trạng thời':
        return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
      case 'Ngừng hoạt động':
        return 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border-rose-100 dark:border-rose-900/30';
      default:
        return 'bg-gray-50 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 border-gray-100 dark:border-zinc-700';
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[24px] shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col h-full overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-10">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          Lượt truy cập gần đây
        </h3>
        <Link to="/admin/recent-access" className="group flex items-center gap-1.5 text-xs font-bold text-fpt-orange hover:text-orange-600 transition-colors uppercase tracking-wider">
          Xem tất cả
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-zinc-800/30">
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                Người dùng
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                Vai trò
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                Thời gian
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                Địa điểm
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
            {data.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400 dark:text-zinc-600 italic">
                        Chưa có dữ liệu truy cập
                    </td>
                </tr>
            ) : (
                (isDashboard ? data.slice(0, 6) : data).map((item) => (
                    <tr key={item.id} className="group hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-all duration-300">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.email)}&background=F37021&color=fff&bold=true`}
                            alt=""
                            className="w-10 h-10 rounded-full shadow-sm ring-2 ring-white dark:ring-zinc-900 group-hover:scale-110 transition-transform duration-300"
                          />
                          <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-fpt-orange transition-colors">
                            {item.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 px-2 py-1 bg-gray-100/50 dark:bg-zinc-800/50 rounded-lg">
                          {item.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600 dark:text-zinc-400 tabular-nums">
                        {item.accessTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-500">
                        {item.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${getStatusStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


