import React from 'react';
import { ChevronRight, Clock, MapPin } from 'lucide-react';

interface RequestItemProps {
  name: string;
  role: string;
  avatar: string;
  description: string;
  status: string;
}

const RequestItem: React.FC<RequestItemProps> = ({ name, role, avatar, description, status }) => {
  return (
    <div className="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-zinc-800">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-zinc-400 font-bold overflow-hidden">
        {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : name.charAt(0)}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{role}. {name}</h4>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
          {status}
        </span>
        <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
      </div>
    </div>
  );
};

export const PendingRequests: React.FC = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 h-full">
      <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100 dark:border-zinc-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Yêu cầu chờ xử lý
        </h3>
        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest bg-gray-50 dark:bg-zinc-800 px-2 py-0.5 rounded">QUẢN LÝ KHO</span>
      </div>
      <div className="space-y-2">
        <RequestItem 
          name="Nguyễn Văn A" 
          role="GS"
          avatar=""
          description="Đơn xin nghỉ phép dài hạn cho sinh viên Đoàn Quốc B"
          status="CHỜ DUYỆT"
        />
        <RequestItem 
          name="Emily Stone" 
          role="TS"
          avatar=""
          description="Thay đổi phòng học cho môn Kỹ thuật số (P201 sang P304)"
          status="CHỜ DUYỆT"
        />
      </div>
    </div>
  );
};

export const AttendanceLog: React.FC = () => {
  const logs = [
    { id: 1, user: 'nguyen.vana123', name: 'Nguyễn Văn A', room: 'BE-202', time: '14:02:11', status: 'ĐÃ GHI NHẬN' },
    { id: 2, user: 'tran.thib456', name: 'Trần Thị B', room: 'AL-105', time: '14:01:45', status: 'ĐÃ GHI NHẬN' },
    { id: 3, user: 'le.hoangc789', name: 'Lê Hoàng C', room: 'IT-302', time: '13:58:20', status: 'ĐÃ GHI NHẬN' },
  ];
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 h-full">
      <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100 dark:border-zinc-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Nhật ký điểm danh
        </h3>
        <div className="flex items-center gap-2 text-[8px] font-black text-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-[0.1em] border border-emerald-100 dark:border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          REAL TIME
        </div>
      </div>
      <div className="space-y-4">
        {logs.map(log => (
          <div key={log.id} className="flex items-center gap-4">
             <div className="w-2 h-2 rounded-full border-2 border-gray-200"></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                   <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">{log.user}</p>
                   <p className="text-xs text-gray-500">({log.name})</p>
                </div>
                <div className="flex items-center gap-4 mt-1">
                   <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin size={12} className="text-gray-400" />
                      Tòa {log.room}
                   </div>
                   <div className="flex items-center gap-1 text-xs text-orange-600 font-medium font-mono">
                      <Clock size={12} className="text-orange-500" />
                      {log.time}
                   </div>
                </div>
             </div>
             <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                {log.status}
             </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RunningRooms: React.FC = () => {
  const rooms = [
    { id: 1, name: 'P201', lecturer: 'Nguyễn Văn A', percent: 65, campus: 'CA 2' },
    { id: 2, name: 'P202', lecturer: 'Dr. Sarah J.', percent: 40, campus: 'CA 2' },
    { id: 3, name: 'P305', lecturer: 'Lê Văn Tám', percent: 90, campus: 'CA 2' },
    { id: 4, name: 'P104', lecturer: 'Trần Thị B', percent: 20, campus: 'CA 2' },
  ];
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-zinc-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-5 pb-2 border-b border-gray-100 dark:border-zinc-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Phòng học đang sử dụng</h3>
        <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded tracking-widest uppercase border border-orange-100">24 PHÒNG</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 flex-1">
        {rooms.map(room => (
          <div key={room.id} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all relative group/room">
            <div className="flex justify-between items-start">
               <div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mt-1">{room.name}</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-medium text-emerald-600">Active</span>
                  </div>
               </div>
               
               <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-gray-100 dark:text-zinc-800"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={100}
                      strokeDashoffset={100 - room.percent}
                      strokeLinecap="round"
                      className="text-orange-500"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-400">
                    {room.percent}%
                  </span>
               </div>
            </div>

            <div className="mt-4">
               <p className="text-xs text-gray-500">Giảng viên</p>
               <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{room.lecturer}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-gray-100 dark:border-zinc-800 pt-4 text-center">
        <button className="text-xs font-medium text-gray-500 hover:text-orange-600 transition-colors">
          Xem tất cả phòng
        </button>
      </div>
    </div>
  );
};
