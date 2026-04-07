import { useState, useEffect } from 'react';
import {
  ChevronRight, Clock, MapPin, Loader2,
  Info, CheckCircle2, AlertCircle, XCircle,
  ExternalLink, User, GraduationCap
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { academicStaffService, ScheduleRequestResponse, SystemLogItem } from '../../../services/api/academicStaffService';

interface RequestItemProps {
  name: string;
  role: string;
  avatar: string;
  description: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  onClick?: () => void;
}

const RequestItem: React.FC<RequestItemProps> = ({ name, role, avatar, description, statusLabel, createdAt, onClick }) => {
  // Format relative time
  const timeAgo = (() => {
    try {
      const date = new Date(createdAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      return `${diffDays} ngày trước`;
    } catch {
      return '';
    }
  })();

  const roleLabel = role === 'LECTURER' ? 'GV' : role === 'STUDENT' ? 'SV' : role;

  return (
    <div
      className="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-zinc-800"
      onClick={onClick}
    >
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold overflow-hidden flex-shrink-0">
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-base">{name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">{name}</h4>
          <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded flex-shrink-0">{roleLabel}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{description}</p>
        <p className="text-[10px] text-gray-400 mt-1">{timeAgo}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-100 dark:border-orange-500/20 uppercase tracking-wide">
          {statusLabel}
        </span>
        <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
      </div>
    </div>
  );
};

export const PendingRequests: React.FC<{ stats?: any }> = ({ stats }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'lecturer' | 'student'>('lecturer');
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequestResponse[]>([]);
  const [academicRequests, setAcademicRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (activeTab === 'lecturer') {
          const data = await academicStaffService.getScheduleRequests({
            status: 'PENDING',
            page: 0,
            size: 20,
            sort: 'createdAt,desc',
          });
          setScheduleRequests(data.content || []);
        } else {
          const data = await academicStaffService.getAcademicRequests({
            status: 'PENDING',
            page: 0,
            size: 20,
            sort: 'createdAt,desc',
          });
          setAcademicRequests(data.content || []);
        }
      } catch (error) {
        console.error('Failed to fetch requests:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  const scheduleCount = stats?.totalScheduleRequests || 0;
  const academicCount = stats?.totalAcademicRequests || 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Yêu cầu chờ xử lý
        </h3>
        <button
          onClick={() => navigate(activeTab === 'lecturer' ? '/academic-staff/requests' : '/academic-staff/academic-requests')}
          className="text-[11px] font-semibold text-orange-500 hover:text-orange-600 transition-colors uppercase tracking-wider"
        >
          Chi tiết
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 dark:bg-zinc-800/50 rounded-xl mb-4">
        <button
          onClick={() => setActiveTab('lecturer')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'lecturer' 
              ? 'bg-white dark:bg-zinc-800 text-orange-500 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <User size={14} />
          GIẢNG VIÊN
          {scheduleCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
              activeTab === 'lecturer' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'
            }`}>
              {scheduleCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('student')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'student' 
              ? 'bg-white dark:bg-zinc-800 text-orange-500 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <GraduationCap size={14} />
          SINH VIÊN
          {academicCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
              activeTab === 'student' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'
            }`}>
              {academicCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : (activeTab === 'lecturer' ? scheduleRequests : academicRequests).length > 0 ? (
          <div className="space-y-1">
            {activeTab === 'lecturer' ? (
              scheduleRequests.map((req) => (
                <RequestItem
                  key={req.id}
                  name={req.requesterName}
                  role={req.requesterRole}
                  avatar={req.requesterAvatar}
                  description={req.reason || req.typeLabel || 'Yêu cầu mới'}
                  status={req.status}
                  statusLabel={req.statusLabel || 'Chờ duyệt'}
                  createdAt={req.createdAt}
                  onClick={() => navigate('/academic-staff/requests')}
                />
              ))
            ) : (
              academicRequests.map((req) => (
                <RequestItem
                  key={req.id}
                  name={req.studentName}
                  role="STUDENT"
                  avatar={req.studentAvatar}
                  description={req.requestTitle}
                  status={req.status}
                  statusLabel={req.statusLabel || 'Chờ duyệt'}
                  createdAt={req.createdAt}
                  onClick={() => navigate('/academic-staff/academic-requests')}
                />
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <p className="text-sm font-medium">Không có yêu cầu nào đang chờ xử lý</p>
            <p className="text-xs mt-1">Tất cả đã được xử lý</p>
          </div>
        )}
      </div>
    </div>
  );
};

import { useWebSocket } from '../../../hooks/useWebSocket';

export const SystemActivityLog: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLogs = async (pageNum: number, append = false) => {
    try {
      append ? setLoadingMore(true) : setLoading(true);
      const data = await academicStaffService.getSystemLogs({
        page: pageNum,
        size: 20
      });
      setLogs(prev => append ? [...prev, ...data.content] : data.content);
    } catch (error) {
      console.error('Failed to fetch system logs:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLogs(0);
  }, []);

  // Real-time updates via WebSocket
  useWebSocket('/topic/system-logs', (newLogs: SystemLogItem[]) => {
    if (Array.isArray(newLogs)) {
      setLogs(newLogs.slice(0, 20));
    }
  });

  const typeConfig: Record<string, { btnClass: string; icon: React.ReactNode; label: string }> = {
    info: {
      btnClass: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20',
      icon: <Info className="w-5 h-5 text-orange-500" />,
      label: 'THÔNG TIN'
    },
    success: {
      btnClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      label: 'THÀNH CÔNG'
    },
    warning: {
      btnClass: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
      icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
      label: 'CẢNH BÁO'
    },
    error: {
      btnClass: 'text-red-600 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20',
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      label: 'THẤT BẠI'
    },
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Nhật ký hệ thống
          </h3>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            LIVE
          </div>
        </div>
        <Link
          to="/academic-staff/logs"
          className="text-fpt-orange hover:text-orange-600 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex-1 max-h-[315px] overflow-y-auto pr-1 custom-scrollbar">
        {loading && !loadingMore && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : logs.length > 0 ? (
          <div className="space-y-1">
            {logs.map((log) => {
              const config = typeConfig[log.type] || typeConfig.info;
              const isSystem = log.performerName === 'Hệ thống' || !log.performerName;

              const timeAgo = (() => {
                try {
                  const date = new Date(log.timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
                  const now = new Date();
                  const diffMs = now.getTime() - date.getTime();
                  const diffMins = Math.floor(diffMs / 60000);
                  if (diffMins < 1) return 'Vừa xong';
                  if (diffMins < 60) return `${diffMins} phút trước`;
                  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ trước`;
                  return log.timestamp;
                } catch { return log.timestamp; }
              })();

              return (
                <div
                  key={log.id}
                  className="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-zinc-800"
                  onClick={() => navigate('/academic-staff/logs')}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold overflow-hidden flex-shrink-0">
                    {isSystem ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-zinc-800/50 text-orange-500">
                        {config.icon}
                      </div>
                    ) : log.performerAvatar ? (
                      <img src={log.performerAvatar} alt={log.performerName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base">{log.performerName?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">
                        {log.title}
                      </h4>
                      {!isSystem && (
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded flex-shrink-0 uppercase">
                          {log.performerRole || 'Hệ thống'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {log.description}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                      <span>{timeAgo}</span>
                      {log.ipAddress && <span>· {log.ipAddress}</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase tracking-wide ${config.btnClass}`}>
                      {config.label}
                    </span>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <p className="text-sm font-medium">Chưa có hoạt động nào được ghi lại</p>
          </div>
        )}
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

export const RunningRooms: React.FC<{ rooms?: any[], total?: number }> = ({ rooms = [], total = 0 }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-zinc-800 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-5 pb-2 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Phòng học đang sử dụng</h3>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-tight">Live</span>
          </div>
        </div>
        <span className="text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded tracking-widest uppercase border border-orange-100 dark:border-orange-500/20">
          {total} PHÒNG
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {rooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rooms.map((room, idx) => (
              <div
                key={idx}
                className="group/room relative overflow-hidden rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-900/10 p-3.5 transition-all duration-300 hover:-translate-y-0.5 cursor-default"
                style={{
                  boxShadow: '0 0 0 1px rgba(244,63,94,0.15), 0 2px 12px rgba(244,63,94,0.1), 0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {/* Radial glow overlay */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-xl opacity-0 group-hover/room:opacity-100 transition-opacity duration-300"
                  style={{ background: 'radial-gradient(ellipse at top right, rgba(244,63,94,0.07) 0%, transparent 70%)' }}
                />

                <div className="flex justify-between items-start relative z-10 gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Room name row: name is covered by badge on hover */}
                    <div className="flex items-center gap-1.5 mb-2 h-5">
                      <MapPin
                        size={14}
                        className="text-rose-500 flex-shrink-0 transition-transform duration-300 group-hover/room:scale-110"
                      />
                      <div className="relative flex-1 h-5 overflow-hidden">
                        {/* Room Name */}
                        <h4 className="absolute inset-0 text-sm font-bold text-gray-900 dark:text-white truncate transition-all duration-300 group-hover/room:opacity-0 group-hover/room:-translate-y-full">
                          {room.roomName}
                        </h4>
                        
                        {/* Slide-in "đang dùng" badge that covers the name */}
                        <span className="absolute inset-0 flex items-center gap-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 whitespace-nowrap
                          opacity-0 translate-y-full transition-all duration-300 group-hover/room:opacity-100 group-hover/room:translate-y-0 shadow-sm shadow-rose-200/20">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
                          </span>
                          Đang dùng
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Giảng viên</p>
                      <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mt-0.5 truncate group-hover/room:text-rose-600 dark:group-hover/room:text-rose-400 transition-colors">
                        {room.lecturerName}
                      </p>
                    </div>
                  </div>

                  <div className="ml-1 flex flex-col items-center flex-shrink-0">
                    <div className="relative w-11 h-11 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90">
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          className="text-rose-100 dark:text-rose-900/30"
                        />
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeDasharray={113}
                          strokeDashoffset={113 - (113 * (room.attendancePercentage || 0)) / 100}
                          strokeLinecap="round"
                          className={`${(room.attendancePercentage || 0) < 50 ? 'text-orange-400' : 'text-emerald-500'} transition-all duration-500`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                        <span className="text-[10px] font-black text-gray-900 dark:text-white">
                          {Math.round(room.attendancePercentage || 0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom accent bar */}
                <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-400 w-0 group-hover/room:w-full transition-all duration-300"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl h-full bg-zinc-50/50 dark:bg-zinc-800/10">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
              <Clock size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium">Không có phòng hoạt động</p>
            <p className="text-xs mt-1 text-gray-400">Dữ liệu cập nhật theo thời gian thực</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
        <Link
          to="/academic-staff/rooms?building=ALL&status=IN_USE"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-white hover:bg-orange-500 border border-gray-200 dark:border-zinc-800 hover:border-orange-500 transition-all"
        >
          Xem tất cả phòng học
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
};

