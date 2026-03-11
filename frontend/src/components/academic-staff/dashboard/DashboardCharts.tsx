import React, { useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { academicStaffService } from '../../../services/api/academicStaffService';

export const AttendanceFrequencyChart: React.FC<{
  data?: any[];
  loading?: boolean;
  weekStart?: string;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
}> = ({ data = [], loading = false, weekStart, onPrevWeek, onNextWeek }) => {
  // Calculate week label from weekStart
  const weekLabel = (() => {
    if (!weekStart) return '';
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
  })();

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 h-[400px] flex flex-col">
      <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100 dark:border-zinc-800">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tỷ lệ nghỉ học theo tuần
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Dữ liệu tỷ lệ vắng mặt trung bình (%) trong 7 ngày</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Week navigation */}
          {onPrevWeek && (
            <button 
              onClick={onPrevWeek}
              disabled={loading}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              title="Tuần trước"
            >
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
          )}
          {weekLabel && (
            <div className="px-3 py-1 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-800">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {weekLabel}
              </span>
            </div>
          )}
          {onNextWeek && (
            <button 
              onClick={onNextWeek}
              disabled={loading}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              title="Tuần sau"
            >
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          )}
          {/* Legend separator */}
          <div className="w-px h-4 bg-gray-200 dark:bg-zinc-700 mx-1"></div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-500">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            Tỷ lệ vắng (%)
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[250px] w-full mt-4 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-zinc-900/60 z-10 rounded-xl">
            <Loader2 className="w-6 h-6 text-fpt-orange animate-spin" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }}
              dy={10}
              padding={{ left: 30, right: 30 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '12px' }}
              formatter={(value: any) => [`${value}%`, 'Tỷ lệ vắng']}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  return `${label} (${payload[0].payload.date})`;
                }
                return label;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="absencePercentage" 
              stroke="#F37021" 
              strokeWidth={3} 
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, stroke: '#F37021', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const DailyAttendanceDonut: React.FC<{ stats?: any }> = ({ stats: initialStats }) => {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]; // today YYYY-MM-DD
  });

  // Sync with initial stats from parent (on first load)
  React.useEffect(() => {
    if (initialStats) {
      setStats(initialStats);
    }
  }, [initialStats]);

  const fetchDailyStats = useCallback(async (date: string) => {
    try {
      setLoading(true);
      const data = await academicStaffService.getDailyAttendance(date);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch daily attendance:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    fetchDailyStats(newDate);
  };

  const present = stats?.present || 0;
  const absent = stats?.absent || 0;
  const total = present + absent;
  const percent = total > 0 ? Math.round((present / total) * 100) : 0;
  
  const pieData = [
    { name: 'Đã điểm danh', value: present, color: '#F37021' },
    { name: 'Vắng mặt', value: absent, color: '#E5E7EB' },
  ];

  const dateStr = stats?.date || new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 flex flex-col h-[400px]">
      <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-100 dark:border-zinc-800">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tỷ lệ chuyên cần ngày</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">{dateStr}</p>
        </div>
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="w-[130px] text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition-all"
          />
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative mt-2">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-zinc-900/60 z-10 rounded-xl">
            <Loader2 className="w-6 h-6 text-fpt-orange animate-spin" />
          </div>
        )}
        <div className="w-52 h-52 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={65}
                outerRadius={85}
                paddingAngle={0}
                dataKey="value"
                startAngle={90}
                endAngle={450}
                cornerRadius={40}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
            <span className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">{percent}%</span>
          </div>
        </div>
      </div>

      <div className="w-full mt-auto space-y-2 pt-2">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-2 font-bold text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              Đã điểm danh
            </div>
            <span className="font-bold text-zinc-800 dark:text-gray-300">{present.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-2 font-bold text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-gray-200"></div>
              Vắng mặt
            </div>
            <span className="font-bold text-zinc-800 dark:text-gray-300">{absent.toLocaleString()}</span>
          </div>
        </div>
    </div>
  );
};
